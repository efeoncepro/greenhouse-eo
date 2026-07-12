# Proposal Studio — cómo funciona el sistema completo

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-12 por Claude
> **Ultima actualizacion:** 2026-07-12 por Claude
> **Documentacion tecnica:** [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md) · [GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md](../../architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md) · [COMMERCIAL_TENDERS_AGENT_INVARIANTS.md](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md)

## El recorrido, contado como historia

Lo que sigue es el camino real que recorrió la propuesta de SKY (gestión del blog 2026, vía la
plataforma Wherex) el 2026-07-12: de un RFP en una carpeta a un PDF de 15 láminas guardado como
artefacto versionado. Cada paso explica **qué garantiza el sistema** y **qué impide**.

## El diagrama del flujo

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  1 · LLEGA UN RFP                                                            │
  │     Un cliente publica bases (portal público o RFP privado).                 │
  └──────────────────────────────┬──────────────────────────────────────────────┘
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  2 · SE REGISTRA LA PROPUESTA           createProposal                       │
  │     origen · cliente · deadline · moneda · clave de idempotencia             │
  │     ✓ nace en estado `intake`, con dueño (organización) y con historial      │
  └──────────────────────────────┬──────────────────────────────────────────────┘
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  3 · SE SUBE EL RFP Y SE REGISTRA EVIDENCIA                                  │
  │     el archivo va al almacén canónico (escaneo + control de acceso)          │
  │     cada dato citable queda con fuente · localizador · método · fecha ·      │
  │     clasificación · AUDIENCIA (interno / cliente)                            │
  │     los requisitos del RFP se declaran literalmente (excluyentes, formato,   │
  │     plazo, multas…) → de ahí salen las restricciones del render              │
  └──────────────────────────────┬──────────────────────────────────────────────┘
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  4 · SE COMPONE EL DECK                 resolvePlan(catálogo, contenido)     │
  │     el autor declara QUÉ dice cada lámina; el catálogo elige CÓMO se ve      │
  │     salida: un MANIFIESTO RESUELTO Y SELLADO (con hashes)                    │
  └──────────────────────────────┬──────────────────────────────────────────────┘
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  5 · SE PIDE EL RENDER GOBERNADO        requestProposalRender                │
  │     GATES AL ENCOLAR (no esperan al worker):                                 │
  │       · audiencia por referencia   · accesibilidad exigida por el RFP        │
  │       · deadline vencido           · validadores del manifiesto              │
  │     si pasa → job en cola, con el manifiesto y las restricciones CONGELADOS  │
  └──────────────────────────────┬──────────────────────────────────────────────┘
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  6 · LA COLA DECIDE PRIORIDAD           dispatcher, cada 2 minutos           │
  │     deadline más próximo primero + envejecimiento (nadie se queda sin turno) │
  │     deadline ya vencido → se cierra de forma gobernada, no se renderiza      │
  └──────────────────────────────┬──────────────────────────────────────────────┘
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  7 · EL WORKER RENDERIZA EN LA NUBE     artifact-worker (Cloud Run Job)      │
  │     toma su trabajo (claim atómico) → verifica que el manifiesto no derivó   │
  │     → compone con TODOS los gates → Chromium sin red → PDF + PNGs            │
  └──────────────────────────────┬──────────────────────────────────────────────┘
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  8 · EL PDF QUEDA VERSIONADO                                                 │
  │     almacén privado + vínculo a la propuesta + evento publicado              │
  │     el PDF es DERIVADO: siempre se puede volver a componer desde el plan     │
  └─────────────────────────────────────────────────────────────────────────────┘
