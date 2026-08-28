> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-27 por Claude (TASK-1696)
> **Ultima actualizacion:** 2026-08-27 por Claude (TASK-1696)
> **Documentacion funcional:** [Gasto de proveedor y presupuesto](../../documentation/growth/gasto-de-proveedor-y-presupuesto.md)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) · [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)

# Operar el gasto de proveedor y el presupuesto (SEO + AEO)

## Para qué sirve

Para responder tres preguntas que antes no tenían respuesta:

1. **¿Cuánto le pagamos a DataForSEO este mes por cada organización, y para cuál de los dos servicios?** (SEO o el grader de IA.)
2. **¿Ese dólar lo cobró el proveedor, o lo calculamos nosotros?**
3. **¿Alguna organización se está acercando a su tope antes de que el sistema empiece a rechazarle corridas?**

También cubre las tres señales nuevas de `/admin/operations` y qué hacer cuando cada una se pone amarilla o roja.

## Antes de empezar

- **Acceso a `/admin/operations`** para ver las señales. No hay pantalla nueva: entran por el registro de señales que ya existía, bajo el grupo `growth`.
- **Acceso a PostgreSQL** si vas a consultar el libro de gasto directo: `pnpm pg:connect:shell` (levanta el proxy y abre la sesión SQL con el usuario correcto).
- **El libro de gasto es productivo y acumulativo.** La captura diaria de rankings escribe en él todos los días a las 05:00 de Santiago. Nunca borres filas: es historia, no caché.
- **Los dos interruptores del gate del grader están APAGADOS** hoy (`GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED` y `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED`). El estado vigente vive en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
- **Los topes por tier** del grader (contratado USD 60, piloto USD 10, trial USD 3) son configuración, no interruptores: se cambian por variable de entorno sin desplegar código.

## Paso a paso

### 1. Ver el gasto del mes de una organización, cortado por consumidor

La forma canónica de leerlo es el reader `readSeoProviderSpendByConsumer`, que devuelve el mes en curso agrupado por consumidor, familia y base de costo — con las dos monedas siempre separadas.

Por lectura programática (integraciones internas):

```
GET /api/platform/ecosystem/growth/seo/provider-spend
```

Desde un asistente conectado al gateway MCP: la herramienta `get_seo_provider_spend`.

Consulta directa equivalente, si necesitas mirarlo en la base:

```sql
SELECT consumer,
       family,
       cost_basis,
       SUM(call_count)        AS llamadas,
       SUM(provider_cost_usd) AS usd
  FROM greenhouse_growth.seo_provider_spend_daily
 WHERE organization_id = '<org-id>'
   AND spend_date >= date_trunc('month', CURRENT_DATE)::date
 GROUP BY consumer, family, cost_basis
 ORDER BY consumer, usd DESC;
```

**Cómo se lee el resultado:**

- `consumer = 'seo'` → captura de rankings, auditoría del sitio, enlaces, datos de mercado. Es lo que consume el presupuesto SEO de la organización.
- `consumer = 'aeo'` → el grader comprando consultas de Google AI Mode. Es lo que consume el presupuesto AEO.
- `cost_basis = 'invoiced'` → lo cobró el proveedor. Hoy todas las filas son de este tipo.
- `cost_basis = 'estimated'` → lo calculamos nosotros con una tabla de precios referencial. Cuando aparezca, la fila declara además **cuál** versión de tabla usó.

### 2. Ver el gasto del mes de toda la cartera

Para una foto general, sin filtrar por organización:

```sql
SELECT o.organization_name,
       sp.consumer,
       SUM(sp.provider_cost_usd) AS usd
  FROM greenhouse_growth.seo_provider_spend_daily sp
  JOIN greenhouse_core.organizations o ON o.organization_id = sp.organization_id
 WHERE sp.spend_date >= date_trunc('month', CURRENT_DATE)::date
 GROUP BY 1, 2
 ORDER BY usd DESC;
```

Es la misma vista que alimenta la señal de sobregiro, sin los topes por tier.

### 3. Verificar las tres señales

En `/admin/operations`, grupo `growth`:

| Señal | Estado esperado |
|---|---|
| `growth.dataforseo.spend_ledger_drift` | 0 (verde) |
| `growth.ai_visibility.observation_yield` | todos los proveedores sobre 60% |
| `seo.provider.cost_over_budget` | 0 organizaciones sobre umbral (verde) |

Para ejercitar las tres contra la base real desde local (solo lectura, no escribe nada), con el proxy de Cloud SQL levantado:

```bash
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1696-signals.ts
```

### 4. Verificar que el presupuesto SEO no se contaminó con gasto del grader

