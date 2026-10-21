import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const TIMEOUT_MS = 9000;
const USER_AGENT = "LibroSearch/0.1 (personal research; contact: local project)";
const SOURCES = [
  { id: "docer", name: "Docer.ar", base: "https://docer.ar", search: q => `https://docer.ar/show/?q=${encodeURIComponent(q)}` },
  { id: "z-library", name: "Z-Library", base: "https://z-lib.vc", search: q => `https://z-lib.vc/s?q=${encodeURIComponent(q)}` },
  { id: "pdf-drive", name: "PDF Drive", base: "https://pdfdrive.pw", search: q => `https://pdfdrive.pw/?q=${encodeURIComponent(q)}` },
  { id: "mundo-epub", name: "Mundo EPUB", base: "https://mundoepub.net", search: q => `https://mundoepub.net/?s=${encodeURIComponent(q)}` },
  { id: "bookmate", name: "Bookmate", base: "https://bookmate.com", search: () => "https://bookmate.com/", searchMode: "blocked-unverified" },
  { id: "libronera", name: "Libronera", base: "https://libronera.com", search: q => `https://libronera.com/?s=${encodeURIComponent(q)}` },
  { id: "epubera", name: "Epubera", base: "https://epubera1.com", search: q => `https://epubera1.com/?s=${encodeURIComponent(q)}` },
  { id: "lectulandia", name: "Lectulandia", base: "https://ww3.lectulandia.co", search: q => `https://ww3.lectulandia.co/?s=${encodeURIComponent(q)}` },
  { id: "epublandia", name: "Epublandia", base: "https://epublandia.app", search: q => `https://epublandia.app/search?q=${encodeURIComponent(q)}` },
  { id: "open-library", name: "Open Library", base: "https://openlibrary.org", search: q => `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}`, api: "open-library" },
  { id: "google-books", name: "Google Books", base: "https://books.google.com", search: q => `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}`, api: "google-books" },
  { id: "internet-archive", name: "Internet Archive", base: "https://archive.org", search: q => `https://archive.org/search?query=${encodeURIComponent(q)}&tab=texts` }
];

