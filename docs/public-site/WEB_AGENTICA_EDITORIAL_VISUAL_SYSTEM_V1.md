# Sistema visual editorial — Web agéntica

> **Estado:** producción visual v5 integrada en borrador privado; publicación pendiente.
> **Fecha:** 2026-07-18.
> **Artículo:** borrador WordPress `249387`, `El fin de la web “solo para humanos”`.
> **Manifest:** `WEB_AGENTICA_VISUAL_ASSET_MANIFEST_V1.json`.

## Decisión editorial

La portada conserva la escena conceptual aprobada. El cuerpo usa tres infografías determinísticas y ninguna imagen
decorativa adicional. Las piezas deben sentirse parte del artículo, no láminas insertadas: el canvas exterior
coincide con el tema (`#FFFFFF` en light y `#111013` en dark), sin burbujas, manchas, gradientes, glow ni un marco
redondeado alrededor de la composición.

El color sólo codifica relaciones: teal para continuidad/recorrido, azul para capacidades, verde para gobierno y
dorado para distinguir la interfaz humana. Las cards son superficies funcionales, no decoración de dashboard.
Después de la auditoría histórica del 2026-07-18, tampoco pueden convertirse en el arquetipo repetido de la serie:
la relación de cada argumento debe elegir su propia composición semántica.

## Sistema

- **Concepto:** una misma infraestructura gana un segundo operador sin duplicar sus reglas.
- **Motivo:** recorridos que avanzan desde interfaz hacia capacidades y gobierno.
- **Gramática:** ejes y capas; conectores detrás del copy; una conclusión por activo.
- **Skin:** Efeonce core, sin paleta contextual de plataforma o cliente.
- **Firma:** wordmarks oficiales `public/branding/logo-full.svg` y `logo-negative.svg`, pequeños y periféricos,
  más el sello `efeoncepro.com` consumido desde
  `src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg` en la próxima entrega.
- **Tema:** variantes light y dark deliberadas; nunca inversión o filtro CSS.
- **Responsive:** desktop horizontal `1600×1000`; móvil vertical `1200×1600`; breakpoint gobernado `860px`.
- **Integración:** un `<picture>` por concepto, con dark+móvil, light+móvil, dark+desktop y fallback light+desktop.

## Visual job map

### WAG-V01 — Dos operadores

- **Slot:** featured y OG; no se repite en body.
- **Función:** instalar que una persona y un agente convergen sobre la misma infraestructura web.
- **No es:** interfaz real, robot humanoide, evidencia de producto ni promesa de autonomía.
- **Estado:** aprobado e integrado en el borrador; no cambia en v2.

### WAG-V02 — Frontera operativa

- **Slot:** cuerpo, después de la taxonomía de tipos de sitio.
- **Función:** hacer visible que operabilidad externa y gobierno aumentan juntos; “más IA” dentro del sitio no
  produce por sí sola una web agéntica.
- **Delta explicativo:** compara cuatro tipos de sitio por operador, comprensión del agente, capacidad, control y
  señal de éxito. La pieza admite lectura rápida por etapa y lectura profunda por contrato operativo.
- **No es:** ranking universal, madurez automática ni promesa de que todo sitio deba automatizarse.
- **ALT:** `Cuatro etapas aumentan la operabilidad para agentes externos y el gobierno de las acciones: sitio tradicional, sitio con IA, sitio preparado y web agéntica.`
- **Caption:** `La transición decisiva no es “más IA”, sino autoridad acotada, auditable y revocable.`

### WAG-V03 — Arquitectura compartida

- **Slot:** cuerpo, en la sección sobre cambios de arquitectura.
- **Función:** mostrar que la interfaz humana, WebMCP y la API consumen capacidades, gobierno, datos y reglas
  compartidos.
- **Delta explicativo:** vuelve visible dónde evitar la duplicación: interfaz humana y estructurada convergen en
  una capacidad compartida, un contrato de ejecución, gobierno proporcional al riesgo y una fuente de verdad.
- **No es:** arquitectura de referencia completa, diagrama de despliegue ni afirmación de que WebMCP reemplace APIs.
- **ALT:** `La interfaz humana, WebMCP y la API consumen las mismas capacidades gobernadas, los mismos datos y las mismas reglas del negocio.`
- **Caption:** `La interfaz cambia; el contrato de capacidades, gobierno y datos permanece compartido.`