Es la prueba directa de que el filtro por consumidor está vivo. Toma una organización que tenga gasto `aeo` en el mes y confirma que su presupuesto consumido del lado SEO **no** subió por ese gasto. Si subió, el filtro se rompió: detén el flujo antes de que el gate empiece a bloquear capturas de rankings por un gasto ajeno.

El sanity script que ejercita el escenario completo (dos consumidores el mismo día sobre la misma familia dejando dos filas separadas, y el fragmento del gate SEO ignorando el dólar del grader):

```bash
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-provider-spend-consumer.ts
```

Escribe de verdad y limpia lo suyo al final; usa una familia que el cron diario no toca.

### 5. Encender el gate del grader en modo observación (rollout pendiente)

**Este paso todavía no se ejecutó.** Cuando se autorice:

1. Prender `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED=true` en **Vercel** (Production y Preview/develop) **y** en el **ops-worker** de Cloud Run. Son dos runtimes con variables independientes: prenderlo en uno solo deja el otro camino sin gate.
2. En el ops-worker hay que hacer **los dos pasos**: declararlo en `services/ops-worker/deploy.sh` (es la fuente de verdad del worker, y sus `--set-env-vars` son destructivos) **y** aplicarlo en vivo con `gcloud run services update --update-env-vars`. Hacer solo lo segundo lo borra en el próximo despliegue, en silencio.
3. Verificar la variable en la **revisión activa** de Cloud Run, no en el script.
4. Correr una corrida del grader y confirmar en los registros que quedó anotado `wouldBlock` y que la corrida **no** fue bloqueada.
5. Observar un **mes calendario completo** el acumulado por tier.
6. Llevarle el dato al operador con una propuesta de tope. **El flip a bloqueo es decisión suya.**

## Qué significa cada señal cuando alerta

### `growth.dataforseo.spend_ledger_drift` — esperado 0

**Amarillo.** Hay consultas de AI Mode del mes que vinieron de perfiles públicos **sin organización** (prospectos). El libro no puede registrarlas porque exige una organización existente.

- **Qué hacer:** nada urgente. Es gasto real y visible, no perdido — hacerlo visible es justamente la razón de ser de la señal. Revisa que el volumen sea el esperado para la actividad de captación del mes.
- **Qué NO hacer:** no inventes una organización para que "cuadre". Ensuciarías la contabilidad de un cliente real con gasto de captación.

**Rojo.** Hay consultas de AI Mode sobre perfiles que **sí tienen organización** y aun así no quedaron anotadas.

- **Qué significa:** se le está gastando plata a un cliente sin cargarla a su presupuesto. Es un error del camino de atribución, no una ausencia legítima.
- **Qué hacer:** revisa que el perfil del grader tenga efectivamente su organización enlazada, y que la corrida haya propagado esa organización hasta el transporte. Revisa Sentry por fallos del registrador de gasto — el transporte anota el error y sigue a propósito, para no invalidar un resultado que el proveedor ya cobró.

### `growth.ai_visibility.observation_yield`

**Amarillo.** Algún proveedor está bajo el 60% de rendimiento en 30 días.

**Rojo.** Algún proveedor está bajo el 35%: prácticamente no está produciendo evidencia.

- **Qué hacer:** mira el detalle **por proveedor**, nunca el agregado. La señal lista cada uno con su porcentaje y su fracción (exitosas/total). Un proveedor caído puede convivir con un agregado que se ve aceptable.
- **Ojo con el "sin datos":** un proveedor sin observaciones en la ventana se reporta como "sin datos", no como 0%. No lo trates como una caída: significa que no corrió.
- **Límite:** solo mide lo que se intentó. Un 100% quiere decir "todo lo intentado salió bien", nunca "se intentó todo".

### `seo.provider.cost_over_budget` — esperado 0

**Amarillo.** Una organización pasó el **80%** de su presupuesto del mes.

- **Qué hacer:** es el aviso previo, justamente para actuar antes de que empiecen a fallar corridas. Revisa si el consumo es el esperado (¿se agregaron keywords al seguimiento?, ¿se corrieron auditorías extra?) y decide: acotar el consumo, o subir el tope de esa organización si el contrato lo justifica.

**Rojo.** El presupuesto se agotó: el gate ya está rechazando corridas de esa organización con `budget_exhausted`.

- **Qué hacer:** las corridas bloqueadas quedan registradas como bloqueadas, no como error. Confirma cuál consumidor agotó el tope (la señal lo declara en el detalle) y resuelve por el lado correcto — el tope SEO y el AEO son independientes.

## Qué NO hacer

