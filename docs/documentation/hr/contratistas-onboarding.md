> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-05-31 por Claude (TASK-976)
> **Ultima actualizacion:** 2026-09-03 — autoactivación y reingreso por episodio
> **Documentacion tecnica:** [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)

# Onboarding de Contractor — Crear un engagement (HR)

## Para qué sirve

Es el wizard para **dar de alta un contractor desde el portal** (`/hr/contractors/new`), sin script. Antes, crear un contractor solo se podía por API/script (Valentina Hoyos se creó así). Ahora HR lo hace desde una pantalla guiada.

## Los dos caminos

El wizard arranca preguntando **cómo entra este contractor**:

### Camino B — Desde una salida laboral (empleado → contractor)

Un colaborador que dejó de ser empleado y sigue como contractor. El wizard:

1. Toma un **caso de salida (offboarding) ya ejecutado**.
2. Pide los términos del engagement: tipo (contractor/honorarios), **fecha efectiva** (posterior al último día trabajado), canal de pago, modelo, tarifa, cadencia, y un **motivo** (mínimo 10 caracteres).
3. Crea el engagement de forma **atómica**: cierra la relación de empleado, abre la de contractor y crea el engagement, todo junto.

> **Importante (boundary)**: este camino es **read-only/append-only** sobre el finiquito, el offboarding y el member. NO toca el `contract_type` ni el finiquito. La salida laboral queda intacta.

El resultado es honesto e **idempotente** — si lo corres dos veces, no duplica:

- **Transición completa**: cerró empleado + abrió contractor + creó el engagement.
- **Engagement sobre relación existente**: la relación contractor ya existía, solo creó el engagement.
- **Ya estaba completo**: relación + engagement ya existían, no hace nada.

### Camino A — Contractor nuevo (relación existente)

Una persona con una **relación de contractor ya activa**. El wizard:

1. Buscas a la persona.
2. **Resuelve** su situación y muestra uno de tres estados honestos:
   - **Tiene relación contractor activa** → continúas y creas el engagement.
   - **Viene de una relación laboral** (tiene un offboarding ejecutado) → te manda al **Camino B** (con el caso ya seleccionado).
   - **No tiene relación** → te dice que **primero hay que crear la relación en Person 360** (fuera de alcance de esta pantalla).
3. Pides los términos del engagement.

> El wizard **no fabrica** la relación legal — la exige o te deriva. Crear una relación desde cero es gobernanza de Person 360.

## Reingreso con otro correo o después de una renuncia

El correo nuevo no crea otra persona. Busca también por nombre y verifica la ficha longitudinal en Person 360 antes de concluir que falta la identidad. Si usuario, correo u OID están desalineados, People/Identity debe reconciliarlos por el carril administrativo canónico; este wizard no repara acceso.

Cuando existe una etapa contractor anterior finalizada en términos de servicio, conserva su relación y engagement históricos y registra la nueva etapa con fechas y condiciones propias sobre el mismo profile. La anterior puede seguir **En cierre** mientras sus pagos se liquidan; eso no autoriza trasladar sus envíos ni boletas al episodio nuevo. No repitas una transición desde el antiguo offboarding employee para representar un reingreso contractor.

Primero debe existir la **relación contractor activa del nuevo episodio**; después usa el Camino A. Si no existe, resuelve la relación en Person 360 o mediante operación administrativa autorizada con los comandos del dominio. El wizard no crea esa relación ni ofrece por sí solo una recuperación integral de reingreso.

Si una salida histórica dañó disponibilidad o asignaciones de alguien ya reingresado, sigue el [runbook de recuperación](../../operations/runbooks/workforce-reentry-recovery.md): no recrees la persona ni reabras la relación employee como reparación.

## El resultado

El onboarding activa el engagement cuando la clasificación **no es bloqueante**, incluso con **Necesita revisión**. Eso no equivale a una revisión legal realizada: `classificationReviewed` conserva su valor y la revisión pendiente sigue visible. Ante **Requiere revisión legal** o **Bloqueado**, permanece en borrador hasta resolverlo (ver [Detalle, Ciclo de Vida y Clasificación](contratistas-engagement-ciclo-de-vida.md)).

## Quién puede entrar

Acceso: route_group `hr` o `efeonce_admin` (viewCode `equipo.contratistas`). Camino A requiere `hr.contractor_engagement:create`; Camino B requiere `hr.contractor_engagement:manage`. Si no tienes el permiso, el botón de crear no aparece.

## Qué NO hace

- No paga ni prepara payables (Finanzas, `/finance/contractor-payments`).
- No edita ni mueve el ciclo de vida post-creación (eso es el workbench, TASK-975).
- No crea la relación legal desde cero (Person 360).

> Detalle técnico: vista `src/views/greenhouse/contractors/ContractorOnboardingWizard.tsx`; page `src/app/(dashboard)/hr/contractors/new/page.tsx`; endpoints `POST /api/hr/contractors` (camino A), `POST /api/hr/contractors/transition-from-offboarding` (camino B), `GET /api/hr/contractors/onboarding/resolve` (branching); helpers `createContractorEngagement` / `transitionEmployeeToContractorEngagement`. Spec: [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md).
