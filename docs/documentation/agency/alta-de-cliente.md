> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-06-04 por Claude
> **Ultima actualizacion:** 2026-06-05 por Claude (TASK-1017 — verificar evidencia del checklist)
> **Documentacion tecnica:** [GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1](../../architecture/GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md) · [GREENHOUSE_CLIENT_LIFECYCLE_V1](../../architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md)

# Alta de Cliente — Puerta Unica de Onboarding

## Que es

Es la unica forma de dar de alta un cliente nuevo en Greenhouse. Vive en `/agency/clients/new` y es un asistente guiado (wizard) de 6 pasos que, en un solo recorrido, crea todo lo que un cliente necesita para existir: su identidad legal, su perfil de facturacion, su Space operativo y su caso de onboarding con el checklist de tareas pendientes.

Antes habia varios caminos sueltos para "crear un cliente" (el drawer de Finanzas, el adopt del Cotizador, el sync de HubSpot, la consola de admin). Eso dejaba clientes a medias y nadie sabia por donde se habian creado. El wizard cierra esa fragmentacion: hay **una puerta, un recorrido y un destino**.

## El principio de puerta unica

Un cliente nace **solo** por este wizard. Cuando confirmas el ultimo paso, Greenhouse ejecuta una sola operacion atomica (`provisionClientFromWizard`) que hace todo junto o nada:

| Lo que se crea | Donde queda |
|---|---|
| Organizacion (identidad legal canonica) | `greenhouse_core.organizations` |
| Cliente | `greenhouse_core.clients` |
| Perfil financiero (moneda, terminos, facturacion) | `greenhouse_core.client_profiles` |
| Promocion a cliente activo | `lifecycle_stage = active_client` |
| Space operativo | `greenhouse_core.spaces` |
| Caso de onboarding + checklist | `greenhouse_core.client_lifecycle_cases` |

"Atomico" significa que si algo falla a mitad de camino, no queda nada a medias: o se crea todo, o no se crea nada. Ademas el wizard es **idempotente**: si el cliente ya existe parcialmente (una organizacion "media cocida"), lo completa sin duplicar.

> Detalle tecnico: composer `provisionClientFromWizard` en `src/lib/client-lifecycle/commands/provision-client-from-wizard.ts`, expuesto por `POST /api/admin/clients/lifecycle/provision`. La organizacion se escribe siempre via el helper SSOT `upsertCanonicalOrganization` (TASK-991). Spec: [GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1 §6](../../architecture/GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md).

## Los 6 pasos

El wizard te lleva por estos pasos en orden. Puedes volver atras sin perder lo que ya escribiste, y un borrador se va guardando solo.

| # | Paso | Para que sirve |
|---|---|---|
| 1 | **Origen** | De donde viene el cliente: HubSpot, Nubox o manual |
| 2 | **Identidad** | Quien es: razon social, pais, ID tributario, industria |
| 3 | **Comercial** | El engagement: tipo, fechas, fases |
| 4 | **Finanzas** | Como se le factura: moneda, terminos, OC/HES, direccion, contactos |
| 5 | **Espacio** | Su Space operativo + Notion y Teams |
| 6 | **Confirmar** | Revisar todo y crear |

### Paso 1 — Origen

Eliges de donde viene el cliente:

- **HubSpot** — la empresa ya esta en el CRM. Greenhouse busca la empresa y precarga sus datos. Si la empresa ya existe en Greenhouse, el wizard lo detecta para no duplicar.
- **Nubox** — una venta ya facturada en Nubox.
- **Manual** — lo creas desde cero, sin fuente previa.

Si eliges HubSpot o Nubox, se abre un buscador para elegir la empresa o la venta exacta. No puedes avanzar sin elegir una.

**Se persiste:** el origen del caso (queda registrado para auditoria). Si la empresa ya existe en Greenhouse, se guarda su ID para el modo "completar".

### Paso 2 — Identidad

Defines quien es el cliente:

- **Razon social** (nombre legal) — obligatorio.
- **Nombre comercial** — opcional.
- **Pais** — al elegirlo, se deriva automaticamente la moneda y el pais de facturacion.
- **ID tributario** (RUT en Chile, RFC en Mexico, etc.) — obligatorio. La etiqueta y el formato se validan segun el pais.
- **Industria** — se elige de la lista controlada de HubSpot (147 opciones), no es texto libre.

