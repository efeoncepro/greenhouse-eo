# Greenhouse Hiring — Vocabulario de etapas del pipeline — Auditoría 2026-08-22

## Estado

- Tipo: auditoría de arquitectura de dominio y contrato operativo
- Fecha: 2026-08-22
- Scope: `greenhouse_hiring.hiring_application.stage` y **todo** su radio de consumo — dominio, tablero, automatización de assessment, comunicación al candidato, fairness/AI Act, retención de PII, carril programático (App API/MCP/Nexa), procedencia de datos y tasks vivas
- Método: 6 barridos exhaustivos de código en paralelo + lectura directa de Cloud SQL + arqueología de `git` y del log append-only de eventos
- Evidencia: repositorio en `develop` (`d8c58b964`), Cloud SQL `greenhouse-pg-dev` leído el 2026-08-22, `greenhouse_sync.outbox_events` (222.801 eventos)
- Verdict: **`structural_defect_confirmed` — el vocabulario de etapas no tiene dueño único. Cumple la letra del ADR de Full API Parity por su cláusula de deuda temporal documentada; incumple el patrón canónico §2 del repo, que no tiene cláusula de escape**
- Task dueña: [`TASK-1754`](../../tasks/in-progress/TASK-1754-hiring-stage-vocabulary-collapse.md) (`in-progress`)
- Documento de lectura para el operador: <https://claude.ai/code/artifact/5b23dc9b-c027-40aa-bc68-84f965344fbb>

> ## Estado de verificación — LEER ANTES DE ACTUAR
>
> **Verificación adversarial COMPLETA (2026-08-22).** El levantamiento inicial se hizo con seis barridos automatizados en paralelo; después, **cinco verificadores independientes con el encargo explícito de REFUTAR** revisaron cada afirmación load-bearing leyendo los predicados completos y verbatim.
>
> **Resultado: ninguna conclusión estructural cayó, pero cinco afirmaciones estaban sobredimensionadas y dos evidencias declaradas eran falsas.** El detalle está en cada hallazgo; el resumen:
>
> | Afirmación | Veredicto | Qué cambió |
> |---|---|---|
> | Scoring de assessment con IA es indiferente al colapso | **CONFIRMADO** | nada; se atacó por seis vectores indirectos sin éxito |
> | Predicado anti-anclaje y auto-propose indiferentes | **CONFIRMADO** | nada |
> | Validación asimétrica lectura/escritura (H-10) | **CONFIRMADO** | el route HTTP tampoco valida; no existe lane MCP de hiring |
> | Ninguna decisión produce `closed` ni `handoff_ready` (§7) | **CONFIRMADO** | el escritor no es el tablero: es el comando genérico |
> | Escalera de retención omite `backup`/`on_hold` (H-23) | **CONFIRMADO** | + `on_hold` es asimétrico en dirección contraria |
> | Impacto en el expediente (H-15) | **MATIZADO** | no invalida «todos» los digests, no deja huérfanas, no re-llama al proveedor |
> | Escalera histórica de fairness (H-03) | **MATIZADO** | el reporte por defecto es **inmune**; la dirección del sesgo no está determinada |
> | Divulgación por diferenciación (H-04) | **MATIZADO a la baja** | el daño ya está disponible sin ataque; no hay camino de lectura; remediación disponible |
> | Full API Parity (H-14) | **MATIZADO en forma, endurecido en fondo** | cumple la letra del ADR; incumple el patrón canónico §2 |
> | Arqueología de autoría (§3) | **MATIZADO** | la conclusión aguanta, **las dos cifras que la sostenían eran falsas** |
> | Recuento de 14 particiones (§5) | **CORREGIDO** | son 17; una cita era falsa y había un doble conteo |
>
> **Los tres modos de fallo detectados** — para quien audite este dominio después:
>
> 1. **Citar parcialmente un predicado compuesto.** Una rama de un `OR`, un `CASE` sin su `ELSE`, un `WHERE` sin su `AND`. Produjo un P0 falso sobre retención de PII.
> 2. **Verificar el EJE y no el CONJUNTO DE VALORES.** El predicado correcto sobre el campo correcto puede seguir omitiendo el valor que importa.
> 3. **Confiar en un log append-only sin verificar QUÉ camino lo emite.** El evento de creación escribe `stage` y **no emite `stage_changed`**; además omite el actor del payload. Una agregación por actor sobre ese log es ciega al camino dominante y mal-atribuye lo que sí ve.
>
> **Regla de uso.** Esta auditoría documenta el estado observado el 2026-08-22. Varios hallazgos son de estado (conteos, flags, qué está o no en producción) y caducan rápido; revalidar contra runtime antes de consumirlos.

---

## 1. Resumen ejecutivo

El dominio Hiring define **13 etapas** de postulación. El tablero que opera un reclutador ofrece **6 columnas**. Entre ambos vive un traductor implementado dentro de un componente React, que nunca fue declarado como contrato.

