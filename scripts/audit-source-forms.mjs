import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const QUERY = "Mero cristianismo";
const SOURCES = [
  { name: "Docer.ar", url: "https://docer.ar/" },
  { name: "Mundo EPUB", url: "https://mundoepub.net/" },
  { name: "PDF Drive", url: "https://www.pdfdrive.com/" },
  { name: "Bookmate", url: "https://bookmate.com/" },
  { name: "Libronera", url: "https://libronera.com/" },
  { name: "Epubera", url: "https://epubera1.com/" },
  { name: "Lectulandia", url: "https://ww3.lectulandia.co/" },
  { name: "Epublandia", url: "https://epublandia.app/" },
  { name: "Z-Library", url: "https://z-lib.vc/" }
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1365, height: 900 },
  userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36"
});
const reports = [];
try {
  for (const source of SOURCES) {
    const page = await context.newPage();
    const report = {
      source: source.name,
      homepage: source.url,
      inspectedAt: new Date().toISOString(),
      homeHttpStatus: null,
      finalHomeUrl: null,
      forms: [],
      attemptedSubmission: null,
      matchingResultLinks: [],
      outcome: "UNVERIFIED"
    };
    try {
      const response = await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 8000 });
      report.homeHttpStatus = response?.status() ?? null;
      report.finalHomeUrl = page.url();
      await page.waitForTimeout(400);
      report.forms = await page.locator("form").evaluateAll(forms => forms.map((form, index) => ({
        index,
        method: (form.getAttribute("method") || "get").toLowerCase(),
        action: form.getAttribute("action") || "",
        inputs: [...form.querySelectorAll("input:not([type=hidden]),textarea")].map(input => ({
          tag: input.tagName.toLowerCase(),
          type: input.getAttribute("type") || (input.tagName.toLowerCase() === "textarea" ? "textarea" : "text"),
          name: input.getAttribute("name") || "",
          id: input.id || "",
          placeholder: input.getAttribute("placeholder") || "",
          ariaLabel: input.getAttribute("aria-label") || "",
          visible: !!(input.getClientRects().length && getComputedStyle(input).visibility !== "hidden"),
          disabled: input.disabled
        }))
      })));
      const candidate = await page.locator("form").evaluateAll(forms => {
        for (let i = 0; i < forms.length; i++) {
          const form = forms[i];
          const inputs = [...form.querySelectorAll("input:not([type=hidden]),textarea")];
          const input = inputs.find(el => {
            const hint = [el.name, el.id, el.placeholder, el.getAttribute("aria-label"), el.type].join(" ").toLowerCase();
            return el.getClientRects().length && !el.disabled &&
              !["password", "email", "checkbox", "radio", "submit", "button", "hidden"].includes((el.type || "").toLowerCase()) &&
              /search|query|title|book|keyword|buscar|libro|q\b/.test(hint);
          });
          if (input) return { formIndex: i, inputName: input.name || "", inputId: input.id || "", method: (form.getAttribute("method") || "get").toLowerCase(), action: form.getAttribute("action") || "" };
        }
        return null;
      });
      if (candidate) {
        const form = page.locator("form").nth(candidate.formIndex);
        const input = form.locator("input:not([type=hidden]),textarea").filter({ visible: true }).first();
        report.attemptedSubmission = { ...candidate, query: QUERY, initialUrl: page.url() };
        const nav = page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 2500 }).then(response => ({ type: "navigation", status: response?.status() ?? null })).catch(() => ({ type: "no-full-navigation", status: null }));
        await input.fill(QUERY, { timeout: 4000 });
        await input.press("Enter", { timeout: 4000 }).catch(async () => {
          const submit = form.locator('button[type="submit"],input[type="submit"],button:not([type])').first();
          if (await submit.count()) await submit.click({ timeout: 4000 });
        });
        report.attemptedSubmission.navigation = await nav;
        await page.waitForTimeout(1800);
        report.attemptedSubmission.finalUrl = page.url();
        report.attemptedSubmission.finalHttpStatus = report.attemptedSubmission.navigation.status;
        report.attemptedSubmission.pageTitle = await page.title().catch(() => "");
        report.attemptedSubmission.queryVisibleInText = (await page.locator("body").innerText({ timeout: 3000 }).catch(() => "")).toLowerCase().includes(QUERY.toLowerCase());
        report.matchingResultLinks = await page.locator("a[href]").evaluateAll((anchors, query) => anchors.map(a => ({
          title: (a.innerText || a.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 180),
          url: a.href
        })).filter(a => a.title.toLowerCase().includes(query.toLowerCase()) && /^https?:/.test(a.url)).slice(0, 8), QUERY);
        report.outcome = report.matchingResultLinks.length ? "SEARCH_SUBMITTED_MATCHING_LINKS_FOUND" :
          report.attemptedSubmission.queryVisibleInText ? "SEARCH_SUBMITTED_QUERY_VISIBLE_NO_MATCHING_LINK" :
          "FORM_SUBMITTED_NO_MATCHING_LINK";
      } else {
        report.outcome = report.forms.length ? "FORMS_FOUND_NO_CLEAR_SEARCH_INPUT" : "NO_SEARCH_FORM_FOUND";
      }
    } catch (error) {
      report.outcome = "BROWSER_ACCESS_ERROR";
      report.error = String(error?.message || error).slice(0, 500);
      report.finalUrl = page.url();
    }
    reports.push(report);
    console.log(JSON.stringify(report));
    await page.close();
  }
} finally {
  await browser.close();
}
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/source-form-audit.json", JSON.stringify({
  query: QUERY,
  note: "Audit records observed HTML forms and browser submission behavior. A form's existence or a query echo alone does not certify correct book-result extraction.",
  checked: reports.length,
  sources: reports
}, null, 2));
const found = reports.filter(r => r.outcome === "SEARCH_SUBMITTED_MATCHING_LINKS_FOUND").length;
console.log(`FORM AUDIT SUMMARY: ${found}/${reports.length} sources showed a matching book link after a real browser form submission. Full report: artifacts/source-form-audit.json`);
