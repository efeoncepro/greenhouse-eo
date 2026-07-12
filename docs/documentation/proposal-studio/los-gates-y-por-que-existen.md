# Proposal Studio — los gates y por qué existen

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-12 por Claude
> **Ultima actualizacion:** 2026-07-12 por Claude
> **Documentacion tecnica:** [COMMERCIAL_TENDERS_AGENT_INVARIANTS.md](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md) · [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md) · [ISSUE-121](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md)

## Por qué este documento es el corazón del sistema

Casi todo lo que el Proposal Studio hace de interesante es **negarse a hacer algo**. Cada negativa
tiene una razón de negocio concreta, y casi siempre es una razón de la que ya nos quemamos.

El principio de fondo es uno solo:

> **Un entregable que sale mal *pareciendo bien* es peor que un fallo.** Porque nadie lo revisa dos
> veces. Todo lo que el sistema no pueda garantizar, **aborta**.

Una propuesta no es un documento de marketing: es un **documento contractual que evalúa un comité** y
que, si se adjudica, pasa a formar parte del contrato. Con esa vara se leen todos los gates que
siguen.

---

## 1 · Audiencia por referencia — el gate que impide regalar el piso de negociación

**La mecánica:** cada evidencia registrada declara si es `internal` o `client_facing`. Un artefacto
destinado al cliente que cite **una sola** evidencia interna se rechaza **completo**
(`audience_violation`), **antes** de renderizar. No es una advertencia. No filtra la evidencia mala y
sigue: rechaza el pedido entero.

**La razón de negocio:** el material interno de una licitación **no es información sensible en
abstracto — es munición**.

| Artefacto interno | Qué contiene | Qué pasa si se filtra |
|---|---|---|
| **Squad blueprint** | El **loaded cost** por rol (lo que realmente cuesta cada persona) | Le entregas al comprador **tu estructura de costos** |
| **Scoring bid/no-bid, walk-away, margen** | Hasta dónde estás dispuesto a bajar | Le entregas **tu piso de negociación** |
| **Diagnóstico interno** | La lente técnica sin filtrar | Le entregas lo que ni tú afirmarías en público |

Ninguno de esos documentos es un secreto por paranoia: son exactamente lo que la contraparte
necesitaría para negociar contra ti. Un evaluador que conoce tu loaded cost sabe cuánto puedes bajar.

**Por qué "por referencia" y no "por artefacto":** el sistema podría haberse conformado con marcar el
**PDF** como interno o para cliente. No alcanza. El PDF puede estar marcado `client_facing` y **citar
adentro** un dato que salió del blueprint interno. El gate mira los **insumos**, no solo la etiqueta
del resultado.

**Refuerzo:** un render `client_facing` solo lo puede pedir una **persona** (actor `member`) — y no
solo porque el código lo exija: la **base de datos** también lo rechaza. Un bug del código no basta
para cruzarlo.

> **Detalle técnico:** `assertEvidenceAllowedForAudience` en
> `src/lib/commercial/tenders/proposals/render-projection.ts`; el gate al encolar en
> `render-jobs.ts`; test de aceptación en `__tests__/render-projection-audience.test.ts`. La razón de
> negocio está en el ADR [§3 — la costura con el cotizador](../../architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md).

---

## 2 · Accesibilidad — cuando "accesible" significa "admisible"

**La mecánica:** si el requisito-set del RFP exige accesibilidad (PDF/UA, Section 508 en EE.UU.,
European Accessibility Act en la UE), el render **se rechaza al encolar**
(`accessibility_unsupported`). No se intenta. No se degrada.

**La razón de negocio:** esto no es una preferencia de inclusión — **es admisibilidad**.

- **Section 508 (EE.UU.)** nombra explícitamente las presentaciones entre los entregables de un
  contratista. Un entregable no conforme **puede ser rechazado**, o remediado a costa del contratista.
- **European Accessibility Act (UE)**: exigible desde el 28-jun-2025.
- La norma técnica del PDF accesible es **PDF/UA** (árbol de tags semántico, texto alternativo, orden
  de lectura).

**El dato incómodo, dicho en voz alta:** nuestro renderer usa Chromium para imprimir a PDF, y
**Chromium no emite PDF con tags**. No es un ajuste que falte: **el motor elegido no lo puede
producir**.