La auditoría partió de un síntoma acotado —una automatización de assessment que no disparaba— y encontró tres cosas de distinto orden de magnitud:

1. **El síntoma reportado es real y sigue vivo en producción.** La mitigación existe en `develop` desde el 2026-08-20 y **no ha llegado a `main`**.
2. **El defecto no es el traductor: es que hay diecisiete.** El mismo enum está particionado en 17 lugares con semántica propia, materializados en 40+ sitios literales. **Cuatro** tienen binding compile-time y **una** tiene test de paridad — el resto, ninguno. Colapsar 13→6 sin resolver eso sólo reduce cuántos literales hay que editar a mano en diecisiete sitios.
3. **El vocabulario de etapas no tiene ADR.** Nació sin decisión registrada: la task que creó el enum no menciona la palabra `stage` ni una sola vez. La única entrada del índice de decisiones que nombra estas etapas es la del **patrón §9**, es decir, el ADR del *incidente*, no el del diseño.

El hallazgo que explica por qué esto sobrevivió seis semanas sin detección es de método, no de código, y está en §3.

**Y falta un eje.** `stage` carga hoy dos preguntas —*dónde está en el proceso* y *cómo terminó respecto de la persona*— cuando la segunda ya tiene campo propio (`decision`). Las cuatro etapas terminales «reales» son espejo redundante de ese campo; `handoff_ready` pertenece a otro agregado y nadie lo escribe; y **`closed` no significa nada: ninguna decisión lo produce**. Lo que el dominio no puede expresar es la tercera pregunta —*por qué terminó, si no fue por la persona*— y es justo la que `TASK-1762` necesita. Anatomía completa en §7.

**Qué NO se rompe:** el subsistema de **scoring de assessment con IA es indiferente** al colapso. Es el único subsistema grande del dominio que no toca la etapa. Y el colapso terminal es **más seguro de lo que parecía**: cinco de los seis consumidores relevantes ramifican por `stage OR decision`, no por etapa sola (§7.5).

**Qué sí requiere decisión humana antes de tocar nada:** cinco preguntas, en §10. La más pesada es **qué significa `closed`**, porque hoy no significa nada y tres subsistemas necesitan que signifique cosas distintas.

**Y una advertencia de método que vale más que cualquier hallazgo puntual:** esta auditoría se equivocó cinco veces en su primera versión, siempre en la misma dirección — **leer un predicado parcialmente y deducir el daño máximo**. Los tres modos de fallo están en el encabezado. Quien continúe este trabajo debe leer los predicados completos antes de creerle a ninguna línea de aquí, incluidas las corregidas.

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

**Conclusión: CONFIRMADA. Evidencia declarada inicialmente: FALSA.** Esta sección se reescribió tras un verificador adversarial dedicado. Se conserva el recorrido porque el error de método es parte del hallazgo.

### 3.1 El hecho

**Ningún operador humano escribió jamás `shortlisted`.** Sobrevivió a seis ataques independientes. Ninguna consulta encontró un solo movimiento humano a esa etapa.

Pero las cifras con que se sostuvo en la primera versión eran incorrectas:

| | Primera versión | Verificado |
|---|---|---|
| Escrituras de `shortlisted` en la historia | 6 | **27** |
| Origen | 1 script + 5 agente E2E | 6 por `stage_changed` (1 script + 5 agente) **+ 21 nacidas en `shortlisted` por el INSERT** |
| Autoría de las 21 | no vistas | `user-live-test` (15) y `user-live-test-proposal` (6) — cero humanos |

**Por qué se escaparon 21 de 27:** `createHiringApplication` acepta `stage` del llamador (`store.ts:1188`), lo escribe en el INSERT (`:1244`) y emite `hiring.application.created` — **no `stage_changed`**. Una postulación puede **nacer** en cualquiera de las 13 etapas. La agregación original sólo miró `stage_changed`, y por lo tanto fue ciega al camino dominante.

### 3.2 El error de método, que es peor que el error de cifra

**El payload del evento de creación no incluye `actorUserId`** (`store.ts:1281-1291`), aunque la función lo recibe y lo persiste en la columna `created_by`. Los 86 eventos `created` tienen actor `NULL` en el payload.

> Si el auditor hubiera incluido esos eventos, las 21 escrituras habrían caído en la casilla «script (actor null)» **por la forma del payload, no por evidencia**. Habría acertado por suerte.

La autoría real vive en `created_by`, columna que la primera versión nunca consultó.

**Y hay un problema más profundo: `actorUserId` es texto libre auto-declarado por el llamador, no derivado de sesión autenticada.** Las dos direcciones de confusión están abiertas y verificadas:

- **Humano operando como robot:** `user-agent-e2e-001` tiene `efeonce_admin` + `collaborator` activos y es la persona de `/api/auth/agent-session`, usada por humanos para diagnóstico con Playwright.
- **Robot operando como humano:** `scripts/mint-local-admin-jwt.js:41-45` acuña un JWT NextAuth válido con `sub: 'user-efeonce-admin-julio-reyes'` y `roleCodes: ['efeonce_admin']`. Cualquier llamador headless con ese token produce un evento **indistinguible** de una persona arrastrando una tarjeta.

**La atribución de actor no es un discriminador confiable de humano vs robot en ninguna de las dos direcciones.**

### 3.3 Por qué la conclusión aguanta igual

Tres corroboraciones independientes, y la tercera es la única que no depende del log:

1. **Autoría real** (`created_by`): las 21 son `user-live-test` / `user-live-test-proposal`.
2. **Cadencia:** las 5 escrituras del agente van a **0,56–0,71 s** de intervalo; las del admin tienen huecos irregulares humanos (26,9 s · 10 s · 15,6 s · 409 s · 767 s). Máquina contra persona.
3. **La evidencia decisiva no es del log, es de la superficie:** el carril «Evaluación» del tablero tenía `destination: 'qualified'` **desde su primera versión**. Eso es código, no bitácora — y es lo que realmente prueba que un operador **no podía** escribir `shortlisted`.

### 3.4 Las «9 filas» del commit, reconstruidas exactas

El commit `cff96f16b` (2026-08-17T13:34:58Z) cita «42 sourced, 9 shortlisted, 7 screening». Reconstruyendo la población a ese timestamp combinando `created` + `stage_changed` + `decided`: **46 · 9 · 7**. Las dos cifras que importan calzan al dedillo. Descomposición de las 9:

- **+1** script de sanity, actor `null` (2026-08-12 10:58:01)
- **−1** el mismo, 1,4 s después: `decideHiringApplication` reescribió `stage` a `rejected` **sin emitir `stage_changed`** — una salida invisible al log
- **+5** agente E2E (2026-08-16)
- **+4** nacidas directamente en `shortlisted` por `user-live-test` (2026-08-17) — el trozo que faltaba

**Cero humanos.** El punto pedagógico del commit sobrevive, mejor documentado.

### 3.5 Un detalle que la primera versión reportó mal

Las 4 filas que **hoy** están en `shortlisted` son postulantes **reales** (`source='public_careers'`, `data_origin='real'`, creadas el 2026-08-11 por el formulario público). Nacieron en `sourced` como postulaciones genuinas y **un script les movió la etapa**.

> «Las filas existían porque las habían puesto robots» es cierto del **valor de etapa**, falso de **las filas**. La distinción importa para retención de PII y para el corpus de fairness: son personas reales.

### 3.6 La regla derivada — corregida

La primera versión escribió: *«si hay log append-only, agrupar por actor antes de concluir»*. **Esa regla es insuficiente y peligrosa**, y esta auditoría es su contraejemplo: el log omite el actor justo en el camino dominante, y el actor que sí trae es auto-declarado.

**La regla que sobrevivió los seis ataques es la segunda mitad de la frase, y debe ser la primera:**

> Al atar una automatización a un valor de estado, **derivar la alcanzabilidad del contrato de la superficie** — qué valores puede realmente escribir el tablero, el formulario, el endpoint. El contenido de la tabla y la autoría del log son corroboración, nunca prueba. Y antes de usar un log como evidencia, verificar **qué caminos de escritura lo emiten** y **si el actor viaja en el payload**.

El 2026-08-17 el commit `cff96f16b` sí verificó contra la base antes de fijar el disparador. La verificación fue real; la conclusión, falsa. **La pregunta era «¿hay filas con este valor?» cuando debía ser «¿puede un operador escribir este valor desde la superficie que usa?».**

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

**Verificado contra código, y CORREGIDO tras recuento independiente.** El mismo enum está particionado en **17 lugares con semántica propia**, materializados en **40+ sitios literales**.

**Dos afirmaciones de la primera versión eran falsas y se retiran:**

- ~~«Ninguna se deriva de otra»~~ — **cuatro sí tienen binding compile-time** con el enum canónico: el mapa decisión→etapa (values), los tres campos de `LaneDefinition`, las keys de `STAGES_DOWNSTREAM_OF_TRIGGER` y las keys de la allowlist candidate-facing. Renombrar un literal rompe el build **en esos cuatro sitios y en ningún otro**.
- ~~«Ninguna tiene test de paridad»~~ — **existe uno**: `pipeline-lane-contract.test.ts:35-43` importa el enum canónico y verifica cobertura total y disyunción de los carriles. Es decir, **la partición mejor protegida del conjunto es `LANES`** — precisamente la que el diagnóstico inicial señalaba como el problema.

La tabla siguiente lista las 14 más relevantes; el recuento completo llega a 17 sumando el par `('rejected','withdrawn')` de la migración de recovery, el gate `sourced`-only del purge y el predicado «ya archivado».

