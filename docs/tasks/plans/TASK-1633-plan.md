# Plan — TASK-1633 y continuidad del goal Producer prompt-first / Gemini Omni

## Objetivo de continuidad

Completar el contrato route-driven iniciado por TASK-1633 y usarlo como foundation para corregir Gemini Omni
directo por Vertex y el compositor del Producer. El resultado debe mantener el prompt y el modelo seleccionados,
separar operación de inputs, traducir controles exclusivamente server-side y cerrar con una generación UI nueva
de Seedance y una de Omni, cada una gobernada y sin cobro duplicado.

Este plan coordina tres owners sin colapsarlos:

- `TASK-1633`: contrato, validación, intent, fingerprint, compiler y conformance compartida.
- `TASK-1504`: identidades/rutas Omni, transporte Vertex, derechos, promoción y canary Omni.
- `TASK-1552`: UX/UI prompt-first, operaciones, slots y QA visual/regresión Seedance + Omni.

TASK-1633 no absorbe edición/continuidad de video: `TASK-1573` sigue siendo su owner. `TASK-1632` permanece
`to-do` hasta estabilizar Omni; no implementar el handoff event-driven como atajo.

## Coordenadas exactas del handoff — 2026-08-02

### Greenhouse

- Checkout único: `/Users/jreye/Documents/greenhouse-eo`.
- Rama: `develop`.
- HEAD local: `23fcdf54a8f9ec5538e2cc02d923da3157884a32`.
- `origin/develop`: `34a016800eb1ab3df352eeb3c71e0fddf3cd0c86`.
- Los tres commits entre ambos SHAs son trabajo MCP concurrente y no autorizan mezclar, reescribir ni empujar su
  historia como parte de Globe.
- WIP propio al entregar: task/plan/handoff/documentación de TASK-1633. Revisar `git status --short` antes de
  cualquier staging y agregar rutas explícitas.

### Globe

- Checkout único: `/Users/jreye/Documents/efeonce-globe`.
- Rama: `main`.
- HEAD y `origin/main`: `a24910c7639129f3e5955e9b3e0e2daf9e2d611f`.
- El WIP de TASK-1633 está **sin commit** sobre ese SHA: 10 archivos modificados y un test nuevo, 763 inserciones
  y 18 eliminaciones en el último `git diff --stat`.
- No existe deploy, migración, promoción ni mutación runtime asociada a ese WIP.

## Qué ya está implementado localmente en Globe

### Contratos y catálogo

- `packages/contracts/src/producer-catalog.ts`
  - vocabularios de operación, roles/slots, reference roles, controles y mecanismos;
  - `RouteCreativeContractV1`, `RouteCreativeIntentV1`, asignaciones ordenadas y output contract;
  - proyección opcional `creativeContract` durante la migración aditiva.
- `packages/contracts/src/index.ts`
  - `creativeIntent` en estimate/prepare/quote;
  - `routeContract` resuelto server-side en `LabQuoteInputV1`.
- `packages/contracts/src/producer-catalog.test.ts` + registro en `packages/contracts/package.json`.
- `packages/domain/src/producer-catalog.ts`
  - versión local `1.6.0`;
  - las 17 rutas publicadas declaran contrato explícito;
  - guards de revisión, modalidad/output, MIME, slots, cardinalidad, combinaciones, controles y paridad legacy;
  - Omni legacy limitado a referencias de imagen;
  - Seedance text-to-video deja de anunciar `edit-target`;
  - Seedance motion separa un video `motion-source` requerido de imágenes `reference` opcionales;
  - Veo separa `first-frame` requerido y `last-frame` opcional.
- `packages/domain/src/producer-catalog.test.ts` cubre contratos representativos y varios negativos.

### Intent, compiler y evidencia

- `packages/domain/src/model-lab.ts`
  - deriva o valida `RouteCreativeIntentV1` antes del spend;
  - conserva contrato creativo congelado y asignaciones `slotId + ordinal` en el experimento;
  - estimate y execute reconstruyen el quote con la misma semántica.
- `packages/provider-contract/src/index.ts` transporta contrato e intent hacia el provider seam.
- `apps/creative-runner/src/index.ts` conserva ambos en estimate y run.
- `apps/creative-runner/src/production-route-compiler.ts`
  - incorpora contrato/intención al fingerprint y snapshot;
  - valida operación, revisión, slots, media y MIME antes del presupuesto;
  - exige que cada input asignado esté materializado mediante un placeholder autorizado y no se pierda en el
    adapter.
- `apps/creative-runner/src/governed-lab-scheduler.ts` incorpora contrato, intent y assignments al fingerprint
  de evaluación y a su snapshot.

## Evidencia ya ejecutada

