# Greenhouse Hiring — Vocabulario de etapas del pipeline — Auditoría 2026-08-22

## Estado

- Tipo: auditoría de arquitectura de dominio y contrato operativo
- Fecha: 2026-08-22
- Scope: `greenhouse_hiring.hiring_application.stage` y **todo** su radio de consumo — dominio, tablero, automatización de assessment, comunicación al candidato, fairness/AI Act, retención de PII, carril programático (App API/MCP/Nexa), procedencia de datos y tasks vivas
- Método: 6 barridos exhaustivos de código en paralelo + lectura directa de Cloud SQL + arqueología de `git` y del log append-only de eventos
- Evidencia: repositorio en `develop` (`d8c58b964`), Cloud SQL `greenhouse-pg-dev` leído el 2026-08-22, `greenhouse_sync.outbox_events` (222.801 eventos)
- Verdict: **`structural_defect_confirmed` — el vocabulario de etapas no tiene dueño único y no cumple Full API Parity**
- Task dueña: [`TASK-1754`](../../tasks/in-progress/TASK-1754-hiring-stage-vocabulary-collapse.md) (`in-progress`)
- Documento de lectura para el operador: <https://claude.ai/code/artifact/5b23dc9b-c027-40aa-bc68-84f965344fbb>

> ## ⚠️ Estado de verificación — LEER ANTES DE ACTUAR
>
> **Esta auditoría está EN VERIFICACIÓN ADVERSARIAL y no debe usarse todavía como base de una decisión irreversible.**
>
> El levantamiento se hizo con seis barridos automatizados en paralelo. **Al menos uno produjo un hallazgo falso de severidad P0**: reportó que el trigger de retención de `migrations/20260819072130586_…:891-906` clasificaba «por etapa» con `ELSE NULL`, cuando el predicado real es `NEW.stage = 'selected' OR NEW.decision = 'selected'`. **Citó sólo la primera rama de un `OR`** y convirtió un predicado defensivo en un riesgo de compliance inexistente. Se detectó al leer el SQL directo, no por el barrido.
>
> Ese error obliga a tratar **todo** el levantamiento como no confirmado hasta que cada afirmación load-bearing sea verificada leyendo el predicado completo y verbatim. El modo de fallo a cazar es específico: **citar parcialmente un predicado compuesto** (una rama de un `OR`, un `CASE` sin su `ELSE`, un `WHERE` sin su `AND`).
>
> Estado por hallazgo:
>
> | Hallazgo | Estado |
> |---|---|
> | H-01 | **Reescrito** tras verificación directa del SQL (§7.5) — la versión original era falsa |
> | H-03, H-04 (fairness / AI Act) | en verificación adversarial |
> | Veredicto «scoring IA indiferente» + digest del expediente | en verificación adversarial |
> | H-01 corregido, H-23, H-24, anatomía del cierre (§7) | en verificación adversarial |
> | H-14 (Full API Parity) + recuento de particiones | en verificación adversarial |
> | §3 (arqueología de autoría) | en verificación adversarial |
> | Resto | levantado por barrido, **sin verificación independiente** |
>
> **Regla de uso.** Esta auditoría documenta el estado observado el 2026-08-22. Además de la verificación pendiente, varios hallazgos son de estado (conteos, flags, qué está o no en producción) y caducan rápido; revalidar contra runtime antes de consumirlos.

---

## 1. Resumen ejecutivo

El dominio Hiring define **13 etapas** de postulación. El tablero que opera un reclutador ofrece **6 columnas**. Entre ambos vive un traductor implementado dentro de un componente React, que nunca fue declarado como contrato.

La auditoría partió de un síntoma acotado —una automatización de assessment que no disparaba— y encontró tres cosas de distinto orden de magnitud:

1. **El síntoma reportado es real y sigue vivo en producción.** La mitigación existe en `develop` desde el 2026-08-20 y **no ha llegado a `main`**.
2. **El defecto no es el traductor: es que hay catorce traductores.** El mismo enum está particionado a mano en 14 lugares distintos, ninguno derivado de otro. Colapsar 13→6 sin resolver eso sólo reduce cuántos literales hay que editar a mano en catorce sitios.
3. **El vocabulario de etapas no tiene ADR.** Nació sin decisión registrada: la task que creó el enum no menciona la palabra `stage` ni una sola vez. La única entrada del índice de decisiones que nombra estas etapas es la del **patrón §9**, es decir, el ADR del *incidente*, no el del diseño.

El hallazgo que explica por qué esto sobrevivió seis semanas sin detección es de método, no de código, y está en §3.

**Y falta un eje.** `stage` carga hoy dos preguntas —*dónde está en el proceso* y *cómo terminó respecto de la persona*— cuando la segunda ya tiene campo propio (`decision`). Las cuatro etapas terminales «reales» son espejo redundante de ese campo; `handoff_ready` pertenece a otro agregado y nadie lo escribe; y **`closed` no significa nada: ninguna decisión lo produce**. Lo que el dominio no puede expresar es la tercera pregunta —*por qué terminó, si no fue por la persona*— y es justo la que `TASK-1762` necesita. Anatomía completa en §7.

**Qué NO se rompe:** el subsistema de **scoring de assessment con IA es indiferente** al colapso. Es el único subsistema grande del dominio que no toca la etapa. Y el colapso terminal es **más seguro de lo que parecía**: cinco de los seis consumidores relevantes ramifican por `stage OR decision`, no por etapa sola (§7.5).

**Qué sí requiere decisión humana antes de tocar nada:** cinco preguntas, en §10. Dos de ellas —el corpus histórico de evidencia de fairness y la semántica de `closed`— **no tienen remediación después del hecho**.

---

## 2. Alcance y método

### Lo que se auditó

