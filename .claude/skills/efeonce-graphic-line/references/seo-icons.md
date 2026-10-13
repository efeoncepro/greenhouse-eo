# Colección SEO · 37 entradas

> Verificado contra: axis-design-system@aee99d2 — 2026-10-04. APIs publicadas en `@efeoncepro/axis-graphic-line@0.17.0`; aprobación por entrada, no por paquete.
Pedido: «Vamos con todos». Corrección del operador: «Muy cuadrados deben ser mas redondeados».
Extensión vigente: doce off-page + Brand Authority. [Fuente única, estados y límites](authority-icons.md).
R2 usa siluetas redondeadas, conexiones curvas y llaves suaves. R1 se conserva como versión corregida, nunca canon.

Canon técnico: AXIS docs/agent-composition/seo-iconography.md y delta SEO de ICONOGRAPHY_DECISION_V1.md.
API publicada: @efeoncepro/axis-graphic-line/icons/seo (SEO_ICON_COLLECTION, SEO_STROKE_CANDIDATES, resolveSeoIcon).
Veinticinco candidatos fuera de ICON_CATALOG; doce existentes delegan al renderer canónico. Voz Trazo, Engine.
La aprobación previa de AEO no aprueba formas SEO que todavía no existían. Publicar 0.17.0 no promueve candidatos.

- Nuevos: rastreo, indexacion, sitemap, canonical, redireccion, datos-estructurados, renderizado,
  enlazado-interno, intencion-busqueda, cluster-tematico, canibalizacion, hreflang.
- Reutilizados: busqueda, keyword, contenido, enlace, competencia, ubicacion, posicion, impresion, clic, ctr, visita, informe.
- Lab: /references/seo-iconography/, datos /references/seo-iconography.json. Filtros, búsqueda, estados, tamaño y SVG.
- Exportador: node scripts/export-seo-icons.mjs --out <dir> (tras build): 148 SVG y manifest con revisión y procedencia.
- Control: node scripts/icons.mjs check --glyph docs/examples/iconography/seo/<key>.json --out <dir>.
- Salidas: greenhouse-eo/ai-generations/2026-10-04_seo-icons/; r1-cuadrados/ conserva el intento corregido.

Rastreo, indexación y aparición son distintos; canonical y redirección también. Sitemap no es cluster.
Ubicación contextualiza SEO local; visita requiere etiqueta de canal. No sustituir isotipos de plataformas.
La esfera es estado gráfico; en una pieza responde uno solo. Las láminas son muestras independientes.

Pendiente: aprobación visual de R2 y alta canónica. La API y el Lab ya están publicados. No repetir la primera geometría
cuadrada ni promover una forma por el mero hecho de que pasa los controles de margen y aire.


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
