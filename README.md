# Libro Search

**Aplicación:** https://yosoymitxel.github.io/libro-search/

Buscador de libros que permite introducir un título o autor y abrir búsquedas en las fuentes disponibles, además de consultar resultados mediante el backend cuando está desplegado.

## Tecnologías

- **Frontend:** HTML, CSS y JavaScript.
- **Backend:** Node.js, servidor HTTP y API de búsqueda.
- **Pruebas:** Playwright.
- **Despliegue:** GitHub Pages para la interfaz estática y Render para ejecutar el backend.

## Uso local

Requiere Node.js 20 o superior.

```bash
npm install
npm start
```

Abrí http://localhost:3000.

## API

- `GET /api/sources` — lista las fuentes configuradas.
- `GET /api/search?q=...` — consulta las fuentes configuradas y devuelve los resultados obtenidos.
