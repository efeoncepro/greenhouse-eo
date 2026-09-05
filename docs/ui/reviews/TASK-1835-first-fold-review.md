# TASK-1835 — Revisión del primer fold

Fecha: 2026-09-05. Propuesta B, acceso enfocado con contexto explícito. Evidencia inicial del preview:
`pnpm exec tsx scripts/auth-server/ui-preview-server.ts`, `http://127.0.0.1:19035/login` y `/consent`.
Datos ficticios y acciones de navegación del preview; no acredita consentimiento ni acceso reales.

## Evidencia

- GVC: `.captures/2026-09-05T14-07-38_task1835-efeonce-id`, desktop 1440×1000 y móvil 390×844,
  seis frames. `pnpm fe:capture:review` produjo el dossier. Ambas variantes exit 0 y rúbrica automática
  pass, cero errores de runtime/accesibilidad/layout/teclado. Desktop sólo advierte full-page sin scroll,
  compatible con contenido que cabe en su viewport; móvil no tiene findings.
- Inspección Chromium adicional SIN bypass CSP: cuatro combinaciones login/consent y 1440/390,
  fuentes cargadas, `scrollWidth === clientWidth`, cero errores console/page y cero requests externos.
- Revisión visual independiente: acepta composición como base para continuar; pidió reducir espacio
  organización→permisos y añadir identificador de aplicación a detalle. Ajustes incorporados antes
  del GVC final. Permisos se mantienen completos y acciones después de leerlos.
- Fuentes locales del pack AXIS: manifiesto y hashes verificados; payload medido por variante 299.975 B,
  cuatro requests y 47 nodos al cierre. La entrega productiva de fuentes requiere incluir el texto OFL
  correspondiente en el artefacto y conservar su provenance.

## Juicio proporcional

| Dimensión del primer fold | Valoración | Evidencia / límite |
|---|---|---|
| Jerarquía | 4,5 | Aplicación, propósito y acción distinguibles; contexto fuera de superficie |
| Acciones | 4,5 | Microsoft principal; passkey primero en invitación; Cancelar/Permitir visibles |
| Economía de superficies | 4,5 | Una superficie de decisión; sin cards anidadas |
| Responsive | 4,5 | Reflow legible; scroll de consentimiento conserva efectos solicitados |
| Fidelidad a dirección B | 4,5 | Consentimiento más ancho, tipografía Poppins/Geist y tokens AXIS |
| Estados, recuperación y recorrido real | Pendiente | Este harness sólo prueba login/consent ficticios |

**ACEPTAR PRIMER FOLD para revisión de la dirección.** No es PASS enterprise de la task completa,
no se calcula promedio final con dimensiones aún no verificadas y no sustituye aprobación del operador.
`UI ready: no` hasta dicha aprobación y cierre del contrato de implementación.

## Pendientes

- Aprobación visual solicitada con prototipo concreto; no inferirla del transcurso del tiempo.
- Completar revisión de todos los estados de error/carga/denegación, login passkey y matrices de
  nombres/permisos extensos. Step-up y alta ya cuentan con evidencia local descrita abajo.
- Review enterprise y scorecard final; el typecheck global aún no tiene resultado confirmado.
- Recorrido desplegado con persona real, cliente MCP y revocación/rollback medidos.

## Integración local de renderers reales — actualización 2026-09-05

El harness `scripts/auth-server/dev-ui-server.ts` en `http://127.0.0.1:19036` consume los renderers
reales de producto. Acepta sólo GET y usa DTOs ficticios; no abre sesiones ni persiste consentimiento.
Shell, CSS AXIS, fuentes locales con OFL y CSP ya están integrados. Step-up consume TOTP/passkey UV
sobre sesión existente; alta TOTP incluye QR, secreto alterno y códigos de respaldo. Esto describe
código local, no autenticación verificada con una persona real ni un despliegue.

GVC: cada dossier contiene `01-desktop/manifest.json` y `02-mobile/manifest.json` (1440×1000 y
390×844), con `enterpriseRubric.verdict=pass` y `exitCode=0`:

- `.captures/2026-09-05T14-53-04_task1835-runtime-consent/index.html`
- `.captures/2026-09-05T14-53-12_task1835-runtime-login/index.html`
- `.captures/2026-09-05T14-55-33_task1835-runtime-step-up/index.html`
- `.captures/2026-09-05T14-55-34_task1835-runtime-enroll/index.html`

Las advertencias `full_page_without_scroll` indican contenido que cabe en el viewport; el PASS
automático no sustituye revisión visual completa ni aprobación de dirección. Se conserva el juicio
proporcional del primer fold, sin elevarlo a scorecard final de la task.

`node scripts/auth-server/verify-ui-browser.mjs` se volvió a ejecutar: 6 checks, 0 violations, exit 0.
Comprueba fuentes/overflow en login y consentimiento a dos anchos, y controladores de factor con
respuestas ficticias interceptadas. Bloquea requests externos y mutaciones no simuladas. No prueba
KMS/PG, credenciales reales, persistencia, canary ni revocación. Login passkey completo, estados
restantes y recorrido real siguen pendientes. **UI ready: no; aprobación del operador pendiente.**

## Recuperación interna integrada

GVC `.captures/2026-09-05T15-04-28_task1835-runtime-internal-error`: cuatro frames en 1440/390.
Helper real responde HTTP 400 sin reflejar query hostil; revisión móvil legible, sin CSP ni overflow.
La página instruye volver a la aplicación para iniciar otro intento; no inventa retorno a partir del
callback fallido. Consumidores sin Accept HTML mantienen JSON. Build completo correcto; no deploy.