Cuando los datos vienen de HubSpot o Nubox, los campos llegan precargados con un chip "desde HubSpot" o "auto por pais" para que sepas que se infirio. Puedes editarlos.

Si el ID tributario ya existe en otra organizacion, aparece un dialogo de duplicado: puedes **usar el cliente existente** (lo completa, no lo duplica) o **seguir creando** uno nuevo.

**Se persiste:** `organizations.legal_name`, `trade_name`, `country` (de aqui se deriva `clients.country_code`), `tax_id`, `industry`.

> Detalle tecnico: la industria usa el SSOT `src/config/hubspot-industries.ts` (Controlled Vocabulary Alignment, TASK-997 Slice 1). El pais de la organizacion deriva `clients.country_code`, dejando los tres campos de pais (organizacion, facturacion, cliente) consistentes. Spec: [TASK-997 Sub-pattern 1](../../tasks/in-progress/TASK-997-wizard-canonical-external-reference-association.md).

### Paso 3 — Comercial

Defines el engagement comercial:

- **Tipo de engagement** (regular, piloto, etc.).
- **Fecha de inicio y termino** — con el selector de fecha de Greenhouse (dd/mm/aaaa).
- **Fases** — opcional. Puedes agregar fases (Kickoff, Operacion, Reporte, Decision) con sus fechas.

**Se persiste:** el tipo, las fechas y las fases quedan en el metadata del caso de onboarding, y las fases auto-completan el item de checklist correspondiente.

### Paso 4 — Finanzas

Defines como se le factura al cliente. Aqui se arma el perfil financiero (`client_profiles`):

- **Moneda de pago** — CLP, USD, MXN, UF o UTM. Para Mexico es MXN.
- **Terminos de pago** — dias de credito (por defecto 30).
- **Orden de compra (OC) requerida** — si la activas, se pide el numero de OC vigente.
- **HES requerida** (hoja de entrada de servicio) — si la activas, se pide su numero.
- **Direccion y pais de facturacion** — donde se emite la factura.
- **Condiciones especiales** — texto libre para acuerdos puntuales.
- **Contactos de finanzas** — se siembran desde los contactos de HubSpot de la empresa; eliges los que correspondan o agregas manuales.

**Se persiste:** `client_profiles.payment_currency`, terminos, los campos de OC/HES (numero incluido), direccion y pais de facturacion, condiciones especiales, y los contactos de finanzas con su trazabilidad a HubSpot (`finance_contacts` con `hubspot_contact_id`).

> Detalle tecnico: los campos de facturacion (OC/HES + numero, direccion, pais, condiciones) se persisten y se muestran en el resumen de Confirmar (TASK-1006). Los contactos usan el patron External Reference: se sugieren desde la proyeccion `greenhouse_crm.contacts` y se guardan con provenance (TASK-997 Slice 2). El paso Finanzas acepta MXN cuando el motor multi-moneda esta activo (TASK-990).

### Paso 5 — Espacio

Defines el Space operativo del cliente y sus integraciones:

- **Nombre del Space** — obligatorio.
- **Tipo de Space** — Cliente o Interno.
- **Notion** — crear un teamspace nuevo o **vincular** uno existente (por token con alcance acotado al teamspace).
- **Teams** — crear un canal nuevo o **vincular** uno existente.

El **codigo numerico del Space** (2 digitos) se asigna **automaticamente** — no lo eliges tu.

Notion y Teams no se crean a ciegas en este paso: lo que eliges aqui queda anclado como referencia y se materializa de forma asincronica via el checklist del onboarding (no bloquea el alta).

**Se persiste:** el Space (`spaces`, con su codigo numerico), y los anclajes de Notion/Teams en sus registros canonicos (`space_notion_sources`, `teams_notification_channels`) cuando vinculas existentes.

> Detalle tecnico: el codigo numerico lo asigna `allocateSpaceNumericCode` (TASK-700). El tipo de Space se mapea con `toCanonicalSpaceType` (UI usa `client`/`internal`; la DB exige `client_space`/`internal_space`). Notion/Teams usan External Reference: anclar el existente, fallback crear async (TASK-997 Slices 3-4, TASK-998).

