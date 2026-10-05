# Identidad del chrome del portal — 2026-10-05

## Decisión y alcance

El operador pidió discovery y luego autorizó la implementación: logo/isotipo Efeonce en menú y logo
Greenhouse en el footer. Se clasifica `ui-lite`: sustitución de identidad en el chrome existente, sin nueva
composición, pantalla, primitive ni flujo. Dirección explícita del operador; `reuse` de `Logo`, `BrandWordmark`
y ambos adapters Vuexy. No requiere un wireframe de pantalla nuevo. Tamaños existentes preservados.

Canon: [arquitectura de marca](../../architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md#aplicación-2026-10-05--identidad-del-chrome-de-greenhouse).
`DESIGN.md` y la invariante de marca reflejan la misma decisión.

## Implementación

- `src/components/layout/shared/Logo.tsx`: Efeonce blanco en lateral; isotipo en colapsado, logo al hover
  y en móvil; cabecera horizontal conserva Efeonce. Texto alternativo usa la marca pintada.
- `src/components/greenhouse/brand-assets.ts`: registro Greenhouse con assets locales existentes.
- `src/components/layout/{vertical,horizontal}/FooterContent.tsx`: Greenhouse azul en claro y blanco en
  oscuro (incluido modo system); footer cliente permite wrap. Variante interna y enlaces preservados.
- `scripts/frontend/scenarios/portal-brand-chrome.scenario.ts`: evidencia local con estados aislados en
  `.auth/`, layouts vertical/colapsado/horizontal y móvil 390px.

No se modificaron SVG, pins, nombres del producto, metadata, permisos, login ni rutas.

## Verificación

- ESLint focal: PASS.
- `pnpm typecheck`: PASS.
- `src/config/efeonce-brand-assets.test.ts`: 9/9 PASS; los cuatro SVG Efeonce coinciden con AXIS instalado.
- `pnpm design:lint`: 0 errores, 0 warnings; `pnpm design-contract:lint`: PASS.
- QA advisory ejecutado sobre los ocho archivos propios; cambios ajenos del checkout excluidos del veredicto.
- GVC: 11/11 escenarios completados, 46 frames; revisión visual de menú expandido, isotipo colapsado,
  hover, menú móvil y footers claro/oscuro. Layouts vertical y horizontal, escritorio y móvil 390px.
  [Resultados](../../../.captures/portal-brand-validation/final-results.json).
- Tema system y footer cliente: 3/3 comprobaciones PASS; SVG decodificado, alt correcto y ancho de
  contenido igual al viewport (390px), sin overflow horizontal.
  [Comprobaciones](../../../.captures/portal-brand-validation/theme-system-checks.json).

Una captura inicial a `/admin/design-system` encontró 404; la ruta real `/design-system` reemplazó ese target.
La compilación/carga inicial registró timeout y avisos de hidratación intermitentes; se conservaron los runs
fallidos y se repitió la evidencia tras estabilizar. No se silenciaron los guards de GVC.
Los escenarios finales no registraron errores de hidratación ni excepciones de página. Persisten avisos
generales del catálogo sobre contraste, rendimiento y crops pequeños, y un 404 de `google-icon.svg` en
`/settings`, ajeno a los logos cambiados. Los assets de marca cargaron correctamente.

## Estado de entrega

Validación local completada. El operador autorizó commit y push a `develop` el 05/10; el resultado Git se
registra en el cierre de la conversación. Build de producción y rollout no ejecutados. La revisión se hizo
en `http://localhost:3000`, con la identidad de agente dedicada. Al cierre no quedan procesos de captura
ni servidor de desarrollo activos.
