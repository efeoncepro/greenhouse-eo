# Reliability Control Plane — Como Greenhouse mide su propia salud

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-25 por agente (TASK-638)
> **Ultima actualizacion:** 2026-05-09
> **Documentacion tecnica:** [GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md)

---

## Que es el Reliability Control Plane

El **Reliability Control Plane** (RCP) es el sistema interno que le permite a Greenhouse leer su propia salud operativa con un lenguaje unificado. Antes de existir, las señales utiles estaban repartidas en muchas pantallas: Sentry contaba incidentes, Cloud Logging mostraba errores de runtime, Playwright reportaba smoke tests, Notion sync mantenia su propio dashboard, GCP Billing su propia consola. Cada una respondia preguntas distintas y nadie podia decir con seguridad "el modulo Finance esta sano hoy" sin abrir cuatro tabs.

El RCP no inventa una nueva fuente. Toma todas esas fuentes existentes, las normaliza con un contrato comun (`ReliabilitySignal`) y las agrupa por modulo critico. Asi, cualquier persona del equipo puede entrar al **Admin Center** y leer en una sola tabla el estado de Finance, Cloud, Notion y Delivery sin tener que reconciliar señales aisladas.

---

## Que problema resuelve

Antes del RCP, el operador tenia que combinar a mano:

- Sentry → "hay incidentes en produccion"
- GCP Billing → "el costo cloud esta dentro de presupuesto"
- Notion sync runs → "la ultima sincronizacion corrio sin errores"
- Synthetic monitoring → "las rutas criticas siguen respondiendo"
- Playwright smoke specs → "los flujos basicos de Finance no estan rotos"

Cada fuente tiene su propio formato, su propia escala de severidad y su propia ventana de tiempo. El RCP se hace cargo de ese trabajo: cada fuente expone un *adapter* que convierte su estado en señales canonicas, y un *composer* las agrupa por modulo. La pantalla del Admin Center solo muestra la lectura consolidada.

Importante: el RCP no “corrige” semánticas malas de un dominio. Si una fuente operativa mezcla conceptos incompatibles, el RCP solo los va a reflejar. Por eso las correcciones de fondo deben hacerse en el módulo dueño del dato antes de volver a resumirlo.

---

## Como esta organizado

### Modulos criticos

El registry interno declara cuatro modulos canonicos:

| Modulo | Que cubre |
|---|---|
| **Finance** | Cotizaciones, ingresos, egresos, libro IVA, atribucion de costos comerciales |
| **Integrations / Notion** | Sincronizacion de tareas y proyectos desde Notion, calidad de datos en delivery |
| **Cloud** | Posture de GCP, observabilidad Sentry, costos de billing, secret hygiene |
| **Delivery** | Notificaciones, email transaccional, projection queue, reactive workers |

Cada modulo declara que **rutas operativas** posee, que **APIs** expone, que **dependencias externas** consume y cuales son las **señales que se esperan** ver en su panel (por ejemplo: Finance espera tener al menos `runtime`, `test_lane` y `data_quality` activas).

### Tipos de señales (`signal kinds`)

Una señal es la unidad atomica del RCP. Cada señal tiene severidad, fuente, evidencia y se asocia a un modulo. Estos son los tipos canonicos:

| Tipo | Que mide |
|---|---|
| `runtime` | Si las rutas y APIs responden (synthetic monitoring) |
| `posture` | Postura de configuracion: secrets, permisos, deploy hygiene |
| `incident` | Incidentes Sentry correlacionados al modulo correspondiente |
| `freshness` | Hace cuanto que el sync corrio por ultima vez sin error |
| `data_quality` | Validaciones automaticas sobre la data conformada (filas malas, mismatch de catalogo) |
| `cost_guard` | Cost guard runtime — corte automatico cuando el costo se dispara |
| `subsystem` | Subsistema operativo (calendario, email, projections) |
| `test_lane` | Smoke tests Playwright que cubren el flujo critico de un modulo |
| `billing` | Lectura de GCP Billing Export: costo proyectado vs presupuesto |
| `ai_summary` | Resumen narrativo generado por Gemini Flash sobre el estado del modulo |

