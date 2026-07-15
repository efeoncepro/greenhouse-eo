# Proposal Studio — De un RFP al PDF en la mano (el día a día)

> **Tipo de documento:** Manual de uso (operador del portal)
> **Version:** 1.1
> **Creado:** 2026-07-12 por Claude (redacción técnica)
> **Ultima actualizacion:** 2026-07-12 por Claude — se agrega la sección "Operar desde Nexa (el chat)" (TASK-1399)
> **Documentacion tecnica:** `docs/tasks/complete/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md` · `.claude/skills/greenhouse-public-private-tenders/proposal-studio-runtime.md`

---

## Para qué sirve

Este es **el manual de la puerta de entrada**: te llegó un RFP (una licitación pública, un RFP privado, o una oportunidad de venta directa) y quieres terminar con **el PDF de la propuesta en la mano**, listo para subir a la plataforma del cliente (Wherex, Mercado Público, el correo del comité, lo que sea).

Cubre el recorrido completo, en el orden en que ocurre de verdad:

**RFP → admisibilidad → registrar la propuesta → cargar RFP y evidencia → construir el argumento → armar el plan del deck → pedir el render → revisar el PDF → subirlo.**

Los otros manuales del mismo dominio profundizan cada tramo. Este los encadena:

| Si quieres… | Lee |
|---|---|
| El índice del dominio | `README.md` (esta misma carpeta) |
| Todo lo que se puede hacer con una propuesta (estados, evidencia, requisitos) | `crear-y-operar-una-propuesta.md` |
| El detalle de cómo se compone el deck (plantillas, láminas, catálogo) | `generar-el-deck-de-una-propuesta.md` |
| Qué significa cada rechazo, uno por uno | `entender-los-errores-y-rechazos.md` |
| Cómo se opera el worker que renderiza (cola, reintentos, diagnóstico) | `operar-el-artifact-worker.md` |
| **El método comercial** (las 10 fases del bid: admisibilidad, fit, pricing, redacción) | La skill `greenhouse-public-private-tenders` → `bid-construction-playbook.md` |

---

## ⚠️ Antes de empezar — lee esto o vas a esperar algo que no existe

Estas cuatro verdades ordenan todo el manual. Ninguna es opinión: son el estado real del sistema al **2026-07-12**.

### 1. Hoy **no hay pantalla** del Proposal Studio

No existe una UI del Proposal Studio en el portal. Lo que **sí** existe ya es la operación desde el **chat de Nexa**: un tool de sólo lectura (`proposal_status`) y cuatro acciones gobernadas (registrar la propuesta, adjuntar el RFP, registrar evidencia, pedir el deck). Están **listas en el código, pero apagadas por defecto** — el flag `NEXA_PROPOSAL_ACTIONS_ENABLED` viene en `false`, así que hasta que se prenda en el entorno, Nexa te va a decir honestamente que no puede operar propuestas.

**Entonces, ¿cómo lo operas hoy?** Le pides a **Claude Code** (el agente en el repo, en tu terminal) que ejecute los comandos por ti — o los corres tú. Ese es el camino vivo del día a día y es el que documenta todo este manual. El sistema completo existe y funciona: base de datos, gates, agentes, worker en Cloud Run. Cuando se prenda el flag, Nexa opera **la misma máquina, con los mismos gates**, desde el chat: ver "Operar desde Nexa (el chat)" más abajo.

### 2. El sistema **no confía en el modelo**: confía en ti

Todo write pasa por un command canónico. Un agente **propone**; **tú confirmas**; el mismo command ejecuta. No existe la figura de "agente que actúa solo" — ni siquiera con un bug: la base de datos exige un `member` humano en los gates críticos.

### 3. El motor **falla cerrado**

Si algo está mal (una evidencia interna colada en un deck para el cliente, un deadline vencido, el RFP exige accesibilidad que Chromium no puede entregar), **el sistema no renderiza y te dice por qué**. No degrada en silencio, no entrega algo a medias. Un rechazo es el sistema funcionando bien.

### 4. Nada de esto reemplaza el método comercial

El Proposal Studio es el **motor**: guarda, valida, compone y renderiza. **El argumento lo construyes tú** (con las skills del ecosistema). El playbook de las 10 fases sigue mandando. Este manual te dice cómo el motor se engancha a ese método.

### Lo que necesitas tener a mano

- **El repo abierto** en `develop`, con Claude Code o una terminal.
- **Acceso a PostgreSQL**: `pnpm pg:connect` (levanta el proxy Cloud SQL solo).
- **El RFP** (las bases, el PDF, la planilla — lo que llegó).
- **Los datos duros del RFP**: nombre del cliente, plataforma, **fecha y hora de cierre**, moneda.
- **La organización**: la propuesta nace bajo Efeonce Group SpA (`org-2df565fb-98aa-42f7-b324-ea9a2209017f`) y esa organización **tiene que tener el módulo `proposal_studio_v1` asignado**. Si no lo tiene, ningún comando funciona: el sistema rechaza por entitlement antes de mirar nada más.

---

## Paso a paso

### Paso 1 — Llegó un RFP: la admisibilidad va PRIMERO

**Antes de tocar el sistema, antes de escribir una línea de la propuesta: corre la admisibilidad.**

Esto no es burocracia. Es la decisión más cara del proceso: gastar tres días armando una propuesta que era inadmisible desde la primera página. Del playbook (Fase 1):

- Lee las bases **completas**: objeto, calendario, requisitos, criterios de evaluación, SLA, penalidades, garantías, formato exigido, plataforma.
- Separa lo **excluyente** de lo que **puntúa**.
- Marca en rojo lo que falta (declaraciones juradas, garantía, planilla, validez de la oferta).
- **Si un requisito excluyente no es subsanable a tiempo → NO-BID.** Se acabó. No sigas.

Pídeselo a Claude Code así:

```text
Llegó un RFP nuevo: [pega el link o la ruta del PDF de las bases].
Carga la skill greenhouse-public-private-tenders y corre Fase 0 + Fase 1 del
bid-construction-playbook: léeme las bases completas, dame el resumen ejecutivo,
la tabla de plazos, y la matriz de admisibilidad separando excluyente vs. puntúa.
Dime explícitamente si hay algún excluyente que NO podemos cumplir a tiempo.
```

Lo que te devuelve alimenta todo el resto. **Las fechas que salgan de aquí son las que vas a registrar en el sistema, y no se inventan**: si las bases son ambiguas (dos fechas que chocan), eso se declara como ambiguo, no se resuelve a ojo.

### Paso 2 — La propuesta nace en el sistema

Ya sabes que es admisible y que vas a ir. Ahora el RFP se convierte en un **objeto de negocio** con estado, dueño, deadline y trazabilidad.

Lo que le pides a Claude Code:

```text
Registra esta propuesta en el Proposal Studio (dominio commercial/tenders/proposals):

- Cliente: SKY Airline
- Título: SKY — Gestión del blog 2026 (Wherex)
- Origen: private_rfp
- Plataforma: Wherex
- Deadline: 2026-07-15 18:00 (hora Chile)
- Confianza del deadline: ambiguous — las bases §2.5 dan dos fechas; asumo la de cierre
  de recepción de ofertas
- Moneda: CLP
- Yo soy el actor (member): julio-reyes

Usa createProposal (el command canónico), con idempotencyKey 'sky-blog-2026-wherex'.
Muéstrame el input exacto ANTES de ejecutar y espera mi OK.
```

**Lo que TÚ tienes que darle y el agente NO puede inventar:**

| Dato | Por qué no se infiere |
|---|---|
| **La organización cliente** | Tiene que existir en el 360. Si el cliente es nuevo, se crea primero por el camino canónico de organizaciones — no se inventa un ID. |
| **El deadline** | Sale de las bases, no de una suposición. Si es ambiguo, **se declara ambiguo** (`deadlineConfidence: 'ambiguous'`) + el supuesto por escrito. Ese texto queda guardado y es lo que defiendes si alguien pregunta. |
| **El origen** | `public_tender` (licitación pública) · `private_rfp` (RFP privado) · `direct_sales` (venta directa). Cambia el vocabulario de todo lo demás. |
| **Tú, como actor** | Un agente **no puede ser actor**. Los commands aceptan `member` (tú), `system` o `cli`, y los gates humanos exigen `member`. |

El `idempotencyKey` te protege: si el comando se corre dos veces, no nacen dos propuestas. Devuelve la misma.

> **Equivalente por API** (cuando exista la UI, es la misma puerta): `POST /api/commercial/proposals`.

### Paso 3 — Sube el RFP y registra la evidencia

Dos cosas distintas, y la diferencia importa mucho.

**El RFP** es el documento fuente. Se ingiere como asset del sistema (pasa por el scan de seguridad del asset store, como cualquier archivo):

```text
Sube el RFP de la propuesta [proposalId] al asset store:
archivo docs/commercial/tenders/sky-blog-2026/bases/[nombre].pdf,
kind rfp_source. Usa ingestProposalRfp. Actor: member julio-reyes.
```

**La evidencia** es otra cosa: es **cada dato duro que la propuesta va a afirmar**, con su fuente. "El blog de SKY no aparece citado por ningún motor de IA" no es una opinión: es un número que salió del AI Visibility Grader, con fecha. Eso se registra.

La **Radiografía AEO** también puede ser evidencia cuando el enlace viaja al comité: no mide el hueco, sino que demuestra la ejecución sobre un hueco concreto. Regístrala como `client_facing` sólo si la muestra está autorizada para ser vista por el comprador y conserva su URL tokenizada.

```text
Registra esta evidencia en la propuesta [proposalId]:

- Fuente: docs/commercial/tenders/sky-blog-2026/oferta-tecnica.md
- Locator: "oferta-tecnica.md (completa)"
- Method: "documento de oferta redactado y aprobado por el equipo"
- asOf: 2026-07-12
- Classification: attested
- Audience: client_facing
- Actor: member julio-reyes

Usa recordProposalEvidence.
```

**`audience` es el campo más peligroso del sistema. Es obligatorio y no tiene default seguro.**

| Evidencia | `audience` | Por qué |
|---|---|---|
| La oferta técnica, el diagnóstico que le muestras al cliente, un caso citable, la Radiografía AEO autorizada | `client_facing` | Es lo que el comité va a leer o abrir |
| **El squad blueprint** | **`internal`** | Lleva el **loaded cost por rol**: es tu estructura de costos |
| **El scoring bid/no-bid, el margen, el walk-away** | **`internal`** | Es tu **piso de negociación** |
| El diagnóstico técnico interno (la lente que justifica el scope) | **`internal`** | Al cliente va sólo la lente medida |

Si marcas `internal` algo que debía ir al cliente, lo peor que pasa es que el render se rechace y lo corrijas. Si marcas `client_facing` algo interno, **le estás entregando a la contraparte tu estructura de costos**. Piénsalo dos veces en cada fila.

**Los requisitos** (opcional pero muy recomendado): el literal del RFP, tipado. De aquí salen las restricciones automáticas del render — entre ellas si el RFP exige accesibilidad, que es un rechazo duro (§5).

```text
Declara los requisitos de la propuesta [proposalId] desde las bases:
por cada requisito, el texto literal + su kind (excluyente | puntua |
economic_minimum | format | deadline | penalty | sla).
Usa declareProposalRequirement.
```

### Paso 4 — Construye el argumento (aquí manda el método, no el motor)

Este es el trabajo de verdad, y **no lo hace el Proposal Studio**: lo haces tú con las skills. Diagnóstico del activo real del cliente, benchmark de su competencia, diseño del squad, pricing sobre loaded cost, redacción con pase de copywriting, revisión multi-lente.

