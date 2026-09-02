# Publicación HubSpot Elementor — 2026-08-30

## Resultado

**PASS para la implementación/publicación solicitada.**
`https://efeoncepro.com/servicios-contratar-hubspot/`, página `244079`, publicada.
Orden del operador: descomprimir su ZIP, implementar fielmente el diseño aprobado con widgets Elementor,
conservar header/footer público y publicar. No se solicitó una migración de URL ni cierre formal de TASK-1352.

Fuente/dueños: [contrato](../../architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md).
Skills: efeonce-public-site-wordpress, greenhouse-ai-design-studio, greenhouse-browser-diagnostics,
greenhouse-gvc-playwright, greenhouse-growth-forms, greenhouse-qa-release-auditor y
greenhouse-documentation-governor (namespace Codex).

## Evidencia verificada

- Original descomprimido intacto. SHA `f95b6254c2434b58a4d6855dded40dd3a38acb19b881e090e1928674ab8bb812`.
- Runtime acotado: 71 archivos. Hash previo/nuevo, allowlist y loader al final; sin despliegue masivo.
  [Manifest final](2026-08-30-hubspot-elementor-manifest.json). Readback live: 71/71 coincidentes.
- Documento final: `b44adec9c6120b94bab004fa4d5d162ef7e5c8e53835288b47551cd880ada151`.
- Home sin cambios: `747470a5f5083b8a5d851433e10618f5c3b714889d6205c64e36a1da242091b1`.
- Creative sin cambios: `84804acccd2af869d0a45308640ee5ae7444f992c58915fc20bad6dbd65c85e4`.
- Featured image `248703` y `elementorFrontendConfig.post.featuredImage` verificados después de guardar.
- Once widgets registrados en Elementor. En draft temporal `251810`: edición de texto, reorder FAQ,
  Document::save, relectura y render escapado PASS; draft enviado a papelera. Página pública intacta durante prueba.
- PHP local: 191 campos de texto raíz editados/escapados, controles y reorder verificados.
- Vitest: 3 archivos / 49 tests PASS, incluidos regresión multi-step y paridad de contrato.
- ESLint scoped y sintaxis PHP/CJS PASS. QA router ejecutado; no se atribuyen como propios cambios ajenos del checkout.
- Browser anónimo sin cookies ni interceptaciones: HTTP200, canonical propio, un H1, un header/footer,
  once secciones y 23 paneles sin JavaScript. 390/768/1024/1440 px con movimiento normal/reducido:
  `scrollWidth === innerWidth`, hero x=0. Sin imágenes rotas, Media HTTP, excepciones JS ni respuestas fallidas
  en el run final. [Resultados](2026-08-30-hubspot-browser-verification.json).
- 14 capacidades, 4 sectores y 5 etapas activados en desktop/mobile, flechas/Inicio/Fin y FAQ PASS.
- Form real: contrato/API cargados sin mocks, tres pasos, errores de avance/envío vacío y persistencia al
  retroceder. POST anónimo sin proof: HTTP403 `captcha_failed/missing_token`; no se creó lead aceptado.
- Capturas revisadas: `.captures/hubspot-live-2026-08-30/` y `.captures/hubspot-export-review-2026-08-30/`.
  Reproducción: `node scripts/public-website/verify-hubspot-landing.cjs`.

GVC genérico exige sesión NextAuth en `ensureStorageStateFresh` incluso para un host WordPress anónimo.
No se fabricó storageState ni se relajó el gate. La evidencia equivalente usa Playwright directo,
reproducible, con contextos sin autenticación; incluye screenshots, aserciones responsive/interacción,
no-JS y reporte de errores. El script vive versionable junto a los writers, no sólo en la conversación.

## Correcciones de integración

Se corrigieron el margen nativo Ohio (controles wrapper/full-width y variable scoped), la limpieza
involuntaria de featured image por Document::save (setting explícito), Media HTTPS desde WP-CLI,
la ruta relativa del mask SVG y el estado hover/activo. El renderer limpia errores del paso anterior
al avanzar; pruebas verifican que no aparece error de consentimiento antes de intentar enviar ese paso.
La base estilística y copy aprobado se conservan; el formulario agrega validación/consentimiento reales.

Rollback: opción durable `_gh_hubspot_rollback_20260830`, revisión original `251801`, verificado por hash.
El snapshot JSON inicial perdió escapes al guardarse en postmeta; no se usa para recuperar.
Se preservó la revisión exacta y las metas previas en una opción serializada con readback.
Backup loader inicial `/tmp/eo-hubspot-before-20260831-014151.tar`; patches con backups 014341,014511,014640
y 014948 (hover). No asumir retención indefinida. Ver [manual](../../manual-de-uso/public-site/hubspot-elementor.md).

## Límites

No se envió lead real, booking, email o mensaje comercial. No se certifica entrega directa HubSpot ni
conversión GA4: la política publicada es Greenhouse-only y tracking espera un accepted real.
La prueba de edición usó APIs nativas Elementor y PHP, no una sesión manual del editor visual.
Una respuesta esporádica Clarity400 apareció en exploración previa; no se reprodujo en el run final,
y no procede del paquete HubSpot. Header/footer/theme globales no se modificaron.
No commit/push ni despliegue general de Greenhouse; sólo bundle renderer fijado en el sitio WordPress.
TASK-1352 mantiene su ciclo formal abierto; no inferir ausencia de publicación por ese estado.

Cierre documental: checker acotado sin dueños faltantes; flags e índice Creative PASS.
Se rotaron una sesión y una entrada mediante el comando canónico, preservando el historial.
Context check strict final: 0 errores y 0 advertencias. No cambió el contrato durable de project_context.
Durante una recarga concurrente con la purga se observaron CSS Elementor aún no regenerados;
la recarga posterior y el segundo run anónimo completo verificaron assets y geometría correctos.

## 2026-08-31 — Etiqueta del menú

Por instrucción del operador, item `244116` del menú primario `61` cambió de
«HubSpot Solutions Partner» a «Servicios HubSpot». Se modificó sólo post_title por WordPress API;
URL, metas, padre `250173` y contenido de página permanecieron iguales.
Respaldo: opción `_gh_hubspot_menu_label_20260831` con post/metas originales y hash de página.
Rollback autorizado: restaurar únicamente post_title del item desde esa opción, purgar cache y releer menú.
Kinsta confirmó purga; la portada sin querystring ya entrega la nueva etiqueta tras propagarse.