| # | Frente | Cobertura |
|---|---|---|
| 1 | Consumers de `stage` en runtime | `src/`, `services/`, `scripts/`, `migrations/` — incluyendo SQL embebido en TS, VIEWs, triggers plpgsql y projections reactivas |
| 2 | Assessment AI Scoring Run + Evaluation Dossier | aggregate, risk router, packet, digests, prompts versionados, evidencia persistida |
| 3 | VIEW de fairness, procedencia de datos, retención | escaleras de rango, k-anonimato, `data_origin`, relojes de retención |
| 4 | Comunicación al candidato, policy/ledger de asignación, recuperación de acceso, write path | allowlists, CHECKs, claves de idempotencia, guardas terminales |
| 5 | Superficies y contratos programáticos | UI, API HTTP, App API/MCP, Nexa — con matriz de paridad |
| 6 | Tasks vivas y doctrina | colisiones de archivo, dependencias semánticas, patrón §9, existencia de ADR |

### Lo que NO se auditó

- El **contenido** de las políticas de assessment (qué plantilla corresponde a qué vacante). Task aparte, declarada fuera de alcance por `TASK-1754`.
- El diseño visual del tablero más allá de qué columnas existen y cómo se llaman.
- BigQuery aguas abajo del espejo de `outbox_events`.
- Las etapas de `hiring_talent_demand` (enum **distinto**, ver H-19).

### Método de verificación

Cada afirmación de esta auditoría es de uno de tres tipos, marcado explícitamente donde importa:

- **Verificado contra runtime** — leído de Cloud SQL o del log de eventos el 2026-08-22.
- **Verificado contra código** — leído del árbol en `develop`, con `archivo:línea`.
- **Derivado** — conclusión de composición; se declara el razonamiento.

---

## 3. Hallazgo raíz — la verificación correcta con la pregunta equivocada

**Verificado contra runtime.** Autoría histórica de cada escritura de etapa, reconstruida de `hiring.application.stage_changed`:

| Etapa escrita | Humano | Agente E2E | Script (actor `null`) |
|---|---|---|---|
| `qualified` | **10** | 0 | 0 |
| `shortlisted` | **0** | 5 | 1 |
| `screening` | 6 | 6 | 0 |
| `interview` | 3 | 0 | 0 |
| `sourced` | 5 | 0 | 0 |

**Ningún operador escribió jamás `shortlisted`.** Las 6 escrituras que existen salieron de `scripts/hiring/_sanity-task1689-lifecycle-emails-e2e.ts:68` (1, con actor nulo) y de la persona agente `user-agent-e2e-001` (5). Los 10 movimientos humanos a la columna «Evaluación» cayeron **todos** en `qualified`.

El 2026-08-17, el commit `cff96f16b` fijó `shortlisted` como etapa canónica del disparador de assessment. **Ese commit sí verificó contra la base de datos** — su mensaje cita «9 shortlisted» y concluye que la etapa se usaba. La verificación fue real; la conclusión, falsa.

> **La pregunta era «¿hay filas con este valor?» cuando debía ser «¿puede un operador escribir este valor desde la superficie que usa?».** Las filas existían porque las habían puesto robots.

**Regla que se deriva, y que excede a Hiring:** al atar una automatización a un valor de estado, la evidencia válida es la **autoría** de las escrituras, no su existencia. Si hay log append-only, agrupar por actor antes de concluir. Si no lo hay, derivar la alcanzabilidad del **contrato de la superficie**, nunca del contenido de la tabla.

---

## 4. Arqueología — cuándo se desvió

**Verificado contra `git` y runtime.**

| Fecha | Evento | Consecuencia |
|---|---|---|
| 2026-07-07 | `TASK-353` crea el `CHECK` de 13 etapas (`migrations/20260707235655376_…:152-155`) | Sin ADR. La spec de la task no menciona `stage`. |
| 2026-07-09 | `559f5654b` (`TASK-355`) crea el tablero de 6 columnas | **El carril «Evaluación» nace con `titleStage: 'shortlisted'` y `destination: 'qualified'`** — el defecto está en la primera versión del archivo. El wireframe afirma `columnas = etapas canónicas` (`docs/ui/wireframes/TASK-355-hiring-desk.md:71`) y llama «Assessment» a esa columna: un tercer nombre. |
| 2026-07-10 | Primer movimiento humano a «Evaluación» → `qualified` | Sin consecuencia: nada automático miraba la etapa. |
| 2026-08-12 | `TASK-1689` ata el correo de avance a `shortlisted` | Primera dependencia automática. Mismo día, el script de sanity escribe la primera fila de la historia en esa etapa. |
| 2026-08-16 | El agente E2E escribe 5 filas más en `shortlisted` | La etapa «parece» viva desde afuera. |
| 2026-08-17 | `cff96f16b` fija `shortlisted` como trigger canónico | Doctrina de selección **correcta**; movió el disparador desde `interview` —la única alcanzable— a la que nunca lo fue. |
| 2026-08-19 | 10 políticas configuradas ese día, todas en `shortlisted`. Dos postulaciones reales cruzan «Evaluación» sin recibir prueba. | Detección. Patrón §9 canonizado el mismo día a partir de este caso. |
| 2026-08-20 | Slice 0 (`4e1566d9a`): el carril escribe `shortlisted` | Mitigación. Ese mismo día, 5 movimientos humanos más caen en `qualified`. |
| 2026-08-22 | **`4e1566d9a` no es ancestro de `origin/main`** | En producción, mover a «Evaluación» sigue escribiendo `qualified`. |

**Estado en base 2026-08-22 (verificado contra runtime):** `sourced` 31 · `closed` 32 (todas `smoke_test`) · **`qualified` 7** · `screening` 5 · `shortlisted` 4 · `interview` 3 · `rejected` 1 · `client_review` **0**. **15 políticas de assessment, las 15 en `shortlisted`** (12 `on_stage_entry`/`enabled`, 2 `on_stage_entry`/`disabled`, 1 `manual`/`enabled`). Ledger: 20 filas `shortlisted` (6 `assigned`, 10 `cancelled`, 4 `blocked`) + 3 `manual`.

---

## 5. El defecto estructural — catorce particiones sin binding

**Verificado contra código.** El mismo enum está particionado a mano en 14 lugares. Ninguno se deriva de otro; ninguno tiene test de paridad con otro.

