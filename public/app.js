const form = document.querySelector("#search-form");
const input = document.querySelector("#query");
const button = document.querySelector("#search-button");
const heading = document.querySelector("#result-heading");
const total = document.querySelector("#result-total");
const resultsEl = document.querySelector("#results");
const statusEl = document.querySelector("#source-status");
const modeButtons = [...document.querySelectorAll("[data-mode]")];
let mode = "direct";

const sources = [
  { id: "docer", name: "Docer.ar", base: "https://docer.ar", search: q => `https://docer.ar/show/?q=${encodeURIComponent(q)}` },
  { id: "z-library", name: "Z-Library", base: "https://z-lib.vc", search: q => `https://z-lib.vc/s?q=${encodeURIComponent(q)}` },
  { id: "pdf-drive", name: "PDF Drive", base: "https://pdfdrive.pw", search: q => `https://pdfdrive.pw/?q=${encodeURIComponent(q)}` },
  { id: "mundo-epub", name: "Mundo EPUB", base: "https://mundoepub.net", search: q => `https://mundoepub.net/?s=${encodeURIComponent(q)}` },
  { id: "bookmate", name: "Bookmate", base: "https://bookmate.com", search: q => `https://www.google.com/search?q=${encodeURIComponent(`site:bookmate.com "${q}"`)}`, fallback: true },
  { id: "libronera", name: "Libronera", base: "https://libronera.com", search: q => `https://libronera.com/?s=${encodeURIComponent(q)}` },
  { id: "epubera", name: "Epubera", base: "https://epubera1.com", search: q => `https://epubera1.com/?s=${encodeURIComponent(q)}` },
  { id: "lectulandia", name: "Lectulandia", base: "https://ww3.lectulandia.co", search: q => `https://ww3.lectulandia.co/?s=${encodeURIComponent(q)}` },
  { id: "epublandia", name: "Epublandia", base: "https://epublandia.app", search: q => `https://epublandia.app/search?q=${encodeURIComponent(q)}` },
  { id: "open-library", name: "Open Library", base: "https://openlibrary.org", search: q => `https://openlibrary.org/search?q=${encodeURIComponent(q)}` },
  { id: "google-books", name: "Google Books", base: "https://books.google.com", search: q => `https://books.google.com/books?q=${encodeURIComponent(q)}` },
  { id: "internet-archive", name: "Internet Archive", base: "https://archive.org", search: q => `https://archive.org/search?query=${encodeURIComponent(q)}&tab=texts` }
];