| # | Partición | Contenido | Copias |
|---|---|---|---|
| 1 | Dominio | las 13 | `src/types/hiring.ts:109-123` + `CHECK` en `migrations/20260707235655376_…:152-155` |
| 2 | Carriles del tablero | 6 | `PipelineDeskView.tsx:69-84` + **copia sin test** en `DemandDeskView.tsx:352` |
| 3 | Etiquetas visibles | 6 para 13 claves | `copy/dictionaries/es-CL/hiringDesk.ts:93-107` (`en-US` hereda por spread → muestra castellano) |
| 4 | Trigger de policy | `shortlisted, interview` | `types/hiring-assessment-policy.ts:42` + `CHECK` en `migrations/20260817094924247_…:32` |
| 5 | Trigger de ledger | `+ manual` | `types/hiring-assessment-policy.ts:104` + `CHECK` en `migrations/20260817100030803_…:27` |
| 6 | Aguas abajo del trigger | 2 listas | `assignment-policy/readers.ts:196-199` — **keys derivadas del tipo, values `readonly string[]` a mano** (deliberado, justificado en `:189-195`). *Corrección: la primera versión citaba un «espejo manual en SQL» en la query de reliability; **ese archivo no contiene ningún literal de etapa**. `STAGES_DOWNSTREAM_OF_TRIGGER` tiene un solo consumidor y cero espejos SQL.* |
| 7 | Terminales de acceso | 5 (**omite `backup` y `decision_pending`**) | **6 copias**: `assessment/instances.ts:190` · `public-session/store.ts:11` · `access-recovery/vocabulary.ts:93` · `migrations/20260819072130586_…:362, :631, :725` (plpgsql) |
| 8 | «No activa» (**una** partición, 9 ocurrencias en 4 archivos) | `rejected, withdrawn, closed` | `desk.ts:104` · `talent-pool/projection.ts:24,29,41,44,83` · `commands.ts:272` · `DemandDeskView.tsx:348`. *Corrección: la primera versión la contaba dos veces (desk y talent pool) — es el mismo conjunto, son copias de una partición.* **Contradice la partición 7:** en `selected`/`handoff_ready` una postulación es ACTIVA aquí y TERMINAL allá |
| 9 | Cierre por rechazo/retiro | `rejected, withdrawn` | `migrations/20260819072130586_…:899, :1000` — subconjunto **distinto** de la 7 y de la 10 |
| 10 | Decision-owned | `selected, backup, rejected, withdrawn` | `store.ts:1311` |
| 11 | Decisión → etapa | 5 | `decide.ts:27-33` |
| 12 | Candidate-facing | `shortlisted, interview` | `notifications/stage-policy.ts:14-17` |
| 13 | Reportables de fairness | 7 | `assessment/fairness/contracts.ts:1-9` |
| 14 | Escaleras de rango | 3 escaleras × 7-8 | `migrations/20260713173500000_…:72-79, :86-95, :110-121` (duplicadas a su vez en la migración previa) |

**Escrituras de `stage`: 4 caminos + el DEFAULT del schema.**

| Camino | Qué escribe | Evento que emite |
|---|---|---|
| `store.ts:1244` (INSERT en `createHiringApplication`) | **cualquiera de las 13**, tomada del llamador (`:1188`) | `hiring.application.created` — **sin `actorUserId` en el payload** |
| `store.ts:1322` (PATCH) | 9 de 13 (bloquea las 4 decision-owned) | `hiring.application.stage_changed` |
| `decide.ts:241` | las 5 del mapa `DECISION_STAGE` | `hiring.application.decided` — **sin `stage` en el payload** |
| `data-origin/purge.ts:173` | `closed`, por SQL crudo | **ninguno** |
| CHECK del schema | `DEFAULT 'sourced'` | — |

**El INSERT es el camino más usado para valores no-`sourced`, y la primera versión de esta auditoría no lo listaba** (citaba el `DEFAULT` como si una postulación sólo pudiera nacer en `sourced`). 21 de las 27 escrituras históricas de `shortlisted` entraron por ahí.

**Consecuencia de contrato:** `hiring.application.stage_changed` **no es el log completo de movimientos de etapa** — le faltan el INSERT, las 5 del comando `decide` y la escritura del purge. Ninguna migración futura, ni ningún análisis, puede derivar historia de etapas del outbox. Y `purge.ts:173` viola el «NUNCA mutar el estado por SQL directo» del patrón canónico §2.

---

## 6. Radio de impacto por subsistema