Todo eso está en `bid-construction-playbook.md`, fases 3 a 9.5. Pídeselo al agente cargando la skill:

```text
Carga la skill greenhouse-public-private-tenders y corre las fases 3 a 8 del
bid-construction-playbook para la propuesta [proposalId]:
diagnóstico del activo real (corre el AI Visibility Grader), benchmark competitivo,
squad, pricing sobre loaded cost real, oferta técnica y oferta económica.
Registro formal (de usted), NO tuteo — es un documento que evalúa un comité.
Si el servicio es SEO/AEO, evalúa si corresponde incluir la Radiografía AEO como
muestra viva: Grader mide el hueco; Radiografía demuestra la ejecución.
```

Al final de esta fase tienes la **oferta técnica** y la **oferta económica** escritas. El deck viene después: **el deck no es la propuesta, es su presentación**.

### Paso 5 — El plan del deck

El deck se **compone** desde un catálogo cerrado de 25 plantillas (`deck-axis`). **No se diseña freehand.** Tú (o el agente) declaras un plan: qué láminas, de qué tipo, con qué contenido. El motor decide la plantilla.

```text
Arma el plan del deck para la propuesta [proposalId], siguiendo la Fase 9-bis del
bid-construction-playbook + deck-visual-system.md.
Entrada: la oferta técnica ya aprobada. Salida: un deck-plan.json.

Regla dura: declara contentType + slots por lámina. NUNCA declares 'template'
(el selector lo elige; si lo contradices, revienta con TemplateAuthorityError).
Toda cifra tiene que ser trazable a una evidencia registrada. Nada ilustrativo.
```

Para verlo antes de meterlo al camino gobernado, hay un CLI exploratorio que **no toca la base de datos y no necesita permisos**:

```bash
pnpm deck:compose docs/commercial/tenders/sky-blog-2026/deck-plan.json --out .captures/sky-bid
```

Eso te deja PNG + PDF locales para mirar. **Míralos.** Esta es tu iteración barata: aquí ajustas el plan hasta que el deck se lea bien. Detalle completo en `generar-el-deck-de-una-propuesta.md`.

### Paso 6 — Pide el render gobernado

El plan te gustó. Ahora sí: el camino productivo. Aquí el sistema sella el manifest (una huella criptográfica de exactamente qué se va a renderizar, con qué plantillas, qué marca y qué fuentes), corre los gates, y encola el trabajo.

```text
Encola el render gobernado del deck de la propuesta [proposalId]:

- deck-plan: docs/commercial/tenders/sky-blog-2026/deck-plan.json
- artifactPurpose: deck
- audience: client_facing
- outputTarget: pdf-merged
- evidenceIds: [las evidencias que el deck cita]
- Actor: member julio-reyes

Resuelve el manifest con resolvePlan(deckAxisCatalog, ...) y encola con
requestProposalRender. ANTES de ejecutar, muéstrame:
  1. Cuántas láminas resolvió y si los validadores pasaron
  2. Los BLOCKERS que detectaste (si hay alguno)
  3. El audience de cada evidencia que estoy citando
  4. El deadline y las constraints que salieron de los requisitos del RFP
Espera mi confirmación explícita.
```

---

## Cómo revisas y apruebas: el propose → confirm

Este es el corazón del sistema y la razón por la que puedes dejar que un agente maneje el proceso sin perder el control.

**El agente propone. Tú confirmas. El mismo command ejecuta.** Los agentes (`intake-agent.ts`, `render-agent.ts`) están construidos así por diseño: no tienen acceso a la base de datos, no encolan nada, no suben nada. Producen una **propuesta tipada** que cita sus inputs.

### Lo que el agente está OBLIGADO a mostrarte antes de ejecutar

El agente de render tiene que declarar sus **`blockers`** — los bloqueos que él mismo detectó. Y aquí está lo bueno: **la validación del sistema los recomputa desde cero**. Si el agente escondió un bloqueo (por bug, por alucinación, por lo que sea), **la propuesta completa se rechaza**. No hay forma de que te pase de contrabando un render que no debía correr.

Los tres bloqueos que el agente puede declarar:

| Blocker | Qué significa |
|---|---|
| `internal_evidence_for_client_facing` | Estás citando una evidencia interna en un artefacto que va al cliente |
| `deadline_expired` | El deadline de la propuesta ya pasó |
| `accessibility_required` | El RFP exige accesibilidad (PDF/UA, Section 508, EAA) y este motor no la puede entregar |

### Lo que TÚ tienes que mirar antes de decir "dale"

1. **Los blockers.** Si hay uno, **no lo ignores**: cada uno significa que el sistema va a rechazar el job de todos modos (fallan cerrado al encolar, no esperan al worker). Resuélvelo primero.
2. **El `audience` de cada evidencia citada.** Lee la lista. Una sola evidencia `internal` en un deck `client_facing` rechaza **todo el job**. Y si por algún motivo pasara — es tu estructura de costos, en manos del cliente.
3. **El deadline.** ¿Es el de las bases? ¿Todavía no venció?
4. **Que las cifras del plan tengan evidencia detrás.** El sistema valida forma; **el juicio del argumento es tuyo**.

### Por qué la confirmación es tuya y no del modelo

Porque un LLM puede estar convencido de algo falso con total elocuencia. El sistema no le pregunta al modelo si está seguro: le exige que un humano firme. **En la base de datos no existe `actor_kind = 'agent'`.** No es una política que alguien pueda saltarse con un flag: la columna no admite ese valor.

### Los gates humanos de estado (la máquina no los cruza)

Una propuesta atraviesa estados. La mayoría de las transiciones son mecánicas. **Tres no lo son**, y esas exigen un `member` humano — lo exige el command y lo exige la base de datos:

| Gate | Qué estás decidiendo de verdad |
|---|---|
| `fit_review → producing` | **Vamos.** Estás comprometiendo el tiempo del equipo a este bid. |
| `fit_review → declined` | **No vamos.** Terminal: no se reabre (una propuesta nueva, si cambia el escenario). |
| `packaging → ready_to_submit` | **Esto está listo para que un comité lo evalúe.** Estás firmando que la admisibilidad está completa y que el paquete es entregable. |

El recorrido completo de estados:

```
intake → analyzing → analyzed → fit_review ─┬→ declined  (terminal)
                                            └→ producing → base_ready → packaging
                                               → ready_to_submit → submitted → won | lost
```

Ninguna máquina puede decidir "sí vamos a esta licitación" ni "esto está listo para el comité". Esas son decisiones de negocio con consecuencias, y por eso llevan tu nombre.

Detalle de cada estado y de las transiciones en `crear-y-operar-una-propuesta.md`.

---

## Cómo obtienes el PDF

Encolaste el job. ¿Y ahora?

**El dispatcher lo toma solo.** Corre cada 2 minutos, elige el próximo job por **deadline + antigüedad** (un bid con deadline duro no espera detrás de un batch de carruseles; y un job viejo no se queda esperando para siempre), y lanza el worker en Cloud Run. Para un deck de 15 láminas: **~25 segundos**. Tú no haces nada.

**Cómo ves el estado** (la verdad vive en la base de datos, no en Cloud Run):

```sql
SELECT state, failure_code, failure_detail, attempts, output_pdf_asset_id
FROM greenhouse_commercial.proposal_render_jobs
WHERE render_job_id = 'prnd-...';
```

O simplemente:

```text
Dime el estado del render job [renderJobId] de la propuesta [proposalId].
```

Los estados del job: `queued` → `dispatched` → `running` → `completed`. O `failed` / `dead_letter` si algo salió mal (§ siguiente).

**Dónde queda el PDF:** en el **asset store privado** de Greenhouse (no en tu disco, no en un bucket público). Queda registrado como asset del sistema, vinculado a la propuesta con su `audience`, y con un evento de outbox. Junto al PDF quedan los **previews PNG** de cada lámina.

**Cómo lo bajas:**

```text
Bájame el PDF del render job [renderJobId] a ~/Desktop/[nombre].pdf
```

El agente resuelve el `output_pdf_asset_id` del job y lo trae desde el asset store (`GET /api/assets/private/<assetId>` desde el portal con sesión, o directo del bucket con `gcloud storage cp` usando `bucket_name` + `object_path` de `greenhouse_core.assets`).

### 🔴 La regla de oro: MIRA el PDF antes de subirlo

El sistema corre una **QA mecánica** sobre cada render, y es buena. Detecta:

- **Fuente en fallback** — el deck salió en una tipografía que no es la de marca (`font_fallback_detected`)
- **Asset ausente** — una imagen o un logo que no cargó (`missing_asset`)
- **Lámina en blanco** — una lámina con densidad de contenido por debajo del piso (`blank_slide`)
- **Geometría** — contenido que se sale del canvas (`geometry_rejected`)
- **Peso** — el PDF pasado del límite del RFP (`size_rejected`)

Eso es lo que una máquina **puede** juzgar: que el artefacto no esté roto.

**Lo que ninguna máquina juzga: si el argumento convence.** Si la lámina de pricing ancla valor o parece cara. Si el diagnóstico se lee como un insight o como un reproche. Si el orden de los capítulos construye la historia. Si esa cifra, que técnicamente es correcta, dice lo que tú quieres que diga.

**Abre el PDF. Léelo entero. Después súbelo.** No hay atajo, y no lo va a haber: la QA mecánica existe justamente para que tu atención humana se gaste en el argumento y no en cazar un logo roto.

---

## Qué haces si falla

El sistema falla cerrado y con un código. Aquí están los que vas a ver de verdad, en el orden en que importan. El catálogo completo, con todos los códigos, está en **`entender-los-errores-y-rechazos.md`**.

### 🔴 `audience_violation` — evidencia interna en un deck para el cliente

**El más grave de todos.** El deck que ibas a mandar cita una evidencia marcada `internal`.

**Por qué es el peor:** lo `internal` es el **squad blueprint** (loaded cost por rol) y el **scoring** (tu margen, tu walk-away). No es un tema de permisos: es que **si eso llega al comité, le entregaste a la contraparte tu piso de negociación**. Van a negociar sabiendo exactamente hasta dónde puedes bajar. Es la diferencia entre ganar la licitación y regalarla.

**El sistema lo rechaza ANTES de renderizar** — al encolar, no al terminar. Una sola referencia interna rechaza el job completo.

**Qué haces:** mira la lista de `evidenceIds` que estás citando. Encuentra la que está marcada `internal`. Tienes dos caminos, y sólo dos:
- **La sacas del deck** (era interna por una razón: es munición tuya, no del cliente), o
- **Registras una evidencia nueva, `client_facing`**, con la versión del dato que sí puede ver el cliente (la lente medida, no la lente interna).

Lo que **no** haces: "cambiarle el audience" a la evidencia interna para que pase. Eso es apagar la alarma de incendio.

**No se reintenta.** El retry produciría exactamente el mismo rechazo. Necesitas un manifest nuevo.

### 🔴 `accessibility_unsupported` — el RFP exige accesibilidad

El requisito-set del RFP declara accesibilidad (PDF/UA, Section 508, European Accessibility Act). **Este motor no la puede entregar**: el renderer usa Chromium print-to-PDF, que emite PDF **sin taguear**. No es un ajuste, no es una opción escondida — **es el motor**.

**Por qué el sistema prefiere rechazar:** mejor no ofertar que entregar un artefacto **inadmisible**. Un PDF sin taguear en una licitación que exige accesibilidad se cae en admisibilidad, y perdiste el bid y el tiempo.