| # | Partición | Contenido | Copias |
|---|---|---|---|
| 1 | Dominio | las 13 | `src/types/hiring.ts:109-123` + `CHECK` en `migrations/20260707235655376_…:152-155` |
| 2 | Carriles del tablero | 6 | `PipelineDeskView.tsx:69-84` + **copia sin test** en `DemandDeskView.tsx:352` |
| 3 | Etiquetas visibles | 6 para 13 claves | `copy/dictionaries/es-CL/hiringDesk.ts:93-107` (`en-US` hereda por spread → muestra castellano) |
| 4 | Trigger de policy | `shortlisted, interview` | `types/hiring-assessment-policy.ts:42` + `CHECK` en `migrations/20260817094924247_…:32` |
| 5 | Trigger de ledger | `+ manual` | `types/hiring-assessment-policy.ts:104` + `CHECK` en `migrations/20260817100030803_…:27` |
| 6 | Aguas abajo del trigger | 2 listas | `assignment-policy/readers.ts:196-199` + **espejo manual en SQL** en `reliability/queries/hiring-assessment-assignment-signals.ts:81-100` |
| 7 | Terminales de acceso | 5 (**omite `backup` y `decision_pending`**) | **6 copias**: `assessment/instances.ts:190` · `public-session/store.ts:11` · `access-recovery/vocabulary.ts:93` · `migrations/20260819072130586_…:362, :631, :725` (plpgsql) |
| 8 | «No activa» (desk) | `rejected, withdrawn, closed` | `desk.ts:104` |
| 9 | «No activa» (talent pool) | mismo set, copia aparte | `talent-pool/projection.ts:24,29,41,44,83` · `commands.ts:272` · `DemandDeskView.tsx:348` |
| 10 | Decision-owned | `selected, backup, rejected, withdrawn` | `store.ts:1311` |
| 11 | Decisión → etapa | 5 | `decide.ts:27-33` |
| 12 | Candidate-facing | `shortlisted, interview` | `notifications/stage-policy.ts:14-17` |
| 13 | Reportables de fairness | 7 | `assessment/fairness/contracts.ts:1-9` |
| 14 | Escaleras de rango | 3 escaleras × 7-8 | `migrations/20260713173500000_…:72-79, :86-95, :110-121` (duplicadas a su vez en la migración previa) |

**Escrituras de `stage`: 5 caminos** (+2 indirectos). `store.ts:1244` (INSERT) · `store.ts:1322` (PATCH canónico, único que emite `stage_changed`) · `decide.ts:241` (5 etapas, emite `decided`) · `data-origin/purge.ts:173` (`closed`, **sin evento**) · el `DEFAULT 'sourced'` del schema.

**Consecuencia de contrato:** `hiring.application.stage_changed` **no es el log completo de movimientos de etapa**. Ninguna migración futura puede derivar historia de etapas del outbox.

---

## 6. Radio de impacto por subsistema

| Subsistema | Veredicto | Por qué |
|---|---|---|
| **Assessment AI Scoring Run** | **Indiferente** | No persiste etapa, no ramifica por etapa, el packet no lleva journey, la elegibilidad no hace JOIN a `hiring_application`, el gold set estratifica por competencia × banda. El `input_digest` no se mueve. |
| **Evaluation Dossier** | **Inconsistente, no roto — pero invalida todos los digests** | `journey.currentStage` entra al material del `input_digest` (`dossier-ai/packet.ts:235-256`): cambiar el vocabulario cambia el digest de **toda** postulación, el índice de propuesta activa deja de matchear, y toda propuesta `proposed` queda huérfana + se re-llama al proveedor. |
| **Assessment no-IA (policy + ledger + boundary)** | **Lo rompe, duro** | 2 `CHECK` de DB, `assertEnum` **en el camino de lectura**, `trigger_stage` en la clave de idempotencia e irreescribible por diseño. |
| **Fairness / AI Act** | **Lo rompe en silencio, y es irreversible** | Dos `ELSE 0` + memoria histórica en payloads inmutables + corpus de evidencia append-only. |
| **Retención de PII** | **Lo rompe en silencio** | **Dos** relojes de retención con claves distintas, ambos afectados por el colapso terminal. |
| **Talent Pool** | **Lo rompe en silencio** | 6 predicados de «activa» que deciden quién entra/sale del pool. |
| **Procedencia de datos** | **Efecto colateral declarable** | El trigger no tiene cláusula `OF <columnas>`: un backfill masivo de `stage` recalcula `data_origin` en cada fila. |
| **Nexa** | **No participa** | Sin tool ni acción gobernada de hiring. |

---

## 7. Anatomía del cierre — qué es realmente cada etapa terminal

La columna «Cerrado» agrupa seis etapas, pero **no son seis cosas del mismo tipo**. Son tres tipos distintos bajo una etiqueta, y uno de los tres no significa nada.

### 7.1 Los tres tipos

| Tipo | Etapas | Qué es | Quién la escribe | ¿Aporta información que `decision` no tenga? |
|---|---|---|---|---|
| **A — proyección de la decisión** | `selected` · `backup` · `rejected` · `withdrawn` | `decide.ts:241` escribe `decision` y `stage` **en la misma transacción**, con valores equivalentes. La etapa es un espejo redundante del desenlace. | comando `decide` | **No. Ninguno.** |
| **B — estado operativo post-decisión** | `handoff_ready` | «Seleccionado y listo para el traspaso a Workforce». No es un estado del proceso de selección: es un estado del **handoff**, que es un agregado aguas abajo con vida propia (`src/lib/hiring/handoff/**`). | **nadie** | n/a — literal muerto |
| **C — sin desenlace** | `closed` | **Nada.** No existe ninguna decisión que lo produzca; no está en el mapa `DECISION_STAGE`. | la columna «Cerrado» del tablero (`destination: 'closed'`) y `data-origin/purge.ts:173` | n/a — no hay decisión que espejar |

**El mapa completo decisión → etapa** (`decide.ts:27-33`), que es el contrato real del cierre:

```
selected        → selected
backup_selected → backup
rejected        → rejected
withdrawn       → withdrawn
on_hold         → decision_pending      ← no es terminal: vuelve al paso 5
```

`closed` y `handoff_ready` **no aparecen**. Son las dos únicas etapas del carril que ninguna decisión produce.

### 7.2 Qué significa cada una, con precisión

| Etapa | Significado real | Quién decidió | Consecuencia downstream |
|---|---|---|---|
| `selected` | Efeonce eligió a la persona. | Efeonce | Traspaso a Workforce; retención `workforce_record` **sin expiración**; excluida del vencimiento de documentos (`was_hired`) |
| `backup` | Efeonce la eligió **como reserva**. No es un rechazo ni una contratación. | Efeonce | Tratada como contratada para documentos (`was_hired` incluye `backup_selected`), pero **cae al `ELSE` de la escalera de recuperación** — ver H-23 |
| `rejected` | Efeonce **juzgó a la persona** y la descartó. | Efeonce | Correo de rechazo; reloj de retención +12 meses |
| `withdrawn` | **La persona se retiró.** No hay juicio de Efeonce. | el candidato | Mismo tratamiento de retención que `rejected` (+12 meses), aunque la causa es opuesta |
| `handoff_ready` | Post-selección, listo para traspaso. | — | **Nadie lo escribe.** Pertenece conceptualmente al agregado `handoff`, no a `stage` |
| `closed` | **Indefinido.** | — | Sin decisión ⇒ congela ambos relojes de retención (H-01) |
| `decision_pending` | Doble sentido: «aún no decidido» (paso 5) **y** «decidido = `on_hold`». | ambos | El desk cuenta las dos poblaciones juntas (H-17) |

### 7.3 Verificado: la columna «Cerrado» nunca se disparó sobre una persona real

**Verificado contra runtime, 2026-08-22:**

| etapa | decisión | procedencia | filas |
|---|---|---|---|
| `closed` | **sin decisión** | `smoke_test` | 32 |
| `rejected` | `rejected` | `real` | **1** |

**Cero postulaciones reales han estado jamás en `closed`.** Las 32 son sintéticas, escritas por `purge.ts:173`. El log de eventos no registra **ninguna** escritura de `closed` por el PATCH — ningún operador arrastró jamás una tarjeta real a esa columna. La única terminal real del sistema entero es esa `rejected`, y sí tiene su decisión.

> La columna «Cerrado» es un arma cargada que nunca se disparó. **Eso es lo que mantiene abierta la decisión Q2: no hay filas reales que migrar.** Deja de estar abierta el día que alguien suelte la primera tarjeta real ahí.

### 7.4 El eje que falta

`stage` está cargando hoy **dos preguntas distintas**, y no tiene dónde poner una tercera:

1. **¿Dónde está en el proceso?** — la posición en el embudo. Es lo que `stage` debería ser, y sólo es en las 6 no terminales.
2. **¿Cómo terminó respecto de la persona?** — ya existe como campo propio: `decision`. Las 4 etapas de tipo A son duplicación de esto, no información adicional.
3. **¿Por qué terminó, si no fue por la persona?** — **no existe.** Vacante cancelada, cupo lleno, proceso abandonado, oferta declinada por presupuesto.

La tercera es un hueco genuino del dominio, y no es teórico: **`TASK-1762` (cierre de vacante por capacidad) lo necesita**. Hoy la única salida disponible para «esto terminó y no fue por ti» es `rejected` — que es un juicio sobre la persona, dispara correo de rechazo y arranca su reloj de retención. Usar `rejected` para un cierre por capacidad **le atribuye a la persona una causa falsa**, que es exactamente lo que el patrón §9 prohíbe en su corolario 2.

`closed` está intentando ser tres cosas incompatibles a la vez: **archivado** (lo que hace el purge: el *registro* sale de circulación), **terminó** (lo que escribe el tablero: un terminal sin desenlace, que es el bug), y **cierre sin juicio sobre la persona** (el hueco que falta). Q2 no es «¿qué significa `closed`?» sino **«¿cuántos ejes hay?»**.

### 7.5 Revisión de la premisa de `TASK-1754`

El wireframe afirma que «Cerrado» colapsa **sin pérdida** porque `decision` sobrevive como campo aparte. **La auditoría verificó la premisa consumidor por consumidor y en general se sostiene** — mejor de lo que una lectura superficial sugiere:

| Consumidor | Llave | ¿El colapso terminal lo rompe? |
|---|---|---|
| `documents/retention.ts:57-98` | `decision` únicamente; **la palabra `stage` no aparece** | **No** |
| Trigger de retención de recuperación (`…1746…:891-906`) | `NEW.stage = 'selected' OR NEW.decision = 'selected'` … | **No** — es defensivo en ambos ejes |
| Función de purga de recuperación (`…1746…:998-1000`) | `application_stage IN (…) OR application_decision IN (…)` | **No** — ídem |
| `TERMINAL_APPLICATION_STAGES` (6 copias) | `applicationDecision \|\| stage ∈ set` | **No** — `closed` ya está en el set |
| Escalera de fairness histórica | evento `decided` con `decision='selected'` → rango 7 | **No** para `selected` |
| **`desk.ts:104` · `talent-pool/projection.ts` · `DemandDeskView.tsx:348`** | **`stage` únicamente** (`NOT IN rejected/withdrawn/closed`) | **Sí — cambia de comportamiento**, ver H-24 |

**Corrección al hallazgo H-01 tal como se publicó inicialmente:** una lectura preliminar reportó que el trigger de retención clasificaba **sólo** por `stage` y que el colapso lo llevaría al `ELSE NULL`. **Es incorrecto.** El predicado real es `stage OR decision` en los tres puntos. El riesgo de retención no viene del colapso: viene de (a) `closed` **sin ninguna decisión** — H-02 — y de (b) una omisión preexistente en la escalera — H-23. H-01 quedó reescrito abajo con el predicado verbatim.

---

## 8. Hallazgos

Severidad: **P0** = daño a persona real, irreversible o de compliance · **P1** = fallo silencioso con daño operativo · **P2** = incoherencia estructural sin daño hoy · **P3** = higiene.

