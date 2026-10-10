# Modelo programmatic — entrega interna

**Fecha:** 2026-10-09 · **Audiencia:** equipo Efeonce, confidencial.

**Estado actual:** borrador previo. El operador pidió iterar el modelo primero en la conversación y presentar el
servicio al cliente sólo con la marca Efeonce. El PDF conserva la composición anterior y no incorpora el modelo V1.1 ni su mapa completo de capacidades; no usarlo como oferta aprobada ni regenerarlo hasta acordar el modelo.

- [PDF A4 revisado](Efeonce-Programmatic-Modelo-de-Negocio.pdf), seis páginas.
- [Fuente editorial](programmatic-modelo-de-negocio.src.html).
- [Manifiesto de fuentes y hashes](programmatic-modelo-de-negocio.manifest.json).
- [Modelo canónico](../PROGRAMMATIC_MEDIA_OPERATIONS_BUSINESS_MODEL_V1.md) y
  [Pricing Integrity Pack](../PROGRAMMATIC_MEDIA_OPERATIONS_PRICING_INTEGRITY_PACK_V1.md).

La versión PDF resume la decisión, cliente, packaging, proveedores, economía, operación y próximos pasos. No es una
propuesta de cliente ni un acuerdo con proveedores. Regenerar cuando cambien los documentos canónicos; el manifiesto
registra versiones por hash, pero no comprueba por sí solo que una edición editorial incorpore todos los cambios.

## Regeneración

Desde la raíz del repositorio:

```sh
node scripts/documents/render-programmatic-business-model.mjs
```

Requiere Playwright/Chromium local y Python con pypdf. El script usa el runtime de documentos de Codex si está
disponible; admite `PROGRAMMATIC_PDF_PYTHON` para señalar otro Python existente. No instala dependencias.

El renderer reutiliza el patrón de hojas A4 del documento Channel & Commerce. Fuentes: Geist y Poppins oficiales;
logos desde `public/branding/`; URL bubble horneada para papel desde el paquete institucional; dirección/teléfono
desde `back-cover-full.slots.json`. Valida fuentes, imágenes y desborde antes de exportar, escribe atómicamente y
conserva metadata, idioma, enlaces y marcadores en el acabado.

## QA realizado

- Seis páginas A4; texto seleccionable, título, autor Efeonce, idioma es-CL y marcadores presentes.
- Fuentes Geist/Poppins incrustadas; cero imágenes rotas y cero desbordes en el renderer.
- Dirección, teléfono, URL bubble y folio comprobados en las seis páginas; índice 2–6 corresponde a los destinos.
- Revisión visual de páginas 1–6; después de la corrección editorial, revisadas de nuevo 2, 4 y 5; sin cambio de paginación.
- Barrido del texto: sin rutas locales, códigos de trabajo, nombres de agentes ni estados internos en inglés.
- Carril de respaldo: Poppler (`pdfinfo`, `pdffonts`) y pypdf/pypdfium2 para extracción, enlaces y render. El helper
  completo de Report Studio no corrió porque PyMuPDF no está disponible; no se instalaron dependencias.

No se certificó PDF/UA, lectura con tecnología asistiva ni semántica completa de las etiquetas. El archivo quedó
guardado localmente; no se envió ni publicó. Contratos, crédito, costos y precios por cliente siguen pendientes.