**Qué haces:** esto es una **decisión comercial, no técnica**. Vuelve a Fase 1 del playbook: ¿el requisito es excluyente? Si lo es y no lo puedes cumplir por otra vía (un PDF producido fuera del sistema, con una herramienta que sí tague), **es NO-BID**. Registra la decisión, no la pelees con el motor.

**No se reintenta.**

### `deadline_expired` — el plazo ya pasó

El deadline de la propuesta venció. El sistema no renderiza artefactos para un bid que ya cerró.

**Qué haces:** verifica contra las bases. Si el deadline registrado estaba mal (pasa: bases ambiguas, `deadlineConfidence: 'ambiguous'`), **corrígelo en la propuesta** con el supuesto documentado y vuelve a encolar. Si realmente venció, el bid se acabó — mueve la propuesta a su estado terminal.

### `size_rejected` — el PDF pesa más de lo que el RFP permite

El RFP declaró un peso máximo (o aplica el default de 20 MB) y el PDF lo pasó. Casi siempre son imágenes pesadas en las láminas.

**Qué haces:** vuelve al plan del deck. Reduce el peso de los assets (una foto de 8 MB no aporta 8 MB de argumento), o baja el número de láminas con imagen full-bleed. Vuelve a componer con `pnpm deck:compose` para verificar el peso local antes de reencolar.

**No se reintenta con el mismo manifest.**

### `missing_asset` / `font_fallback_detected` / `blank_slide` — el deck salió degradado

La QA mecánica hizo su trabajo: una imagen no cargó, una fuente cayó en fallback, o una lámina quedó prácticamente vacía.

**Qué haces:** casi siempre es el plan. Un `src` de imagen que apunta a un archivo que no existe. Una lámina con slots que quedaron sin contenido. Arréglalo en el `deck-plan.json`, verifica con `pnpm deck:compose`, y reencola.

### `manifest_drift` — cambió el catálogo debajo de tus pies

El worker, antes de renderizar, **re-resuelve el manifest contra el catálogo que él tiene**. Si la huella no coincide con la que se selló al encolar, **no renderiza**. Significa que entre que encolaste y que el worker corrió, cambió una plantilla, la marca o una fuente.

**Qué haces:** vuelve a resolver el plan y encola de nuevo. No es un bug: es el guardia que garantiza que lo que apruebas es exactamente lo que sale. (En la corrida real de SKY, este check cazó tres bugs de verdad el primer día.)

### `render_error` / `timeout` / `dispatch_error` — se rompió algo

Estos **sí se reintentan**. El sistema lo hace solo (hasta agotar los intentos). Si un job queda en `dead_letter`, hay algo estructural — ahí entra `operar-el-artifact-worker.md`.

---

## El caso guía completo: SKY, de punta a punta

Esta corrida es real. Ocurrió el **2026-07-12**, con la propuesta técnica de verdad de SKY Airline (Gestión del blog 2026, vía Wherex). Es el mejor ejemplo vivo del sistema porque **atravesó el camino gobernado completo, sin ningún atajo** — y produjo el PDF que el operador tuvo en las manos.

El script que la ejecuta está en el repo y se puede leer: `scripts/commercial/_sanity-sky-render-pipeline.ts`.

### Los 5 pasos, y lo que devolvió cada uno

**1 · La propuesta nace** (`createProposal`)

```
SKY — Gestión del blog 2026 (Wherex)
origin: private_rfp · plataforma: Wherex · moneda: CLP
deadline: 2026-07-15 18:00Z · confidence: ambiguous
supuesto: "Bases §2.5: se asume la fecha de cierre de recepción de ofertas."
→ prop-5965260d…
```

Fíjate en el `deadlineConfidence: ambiguous` con el supuesto escrito. Las bases eran ambiguas. **No se resolvió a ojo: se declaró la ambigüedad y el supuesto quedó guardado.**

**2 · La evidencia** (`recordProposalEvidence`)

```
fuente: docs/commercial/tenders/sky-blog-2026/oferta-tecnica.md
method: "documento de oferta redactado y aprobado por el equipo"
asOf: 2026-07-12 · classification: attested · audience: client_facing
```

La oferta técnica es la **fuente de los claims del deck**. El deck no afirma nada que no venga de ahí.

**3 · El manifest** (`resolvePlan` sobre el `deck-plan.json` real)

```
→ 15 láminas · catálogo deck-axis · 4 validadores pass
```

**4 · El render gobernado** (`requestProposalRender`)

```
artifactPurpose: deck · audience: client_facing · outputTarget: pdf-merged
actor: member = el operador (su instrucción explícita ES la confirmación humana)
→ job prnd-518535f0… queued
   hash sellado · constraints del RFP fijadas · deadline fijado
```

**5 · El worker** (Cloud Scheduler → dispatcher → Cloud Run Job)

```
claim (SKIP LOCKED) → drift check → compose + los 7 gates → asset store staging
→ completed

PDF: 3.158.296 bytes (3,16 MB) · 15 láminas · 25,2 segundos · attempts = 1
asset privado: asset-988fbb9a… (bucket …-private-assets-staging)
vínculo proposal_assets (deck / client_facing) · outbox render_completed publicado
```

**Al primer intento.** Y el operador lo revisó con sus ojos antes de darlo por bueno (`~/Desktop/SKY-BLOG-2026-cloudrun.pdf`).

### El benchmark, para que sepas qué esperar

| Deck | Tiempo | Peso | Intentos |
|---|---|---|---|
| **SKY, 15 láminas** (el real) | **25,2 s** | **3,16 MB** | 1 |
| 25 láminas (bench) | 32,3 s | 5,56 MB | 1 |

Envelope confirmado: 2 vCPU / 2 GiB. La cola aguanta hasta 30 jobs/hora (uno cada 2 minutos); opera pensando en **10-15 jobs/hora** hasta tener más datos. No extrapoles a otros formatos.

### Lo que la corrida enseñó (y por qué importa para ti)