- Contracts: typecheck verde y **48 tests** verdes.
- Domain: typecheck verde y **437 tests** verdes.
- Provider contract: typecheck verde.
- Creative Runner: typecheck verde y **255/255 tests** verdes, incluida la suite completa registrada del runner.
- `git diff --check` de Globe verde.

Esto prueba compatibilidad local del slice actual; **no** prueba todavía `pnpm check`, build raíz, wire Vertex,
UI, deploy, policy, canary ni runtime.

## Hallazgos que no deben redescubrirse

### Omni no funciona sólo con referencias

- El producto debe publicar al menos creación prompt-to-video y creación condicionada por imágenes como rutas
  ejecutables independientes.
- Las referencias generativas verificadas para el corte directo Vertex son imágenes; no declarar video/audio
  generativo por analogía con Fal.
- Cámara, estilo, movimiento y timing son controles `prompt-semantic` para Omni salvo evidencia oficial de un
  parámetro nativo exacto.
- El output esperado es MP4 con audio embebido opcional; no inventar una segunda salida de audio.
- Fal sirve sólo como benchmark de capacidades. No integrar Omni por Fal.

### P0: identidad declarada y transporte actual divergen

- El compiler/binding declara `provider=vertex-omni` y un endpoint Vertex bajo `aiplatform.googleapis.com`.
- API y worker aún inyectan `createGeminiOmniTransport` con API key/Generative Language.
- `VertexOmniGovernedRunDriver` no ata todavía el endpoint ejecutado al endpoint aprobado del snapshot.
- Antes de cualquier promoción nueva, reemplazar ese transporte por Vertex ADC, comprobar que API y worker usan
  la misma imagen/configuración/service account/IAM y fallar si el endpoint materializado difiere del aprobado.
- Si alguna vez se quisiera Gemini API, sería otra identidad legal/operativa; no es el objetivo actual.

### P0: la UI mezcla cuatro ejes

- El selector ignora el click cuando `availability !== available`; oculta `gateReason` detrás de copy genérico.
- `MODE_REQUIREMENTS` mezcla operación, modelo e inputs (`Elementos`, `Movimiento`, `Editar`).
- Elegir un modo usa `routesForMode[0]` y puede cambiar silenciosamente el modelo.
- `defaultShape()` puede conservar `inputMode:create` aunque el chip visible diga otra cosa.
- El prompt no fue eliminado: queda arriba de un panel con scroll interno; al seleccionar modelo puede salir del
  viewport y parecer ausente.
- El asset picker de video filtra por output modality y oculta imágenes válidas como referencias.
- Upload acepta media sin consultar slots; el cambio de ruta recorta referencias silenciosamente.
- La identidad del estimate no incluía referencias/roles, por lo que un approval podía quedar stale entre debounce
  y execute.

## Correcciones pendientes antes de commit del slice TASK-1633

1. Revisar el diff completo sin reescribirlo ni redescubrir el contrato.
2. Endurecer validación runtime de `authority`, `ordered`, `audioPackaging`, MIME y mecanismo.
3. Hacer que `inputCombinations` exprese alternativas reales. La versión local actual obliga a que todo slot con
   `min > 0` sea requerido en toda combinación; eso no escala para `prompt-only | image-conditioned`.
4. Reemplazar dos construcciones de baja calidad antes del lint:
   - IIFE usada para lanzar `badRequest()` en `model-lab.ts`;
   - `slot.mediaTypes.includes(input.mediaType as never)` en el compiler.
5. Agregar pruebas focales:
   - `model-lab.test.ts`: derivación/asignación, roles, orden, cardinalidad y rechazo pre-spend;
   - `commercial-credit-lifecycle.test.ts`: approval stale al cambiar revisión, operación, roles/orden, controles u
     output contract;
   - `production-route-compiler.test.ts`: snapshot/fingerprint y rechazo de placeholder faltante;
   - conformance tabular Seedance/Omni/Veo para `contract → compile → materialize`.
6. Ejecutar tests focales, después `pnpm check && pnpm build` en Globe.
7. Hacer un commit enfocado de foundation en Globe; no incluir todavía transporte/UI si la revisión del slice no
   está estable.

## Plan de ejecución restante

### Fase 1 — cerrar TASK-1633 foundation

- Completar los seis puntos anteriores.
- Verificar que catálogo/reader/flota proyecten el descriptor sin provider IDs, slugs, costos, endpoints ni
  secretos.
- Mantener dual-read sólo para historia/rutas legacy y fallar nuevas rutas sin contrato.
- Conservar runs históricos sin backfill destructivo.

### Fase 2 — Omni directo por Vertex

- Releer el contrato oficial Vertex vigente y fijar endpoint, auth ADC, campos de request, tareas soportadas,
  duración, ratio, resolución, audio y respuesta exactos.
