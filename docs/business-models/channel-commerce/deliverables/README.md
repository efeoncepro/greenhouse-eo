# Channel & Commerce — documento de modelo de negocio para el equipo

> **Tipo de documento:** Guía de mantenimiento de un entregable interno
> **Versión:** 1.0
> **Creado:** 2026-09-11 por Claude (agente), a pedido de Julio Reyes
> **Última actualización:** 2026-09-11 por Claude (agente)
> **Documentación relacionada:** [`CHANNEL_COMMERCE_BUSINESS_MODEL_V1`](../CHANNEL_COMMERCE_BUSINESS_MODEL_V1.md) · [catálogo de servicios](../../../services/channel-commerce/README.md) · [Estándar de marca y entrega de informes](../../../operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md)

## Qué es

Un PDF con membrete de Efeonce que resume la línea Channel & Commerce completa —modelo de negocio, servicios,
ventaja competitiva y mercado— para presentarla al equipo. Lo pidió Julio Reyes (CEO) y lo aprobó el
2026-09-11.

| Archivo | Rol |
| --- | --- |
| [`Efeonce-Channel-Commerce-Modelo-de-Negocio.pdf`](Efeonce-Channel-Commerce-Modelo-de-Negocio.pdf) | Entregable. A4, 19 páginas, «Confidencial · Uso interno». |
| [`channel-commerce-modelo-de-negocio.src.html`](channel-commerce-modelo-de-negocio.src.html) | Fuente editable. Contiene los marcadores `{{FONTS}}`, `{{LOGO_FULL}}`, `{{LOGO_NEG}}` y `{{URL_BUBBLE}}`, que el script reemplaza. |
| [`render-channel-commerce-business-model.mjs`](../../../../scripts/documents/render-channel-commerce-business-model.mjs) | Genera el PDF a partir de la fuente. |

Versión vigente: commit `f4aa956ae` (2026-09-11).

## Audiencia y confidencialidad

- **Audiencia:** el equipo interno de Efeonce.
- **No se comparte con clientes, proveedores ni terceros.** Contiene información de competidores, proveedores y
  capital. Si un cliente necesita material de la línea, se prepara otro documento; este PDF no se adapta.

## Qué contiene

Portada oscura con el logo negativo, índice paginado, catorce secciones y contraportada con el eslogan y el
contacto institucional.

1. Resumen ejecutivo
2. El problema que resolvemos y quién compra
3. El mercado
4. Competencia
5. Ventaja competitiva
6. Los servicios (23: 13 de trade marketing, 9 de BTL y 1 transversal)
7. Cómo operamos
8. Proveedores y financiamiento
9. Cómo cobramos
10. Capital y caja (con un gráfico de seis escenarios de pago)
11. Riesgos
12. Hitos de validación y próximos pasos
13. Cómo hablamos de la línea
14. Fuentes

## De dónde salen las cifras

El PDF es un **derivado**. La fuente de verdad son estos documentos; si alguno cambia, se edita la fuente HTML y
se regenera el PDF.

- [`CHANNEL_COMMERCE_BUSINESS_MODEL_V1`](../CHANNEL_COMMERCE_BUSINESS_MODEL_V1.md) — modelo de negocio de la línea.
- [`CHANNEL_COMMERCE_CAPITAL_AND_CASH_MODEL_V1`](../CHANNEL_COMMERCE_CAPITAL_AND_CASH_MODEL_V1.md) — capital y ciclo de caja.
- [`CHANNEL_COMMERCE_PHASED_ROADMAP_V1`](../CHANNEL_COMMERCE_PHASED_ROADMAP_V1.md) — fases y asignación de capital.
- [`CHANNEL_COMMERCE_SUPPLIER_REGISTRY_V1`](../CHANNEL_COMMERCE_SUPPLIER_REGISTRY_V1.md) — registro de proveedores.
- [`CHANNEL_COMMERCE_PROSPECTING_PLAN_V1`](../CHANNEL_COMMERCE_PROSPECTING_PLAN_V1.md) — plan de apertura y prospección.
- [Catálogo de servicios](../../../services/channel-commerce/README.md) — los 23 servicios.
- [`CHANNEL_COMMERCE_CHILE_MARKET_BENCHMARK_2026-09-10`](../../../audits/commercial/CHANNEL_COMMERCE_CHILE_MARKET_BENCHMARK_2026-09-10.md) — benchmark del mercado chileno.
- [`CHANNEL_COMMERCE_COMPETITIVE_BATTLECARDS_V1`](../../../audits/commercial/CHANNEL_COMMERCE_COMPETITIVE_BATTLECARDS_V1.md) — battlecards competitivas.

La sección 14 del PDF lista las fuentes con su fecha.

## Qué hace el script

- Inyecta como data URI las fuentes de marca (Geist y Poppins, desde `src/assets/fonts/`), los logos oficiales
  (`public/branding/logo-full.svg` y `logo-negative.svg`) y el URL bubble
  (`src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg`).
