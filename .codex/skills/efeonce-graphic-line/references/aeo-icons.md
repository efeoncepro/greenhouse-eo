# Colección AEO · 18 aprobados + Brand Authority candidata

> Verificado contra: axis-design-system@aee99d2 — 2026-10-04. APIs publicadas en `@efeoncepro/axis-graphic-line@0.17.0`; aprobación por entrada, no por paquete.

El operador autorizó producir los conceptos y después aprobó las diez formas nuevas: «Las apruebo todas»
(2026-10-04). Las formas revisadas entran sin cambios al catálogo canónico.

Extensión vigente: autoridad-marca candidata compartida con SEO. AEO tiene 19 entradas; las 18 originales
conservan su aprobación y geometría. [Fuente única y semántica](authority-icons.md).

Canon técnico: `axis-design-system/docs/agent-composition/aeo-iconography.md` y delta 2026-10-04 del ADR
`ICONOGRAPHY_DECISION_V1.md`. Datos y dibujos: `packages/graphic-line/src/icons-aeo-data.ts`.

- Voz Trazo, acento Engine. Reposo por defecto; responde uno solo en una pieza, sin otra esfera.
- Diez nuevos: respuesta-ia, mencion-marca, fuente, entidad, atribucion, recomendacion-ia,
  consultas-relacionadas, recuperacion, cobertura-preguntas, cobertura-motores.
- Ocho existentes: composer, buscador, cita, contenido, enlace, competencia, medicion, informe.
- Mención, cita, recomendación y atribución tienen significados diferentes. El uso de cita se precisa como
  referencia a una fuente. Cobertura no dibuja un porcentaje; se acompaña del dato y su denominador.
- API publicada `@efeoncepro/axis-graphic-line/icons/aeo`: `AEO_ICON_COLLECTION`, `AEO_STROKE_GLYPHS`,
  `resolveAeoIcon`. Delega a `resolveIcon` con Engine por defecto; los 18 originales devuelven `status: canonical`; autoridad-marca usa candidate.
  Los diez nuevos entran en `ICON_CATALOG`: 60 Trazo + 49 Plastilina = 109. Los ocho existentes conservan su render.
- Lab `/references/aeo-iconography/`, manifest `/references/aeo-iconography.json`, enlace desde Iconografía.
  Buscar, filtrar nuevos/existentes, fondo, tamaño, comparar estados y descargar SVG.
- Exportación, tras build: `node scripts/export-aeo-icons.mjs --out <directorio>`: 76 SVG + manifest.
- Control: `pnpm icons:check -- --glyph docs/examples/iconography/aeo/<key>.json --out <directorio>`.
- Salidas de esta corrida: `ai-generations/2026-10-04_aeo-icons/` en Greenhouse (láminas, SVG y evidencia).

Los diez pasan margen y aire de esfera con trazo normal y pequeño. Respuesta se diferenció de Cita durante el QA
mediante el gesto de retorno y la silueta estrecha; el control geométrico por sí solo no ve esa confusión.

Los 18 originales están aprobados y publicados. Brand Authority conserva `candidate`; su futura promoción debe ser simultánea en AEO, SEO y Autoridad. La guía de AXIS conserva los pasos exactos de promoción.


## Publicación verificada · 2026-10-04

Estado posterior a la producción local descrita arriba: AXIS `main` y tag `v0.17.0` en
`a41e81f92c8b3e0e7f03219366e0d57623f5cd66`. Publicado **@efeoncepro/axis-graphic-line@0.17.0**;
[CI verde](https://github.com/efeoncepro/axis-design-system/actions/runs/37202238028),
[release verde](https://github.com/efeoncepro/axis-design-system/actions/runs/37202260863) y
[versión leída en GitHub Packages](https://github.com/orgs/efeoncepro/packages/npm/axis-graphic-line/1334240140).
Build, typecheck, 485 tests y design:check pasaron en una copia limpia sin WIP ajeno.
El tarball contiene JS y tipos de `/icons/aeo`, `/icons/seo` y `/icons/authority`.
Vercel confirmó success para el mismo SHA; manifests públicos leídos HTTP 200 con AEO 19, SEO 37 y
Autoridad 13 entradas, Brand Authority presente en las tres. Render de Autoridad inspeccionado en navegador.
Publicación no cambia aprobación: 10 AEO nuevos canónicos; 12 SEO R2 y 13 autoridad candidatos.
Lab: [AEO](https://axis.efeonce.org/references/aeo-iconography/),
[SEO](https://axis.efeonce.org/references/seo-iconography/),
[Autoridad](https://axis.efeonce.org/references/authority-iconography/).
No se modificaron pins de consumidores ni se publicaron cambios de Greenhouse.

## Entrada común de descubrimiento

El catálogo principal [Iconography](https://axis.efeonce.org/references/iconography/#catalogo) reúne
134 glifos únicos (109 canónicos + 25 candidatos), con filtros de colección, voz y estado.
Las colecciones especializadas conservan guías y APIs; no son inventarios aislados. Datos para agentes:
`/references/iconography.json`; el estado de cada entrada gobierna su uso. Brand Authority aparece una
sola vez en el catálogo común, con pertenencia AEO/SEO/Autoridad. No sumar las colecciones para contar glifos.
