# Autoridad, backlinks y Brand Authority · colección candidata

> Verificado contra: axis-design-system@aee99d2 — 2026-10-04. APIs publicadas en `@efeoncepro/axis-graphic-line@0.17.0`; aprobación por entrada, no por paquete.
El operador autorizó todos los doce conceptos off-page y añadió Brand Authority. Se produjeron trece formas
redondeadas, conservando el criterio de R2 SEO; todavía requieren aprobación visual.

Canon técnico: AXIS docs/agent-composition/authority-iconography.md + ICONOGRAPHY_DECISION_V1.md.
API: @efeoncepro/axis-graphic-line/icons/authority → AUTHORITY_ICON_COLLECTION, AUTHORITY_STROKE_CANDIDATES,
resolveAuthorityIcon. Fuente geométrica única en packages/graphic-line/src/icons-authority-data.ts.

- Trece claves: autoridad-dominio, autoridad-pagina, autoridad-marca, backlink, dominios-referentes,
  perfil-enlaces, anchor-text, enlaces-nuevos, enlaces-perdidos, enlaces-rotos, brecha-backlinks,
  relevancia-tematica, riesgo-enlaces.
- SEO incorpora las trece: 37 entradas, 25 candidatas + 12 canónicas.
- AEO incorpora solo autoridad-marca: 19 entradas, 18 canónicas + Brand Authority candidata.
- Misma Brand Authority en las tres APIs; nunca dibujar una versión diferente para AEO.
- El catálogo canónico sigue en 109 (60 Trazo + 49 Plastilina). No confundir cantidad de colección con canon.
- Brand Authority como concepto = reconocimiento y credibilidad de marca en su categoría. No equivale a
  una mención, cita, recomendación ni score universal de IA. Si se presenta la métrica propietaria de Moz,
  conservar proveedor, nombre, metodología, alcance y fecha. DA/DR/Authority Score también se distinguen.
- La esfera es estado gráfico. Las barras de autoridad no codifican el valor de un score.
- Follow/nofollow/sponsored/UGC son etiquetas de contexto. Riesgo no implica penalización ni disavow automático.

Lab /references/authority-iconography/ y .json, enlazado desde SEO/AEO y el catálogo.
Exportadores tras build: export-authority-icons.mjs → 52 SVG; export-seo-icons.mjs → 148; export-aeo-icons.mjs → 76.
QA: node scripts/icons.mjs check --glyph docs/examples/iconography/authority/<key>.json --out <dir>.
Archivos de revisión: greenhouse-eo/ai-generations/2026-10-04_authority-icons/.

Control verificado: trece checks geométricos; paridad de Brand Authority entre tres APIs; 58 pruebas del paquete,
117 del Lab y 8 E2E focales; los 72 SVG AEO aprobados y 96 SEO R2 previos conservan todos sus bytes.
Aprobación visual → alta canónica simultánea en las tres colecciones → actualización de APIs/guías → release
con CI y readback remoto. No se infiere aprobación de forma a partir de la autorización de producir conceptos.


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
