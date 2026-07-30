# EPIC-028 — Barrido de WIP y camino real al lane comercial (2026-07-30)

> **Qué es esto.** Las 22 tasks `in-progress` de EPIC-028, contrastadas contra el runtime y contra el git de
> `efeonce-globe` — no contra lo que declaran. El objetivo era responder una pregunta concreta: **qué falta
> realmente para el primer lane comercial (SKY Airline, `TASK-1480`)**.
>
> **Por qué hizo falta.** El repo tiene **108 tasks `in-progress`**. En una sola sesión previa aparecieron
> tres casos de tablero mintiendo (`TASK-1034` con slices DONE seguía abierta, `TASK-1590` decía "pendiente"
> estando a medias, `TASK-1589` decía `complete` faltándole todo el gobierno de distribución). Elegir
> prioridad con un tablero así es elegir a ciegas.

## El hallazgo principal

**El tablero miente sistemáticamente, y siempre en la misma dirección: las tasks están más avanzadas de lo
que declaran.**

| Task | Declara | Realidad medida |
|---|---|---|
| `TASK-1535` | `Diseno` | **Desplegado y verificado live** (ADR-010). Múltiples commits en `main` de Globe, incluidos los fixes de adapters de la flota frontier |
| `TASK-1553` | `Diseno` | **Code-complete en `main`** — `5482a60 feat(creative-runner): route-based model resolution + multi-model catalog (ADR-013)` |
| `TASK-1559` | *"falta push a main + deploy"* | **Ya está en `main`** (`494caa0`, `c9ceabc`). Y el motion que declaraba faltante (`TASK-1565`) también (`1c0684e`) |

Tres de 22 con estado falso. Ninguna estaba menos avanzada de lo declarado.

## El cuello de botella que ya no existe

Tres tasks (`1463`, `1505`, `1521`) declaran el mismo bloqueo: **"7 rutas sin promoción"**.

Medido contra `GLOBE_MODEL_FLEET_STATUS.md` — que **tiene cambios sin commitear en este momento**, porque
la promoción está ocurriendo hoy:

| Estado | Rutas | Cuáles |
|---|---|---|
| ✅ **Operativas en producción gobernada** | **10** | `rrss-v1` · `reference-v1` · **`nanobanana-pro-v1`** (promovido 07-30, revisión live `896a0620`) · `loop-v1` · `frames-v1` · `motion-v1` · `foley-v1` · `tts-v1` · `change-v1` · `translate-v1` |
| 🔒 Bloqueadas por **terceros** | 3 | `openai-v2` y `openai-v1-5` (falta el verifier de OpenAI) · `nanobanana-2-v1` (allowlist de Google) |
| ⏳ Solo Lab | 1 | `motion/reference-v1` (Omni no está en el path gobernado) |

**De "3 promovidas / 7 pendientes" se pasó a 10 operativas.** Y lo que queda bloqueado **no depende de
trabajo interno**: son un verifier de OpenAI y una allowlist de Google.

El propio `TASK-1521` ya lo refleja en sus criterios —habla de *"las diez rutas"*— mientras su `Status real`
sigue diciendo "7 rutas". La task se contradice a sí misma.

## Clasificación de las 22

### A — Terminadas o casi, sin cerrar (5)

| Task | Qué falta de verdad |
|---|---|
| `1535` | Nada técnico. **Actualizar el estado y cerrar** |
| `1553` | Nada técnico. **Actualizar el estado y cerrar** |
| `1559` | Ya está en `main`. Verificar deploy y cerrar |
| `1558` | *"LIVE, flag prendido y verificado"* — falta **verificación humana con un grant real** |
| `1562` | Slices 1-2 desplegados; Slice 3 decidido a la baja — falta el mismo **resolve con grant real** |

`1558` y `1562` comparten el **mismo bloqueo**: nadie ejerció un share con token real. Es una sesión humana
de 15 minutos que cierra dos tasks (runbook `operar-share-board-globe.md`).

### B — En curso real (5)