| Subsistema | Veredicto | Por qué |
|---|---|---|
| **Assessment AI Scoring Run** | **Indiferente** | No persiste etapa, no ramifica por etapa, el packet no lleva journey, la elegibilidad no hace JOIN a `hiring_application`, el gold set estratifica por competencia × banda. El `input_digest` no se mueve. |
| **Evaluation Dossier** | **Inconsistente, no roto. El riesgo real es el prompt, no el digest** | `journey.currentStage` entra al `input_digest` (`packet.ts:246-255`) y **al prompt que lee el modelo** (`generate.ts:181`). Lo primero dispara un supersede append-only ya diseñado; lo segundo cambia el token con el que el modelo redacta. Ver H-15. |
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

**H-03 · La escalera histórica de fairness es una tabla de traducción, no un espejo del vocabulario vigente.** *(Verificado contra código. **MATIZADO** por verificación adversarial — la severidad baja de P0 a P1.)*

**Lo que se confirmó verbatim:** el `GREATEST` (`migrations/20260713173500000_…:109-122`) combina la rama histórica (`LEFT JOIN`, no queda sombreada) con la del estado vigente, ambas con `ELSE 0`. No hay `WHERE` que filtre terminales. **No existe ningún otro consumidor que calcule adverse impact.** Y la prescripción es correcta: conservar los literales viejos mapeados al rango nuevo.

**Y algo peor de lo que se había dicho:** el emisor de decisión **no pone `stage` en el payload** (`decide.ts:276-284`). Para un `decided`/rejected, todos los `WHEN` de etapa son NULL-no-true y cae a `ELSE 0`. El evento de decisión de un rechazado aporta **exactamente 0**, no «un rango menor».

**Lo que era falso y se retira:**

- ~~«Para TODA postulación terminal la escalera vigente cae en `ELSE 0`»~~ — `selected` y `handoff_ready` dan **7** (`:118-119`). Vale para `rejected`/`withdrawn`/`backup`/`closed` y para `sourced`.
- ~~«El ratio 4/5 reportaría *sin impacto adverso*»~~ — **mecanismo equivocado y dirección injustificada.** Si la etapa sale de `stage_targets`, el reader filtra `WHERE stage = $1` → 0 filas → **`verdict = 'insufficient_sample'`**, que es honesto, no un falso negativo. Y como `referenceRate = Math.max(...)`, desinflar al grupo **desfavorecido** produciría un **falso positivo** de impacto adverso. La dirección no está determinada.
- ~~«PARA SIEMPRE»~~ — la VIEW ya tiene reloj de olvido: `AND selfid.retention_expires_at > NOW()` (`:151`), configurable 1–3650 días.
- ~~«La ÚNICA memoria»~~ — cierto **dentro de la VIEW**; falso en la base: `hiring_assessment_assignment.trigger_stage` es un rastro durable no-actualizable. Aunque sólo existe si disparó una policy.

**Omisión mayor que acota casi todo el alcance:** el **reporte por defecto es inmune**. `get-selection-fairness.ts:42` usa `input.stage ?? 'selected'`, y para ese objetivo el numerador filtra `progress.decision = 'selected'` (`:142`) — **nunca lee `max_stage_rank`**. La escalera no puede mutilar el 4/5 que realmente se ejecuta.

**Y el matiz que la vuelve necesaria-pero-no-suficiente:** el propio repo declara los payloads de `outbox_events` como fuente no confiable para decidir etapa y **con retención declarada como borrable a futuro** (`assignment-policy/readers.ts:212-216`). La tabla de traducción está anclada a un sustrato que la plataforma se reserva el derecho de purgar.
*Sin dueño.*

**H-04 · El k-anonimato de fairness protege el denominador y deja el numerador crudo.** *(**MATIZADO A LA BAJA** por verificación adversarial — de P0 a P2. La narrativa de «divulgación irreversible» no se sostiene.)*

**Lo que se confirmó verbatim, y es lo que queda:** `CROSS JOIN stage_targets` (`:152`) es literal, el denominador `eligible_count` es **invariante a la etapa** (idéntico en las 7 filas de un grupo), y el `HAVING >= 10` (`:154`) cuenta exactamente eso. **`advanced_count` no tiene piso k en ningún punto** — ni en SQL (`:140-145`) ni en TS (`stats.ts:62` filtra por `eligibleCount`, nunca por `advancedCount`). Y `result_json` guarda los **conteos crudos**: el redondeo (`stats.ts:30`) se aplica sólo a tasas y ratios, jamás a los conteos.

**Hallazgo nuevo del verificador:** el filtro de k-anonimato de la capa TS (`stats.ts:62`) **nunca remueve nada** — toda fila ya pasó el `HAVING >= 10` y el agregador **suma** entre meses, así que la cifra sólo puede crecer. Es **k-anonimato decorativo**. (En contraste, `FAIRNESS_MIN_REPORTABLE_GROUPS = 2` sí es supresión complementaria real.)

**Lo que era falso y se retira:**