El sistema **cazó tres bugs reales el primer día** — no en tests, en la corrida. Y los cazó **fallando cerrado**: el drift check frenó los renders que hubieran salido inconsistentes. Después, el smoke en Cloud Run encontró cinco cosas más (una plantilla con una ruta absoluta del Mac de alguien horneada adentro, un gate que juzgaba una imagen antes de que cargara).

**La lectura para el operador:** cuando el sistema te rechaza un render, la probabilidad de que sea un falso positivo es baja. Léelo. Casi siempre tiene razón.

---

## Operar desde Nexa (el chat)

Todo lo anterior — registrar la propuesta, adjuntarle el RFP, registrar evidencia, pedir el deck — **también se puede hacer hablándole a Nexa**, sin terminal y sin comandos. No es un camino paralelo ni un atajo: Nexa es **otro cliente de la misma máquina**, con los mismos gates, los mismos rechazos y la misma confirmación humana.

### El estado real, hoy (léelo antes de intentarlo)

Esto está **construido y probado, pero apagado por defecto**. Nexa opera propuestas sólo cuando el flag `NEXA_PROPOSAL_ACTIONS_ENABLED` está prendido en el entorno donde estás (además del flag maestro de acciones de Nexa, `NEXA_ACTION_RUNTIME_ENABLED`).

| Situación | Qué pasa |
|---|---|
| **Flag apagado** (lo que verás hoy si no se prendió) | Nexa te dice, sin rodeos, que las acciones gobernadas no están habilitadas. **No inventa, no simula, no "hace como que"**. |
| **Flag prendido** | Nexa opera el ciclo completo, con la tarjeta de confirmación que verás más abajo. |
| **Pedir el deck** (`request_proposal_render`) | Necesita **además** `ARTIFACT_RENDER_JOBS_ENABLED` en el mismo entorno. Hoy está prendido en staging y **apagado en producción, por diseño**. |

**Mientras tanto, el camino vivo del día a día es el que documenta el resto de este manual**: tú + Claude Code + los comandos. No hay pantalla del Proposal Studio en el portal, y esta sección no te promete una.

### Lo que puedes preguntarle (sólo lectura, no cambia nada)

Nexa tiene un tool de consulta del Proposal Studio. Puedes escribirle literalmente:

```text
¿Cómo va la propuesta de SKY?
```

```text
¿Qué licitaciones tengo abiertas?
```

```text
¿Ya está el deck de SKY? Pásame el link para descargarlo.
```

```text
Muéstrame también las propuestas cerradas (ganadas, perdidas, declinadas).
```

Lo que te responde, por propuesta:

- **En qué etapa está** (el estado del recorrido: `intake`, `fit_review`, `producing`, `ready_to_submit`…).
- **Cómo viene el plazo**: vencido, **con el plazo encima** (menos de 72 horas), tranquilo, o **sin fecha declarada**.
- **Cuánto tiene cargado**: cuántas evidencias, cuántos documentos, cuántos requisitos.
- **Si su documento ya está listo**, con el **link de descarga** del último artefacto. Ese link vuelve a verificar tus permisos cada vez que lo abres: no es un link público, no lo reenvíes esperando que le funcione a alguien de afuera.
- **Si hay renders en curso** o alguno que necesita que lo mires.

**Lo que Nexa NO te muestra por acá:** el contenido del RFP ni el de la evidencia. El tool devuelve estado y metadatos, nunca el texto de los documentos.

### Lo que puedes pedirle (las cuatro acciones)

Estas cuatro **sí cambian algo**, y por eso ninguna se ejecuta sola: Nexa **propone**, tú **confirmas** en una tarjeta, y recién ahí el sistema ejecuta.

| Le pides… | Frase que puedes escribir | Lo que Nexa necesita que le digas |
|---|---|---|
| **Abrir la propuesta** | `Registra una propuesta nueva para SKY: "SKY — Gestión del blog 2026", es un RFP privado por Wherex, cierra el 15 de julio a las 18:00 y la fecha es ambigua (las bases dan dos). Moneda CLP.` | El **cliente por su nombre** ("SKY"), el título, el origen (licitación pública / RFP privado / venta directa) y, si lo sabes, el deadline. |
| **Adjuntar el RFP** | `Adjunta este documento a la propuesta de SKY como rfp_source.` | El **archivo ya subido** (ver abajo) y de qué tipo es (el RFP, un anexo, la oferta técnica, la matriz de admisibilidad, el deck…). |
| **Registrar evidencia** | `Registra una evidencia para la propuesta de SKY: sale de la oferta técnica, es un documento atestiguado por el equipo, con fecha 2026-07-12, y va para el comprador.` | De **dónde sale** el dato, **cómo se obtuvo**, su **fecha de vigencia**, si es medida / atestiguada / ilustrativa, y —lo más importante— si es **interna** o **para el comprador**. |
| **Pedir el deck / PDF** | `Genera el deck de la propuesta de SKY para el comprador, con la evidencia que ya registramos.` | La propuesta, para quién es el artefacto, y el **plan del deck ya compuesto** (el que produce `pnpm deck:compose`). |

**Antes de adjuntar un documento tienes que subirlo.** El archivo no viaja por el chat: se sube al almacén privado de Greenhouse (pasa por el escaneo de seguridad, como cualquier archivo del portal) y eso te devuelve un identificador que es lo que Nexa usa después. Por HTTP:

```bash
curl -X POST '<portal>/api/assets/private' \
  -F 'contextType=proposal_rfp_draft' \
  -F 'file=@bases-sky-blog-2026.pdf'
# → { assetId: "asset-..." }
```

(Para un entregable — la oferta técnica, el deck que produjiste aparte — el `contextType` es `proposal_deliverable_draft`.)

### Qué ves ANTES de confirmar

Nexa nunca ejecuta al toque. Te muestra una **tarjeta** con exactamente lo que va a pasar, y ahí decides. Lo que trae cada una:

| Acción | La tarjeta te muestra |
|---|---|
| **Registrar propuesta** | Cliente · Origen · **Deadline** (y si es ambiguo, lo dice) · Moneda. Y te aclara que la propuesta queda en estado inicial: **todavía no compromete nada ante el comprador**. |
| **Adjuntar documento** | Tipo del documento · **Visibilidad**: interna o al comprador. Nexa te aclara que **no lee el contenido ni lo publica**: sólo lo deja asociado. |
| **Registrar evidencia** | El título mismo de la tarjeta te grita el destino: *"Registrar evidencia **INTERNA**"* o *"Registrar evidencia **PARA EL COMPRADOR**"*. Más su clasificación, su fecha de vigencia y de dónde sale. |
| **Pedir el deck** | Para quién es (el comprador / interno) · cuántas láminas · **cuántas evidencias cita** · el límite de peso que impuso el RFP. |

**Mira siempre la visibilidad.** Es el campo que decide si un dato tuyo puede salir de Efeonce. Una evidencia marcada *interna* lleva tu estructura de costos y tu piso de negociación: si por error la marcas *para el comprador*, se la estás entregando a la contraparte. Esa fila de la tarjeta existe justamente para que nadie confirme eso sin darse cuenta.

La tarjeta **caduca a los 5 minutos**. Si te distraes, pídesela de nuevo — es a propósito: no quieres confirmar una propuesta armada con datos de hace media hora.

### Qué pasa cuando confirmas

El sistema ejecuta el **mismo comando** que correrías por terminal — no hay una "versión Nexa" más suelta — y te responde qué quedó hecho:

- **Registraste la propuesta** → te dice el estado en que quedó y cuál es el siguiente paso (adjuntarle el RFP).
- **Adjuntaste el documento** → te confirma con qué visibilidad quedó.
- **Registraste la evidencia** → te confirma si quedó interna (y por lo tanto **no podrá citarse** en nada que vea el comprador) o si ya puede citarse en la oferta.
- **Pediste el deck** → te dice que quedó **encolado**. El archivo se genera aparte y tarda unos minutos; después lo bajas con el link que te da `proposal_status`.

**Si pides dos veces lo mismo, no se duplica nada.** Si vuelves a pedir el mismo deck, con el mismo contenido y el mismo propósito, el sistema te devuelve **el mismo artefacto** en vez de generar otro. Lo mismo con la propuesta y con el documento adjunto: Nexa te lo dirá ("eso ya estaba registrado; no dupliqué nada"). Si quieres un deck distinto, **cambia el plan** — eso cambia el contenido, y entonces sí es un artefacto nuevo.

### Cuando Nexa NO puede (y te lo dice)

Esta es la parte que más conviene conocer, porque la vas a ver. **Nexa prefiere decirte que no antes que inventarte un sí.** Lo que hace en cada caso:

| Situación | Qué hace Nexa |
|---|---|
| **El cliente que nombraste es ambiguo** (hay varias organizaciones que podrían ser) | **Te pregunta cuál**. No elige por ti. |
| **El cliente no existe** en el sistema | **Te lo dice**. No inventa una organización ni un identificador para salir del paso. |
| **No sabes el deadline / las bases no lo dicen** | La propuesta queda **"sin fecha declarada"**. Nexa **no inventa una fecha**. Y si le declaras una, tiene que decir si es confirmada o ambigua — una fecha inventada te hace perder el proceso. |
| **La visibilidad del documento adjunto** | **Nexa no la elige.** Se aplica el valor seguro que corresponde a ese tipo de documento, y la tarjeta te lo muestra. Un agente no re-clasifica qué puede salir al comprador. |
| **Citaste una evidencia interna en un artefacto para el comprador** | Nexa **no te propone nada**: te explica que el artefacto se rechazaría completo. Es el mismo `audience_violation` de más arriba, pero atajado antes — **no vas a ver una tarjeta que te promete un PDF que iba a fallar cerrado**. |
| **El deadline ya venció, el RFP exige accesibilidad, o un control del deck está en rojo** | Igual: **no propone, explica el motivo**. Los mismos gates, con las mismas razones. |
| **Tu organización no tiene contratado el Proposal Studio** | Te lo dice tal cual. Sin el módulo `proposal_studio_v1`, nadie opera — ni tú, ni un admin. |
| **No tienes permiso** para esa operación | Te lo dice, y no propone. |

### Lo que NO cambia porque lo pidas por chat

| Sigue igual | Por qué |
|---|---|
| **Propone → confirmas → ejecuta** | Nexa **nunca escribe**. Propone; **tú** confirmas; el mismo comando de siempre ejecuta. No hay camino privilegiado para el chat. |
| **Los gates humanos de estado** | "Vamos a este bid", "no vamos", "esto está listo para el comité" siguen exigiendo una persona. Nexa **no puede cruzarlos**, ni con un bug: la base de datos no admite un actor agente. |
| **La visibilidad de la evidencia** | Un deck para el comprador con una evidencia interna se rechaza **entero**. Nexa no lo salta; lo detecta antes. |
| **La QA mecánica y tu juicio** | Nexa te va a dejar el PDF más rápido. **Igual tienes que abrirlo y leerlo entero antes de subirlo.** |
| **El deadline, la accesibilidad, el peso** | Los mismos controles, fallando cerrado, con los mismos códigos de la sección "Qué haces si falla". |

Nexa no es "el sistema con menos frenos". Es **la misma máquina, con una puerta más cómoda**.

---

## Qué NO hacer