Frente a eso, el sistema toma la única postura honesta: **falla ruidoso**. Si un RFP exige PDF/UA,
Efeonce **no oferta con este renderer**.

> **Mejor no ofertar que entregar un artefacto inadmisible.** Un PDF rechazado por formato es una
> licitación perdida con el trabajo ya hecho, y nadie se entera hasta el final.

Esta es una limitación **declarada**, no un bug. El día que un RFP real exija PDF/UA, esa exigencia
invalida a este renderer como único camino y hay que evaluar otro destino de salida.

> **Detalle técnico:** `extractRenderConstraints` en `render-constraints.ts` (detecta PDF/UA, 508,
> EAA y accesibilidad en los requisitos de tipo `format` / `excluyente`); el rechazo en
> `requestProposalRender`. La limitación está declarada en
> [TASK-1391 · Delta (b) §4](../../tasks/complete/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md).

---

## 3 · Deadline — si se pasa, se pierde el proceso

**La mecánica:** dos momentos.

1. **Al encolar:** una propuesta cuyo deadline ya venció **no se encola** (`deadline_expired`).
2. **En la cola:** un trabajo cuyo deadline venció **mientras esperaba** no compite por prioridad. El
   despachador lo **cierra de forma gobernada**, con el motivo escrito, y lo registra.

**La razón de negocio:** en una licitación el plazo no es una meta blanda: **si la oferta no entra
antes de la hora, el proceso se pierde**. No hay prórroga, no hay "lo subo mañana".

De ahí salen dos consecuencias que no son obvias:

- **El deadline manda la cola.** No se renderiza por orden de llegada, sino por **plazo más próximo**.
  Un deck que vence mañana pasa delante de cualquier cosa.
- **Renderizar para un proceso cerrado es quemar CPU.** Y peor: le roba turno a algo que sí llega a
  tiempo.

**El matiz que evita el efecto colateral:** priorizar por deadline, sin más, deja a los trabajos **sin
plazo** esperando para siempre. Por eso existe el **envejecimiento**: un trabajo sin deadline va
ganando prioridad con el tiempo hasta competir. **Prioridad sin envejecimiento es hambruna con otro
nombre.**

> **Detalle técnico:** `selectNextRenderJobForDispatch` y `claimNextRenderJobForExecution` en
> `render-jobs.ts` (regla `LEAST(deadline, created_at + aging)`); cierre gobernado de vencidos en
> `render-dispatch.ts`; señal `commercial.proposal.deadline_at_risk`.

---

## 4 · Margen — nunca un "vamos" sin margen sobre el costo real

**La mecánica:** la transición al estado "producir" (`fit_review → producing`) **lee el margen de la
cotización**. Sin cotización vinculada, el gate **no se puede evaluar y la transición falla cerrada**.
No aprueba por omisión.

Los cuatro motivos de rechazo son explícitos: no hay cotización, el margen no está calculado, el
margen no es positivo, o el margen está bajo el piso declarado.

**La razón de negocio:** *"nunca un GO sin margen"* era una regla del método comercial que **no tenía
mecanismo**. Un fit perfecto (10/10) con margen negativo es un **NO-BID** — pero el sistema no podía
hacerlo cumplir sobre un objeto que **no conocía su propio costo**.

Y había un segundo agujero, más sutil: **el precio se escribía a mano**. La oferta económica de SKY se
redactó en prosa, sin trazabilidad al costo real.

> Una cifra de dinero en un PDF para el cliente **sin origen trazable** es exactamente la misma clase
> de problema que una estadística sin fuente — pero aplicada al dinero. Todo el dominio prohibía la
> primera y toleraba la segunda.

**La regla corta:** la propuesta **no calcula** el precio (eso lo hace el cotizador, sobre loaded
cost), pero **tampoco lo transcribe**: lo **referencia**. Y al empaquetar, la cotización se **congela**
en una foto inmutable, para que el PDF no mienta sobre su propio precio si la cotización cambia
después.

> **Detalle técnico:** `evaluateQuoteMarginGate` en
> `src/lib/commercial/tenders/proposals/quote-gate.ts`; el cálculo vive en
> `src/lib/commercial/quote-to-cash/**` y `src/lib/finance/pricing/**`. Contrato en el
> [ADR §3](../../architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md).