- Lee dirección y teléfono desde `slots.contactDetails.value` en
  `src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json`; no hay otra copia manual.
- Agrega la cabecera (logo + «Confidencial · Uso interno») a las páginas interiores y el pie institucional
  (bubble con enlace, dirección, teléfono y folio) a **todas** las páginas, incluidas portada y contraportada.
- Calcula los números del índice desde la página real en la que cae cada sección.
- Falla con código 2 si el contenido de alguna página desborda su área, y también si las fuentes de marca no
  cargan o hay imágenes rotas.
- Escribe el PDF de forma atómica: si algo falla, el PDF anterior queda intacto.

## Cómo actualizarlo

1. **Corrige primero la fuente de verdad.** Si cambia una cifra, un servicio o una decisión, actualiza antes el
   documento canónico de la lista anterior. El PDF nunca adelanta una decisión que el canon no tiene.
2. **Edita la fuente HTML** (`channel-commerce-modelo-de-negocio.src.html`). No reemplaces los marcadores
   `{{…}}`: los resuelve el script. Actualiza la fecha de la nota «Sobre este documento».
3. **Regenera desde la raíz del repo:**

   ```bash
   node scripts/documents/render-channel-commerce-business-model.mjs
   ```

   Requiere Playwright, que ya está instalado en el repo.
4. **Si falla por desborde (código 2),** redistribuye el contenido entre hojas: mueve un bloque a la hoja
   siguiente, divide una tabla o separa una sección. No reduzcas la tipografía ni los márgenes para forzar el
   ajuste. Si falla por fuentes o imágenes, revisa que los assets de marca sigan en sus rutas.
5. **Revisa el PDF exportado, no el navegador:**
   - `pdfinfo` para confirmar A4, número de páginas y título.
   - `pdftotext` por página para confirmar dirección y teléfono en todas, y el índice contra la página 2.
   - `pdftoppm` de todas las páginas y revisión visual de cada una: portada, tablas, gráfico de escenarios,
     cambios de sección y contraportada.
6. **Barre las fugas** sobre el texto extraído y revisa cada coincidencia:

   ```bash
   PDF=docs/business-models/channel-commerce/deliverables/Efeonce-Channel-Commerce-Modelo-de-Negocio.pdf
   pdftotext "$PDF" - | grep -nE 'TODO|TASK-|EPIC-|MINI-|\b(ADR|PDR)\b|\bG[1-6]\b'
   pdftotext "$PDF" - | grep -niE '\.md\b|docs/|src/|\[verificar\]|\b(skill|agente|claude|codex|lint|gate|pnpm|repo|proposed|accepted|draft)\b'
   ```

   `TODO` y los códigos van en la búsqueda sensible a mayúsculas: con `-i`, `TODO` coincide con «todo» y «método».
   Revisa cada coincidencia de la segunda búsqueda. Una coincidencia real se corrige en la fuente HTML y se
   regenera.
7. **Preflight opcional:** el `check_pdf.py` de la skill report-studio requiere PyMuPDF. Si no está instalado,
   decláralo en la entrega en vez de darlo por pasado.
8. **Commitea el PDF y la fuente juntos** (y el script, si cambió), para que nunca queden desalineados.

## Qué no hacer

- No edites el PDF a mano ni con otra herramienta: se pierde la trazabilidad con la fuente.
- No agregues códigos internos de trabajo, rutas de archivos, marcadores de verificación, nombres de
  herramientas o agentes ni notas al operador. Traduce los códigos internos a nombres claros.
- No lo compartas con clientes, proveedores ni terceros.
- No presentes como aprobados los precios, las tasas de factoring ni ninguna otra decisión que siga en
  validación.
- No introduzcas cifras que no estén en los documentos fuente; si una cifra no está verificada, márcala en
  lenguaje claro.

## Decisiones que el documento declara pendientes

Ninguna de estas está aprobada; el PDF las presenta como pendientes y así deben seguir hasta que el canon cambie:

| Decisión | Estado declarado |
| --- | --- |
| Precios | En validación. Cotización caso a caso, con piso de 45% de margen. |
| Tasas de factoring | Referenciales. Finance debe confirmarlas. |
| Proveedores con compromiso exigible | Pendiente. |
| Arranque de la etapa 2 | Pendiente. |
| Quién de Comercial recibe los briefs | Pendiente. |
| Título y dirección visual de la landing | Pendiente. |

## Revisión de la versión vigente

La versión del 2026-09-11 se revisó con `pdfinfo` (A4, 19 páginas, PDF etiquetado, título), `pdftotext` por
página (dirección y teléfono en las 19; índice contra la página 2), `pdftoppm` de las 19 páginas con revisión
visual de cada una y el barrido de fugas, sin coincidencias reales. El preflight `check_pdf.py` no corrió porque
PyMuPDF no estaba instalado.
