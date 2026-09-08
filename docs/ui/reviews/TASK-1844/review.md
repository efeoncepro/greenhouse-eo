# Enterprise UI Review — consentimiento interno multiorganización

## Verdict

PASS para el delta `ui-lite` local. Revisión visual del renderer real el 2026-09-08; no acredita OAuth
productivo ni consentimiento en Codex/Claude. [Contrato](../../wireframes/TASK-1844-internal-multi-org-consent.md).

## Evidencia

`AGENT_AUTH_BASE_URL=http://127.0.0.1:19044 pnpm fe:capture task1844-multi-org-consent --env=local`.
Captura GVC `2026-09-08T18-22-08_task1844-multi-org-consent`: 4 frames, desktop 1440×1000 y móvil 390×844;
cero findings, cero errores de consola/página/hydration/HTTP y rubric enterprise automática `pass`.
`fe:capture:review` produjo el dossier. Se inspeccionaron las imágenes, no sólo el resultado automático.
Fixtures ficticias; el puerto aisló el harness del servidor de otra sesión en 19036.

- [Desktop](desktop.png) y [foco de teclado](desktop-keyboard.png).
- [Móvil](mobile.png) y [foco de teclado](mobile-keyboard.png).
- GVC verifica overflow, teclado y reduced motion con el scenario heredado de TASK-1835.
- Tests del renderer/consentimiento cubren separación v1/v2, expectativas GET/POST y rechazo de autoridad inválida.

## Scores

| Dimensión | Score | Evidencia y alcance |
| --- | ---: | --- |
| Intención del producto | 5 | Explica lectura y autoridad vigente antes de autorizar |
| Jerarquía inicial | 4.5 | Marca, solicitud, alcance y organizaciones tienen orden legible |
| Claridad de acción | 5 | Autorizar y cancelar conservan acciones y foco del renderer |
| Arquitectura de información | 4.5 | Clase dinámica separada de organizaciones actuales |
| Madurez / impacto visual | 4.5 | Reutiliza la ceremonia Efeonce ID sin introducir decoración ajena |
| Responsive | 4.5 | 390 px conserva lectura y controles sin clipping horizontal |
| Estados | 4.5 | Copy v2 requiere autoridad; no presenta una lista vacía como permiso concedido |
| Accesibilidad | 4.5 | Texto explícito y foco visible, sin depender del color |
| Interacción / reduced motion | 4.5 | Reutilización del flujo estático existente; no añade movimiento |
| Consistencia / fidelidad | 5 | Renderer, tokens, tipografía y shell canónicos sin nuevo CSS |
| Mantenibilidad | 5 | Copy centralizado; DTO server-owned; assets regenerados por tooling |
| Economía de superficies | 4.5 | Agrupación existente, sin nuevas cards ni contenedores redundantes |
| Resistencia a plantilla genérica | 4.5 | Identidad y alcance concretos de la ceremonia, sin composición nueva |

Promedio 4.65; mínimo 4.5. Sidecar no aplica a esta ceremonia OAuth. Error-surface conserva el contrato
existente y sus tests; no se afirma una auditoría visual nueva de todas las pantallas históricas de TASK-1835.

## Blockers

Ninguno en este delta local. El cierre de TASK-1844 depende de la certificación productiva separada.

## Enterprise Bar

La lista se rotula como estado actual y no como alcance fijo del consentimiento. El target sigue siendo
un argumento de cada llamada MCP; esta pantalla no introduce un selector ni cambia la identidad del token.