---

## 5 · Los gates humanos — el agente propone, la persona confirma, el sistema ejecuta

**La mecánica:** tres pasos, siempre en este orden.

```
   contexto permitido  →  propuesta tipada  →  confirmación humana  →  el MISMO comando canónico
   (solo lo que puede       (cita sus fuentes    (una persona con         (el que usarían la API,
    ver: metadata,           y declara sus        identidad real)          la UI, Nexa o la CLI)
    lista de archivos)       bloqueos)
```

Los tres momentos críticos de la propuesta (aprobar el fit, aprobar el paquete, presentar) exigen
**actor persona**. No es una convención del código: **la base de datos misma lo exige**. En la base de
datos **no existe** la figura de "escrito por un agente".

**La razón de negocio:** un documento contractual lo firma alguien. Un agente que envía una oferta, la
firma o confirma una declaración jurada es **indefendible** frente a un evaluador, un cliente o un
tribunal. El agente **prepara el paquete; la persona lo sube y guarda el comprobante**.

**El detalle que hace real la garantía:** la propuesta que emite el agente se **valida contra el
contexto que realmente vio**. Si cita una organización, un archivo o una fecha que no estaba en su
contexto permitido, **se descarta entera** — no se acepta "la parte buena". Y en el caso del render, la
propuesta del agente debe **declarar sus bloqueos**; la validación los **recalcula** por su cuenta: una
propuesta que **esconde** un bloqueo se rechaza completa.

**Lo que esto NO es:** no es "un prompt con buenas intenciones". Cada agente tiene su **contexto
tipado**, su **propuesta trazable**, su **validación fail-closed** y su **eval fixture** — que es el
gate para poder tocar el prompt o el esquema.

> **Detalle técnico:** `intake-agent.ts` y `render-agent.ts` en
> `src/lib/commercial/tenders/proposals/`; los evals en `__tests__/*-agent-eval.test.ts`; el gate
> humano reforzado por trigger en la migración `20260712160001023_task-1392-proposal-studio-foundation.sql`.

---

## 6 · La QA visual mecánica — porque "mirar los frames" muere al automatizar

**La mecánica:** cuatro detectores automáticos que **abortan la lámina** (no advierten):

| Detector | Qué caza | Cómo |
|---|---|---|
| **Geometría** | Texto que se sale del lienzo y el recorte esconde | Mide cada bloque contra su ventana visible real, **antes** de imprimir |
| **Imagen ausente** | Una imagen que no cargó → caja vacía silenciosa | Espera la decodificación de cada imagen y **recién entonces** juzga |
| **Fuente sustituida** | La tipografía de marca no cargó y el navegador cayó a una del sistema | Detecta texto que pide una familia sin ninguna fuente declarada |
| **Lámina en blanco** | Una lámina que quedó vacía o casi | Mide "tinta": contraste local por baldosas sobre la imagen final |

**La razón de negocio:** la doctrina del composer se pagó cara — **"los tests verdes NO son el gate:
hay que mirar los frames"**. Cuatro pasos numerados todos como "01", unos párrafos aplanados con comas
y la firma de marca sin fundido **pasaban los 92 tests**.

Pero esa doctrina tiene una fecha de muerte:

> **El día que el render se automatiza, "mirar los frames" muere — salvo que mirar se vuelva
> MECÁNICO.** El punto de automatizar es que nadie está mirando cada render. Sin estos detectores, el
> pipeline automatiza la producción de un artefacto que **puede mentir, y nadie lo mira**.

**Una lección incrustada en el detector de imágenes:** la primera versión juzgaba si la imagen había
cargado **sin esperarla**. En el disco SSD local siempre alcanzaba a cargar; en la nube, donde el
contenedor descarga sus capas en frío, **no**. El resultado eran fallas falsas.

> **Un gate que depende de la velocidad del disco no es un gate: es una moneda.** Un gate de calidad
> **nunca** juzga un estado asíncrono sin esperar su resolución de forma determinista.

**Y una que no está en la lista pero es la misma familia:** el **gate de peso** (`size_rejected`). Los
portales de licitación **rechazan** adjuntos sobre su límite. Un deck de 40 MB que el portal no acepta
es un deck que no existe.

