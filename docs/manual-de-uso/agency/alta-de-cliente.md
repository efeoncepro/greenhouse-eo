> **Tipo de documento:** Manual de uso (operador del portal)
> **Version:** 1.2
> **Creado:** 2026-06-04 por Claude
> **Ultima actualizacion:** 2026-06-05 por Claude (TASK-1017 — verificar evidencia del checklist)
> **Documentacion funcional:** [Alta de Cliente](../../documentation/agency/alta-de-cliente.md)
> **Documentacion tecnica:** [GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1](../../architecture/GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md)

# Como dar de alta un cliente

## Para que sirve

Para crear un cliente nuevo en Greenhouse de principio a fin: su identidad, su perfil de facturacion, su Space y su checklist de onboarding, todo en un solo recorrido guiado. Es la **unica** forma de dar de alta un cliente. No crees clientes por ningun otro lado.

## Antes de empezar

- Necesitas el permiso para abrir casos de cliente (`client.lifecycle.case.open`). Si no lo ves, pidele acceso a tu administrador.
- Ten a mano: razon social, pais, ID tributario (RUT/RFC), moneda de facturacion y terminos de pago.
- Si el cliente viene de HubSpot, confirma que la empresa este sincronizada en el CRM (asi se precargan los datos).
- Si vas a vincular un teamspace de Notion existente, ten listo el token con alcance acotado a ese teamspace. **No lo pegues en ningun campo de texto comun** — el wizard tiene un campo dedicado para eso.

## Paso a paso

1. **Abre el wizard.** Ve a Agencia → Clientes → "Nuevo cliente" (`/agency/clients/new`).

2. **Paso 1 — Origen.** Elige de donde viene el cliente:
   - **HubSpot**: se abre un buscador. Busca la empresa y selecciona la fila. Si ya existe en Greenhouse, el wizard lo detecta.
   - **Nubox**: busca y elige la venta facturada.
   - **Manual**: lo creas desde cero.
   - No puedes avanzar sin elegir una empresa o venta (salvo en Manual).

3. **Paso 2 — Identidad.** Completa razon social, pais, ID tributario e industria.
   - El pais define automaticamente la moneda y el pais de facturacion.
   - La industria se elige de la lista (no la escribas a mano).
   - Si los datos vienen de HubSpot/Nubox, llegan precargados con un chip que dice "desde HubSpot". Revisalos y ajusta lo que haga falta.
   - Si el ID tributario ya existe, aparece el dialogo de duplicado (mira "Que significan los estados" mas abajo).

4. **Paso 3 — Comercial.** Elige el tipo de engagement y las fechas de inicio y termino. Si quieres, agrega fases (Kickoff, Operacion, etc.) con sus fechas.

5. **Paso 4 — Finanzas.** Define la facturacion:
   - Moneda (CLP, USD, MXN, UF o UTM), terminos de pago, direccion y pais de facturacion.
   - Si el cliente exige orden de compra (OC) o HES, activa el switch e ingresa el numero vigente.
   - Agrega condiciones especiales si aplica.
   - Elige los contactos de finanzas de la lista sugerida desde HubSpot, o agrega manuales.

6. **Paso 5 — Espacio.** Pon el nombre del Space y su tipo (Cliente/Interno).
   - **Notion**: elige "Crear teamspace nuevo" o "Vincular existente". Para vincular, busca el teamspace y pega el token en el campo dedicado.
   - **Teams**: elige "Crear canal nuevo" o "Vincular existente" y busca el canal.
   - El codigo numerico del Space se asigna solo — no lo eliges tu.

7. **Paso 6 — Confirmar.** Revisa el resumen por seccion (usa "Editar" para corregir cualquier paso). Lee "que va a pasar", marca las dos casillas de confirmacion y presiona el boton final (**Crear**, **Completar** o **Abrir** segun el caso).

8. **Listo.** Te lleva a la ficha del cliente con su timeline de onboarding. Ahi continuas con el checklist.

### Como completar el checklist de onboarding

En la ficha del cliente (Account 360) veras el timeline del caso con su checklist. Cada item es una tarea pendiente. Abrelo, completalo y marca el avance. El banner te dice cuantos items van completos. El caso no se cierra mientras queden items obligatorios pendientes.

### Como encontrar y activar un caso de onboarding en vuelo