### P0 — daño irreversible o de compliance

**H-01 · Una postulación cerrada sin decisión congela la retención de PII de la persona entera.** *(Verificado contra código. **Reescrito** — ver §7.5 para la corrección de la lectura preliminar.)*

Hay **dos relojes de retención independientes**, sobre objetos distintos, y ninguno sabe del otro:

| Reloj | Qué retiene | Llave | Archivo |
|---|---|---|---|
| 1 | documentos del candidato (CV, portafolio) | **`decision` únicamente**; la palabra `stage` no aparece en el archivo | `documents/retention.ts:57-98` |
| 2 | recibos de recuperación de acceso al test | `stage` **OR** `decision` | trigger en `migrations/20260819072130586_…:891-906` |

El predicado verbatim del reloj 2 —defensivo en ambos ejes, y por eso **el colapso terminal no lo rompe**:

```sql
retention_expires_at = CASE
  WHEN retention_class = 'workforce_record' OR NEW.stage = 'selected' OR NEW.decision = 'selected' THEN NULL
  WHEN NEW.stage IN ('rejected','withdrawn') OR NEW.decision IN ('rejected','withdrawn')
    THEN COALESCE(NEW.decision_at, NOW()) + INTERVAL '12 months'
  ELSE NULL
END
```

**El daño no viene del colapso: viene de cerrar sin decisión.** Una postulación en `closed` con `decision IS NULL` (lo que hoy escriben la columna «Cerrado» del tablero y `purge.ts:173`):

1. cae al `ELSE` del reloj 2 → `retention_expires_at = NULL` → el recibo **no expira nunca**;
2. no entra al universo del reloj 1 (falla el `WHERE ha.decision IS NOT NULL` de `:69`), así que nunca aporta un `closed_at` que pueda vencer;
3. y **satisface el `NOT EXISTS` de `:90-94` como si fuera un proceso vivo**. Como ese join es por `identity_profile_id`, **una sola postulación `closed` sin decisión bloquea indefinidamente el borrado de los documentos de esa persona en TODAS sus demás postulaciones**, aunque todas estén decididas y vencidas hace años.

El fallo es silencioso por construcción: la fila simplemente no aparece en el signal. Contra la ventana de 12 meses de la Ley 21.719 declarada en `retention.ts:5-27`.
*Sin dueño. Precondición de `TASK-1744`. Consecuencia directa de H-02.*

**H-02 · La puerta de `closed` cierra a una persona sin decisión, sin correo, y le mata el test.** *(Verificado contra código.)*
El guard del PATCH bloquea 4 etapas (`store.ts:1311`) y **deja pasar 9**, incluidas `handoff_ready` y `closed` — que es justo lo que escribe el carril «Cerrado» (`PipelineDeskView.tsx:83`). Arrastrar una tarjeta ahí:
- no emite `hiring.application.decided` → sin correo de decisión;
- deja `decision` en NULL → congela el reloj de retención (H-01);
- **mata el acceso al test**: las 6 guardas terminales responden «cerrada»;
- el consumer de comunicación responde `no-op: etapa no candidate-facing` (`send.ts:285`) → silencio en los tres frentes a la vez.

*Sin dueño. Precondición dura de `TASK-1744`, `TASK-1748` y `TASK-1762`, y declarada `NUNCA`-antes por `TASK-1754`.*

**H-03 · La escalera histórica de fairness es una tabla de traducción permanente, no un espejo del vocabulario vigente.** *(Verificado contra código; conclusión derivada.)*
`migrations/20260713173500000_…:86-95` reconstruye el máximo avance leyendo `outbox_events` histórico, con `ELSE 0`. Para toda postulación terminal, la escalera de estado vigente (`:110-121`) **ya** cae en `ELSE 0` — así que la rama histórica es **la única memoria de hasta dónde llegó un candidato rechazado**, que es exactamente la población que mide el adverse impact. Los payloads históricos son inmutables.

> Si el colapso retira `qualified`/`client_review` de ese `CASE`, todo rechazado cuyo avance máximo fue una de esas dos cae a rango 0 **sin error ni señal**, `advanced_count` se desinfla, y el ratio 4/5 reporta «sin impacto adverso» sobre datos mutilados — con evidencia AI-Act append-only firmando el resultado falso.

**Esa escalera debe conservar los literales viejos mapeados al rango nuevo para siempre, aunque el `CHECK` ya no los admita.**
*Sin dueño.*

**H-04 · Divulgación por diferenciación entre versiones del esquema, contra un corpus imposible de borrar.** *(Derivado, con base verificada.)*
El `HAVING COUNT(DISTINCT …) >= 10` (`…:154`) protege el **denominador**, que no depende de la etapa (`stage_targets` entra por `CROSS JOIN`). Colapsar **no** cambia qué cohortes se exponen. Pero el **numerador** `advanced_count` no tiene protección k alguna, y `greenhouse_hr.assessment_fairness_evidence` persiste los reportes completos en `result_json` y es append-only por trigger con `RAISE EXCEPTION` en UPDATE **y** en DELETE.

Restar un snapshot pre-colapso de uno post-colapso para la misma cohorte revela el conteo exacto de individuos que estaban en `qualified`/`client_review`, desagregado por categoría demográfica autodeclarada — **sin que ningún snapshot haya violado k=10 jamás**. El gate es por-consulta; no es composicional. **No hay remediación posible después del hecho.**
*Sin dueño. Decisión requerida antes de tocar la VIEW.*

### P1 — fallo silencioso con daño operativo

**H-05 · `assertEnum` en el camino de LECTURA bloquea el contract del enum.** *(Verificado contra código.)*
`assignment-policy/store.ts:106-109` y `assignment-store.ts:82` validan `trigger_stage` al **releer**. Retirar un literal del enum no falla al escribir: **revienta con 500 al releer una policy o un assignment histórico** que lo nombre. Y esas filas son irreescribibles: el `GRANT UPDATE` del ledger excluye `trigger_stage` (`migrations/20260817100030803_…:63-65`) y no hay DELETE. Hoy ninguna fila nombra `qualified`/`client_review` en esa columna, pero el patrón muerde a la primera.

