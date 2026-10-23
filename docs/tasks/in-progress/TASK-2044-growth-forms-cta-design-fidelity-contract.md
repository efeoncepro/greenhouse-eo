# TASK-2044 — Contrato de fidelidad de diseño para Growth Forms y Growth CTA

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `none`
- Status real: `Code complete 2026-10-23 (Slices 1–5, commits 0864b7c04…36aa21309 + docs). Rollout pendiente: diff del contrato público en staging tras el próximo deploy de develop; sin push por instrucción del operador (no release a main)`
- Rank: `TBD`
- Domain: `growth|public-site|forms`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende los contratos de Growth Forms y Growth CTA para que un formulario diseñado en un canvas se pueda declarar tal
cual: ancho por campo (`half`/`full`), consentimiento con enlace dentro de la frase y estilo compacto, una acción
«Cerrar» en la tarjeta de éxito con el ícono que pida el diseño (celebración, órbita o ninguno), y una presentación
`dialog` para la acción `open_growth_form` del CTA, con su propio encabezado. Es la base gobernada que consume **TASK-2045** (renderer y diálogo); todo es opcional y
retrocompatible.

## Why This Task Exists

Los formularios diseñados en canvas para las landings se ven bien, pero al implementarlos con Growth Forms aparecen
diferencias que el contrato no deja expresar y hay que rediseñar alrededor del renderer. Caso fuente: el popup
«Quiero ser partner» del canvas de Partners (`https://claude.ai/artifact/JTxu8GHSsrTU2LqXSvwCrp`, versión 14), que pide
una grilla 2×2 con «Sitio web» en media columna, una casilla de consentimiento con el enlace a la política dentro de la
frase, un «Recibido.» con botón «Cerrar» y todo dentro de un popup. Hoy:

- El contrato de campo no tiene ancho: el renderer decide solo y fuerza `url`, `textarea`, `consent` y otros a fila
  completa (`src/growth-forms-renderer/renderer.ts` `fieldPrefersFullWidth`, ~líneas 783–807).
- El consentimiento sólo admite un `label` de texto plano y un enlace fijo «Política de privacidad» en un párrafo
  aparte (`src/growth-forms-renderer/copy.ts:141`).
- `SUCCESS_ACTION_KINDS` es `external_link | download | asset_access | schedule`
  (`src/lib/growth/forms/contracts.ts:391`): ninguna cierra, y la tarjeta siempre muestra el ícono de celebración.
- La acción `open_growth_form` sólo guarda `{ kind, formRef }` y despliega el formulario dentro de la tarjeta del CTA
  (`src/growth-cta-renderer/action.ts`); no existe presentación en diálogo. La colocación `popup_modal` del contrato es
  interruptiva (aparece sola, con tope de frecuencia) y no aplica a un formulario que el visitante abre con un botón.

Sin contrato, cada landing parcha con CSS o adapta el diseño, y el diseño deja de ser la fuente.

## Goal

- Que cada pieza del diseño de referencia tenga un campo de contrato que la exprese, validado en el servidor y
  proyectado al contrato de render público.