- Crear/transicionar al transporte Vertex ADC; el driver debe ejecutar el endpoint ya aprobado, no reconstruir
  otro host por provider.
- Cablear exactamente lo mismo en API y Producer worker.
- Añadir tests de endpoint, auth seam, output MIME/packaging, recuperación por hash y cero segundo submit.
- Publicar rutas separadas para prompt-to-video e image-conditioned/reference-to-video. Cada routeId conserva
  identidad, binding, readiness, policy y promoción propios; no hereda promoción por compartir modelo.
- `edit` queda fuera y espera TASK-1573.

### Fase 3 — compositor UI prompt-first (TASK-1552)

Antes de JSX, invocar y leer `greenhouse-ai-design-studio`, `greenhouse-product-ui-architect`, invariantes UI y
arquitectura del Producer. No construir una UI de emergencia específica de Omni.

Estado mínimo recomendado:

```text
selectedRouteId
selectedOperation
prompt
inputsBySlot[slotId] -> [{ assetId, sha256, role, ordinal }]
creativeControls
outputShape
```

Reglas:

- prompt visible/persistente y con continuidad de foco/scroll;
- cambiar operación no cambia modelo; cambiar modelo no borra prompt;
- incompatibilidad se explica y requiere elección explícita;
- slots/cardinalidad/MIME/roles salen del contrato, no de una matriz React;
- el picker muestra cualquier asset compatible con el slot aunque su media difiera del output;
- ningún cambio corta o elimina inputs silenciosamente;
- estimate key incluye ruta/revisión, operación, assignments ordenados, controles y output;
- `gateReason` live se muestra de forma accionable;
- desktop, 390 px, teclado, reduced motion y overflow verificados con GVC/browser real.

### Fase 4 — validación, deploy y rollout gobernado

1. Local primero: tests focales, `pnpm check`, `pnpm build`, canaries no facturables y diff limpio.
2. Revisar plan IaC/deploy exacto y confirmar cero destroy/replace inesperado.
3. Commit/push enfocados y esperar CI verde del SHA exacto.
4. Desplegar API y worker desde el mismo SHA; Studio sólo cuando la UI esté lista y autorizada por su owner.
5. Verificar imagen, digest, env, secret, service account, IAM y driver simétricos.
6. Por cada identidad Omni modificada: rights/policy/readiness/binding/route/circuit/saga por readers canónicos.
7. No reabrir evaluaciones terminales ni reutilizar candidato de evaluación como canary.

### Fase 5 — dos generaciones UI y cierre

- Preflight read-only: fleet, catálogo, credits, `budget.evaluate.allowed=true`, rights/policy/readiness/route/circuit.
- Seedance: exactamente una generación UI nueva como regresión. No reabrir TASK-1614, no repetir su evaluación,
  promoción o fondeo.
- Omni: exactamente una generación UI nueva desde la ruta/operación seleccionada explícitamente.
- Una idempotency key por command facturable. Ante transporte ambiguo, leer experiment/run/attempt/ledger antes de
  cualquier retry.
- Para cada generación conservar y verificar:
  - route/provider/model/version exactos;
  - un run facturable, un attempt terminal y un cobro;
  - output nuevo, retenido, MIME/bytes/SHA;
  - playback real (`readyState`, duración, avance de `currentTime`, `error === null`);
  - parent/lineage/lifecycle/elegibilidad;
  - rights, C2PA/SynthID y Asset Governance terminales según el contrato real;
  - `canary-confirm` sólo cuando el command pueda resolver toda la evidencia durable;
  - readiness/binding/circuit/saga reconciliados después del canary.

## Prohibiciones y límites de seguridad

- No worktrees, clones, checkouts alternos ni directorios temporales heredados.
- No SQL, break-glass, provider API directo ni scripts ad hoc.
- No fondeo, `propose`, `confirm` ni `ensure`; el estado esperado ya tenía 784 créditos disponibles bajo cap 1500.
- No repetir transportes ambiguos sin readback por la misma correlación/idempotencia.
- No desplegar ni promover desde un árbol sucio o desde un SHA distinto al verificado.
- No hacer staging global en Greenhouse mientras existan cambios concurrentes; usar paths explícitos.
- No afirmar soporte porque Fal lo publique o porque el adapter acepte un campo: debe existir evidencia oficial y
  conformance exacta Vertex.

## Criterio honesto de cierre

El goal no está completo hasta que foundation, transporte Vertex, rutas, UI y despliegue estén verificados y las
dos generaciones UI nuevas tengan evidencia durable completa. Si alguna otra capacidad de TASK-1504 conserva
canary propio pendiente, TASK-1504 permanece `in-progress` aunque Omni quede confirmado.