**H-06 · `on_stage_entry` no detecta entrada a etapa: detecta permanencia.** *(Verificado contra código.)*
`assign.ts:424` compara `application.stage !== triggerStage` contra el snapshot vigente y resuelve `stale`. El evento sólo despierta al consumer. **Quien cruzó `shortlisted` y ya está en `interview` cuando el worker drena nunca recibe su test**, y nadie registra la transición.

**H-07 · La señal de fiabilidad se va a cero justo cuando el sistema deja de funcionar.** *(Verificado contra código.)*
`reliability/queries/hiring-assessment-assignment-signals.ts:85` compara `app.stage = p.trigger_stage`. Si los dos vocabularios divergen, la señal marca 0 — **indistinguible de «sano»**. Es un espejo manual del predicado de `readers.ts:157-176`, sin test que los ate; el propio comentario lo admite.

**H-08 · Tres definiciones distintas de «postulación activa», no reconciliadas.** *(Verificado contra código.)*

| Quién | Considera cerrado | Efecto |
|---|---|---|
| Recuperación de acceso + sesión pública | `selected, rejected, withdrawn, handoff_ready, closed` | mata el test |
| Hiring Desk (`desk.ts:104`) | `rejected, withdrawn, closed` | cuenta `selected` y `handoff_ready` como **activas** |
| Talent Pool (`projection.ts`, 5 sitios) | mismo set, copia aparte | decide quién entra al pool |

**El mismo candidato puede estar «activo» en el tablero y «cerrado» para su prueba, al mismo tiempo.** El KPI de «postulaciones activas» cambiará de valor en silencio con el colapso terminal.

**H-09 · Las 6 copias de la lista terminal omiten `backup` y `decision_pending`.** *(Verificado contra código.)*
Coinciden literal por literal hoy, pero `decide.ts:29` escribe `backup`. Lo que salva la red es el `OR applicationDecision` de `vocabulary.ts:112`: la protección la sostiene `decision`, no la etapa. Es acoplamiento implícito, no documentado en ninguna de las seis. **Tres de las seis viven dentro de funciones plpgsql** — invisibles a cualquier refactor de TypeScript y sólo modificables por migración nueva.

**H-10 · El carril programático acepta texto libre y responde `200 {items: []}`.** *(Verificado contra código.)*
`app-hiring-candidate-review.ts:206` → `candidate-review/readers.ts:97` (`stage as never`). Sin validación contra el enum. Mismo problema en `GET /api/hiring/applications` (`route.ts:46`, cast) y en el filtro genérico (`store.ts:658-660`). **El fixture de test del propio lane usa `stage: 'assessment'`, que no existe en el enum.**

**H-11 · La cola humana de triggers perdidos se vacía sin señal.** *(Verificado contra código.)*
`STAGES_DOWNSTREAM_OF_TRIGGER` (`readers.ts:196-199`) está tipado sólo del lado de la llave; el valor es `readonly string[]`, así que fusionar o renombrar una etapa downstream **no rompe el build**. Además **omite `closed`**, que sí es alcanzable con `decision IS NULL` (vía PATCH y vía `purge.ts:173`): una postulación archivada a `closed` que se perdió su trigger no aparece **ni** en la reconciliación automática **ni** en la cola humana. Cae en un hueco.

**H-12 · Colapsar «Evaluación» ensancha quién recibe correo y trabajo no pagado.** *(Derivado.)*
Al absorber `qualified` dentro de `shortlisted`, más población entra a la etapa que dispara. Con `mode: on_stage_entry` por defecto, eso significa **mandar trabajo no pagado a todo el que pase screening** — lo que invalida el argumento de equidad con que se justificó `shortlisted` como etapa canónica (`types/hiring-assessment-policy.ts:19-42`). Ese comentario de doctrina queda **falso** tras el colapso y debe reescribirse en el mismo cambio.

**H-13 · Más entradas a la etapa que dispara = más cupos quemados irrecuperables.** *(Derivado, con base verificada.)*
El ledger tiene hoy 4 filas `blocked` sobre 20. `trigger_stage` participa de la clave de idempotencia y es irreescribible. `TASK-1755` (callejón sin salida del ledger) **debe ir antes o en paralelo, nunca después**: si el colapso llega primero, cada política mal configurada quema un cupo para siempre.

**H-23 · La escalera de retención enumera 3 de las 5 decisiones. `backup_selected` y `on_hold` caen al `ELSE NULL`, hoy.** *(Verificado contra código. Trampa armada, nunca disparada.)*
El reloj 2 (ver H-01) resuelve por `selected` / `rejected` / `withdrawn` en ambos ejes, y **omite `backup_selected` y `on_hold`** en los dos. Una persona marcada como reserva, o cuya decisión se puso en pausa, obtiene `retention_expires_at = NULL`: su recibo de recuperación **no expira nunca**.
Esto **no es consecuencia del colapso** — está vivo desde que existe el trigger. Hoy no ha hecho daño porque **hay 0 filas con esas dos decisiones** (verificado contra runtime: la única decisión registrada en todo el sistema es 1 `rejected`). Se dispara con la primera reserva real.
Nota de asimetría: el reloj 1 **sí** contempla `backup_selected` — lo trata como contratado (`was_hired`, `retention.ts:65`). Los dos relojes discrepan sobre qué es una reserva.
*Sin dueño.*

**H-24 · El colapso terminal cambia en silencio quién cuenta como «activo» y quién entra al Talent Pool.** *(Derivado, con base verificada.)*
Tres predicados clave por **`stage` únicamente** — `desk.ts:104`, `talent-pool/projection.ts` (5 sitios) + `commands.ts:272`, `DemandDeskView.tsx:348` — definen «activa» como `stage NOT IN ('rejected','withdrawn','closed')`. Hoy eso cuenta a `selected`, `backup` y `handoff_ready` **como activas**, y por lo tanto las mantiene **fuera** del Talent Pool.
Si las 5 terminales colapsan a `closed`, esas tres poblaciones pasan a «no activas» de golpe: el KPI de postulaciones activas cambia de valor y **personas ya seleccionadas se vuelven elegibles para el pool**. Es discutiblemente una corrección —una persona seleccionada no debería contar como proceso activo— pero **es un cambio de comportamiento sobre datos de personas reales, y debe decidirse, no descubrirse**. Son los únicos consumidores encontrados que ramifican por etapa terminal sin mirar `decision`.
*Sin dueño. Depende de Q3.*