En particular, las señales `subsystem` no siempre usan el mismo tipo de contador. Algunas vienen de runs homogéneos (`procesados` / `fallidos`), pero otras necesitan resumen semántico propio. Ejemplo: `Finance Data Quality` separa drift real, costos directos sin cliente y cartera vencida de overhead compartido permitido; el summary que ves en RCP debe venir del dominio Finance, no de una frase genérica armada aguas abajo.

### Smoke lanes Playwright

Los smoke lanes Playwright son una fuente `test_lane`: validan flujos críticos del portal y luego publican el resultado a Postgres con `pnpm sync:smoke-lane <lane-key>`.

La regla operativa es:

- si una prueba falla, el lane puede quedar `failed`; eso es una señal funcional válida
- si una prueba falla en un intento pero pasa en retry, el lane puede quedar `flaky`; eso es deuda de estabilidad, no falla final
- el publisher no debe fallar por tooling, permisos, secretos o saturación transitoria
- el log esperado en CI es `[smoke-lane-publish] lane=<lane> status=<passed|failed|flaky> ... flaky=<n>`
- si aparece `sync:smoke-lane <lane> failed (non-blocking)`, se trata como incidente de plataforma, no como ruido normal

Desde ISSUE-072/ISSUE-073, el publisher usa el carril canónico: WIF, Cloud SQL Connector, Secret Manager, pool `1`, retry/backoff en la primitive Postgres compartida y parser reusable `scripts/lib/smoke-lane-report.ts` para que `flaky` no incremente `failed_tests`.

### Severidades

Cada señal trae una severidad unificada:

| Severidad | Que significa |
|---|---|
| `ok` | Todo bien |
| `warning` | Atencion: hay degradacion, pero no impacto critico |
| `error` | Critico: el modulo esta degradado o roto |
| `unknown` | Hay datos pero no se pueden interpretar |
| `not_configured` | La señal todavia no esta plomada (pendiente de cablear) |
| `awaiting_data` | La fuente existe pero todavia no ha producido datos |

La severidad agregada de cada modulo es el peor caso entre sus señales. Si Finance tiene 5 señales en `ok` y una en `error`, el modulo se ve en `error`.

### Confidence (confianza)

Ademas de severidad, cada modulo tiene una **confianza** sobre su lectura:

- **High** — todas las señales esperadas estan plomadas y reportando datos concretos.
- **Medium** — la mayoria reporta, pero falta alguna fuente para tener lectura completa.
- **Low** — la mayoria de las señales esperadas todavia no esta cableada.

Esto evita que el operador asuma "Finance esta sano" cuando en realidad solo hay 1 de 6 fuentes plomadas. La UI muestra la confianza junto al status del modulo.

---

## Quien lee el RCP

El RCP es una capa de lectura. Tres surfaces lo consumen:

1. **Admin Center → Confiabilidad por modulo** — la vista canonica donde se aterriza la lectura. Cada modulo aparece con su severidad agregada, confianza, lista de señales activas, evidencia y rutas afectadas.
2. **Ops Health** — usa los mismos signals para alertar al on-call cuando aparece un `error` nuevo.
3. **Cloud & Integrations** — la vista tecnica de GCP/HubSpot/Notion reusa los signals `cloud` y `posture` sin duplicar logica.

El operador no escribe en el RCP. Escribe en Notion (que el sync trae a Postgres), en Finance (que pasa por el approval flow), en HubSpot (que el bridge sincroniza). El RCP solo *lee* esos sistemas y expresa salud.

---

## Como se persiste el registry (TASK-635)

Originalmente el registry de modulos era estatico — vivia en codigo. Desde TASK-635 (V1.1, 2026-04-25), el registry esta persistido en Postgres en dos tablas:

- `greenhouse_core.reliability_module_registry` — defaults globales sembrados desde el codigo
- `greenhouse_core.reliability_module_overrides` — overrides per-tenant cuando un Space necesita ajustes

Esto permite que un tenant tenga (por ejemplo) un threshold SLO distinto sin modificar codigo. El default sigue siendo source of truth — al boot, un seed idempotente actualiza los defaults para que evolucionen con el codigo.

Si la DB falla, el RCP cae al registry estatico en memoria. Nunca queda ciego.

---

## La capa AI Observer (TASK-638)

Sobre el RCP determinista existe una capa narrativa opcional: el **AI Observer**.

### Que hace