```

## Paso 1 — Llega un RFP

Puede venir de dos lados: del **radar de licitaciones públicas** (Mercado Público) o de un **RFP
privado** que un cliente envía directo (el caso de SKY, vía la plataforma Wherex).

- **Qué garantiza:** los dos caminos llegan al mismo objeto. Una licitación pública y una venta
  directa se modelan igual; lo único que cambia es el campo `origin`.
- **Qué impide:** que el radar público **cree** propuestas por su cuenta. Promover una oportunidad a
  una propuesta es una decisión humana explícita — **ese momento ES el "vamos" del bid/no-bid**. Un
  cron no decide en qué licitación participa la empresa.

> **Detalle técnico:** el ownership está arbitrado en
> [`GREENHOUSE_TENDER_DISCOVERY_OWNERSHIP_BOUNDARY_DECISION_V1.md`](../../architecture/GREENHOUSE_TENDER_DISCOVERY_OWNERSHIP_BOUNDARY_DECISION_V1.md):
> el radar (RESEARCH-007) es dueño de `public_tender*`; el Studio es dueño de
> `greenhouse_commercial.proposals`.

## Paso 2 — Se registra la propuesta

Se crea el objeto `Proposal` con lo mínimo que lo hace real: cliente, origen, título, plataforma,
**deadline**, moneda.

- **Qué garantiza:** desde el primer segundo la propuesta tiene **dueño (una organización)**, un
  **estado** y un **historial que no se puede editar ni borrar**. Y una **clave de idempotencia**: si
  el mismo registro se pide dos veces (un reintento, una integración nerviosa), no nacen dos
  propuestas — devuelve la misma.
- **Qué impide:** que exista una propuesta "de nadie". Y que un agente de IA la cree solo: puede
  **proponer** el registro, pero la creación la confirma una persona.

Un detalle que parece menor y no lo es: el **deadline es un campo de primera clase**. Más adelante es
lo que decide qué se renderiza primero cuando hay cola.

## Paso 3 — Se sube el RFP y se registra evidencia

Tres cosas distintas ocurren acá, y conviene no confundirlas:

| Qué | Para qué sirve |
|---|---|
| **El archivo** (el RFP, un anexo, un entregable) | Va al **almacén canónico de Greenhouse**: escaneo antivirus, control de acceso, versiones. Nunca a un bucket suelto ni a una carpeta paralela. |
| **La evidencia** | La capa semántica: "este dato viene de **esta fuente**, en **este lugar** del documento, medido con **este método**, a **esta fecha**". Y declara su **audiencia**: `internal` o `client_facing`. |
| **El requisito** | El literal del RFP: qué es excluyente, qué puntúa, qué formato exige, qué plazo, qué multas. |

- **Qué garantiza:** que toda afirmación del deck se pueda rastrear hasta una fuente registrada, y
  que el contenido de esa fuente quede **sellado con un hash** (si cambia, se nota).
- **Qué impide:** citar "de memoria". Una cifra sin evidencia **no se compone**. Y en el otro
  extremo: los requisitos del RFP dejan de vivir en la cabeza de alguien — se convierten en
  **restricciones que el sistema hace cumplir** (peso máximo del archivo, páginas, accesibilidad).

## Paso 4 — Se compone el deck

El autor —persona o agente— declara **qué dice cada lámina** (`contentType` + los contenidos). El
catálogo decide **qué plantilla usar**.

- **Qué garantiza:** el mismo contenido produce siempre el mismo deck. La salida de este paso no es
  un PDF: es un **manifiesto resuelto** —un archivo de datos que contiene el contenido canonicalizado,
  la plantilla que el catálogo eligió, y las **huellas (hashes)** del catálogo, los contratos, la
  marca y las fuentes tipográficas.
- **Qué impide:** que un autor (o un agente) **elija la plantilla**. Si intenta imponerla y contradice
  al selector, el sistema aborta. Esto no es burocracia: un comité **compara**, y un deck que cambia de
  lenguaje visual cada tres láminas se lee como un collage y **resta puntos**.

## Paso 5 — Se pide el render gobernado

Acá es donde el sistema deja de ser un compositor y pasa a ser una capacidad de negocio. Al pedir el
render se aplican **cuatro compuertas, y se aplican al encolar** — no cuando el worker ya gastó CPU.

| Compuerta | Qué rechaza |
|---|---|
| **Audiencia por referencia** | Un artefacto para el cliente que cite **una sola** evidencia interna. Rechaza el pedido **completo**. |
| **Accesibilidad** | Si el RFP exige PDF/UA (o Section 508 / EAA) y nuestro renderer no lo puede producir, no se encola. |
| **Deadline** | Una propuesta cuyo plazo ya venció no se renderiza. |
| **Validadores del manifiesto** | Un manifiesto con un validador semántico en falla no entra a la cola. |

Además, el pedido es **idempotente**: la clave es *(organización + propuesta + hash del manifiesto +
propósito del artefacto)*. Pedir dos veces el mismo render devuelve el mismo trabajo, no dos.

- **Qué garantiza:** que el trabajo encolado ya trae **todo congelado** — el manifiesto, la evidencia
  que puede citar, las restricciones del RFP y el deadline. Es reproducible sin volver a preguntarle
  nada a la base de datos.
- **Qué impide:** que un artefacto para el comprador se produzca sin decisión humana. Pedir un render
  `client_facing` exige actor persona — **y la base de datos también lo exige**, no solo el código.

> Por qué cada una de estas compuertas existe (la razón de negocio, no la mecánica):
> [los-gates-y-por-que-existen.md](los-gates-y-por-que-existen.md).

## Paso 6 — La cola decide prioridad

Cada dos minutos un despachador mira la cola y elige **un** trabajo.

- **Prioridad:** el **deadline más próximo primero**. Un deck de licitación que vence mañana pasa
  delante de cualquier cosa.
- **Envejecimiento:** un trabajo **sin deadline** va envejeciendo hasta que compite igual. Sin esto,
  un lote grande de piezas sin urgencia **nunca correría** — prioridad sin envejecimiento es hambruna
  con otro nombre.
- **Deadline vencido:** no compite. Se cierra de forma gobernada y queda registrado. Renderizar para
  un proceso ya cerrado es quemar CPU.

- **Qué garantiza:** que los dos perfiles de carga convivan. Un deck es **raro, pesado y con plazo
  duro**; un lote de piezas sociales es **frecuente y sin urgencia**. Una cola ciega (primero el que
  llegó) dejaría que un lote de 30 carruseles hambree el deck de un bid que vence mañana.

## Paso 7 — El worker renderiza en la nube

El render pesado (un navegador Chromium completo) corre en un **trabajo dedicado de Cloud Run**, no
en el servidor web ni en el worker de operaciones.

La secuencia dentro del worker:

1. **Toma su trabajo** de la cola de forma atómica (dos ejecuciones simultáneas jamás toman el mismo).
2. **Verifica que el manifiesto no derivó**: vuelve a resolver el plan contra **su propio** catálogo y
   compara el hash. Si difiere, **no renderiza** — el catálogo o la marca cambiaron desde que se pidió.
3. **Compone con todos los gates activos** (geometría, imágenes que no cargaron, fuentes que cayeron a
   un sustituto, láminas en blanco, peso del PDF).
4. **Emite el PDF y las vistas previas** con la red bloqueada.

- **Qué garantiza:** que un PDF entregado sea **exactamente el que el manifiesto prometió**. El drift
  check no es teórico: cazó tres bugs reales el primer día.
- **Qué impide:** que el render bloquee otras cosas. Si el render viviera en el worker de operaciones,
  un deck pesado frenaría el publicador de eventos de toda la plataforma.

## Paso 8 — El PDF queda versionado

El PDF y las vistas previas van al **almacén privado**, se vinculan a la propuesta como
`proposal_deliverable`, y se publica un evento.

- **Qué garantiza:** trazabilidad completa — qué manifiesto produjo qué PDF, quién lo pidió, cuándo.
- **Qué impide:** tratar el PDF como fuente de verdad. **El PDF es un derivado**. La fuente es el
  plan: un molde corregido **re-emite** el deck sin re-escribirlo.

## Qué pasa cuando algo falla

El trabajo queda con un **código de falla** explícito, no con un error genérico. Y el sistema
distingue dos familias:

| Familia | Códigos | Qué hacer |
|---|---|---|
| **Reintentable** | `render_error`, `timeout`, `dispatch_error`, `missing_asset`, `font_fallback_detected`, `blank_slide` | Se puede reintentar el mismo trabajo. |
| **No reintentable** | `audience_violation`, `accessibility_unsupported`, `semantic_rejected`, `size_rejected`, `geometry_rejected`, `manifest_drift` | Reintentar produciría **exactamente el mismo rechazo**. Hay que corregir el contenido y **componer un manifiesto nuevo**. |

El reintento es **del dominio**, no de la nube: la infraestructura no reintenta por su cuenta. Así,
los intentos que se ven en la propuesta son los intentos reales, no ruido de la plataforma.

> **Detalle técnico:** commands y cola en `src/lib/commercial/tenders/proposals/render-jobs.ts`;
> prioridad en `render-dispatch.ts`; restricciones del RFP en `render-constraints.ts`; proyección
> permitida en `render-projection.ts`; worker en `services/artifact-worker/main.ts`. Corrida de
> referencia real: `scripts/commercial/_sanity-sky-render-pipeline.ts`. Evidencia de staging en
> [TASK-1391 · Delta (e)](../../tasks/complete/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md).