> **Detalle técnico:** `assertSlideFitsCanvas` en `src/lib/artifact-composer/render.ts`; los tres
> detectores en `src/lib/artifact-composer/quality-gates.ts`; gate de peso en `compose.ts`. La lección
> del disco lento está en [ISSUE-121 §4](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md).

---

## 7 · El drift check del manifiesto — que el PDF sea el que se prometió

**La mecánica:** el trabajo encolado lleva el **hash** del manifiesto. Cuando el worker lo toma,
**vuelve a resolver el plan contra su propio catálogo** y compara. Si el hash difiere,
**no renderiza** (`manifest_drift`).

**La razón de negocio:** entre que se pidió el render y que corrió pudo cambiar **cualquier cosa** —
una plantilla, un color de marca, una fuente, un validador. Si el worker renderizara de todos modos,
el PDF entregado **no sería el que se aprobó**. En un documento contractual eso no es un detalle.

El drift check no es teórico: **cazó tres bugs reales el primer día**.

**El detalle que lo hace posible (y que casi lo rompe):** el hash se calcula sobre una
**serialización canónica** —claves ordenadas, en profundidad—, no sobre un volcado JSON cualquiera.
Porque el manifiesto viaja por la base de datos, y **PostgreSQL reordena las claves** de un JSONB.
Con un hash sensible al orden, el drift check daba **falso positivo permanente** después de ir y
volver de la base de datos: mentía.

> **Un hash de contenido sobre datos que viajan por JSONB necesita serialización canónica, o el drift
> check miente.**

> **Detalle técnico:** `hashResolvedManifest` en `render-jobs.ts`; el re-resolve en
> `services/artifact-worker/main.ts`. Origen: [ISSUE-121](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md)
> y [TASK-1391 · Delta (d)](../../tasks/complete/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md).

---

## 8 · Idempotencia — pedir dos veces no produce dos cosas

**La mecánica:** la clave canónica de un trabajo de render es
**(organización + propuesta + hash del manifiesto + propósito del artefacto)**. Pedir el mismo render
otra vez **devuelve el trabajo existente**, sin escribir nada. Y el registro de la propuesta también
acepta una clave de idempotencia.

**La razón de negocio:** los reintentos son la norma, no la excepción — una integración que reintenta,
un usuario que hace doble clic, un agente que se confunde. Sin idempotencia, cada uno de esos casos
produce **una propuesta duplicada** o **un render duplicado** (que cuesta CPU y confunde a quien lo
revisa).

**El detalle de diseño:** la clave usa el **hash del manifiesto**, no una lista de versiones. El
manifiesto **ya contiene** las huellas del catálogo, las plantillas, la marca y las fuentes —
repetirlas en la clave sería **duplicar la verdad** (y dejar que las dos copias se contradigan).

> **Detalle técnico:** la clave en `requestProposalRender` (`render-jobs.ts`), respaldada por un
> índice único en `greenhouse_commercial.proposal_render_jobs`.

---

## Resumen: los gates en una tabla

| Gate | Rechaza | Porque… |
|---|---|---|
| **Audiencia por referencia** | Un artefacto para el cliente con **una sola** evidencia interna | La evidencia interna lleva loaded cost = **tu piso de negociación** |
| **Accesibilidad** | Un render cuyo RFP exige PDF/UA | Nuestro PDF no lleva tags → sería **inadmisible**. Mejor no ofertar. |
| **Deadline** | Encolar (o renderizar) fuera de plazo | Si se pasa la hora, **se pierde el proceso** |
| **Margen** | Un "vamos" sin cotización con margen positivo | Fit 10/10 con margen negativo es **NO-BID** |
| **Gates humanos** | Que un agente cruce fit, empaquetado o presentación | Un documento contractual **lo firma alguien** |
| **QA visual mecánica** | Láminas con imagen rota, fuente sustituida, en blanco o con texto guillotinado | Al automatizar, **nadie mira los frames** |
| **Drift del manifiesto** | Renderizar un manifiesto que ya no corresponde a su catálogo | El PDF debe ser **el que se aprobó** |
| **Idempotencia** | Duplicar propuestas o renders por un reintento | Los reintentos son la norma |