- **NUNCA** escribir SQL directo contra `greenhouse_commercial.proposals` o sus tablas. Los triggers son append-only y los gates humanos viven **en la base de datos**: no vas a lograr saltarlos, sólo vas a romper la trazabilidad intentándolo.
- **NUNCA** cambiarle el `audience` a una evidencia interna para que el render pase. Eso es apagar la alarma de incendio en vez de apagar el incendio.
- **NUNCA** subir el PDF al portal del cliente sin abrirlo y leerlo entero. La QA mecánica cubre que no esté roto, no que convenza.
- **NUNCA** declarar `template` en el plan del deck. El selector elige la plantilla; si lo contradices, el motor revienta a propósito (`TemplateAuthorityError`).
- **NUNCA** empezar a construir la propuesta antes de correr la admisibilidad. Es la decisión más cara que puedes tomar mal.
- **NUNCA** meter una cifra en el deck que no tenga una evidencia registrada detrás. En una licitación, afirmar algo falso no es un error de estilo: es un problema.
- **NUNCA** tutear al cliente en un documento client-facing. Registro formal (de usted, institucional). El deck y la oferta los evalúa un comité, y pasan a formar parte del contrato.
- **NUNCA** confirmar una tarjeta de Nexa sin leer la fila de **visibilidad**. Es el único campo que decide si un dato tuyo puede salir de Efeonce, y confirmar es tu firma: el sistema ejecuta porque **tú** lo autorizaste.

---

## Problemas comunes

**"El comando falla diciendo que la organización no tiene el módulo."**
La organización dueña necesita el entitlement `proposal_studio_v1` asignado (`module_assignments`). Es una **puerta doble**: capability del usuario **+** módulo contratado por la org. Sin el módulo, nadie opera — ni tú, ni un admin.

**"Encolé el render y no pasa nada."**
El flag `ARTIFACT_RENDER_JOBS_ENABLED` es **multi-runtime**: tiene que estar prendido en tres lugares distintos (el que encola, el dispatcher del ops-worker, y el Job de Cloud Run). Si falta en uno, el flujo se corta en silencio en ese punto. Diagnóstico en `operar-el-artifact-worker.md`. Y recuerda: **en producción está apagado por diseño**.

**"Pedí el mismo render dos veces y me devolvió el mismo job."**
Es correcto. La clave de idempotencia es `(organización, propuesta, hash del manifest, propósito del artefacto)`. Si nada cambió, no hay nada nuevo que renderizar. Si quieres un render distinto, **cambia el plan** — eso cambia el hash.

**"El job dice `dead_letter`."**
Agotó sus reintentos o falló con un código no reintentable. Mira el `failure_code`: si es uno de los "no se reintenta" (`audience_violation`, `accessibility_unsupported`, `semantic_rejected`, `size_rejected`, `geometry_rejected`, `manifest_drift`), **reintentar no sirve** — necesitas un manifest nuevo. Arregla la causa y vuelve a encolar.

**"El deck se ve bien en `pnpm deck:compose` pero el render gobernado lo rechaza."**
Normal, y es buena señal. El CLI **no corre los gates del dominio** (audience, deadline, constraints del RFP): es exploratorio. Los gates viven en el camino gobernado. El CLI te dice si el deck **se ve** bien; el camino gobernado te dice si **se puede entregar**.

**"¿Dónde quedó mi PDF?"**
En el asset store privado, vinculado a la propuesta. El `output_pdf_asset_id` está en la fila del job (`greenhouse_commercial.proposal_render_jobs`). Nunca en un bucket público.

**"Le pedí a Nexa que registre una propuesta y me dice que no está habilitado."**
Es el comportamiento correcto, no un error: el bloque de propuestas de Nexa está **apagado por defecto** (`NEXA_PROPOSAL_ACTIONS_ENABLED`, más el flag maestro `NEXA_ACTION_RUNTIME_ENABLED`). Mientras no se prenda en ese entorno, opera por el camino de este manual (tú + Claude Code). Y ojo: prender un flag es **multi-runtime** — se prende donde se lee, no "en Vercel" a secas.

**"Nexa me dice que no puede generar el deck y explica por qué, en vez de mostrarme la tarjeta."**
También es correcto. Nexa corre los mismos controles del render **antes** de proponerte nada: si el artefacto iba a ser rechazado (evidencia interna citada para el comprador, deadline vencido, accesibilidad exigida, un control en rojo), prefiere explicártelo a ofrecerte un botón que iba a fallar. Arregla la causa —está en "Qué haces si falla"— y vuelve a pedírselo.

---

## Referencias técnicas

**Manuales hermanos** (misma carpeta):
- `README.md` — índice del dominio
- `crear-y-operar-una-propuesta.md` — estados, evidencia, requisitos, transiciones
- `generar-el-deck-de-una-propuesta.md` — el catálogo, las plantillas, el plan
- `entender-los-errores-y-rechazos.md` — catálogo completo de códigos de fallo
- `operar-el-artifact-worker.md` — cola, dispatcher, reintentos, flags, diagnóstico

**El método comercial:**
- `.claude/skills/greenhouse-public-private-tenders/bid-construction-playbook.md` — las 10 fases del bid
- `.claude/skills/greenhouse-public-private-tenders/proposal-studio-runtime.md` — el mapa del motor para agentes

**El código (para quien quiera bajar):**
- `src/lib/commercial/tenders/proposals/` — el aggregate: `store.ts` (commands) · `assets.ts` (RFP + evidencia + requisitos) · `render-jobs.ts` (la cola y sus gates) · `render-constraints.ts` (RFP → restricciones) · `intake-agent.ts` y `render-agent.ts` (el molde propose→confirm)
- `src/lib/artifact-composer/` — el motor de composición y el catálogo `deck-axis`
- `services/artifact-worker/` — el Cloud Run Job que renderiza (+ su `README.md`)
- `scripts/commercial/_sanity-sky-render-pipeline.ts` — **la corrida real de SKY, ejecutable**

**El caso real:**
- `docs/commercial/tenders/sky-blog-2026/` — bases, oferta técnica, oferta económica, `deck-plan.json`, y los artefactos `(INTERNO)` que **nunca** se entregan

**Las tasks:**
- `docs/tasks/complete/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md` — el worker + la evidencia de la corrida (Delta d y e)
- TASK-1392 — el dominio `Proposal`
- TASK-1393 — el motor de composición