### Paso 6 — Confirmar

Revisas un resumen por seccion (origen, identidad, comercial, finanzas, espacio), con un boton "Editar" en cada bloque para volver al paso. Debajo se muestra **"que va a pasar"** (se crea la organizacion, se abre el caso, se aprovisiona el Space, se crea el checklist) y dos casillas de confirmacion.

El boton final se **adapta** segun el estado: **Crear** (cliente nuevo), **Completar** (organizacion existente a medias) o **Abrir** (cliente ya completo, no se recrea).

**Al confirmar:** se ejecuta el commit atomico, y te lleva a la ficha del cliente con su timeline de lifecycle. Si Notion no se pudo vincular (por ejemplo, la API de Notion estaba caida), el cliente se crea igual y queda un aviso de que Notion quedo pendiente en el checklist.

## El caso de onboarding y su checklist

Crear el cliente abre un **caso de onboarding** observable. No es solo un flag: es una entidad con estado, historial (append-only) y un checklist de tareas materializado desde la plantilla canonica `standard_onboarding_v1` (10 items). El checklist deja claro que falta para que el cliente este completo: contrato firmado, equipo asignado, facturacion lista, accesos del portal, Notion/Teams, etc.

El caso vive su propia maquina de estados (`draft → in_progress → completed`, con `blocked` y `cancelled`). No se puede marcar como completado si quedan items obligatorios y bloqueantes pendientes (lo bloquea la base de datos), salvo override explicito de un administrador.

El timeline del caso se ve en la ficha del cliente (Account 360): muestra el origen, las etapas y la completitud de cada facet ("falta tax_id", "falta perfil", "falta Space"). Es el "estas aqui" del nacimiento del cliente.

> Detalle tecnico: aggregate `client_lifecycle_case` + checklist `standard_onboarding_v1` + comando `provisionClientLifecycle`. Maquina de estados y eventos `client.lifecycle.*` v1 en [GREENHOUSE_CLIENT_LIFECYCLE_V1 §5-§10](../../architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md). Implementado por TASK-992.

## Encontrar y activar casos en vuelo (cockpit de onboarding)

No todos los casos nacen del wizard. Cuando un deal de HubSpot pasa a cerrado-ganado, Greenhouse abre automaticamente un caso de onboarding en **borrador** (el operador lo activa; un misclick de ventas no dispara nada irreversible). Esos casos no nacen con una URL a mano — por eso existe el **cockpit de onboarding**.

El cockpit vive en **Agencia → Operaciones → "Alta de cliente"** (`/agency/clients/onboarding`). Es el inbox de los casos en vuelo:

- **KPIs reales**: casos abiertos, en progreso, vencidos (pasaron su fecha objetivo) y bloqueados.
- **Inbox seleccionable** a la izquierda (filtrable por estado y origen, buscable por cliente / codigo / deal), con los **borradores destacados**.
- **Preview del checklist real** del caso seleccionado al centro (las 10 etapas con su estado actual).
- **Rail de accion** a la derecha: "Abrir timeline" (y "Activar caso" cuando esta en borrador), el responsable, la fecha objetivo y la fuente (origen + Deal ID).

El cockpit **no reemplaza el wizard**: lo hace encontrable. Su CTA principal "Nuevo cliente" sigue yendo al wizard (`/agency/clients/new`); el cockpit solo hace **visibles y activables** los casos que ya estan en vuelo. La activacion ocurre en el timeline del caso (`draft → in_progress`).

Ademas, la lista de **Organizaciones** muestra una columna "Onboarding" y la **ficha del cliente (Account 360)** muestra un banner "Onboarding en curso · Abrir timeline" cuando la organizacion tiene un caso activo — para llegar al timeline desde donde ya estabas mirando la cuenta.

Todo lo que muestra el cockpit es **honesto**: si un dato no existe (no hay fecha objetivo, no hay deal asociado, el caso lo abrio el sistema), se muestra "—" / "Sin deal asociado" / "Sistema", nunca un valor inventado.

> Detalle tecnico: reader `getOnboardingCasesInbox()` ([inbox-reader.ts](../../../src/lib/client-lifecycle/inbox-reader.ts), cases + organizacion + checklist batched sin N+1), page `/agency/clients/onboarding`, vista `OnboardingCasesInboxView`. Indicador cruzado: `getActiveOnboardingStatusByOrg` + `OnboardingCaseBanner`. Gated por `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` + capability `client.lifecycle.case.read`. Implementado por TASK-1013 (sobre el backend de TASK-992; el deal-trigger es TASK-1010).