### WAG-V04 — Cadena de autoridad

- **Slot:** cuerpo, dentro de la sección sobre confianza y autorización.
- **Función:** mostrar que la identidad del agente no basta: una acción válida conecta intención humana,
  representación, alcance, confirmación y evidencia recuperable.
- **Delta explicativo:** distingue cuatro verificaciones que suelen mezclarse —quién actúa, en nombre de quién,
  qué puede hacer y cómo se demuestra/revierte— y las ubica sobre la cadena persona → agente/operador → capacidad
  del sitio → sistema de registro.
- **No es:** estándar de identidad, flujo OAuth completo, arquitectura IAM ni garantía de seguridad.
- **ALT:** `Una persona delega una intención a un agente u operador; la capacidad del sitio valida identidad,
  alcance y confirmación antes de registrar un resultado auditable, revocable y recuperable.`
- **Caption:** `Identificar al agente no basta: la empresa debe comprobar autoridad, alcance, confirmación y evidencia.`

## Qué se usa y qué se excluye

Se usa jerarquía tipográfica clara, espacio negativo, acentos funcionales, firma oficial y superficies coherentes
con el tema. Se excluyen burbujas decorativas, fondos celestes o azul petróleo ajenos al artículo, gradientes,
glow, vidrio, perspectiva 3D, miniwidgets, estética SaaS genérica, texto microscópico y una composición única
reescalada para móvil.

## Dirección de la próxima iteración

La v5 permanece como evidencia integrada del borrador privado, pero V02 y V04 repiten una gramática de cards que
no alcanza el estándar editorial auditado. La siguiente reconstrucción debe conservar tesis, copy validado,
light/dark y responsive, pero reasignar arquetipos:

- **WAG-V02 — paisaje de frontera/madurez:** usar los dos ejes como estructura real y un recorrido ascendente con
  cuatro hitos; las variables de operador, comprensión, capacidad y control viven como señales del hito, no como
  cuatro tarjetas equivalentes.
- **WAG-V03 — corte arquitectónico por capas:** tres entradas —interfaz humana, WebMCP y API— convergen sobre una
  espina de capacidades; gobierno y fuente de verdad cruzan el sistema como capas compartidas. Evitar un stack de
  cajas que no muestre la convergencia.
- **WAG-V04 — cadena de custodia y evidencia:** representar intención → representación → alcance → confirmación →
  registro/recuperación como un trayecto verificable con gates y rastro de evidencia; no otro escalón de cards.

El canon transversal y la auditoría de precedentes viven en
`.codex/skills/content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md` y
`docs/audits/public-site/2026-07-18-efeonce-editorial-infographic-system.md`.

## Producción y QA

La cadena vigente pasa a ser `contrato → SVG source → delivery SVG saneado y/o raster justificado → prueba
contextual`. La v5 existente todavía usa `SVG → PNG master → WebP`; no debe obligar a la próxima versión a
rasterizar. Antes de servir SVG directo se ejecuta
`pnpm content:editorial-svg:audit -- <delivery.svg...>` y se resuelven texto vivo, filtros, referencias, clipping
y dimensiones intrínsecas.
El reporte reproducible vive en `ai-generations/2026-07-18_web-agentica-pillar/build-report-v2.json`. Las pruebas
contextuales usan los anchos medidos en los precedentes: `1112px` desktop y `358px` móvil. La producción no se
considera desplegada hasta completar Media Library, `<picture>`, readback y QA dentro del borrador privado. La
versión v5 completó esos gates para WAG-V04 en el post privado `249387`; el pendiente restante es la autorización
humana de publicación y la QA live posterior.

El build también mide el `getBBox()` de cada bloque de texto contenido en una card. Si cualquier glifo cruza los
límites de su superficie, la generación falla antes de producir masters. Este gate se agregó tras detectar que el
titular de la etapa `04 AGÉNTICO` excedía el ancho útil en desktop; desde v3 el contenido queda medido, v4 amplió
la taxonomía compartible y v5 incorporó la cadena de autoridad sin volver a introducir desbordes.
