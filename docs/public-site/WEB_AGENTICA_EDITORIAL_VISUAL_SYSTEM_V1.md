# Sistema visual editorial — Web agéntica

> **Estado:** producción visual v7 publicada y verificada en vivo.
> **Fecha:** 2026-07-18.
> **Artículo:** WordPress `249387`, `El fin de la web “solo para humanos”: cómo preparar tu sitio para los agentes de IA`, publicado en
> `https://efeoncepro.com/aeo/web-agentica-agentes-ia/`.
> **Manifest:** `WEB_AGENTICA_VISUAL_ASSET_MANIFEST_V1.json`.

## Decisión editorial

La portada conserva la escena conceptual aprobada. El cuerpo usa siete infografías determinísticas y ninguna imagen
decorativa adicional. Las piezas deben sentirse parte del artículo, no láminas insertadas: el canvas exterior
coincide con el tema (`#FFFFFF` en light y `#111013` en dark), sin burbujas, manchas, gradientes, glow ni un marco
redondeado alrededor de la composición.

El color sólo codifica relaciones: naranja para progresión/decisión, azul para capacidades, púrpura y magenta
para fronteras intermedias y verde para gobierno/evidencia. Las cards son superficies funcionales, no decoración de dashboard.
Después de la auditoría histórica del 2026-07-18, tampoco pueden convertirse en el arquetipo repetido de la serie:
la relación de cada argumento debe elegir su propia composición semántica.

## Sistema

- **Concepto:** una misma infraestructura gana un segundo operador sin duplicar sus reglas.
- **Motivo:** recorridos que avanzan desde interfaz hacia capacidades y gobierno.
- **Gramática:** ejes y capas; conectores detrás del copy; una conclusión por activo.
- **Skin:** Efeonce core, sin paleta contextual de plataforma o cliente.
- **Firma:** toda información de marca vive exclusivamente en el footer. El header no lleva logo. La entrega reúne
  fuente/fecha a la izquierda y, a la derecha, el wordmark oficial junto al sello `efeoncepro.com` consumido desde
  `src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg`.
- **Tema:** variantes light y dark deliberadas; nunca inversión o filtro CSS.
- **Responsive:** desktop horizontal `1600×1080`; móvil vertical `1200×1600`; breakpoint gobernado `860px`.
- **Integración:** un `<picture>` por concepto, con dark+móvil, light+móvil, dark+desktop y fallback light+desktop.

## Visual job map

### WAG-V01 — Dos operadores

- **Slot:** featured y OG; no se repite en body.
- **Función:** instalar que una persona y un agente convergen sobre la misma infraestructura web.
- **No es:** interfaz real, robot humanoide, evidencia de producto ni promesa de autonomía.
- **Estado:** aprobado, integrado y verificado en archive card, OG/Twitter y schema.

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

### WAG-V05 — Mapa del ecosistema

- **Slot:** después de las señales del mercado.
- **Función:** ubicar WebMCP, NLWeb, ACP/UCP, AP2, A2A y AAIF por la frontera que atienden.
- **Arquetipo:** mapa de tránsito por capas; no una grilla de logos ni un ranking.
- **Conclusión:** no existe un ganador único: emerge un stack de interoperabilidad.

### WAG-V06 — Circuito de evaluación

- **Slot:** después de la taxonomía de evals.
- **Función:** conectar contrato, pruebas deterministas, evaluación probabilística, E2E y recuperación.
- **Arquetipo:** circuito de evidencia con retorno; no checklist lineal ni pipeline de deployment.
- **Conclusión:** una herramienta disponible todavía no demuestra una tarea resuelta.

### WAG-V07 — Madurez agéntica

- **Slot:** después del modelo de cinco niveles.
- **Función:** separar la progresión de comprensión del eje de acción gobernada.
- **Arquetipo:** escala de dos ejes; pieza insignia compartible de la serie.
- **Conclusión:** operabilidad no deriva automáticamente de legibilidad.

### WAG-V08 — Doce pruebas de readiness

- **Slot:** después de la lista de doce pruebas.
- **Función:** agrupar el diagnóstico en significado, interacción, ejecución y evidencia.
- **Arquetipo:** ruta de inspección; no doce cards ni una captura de dashboard.
- **Conclusión:** una falla obliga a detener o degradar la autonomía con seguridad.

## Qué se usa y qué se excluye

Se usa jerarquía tipográfica clara, espacio negativo, acentos funcionales, firma oficial y superficies coherentes
con el tema. Se excluyen burbujas decorativas, fondos celestes o azul petróleo ajenos al artículo, gradientes,
glow, vidrio, perspectiva 3D, miniwidgets, estética SaaS genérica, texto microscópico y una composición única
reescalada para móvil.

## Arquetipos ejecutados en v7

La v7 reemplaza la gramática repetida de cards por siete composiciones semánticas: paisaje de frontera, corte
arquitectónico, mapa de ecosistema, circuito de evaluación, escala de madurez, ruta de inspección y cadena de
custodia. El shell —kicker, título, bajada, footer, paleta y tipografía— permanece estable; el cuerpo elige el
arquetipo que mejor demuestra cada relación.

El canon transversal y la auditoría de precedentes viven en
`.codex/skills/content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md` y
`docs/audits/public-site/2026-07-18-efeonce-editorial-infographic-system.md`.
El proceso reusable, SEO de SVG, accesibilidad compleja y estados por canal viven en
`docs/operations/public-site-content-factory/EDITORIAL_INFOGRAPHIC_OPERATING_MODEL_V1.md`.

## Producción y QA

La cadena vigente es `contrato → SVG source editable → delivery SVG con texto trazado → prueba contextual`.
Antes de servir SVG directo se ejecuta
`pnpm content:editorial-svg:audit -- <delivery.svg...>` y se resuelven texto vivo, filtros, referencias, clipping
y dimensiones intrínsecas.
El reporte reproducible vive en `ai-generations/2026-07-18_web-agentica-pillar/build-report-v3.json`. Las 28
variantes pasan tres gates geométricos en source: ningún texto sale del canvas o invade el footer; ningún par de
textos colisiona; ningún asset de marca vive fuera del footer. La entrega suma el auditor de SVG: `28/28 PASS`,
cero texto vivo, gradientes y filtros. Media Library y siete `<picture>` se completaron sobre el borrador
`249387`.

El cierre live verificó las siete piezas en desktop/mobile y light/dark, selección correcta de `currentSrc`,
ausencia de imágenes rotas en el artículo y `scrollWidth === clientWidth` a `1440` y `390` px. El post conserva
14 H2 + 6 H3, 20 destinos de TOC y siete `<picture>` gobernados. Los PNG sociales locales siguen siendo pruebas
efímeras; la portada social publicada es el JPEG C15 dedicado. La deuda transversal de descripciones largas para
diagramas complejos permanece como mejora del sistema, no como afirmación de equivalencia accesible ya resuelta.
