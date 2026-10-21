# Estado de las fuentes

La auditoría de Playwright del 21 de octubre de 2026 inspeccionó los formularios reales y probó una búsqueda de “Mero cristianismo”. El método y los parámetros de abajo se observaron en el HTML; no se infieren solo por el nombre del sitio.

| Fuente | Formulario observado | Resultado de la prueba | Estado |
|---|---|---|---|
| Docer.ar | GET `/show/`, campo `q` | La entrada de búsqueda no navegó al enviar Enter; la API devolvió HTTP 404 para la ruta de consulta. | Ruta observada; envío y extracción no confirmados |
| Mundo EPUB | GET `/`, campo `s` | Llegó a `/?s=Mero+cristianismo` y mostró página de búsqueda, pero no se detectó una ficha con ese título. | Formulario confirmado; coincidencia no confirmada |
| PDF Drive | GET `/search`, campo `q` | Llegó a `/search?q=Mero+cristianismo&r=1`, HTTP 200; no se detectó una ficha coincidente. | Formulario confirmado; extracción pendiente |
| Bookmate | Sin ruta de búsqueda verificada | La portada devolvió HTTP 403/Cloudflare y no expuso formulario al navegador automatizado. La API ahora marca la fuente como no disponible sin llamar a una URL de búsqueda inventada. | Bloqueado; no simular resultados |
| Libronera | GET `/`, campo `s` | Llegó a `/?s=Mero+cristianismo` y mostró página de búsqueda, sin ficha coincidente detectada. | Formulario confirmado; coincidencia no confirmada |
| Epubera | GET `/`, campo `s` | Llegó a `/?s=Mero+cristianismo` y mostró página de búsqueda, sin ficha coincidente detectada. | Formulario confirmado; coincidencia no confirmada |
| Lectulandia | GET `/`, campo `s` | El formulario existe; la consulta de “Mero cristianismo” no dio coincidencia. En la matriz de 14 libros sí se detectaron “Pensamientos” y “Camino de servidumbre”; la fuente respondió HTTP 503 en algunas consultas. | Coincidencias parciales; disponibilidad inestable |
| Epublandia | Ruta de búsqueda pendiente de verificar en el dominio actual `.app` | Se encontró el dominio actual, pero todavía no se ha confirmado el formulario ni sus parámetros. La API no envía una consulta inventada. | Portada disponible; buscador pendiente de auditoría |
| Z-Library | GET `/s`, campo `q` | Llegó a `/s?q=Mero+cristianismo` y mostró página de búsqueda, sin ficha coincidente detectada. | Ruta corregida desde el formulario observado; coincidencia no confirmada |

## Matriz de los 14 libros

La prueba de integración ejecutó las 14 consultas contra las nueve fuentes configuradas. Detectó 3 candidatos en total para 2 de los 14 libros: dos fichas de “Pensamientos” y una de “Camino de servidumbre”, todas en Lectulandia. No detectó candidatos para los otros 12 títulos.

Esto **no** significa que los otros libros no existan: las respuestas vacías pueden deberse a la ausencia de coincidencias, a HTML distinto del extractor genérico, a bloqueos o a respuestas temporales. La prueba confirma que el flujo de la API responde y registra estados; todavía no valida una extracción satisfactoria en las nueve fuentes.

## Criterio de verificación

Una fuente solo debe marcarse como verificada después de comprobar una consulta real con un término conocido, inspeccionar el HTML de respuesta y validar que los enlaces candidatos son fichas de libros y no páginas de navegación. Si un sitio exige sesión o bloquea automatización, se indica y se ofrece abrir la fuente original; no se intentan eludir controles de acceso.