`1482` (credit pools sobre el ledger de 1468) · `1496` · `1497` · `1552` (Slice 3: estados de ejecución y
evidencia premium) · `1520` (export y purge cerrados).

### C — Bloqueadas por dependencia externa o por gate de diseño (8)

`1463` y `1505` (su bloqueo declarado se redujo de 7 rutas a 3, y las 3 dependen de terceros) · `1467`
(private ingest gateado) · `1470` (dentro del goal de 1505) · `1504` (canarios propios por capacidad) ·
`1522` (*"smoke bloqueado por ausencia de output elegible"* — hoy con 10 rutas vivas, **esto puede estar
resuelto**; verificar) · `1498` · `1468` (migración y rollout comercial).

### D — Deuda operativa concreta (1)

`1469` — *"5 reconciles terminales stale mantienen queue age incorrecta"*. Es el **único bug vivo declarado**
del barrido. No verificado contra la DB en esta pasada.

### E — El gate comercial (3)

`1480` (readiness gate, consume el pack) · `1521` (P0, produce el pack) · `1527` (P0, promotion operation:
*"restauración de binding image + saga promote-from-candidate pendientes"*).

## El camino real a SKY

```
TASK-1521 (P0) ── produce el pack de evidencia ──▶ TASK-1480 ── readiness final ──▶ lane SKY
```

`TASK-1521` tiene **8 acceptance criteria abiertos**, y son sustanciales — no papeleo:

1. Arranque en etapa comercial con config completa/aislada y **fail-closed** si falta un gate.
2. **E2E completo**: identity → tenant → ledger → provider → governance → derivative → feed/stream →
   settlement/cancel, sin usar el spend fence como ledger.
3. ADR-008 para las **tres modalidades**: thumbnail/poster/transcode/waveform, Range real, feed visibility.
4. **Orphan GC**: inventory, dry-run, grace/holds, apply auditado sin SQL manual.
5. **Las diez rutas** con review/proposal/binding/circuit/canary exacto — *una ruta no hereda evidencia de
   otra*.
6. `globe_worker_failed` con severidad/condición accionable y runbook verificado.
7. IAM/secrets/data/storage/providers aislados y verificados.
8. Canary, recovery/restore y rollback **con evidencia live**.

**Lo que esto significa:** el camino a SKY **no está bloqueado por promoción de modelos** —eso se destrabó—
sino por **evidencia operativa**: E2E, GC, aislamiento y rollback probados en vivo.

Es trabajo de rigor, no de features. Y `TASK-1480` no puede cerrar antes porque **consume ese pack**.

## Recomendación

1. **Cerrar los 5 de la categoría A.** Tres no necesitan código; dos comparten una sesión humana de 15
   minutos con un grant real. **Bajar el WIP de 22 a 17 sin escribir una línea.**
2. **Actualizar los `Status real` mentirosos** (`1535`, `1553`, `1559`, y el "7 rutas" de `1521`/`1463`/
   `1505`). Un tablero que miente hace que cada sesión repita este barrido.
3. **Verificar si `1522` sigue bloqueada** — su bloqueo era "ausencia de output elegible" y hoy hay 10 rutas
   operativas.
4. **Atacar `TASK-1521` por sus 8 criterios**, que es el único camino real a SKY. Empezar por el E2E
   completo (criterio 2): es el que más cubre y el que expone lo que falte de los demás.
5. `TASK-1469` (los 5 reconciles stale) merece verificación contra la DB: es el único bug vivo declarado.

## Lo que este barrido NO verificó

- El estado de los 5 reconciles stale de `1469` (requiere acceso a la DB de Globe).
- Si las revisiones Cloud Run desplegadas corresponden a los SHAs que las tasks declaran (se verificó el git,
  no el runtime desplegado de cada servicio).
- Las tasks `to-do` de EPIC-028 — el barrido cubrió sólo las `in-progress`.

---

## Ejecución del barrido — resultado real (2026-07-30)

Al intentar cerrar las tres tasks de la categoría A, **la estimación inicial resultó optimista**. Los
`Acceptance Criteria` estaban **sin marcar** en las tres, así que cerrarlas exigía verificación real, no un
cambio de estado. El resultado:

| Task | Veredicto | Por qué |
|---|---|---|
| `TASK-1535` | ✅ **CERRADA** | Los 7 criterios verificados uno por uno contra migración, stores, tests nominales, `requireHuman`, 7 archivos de evidencia de términos y las 4 capas documentales |
| `TASK-1553` | 🔴 **no cerrable** | 6/7. Su criterio abierto depende de `TASK-1578` (`to-do`, sin formalizar) y `TASK-1468` (`in-progress`, migración pendiente). **Bloqueo real, no olvido** |
| `TASK-1559` | 🔴 **no cerrable** | Código en `main` y concurrencia con tests verdes, pero su criterio 7 exige *before/after desktop y 390px* y **no existe ninguna captura suya** en `.captures/`. Falta **evidencia visual**, no código |

**WIP de EPIC-028: 22 → 21.** No 17.

### La lección, que vale más que el número

Mi recomendación decía *"tres no necesitan código"*. Era cierto —ninguna necesitaba código nuevo— pero
**incompleta**: dos necesitaban algo que no tenían, y una de ellas depende de tasks ajenas.

**Un `Status real` optimista y unos checkboxes sin marcar se parecen mucho a una task terminada.** La única
forma de distinguirlos es verificar criterio por criterio. Este barrido lo hizo con tres tasks; quedan 18.

### Estados corregidos en esta pasada

- `1535` · `1553` · `1559` — el `Status real` decía `Diseno` o *"falta push"*; ahora declara el estado
  medido y, cuando corresponde, **qué falta exactamente para cerrar**.
- `1521` · `1463` · `1505` — se añadió la nota de que el bloqueo de "7 rutas" ya no aplica: hoy hay **10
  operativas** y las 3 restantes dependen de terceros.

### Lo que sigue sin verificar

- `TASK-1522` sigue declarando *"smoke bloqueado por ausencia de output elegible"*. Con 10 rutas vivas es
  **candidata a desbloqueo**, pero confirmarlo exige una generación real (gasto + auth), fuera del alcance
  de un barrido documental.
- `TASK-1558` y `TASK-1562` siguen compartiendo el mismo bloqueo: **una sesión humana con un grant real**.
  Ningún agente puede resolverlo — el token se guarda como `hashSecret` y crear uno requiere sesión OAuth de
  Globe (runbook `operar-share-board-globe.md`).

### Segunda pasada — medir criterios antes de leer estados (2026-07-30)

En vez de seguir revisando tasks al azar, se midió **cuántos criterios marcados vs abiertos** tiene cada
una. El resultado señaló sola la respuesta:

| Task | Criterios | Veredicto |
|---|---|---|
| `TASK-1498` | **8/8** | ✅ **CERRADA** — sus pendientes eran follow-ups con dueño (`1474`, `1472`, `1465`) |
| `TASK-1505` | **16/16** | ✅ **CERRADA** — "7 promociones" ya no aplica y "sesión expirada" es un gap declarado de la arquitectura del Producer, no un criterio suyo |
| `TASK-1558` | **11/11** | 🔴 **no cerrable** — su `Status` declara *"falta verificar el estado ready con un grant real"*, la misma sesión humana que bloquea a `1562` |

**Tres tasks con el 100% de sus criterios marcados seguían en `in-progress`.** Alguien verificó y no cerró.

**WIP de EPIC-028: 22 → 19.**

#### El método que funcionó, para la próxima

Contar `- [x]` vs `- [ ]` en `## Acceptance Criteria` **antes** de leer el `Status real` encuentra las tasks
terminadas en un solo pase. El `Status real` es prosa optimista o pesimista según quién la escribió; los
checkboxes son binarios.

La regla que se desprende: **cuando los criterios están al 100% y el `Status` declara pendientes, casi
siempre esos pendientes son follow-ups con dueño o gaps de otra spec** — no trabajo de la task. Vale
verificarlo caso por caso, pero el sesgo es ése.

Quedan **19**, de las cuales `1553` y `1559` ya se verificaron y NO son cerrables por razones reales.