Cuando un deal de HubSpot pasa a cerrado-ganado, Greenhouse abre un caso de onboarding en **borrador** automaticamente. Para verlo no necesitas tipear ninguna URL:

1. Anda a **Agencia → Operaciones → "Alta de cliente"** (el cockpit de onboarding).
2. Vas a ver el inbox de los casos en vuelo. Los **borradores** (los que nacieron de un deal y esperan activacion) estan destacados. Podes filtrar por estado u origen, o buscar por cliente / codigo / deal.
3. Selecciona el caso: al centro ves su checklist real y a la derecha la siguiente accion.
4. Presiona **"Abrir timeline"** para ir a la ficha del caso. Si esta en borrador, **"Activar caso"** te lleva al mismo lugar, donde lo activas (`borrador → en curso`) y empezas a completar el checklist.

Tambien podes llegar al onboarding de una organizacion desde donde ya estabas: la **lista de Organizaciones** muestra una columna "Onboarding" y la **ficha del cliente** muestra un banner "Onboarding en curso · Abrir timeline" cuando hay un caso activo.

> El cockpit **no reemplaza el wizard**: para dar de alta un cliente nuevo segui usando "Nuevo cliente" (que va al wizard). El cockpit solo hace visibles y activables los casos que ya estan en vuelo.

### Como vincular el teamspace de Notion

En el item de Notion del checklist (o en el paso 5 al crear): elige "Vincular existente", busca el teamspace y pega el token con alcance acotado **solo a ese teamspace**. Greenhouse lo guarda de forma segura y registra el teamspace para el sync. Si la integracion aun no esta conectada al teamspace, la busqueda vendra vacia: conectala en Notion o crea el teamspace nuevo desde el checklist.

### Como vincular el canal de Teams

En el paso 5 (o en el item correspondiente): elige "Vincular existente", busca el equipo/canal y selecciona. Greenhouse lo registra como canal de notificaciones del Space.

### Como invitar personas al portal

En la ficha del cliente, abre el item **"Accesos del portal"** (`provision_client_users_access`):

1. Vas a ver una lista de personas sembrada desde los contactos de HubSpot.
2. Cada persona trae un rol sugerido segun su cargo (CMO/VP → ejecutivo; Manager → manager; resto → especialista).
3. Confirma o ajusta el rol y presiona "Invitar".
4. Cada invitacion crea el usuario de portal, le asigna el rol y le manda el email.

## Que significan los estados o senales

| Senal | Que significa | Que hacer |
|---|---|---|
| Chip "desde HubSpot" / "auto por pais" | El campo se infirio de la fuente o se derivo del pais | Revisalo; puedes editarlo |
| Dialogo "Ya existe una organizacion" | El ID tributario coincide con un cliente existente | "Usar el existente" para completarlo, o "Seguir creando" para uno nuevo |
| Boton "Crear cliente" | Es un cliente nuevo | Lo crea de cero |
| Boton "Completar cliente" | La organizacion existe a medias | Completa lo que falta, no duplica |
| Boton "Abrir cliente" | El cliente ya esta completo | Solo te lleva a su ficha |
| Aviso "Notion quedo pendiente" (pantalla de exito) | El cliente se creo, pero Notion no se pudo vincular | Resuelvelo desde el item de Notion en el checklist |
| Banner "Onboarding en curso — N de 10 completados" | El caso esta abierto con tareas pendientes | Sigue completando el checklist |
| "Con acceso" (verde) en una persona | Ya tiene usuario de portal con rol | No hace falta re-invitar |
| Chip "Detectado" (verde) bajo un paso pendiente | El sistema ve que la pieza ya esta lista | Podes marcar el paso (o se marca solo si el auto-completado esta activo) |
| Chip "No verificable" (ambar) bajo un paso | No se pudo verificar ahora (fuente caida) | Volve a presionar "Verificar evidencia" en unos segundos |

## Que no hacer

- **No crees clientes por fuera del wizard.** El drawer de Finanzas, el adopt del Cotizador y el sync de HubSpot ya no son puertas de alta; convergen en este flujo o disparan el caso de onboarding.
- **No pegues tokens de Notion en texto plano** (chat, campos sin enmascarar). Usa el campo dedicado del wizard. Si un token quedo expuesto, tratalo como comprometido: pidele a tu admin que lo rote.
- **No escribas la industria a mano.** Eligela de la lista.
- **No fuerces el cierre del caso** dejando items obligatorios pendientes.
- **No asignes roles internos** a personas del portal. Solo ejecutivo, manager o especialista.

