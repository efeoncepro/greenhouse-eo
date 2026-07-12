# Proposal Studio — índice y mapa del sistema

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-12 por Claude
> **Ultima actualizacion:** 2026-07-12 por Claude
> **Documentacion tecnica:** [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md) (leer su §0) · [GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md](../../architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md) · [COMMERCIAL_TENDERS_AGENT_INVARIANTS.md](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md)

## De qué se trata esta carpeta

El **Proposal Studio** es el sistema con el que Efeonce construye una propuesta comercial —una
licitación pública, un RFP privado o una venta directa— desde que llega el documento del cliente
hasta que existe un PDF entregable, versionado y trazable.

Esta carpeta explica **cómo funciona el sistema y por qué está diseñado así**. No es un instructivo
de pasos: eso vive en `docs/manual-de-uso/proposal-studio/`.

## Las tres piezas (y por qué son tres, no una)

El sistema son **tres piezas separadas a propósito**. Cada una tiene un dueño distinto y ninguna
sabe demasiado de las otras.

| # | Pieza | Qué es | Qué NO es |
|---|---|---|---|
| **1** | **El aggregate `Proposal`** | El objeto de negocio: en qué estado está la propuesta, qué documentos la componen, qué evidencia respalda cada afirmación, qué exige el RFP, si hay margen. | No dibuja nada. No sabe de plantillas ni de PDFs. |
| **2** | **El motor `Artifact Composer`** | El motor de composición: recibe contenido, elige la plantilla del catálogo, la llena, valida y produce el artefacto. **No sabe qué es una licitación.** | No sabe de propuestas, clientes, deadlines ni márgenes. Es "domain-free". |
| **3** | **El renderer `artifact-worker`** | El trabajador en la nube que ejecuta el render pesado (un navegador Chromium dentro de un contenedor) y guarda el resultado. | No decide nada. Solo ejecuta lo que un humano ya autorizó. |

### Cómo se conectan

```
  Persona / API / (mañana) UI o Nexa
             │
             ▼
   ┌──────────────────────┐   la propuesta: estado, documentos,
   │  1 · Aggregate       │   evidencia, requisitos, deadline, margen
   │     Proposal         │
   └──────────┬───────────┘
              │  proyección permitida (allowlist)
              │  "esto y solo esto puede citar el artefacto"
              ▼
   ┌──────────────────────┐   contenido → plantilla → validación →
   │  2 · Artifact        │   manifiesto sellado (con sus hashes)
   │     Composer         │
   └──────────┬───────────┘
              │  el manifiesto (lo único renderizable)
              ▼
   ┌──────────────────────┐   cola con prioridad → Chromium en la nube →
   │  3 · artifact-worker │   PDF + vistas previas al almacén privado
   └──────────────────────┘
```

La regla que ordena el dibujo: **cada flecha es una frontera con gates**. El aggregate no le pasa al
motor todo lo que sabe (le pasa una proyección filtrada); el motor no le pasa al worker slots
sueltos (le pasa un manifiesto sellado y hasheado); y el worker no acepta nada que un humano no haya
confirmado.

## Las cuatro verdades que hay que tener en la cabeza

1. **El objeto se llama `Proposal`, no `Tender`.** Una licitación es un **origen** (`public_tender`),
   no la identidad del objeto. También existen `private_rfp` y `direct_sales`. Los estados finales son
   **ganada / perdida** (`won` / `lost`) — una venta directa no se "adjudica".
2. **El motor es genérico y el deck es un catálogo.** El catálogo `deck-axis` (25 plantillas, 16:9,
   sale en PDF) es **dato**, no una rama del motor. Un carrusel de Instagram sería otro catálogo, sin
   tocar una línea del motor.
3. **Lo único que se renderiza productivamente es un manifiesto resuelto y sellado.** Un archivo con
   los hashes del catálogo, de las plantillas, de la marca y de las fuentes. Si algo cambió entre que
   se pidió el render y que corrió, el worker **no renderiza**: avisa.
4. **La IA propone, la persona confirma, el mismo comando ejecuta.** No existe la figura de "el agente
   escribió esto". Ni siquiera en la base de datos.

## Si quieres X, lee Y

| Si quieres… | Lee |
|---|---|
| Entender el recorrido completo, de "llegó un RFP" a "existe el PDF" | [como-funciona-el-sistema-completo.md](como-funciona-el-sistema-completo.md) |
| Entender **por qué el sistema se niega a hacer cosas** (y qué protege cada negativa) | [los-gates-y-por-que-existen.md](los-gates-y-por-que-existen.md) |
| Entender el motor: catálogos, marca como input, plantillas, manifiesto, render hermético | [el-motor-de-composicion.md](el-motor-de-composicion.md) |
| Entender **por qué se eligió esto y no lo otro** (y qué se aprendió al equivocarse) | [decisiones-de-diseno.md](decisiones-de-diseno.md) |
| El objeto `Proposal` en detalle: estados, evidencia, módulo por organización | [../comercial/proposal-studio-aggregate.md](../comercial/proposal-studio-aggregate.md) |
| El **método comercial** (las 10 fases de cómo se arma una licitación) | [../comercial/construccion-de-licitaciones.md](../comercial/construccion-de-licitaciones.md) |
| Las reglas del deck como pieza de comunicación (anti-fabricación, fotos reales, gate de peso) | [../comercial/tender-deck-composer.md](../comercial/tender-deck-composer.md) |
| Operarlo paso a paso (comandos, diagnóstico) | `docs/manual-de-uso/proposal-studio/` |

## Estado real (2026-07-12)

| Pieza | Estado |
|---|---|
| Aggregate `Proposal` + estados + evidencia + requisitos + API | ✅ funcionando, verificado en staging |
| Motor Artifact Composer + catálogo `deck-axis` (25 plantillas) + brand pack | ✅ funcionando |
| `artifact-worker` en la nube + cola + almacenamiento del PDF | ✅ verificado end-to-end en **staging** (la propuesta real de SKY produjo su PDF) |
| **Producción** | ⛔ **apagada a propósito** — requiere sign-off e integración al control de releases |
| Pantalla en el portal / Nexa | ❌ todavía no existe (la capacidad se opera por API y línea de comandos) |

Capacidad medida (no es un compromiso de servicio): un deck de 15 láminas tarda ~25 segundos y pesa
~3,2 MB; uno de 25 láminas, ~32 segundos y ~5,6 MB.

> **Detalle técnico:** aggregate y gates en `src/lib/commercial/tenders/proposals/**`; motor en
> `src/lib/artifact-composer/**`; worker en `services/artifact-worker/**`. Estado verificado en
> [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md §0](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md).
> Tasks: `TASK-1392` (aggregate), `TASK-1393` (motor), `TASK-1391` (renderer).