### P2 — incoherencia estructural

**H-14 · Full API Parity: no se cumple.** *(Verificado contra código; conclusión derivada.)*
El primitive de escritura física existe (`updateHiringApplicationStage`) y eso es lo que enmascara el problema. **El primitive del paso operativo no existe:** la regla «paso del pipeline → literal de etapa» vive dentro de `LANES` (`PipelineDeskView.tsx:69-84`), exportada sólo para su propio test. Evidencia:
- el invariante que cerró el incidente del 2026-08-19 es un test de **componente de vista**; el PATCH no lo hereda y sigue aceptando los tres literales del carril;
- el campo tiene tipo distinto según el lane: `HiringApplicationStage` en el PATCH, `string` en App/MCP — **el contrato programático es más débil que el de la UI**, exactamente al revés de lo que el principio exige;
- no existe capability que exprese «avanzar a Evaluación», sólo «escribir una de nueve etapas».

Alcance de escritura por consumer: tablero **6/13** · PATCH **9/13** · `decide` **5/13** · App API/MCP **0/13** · Nexa **0/13**.

**H-15 · El Evaluation Dossier deja prosa append-only nombrando etapas muertas.** *(Verificado contra código.)*
`dossier-ai/generate.ts:180-181` interpola `currentStage` crudo en el prompt de usuario, y el system prompt sólo prohíbe snake_case para **competencias**; el sanitizer de display (`display.ts:35-63`) sólo traduce competencias. Una nota confirmada puede decir «actualmente en `client_review`» para siempre, en `hiring_application_note` que es **append-only por trigger de DB**. No rompe al releerla: queda inconsistente, corregible sólo con una nota nueva que la supersede.

**H-16 · `handoff_ready` es un literal muerto que gobierna decisiones.** *(Verificado contra código.)*
Ningún escritor lo produce jamás, pero aparece en 4 listas de decisión, incluida la terminal.

**H-17 · `decision_pending` significa dos cosas.** *(Verificado contra código.)*
Es el paso 5 del tablero («aún no decidido») **y** el resultado de `on_hold` («ya decidido, en pausa», `decide.ts:32`). `DemandDeskView.tsx:355` los cuenta juntos.

**H-18 · `laneForStage` cae a `inbox` con `?? 'inbox'`.** *(Verificado contra código.)*
`PipelineDeskView.tsx:86-87`. Una etapa desconocida aparece silenciosamente en la primera columna. Y `Application360View.tsx:1783,1844` produce label `undefined` si la clave falta en el diccionario — posible porque `copy/types.ts:544` tipa `stages` como `Record<string,string>`.

### P3 — higiene

**H-19 · `qualified` es también un estado de `hiring_talent_demand`, en el mismo dominio.** *(Verificado contra código.)* `src/types/hiring.ts:40`. Un grep ciego los mezcla. Mina para cualquier migración. Fuera de Hiring, `qualified` colisiona además con `commercial` e ICO.

**H-20 · El nombre del consumer en el log es el de la projection retirada.** *(Verificado contra código.)* El fan-in degrada llamando a `sendHiringStageAdvancedEmail`, que devuelve strings prefijados `hiring_stage_changed_email` (`send.ts:285-317`). Buscar en el log por el consumer real no encuentra los casos de degradación — que son justo los que uno investiga.

**H-21 · `en-US` muestra etiquetas en castellano.** *(Verificado contra código.)* `en-US/hiringDesk.ts:5` hace spread de es-CL y nunca redefine `stages`.

**H-22 · `data_origin` se recalcula en cada fila de un backfill de etapa.** *(Verificado contra código.)* El trigger `derive_hiring_application_data_origin` no tiene cláusula `OF <columnas>` (`migrations/20260818234308311_…:62-64`). Benigno (el `COALESCE` degrada hacia lo visible), pero un backfill masivo de `stage` es de facto un recálculo masivo de procedencia. Hay que declararlo, no descubrirlo.

---

## 9. Taxonomía de los modos de fallo

Los 22 hallazgos se agrupan en **tres modos**, y sólo uno de ellos es ruidoso:

1. **`ELSE`/default silencioso** — H-01 (`ELSE NULL`), H-03 (`ELSE 0`), H-18 (`?? 'inbox'`). Un literal desconocido no falla: **cae al valor menos alarmante**.
2. **Cero filas indistinguible de «no hay trabajo»** — H-07, H-10, H-11. Un filtro con literal inválido devuelve `200 {items: []}`, y la señal de salud marca sano.
3. **Ruptura fuerte (deseable)** — `CHECK` del schema (23514), `assertEnum` (422/500), tipos `Record<HiringApplicationStage, …>` en compile-time.

**La conclusión de diseño es que el modo 3 es el único aceptable, y hoy es minoría.** Toda partición nueva del enum debe nacer con ruptura fuerte: `satisfies readonly HiringApplicationStage[]`, `Record<HiringApplicationStage, …>` exhaustivo, y un test que **derive** los literales del `CHECK` real en vez de enumerarlos a mano.

---

## 10. Preguntas que necesitan decisión humana

