# Sincronización de Clientes HubSpot ↔ Greenhouse

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-28 por Claude (Opus 4.7)
> **Ultima actualizacion:** 2026-04-28 por Claude (Opus 4.7)
> **Documentacion tecnica:** [`GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`](../../architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md)

## Qué hace

Cuando alguien en el equipo de Sales crea o edita una empresa en HubSpot (o cuando un contacto la asocia), Greenhouse aprende de esa empresa **automáticamente, en menos de 10 segundos**, sin que nadie tenga que hacer un import manual ni esperar a que corra un cron nocturno.

## Por qué importa

- El equipo Comercial trabaja en HubSpot. El equipo Operativo trabaja en Greenhouse.
- Si un cliente nuevo en HubSpot tarda 24 horas en aparecer en Greenhouse, no podemos cotizarlo, ni atribuir gastos al cliente, ni mostrarlo en dashboards de margen.
- La integración auto-sync hace que el portal Greenhouse vea cualquier cliente HubSpot al instante.

## Las 3 vías por las que un cliente HubSpot llega a Greenhouse

Greenhouse tiene **3 caminos complementarios** para sincronizar clientes desde HubSpot. **No se contraponen**: los 3 hacen el mismo upsert idempotente, así que aunque corran en paralelo o se solapen, no producen duplicados.

| Vía | Cuándo se dispara | Tiempo típico | Para qué sirve |
|---|---|---|---|
| **Webhook automático** | Cualquier cambio en HubSpot dispara un evento que llega a Greenhouse en <10s | Instantáneo | Vía por defecto en producción. Captura el 99% de cambios. |
| **Adopción manual** | El operador hace click en "Adoptar" desde el Quote Builder | <2s | Fallback rápido cuando el operador necesita avanzar antes que llegue el webhook (ej. timeout de red), o adoptar una empresa antigua que predates la suscripción HubSpot. |
| **Cron diario** | Se ejecuta automáticamente todos los días | ~24h | Red de seguridad — barrido periódico que captura eventos perdidos por bugs o reintentos agotados de HubSpot. No se desactiva aunque el webhook esté en producción. |

## Qué se sincroniza

Cuando un evento llega vía webhook, Greenhouse:

1. **Trae los datos de la empresa** desde HubSpot (nombre, dominio, país, industria, lifecycle stage).
2. **Trae todos los contactos asociados** (Mario Arroyo, Juan Pérez, etc., con email + teléfono + cargo).
3. **Persiste todo en `greenhouse_crm`** (capa raw HubSpot).
4. **Promociona** la empresa a `greenhouse_core.organizations` y `greenhouse_core.clients` cuando el lifecycle stage califica (customer / evangelist / opportunity).
5. **Sincroniza capabilities** (líneas de servicio + módulos contratados) cuando vienen poblados en HubSpot.

## Eventos que disparan el sync

| Evento HubSpot | Acción en Greenhouse |
|---|---|
| Empresa creada | Sync completo + creación de cliente si lifecycle es active_client |
| Lifecycle stage cambia | Re-sync + posible promoción/degradación |
| Nombre, dominio, país, industria cambia | Re-sync con valores actualizados |
| Línea de servicio o módulos cambian | Sync de capabilities |
| Contacto creado en una empresa existente | Sync de la empresa + nuevo contacto |
| Email, teléfono, nombre, lifecycle de un contacto cambia | Re-sync del contacto |

## Cómo se configura (one-time, ya hecho)

La configuración vive en HubSpot Developer Platform como código:

1. **App "Efeonce Data Platform"** (ID HubSpot 33235280) en el portal `kortex-dev` (48713323).
2. **Webhook component** `greenhouse-portal-webhooks` con 12 suscripciones activas.
3. **Target URL** apunta a `https://greenhouse.efeoncepro.com/api/webhooks/hubspot-companies`.
4. **Signature method** v3 (HMAC-SHA256).

Si en el futuro hay que agregar nuevas suscripciones (por ejemplo, deals, products), se hace editando el archivo `services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/src/app/webhooks/webhooks-hsmeta.json` y subiendo el cambio con `hs project upload`.

## Qué pasa si el webhook falla

- **HubSpot reintenta automáticamente** hasta 5 veces con backoff exponencial. Si después de eso sigue fallando, el evento queda en logs HubSpot pero no en Greenhouse.
- **Greenhouse logea el fallo** en Sentry con tag `domain=integrations.hubspot`.
- **El cron diario corrige** lo que quedó sin sincronizar — barre todas las empresas y compara con Greenhouse, materializando las que faltan.
- **El operador puede forzar** una adopción inmediata desde el Quote Builder ("Adoptar este candidato") sin esperar.

## Ejemplo real (28 abril 2026)

Cuando creamos el cliente **Motogas SpA** en HubSpot:

1. HubSpot generó el evento `object.creation` con company ID `27778972424`.
2. El webhook llegó a Greenhouse.
3. Greenhouse pidió al bridge HubSpot el detalle completo (nombre, dominio `motogas.cl`, lifecycle `customer`, industria, país).
4. Greenhouse pidió al bridge HubSpot los contactos asociados (Mario Arroyo, `admin@motogas.cl`, `+56 9 5492 9551`).
5. Greenhouse persistió todo en `greenhouse_crm.companies` + `greenhouse_crm.contacts`.
6. Greenhouse promovió la empresa a `greenhouse_core.organizations` (`org-03993839-...`) y a `greenhouse_core.clients` con ID canónico `hubspot-company-27778972424`.
7. La regla de cost-attribution `rule-metricool` ya tenía configurado este client_id como destinatario de los cargos Metricool — desde ese momento, todos los cargos Metricool se atribuyen automáticamente a Motogas SpA.

## Dónde mirar si algo no funciona

- **Logs Vercel**: `/api/webhooks/hubspot-companies` — ver POSTs recibidos.
- **Sentry**: filtro `domain=integrations.hubspot` para errores.
- **PG**: tabla `greenhouse_sync.webhook_inbox_events` — historia de events recibidos con status (processed/failed).
- **PG**: tabla `greenhouse_sync.source_sync_runs` filtrar `source_system='hubspot'` para ver runs.

## Para nuevos proveedores webhook (ej. Slack, Stripe)

El patrón es reusable. Para agregar un nuevo webhook inbound desde otro proveedor:

1. Crear handler en `src/lib/webhooks/handlers/<provider>.ts`.
2. Registrar handler en `src/lib/webhooks/handlers/index.ts`.
3. Migration que registra row en `greenhouse_sync.webhook_endpoints` con `endpoint_key`, `provider_code`, `handler_code`, `auth_mode`, `secret_ref`.
4. El proveedor configura su webhook apuntando a `https://greenhouse.efeoncepro.com/api/webhooks/<endpoint_key>`.

> **Detalle técnico:** ver spec [`GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`](../../architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md) — sección "Delta 2026-04-28 TASK-706" — y [`CLAUDE.md`](../../../CLAUDE.md) sección "HubSpot inbound webhook".
