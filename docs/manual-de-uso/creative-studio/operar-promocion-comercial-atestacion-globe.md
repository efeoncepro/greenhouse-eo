# Manual — Promover una ruta para uso comercial en Efeonce Globe (atestación + lane)

> **Tipo de documento:** Manual de uso / runbook (orientado al operador)
> **Version:** 1.0
> **Creado:** 2026-07-24 por Claude (TASK-1535)
> **Ultima actualizacion:** 2026-07-24 por Claude

## Para qué sirve

Este manual explica cómo **habilitar una ruta creativa de Globe para uso comercial** (y, si aplica, para entrega a un cliente) **sin firmar ruta por ruta**. La firma se hace **una vez por modelo** — una **atestación de derechos comerciales** — y una **lane automatizada** reparte esa autoridad a las rutas y workspaces que califican.

Es el **puente desde Greenhouse**: te dice quién firma qué, cómo se firma paso a paso en la UI, cómo promueve la lane, qué flags gobiernan el flujo y cuál es la trampa (el rollout de scopes del broker). La decisión completa está en el **ADR-010**; la explicación en simple está en la [documentación funcional](../../documentation/creative-studio/efeonce-globe-promocion-comercial-atestacion.md).

## Antes de empezar

- **Skill obligatoria:** invoca **`greenhouse-globe`** antes de tocar el repo de Globe. Encapsula el boundary, el flujo de capabilities y las reglas duras.
- **Quién gobierna:** Greenhouse. El trabajo se hace bajo la `TASK-1535` de Greenhouse (control plane), gobernada por `EPIC-028`. No se crea un registry paralelo en Globe.
- **Dónde vive el código:** repo hermano `efeonce-globe` (por convención local `../efeonce-globe`). Tiene su propio toolchain (Node 24 nativo, `pnpm check` / `pnpm build`); NO es parte del build de `greenhouse-eo`.
- **La atestación es un hecho global**, no de un workspace: no lleva aislamiento por tenant y es **inmutable** por (proveedor, modelo, versión, huella de términos). Firmar de nuevo el mismo digest **no crea otra** (es idempotente); cambiar los términos (nueva huella) **sí exige** una atestación nueva.
- **Promover ≠ entregar.** Promover deja la ruta disponible; cada pieza que va a un cliente sigue pasando por su aprobación humana. No confundas una cosa con la otra.
- **Capabilities involucradas:**
  - `globe.model-rights.attest` — firmar la atestación (humano, `requireHuman`).
  - `globe.model-rights.read` — leer la atestación vigente.
  - `globe.production-promotion.auto-lane.promote` — la usa el **principal de servicio** de la lane, no un humano.

## Paso 1 — Reunir la evidencia de términos (antes de firmar)

La atestación **se ancla a la evidencia**, no a la memoria. Antes de firmar, ten a mano:

1. **La URL de los términos** del proveedor (`providerTermsRef`) — la página real que otorga el uso comercial.
2. **La huella `sha256`** de esos términos (`providerTermsDigest`) — para que la firma quede atada al texto exacto que leíste. La evidencia por proveedor se versiona en el repo de Globe bajo `scripts/evidence/` (por ejemplo `openai-gpt-image-commercial-terms.json`, `vertex-generative-commercial-terms.json`, `fal-seed-audio-commercial-terms.json`).
3. **Quién revisó** (el `reviewer`, tu identidad de revisión).

> ⚠️ Verifica que los términos **listados hoy** concedan uso comercial. Caso real (Seed Audio): la evidencia inicial decía "solo evaluación interna" porque venía de un **preview no listado**; cuando el modelo pasó a estar **públicamente listado** con "uso comercial", la evidencia vieja quedó **stale** y hubo que re-atestar con la evidencia comercial corregida. Los términos cambian; la huella `sha256` es lo que te protege de firmar sobre un texto viejo.

## Paso 2 — Firmar la atestación en la UI (las 3 casillas)

En el Studio interno, abre **Command-K** y elige la acción de **atestar derechos comerciales del modelo** (botón `globe.model-rights.attest.record`). Se abre el modal de atestación. Llena:

- **Modelo / proveedor / versión** — a qué modelo aplica la firma.
- **Términos** — la URL (`providerTermsRef`) y la huella (`providerTermsDigest`) del Paso 1.
- **Las 3 casillas de concesión** (son **independientes** — marca solo lo que los términos realmente conceden):
  - ☐ **Uso comercial** (`commercialUse`) — la salida puede usarse comercialmente.
  - ☐ **Entrega a cliente** (`clientDelivery`) — la salida puede **entregarse** a un cliente.
  - ☐ **Sublicenciable** (`sublicensable`) — el cliente puede re-licenciarla.

Firma. Al confirmar, verás un **toast arriba a la derecha** con el `attestationId` ("Atestación `mcra…` firmada · inmutable para este digest de términos") y el modal se cierra solo. Ese toast **es** la confirmación; si algo falla, el estado de error queda dentro del modal.

> Para promover a un **workspace de cliente**, la casilla **Entrega a cliente** debe estar marcada. Sin ella, la lane niega la promoción a espacios de cliente (techo fail-closed). Para un workspace **interno** basta con **Uso comercial**.

## Paso 3 — Dejar que la lane promueva (o dispararla)