Cada hora (configurable), un servicio de fondo:

1. Toma el snapshot canonico del RCP (`getReliabilityOverview()`).
2. Limpia los datos para que no contengan PII (emails, UUIDs, tokens, RUTs, etc.).
3. Le pide a **Gemini Flash** (Vertex AI) un resumen ejecutivo + observaciones por modulo en JSON estricto.
4. Compara la "huella" del estado actual contra la huella de la observacion anterior.
5. Si la huella cambio, persiste la nueva observacion. Si es identica, descarta (dedup).

El resultado se muestra en el Admin Center en una tarjeta dedicada — **AI Observer** — que renderiza el resumen ejecutivo y, si la IA detecto algo accionable, una recomendacion concreta.

### Que NO hace

- **No reemplaza señales determinísticas.** Cada signal `ai_summary` queda visible junto a las señales tradicionales del modulo. El operador puede contrastar la lectura IA con la evidencia bruta.
- **No inventa datos.** El prompt es estricto: "si no hay señal concreta, reportar `awaiting_data`, no asumir cosas".
- **No promete acciones que requieran ejecucion externa.** Solo describe lo que ve y sugiere acciones auditables.
- **No envia datos sensibles a la IA.** El sanitizer corre ANTES del prompt — emails, UUIDs, RUTs y tokens son redactados con placeholders genericos.

### Por que esta apagado por default

A diferencia del synthetic monitoring (que esta encendido por default), el AI Observer **viene apagado**. La razon es economica: cada llamada a Gemini cuesta tokens, exista o no un cambio que reportar. Para activarlo, un admin debe setear explicitamente `RELIABILITY_AI_OBSERVER_ENABLED=true` en el servicio Cloud Run `ops-worker`.

Mientras el kill-switch este apagado, el endpoint del observer responde inmediatamente con "skipped" — costo cero, pero el sistema esta listo para activarse cuando se decida.

### Por que corre en Cloud Run y no en Vercel cron

La decision (TASK-638, 2026-04-25) fue hostear el observer en el servicio **ops-worker** (Cloud Run) gatillado por **Cloud Scheduler**, no en un Vercel cron. Las razones:

- **Timeout:** Vercel cron tiene cap de 60 segundos. Una llamada a Gemini + escritura en DB en peor caso podria pasar de ahi. Cloud Run tiene cap de 540 segundos.
- **Identidad WIF nativa:** Cloud Run autentica contra Vertex AI con Workload Identity Federation directamente. En Vercel habria que rotar credenciales ADC.
- **Audit:** Cloud Logging captura el prompt completo y la respuesta de Gemini para revision posterior. En Vercel quedaria solo en logs de runtime.
- **Retries automaticos:** Cloud Scheduler reintenta con backoff sin codigo extra.

### Como funciona la dedup por fingerprint

Si el portal esta estable durante una semana, no tiene sentido que el AI Observer escriba una observacion nueva cada hora con el mismo contenido. Por eso, cada observacion se firma con una **huella** (fingerprint) — un hash sha256 truncado del estado relevante (status, confianza, conteos por severidad, kinds faltantes ordenados).

Antes de persistir, el observer compara la huella nueva contra la ultima persistida en DB:

- **Si son iguales** → la observacion no se guarda (dedup).
- **Si difieren** → la observacion se guarda como nueva fila.

Asi, una semana de portal estable produce 1 sola observacion por modulo, no 168.

### Por que el observer no se observa a si mismo

Un riesgo evidente seria: el observer lee el RCP, agrega `ai_summary` signals, y en la siguiente corrida vuelve a leer el RCP que ahora trae sus propias observaciones previas — feedback loop infinito.

Esto se evita en el composer: el runner llama `getReliabilityOverview()` SIN incluir las observaciones IA previas. Solo el consumer de Admin Center las pide explicitamente con `includeAiObservations=true`. El snapshot que entra al prompt nunca contiene resumenes IA pasados.

---

## Donde vive cada cosa

