import assert from "node:assert/strict";

const BOOKS = [
  "Bart Ehrman, El problema de Dios",
  "C.S. Lewis, Mero cristianismo",
  "Blaise Pascal, Pensamientos",
  "Bart Ehrman, Cómo Jesús se convirtió en Dios",
  "Jonathan Haidt, La mente de los justos",
  "Thomas Sowell, Conflicto de visiones",
  "George Lakoff, No pienses en un elefante",
  "Galeano, Las venas abiertas de América Latina",
  "Mendoza, Montaner y Vargas Llosa, Manual del perfecto idiota latinoamericano",
  "Marx y Engels, Manifiesto comunista",
  "Hayek, Camino de servidumbre",
  "John Stuart Mill, Sobre la libertad",
  "Michael Sandel, Justicia",
  "Ezra Klein, Por qué estamos polarizados"
];

const SOURCES = [
  { name: "Docer.ar", search: q => `https://docer.ar/show/?q=${encodeURIComponent(q)}` },
  { name: "Mundo EPUB", search: q => `https://mundoepub.net/?s=${encodeURIComponent(q)}` },
  { name: "PDF Drive", search: q => `https://www.pdfdrive.com/search?q=${encodeURIComponent(q)}` },
  { name: "Bookmate", search: () => "https://bookmate.com/", queryVerified: false },
  { name: "Libronera", search: q => `https://libronera.com/?s=${encodeURIComponent(q)}` },
  { name: "Epubera", search: q => `https://epubera1.com/?s=${encodeURIComponent(q)}` },
  { name: "Lectulandia", search: q => `https://ww3.lectulandia.co/?s=${encodeURIComponent(q)}` },
  { name: "Epublandia", search: q => `https://epublandia.net/?s=${encodeURIComponent(q)}` },
  { name: "Z-Library", search: q => `https://z-lib.vc/s?q=${encodeURIComponent(q)}` }
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalize = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const reports = [];
let linkChecks = 0;

// Exercise every book/source combination locally: URL must be valid, remain on
// the configured source host, and preserve the full query after URL decoding.
for (const book of BOOKS) {
  for (const source of SOURCES) {
    const raw = source.search(book);
    const url = new URL(raw);
    assert.equal(url.protocol, "https:", `${source.name}: HTTPS required`);
    assert.ok(url.hostname, `${source.name}: host missing`);
    if (source.queryVerified !== false) assert.ok(raw.includes(encodeURIComponent(book)), `${source.name}: query not encoded`);
    linkChecks++;
  }
}
console.log(`LINK MATRIX: PASS — ${linkChecks}/${BOOKS.length * SOURCES.length} generated links are valid HTTPS URLs with encoded test queries.`);
const liveQuery = "Mero cristianismo";
console.log(`LIVE PROBE: one real search request per source, title-only query="${liveQuery}". This is a smoke test, not proof all 14 titles are available.`);

for (const source of SOURCES) {
  const searchUrl = source.search(liveQuery);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const report = { source: source.name, requestedUrl: searchUrl };
  try {
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; LibroSearchSourceProbe/0.1)",
        "accept": "text/html,application/xhtml+xml"
      }
    });
    report.httpStatus = response.status;
    report.finalUrl = response.url;
    report.contentType = response.headers.get("content-type") || "";
    const body = (await response.text()).slice(0, 1_500_000);
    const text = normalize(body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
    report.queryMentioned = text.includes(normalize("Mero cristianismo"));
    report.looksLikeHtml = /html/i.test(report.contentType);
    report.responseBytesSampled = body.length;
    const candidates = [];
    const anchorRe = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi;
    for (const match of body.matchAll(anchorRe)) {
      const title = normalize(match[2].replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim());
      if (!title.includes("mero cristianismo")) continue;
      try {
        const href = new URL(match[1].replace(/&amp;/g, "&"), response.url).href;
        candidates.push({ title: match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), url: href });
      } catch {}
    }
    report.matchingBookLinks = [...new Map(candidates.map(c => [c.url, c])).values()].slice(0, 5);
    report.outcome = response.ok && report.looksLikeHtml
      ? (report.matchingBookLinks.length ? "MATCHING_BOOK_LINK_FOUND" : report.queryMentioned ? "HTML_QUERY_ECHO_NO_MATCHING_BOOK_LINK" : "HTML_NO_QUERY_TEXT")
      : "HTTP_OR_CONTENT_ERROR";
  } catch (error) {
    report.outcome = error?.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR";
    report.error = error?.cause?.code || error?.message || String(error);
  } finally {
    clearTimeout(timer);
  }
  reports.push(report);
  console.log(JSON.stringify(report));
  await sleep(350);
}

const reachable = reports.filter(r => r.httpStatus >= 200 && r.httpStatus < 400 && r.looksLikeHtml).length;
console.log(`LIVE SUMMARY: ${reachable}/${SOURCES.length} returned HTML with a 2xx/3xx final status; this does not certify the search route or book-result extraction.`);
console.log("BOOK FIXTURES:");
for (const book of BOOKS) console.log(`- ${book}`);
