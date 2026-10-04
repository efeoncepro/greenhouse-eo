# Autoridad, backlinks y Brand Authority · producción local

Fecha: 2026-10-04. Estado actual: **13 formas publicadas como candidatas** en
`axis-graphic-line` 0.17.0; aprobación visual pendiente. La evidencia inicial se conserva como historia.

## Alcance

Pedido del operador: «Bien, hagamos todos, adicional hoy con AEO se suma el concepto de Brand Authority».
Doce conceptos off-page propuestos + Brand Authority. Siluetas redondeadas según corrección previa.
Fuente única en icons-authority-data.ts; API /icons/authority; SEO incorpora 13 y queda en 37 entradas
(25 candidatas/12 canónicas); AEO incorpora solo Brand Authority y queda en 19 (18 canónicas/1 candidata).
Catálogo aprobado: 109 glifos (60 Trazo + 49 Plastilina), sin promover candidatos por inferencia.

## Entrega

- [Lámina oscura](../../ai-generations/2026-10-04_authority-icons/lamina-dark.png) y
  [clara](../../ai-generations/2026-10-04_authority-icons/lamina-light.png).
- [52 SVG nuevos y láminas](../../ai-generations/2026-10-04_authority-icons/Efeonce-Autoridad-y-backlinks.zip).
- [Colecciones completas SEO/AEO](../../ai-generations/2026-10-04_authority-icons/Efeonce-SEO-AEO-completo.zip).
- Lab /references/authority-iconography/ + .json, conectado desde ambas colecciones y el índice de iconografía.
- Canon técnico AXIS docs/agent-composition/authority-iconography.md + delta de ICONOGRAPHY_DECISION_V1.md.
- Skill viva espejo: efeonce-graphic-line → references/authority-icons.md.

## Evidencia

- [x] 13 checks geométricos: margen, modo y aire de esfera con trazo regular y pequeño.
- [x] Láminas claro/oscuro inspeccionadas, tamaños 20/24/32/76; autoridad de marca/dominio/página diferenciadas.
- [x] 58/58 pruebas del paquete, incluida paridad de Brand Authority entre las tres APIs, identidad de candidatos,
  ausencia de duplicados, geometría/JSON, colores, estados y tamaños.
- [x] 117/117 tests unitarios del Lab; typecheck del workspace sin errores ni warnings; build Lab verde.
- [x] 8/8 E2E focales: autoridad, SEO, AEO y catálogo, desktop/móvil; descarga exacta, filtros, búsqueda, tamaños,
  estados, manifest y ausencia de desborde. Copy de uso de candidatos corregido para no afirmar que están en ICON_CATALOG.
- [x] 72/72 SVG AEO aprobados y 96/96 SEO R2 previos idénticos byte a byte.
- [x] skills:mirrors, docs:context-check y diff --check verdes.
- [ ] E2E global completo no repetido; mantiene la salvedad previa de cuatro fallos de Insights/deck ajenos al set.
- [ ] Aprobación visual de las trece formas y alta canónica. Release, CI y readback se completaron después, conservando candidate (evidencia abajo).

## Semántica y continuidad

Brand Authority representa reconocimiento/credibilidad de marca en una categoría. No equivale a una mención,
una cita ni un score universal de IA. Se distingue de la métrica propietaria de Moz (comunicado primario de 2023,
contrastado 2026-10-04, enlazado en guía AXIS). No se inventan fórmulas ni datos.
Tras aprobación, promover una sola geometría y actualizar su estado simultáneamente en las tres colecciones.
Preservado WIP ajeno de AI Visibility Report en AXIS y SEO/documentación en Greenhouse.


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

## Continuidad del catálogo principal — 2026-10-04

Verificado contra `axis-design-system@aee99d2`; unificación incorporada en `bf93d3a`.
[Iconography](https://axis.efeonce.org/references/iconography/#catalogo) ahora reúne 134 glifos únicos
(109 canónicos + 25 candidatos), filtros de colección/voz/estado, descarga y búsqueda. JSON para agentes:
`/references/iconography.json`. Brand Authority comparte identidad y geometría entre las tres colecciones;
los conteos 19/37/13 son pertenencias superpuestas, no glifos adicionales. Esta integración de descubrimiento
no promueve los 25 candidatos ni modifica el release de 0.17.0. Los conteos de pruebas anteriores corresponden
a cada etapa; no certifican una nueva ejecución de la suite histórica completa.