- ~~«Revela el conteo exacto de individuos»~~ — **la diferenciación es innecesaria**: un solo snapshot ya publica `advancedCount` y `eligibleCount` crudos por categoría. El daño enunciado ya estaba disponible sin ataque.
- ~~«Corpus imposible de borrar»~~ — falso en la capa DB: los triggers son de fila y PostgreSQL **no los dispara en `TRUNCATE`**; el owner puede quitarlos. Es append-only **para los roles de aplicación**, no absolutamente.
- ~~«Sin remediación después del hecho»~~ — **prematuro**: el hecho no ha ocurrido. Poner un piso k al numerador, o estampar la versión de esquema en el snapshot, está disponible antes.
- La resta tampoco sería limpia: `advanced_count` de una cohorte pasada sigue mutando con la progresión, el JOIN de self-ID descarta filas por retiro y expiración de retención, y la ventana se computa desde `now`.

**Y el contexto que lo desinfla del todo:** **no existe camino de lectura.** La única referencia a la tabla de evidencia en `src/` y `scripts/` es el `INSERT`. El ataque exige acceso directo a la base — y ese mismo principal ya tiene `SELECT` sobre la tabla **fila-por-individuo** de auto-identificación demográfica. Diferenciar snapshots es estrictamente **más débil** que la consulta que ese rol ya puede hacer. **El k=10 es disciplina de capa aplicación sobre la API, no una frontera de privilegios.**
*Sin dueño.*

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

**H-14 · El paso operativo intermedio no tiene primitive. El modelo correcto ya existe en el mismo dominio.** *(**REFORMULADO** por verificación adversarial. El diagnóstico se sostiene; la acusación de incumplir el ADR, no.)*

**Lo que se retira:** ~~«no cumple Full API Parity»~~. El ADR pide parity a nivel de *business capability*, que la lógica no viva **sólo** en componentes UI, y que los contratos modelen agregados y comandos. Y **concede explícitamente la excepción**: «se permiten excepciones UI-only cuando se documentan como deuda con dueño, razón y condición de retiro». El bloque de `PipelineDeskView.tsx:47-63` cumple las tres, literalmente. **Bajo el ADR eso es deuda conforme.** También se retira ~~«exportada sólo para su test»~~: ese test importa el enum canónico y verifica cobertura y disyunción, y los tres campos están tipados — **`LANES` es la partición mejor amarrada del conjunto**. Y ~~«no existe capability de paso operativo»~~: existe `hiring.application.decide`, y el guard del PATCH bloquea las 4 terminales precisamente porque son suyas. **El diseño ya es de dos niveles; lo que falta es para las etapas INTERMEDIAS.**

**Y un error de categoría:** ~~«el contrato programático es más débil (`string` vs enum)»~~ comparaba un **filtro de lectura** contra un **validador de escritura**. La versión correcta es más dura: **el lane App no tiene escritura de etapa en absoluto y no existe superficie MCP de hiring.** El camino de escritura tiene hoy **cero consumidores no-UI**.

**Lo que sostiene el hallazgo, y es más fuerte:** el **patrón canónico §2** exige para toda máquina de estados el trío `CHECK` + **trigger `BEFORE UPDATE` validando contra una matriz espejo de una matriz TS** + tabla `*_transitions` **append-only**. `hiring_application.stage` tiene **sólo el CHECK**: no hay trigger de transición ni tabla de transiciones. Y `purge.ts:173` muta el estado por SQL crudo, que §2 prohíbe. **§2 no tiene cláusula de escape.**

**El precedente correcto está en el MISMO dominio, escrito tres días después** — `HiringHandoff` (TASK-356):

| Pieza | `HiringHandoff` | `hiring_application.stage` |
|---|---|---|
| Vocabulario de **pasos** ≠ vocabulario de estados | `HIRING_HANDOFF_COMMAND_ACTIONS` (`handoff/types.ts:48`) | no existe |
| paso → estado como primitive compartido | `COMMAND_ACTION_TARGET` (`handoff/state-machine.ts:37-42`) | vive en `LANES.destination`, dentro de un `'use client'` |
| Matriz de transición | `COMMAND_TRANSITIONS` / `SYSTEM_TRANSITIONS` | no existe |
| Ruta que nombra el **paso** | `POST /api/hiring/handoffs/[id]/[action]` | `PATCH` con `{stage}` libre |
| Guard exportado para todo consumer | `isHiringHandoffCommandAction` | no existe |
| Audit append-only anti-UPDATE/DELETE | migración `20260710173221695_…:75,100-106` | no existe |