## Anclaje de referencias externas (Notion, Teams, contactos, industria)

El wizard sigue una regla canonica: **cuando un dato tiene una fuente de verdad externa, no se escribe a mano ni se crea a ciegas — se sugiere desde la fuente y se asocia a la entidad canonica con su trazabilidad.**

| Campo | Fuente | Como se asocia |
|---|---|---|
| **Industria** | Enum de HubSpot (147 opciones) | Se elige de la lista; se guarda el valor estable (`RETAIL`), no el texto libre |
| **Contactos de finanzas** | Contactos asociados de la empresa en HubSpot | Se eligen de los sugeridos; se guarda el `hubspot_contact_id` |
| **Teamspace de Notion** | Notion API (teamspaces conectados) | Se busca y se **ancla** el existente; fallback crear nuevo (async) |
| **Canal de Teams** | Microsoft Graph (equipos/canales) | Se busca y se **ancla** el existente; fallback crear nuevo (async) |

Cada asociacion guarda una referencia externa (`ExternalReference`) con su `externalId`, una etiqueta legible y el origen ("asociado desde HubSpot / Notion / Teams"). Si la fuente externa esta caida, el wizard degrada de forma honesta: el campo cae a modo manual o a "crear nuevo", y el alta nunca se rompe.

> Detalle tecnico: dos sub-patrones canonicos — Controlled Vocabulary Alignment (industria) y External Reference Association (contactos, Notion, Teams). La asociacion no crea columnas nuevas en `spaces`: extiende los registros canonicos `space_notion_sources` y `teams_notification_channels`. Spec: [TASK-997 Architecture Decision](../../tasks/in-progress/TASK-997-wizard-canonical-external-reference-association.md). Notion usa el token "Greenhouse PRD" con Notion-Version `2026-03-11`.

## Invitacion de personas al portal cliente

Las personas del cliente (CMO, marketing managers, especialistas) reciben acceso al portal con un rol de portal. Esto **no se hace en el wizard de nacimiento**: vive en el item `provision_client_users_access` del checklist de onboarding, en la ficha del cliente.

Desde ese item:

- Greenhouse **siembra candidatos** desde los contactos de HubSpot ya capturados de la empresa.
- Sugiere un rol por persona segun su cargo: CMO/VP/Director → **client_executive**; Manager → **client_manager**; el resto → **client_specialist**.
- Confirmas o ajustas el rol y los invitas. Cada invitacion crea su usuario de portal, le asigna el rol y le manda el email de invitacion.

Es idempotente: re-invitar a alguien ya invitado no duplica nada. Solo se pueden asignar los tres roles de portal (`client_executive` / `client_manager` / `client_specialist`), nunca un rol interno.

> Detalle tecnico: helper SSOT `inviteClientPortalUser` (extraido de `/api/admin/invite`), heuristica `suggestClientPortalRole`, reader `listClientPortalPersonCandidates`. Capability dedicada `client.lifecycle.portal_user.invite`. Surface: `PortalUsersPanel` en el timeline del caso. Spec: [TASK-1001](../../tasks/in-progress/TASK-1001-client-portal-people-provisioning-onboarding.md). Modelo persona↔org: [GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1](../../architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md).

## Estados que puedes ver

- **Cliente nuevo** → el boton final dice "Crear cliente".
- **Organizacion existente a medias** → banner ambar con lo que falta + boton "Completar cliente".
- **Cliente ya completo** → boton "Abrir cliente" (no se recrea).
- **Notion quedo pendiente** → la pantalla de exito avisa que Notion no se pudo vincular; queda en el checklist para resolverlo.
- **Onboarding en curso** → en la ficha, el banner muestra cuantos items del checklist estan completos (por ejemplo "4 de 10 completados").

> Detalle tecnico: la completitud se resuelve con `resolveClientCompleteness` + `GET .../completeness`. Estados honestos (state-design) en [GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1 §5](../../architecture/GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md).

## Preflight Notion: "fluyendo de verdad al portal" (TASK-1009)