- Que todo sea aditivo: los formularios y CTAs publicados hoy no cambian de render sin declarar los campos nuevos.
- Que el contrato quede documentado como el kit que un diseño de canvas puede usar sin adaptar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` (§placements, §open_growth_form, línea ~562 «sin un modal abrupto»)
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- El servidor es la fuente del contrato: `src/lib/growth/forms/contracts.ts` y `src/lib/growth/ctas/contracts.ts`
  definen y validan; los renderers (`src/growth-forms-renderer/contract.ts`, `src/growth-cta-renderer/contract.ts`)
  sólo copian los tipos. Toda enum nueva entra en los dos lados en el mismo commit, con su test de paridad.
- Campos nuevos opcionales con un default que reproduce el render actual. Nada se vuelve obligatorio.
- El consentimiento sigue siendo autoritativo en el servidor: el enlace dentro de la frase es presentación; la
  versión de consentimiento, el `privacyUrl` y el registro del envío no cambian.
- Nada de HTML libre en el contrato: el enlace del consentimiento usa un marcador declarado, nunca markup del autor.
- La presentación `dialog` es una propiedad de la acción `open_growth_form` (abierta por el visitante), no la colocación
  `popup_modal` (interruptiva); no hereda tope de frecuencia ni la restricción móvil de intersticiales.

## Normative Docs

- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/manual-de-uso/growth/operar-motor-cta.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `.claude/skills/greenhouse-growth-forms/SKILL.md`
- `.claude/skills/greenhouse-growth-ctas/SKILL.md`
- `.claude/skills/efeonce-public-site-wordpress/references/growth-forms-wordpress.md` (§Canvas-designed forms)

## Dependencies & Impact

### Depends on

- Contrato de formularios vigente: `src/lib/growth/forms/contracts.ts` (`fieldPresentationSchema` ~173, `fieldDefinitionSchema` ~287, `SUCCESS_ACTION_KINDS` ~391, `successBehaviorSchema` ~515).
- Compilador de políticas: `src/lib/growth/forms/policy-compiler.ts`.
- Proyección pública del formulario: `src/lib/growth/forms/readers.ts` y `src/app/api/public/growth/forms/[formSlug]/route.ts`.
- Contrato y registro de acciones del CTA: `src/lib/growth/ctas/contracts.ts`, `src/lib/growth/ctas/action-registry.ts`, `src/lib/growth/ctas/render-contract.ts`.

### Blocks / Impacts

- **TASK-2045** (renderer y diálogo) consume todo este contrato; queda bloqueada hasta que esta cierre.
- **TASK-1320** (tarjeta de éxito, `in-progress`): la acción `dismiss` y `successBehavior.icon` se suman a su contrato; recibe Delta.
- **TASK-2038** (renderer en AXIS, `to-do`): los tipos copiados del renderer viajan con el port; recibe Delta.
- **TASK-2039** (señales de la landing → formulario): no se pisan; ambos agregan campos opcionales al contrato.
- La landing Partners (`/partnership/`) es el primer consumidor; su despliegue no es parte de esta task.

### Files owned

- `src/lib/growth/forms/contracts.ts`
- `src/lib/growth/forms/policy-compiler.ts`
- `src/lib/growth/forms/readers.ts`
- `src/lib/growth/ctas/contracts.ts`
- `src/lib/growth/ctas/action-registry.ts`
- `src/lib/growth/ctas/render-contract.ts`
- `src/growth-forms-renderer/contract.ts` (sólo tipos copiados)
- `src/growth-cta-renderer/contract.ts` (sólo tipos copiados)
- `src/lib/growth/forms/__tests__/*` y `src/lib/growth/ctas/__tests__/*` (pruebas nuevas)
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` (delta)

## Current Repo State

### Already exists

- `fieldPresentationSchema` con `icon` y `control` (`premium_select`, `country_select`): el lugar natural para `width`.
- Consentimiento configurable: `noticeText`, `privacyUrl`, casillas con `key`, `label`, `required` (`src/growth-forms-renderer/contract.ts` ~139–152 copia el del servidor).
- `successBehavior` con `success_card` (título, cuerpo, pasos, recompensa, nota y hasta dos acciones con `href`).
- Acción `open_growth_form` con `formRef`, validada contra una versión publicada viva (`action-registry.ts` ~142–157); al navegador sólo llega `{ formSlug, formKey }` (`contracts.ts` ~436–440).
- Prueba de paridad entre la enum del servidor y la copia del renderer del CTA (`action-registry.ts` ~11–13).

### Gap

- Sin ancho por campo en el contrato.
- Sin enlace dentro de la frase ni estilo compacto para el consentimiento.
- Sin acción de cierre en el éxito ni forma de ocultar el ícono.
- Sin presentación `dialog` para `open_growth_form`.
- Sin documento que diga qué puede usar un diseño de canvas (el kit) y qué no.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/forms` y `src/lib/growth/ctas` (servidor Greenhouse); tipos copiados en `src/growth-forms-renderer` y `src/growth-cta-renderer`
- Future candidate home: `domain-package`
- Boundary: contrato de render público de Growth Forms (ruta pública de lectura por slug del formulario) y contrato de render del CTA; consumidores autorizados: los custom elements greenhouse-form y greenhouse-cta, el admin de formularios y los scripts de publicación de Growth
- Server/browser split: validación, compilación y proyección en el servidor; los renderers sólo leen la proyección pública, sin PII ni secretos
- Build impact: none
- Extraction blocker: los tipos del renderer se copian a mano desde el servidor; TASK-2038 los mueve a AXIS y debe llevar estos campos

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `fieldDefinitionSchema`, consentimiento y `successBehaviorSchema` de `src/lib/growth/forms/contracts.ts`; acción `open_growth_form` de `src/lib/growth/ctas/contracts.ts`; ambos persistidos como JSON de la versión del formulario y de la definición del CTA
- Consumidores afectados: `<greenhouse-form>`, `<greenhouse-cta>`, admin `/admin/growth/forms`, scripts `scripts/growth/publish-*`, contrato público `GET /api/public/growth/forms/[formSlug]`
- Runtime target: staging y producción (misma instancia Cloud SQL); Vercel para la API pública

### Contract surface

- Contrato existente a respetar: `docs/architecture/growth-public-forms-runtime-contract.md`; `fieldDefinitionSchema`, `successBehaviorSchema`, contrato `open_growth_form`
- Contrato nuevo o modificado:
  - `fieldPresentationSchema.width`: `'auto' | 'half' | 'full'` (default `auto` = heurística actual)
  - consentimiento: `presentation: 'tile' | 'compact'` (default `tile`) y casilla con `label` que admite un único marcador `{privacyLink}`, reemplazado por un enlace a `privacyUrl` con el texto `privacyLinkLabel` declarado; si el marcador está, el párrafo de enlace aparte se omite
  - éxito: acción `kind: 'dismiss'` (sin `href`, emite evento) y `icon: 'celebration' | 'orbit' | 'none'` (default `celebration`; `orbit` es el glifo de La órbita)
  - CTA: `open_growth_form.presentation: 'inline' | 'dialog'` (default `inline`) y, sólo con `dialog`, un encabezado opcional `dialog: { eyebrow?, title?, lead? }` (texto plano; sin él se usa el titular del CTA), proyectados al navegador junto a `formSlug`/`formKey`
- Backward compatibility: `compatible` (todo opcional, defaults iguales al render actual)
- Full API parity: los campos nuevos se escriben por las mismas vías gobernadas que ya existen (admin de formularios, `authorDraftForm` de los scripts, comando de CTA); no nace una vía de escritura nueva ni lógica en la UI

### Data model and invariants

- Entidades/tablas/views afectadas: JSON de las versiones de formulario y de las definiciones de CTA en las tablas de Growth existentes `[verificar nombres en src/lib/growth/forms/store.ts y src/lib/growth/ctas/store.ts]`; sin columnas nuevas
- Invariantes que no se pueden romper:
  - una versión publicada es inmutable: los campos nuevos sólo entran en versiones nuevas
  - un formulario sin los campos nuevos proyecta exactamente el mismo contrato público que hoy
  - el marcador `{privacyLink}` es el único admitido; cualquier otro marcador o HTML en `label` se rechaza al compilar
  - `dismiss` no lleva `href`; las demás acciones siguen exigiendo `href`
  - `presentation: 'dialog'` sólo vale para `open_growth_form`
  - la enum del servidor y la copia de cada renderer son idénticas (prueba de paridad)
- Write-target allowlist: N/A — no hay tabla nueva
- Tenant/space boundary: sin cambio; los formularios y CTAs públicos no tienen tenant de cliente y los gobierna el admin de Growth
- Idempotency/concurrency: sin cambio; publicar sigue siendo un comando versionado
- Audit/outbox/history: el historial de versiones existente registra el cambio; sin eventos nuevos

### Migration, backfill and rollout

- Migration posture: `none` (JSON con campos opcionales)
- Default state: campos ausentes = render actual
- Backfill plan: none; las versiones publicadas no se tocan
- Rollback path: revert del commit; una versión que ya declara campos nuevos sigue validando en una versión anterior del contrato si esos campos se ignoran `[verificar que el schema zod no sea strict sobre presentation; si lo es, documentar el orden de revert]`
- External coordination: none

### Security and access

- Auth/access gate: sin cambio (admin de Growth con sus capabilities; API pública de lectura con surface y origen permitido)
- Sensitive data posture: no se agrega PII; el texto del consentimiento es copy público
- Error contract: errores de compilación canónicos del policy compiler; nada crudo hacia la API pública
- Abuse/rate-limit posture: sin cambio

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/forms src/lib/growth/ctas src/growth-forms-renderer src/growth-cta-renderer`
- DB/runtime checks: lectura del contrato público de un formulario existente antes y después (`pnpm staging:request /api/public/growth/forms/<slug>`) con diff vacío
- Integration checks: una versión borrador de prueba con los cuatro campos nuevos compila y proyecta; no se publica
- Reliability signals/logs: none nuevos
- Production verification sequence: diff del contrato público de los formularios vivos (`efeonce-media-diagnostic`, `efeonce-inbound-diagnostic`, `efeonce-hubspot-scope`) = vacío tras el deploy

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Ancho por campo

- `fieldPresentationSchema.width` (`auto|half|full`) en el servidor, la proyección pública y el tipo copiado del renderer.
- Pruebas: un campo sin `width` proyecta igual que hoy; `half` y `full` viajan al contrato público.

### Slice 2 — Consentimiento con enlace y estilo compacto

- `presentation: 'tile'|'compact'` en el consentimiento y marcador `{privacyLink}` en el `label` de la casilla.
- El policy compiler rechaza HTML, marcadores desconocidos y más de un marcador; exige `privacyUrl` si el marcador está.
- Pruebas de compilación (válido, HTML, marcador doble, sin `privacyUrl`).

### Slice 3 — Cierre del éxito

- `SUCCESS_ACTION_KINDS` suma `dismiss` (sin `href`); `successBehavior.icon` (`celebration|orbit|none`).
- Pruebas: `dismiss` con `href` se rechaza; las acciones existentes siguen exigiendo `href`.

### Slice 4 — Presentación `dialog` del CTA

- `open_growth_form.presentation` (`inline|dialog`) y el encabezado `dialog` (eyebrow, título, bajada; texto plano con largo máximo) en el contrato del CTA, el registro de acciones, la proyección al navegador y la copia del renderer.
- El encabezado `dialog` se rechaza si la presentación no es `dialog`.
- Prueba de paridad servidor ↔ renderer actualizada; `dialog` en otra acción se rechaza.

### Slice 5 — Kit de diseño documentado

- Sección «Lo que un diseño puede declarar» en `docs/architecture/growth-public-forms-runtime-contract.md`: tabla de controles, anchos, consentimiento, éxito, tokens que expondrá TASK-2045 y lo que no se admite.
- Delta en `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`: `dialog` como presentación de una acción abierta por el visitante, distinta de `popup_modal`.
- Deltas en TASK-1320, TASK-2038 y TASK-2045.

## Out of Scope

- Cambios de render en `<greenhouse-form>` o `<greenhouse-cta>` (son de TASK-2045).
- Implementar la colocación interruptiva `popup_modal`.
- Mover el renderer a AXIS (TASK-2038).
- Crear el formulario «Quiero ser partner» y su destino en HubSpot, y desplegar Partners.
- Avisos al equipo por envío.

## Detailed Spec

Forma propuesta de los campos (el agente puede ajustar nombres en Discovery manteniendo la semántica):

```ts
// src/lib/growth/forms/contracts.ts
export const FIELD_WIDTHS = ['auto', 'half', 'full'] as const
// fieldPresentationSchema: + width: z.enum(FIELD_WIDTHS).optional()

export const CONSENT_PRESENTATIONS = ['tile', 'compact'] as const
// consent: + presentation: z.enum(CONSENT_PRESENTATIONS).optional()
// checkbox.label: string que puede contener exactamente un '{privacyLink}'

export const SUCCESS_ACTION_KINDS = ['external_link', 'download', 'asset_access', 'schedule', 'dismiss'] as const
// success_card.presentation: + icon: z.enum(['celebration', 'orbit', 'none']).optional()

// src/lib/growth/ctas/contracts.ts
// open_growth_form: { kind, formRef, presentation?: 'inline' | 'dialog',
//                     dialog?: { eyebrow?: string; title?: string; lead?: string } }
```

Diseño de referencia y su mapeo al contrato:

| Elemento del diseño | Campo de contrato |
|---|---|
| Nombre y apellido · Correo (fila 1) | `text` y `email` con `width: 'half'` |
| Empresa · Sitio web (fila 2) | `text` y `url` con `width: 'half'` |
| «¿Qué ofreces y a quién le sirve?» | `textarea` con `width: 'full'` |
| Casilla «Acepto que Efeonce use estos datos…, según su {privacyLink}.» | consentimiento `presentation: 'compact'` |
| «¿Eres una plataforma?» · «Sumémonos.» · bajada | encabezado `dialog` del CTA (eyebrow, título, bajada) |
| «Recibido.» con el arco de la órbita + texto + «Cerrar» | `success_card` con `icon: 'orbit'` y acción `dismiss` |
| Popup al pulsar «Quiero ser partner» | CTA `open_growth_form` con `presentation: 'dialog'` |
| Anillo del eyebrow, punto del título, flecha del botón | piel de la landing por los hooks del renderer (TASK-2045); no entran al contrato |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slices 1–4 son independientes entre sí; cada uno agrega su campo en servidor y copia del renderer en el mismo commit.
- Slice 5 cierra cuando los cuatro anteriores están en `develop`.
- TASK-2045 no empieza a consumir un campo antes de que su slice esté mergeado aquí.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un formulario vivo cambia su contrato público sin declararlo | Growth Forms API pública | low | defaults iguales al render actual; diff del contrato público antes/después | diff no vacío en la verificación |
| El schema zod es estricto y un renderer viejo rechaza campos nuevos | renderers publicados | low | los renderers leen campos opcionales; probar el contrato nuevo contra la versión publicada del renderer | error de render en la consola del Lab |
| Marcador de consentimiento usado para inyectar HTML | consentimiento | low | marcador único declarado, HTML rechazado al compilar, escape en el renderer (TASK-2045) | prueba de compilación |
| Desalineación entre la enum del servidor y la copia del renderer | Growth CTA | medium | prueba de paridad existente extendida | prueba roja en CI |

### Feature flags / cutover

- Sin flag: additive. Los campos son opcionales y sólo cambian algo cuando una versión nueva de formulario o CTA los declara.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del commit; las versiones vivas no usan `width` | minutos | sí |
| Slice 2 | revert del commit | minutos | sí |
| Slice 3 | revert del commit | minutos | sí |
| Slice 4 | revert del commit | minutos | sí |
| Slice 5 | revert de la documentación | minutos | sí |

### Production verification sequence

1. Tests focales verdes en local.
2. Deploy a staging: diff del contrato público de tres formularios vivos = vacío.
3. Borrador de prueba con los campos nuevos compila (sin publicar).
4. Release a producción por el control plane y repetir el diff.

### Out-of-band coordination required

N/A — repo-only change; ningún proveedor externo cambia en esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `fieldPresentationSchema.width` (`auto|half|full`) existe en el servidor, en la proyección pública y en el tipo del renderer, con prueba. Evidencia: `design-fidelity-contract.test.ts` §ancho.
- [x] El consentimiento admite `presentation: 'compact'` y un único `{privacyLink}`; HTML, marcadores desconocidos o dobles se rechazan al compilar, con prueba. Evidencia: `design-fidelity-contract.test.ts` §consentimiento (también `consent_display_invalid` y `privacyUrl` obligatoria).
- [x] `dismiss` existe como acción de éxito sin `href` y el éxito admite `icon: 'orbit'` y `icon: 'none'` (campo `successBehavior.icon`: `presentation` ya era un enum), con prueba. Evidencia: `design-fidelity-contract.test.ts` §cierre e ícono.
- [x] `open_growth_form` admite `presentation: 'dialog'` y su encabezado, ambos llegan al navegador y la prueba de paridad servidor ↔ renderer pasa. Evidencia: `action-registry.test.ts` §presentación dialog + `renderer-contract-parity.test.ts` + `pnpm typecheck` verde.
- [ ] El contrato público de `efeonce-media-diagnostic`, `efeonce-inbound-diagnostic` y `efeonce-hubspot-scope` es idéntico antes y después en staging. **Sin verificar:** requiere deploy de develop (sin push por instrucción del operador). Cubierto en local por los tests «sin el campo proyecta igual que hoy».
- [x] `docs/architecture/growth-public-forms-runtime-contract.md` tiene la sección del kit de diseño con el mapeo del popup de Partners (§Formularios diseñados en canvas).
- [x] TASK-1320, TASK-2038 y TASK-2045 tienen su Delta (TASK-1320 y TASK-2045 corregidos a `successBehavior.icon`).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/growth/forms src/lib/growth/ctas src/growth-forms-renderer src/growth-cta-renderer`
- `pnpm test` (suite completa antes de cerrar)
- `pnpm staging:request /api/public/growth/forms/<slug>` antes y después

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-2045 queda desbloqueada y su `Blocked by` actualizado

## Follow-ups

- TASK-2045: render de todos estos campos y presentación en diálogo.
- Formulario «Quiero ser partner» (alta, destino HubSpot, fila en el plan de medición) junto al despliegue de Partners.

## Open Questions

- ¿El ancho `half` debe colapsar a `full` bajo el ancho de contenedor de 520 px (hoy el renderer cambia de 1 a 2 columnas con una container query)? Propuesta: sí, `half` sólo aplica en el modo de dos columnas.
