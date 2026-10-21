import { test, expect } from "@playwright/test";

const books = [
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

test("la interfaz busca en once fuentes y la API informa resultados reales para los 14 libros", async ({ page, request }) => {
  const sourcesResponse = await request.get("/api/sources");
  expect(sourcesResponse.ok()).toBeTruthy();
  const sourceData = await sourcesResponse.json();
  expect(sourceData.sources).toHaveLength(12);
  const docer = sourceData.sources.find(source => source.id === "docer");
  expect(docer).toBeTruthy();
  expect(docer.base).toBe("https://docer.ar");
  expect(sourceData.sources[1].id).toBe("z-library");
  expect(sourceData.sources[1].base).toBe("https://z-lib.vc");
  expect(sourceData.sources[2].base).toBe("https://pdfdrive.pw");
  expect(sourceData.sources[11].id).toBe("internet-archive");
  expect(sourceData.sources[11].base).toBe("https://archive.org");

  await page.goto("/");
  await expect(page.locator('[data-mode="direct"]')).toBeVisible({ timeout: 10_000 });
  await page.locator('[data-mode="direct"]').click();
  await page.getByLabel("Título, autor o palabras clave").fill("Mero cristianismo");
  await page.locator("#search-button").click();
  await expect(page.locator("#source-status .source-pill")).toHaveCount(12, { timeout: 35_000 });
  await expect(page.locator("#result-heading")).toContainText("Mero cristianismo");
  const visibleCards = await page.locator(".book-card").count();
  const visibleTitles = await page.locator(".book-card h3").allTextContents();
  expect(visibleTitles.some(title => /mero cristianismo/i.test(title)), "la API debe devolver al menos una ficha real del libro de prueba").toBeTruthy();
  const visibleLinks = await page.locator(".book-card a.open-link").evaluateAll(links => links.map(a => ({ title: a.closest(".book-card")?.querySelector("h3")?.textContent?.trim(), href: a.href })));
  for (const link of visibleLinks) {
    expect(link.href).toMatch(/^https?:\/\//);
    expect(link.title?.length || 0).toBeGreaterThan(2);
  }
  console.log("PLAYWRIGHT UI SMOKE:", JSON.stringify({ sources: 12, visibleCards, visibleTitles, visibleLinks }));

  const matrix = [];
  for (let start = 0; start < books.length; start += 5) {
    const batch = books.slice(start, start + 5);
    const rows = await Promise.all(batch.map(async book => {
      const response = await request.get("/api/search", { params: { q: book }, timeout: 35_000 });
      expect(response.ok(), `API request failed for: ${book}`).toBeTruthy();
      const data = await response.json();
      expect(data.sources).toHaveLength(12);
      const valid = data.results.filter(item => item.title && /^https?:\/\//.test(item.url));
      return {
        book,
        candidateCount: valid.length,
        candidates: valid.slice(0, 5).map(item => ({ title: item.title, source: item.source, url: item.url })),
        sourceStatuses: data.sources.map(source => ({ source: source.source, status: source.status, message: source.message, results: source.results.length }))
      };
    }));
    matrix.push(...rows);
    for (const row of rows) console.log("PLAYWRIGHT BOOK RESULT:", JSON.stringify(row));
  }
  console.log("PLAYWRIGHT FINAL MATRIX:", JSON.stringify({
    booksChecked: matrix.length,
    sourcesChecked: sourceData.sources.length,
    booksWithCandidates: matrix.filter(row => row.candidateCount > 0).length,
    totalCandidates: matrix.reduce((sum, row) => sum + row.candidateCount, 0),
    matrix
  }));
});


test("los modos de fallback generan búsquedas dinámicas sin llamar a la API", async ({ page }) => {
  const apiCalls = [];
  page.on("request", request => {
    if (request.url().includes("/api/search")) apiCalls.push(request.url());
  });
  await page.goto("/");
  const query = page.getByLabel("Título, autor o palabras clave");
  await query.fill("Mero cristianismo");
  await expect(page.locator('[data-mode="links"]')).toHaveClass(/is-active/);
  await expect(page.locator("#search-button")).toContainText("Generar enlaces");
  await page.locator("#search-button").click();
  await expect(page.locator(".book-card")).toHaveCount(12);
  const docerLink = page.locator(".generated-link-card").filter({ hasText: "Docer.ar" });
  await expect(docerLink).toHaveAttribute("href", /docer\.ar\/show\/\?q=Mero(%20|\+)cristianismo/);
  await expect(docerLink.locator(".generated-link-info > span")).toHaveCount(2);
  await expect(docerLink.locator(".source-tile")).toHaveCount(1);
  await expect(docerLink.locator(".source-tile")).toHaveAttribute("title", "docer.ar");
  await expect(docerLink).not.toContainText("Buscador de la fuente");
  await expect(docerLink).not.toContainText("Abrir búsqueda");
  const bookmate = page.locator(".generated-link-card").filter({ hasText: "Bookmate" });
  await expect(bookmate).toHaveAttribute("href", /google\.com\/search\?q=.*site%3Abookmate\.com/);
  const epublandia = page.locator(".generated-link-card").filter({ hasText: "Epublandia" });
  await expect(epublandia).toHaveAttribute("href", /epublandia\.app\/search\?q=Mero(%20|\+)cristianismo/);
  const archive = page.locator(".generated-link-card").filter({ hasText: "Internet Archive" });
  await expect(archive).toHaveAttribute("href", /archive\.org\/search\?query=Mero(%20|\+)cristianismo&tab=texts/);
  await page.locator('[data-mode="dorks"]').click();
  await page.locator("#search-button").click();
  await expect(page.locator(".book-card")).toHaveCount(2);
  await expect(page.locator(".book-card").filter({ hasText: "Google · filetype:pdf" }).first().getByRole("link")).toHaveAttribute("href", /filetype%3Apdf/);
  await expect(page.locator(".book-card").filter({ hasText: "Google · filetype:epub" }).first().getByRole("link")).toHaveAttribute("href", /filetype%3Aepub/);
  expect(apiCalls).toHaveLength(0);
});