Configurar Notion (token + bases) no es lo mismo que tener las tareas **visibles en el portal**. El checklist de onboarding incluye un item bloqueante **"Verificar que el cliente fluye al portal"** (`verify_notion_flowing`): el onboarding **no se puede dar por completado** hasta que ese item este en verde.

El item corre un **preflight de 9 eslabones** sobre la cadena completa y reporta verde/rojo por cada uno:

1. Token Notion resuelve · 2. Sync habilitado + bases configuradas · 3. Datos crudos en BigQuery · 4. `client_id` atribuido · 5. Gate de readiness (tareas + proyectos; los sprints son opcionales) · 6. Template L1 (los estados del cliente mapean al vocabulario canonico) · 7. Datos en la capa conformed · 8. **Tareas visibles en el portal** · 9. Sync reciente.

El item **se auto-completa solo si el preflight da todo verde** — nadie puede marcarlo listo estando rojo. Si algo sale rojo, el detalle dice exactamente que eslabon arreglar (por ejemplo, un estado de Notion que no mapea → alinear el template en Notion, **no** crear excepciones por cliente).

> Detalle tecnico: composer `getNotionOnboardingReadiness(spaceId)` (reusa los helpers de readiness/freshness existentes), endpoint `POST .../cases/[caseId]/notion-preflight`, CLI `pnpm notion:onboarding-preflight <spaceId>`, signal `integrations.notion.onboarding_incomplete`. Delta en [GREENHOUSE_CLIENT_LIFECYCLE_V1](../../architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md).

## Verificar evidencia del checklist (TASK-1017)

Varios pasos del checklist tienen un estado real que el sistema **ya sabe** sin que el operador lo marque a mano: la empresa sincronizada desde HubSpot, el equipo asignado, Notion fluyendo, el canal de Teams, las personas del portal invitadas, la facturacion lista. Antes, el checklist mostraba lo que estaba guardado, no la realidad — un paso podia salir "pendiente" aunque la pieza ya estuviera lista (caso Berel: Notion provisionado y en BigQuery, pero el paso seguia "en curso").

En la ficha del cliente, el panel del checklist tiene un boton **"Verificar evidencia"**. Al correrlo, cada paso **auto-derivable** muestra, junto a su estado, lo que ve el sistema:

- **Detectado** (verde) — la pieza ya esta lista en el sistema.
- **Sin detectar** (gris) — la fuente respondio y todavia no esta hecho.
- **No verificable** (ambar) — no pudimos verificar (la fuente esta caida). Nunca se muestra un falso "pendiente".

La evidencia solo aparece en los pasos **aun no resueltos** (donde aporta decision: "ya esta listo, marcalo" o "todavia no"); en un paso ya cerrado seria ruido. Los casos de **drift** ("ya esta listo pero nadie lo marco") destacan: ves "Detectado" junto a un estado que sigue pendiente.

Los pasos **declarativos** (contrato firmado, tipo de servicio, terminos comerciales, fases) **no** tienen fuente automatica: siguen siendo manuales, sin evidencia inventada.

**Auto-completado (opcional, detras de flag):** cuando el operador lo activa, un paso con evidencia **Detectado** que no requiere un documento adjunto humano se marca como completado solo. Nunca con evidencia "pendiente"/"no verificable" (anti-fake-green), nunca pisa lo que ya marcaste a mano, y los pasos que requieren un asset humano (como provisionar Notion) muestran la evidencia pero quedan manuales — la evidencia del sistema no reemplaza el documento.

> Detalle tecnico: registry `item_code → resolver` (reuse-first: HubSpot via `getClientLifecycleStage`, Notion via `getNotionOnboardingReadiness`, equipo/Teams/portal/facturacion por tabla canonica), composer batched `resolveOnboardingEvidence(caseId)` (server-only, degradacion honesta `OutcomeOrError`), endpoint `POST .../cases/[caseId]/verify-evidence` (read + auto-complete gated por `ONBOARDING_ITEM_EVIDENCE_AUTOCOMPLETE_ENABLED`). Decision pura `canAutoCompleteFromEvidence`. Signal de drift `client.lifecycle.evidence_detected_not_marked`. Implementado por TASK-1017 (extiende el patron `verify_notion_flowing` de TASK-1009).
