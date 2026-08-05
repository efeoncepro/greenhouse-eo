# TASK-1560 — Retiro del payload legacy de Globe

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1524, TASK-1552, TASK-1558, TASK-1559`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- GitHub Issue: `TBD`

## Summary

Borra `producer-ui.ts`, `ui.ts` y `public-share-ui.ts`, retira el flag `client_app_enabled` y deja el
payload cliente como el único camino. Es el **Slice 5 de ADR-014** y el que convierte la migración en
un hecho en vez de una intención.

**`UI impact: none` es literal, no un atajo:** cuando esta task corre, las cinco superficies ya
portaron y el flag ya está en `true`. No hay usuario que note nada. Si al ejecutarla algo cambia
visualmente, es la señal de que una superficie **no** había portado del todo y la task debe detenerse.

## Why This Task Exists

**Mientras estos tres archivos existan, siguen siendo la plantilla que el próximo agente va a copiar.**

Ese es el riesgo entero, y no es hipotético: la forma más barata de agregar una superficie a Globe hoy
es abrir `producer-ui.ts`, copiar 200 líneas de template de string y pegarlas. Nada lo impide — los
gates de `studio-client` sólo escanean `studio-client`. Cada semana que estos archivos siguen vivos es
una semana en que la migración puede crecer trabajo nuevo por detrás.

Y hay una segunda razón, más concreta: **`LEGACY_TOKEN_DRIFT` es el medidor de progreso de la
migración**. Cada entrada desaparece cuando su superficie adopta el valor canónico. Esta task es la
que lo deja vacío — y un ledger vacío es la única prueba dura de que no quedó una superficie sirviendo
un anillo de foco ámbar por olvido.

## Goal

- Los tres módulos de template borrados; el bundle cliente es el único payload.
- `client_app_enabled` retirado de Terraform y del código (un flag permanente es deuda, no gobernanza).
- `LEGACY_TOKEN_DRIFT` vacío y su tipo reducido a `{}` — o el módulo borrado si ya no queda nada que medir.
- El gate que hoy protege `studio-client` cubre **también** `studio-web`, para que no se pueda escribir
  un template nuevo después del retiro.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md` — ADR-014, Slice 5.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PLATFORM_FOUNDATION_V1.md` — CSP, assets y el
  contrato del shell que sobrevive al retiro.

Reglas obligatorias:

- **NUNCA** borrar un archivo cuya superficie no haya portado: verificar por superficie, no por archivo.
- **NUNCA** dejar el flag encendido "por si acaso" — un flag permanente deja de ser un cutover.
- **NUNCA** perder un `data-capture` en el borrado: el consumidor de esos markers vive en **Greenhouse**,
  no en Globe, así que Globe puede quedar verde y romper el GVC del otro repo.

## Normative Docs

- `docs/operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`

## Dependencies & Impact

### Depends on

Las cuatro superficies portadas: `TASK-1524` (launch/studio/error, `ui.ts`), `TASK-1552` (composer),
`TASK-1558` (share board, `public-share-ui.ts`), `TASK-1559` (feed + viewer). **Ninguna es opcional**:
un archivo se borra cuando su última superficie portó, no cuando "ya casi".

### Blocks / Impacts

- Cierra el Slice 5 de ADR-014 y con él la migración completa.
- Libera el presupuesto de mantenimiento dual (hoy toda corrección visual se aplica dos veces).

### Files owned

- `apps/studio-web/src/producer-ui.ts` ❌ · `ui.ts` ❌ · `public-share-ui.ts` ❌ + sus tests
- `apps/studio-web/src/producer-controller.ts` ❌ (el JS serializado)
- `infra/terraform/*` — retiro de `client_app_enabled`
- `apps/studio-client/src/tokens/tokens.ts` — `LEGACY_TOKEN_DRIFT` vacío
- `apps/studio-client/src/gates/design-contract.test.ts` — ampliar cobertura a `studio-web`

## Current Repo State

### Already exists

- El payload cliente, sus tokens, su copy y sus gates (`TASK-1556`).
- `LEGACY_TOKEN_DRIFT` con seis entradas medidas el 2026-07-25.
- El flag `client_app_enabled`, en `true` desde el cutover.

### Gap

- Los tres módulos legacy siguen vivos, y **nada impide copiarlos**.
- El gate de literales cubre `studio-client` únicamente: un template nuevo en `studio-web` pasa limpio.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/apps/studio-web`
- Future candidate home: `remain-shared`
- Boundary: `studio-web` queda como BFF puro — rutas, auth, CSP, assets. Cero render de HTML de producto.
- Server/browser split: al terminar, el markup de producto nace enteramente en `studio-client`; `studio-web` no emite markup de producto.
- Build impact: `reduces` — se borra un vector de build entero.
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Verificación de cobertura (antes de borrar nada) — **inventario de markers ✅ hecho 2026-07-25**

El inventario de contratos cross-repo está en
**`docs/operations/creative-studio/GLOBE_PORT_SURVIVAL_INVENTORY_V1.md`**, adelantado porque
`TASK-1552`, `TASK-1559` y `TASK-1524` lo necesitan **antes** de portar, no cuando se borre el legacy.
Sus dos hallazgos:

- **`producer-model-picker` y `producer-model-trigger` sólo se asignan en runtime**, nunca en el
  markup. Un port que use el markup como referencia no los ve, y el escenario de `TASK-1555` falla en
  **readiness** —que se lee como "la página no cargó"— en vez de en una assertion.
- 🔴 **`data-producer-candidate-kind` y `data-producer-feed-status` NO EXISTEN en Globe** — ni en un
  solo commit de toda su historia — y el escenario `globe-creative-producer` los declara en su
  `readiness.selectors` contra la ruta real. Causa raíz investigada en
  [`ISSUE-125`](../../issues/open/ISSUE-125-gvc-evidence-against-uncommitted-globe-dom.md): la captura
  corrió con **`env: local`** y el árbol local emitía esos atributos con **código que nunca se
  commiteó**. El gate no está roto (se verificó). **El contrato nunca se implementó**, y quien corra
  ese escenario tras portar verá fallar la readiness y concluirá falsamente que lo rompió el port.

#### Resto del Slice 1 — evidencia por superficie

Ruta, quién la sirve hoy, cuál es su reemplazo, y **evidencia** de que el reemplazo está sirviendo en
producción. **Una superficie sin evidencia detiene la task** — no se borra su archivo.

| Superficie | Archivo legacy | Reemplazo | Evidencia de que sirve |
|---|---|---|---|
| `share` | `public-share-ui.ts` | `ShareBoardSurface` (`TASK-1558`) | ✅ **2026-07-25**, rev. `00071-6vp`: `/shares/*` sirve el bundle cliente, React monta bajo CSP real con 0 errores de consola (desktop + 390px), 0 fugas en 7 sondas, asset por CDN. ⏳ Falta la verificación con **grant real** (6 puntos del runbook) — no automatizable: el token se guarda hasheado |
| `launch` · `studio` · `error` | `ui.ts` | `TASK-1524` (Slice 2) | ❌ sin portar |
| `producer` | `producer-ui.ts` + `producer-controller.ts` | `TASK-1552` (composer) + `TASK-1559` (feed/viewer) | ❌ sin portar |

**Regla del cierre:** `public-share-ui.ts` es el único que ya tiene su reemplazo sirviendo, pero **no se
borra hasta que la verificación con grant real esté hecha**. Bundle servido ≠ camino con datos probado:
lo verificado hoy corrió contra un share **inexistente**.

Falta además confirmar que cada marker del inventario tenga **par en el payload cliente**. Sólo se puede
hacer superficie por superficie, a medida que portan.

### Slice 2 — Ampliar el gate a `studio-web`

**Antes del borrado, no después.** El gate de literales (colores, motion, copy, y font-family tras
`TASK-1561`) pasa a escanear también `apps/studio-web/src/**`. Con los archivos legacy todavía
presentes el gate sale **rojo** — eso es correcto y esperado, y se resuelve con el Slice 3. Hacerlo
después dejaría una ventana en que se puede escribir un template nuevo sin que nada lo note.

### Slice 3 — Borrado

Los tres módulos de UI + `producer-controller.ts` + sus tests. El gate del Slice 2 pasa a verde por
construcción. `pnpm build` y `pnpm check` verdes.

### Slice 4 — Retiro del flag y cierre del ledger

`client_app_enabled` fuera de Terraform y del shell. `LEGACY_TOKEN_DRIFT` vacío. Actualizar el skill
`greenhouse-globe` (los dos mirrors) para que sus reglas hablen en presente y no de una convivencia
que ya no existe.

## Out of Scope

- Portar cualquier superficie (eso es de las tasks que bloquean).
- Cambiar valores de token — la resolución del drift ocurre **en el port de cada superficie**,
  con alguien mirando el resultado; acá sólo se vacía el ledger de lo ya resuelto.

## Detailed Spec

El único punto con criterio real es el **Slice 1**. El resto es mecánico una vez que la cobertura está
probada. La regla: *no se borra un archivo porque parezca no usarse; se borra porque su superficie
tiene un reemplazo sirviendo y verificado*.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

**Gate antes que borrado.** Ampliar la cobertura del gate después de borrar deja abierta exactamente la
ventana que esta task existe para cerrar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Borrar una superficie que todavía servía | Producción | **low pero severo** | Slice 1 con evidencia por superficie; sin evidencia no se borra | 404 o pantalla en blanco en una ruta |
| Perder un `data-capture` de runtime | GVC de **Greenhouse** | **medium** | Inventario explícito en Slice 1; verificar el escenario del otro repo | Escenario GVC de Greenhouse falla tras un deploy de Globe |
| El flag retirado deja un camino sin cubrir | Runtime | low | `pnpm build` + smoke de las cinco rutas post-retiro | Ruta que responde 500 tras el retiro |
| Vaciar el ledger sin que el drift se haya resuelto | Visual | medium | Cada entrada se vacía **en el port** que la resuelve, no acá | Anillo de foco ámbar sobreviviendo |

### Feature flags / cutover

Esta task **retira** el flag. No introduce ninguno.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-2 | Revert PR | <10 min | sí |
| 3 | Revert PR (git conserva los archivos) | <15 min | sí |
| 4 | Revert + `tofu apply` | <20 min | sí |

### Production verification sequence

1. Slice 1 con evidencia escrita por superficie.
2. Slices 2-3 → gates verdes → deploy → smoke de las cinco rutas.
3. Slice 4 → `tofu plan` revisado → apply → smoke de nuevo.
4. Correr el escenario GVC de **Greenhouse** que consume los `data-capture` del Producer.

### Out-of-band coordination required

`tofu apply` sobre `infra/terraform` para el retiro del flag.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Inventario de `data-capture` y atributos de estado escrito (`GLOBE_PORT_SURVIVAL_INVENTORY_V1.md`), con los dos hallazgos.
- [ ] Evidencia **por superficie** de que su reemplazo está sirviendo (depende de los ports).
- [ ] El gate de literales escanea `apps/studio-web/src/**` y está verde.
- [ ] `producer-ui.ts`, `ui.ts`, `public-share-ui.ts` y `producer-controller.ts` no existen.
- [ ] `client_app_enabled` no aparece en Terraform ni en el código.
- [ ] `LEGACY_TOKEN_DRIFT` vacío (o el módulo retirado).
- [ ] Las cinco rutas responden y renderizan tras el retiro.
- [ ] El escenario GVC de Greenhouse que depende de los markers del Producer sigue verde.
- [ ] El skill `greenhouse-globe` (Claude y Codex) actualizado a la realidad post-retiro.

## Verification

`pnpm check` · `pnpm build` · gates · smoke de las cinco rutas · GVC de Greenhouse.

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] ADR-014: registrar el Slice 5 como completo y la migración cerrada
- [ ] `Handoff.md` + `GLOBE_RUNTIME_HANDOFF.md`
- [ ] `changelog.md`
- [ ] `EPIC-028` actualizado
- [ ] chequeo de impacto cruzado

## Follow-ups

- Ninguno: esta task cierra ADR-014.

## Open Questions

- Ninguna. El criterio de borrado es objetivo (evidencia por superficie) y el orden está fijado.

---

## Delta 2026-07-29 — tu Slice 2 hereda dos clases más de gate, y un límite estructural

Cerró [`TASK-1599`](../complete/TASK-1599-globe-client-typographic-contract-producer-hierarchy.md), que
agregó **dos gates nuevos** al mismo archivo que tu Slice 2 va a ampliar
(`apps/studio-client/src/gates/design-contract.test.ts`):

- `never asks a family for a cut it does not load` — aparea familia×peso **en el sitio de uso**, no en la
  declaración. Cierra la síntesis del navegador que `TASK-1561` dejó nombrada: un peso sin archivo se
  sintetiza, deforma el trazo y **no falla nada**.
- `never writes a font utility the theme cannot generate` — una utilidad de fuente que el theme no puede
  producir no emite CSS y es indistinguible de un olvido.

**Qué cambia para tu Slice 2:** al ampliar la frontera a `apps/studio-web/src/**` ya no son sólo colores,
motion, copy y `font-family` literal — son **seis clases**. Y el rojo esperado al ampliar será mayor de lo
que este spec calculaba.

**Medición nueva de `studio-web`, hecha hoy:** **184 hex crudos** y **4 familias literales**. Ése es el
tamaño real del rojo que tu Slice 2 va a encender antes de que el Slice 3 lo apague.

**Límite estructural que heredas, y que ninguna ampliación de frontera resuelve:** el preflight de Tailwind
no se emite, así que la regla del navegador `b, strong { font-weight: bolder }` pide el corte fuerte **por
herencia, sin que ninguna clase lo diga**. El gate escanea `className`, no elementos HTML: el caso le es
invisible por construcción. Apareció tres veces en un solo día. **No tiene dueño.** Ampliar la frontera a
`studio-web` no lo cubre — es un eje distinto del mismo contrato.
