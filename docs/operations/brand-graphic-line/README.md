# Línea gráfica Efeonce «La órbita» — índice

> **Tipo de documento:** Índice operativo de carpeta
> **Versión:** 1.0
> **Creado:** 2026-09-25 por Claude
> **Última actualización:** 2026-09-25
> **Estado de la línea:** canónica desde el 2026-09-25; atribución sin logo sin medir

Esta carpeta guarda la línea gráfica de la marca propia de Efeonce y su familia (Globe, Wave, Reach). No aplica a la
UI de Greenhouse ni al trabajo de clientes. Los **valores** viven en los tokens de AXIS; esta carpeta guarda el
manual, la decisión y los entregables para personas.

| Recurso | Dónde | Qué es |
|---|---|---|
| Manual técnico-operativo (fuente de verdad) | [`EFEONCE_GRAPHIC_LINE_V1.md`](./EFEONCE_GRAPHIC_LINE_V1.md) | Las 12 secciones: esfera, color, tipografía, voz, eslogan, oficio, familia, logo e isotipo, fotografía, aplicaciones, do's & don'ts y decisiones |
| Decisión (ADR) | [`EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md`](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) | Qué se decidió, alternativas descartadas, consecuencias y pendientes |
| Manual en PDF | [`deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf`](./deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf) | A4, 54 hojas, confidencial · uso interno |
| Fuente del PDF | [`deliverables/linea-grafica-efeonce.src.html`](./deliverables/linea-grafica-efeonce.src.html) | HTML editable del PDF |
| Renderer del PDF | [`scripts/documents/render-efeonce-graphic-line.mjs`](../../../scripts/documents/render-efeonce-graphic-line.mjs) | `node scripts/documents/render-efeonce-graphic-line.mjs`; lee las láminas locales de `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/canvas/laminas-full/` |
| Burbujas de URL horneadas | [`deliverables/assets/url-lum-light.svg`](./deliverables/assets/url-lum-light.svg) · [`url-lum-dark.svg`](./deliverables/assets/url-lum-dark.svg) | Para visores, correo, PDF y referencias para IA, donde la fusión de luminosidad no está garantizada |
| Referencia pública en AXIS | [axis.efeonce.org/references/graphic-line](https://axis.efeonce.org/references/graphic-line) | Láminas reconstruidas en HTML nativo; repo `efeoncepro/axis-design-system` (un push a `main` despliega el proyecto `axis-design-system-lab`) |
| Tokens | `efeonceGraphicLine` en `@efeoncepro/axis-tokens` | Valores oficiales con pruebas de contraste; nunca se transcriben |
| Canvas de trabajo (privado) | [claude.ai/artifact/EKeA34qiPH77wsUFCtX9ii](https://claude.ai/artifact/EKeA34qiPH77wsUFCtX9ii) | Taller de exploración (39 láminas, siete capítulos) |
| Taller de la exploración | `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/` | Generador del canvas, texturas, renders, firma de mail, merch generativo y kit de la prueba sin logo |
| Banco de fotos para la lente | `ai-generations/2026-09-25_banco-lente-orbita/` ([`LEEME.md`](../../../ai-generations/2026-09-25_banco-lente-orbita/LEEME.md)) | 8 tomas documentales hechas con `pnpm foto:generar`: fichas y prompts versionados, plates locales |
| Composición por intención | `pnpm creative:orbit:resolve` · `pnpm creative:orbit:render` (`scripts/creative/layout-compiler/graphic-line.mjs`) | Adapter de Greenhouse del contrato AXIS `efeonce.graphic-line-orbit` 0.1.0 (AXIS 0.2.6): manifest, SVG, PNG y `qa.json` |

## Documentación para personas

- Funcional: [Línea gráfica Efeonce — La órbita](../../documentation/creative/linea-grafica-efeonce.md)
- Manual de uso: [Usar la línea gráfica de Efeonce](../../manual-de-uso/creative/usar-linea-grafica-efeonce.md)

## Reglas de la carpeta

- El manual técnico manda en reglas y medidas; los tokens de AXIS mandan en valores. Cambiar un valor exige cambiar el
  token y su prueba, no sólo el documento.
- Si cambia una regla, se actualizan el manual, la fuente del PDF y, cuando corresponde, se regenera el PDF.
- Relacionados: [lenguaje fotográfico](../brand-photography/README.md) ·
  [selección de referencias de marca](../EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md) ·
  [estándar de informes](../EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md) · `docs/context/09_marca-agencia.md`