function decodeEntities(value) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
function cleanText(html) {
  return decodeEntities(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}
function normalizeText(value) {
  return decodeEntities(String(value)).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, " ").trim();
}
function isRelevantTitle(title, query) {
  const normalizedTitle = normalizeText(title);
  const rawQuery = String(query).trim();
  // Test fixtures and typical user searches use "Author, Book title".
  // Use the final comma-separated segment so an author page cannot masquerade as a book match.
  const titleQuery = rawQuery.includes(",") ? rawQuery.split(",").at(-1).trim() : rawQuery;
  const normalizedQuery = normalizeText(titleQuery);
  if (!normalizedQuery) return false;
  if (normalizedTitle === normalizedQuery || normalizedTitle.includes(normalizedQuery)) return true;
  const ignored = new Set(["de", "del", "la", "las", "el", "los", "y", "en", "un", "una", "por", "para", "con", "the", "of", "and"]);
  const tokens = normalizedQuery.split(" ").filter(token => token.length > 2 && !ignored.has(token));
  if (!tokens.length) return false;
  const matches = tokens.filter(token => normalizedTitle.includes(token)).length;
  return tokens.length === 1 ? matches === 1 : matches >= Math.min(2, tokens.length) && matches / tokens.length >= 0.6;
}
function detectFormat(title, url) {
  const value = `${title} ${url}`.toLowerCase();
  if (/\.pdf(?:$|[?#&])|\bpdf\b|application\/pdf/.test(value)) return "PDF";
  if (/\.epub(?:$|[?#&])|\bepub\b/.test(value)) return "EPUB";
  return "Página del libro";
}
function parseLinks(html, source, query, finalUrl = source.base) {
  const found = [];
  const seen = new Set();
  const anchorRe = /<a\b([^>]*?)href\s*=\s*["']([^"'#]+)["']([^>]*)>([\s\S]*?)<\/a\s*>/gi;
  for (const match of html.matchAll(anchorRe)) {
    const rawUrl = decodeEntities(match[2].trim());
    const title = cleanText(match[4]);
    if (!title || title.length < 3 || title.length > 180 || !isRelevantTitle(title, query)) continue;
    let url;
    try { url = new URL(rawUrl, finalUrl); } catch { continue; }
    if (!["http:", "https:"].includes(url.protocol)) continue;
    const allowedHost = new URL(finalUrl).hostname;
    if (url.hostname !== allowedHost && !url.hostname.endsWith("." + allowedHost)) continue;
    if (url.pathname === "/" || /search|login|register|signup|privacy|terms|contact|category|tag|author|autor/i.test(url.pathname)) continue;
    if (title.toLowerCase() === "leer más" || title.toLowerCase() === "read more" || title.length < 5) continue;
    const key = url.href.split("#")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ id: source.id + "-" + found.length, title, url: key, format: detectFormat(title, key), source: source.name, sourceId: source.id, query });
    if (found.length >= 12) break;
  }
  return found;
}
async function searchSource(source, query) {
  const searchUrl = source.search(query);
  if (source.api) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(searchUrl, { signal: controller.signal, headers: { "user-agent": USER_AGENT, "accept": "application/json" } });
      if (!response.ok) return { source: source.name, sourceId: source.id, status: "error", message: `HTTP ${response.status}`, searchUrl, results: [] };
      const data = await response.json();
      const records = source.api === "open-library" ? (data.docs || []).map(book => ({ title: book.title, url: book.key ? `https://openlibrary.org${book.key}` : "", author: (book.author_name || []).slice(0, 3).join(", "), year: book.first_publish_year })) : (data.items || []).map(item => ({ title: item.volumeInfo?.title, url: item.id ? `https://books.google.com/books?id=${encodeURIComponent(item.id)}` : "", author: (item.volumeInfo?.authors || []).slice(0, 3).join(", "), year: item.volumeInfo?.publishedDate }));
      const results = records.filter(item => item.title && item.url && isRelevantTitle(item.title, query)).slice(0, 12).map((item, i) => ({ id: `${source.id}-${i}`, title: item.title, url: item.url, format: "Ficha bibliográfica", source: source.name, sourceId: source.id, query, author: item.author || "", year: item.year || "" }));
      return { source: source.name, sourceId: source.id, status: results.length ? "ok" : "empty", message: results.length ? `${results.length} coincidencias bibliográficas reales` : "La API respondió, pero no devolvió títulos que coincidan con la consulta", searchUrl, results };
    } catch (error) {
      return { source: source.name, sourceId: source.id, status: "error", message: error?.name === "AbortError" ? "Tiempo de espera agotado" : (error?.cause?.code || error?.message || "Error de conexión"), searchUrl, results: [] };
    } finally { clearTimeout(timer); }
  }
  if (source.searchMode === "blocked-unverified") {
    return {
      source: source.name, sourceId: source.id, status: "error",
      message: "No se confirmó una ruta de búsqueda válida; no se usa una URL de consulta inventada",
      searchUrl, results: []
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, "accept": "text/html,application/xhtml+xml" }
    });
    if (!response.ok) return { source: source.name, sourceId: source.id, status: "error", message: `HTTP ${response.status}`, searchUrl, results: [] };
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html") && !type.includes("xhtml")) {
      return { source: source.name, sourceId: source.id, status: "unsupported", message: "La respuesta no es HTML", searchUrl, results: [] };
    }
    const html = (await response.text()).slice(0, 2_000_000);
    const results = parseLinks(html, source, query, response.url || searchUrl);
    return {
      source: source.name, sourceId: source.id, status: results.length ? "ok" : "empty",
      message: results.length ? `${results.length} enlaces candidatos` : "No se detectaron resultados con el extractor inicial",
      searchUrl, results
    };
  } catch (error) {
    const timeout = error?.name === "AbortError";
    return { source: source.name, sourceId: source.id, status: "error", message: timeout ? "Tiempo de espera agotado" : (error?.cause?.code || error?.message || "Error de conexión"), searchUrl, results: [] };
  } finally { clearTimeout(timer); }
}
function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "x-content-type-options": "nosniff", "cache-control": "no-store" });
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/api/sources") {
    return send(res, 200, { sources: SOURCES.map(({ id, name, base }) => ({ id, name, base, status: "experimental" })) });
  }
  if (url.pathname === "/api/search") {
    const query = (url.searchParams.get("q") || "").trim();
    if (query.length < 2) return send(res, 400, { error: "Escribí al menos 2 caracteres." });
    if (query.length > 120) return send(res, 400, { error: "La búsqueda no puede superar 120 caracteres." });
    const results = await Promise.all(SOURCES.map(source => searchSource(source, query)));
    const items = results.flatMap(r => r.results);
    const unique = new Map();
    for (const item of items) {
      const key = item.title.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
      if (!unique.has(key)) unique.set(key, item);
      else unique.get(key).alsoFoundAt = [...new Set([...(unique.get(key).alsoFoundAt || []), item.source])];
    }
    return send(res, 200, { query, searchedAt: new Date().toISOString(), sourceCount: SOURCES.length, results: [...unique.values()], sources: results });
  }
  if (url.pathname.startsWith("/api/")) return send(res, 404, { error: "Endpoint no encontrado." });
  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const safe = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  const path = join(ROOT, "public", safe);
  try {
    const content = await readFile(path);
    return send(res, 200, content, mime[extname(path)] || "application/octet-stream");
  } catch {
    return send(res, 404, "No encontrado", "text/plain; charset=utf-8");
  }
});
server.listen(PORT, "0.0.0.0", () => console.log(`Libro Search listo en puerto ${PORT}`));