for (const chip of document.querySelectorAll("[data-query]")) {
  chip.addEventListener("click", () => {
    input.value = chip.dataset.query || "";
    form.requestSubmit();
  });
}
modeButtons.forEach(el => el.addEventListener("click", () => {
  mode = el.dataset.mode;
  modeButtons.forEach(btn => {
    const active = btn === el;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  const labels = { direct: "Buscar directo", links: "Generar enlaces", dorks: "Google Dorks" };
  button.innerHTML = `${labels[mode]} <span aria-hidden="true">↗</span>`;
}));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function card({ source, title, url, format = "Búsqueda web", note = "" }) {
  return `<article class="book-card">
    <div class="book-cover" aria-hidden="true"><span>${escapeHtml(format.toUpperCase().slice(0, 8))}</span><strong>↗</strong><small>LIBRO SEARCH</small></div>
    <div class="book-info"><p class="book-source">${escapeHtml(source)} · ${escapeHtml(format)}</p><h3>${escapeHtml(title)}</h3>
    ${note ? `<p class="also-found">${escapeHtml(note)}</p>` : ""}
    <a class="open-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Abrir búsqueda <span>↗</span></a></div>
  </article>`;
}
function renderStatuses(rows) {
  statusEl.innerHTML = rows.map(s => {
    const label = s.status === "ok" ? "Resultados" : s.status === "empty" ? "Sin coincidencias detectadas" : s.status === "unsupported" ? "Formato no compatible" : "No disponible";
    return `<div class="source-pill"><span class="dot ${escapeHtml(s.status)}"></span><span>${escapeHtml(s.source)}</span><span class="source-state">${escapeHtml(label)}</span><a href="${escapeHtml(s.searchUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir búsqueda en ${escapeHtml(s.source)}">↗</a></div>`;
  }).join("");
}
function generatedLinkCard({ source, title, url }) {
  return `<a class="book-card generated-link-card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(title)}">
    <span class="book-cover generated-link-cover" aria-hidden="true"><span>LIBRO</span><strong>↗</strong><small>SEARCH</small></span>
    <span class="generated-link-info"><span class="generated-link-source">${escapeHtml(source)} ↗</span><span class="generated-link-title">${escapeHtml(title)}</span></span>
  </a>`;
}
function renderGeneratedLinks(query) {
  const cards = sources.map(s => ({
    source: s.name, title: `Buscar “${query}”`,
    url: s.search(query)
  }));
  heading.textContent = `Enlaces directos para “${query}”`;
  total.textContent = `${cards.length} ENLACES GENERADOS`;
  statusEl.innerHTML = "";
  resultsEl.innerHTML = cards.map(generatedLinkCard).join("");
}
function googleUrl(query) {
  return "https://www.google.com/search?q=" + encodeURIComponent(query);
}
function renderDorks(query) {
  const safe = query.replace(/["\\\\]/g, " ").trim();
  const dorks = [
    {
      source: "Google · filetype:pdf",
      title: `Buscar “${safe}” en PDF`,
      q: `"${safe}" filetype:pdf`,
      format: "PDF",
      note: "Usa el operador filetype:pdf para encontrar archivos PDF indexados."
    },
    {
      source: "Google · filetype:epub",
      title: `Buscar “${safe}” en EPUB`,
      q: `"${safe}" filetype:epub`,
      format: "EPUB",
      note: "Usa el operador filetype:epub para encontrar archivos EPUB indexados."
    }
  ];
  heading.textContent = `Google Dorks para “${query}”`;
  total.textContent = "2 BÚSQUEDAS";
  statusEl.innerHTML = "";
  resultsEl.innerHTML = dorks.map(d => card({
    source: d.source, title: d.title, url: googleUrl(d.q), format: d.format, note: d.note
  })).join("");
}
async function searchDirect(query) {
  button.disabled = true;
  button.innerHTML = 'Buscando <span class="spinner" aria-hidden="true"></span>';
  heading.textContent = `Buscando “${query}”`;
  total.textContent = "";
  statusEl.innerHTML = "";
  resultsEl.innerHTML = '<div class="loading-state"><span class="spinner dark"></span> Consultando la API de búsqueda…</div>';
  try {
    const configuredApiBase = document.querySelector('meta[name="api-base"]')?.content.trim() || "";
    const endpoint = configuredApiBase
      ? new URL(`/api/search?q=${encodeURIComponent(query)}`, configuredApiBase).href
      : new URL("./api/search?q=" + encodeURIComponent(query), document.baseURI).href;
    const response = await fetch(endpoint);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("La búsqueda directa necesita el backend Node desplegado. Mientras tanto, usá “Generar enlaces” para consultar cada web o “Google Dorks” para buscar PDF/EPUB.");
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo completar la búsqueda.");
    heading.textContent = `Resultados para “${data.query}”`;
    total.textContent = `${data.results.length} RESULTADOS CANDIDATOS`;
    renderStatuses(data.sources);
    if (!data.results.length) {
      resultsEl.innerHTML = '<div class="empty-state"><span class="empty-icon">⌕</span><h3>No encontramos coincidencias verificables</h3><p>Revisá los estados por fuente; un bloqueo o un extractor incompatible no significa que el libro no exista.</p></div>';
      return;
    }
    resultsEl.innerHTML = data.results.map(item => card({
      source: item.source, title: item.title, url: item.url, format: item.format || "Página del libro",
      note: item.alsoFoundAt?.length ? `También en: ${item.alsoFoundAt.join(", ")}` : ""
    })).join("");
  } catch (error) {
    heading.textContent = "La búsqueda directa necesita el backend";
    total.textContent = "API NO CONECTADA";
    statusEl.innerHTML = "";
    resultsEl.innerHTML = `<div class="empty-state"><span class="empty-icon">↗</span><h3>No voy a inventar resultados</h3><p>${escapeHtml(error.message)}</p><p style="margin-top:12px"><button type="button" class="inline-action" data-fallback="links">Generar enlaces de búsqueda</button> <button type="button" class="inline-action" data-fallback="dorks">Crear Google Dorks</button></p></div>`;
    resultsEl.querySelectorAll("[data-fallback]").forEach(el => el.addEventListener("click", () => {
      mode = el.dataset.fallback;
      modeButtons.forEach(btn => {
        const active = btn.dataset.mode === mode;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
      });
      if (mode === "links") renderGeneratedLinks(query); else renderDorks(query);
    }));
  } finally {
    button.disabled = false;
    const labels = { direct: "Buscar directo", links: "Generar enlaces", dorks: "Google Dorks" };
    button.innerHTML = `${labels[mode]} <span aria-hidden="true">↗</span>`;
  }
}
form.addEventListener("submit", event => {
  event.preventDefault();
  const query = input.value.trim();
  if (query.length < 2) return;
  if (mode === "links") renderGeneratedLinks(query);
  else if (mode === "dorks") renderDorks(query);
  else searchDirect(query);
});