- **Nunca abras un segundo libro de gasto.** Una factura de proveedor es una sola. Una tabla paralela de gasto AEO, o sumar el costo de proveedor guardado en las tablas de snapshot, cuenta el mismo dólar dos veces y agota los presupuestos a la mitad sin que nada falle.
- **Nunca sumes facturado con estimado en una sola cifra.** Un total que mezcla las dos bases de costo no es un dato degradado: es un dato falso. Toda presentación del gasto declara el desglose.
- **Nunca prendas el bloqueo sin un ciclo de medición.** El camino público del captador de leads comparte el motor del grader: un tope mal calibrado no degrada un tablero, corta captación. Los dos interruptores existen precisamente para separar medir de bloquear.
- **Nunca borres filas del libro.** Es acumulativo y sin permiso de borrado por diseño. Si una fila está mal, la corrección es hacia adelante.
- **Nunca inventes una organización** para que el gasto de un prospecto público "entre" al libro.
- **Nunca le exijas organización a la familia `serp`.** El grader público es un caso legítimo sin organización: cerrarlo rompería el camino público completo.
- **Nunca expongas el gasto en superficie de cliente.** Es lo que a Efeonce le cuesta servirlo, no lo que el cliente consumió.
- **Nunca cambies el interruptor solo en Vercel** (o solo en el worker). Son dos runtimes con dos copias de la variable, y el camino que quede sin ella sigue sin gate.

## Problemas comunes

**"La señal de drift está roja y no encuentro la causa."**
Empieza por el perfil del grader: ¿tiene organización enlazada? Si la tiene, el problema está en la propagación hasta el transporte. Si no la tiene, el estado correcto es amarillo, no rojo — si aun así sale rojo, la consulta está contando mal el corte por organización.

**"El presupuesto SEO de un cliente subió y no corrimos nada de SEO."**
Es el síntoma exacto del filtro por consumidor roto. Verifica con la consulta del paso 1: si aparece gasto `aeo` en el mes y el presupuesto SEO lo está contando, detente y escala — el gate va a empezar a bloquear capturas de rankings por un gasto que no es suyo.

**"El gasto del mes cayó de golpe."**
Puede ser que la clave de acumulación del libro y la del código se hayan desalineado: en vez de acumular sobre la fila del día, cada llamada estaría insertando una fila nueva. Hay un test que rompe el build si eso pasa, pero si llegaste a verlo en la base, revisa la constraint contra el código antes de tocar nada.

**"El auditor de flags dice que no falta ningún flag por registrar."**
Los dos interruptores del gate **no los ve** ese auditor: busca `process.env.X_ENABLED` literal y estos se leen por constante. Están registrados igual en `FEATURE_FLAG_STATE_LEDGER.md`, que es la fuente de verdad humana. No concluyas "no hay flags pendientes" desde ese reporte.

**"Prendí el interruptor en el ops-worker y después desapareció."**
Lo aplicaste solo con `gcloud run services update` y el siguiente despliegue lo borró: los `--set-env-vars` de `deploy.sh` son destructivos. Decláralo también en `services/ops-worker/deploy.sh`.

**"Un proveedor aparece en 0% y cundió el pánico."**
Verifica si dice "sin datos" en vez de 0%. Sin observaciones en la ventana, la señal no reporta 0% a propósito. Si de verdad dice 0%, sí corrió y sí falló todo.

## Referencias técnicas

- Documentación funcional: [Gasto de proveedor y presupuesto](../../documentation/growth/gasto-de-proveedor-y-presupuesto.md)
- Escritura del gasto (transporte): `src/lib/ai/dataforseo.ts` + `recordSeoProviderSpend` en `src/lib/growth/seo/provider-spend.ts`
- Lectura cortada por consumidor: `readSeoProviderSpendByConsumer` (`src/lib/growth/seo/provider-spend.ts`)
- Presupuesto del grader: `resolveAeoBudget` (`src/lib/growth/ai-visibility/budget.ts`)
- Señales: `src/lib/reliability/queries/growth-dataforseo-spend-ledger-drift.ts`, `growth-ai-visibility-observation-yield.ts`, `seo-provider-cost-over-budget.ts`
- Estado de los interruptores: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- Spec: [TASK-1696](../../tasks/complete/TASK-1696-growth-provider-spend-consumer-dimension-grader-usd-gate.md)
- Manuales vecinos: [Operar la captura diaria de rankings](operar-captura-rankings-seo.md) · [Correr el AI Visibility Grader](ai-visibility-grader-smoke.md) · [Asignar el módulo SEO a una organización](asignar-modulo-seo-organizacion.md)
