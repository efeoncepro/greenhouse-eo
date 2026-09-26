# Línea gráfica Efeonce «La órbita» — índice

> **Tipo de documento:** Índice operativo de carpeta
> **Versión:** 1.2
> **Creado:** 2026-09-25 por Claude
> **Última actualización:** 2026-09-26 por Claude (firma de piezas, oficina en foto; AXIS 0.3.0 con `axis-graphic-line` 0.3.1 y animaciones del logo V1.1)
> **Estado de la línea:** canónica desde el 2026-09-25; atribución sin logo sin medir

Esta carpeta guarda la línea gráfica de la marca propia de Efeonce y su familia (Globe, Wave, Reach). No aplica a la
UI de Greenhouse ni al trabajo de clientes. Los **valores** viven en los tokens de AXIS; esta carpeta guarda el
manual, la decisión y los entregables para personas.

| Recurso | Dónde | Qué es |
|---|---|---|
| Manual técnico-operativo (fuente de verdad) | [`EFEONCE_GRAPHIC_LINE_V1.md`](./EFEONCE_GRAPHIC_LINE_V1.md) | Las 13 secciones: esfera, color, tipografía, voz, eslogan, oficio, familia, logo e isotipo (con la regla de la firma, §8.5), fotografía, aplicaciones (merch y oficina en foto, §10.8 y §10.9), do's & don'ts, decisiones y contrato y herramientas (§13) |
| Decisión (ADR) | [`EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md`](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) | Qué se decidió, alternativas descartadas, consecuencias y pendientes |
| Manual en PDF | [`deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf`](./deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf) | A4, 56 hojas (la 12 es «La oficina, fotografiada»), confidencial · uso interno |
| Fuente del PDF | [`deliverables/linea-grafica-efeonce.src.html`](./deliverables/linea-grafica-efeonce.src.html) | HTML editable del PDF |
| Renderer del PDF | [`scripts/documents/render-efeonce-graphic-line.mjs`](../../../scripts/documents/render-efeonce-graphic-line.mjs) | `node scripts/documents/render-efeonce-graphic-line.mjs`; lee las láminas locales de `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/canvas/laminas-full/` |
| Burbujas de URL horneadas | [`deliverables/assets/url-lum-light.svg`](./deliverables/assets/url-lum-light.svg) · [`url-lum-dark.svg`](./deliverables/assets/url-lum-dark.svg) | Para visores, correo, PDF y referencias para IA, donde la fusión de luminosidad no está garantizada |
| Referencia pública en AXIS | [axis.efeonce.org/references/graphic-line](https://axis.efeonce.org/references/graphic-line) | Láminas reconstruidas en HTML nativo; repo `efeoncepro/axis-design-system` (un push a `main` despliega el proyecto `axis-design-system-lab`) |
| Tokens | `efeonceGraphicLine` en `@efeoncepro/axis-tokens` 0.3.0 | Valores oficiales con pruebas de contraste, incluidos `signature`, `slogan`, `state`, `brandClose`, `pieces` (piezas de formato fijo medidas del canvas) y `portrait` (retrato de la firma de mail); nunca se transcriben |
| Archivos oficiales | `@efeoncepro/axis-brand-assets` 0.3.0 | 19 SVG sellados (logo e isotipo de las cuatro marcas y las tres burbujas URL) y 48 órbitas estáticas (SVG + PNG); guarda de deriva en `src/config/efeonce-brand-assets.test.ts` |
| La órbita como código | `@efeoncepro/axis-graphic-line` 0.3.1 (repo AXIS) | Pinta la órbita, sus recetas (lente, foco, deck, retrato con `portraitOrbitSvg`) y su movimiento desde los tokens; lo usa el Lab. Greenhouse no depende de él |
| Canvas de trabajo (privado) | [claude.ai/artifact/EKeA34qiPH77wsUFCtX9ii](https://claude.ai/artifact/EKeA34qiPH77wsUFCtX9ii) | Taller de exploración (40 láminas, siete capítulos; la 4.8 es merch en foto y la 4.9, oficina en foto) |
| Taller de la exploración | `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/` | Generador del canvas, texturas, renders, firma de mail, merch generativo (`merch-ia/`), oficina en foto (`oficina-ia/`) y kit de la prueba sin logo |
| Banco de fotos para la lente | `ai-generations/2026-09-25_banco-lente-orbita/` ([`LEEME.md`](../../../ai-generations/2026-09-25_banco-lente-orbita/LEEME.md)) | 8 tomas documentales hechas con `pnpm foto:generar`: fichas y prompts versionados, plates locales |
| Composición por intención | `pnpm creative:orbit:resolve` · `pnpm creative:orbit:render` (`scripts/creative/layout-compiler/graphic-line.mjs`) | Adapter de Greenhouse del contrato AXIS `efeonce.graphic-line-orbit` 0.3.0 (`stable`; paquetes fijados en 0.3.0 en `develop`): manifest, SVG, PNG firmado (logo o burbuja fusionada, contraste medido) y `qa.json`; `bindings.protect` para sujeto, reservas y lecho |
| La línea en campañas | `pnpm creative:layout` (`graphic_line` por formato y `brand.signature`) · `pnpm foto:componer:cta` + `pnpm foto:cta:gate` (tramo 17, `marcaEnEscena`) | La regla de la firma aplicada en los dos compositores, sólo en piezas nuevas (manual §13.2) |
| Animaciones del logo (motion V1.1) | [`EFEONCE_ORBIT_REVEAL_MOTION_V1.md`](./EFEONCE_ORBIT_REVEAL_MOTION_V1.md) · `scripts/creative/brand-motion/` | Reveal (línea → logo, 3,6 s), apertura (logo → línea, 2,4 s) y sting (1,6 s), con fondo y transparentes (ProRes 4444, WebM, HEVC, PNG por capas) y sonido sintetizado; conviven con el cierre anterior. MP4, GIF y cuadros en OneDrive `13- Branding/Motion Órbita Efeonce/v1.1`; masters en `gs://efeonce-group-axis-public-media/motion/logo/v1.1/`; fichas en el Lab (4.4.2). La órbita sola (sin logo) sale del paquete: `pnpm orbit:video` en AXIS |

## Documentación para personas

- Funcional: [Línea gráfica Efeonce — La órbita](../../documentation/creative/linea-grafica-efeonce.md)
- Manual de uso: [Usar la línea gráfica de Efeonce](../../manual-de-uso/creative/usar-linea-grafica-efeonce.md)

## Reglas de la carpeta

- Firma de piezas gráficas: el logo de Efeonce centrado; la burbuja URL sólo cuando el logo ya está en la imagen,
  centrada y fusionada (manual §8.5). La órbita no sustituye la composición fotográfica (manual §1.3).
- El manual técnico manda en reglas y medidas; los tokens de AXIS mandan en valores. Cambiar un valor exige cambiar el
  token y su prueba, no sólo el documento.
- Si cambia una regla, se actualizan el manual, la fuente del PDF y, cuando corresponde, se regenera el PDF.
- Relacionados: [lenguaje fotográfico](../brand-photography/README.md) ·
  [selección de referencias de marca](../EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md) ·
  [estándar de informes](../EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md) · `docs/context/09_marca-agencia.md`