## Problemas comunes

- **"El buscador de HubSpot/Nubox no encuentra la empresa."** La empresa puede no estar sincronizada en el CRM, o tu busqueda es muy especifica. Prueba con menos texto. Si igual no aparece, usa el origen Manual.
- **"El ID tributario marca formato invalido."** Revisa que coincida con el pais elegido (RUT para Chile, RFC para Mexico). El formato se valida segun el pais.
- **"No me deja crear MXN como moneda."** El motor multi-moneda debe estar activo para tu entorno. Si no aparece MXN, escala a tu administrador.
- **"La busqueda de Notion/Teams viene vacia."** La integracion no esta conectada a ese teamspace/equipo (o faltan permisos). Conectala en Notion / pide los permisos de Teams, o crea el espacio nuevo desde el checklist.
- **"Quedo un cliente a medias de un intento anterior."** Vuelve a abrir el wizard con el mismo origen: el wizard detecta la organizacion existente y te ofrece "Completar cliente" sin duplicar.
- **"No veo la opcion de invitar personas."** Te falta el permiso `client.lifecycle.portal_user.invite`. Pidelo a tu administrador.

## Verificar que el cliente fluye al portal (preflight Notion)

Antes de dar por terminado el onboarding, el checklist tiene un item bloqueante **"Verificar que el cliente fluye al portal"**. No alcanza con haber configurado Notion: hay que confirmar que las tareas del cliente **se ven en el portal**.

- **Como correrlo (operador tecnico):** `pnpm notion:onboarding-preflight <spaceId>` — lista los 9 eslabones con ✓/✗/⚠ y dice `readyToOnboard: SI/NO`. Agrega `--json` para integraciones.
- **Que significa cada estado:** ✓ ok · ✗ falla (eslabon roto, hay que arreglarlo) · ⚠ advisory (no bloquea: token compartido o sync algo viejo).
- **El item se completa solo cuando todo da verde.** Si esta rojo, el detalle dice que arreglar. Caso tipico: un estado de Notion que no mapea al vocabulario estandar → **alinear el template del cliente en Notion** (no pedir una excepcion por cliente).
- **Que NO hacer:** marcar el item como completado a mano cuando el preflight esta rojo — el sistema lo impide; primero arregla el eslabon.

## Verificar la evidencia del checklist (sin marcar a mano)

En la ficha del cliente, el panel del checklist tiene un boton **"Verificar evidencia"**. Presionalo para que Greenhouse revise el estado real de cada paso contra el sistema:

- **Detectado** (verde) — la pieza ya esta lista (empresa de HubSpot, equipo asignado, Notion fluyendo, canal de Teams, personas del portal, facturacion).
- **Sin detectar** (gris) — todavia no esta hecho.
- **No verificable** (ambar) — no se pudo verificar ahora (la fuente esta caida). No es un "pendiente" falso; vuelve a intentar.

La evidencia aparece **solo en los pasos que aun no marcaste**. Si ves **"Detectado"** junto a un paso que sigue pendiente, es justo lo que buscas: la pieza ya esta lista, podes marcarla.

- **Auto-completado:** si tu entorno tiene el auto-completado activo, los pasos detectados que no necesitan un documento adjunto se marcan solos. **Nunca** se marca algo sin detectar, **nunca** se pisa lo que ya marcaste a mano, y los pasos que piden un documento (como provisionar Notion) muestran la evidencia pero los completas vos.
- **Que NO hacer:** suponer que "Sin detectar" es un error. Significa que la pieza todavia no esta — hacela y volve a verificar.

## Referencias tecnicas

- Documentacion funcional: [Alta de Cliente](../../documentation/agency/alta-de-cliente.md)
- Wizard (spec): [GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1](../../architecture/GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md)
- Orquestador del lifecycle (spec): [GREENHOUSE_CLIENT_LIFECYCLE_V1](../../architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md)
- Tareas: TASK-992 (puerta unica), TASK-997 (anclaje de referencias externas), TASK-1001 (personas del portal)