Con la atestación firmada, la ruta puede promoverse **derivando** los derechos de esa atestación — sin otra firma. La lane:

- Corre bajo el principal de servicio `globe:service:promotion-auto-lane` (separado del humano).
- **Deriva** las restricciones de la atestación y **solo puede apretar**, nunca aflojar.
- Publica la política de derechos de la ruta con la **postura atestada** (por ejemplo, si `clientDelivery=false`, la ruta queda promovida para uso comercial interno pero **no** para entrega a cliente).
- Es **fail-closed**: si el modelo no tiene atestación con la concesión requerida, **no promueve**.

Para disparar la lane manualmente (canary / operación puntual) se usa un **break-glass** acotado: se otorga temporalmente el permiso de invocación, se dispara con un ID token que **incluye el email** (`--include-email` — sin eso el smoke da 401), y se **revoca** el permiso al terminar, verificando el corte. El detalle exacto está en el runbook de release/operación de Globe.

## Flags que gobiernan el flujo (multi-runtime)

| Flag / env | Runtime | Qué hace |
| --- | --- | --- |
| `GLOBE_MODEL_RIGHTS_ATTESTATION_SECRET` | api | Secreto que firma/verifica la atestación. Sin él, no se puede firmar. |
| `GLOBE_WORKSPACE_KIND_CLASSIFICATIONS` | api | Mapa `workspaceId → kind` (`internal` / `client`). **Fail-closed:** un workspace no clasificado **niega**. Ej. `{greenhouse-org:efeonce:internal}`. |
| `GLOBE_PROMOTION_AUTO_LANE_CALLER_SERVICE_ACCOUNTS` | api | Allowlist de service accounts que pueden invocar la lane. |
| `GLOBE_CONTROL_PLANE_BREAK_GLASS` | api | Interruptor de break-glass del plano de control (reconciliado a `false` en reposo). |

> ⚠️ Prender un flag en Globe **no** es "prenderlo en Vercel". Globe corre en **Cloud Run** con su propia infra (Terraform, `infra/terraform/`). El SoT de los env vars de los servicios es Terraform; un cambio out-of-band con `gcloud run services update` **se pierde en el próximo deploy** si no está también en Terraform. Mapea dónde se lee cada flag antes de cambiarlo y aplícalo en el SoT.

## La trampa: cambiar scopes del broker es un rollout de 3 pasos (sin downtime)

Si agregas una capability nueva al **grant del broker de OAuth** entre Greenhouse y Globe (por ejemplo, una capability de atestación), **NO la declares como requerida de una vez**: el broker exige que las capabilities concedidas sean un **subconjunto** de las requeridas, así que volverla requerida **antes** de que el cliente desplegado la pida **deja a todos fuera del login** ("tu sesión no cumple la política de acceso de Globe"). Ocurrió en vivo.

El rollout correcto, **en 3 pasos y en este orden**:

1. **Broker permite** (buffer) — el broker acepta la capability como permitida, sin exigirla.
2. **Cliente pide** — se despliega el cliente de Globe pidiendo la capability nueva.
3. **Broker exige** — recién ahora el broker la vuelve requerida.

Verifica el login entre cada paso (`/auth/start` + el authorize del broker) antes de avanzar al siguiente.

## Qué NO hacer

- **No firmes sin evidencia** (`providerTermsRef` + `providerTermsDigest`). Una atestación sin términos anclados no vale.
- **No marques casillas que los términos no conceden.** Marcar "entrega a cliente" sin derecho real expone a Efeonce; la firma es un hecho auditable.
- **No promuevas a un workspace de cliente** sin `clientDelivery` en la atestación — la lane niega, y con razón.
- **No cambies scopes del broker en un solo paso.** Usa el rollout de 3 pasos.
- **No prendas un flag solo en un runtime** ni solo out-of-band en Cloud Run — se pierde en el próximo deploy.
- **No confundas promover con entregar.** Cada pieza a cliente sigue pasando por su aprobación humana.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| "Tu sesión no cumple la política de acceso de Globe" tras tocar el broker | Se volvió requerida una capability que el cliente aún no pide | Revertir la política del broker; aplicar el rollout de 3 pasos |
| El smoke de la lane da **401 authentication_required** | El ID token no lleva el claim de email | Disparar con `--include-email` en `gcloud auth print-identity-token` |
| La lane **niega** promover a un workspace de cliente | La atestación no concede `clientDelivery`, o el workspace no está clasificado | Re-atestar con la casilla correcta / clasificar el workspace en `GLOBE_WORKSPACE_KIND_CLASSIFICATIONS` |
| Un flag "desaparece" tras un deploy de Cloud Run | Se aplicó con `gcloud run services update` pero no en Terraform | Declararlo en `infra/terraform/` (SoT) y redeployar |

## Referencias técnicas

- ADR-010 (decisión gobernante): [`docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md)
- Documentación funcional (en simple): [`efeonce-globe-promocion-comercial-atestacion.md`](../../documentation/creative-studio/efeonce-globe-promocion-comercial-atestacion.md)
- Evidencia viva (revisiones, atestaciones firmadas, flags, canarios): [`docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md)
- Código en el repo hermano `efeonce-globe`: atestación `packages/domain/src/model-commercial-rights.ts`, lane `packages/domain/src/commercial-promotion-lane.ts`, contrato `packages/contracts/src/model-commercial-rights.ts`.