| Que | Donde |
|---|---|
| Tablero Admin Center con la lectura canonica | `/admin` (Admin Center) |
| Endpoint API para consumers internos | `GET /api/admin/reliability` |
| Lectura programatica desde codigo | `getReliabilityOverview()` en `src/lib/reliability/get-reliability-overview.ts` |
| Registry persistido | Tablas `greenhouse_core.reliability_module_registry` y `greenhouse_core.reliability_module_overrides` |
| Observaciones IA persistidas | Tabla `greenhouse_ai.reliability_ai_observations` |
| Endpoint del AI Observer | `POST /reliability-ai-watch` en `ops-worker` (Cloud Run) |
| Cloud Scheduler job | `ops-reliability-ai-watch` (cada hora, timezone Santiago) |
| Kill-switch del AI Observer | Variable de entorno `RELIABILITY_AI_OBSERVER_ENABLED=true` en `ops-worker` |

> **Detalle tecnico:**
> - Spec canonica del RCP: [GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md)
> - Tipos: [`src/types/reliability.ts`](../../../src/types/reliability.ts)
> - Composer: [`src/lib/reliability/get-reliability-overview.ts`](../../../src/lib/reliability/get-reliability-overview.ts)
> - AI runner: [`src/lib/reliability/ai/runner.ts`](../../../src/lib/reliability/ai/runner.ts)
> - AI sanitizer: [`src/lib/reliability/ai/sanitize.ts`](../../../src/lib/reliability/ai/sanitize.ts)
> - ops-worker endpoint: [`services/ops-worker/server.ts`](../../../services/ops-worker/server.ts)
> - Migraciones: [`migrations/20260425204554656_task-635-reliability-registry-tables.sql`](../../../migrations/20260425204554656_task-635-reliability-registry-tables.sql), [`migrations/20260425211608760_task-638-reliability-ai-observations.sql`](../../../migrations/20260425211608760_task-638-reliability-ai-observations.sql)

---

## Como activar el AI Observer

Solo lo puede hacer un admin con acceso a la consola de Google Cloud o `gcloud` autenticado contra `efeonce-group`.

### Activar

```bash
gcloud run services update ops-worker \
  --project=efeonce-group --region=us-east4 \
  --update-env-vars=RELIABILITY_AI_OBSERVER_ENABLED=true
```

A partir de la siguiente corrida del Cloud Scheduler (cada hora en punto, timezone Santiago), el observer empezara a producir resumenes y los visualizaras en el Admin Center.

### Desactivar (kill-switch)

```bash
gcloud run services update ops-worker \
  --project=efeonce-group --region=us-east4 \
  --remove-env-vars=RELIABILITY_AI_OBSERVER_ENABLED
```

A partir de la siguiente corrida, el endpoint responde inmediatamente con `skippedReason` y costo cero. Las observaciones previas quedan en DB para auditoria.

### Ejecutar manualmente (debug)

```bash
gcloud scheduler jobs run ops-reliability-ai-watch \
  --project=efeonce-group --location=us-east4
```

---

## Reglas de oro para el operador

1. **El RCP nunca reemplaza la fuente.** Si Sentry dice que hay incidente, el operador debe ir a Sentry para ver el detalle. El RCP solo cuenta cuantos hay y a que modulo afectan.
2. **`ai_summary` es contexto, no verdad.** Si la IA dice "Finance estable" pero hay un signal `error` activo, el `error` gana. La IA acompaña.
3. **`awaiting_data` no es `error`.** Si una señal aparece como `awaiting_data` significa que la fuente existe pero todavia no ha producido datos — no es un fallo.
4. **`not_configured` requiere accion.** Cuando una señal aparece como `not_configured`, hay un boundary pendiente en el roadmap (TASK-XXX). El operador debe abrir la task vinculada para ver que falta cablear.
5. **Si el AI Observer no aparece**, revisar primero el kill-switch en el servicio Cloud Run. Si esta encendido y aun asi no aparece, revisar Cloud Logging del job `ops-reliability-ai-watch` — la respuesta de Gemini puede haber sido invalida (raro pero ocurre).

---

## Roadmap

- Synthetic monitoring extenso (TASK-632 ya hizo el inicial sobre rutas criticas).
- Correlator explicativo de incidentes Sentry (TASK-634, ya implementado).
- SLO breach detector — el contrato `sloThresholds` ya existe, falta el detector que dispare alertas cuando un modulo cae bajo umbral por mas de X minutos.
- UI de overrides per-tenant en Admin Center (lectura ya existe; falta CRUD cuando aparezca primer caso de uso real).