Hay ~14 máquinas de estado equivalentes en `src/lib/**` (contractor-engagements, work-submissions, signatures, workforce/*, commercial/party, knowledge). **`hiring_application.stage` es la excepción, no la norma. No hay que diseñar el modelo correcto: hay que copiarlo.**

**La frontera exacta**, que es lo que hay que decidir: `LaneDefinition` mezcla dos naturalezas. `stages`, `titleStage`, `tone`, `icon` son **presentación legítima** — que tres literales compartan columna es decisión de superficie. `destination` **no lo es**: es qué literal se **escribe**. El test es empírico, no doctrinal: **¿el sistema ramifica por ese valor?** Sí — y por eso 15 vacantes y 2 candidatas reales se quedaron sin prueba. Un campo cuyo valor decide si una persona recibe su test no es presentación.

Alcance de escritura por consumer: tablero **6/13** · PATCH **9/13** · `decide` **5/13** · App API **0/13** · MCP **no existe** · Nexa **0/13**.

**H-15 · La etapa cruda entra al prompt que lee el modelo. Es acoplamiento de semántica, no de idempotencia.** *(Verificado contra código. **MATIZADO**: el impacto sobre el digest era mucho menor de lo reportado; el impacto sobre el prompt no estaba reportado y es el que importa.)*

**El riesgo real**, `dossier-ai/generate.ts:181`, verbatim:

```ts
`Postulación (DATA): id=${packet.applicationId}, etapa actual=${packet.journey.currentStage}, fuente=${packet.journey.source}.`,
```

Colapsar cambia **el token que el modelo lee para redactar**, no sólo un hash. Si `client_review`, `interview` y `decision_pending` se fusionan, el modelo pierde esa distinción al escribir la narrativa. El system prompt sólo prohíbe snake_case para **competencias**, y el sanitizer de display (`display.ts:35-63`) sólo traduce competencias — así que una nota confirmada puede decir «actualmente en `client_review`» **para siempre**, en una tabla append-only por trigger de DB. **Antes de colapsar hay que decidir qué token recibe el modelo por cada etapa fusionada.**

**Lo que se retira del reporte original sobre el digest:** `journey.currentStage` **sí** está en el material del hash (`packet.ts:246-255`) y el índice único es el declarado. Pero:
- ~~«cambia el digest de TODA postulación»~~ — sólo de las cuyo literal se remapea, **y sólo existen propuestas donde el assessment está `scored` y el CV `ready`**: un subconjunto de fondo de embudo.
- ~~«queda huérfana»~~ — la fila sigue `proposed`, no viola el índice, y el reader devuelve la más nueva. Es un **supersede append-only diseñado**, ya ejercido dos veces (swap de modelo y prompt v1→v2), declarado en `dossier-ai/config.ts:26-28`.
- ~~«se re-llama al proveedor»~~ — `proposeEvaluationDossier` se invoca desde cuatro sitios y **ninguno dispara con cambio de etapa**. El costo sólo aparece si se re-puntúa el assessment, se re-procesa el CV, o alguien pulsa «Generar análisis».

**H-16 · `handoff_ready` es un literal muerto que gobierna decisiones.** *(Verificado contra código y **confirmado** por verificación adversarial.)*
El barrido dedicado no encontró **ningún** escritor efectivo — ni decisión, ni UI, ni SQL, ni script. Es alcanzable **sólo por llamada directa a la API** (el guard del PATCH lo deja pasar), y aun así gobierna 6 listas de decisión, incluidas las tres guardas terminales y las dos escaleras de fairness, donde vale rango 7.

**H-17 · `decision_pending` significa dos cosas.** *(Verificado contra código.)*
Es el paso 5 del tablero («aún no decidido») **y** el resultado de `on_hold` («ya decidido, en pausa», `decide.ts:32`). `DemandDeskView.tsx:355` los cuenta juntos.

**H-18 · `laneForStage` cae a `inbox` con `?? 'inbox'`.** *(Verificado contra código.)*
`PipelineDeskView.tsx:86-87`. Una etapa desconocida aparece silenciosamente en la primera columna. Y `Application360View.tsx:1783,1844` produce label `undefined` si la clave falta en el diccionario — posible porque `copy/types.ts:544` tipa `stages` como `Record<string,string>`.

**H-25 · Un seleccionado de respaldo es invisible para el análisis de equidad, por los dos caminos a la vez.** *(Hallazgo del verificador adversarial. Mismo bug class que H-03.)*
`backup_selected` es una decisión **favorable**. Escribe `stage='backup'` (`decide.ts:29`), que **no está en ninguna de las escaleras de rango** → 0. Y para el objetivo `selected` el numerador filtra `progress.decision = 'selected'` (`…:142`), que **lo excluye**. Una persona seleccionada como reserva no existe para el reporte de adverse impact ni por la vía de la etapa ni por la de la decisión.
*Sin dueño.*

**H-26 · Una capability de LECTURA autoriza una escritura irreversible.** *(Hallazgo incidental del verificador.)*
`src/app/api/hiring/assessments/fairness/route.ts:44` — el `POST` que **escribe** en `assessment_fairness_evidence`, la tabla append-only de evidencia AI Act, está gateado por `can(tenant, 'hiring.assessment.fairness_read', 'read', 'tenant')`: **el mismo grant que el `GET`** (`:26`).
*Sin dueño.*

**H-27 · Retirar el consentimiento se deshace solo con el siguiente cambio de etapa.** *(Hallazgo del verificador. Alcance acotado, mecanismo real.)*
`migrations/20260819072130586_…:926` pone `retention_expires_at = NOW()` al retirarse el consentimiento. Pero **cualquier `UPDATE` posterior de `stage`** re-dispara el trigger de `:915-917`, que recalcula por el `CASE` y lo devuelve a `NULL` por el `ELSE`. Acotado porque la purga por `consent_withdrawn` no lee ese campo — pero el índice parcial `WHERE retention_expires_at IS NOT NULL` y el carril `retention_expired` sí quedan afectados.
*Sin dueño.*

**H-28 · Los dos relojes de retención se contradicen sobre `on_hold`.** *(Hallazgo del verificador.)*
Para una postulación en pausa: el reloj de **recuperación** la deja en `ELSE NULL` — no expira nunca (H-23); el reloj de **documentos** la admite (`decision IS NOT NULL`) con `was_hired = FALSE` y **le arranca los 12 meses**. Mientras tanto su etapa `decision_pending` se ve viva en el tablero. Tres subsistemas, tres lecturas distintas del mismo estado.
*Sin dueño.*

**H-29 · Los eventos de dominio omiten justo el campo que los haría auditables.** *(Verificado contra código.)*
`hiring.application.created` escribe `stage` pero **no lleva `actorUserId` en el payload** (`store.ts:1281-1291`), aunque la función lo recibe y lo persiste en `created_by`. `hiring.application.decided` reescribe `stage` pero **no lleva `stage` en el payload** (`decide.ts:276-284`). Consecuencia: ningún análisis de historia de etapas basado en el outbox puede ser correcto — es exactamente lo que hizo fallar la primera versión de §3 de esta auditoría.
*Sin dueño.*

**H-30 · `actorUserId` es texto libre auto-declarado y no distingue humano de robot en ninguna dirección.** *(Verificado contra código y runtime.)*
No se deriva de sesión autenticada: lo declara el llamador. **Humano→robot:** la persona `user-agent-e2e-001` tiene `efeonce_admin` activo y es la de `/api/auth/agent-session`, usada por humanos con Playwright. **Robot→humano:** `scripts/mint-local-admin-jwt.js:41-45` acuña un JWT NextAuth válido con `sub: 'user-efeonce-admin-julio-reyes'` y `roleCodes: ['efeonce_admin']`; cualquier llamador headless con ese token produce un evento indistinguible de una persona operando el tablero. Los actores vivos en el dominio incluyen `cli-hiring-operator`, `task-1372-smoke`, `codex-task-1372-smoke-cleanup`, `probe` y `system:codex`.
*Sin dueño. Consecuencia directa: la atribución de actor no sirve como evidencia forense sin corroboración independiente.*

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
| Q1 | ¿Se le pone piso k al numerador de fairness y se estampa la versión de esquema en el snapshot, antes de cambiar la granularidad? (H-04, H-25) | Decisión de privacidad sobre datos demográficos autodeclarados. **Degradada tras verificación**: hay remediación disponible antes del cambio, y el ataque por diferenciación es más débil que el acceso que el rol ya tiene | Sí, si se hace antes |
| Q2 | ¿`closed` significa «terminó» o «archivado»? Hoy lo escriben dos caminos con semánticas distintas (tablero y `purge.ts`) y ninguno escribe `decision` (H-01, H-02) | Define el reloj de retención de PII de personas reales bajo Ley 21.719 | **No, una vez que hay filas reales** |
| Q3 | ¿El colapso terminal va, y en qué orden respecto de la puerta de `closed`? | Cambia el KPI de «activas», el talent pool y ambos relojes de retención | Parcialmente |
| Q4 | Con «Evaluación» ensanchada, ¿el default de la policy pasa a `manual`? (H-12) | Es una decisión de equidad: `on_stage_entry` sobre una etapa ancha manda trabajo no pagado a todo el que pase screening | Sí |
| Q5 | ¿Sube el Slice 0 a producción por separado, o espera al resto? | Hoy en producción el defecto sigue vivo y hay 7 postulaciones reales varadas | Sí |
| Q6 | ¿Qué token recibe el modelo del expediente por cada etapa fusionada? (H-15) | La etapa cruda entra al prompt; fusionar cambia lo que el modelo lee para redactar, y la nota resultante es append-only | Sí, si se decide antes |
| Q7 | ¿Se adopta el modelo de `HiringHandoff` para las etapas intermedias —vocabulario de acciones, matriz de transición, tabla append-init— o se acepta la deuda documentada? (H-14) | Define si el arreglo es estructural o vuelve a ser un parche con guardián | Sí |

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