| # | Pregunta | Por qué no la puede tomar un agente | ¿Reversible? |
|---|---|---|---|
| Q1 | ¿Qué pasa con el corpus histórico de `assessment_fairness_evidence` al cambiar la granularidad de etapas? (H-04) | Es una decisión de privacidad sobre datos demográficos autodeclarados, contra un corpus que **no se puede borrar ni corregir** | **No** |
| Q2 | ¿`closed` significa «terminó» o «archivado»? Hoy lo escriben dos caminos con semánticas distintas (tablero y `purge.ts`) y ninguno escribe `decision` (H-01, H-02) | Define el reloj de retención de PII de personas reales bajo Ley 21.719 | **No, una vez que hay filas reales** |
| Q3 | ¿El colapso terminal va, y en qué orden respecto de la puerta de `closed`? | Cambia el KPI de «activas», el talent pool y ambos relojes de retención | Parcialmente |
| Q4 | Con «Evaluación» ensanchada, ¿el default de la policy pasa a `manual`? (H-12) | Es una decisión de equidad: `on_stage_entry` sobre una etapa ancha manda trabajo no pagado a todo el que pase screening | Sí |
| Q5 | ¿Sube el Slice 0 a producción por separado, o espera al resto? | Hoy en producción el defecto sigue vivo y hay 7 postulaciones reales varadas | Sí |

**Ya decididas** (no reabrir): el identificador se queda en `shortlisted`, no se introduce `evaluation` (2026-08-20); el correo al candidato conserva **«Preselección»** como divergencia deliberada, a documentar con su razón (2026-08-22, operador).

---

## 11. Grafo de dependencias entre tasks vivas

**Colisiones de archivo.** El archivo caliente no es el enum: es **`hiringDesk.ts` (3 tasks: 1747, 1754, 1763)** y **`notifications/**` (5 tasks: 1719, 1746, 1754, 1757, 1762)**. `src/types/hiring.ts` no lo disputa nadie. `TASK-1747` está `in-progress` con sesión activa: **hay que serializar el archivo, no las tasks.**

**Cadena dura (no admite reorden):**

```
Slice 0 a producción  ──▶  puerta de `closed` (H-02)  ──▶  TASK-1744 / TASK-1748 / TASK-1762 ──▶ TASK-1763
                                    │
TASK-1755 (ledger)  ────────────────┤
                                    ▼
                         TASK-1754 expand → policy → copy → contract
                                    │
                                    ├──▶  rollout de TASK-1719 (flip del flag)
                                    └──▶  TASK-1603 ──▶ TASK-1721 ──▶ TASK-1720/1722 (EPIC-038 + MCP)
```

**Independientes, se pueden hacer en paralelo:** `TASK-1752` (señal de run), `TASK-1756` (expediente parcial), `TASK-1751` (reloj del assessment), `TASK-1757` (aviso de rotación), y el carril de identidad candidata `TASK-1727`/`1728`/`1731`.

**`TASK-1761` (bridge Entra) queda fuera de toda la cadena**: su regla dura la desacopla explícitamente de selección y etapas, y se ancla a los checkpoints de `TASK-1731`.

**Aviso:** las tasks de `EPIC-038` (`1603`-`1607`) declaran globs anchos `src/lib/hiring/**` y `migrations/**`. **Hay que acotarlos antes de arrancarlas** o pisan todo lo anterior.

---

## 12. El vocabulario de etapas no tiene ADR

**Verificado contra código y `git log -S`.**

- `DECISIONS_INDEX.md` no tiene ninguna fila que justifique el vocabulario de etapas. La única entrada que nombra `qualified`/`shortlisted`/`client_review` es la del **patrón §9** — el ADR del incidente, no el del diseño.
- `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md:928-941` lista las 13 etapas como viñetas planas, sin una línea de rationale. Más abajo (`:1481`) las describe como «`stage` (13-state)» y nada más.
- La lista entró al doc de arquitectura en `f57fc0c3d` (`TASK-315`) y el enum TS en `315389119` (`TASK-353`). **La spec de `TASK-353` no menciona la palabra `stage` ni una sola vez.**
- Los 13 ADR de Hiring que sí existen cubren assignment policy, access recovery, capacity closure, Entra, review packet y self-service. **Ninguno el vocabulario de etapas.**

**Consecuencia:** no hay decisión previa que respetar ni que superseder. El colapso no contradice ningún ADR — **crea el primero**. Debe salir como fila en `DECISIONS_INDEX.md`, no sólo como wireframe de una task.

---

## 13. Evidencia y reproducibilidad

| Qué | Cómo se obtuvo |
|---|---|
| Conteos por etapa, `CHECK` vigentes, políticas, ledger | `scripts/hiring/_sanity-task-1754-stage-readback.ts` contra Cloud SQL, 2026-08-22 |
| Autoría de cada escritura de etapa | Agregación por actor sobre `greenhouse_sync.outbox_events` filtrando `event_type='hiring.application.stage_changed'` (222.801 eventos; sin índice por `event_type`, seq scan de ~140 MB — aceptable para un diagnóstico puntual, **no** para runtime) |
| Fecha de nacimiento del traductor | `git show 559f5654b:src/views/greenhouse/hiring/PipelineDeskView.tsx` |
| Estado del Slice 0 en producción | `git merge-base --is-ancestor 4e1566d9a origin/main` → falso |
| Inventario de callsites, particiones y copias | 6 barridos exhaustivos de `src/`, `services/`, `scripts/`, `migrations/`, con verificación de colisiones de literal entre dominios |

**Limitación declarada:** el log de eventos **no** cubre las escrituras de `decide.ts` (5 etapas terminales) ni la de `purge.ts` (`closed`). La afirmación de §3 sobre autoría es válida porque todos los movimientos del tablero pasan por el PATCH, que sí emite. **Ninguna conclusión de esta auditoría sobre etapas terminales se apoya en el outbox.**

---

## Referencias

- Task dueña: [`TASK-1754`](../../tasks/in-progress/TASK-1754-hiring-stage-vocabulary-collapse.md)
- Patrón: [`GREENHOUSE_CANONICAL_PATTERNS_V1.md` §9](../../architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md)
- Arquitectura de dominio: [`GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)
- Principio: [`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`](../../architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md)
- Auditoría previa del dominio: [`GREENHOUSE_HIRING_QUALITY_ASSURANCE_AUDIT_2026-07-30.md`](GREENHOUSE_HIRING_QUALITY_ASSURANCE_AUDIT_2026-07-30.md)
