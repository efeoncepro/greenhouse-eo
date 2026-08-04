# Operar el ciclo de vida de corridas de Globe

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-03 por Claude (TASK-1469)
> **Documentacion funcional:** [El ciclo de vida de una corrida](../../documentation/creative-studio/efeonce-globe-ciclo-de-vida-corridas.md)
> **Documentacion tecnica:** [`TASK-1469`](../../tasks/in-progress/TASK-1469-globe-governed-run-lifecycle-submission-fence.md) · [`ISSUE-135`](../../issues/open/ISSUE-135-globe-governed-run-outbox-infinite-silent-retry.md) · [`ISSUE-127`](../../issues/open/ISSUE-127-globe-generic-error-codes-hide-actionable-causes.md)

## Para qué sirve

Para las tres cosas que hay que saber hacer cuando se toca —o se rompe— el recorrido de una corrida
de Globe desde "lo pedí" hasta "acá está":

- **agregar un código de rechazo** nuevo y clasificarlo (no es opcional: si no lo haces, el build
  rompe nombrando cuál falta);
- **leer la salud del ciclo** después de un deploy o de un incidente;
- **diagnosticar una pieza que dice "generando" para siempre**, que es el síntoma de la falla más
  cara que este sistema puede cometer.

Todo lo de acá vive en el repo hermano `efeonce-globe`. Greenhouse gobierna la decisión; Globe la
ejecuta. La skill que carga los invariantes es `greenhouse-globe`.

## Antes de empezar

⚠️ **Antes de concluir por una edad: las filas viejas de la cola tienen el reloj sucio.** De 131 filas terminadas
medidas en producción, **23 eran contradictorias** (la peor decía haber terminado 9,7 horas antes de estar
disponible). Desde el 2026-08-04 se sellan con el reloj real y las nuevas dan **0**. Una latencia calculada sobre
filas anteriores a ese arreglo **no es evidencia**.

**Conexión a la base de Globe** (para correlacionar por readback):

```bash
cloud-sql-proxy "efeonce-globe:southamerica-west1:globe-pg" --port 15433 --auto-iam-authn
psql "host=127.0.0.1 port=15433 dbname=globe user=<tu email> sslmode=disable"
-- y después, obligatorio:  set search_path to globe;
```

**Y mira el attempt en vuelo antes de suponer divergencia.** Desde el 2026-08-04 el reader del experimento
proyecta el intento en curso, así que una pieza «generando» debe mostrar **en qué fase** va. Si no muestra
ninguno y la corrida ya está terminal, ahí sí hay divergencia de agregados.


- El repo hermano está en `/Users/jreye/Documents/efeonce-globe`. `pnpm check` y `pnpm build` se
  corren **desde ahí**, no desde Greenhouse.
- Lee primero el funcional: **[El ciclo de vida de una corrida](../../documentation/creative-studio/efeonce-globe-ciclo-de-vida-corridas.md)**.
  Es corto y trae el caso del 2026-08-03 completo — una imagen cobrada (748 → 738 créditos) que se
  perdió porque una **espera** se trató como error en tres capas seguidas.
- Necesitas `gcloud` autenticado contra el proyecto `efeonce-globe`. Recuerda que son **dos** carriles
  independientes: `gcloud auth login` (el CLI, que es el que usa `gcloud logging read`) y
  `gcloud auth application-default login` (el ADC, que usan librerías y scripts). Que uno responda no
  prueba el otro.
- **Los tres archivos que gobiernan este ciclo**, todos en el repo `efeonce-globe`:

  | Archivo | Qué decide |
  |---|---|
  | `packages/domain/src/governed-run-failure-policy.ts` | Qué clase es cada error y cuántos intentos tolera |
  | `packages/domain/src/governed-run-lifecycle.ts` | Qué nombres de error sobreviven al limpiador y con qué ritmo se reintenta |
  | `packages/domain/src/model-lab-run-finalizer.ts` | El paso final: registra las piezas, liquida, y cierra el experimento cuando se abandona |

## Paso a paso

### 1. Agregar un código de rechazo nuevo

**Dos archivos, el mismo commit.** Si separas los pasos el build rompe, y rompe a propósito.

1. Agrega el código al vocabulario que corresponda. Para el compilador de rutas son
   `PRODUCTION_ROUTE_DEPENDENCY_REASONS` o `PRODUCTION_ROUTE_DENIAL_CODES`, en
   `apps/creative-runner/src/production-route-compiler.ts`.
2. **Clasifícalo** en `packages/domain/src/governed-run-failure-policy.ts`, en el conjunto que
   corresponda: `TERMINAL_CODES`, `TRANSIENT_CODES` o `WAITING_CODES`.
3. Corre `pnpm check`. El test
   `apps/creative-runner/src/production-route-failure-classification.test.ts` afirma la cobertura de
   ambos vocabularios: un código sin clase lo hace fallar **nombrando cuál falta**.

**El criterio, sin ambigüedad:**

| Clase | Prueba para decidir |
|---|---|
| `terminal` | Dos intentos separados por **una hora** dan el mismo resultado sin que nadie toque nada |
| `transient` | Se recupera solo: red, 5xx, contención, circuito abierto, una escritura que no pegó |
| `waiting` | El otro lado **está trabajando**, no roto — el trabajo va a llegar y lo único que corresponde es volver a mirar |

Si de verdad es indeterminado (un catch-all que envuelve lo que no trajo causa propia), déjalo en
`unknown` **declarándolo** en `DELIBERATELY_UNCLASSIFIED` del test, con la razón escrita. Es una
decisión declarada, no un atajo para pasar el test.

⚠️ **Si el código lo lanza el paso final de la corrida, hay un paso más y es el que se olvidó el
2026-08-03.** Ese código tiene que estar además en `SAFE_FINALIZATION_CODES`
(`packages/domain/src/governed-run-lifecycle.ts`), o el limpiador lo reemplaza por el genérico
`run_finalization_failed` — y entonces tu clasificación **nunca se aplica**, porque la política ya no
ve tu nombre. Son dos listas distintas y las dos hacen falta.

### 2. Leer la salud del ciclo

```bash
gcloud logging read \
  'resource.labels.job_name="globe-producer-worker" AND jsonPayload.event="globe_worker_completed"' \
  --project efeonce-globe
```

Cada tanda del worker trae `outboxTerminalAttempts`, `outboxRetryStorm` y `divergentAggregates`. En estado
normal, **los tres en 0** — y desde el 2026-08-04 los tres tienen alerta viva en Cloud Monitoring.

⚠️ **Lo que prueba que un dead letter no es tuyo es la SERIE TEMPORAL, no el valor puntual.** Mira
**cuándo apareció**, no cuánto vale. Un `1` sin su historia no distingue "venía de antes" de "lo acabo
de causar". En los rollouts del 2026-08-02 el valor fue `1` en todos y era preexistente desde ~2,5 h
antes del primer deploy, además con tendencia a la baja (5 → 3 → 1).

⚠️ **La señal se llamaba `outboxDeadLetter` y no era sólo un mal nombre: MEDÍA MAL.** Contaba **filas de la
outbox**, y como una corrida tiene una fila por fase, decía **3 para UN solo intento muerto**. Cualquier
lectura anterior al 2026-08-04 que cite ese número está inflada. Hoy cuenta intentos distintos.

Y ojo con el otro malentendido, que sigue vigente: el estado `dead` **sí existe** en la outbox y **sí tiene
filas** — las escribe la recuperación histórica de crédito, no el cierre terminal de una corrida. Buscar ahí
la explicación de esta señal te manda a otro lado.

El payload del worker, además, sirve **mejor** que consultar la base directamente: da la serie
temporal, y sigue disponible aunque el ADC esté vencido.

### 3. Diagnosticar una pieza que dice "generando" para siempre

🔴 **Paso 0, antes de cualquier otra cosa: ¿pasaron menos de ~8 minutos?** Entonces probablemente no pasa
nada. La revisión del asset avanza **una etapa por pasada programada**, así que la latencia la manda el reloj
del scheduler y no el tamaño del archivo: con el cron cada minuto, una corrida sana tarda **~7,9 min**
(cuando corría cada 5, tardaba ~20-25). Una prueba automática abortó sobre un sistema perfectamente sano por
saltarse este paso. **Sin él, este runbook te manda a diagnosticar corridas que están bien.**

Pasado ese umbral, el síntoma tiene una causa estructural conocida: **`governed_runs` y `experiments` son dos
agregados distintos**, y la pantalla lee el experimento. Si la corrida murió y el experimento no se cerró, la
pieza miente indefinidamente.

Recorrido:

1. **¿La corrida está terminal?** Si el intento quedó en `failed` con `terminal_at`, entra en el
   conteo de `outboxTerminalAttempts`. Ahí ya sabes que hubo trabajo que agotó sus intentos.
2. **¿Cuál fue el código de error?** Es la pregunta que decide todo lo demás. Si es
   `run_finalization_failed` **a secas**, la causa se perdió en el limpiador: es el defecto de
   `ISSUE-127`. Si trae sufijo (`run_finalization_failed:typeerror`), el nombre de la clase del error
   sobrevivió y tienes por dónde empezar.
3. **¿Es realmente un error, o una espera?** Si la corrida murió esperando a Asset Governance, el
   código correcto es `generated_asset_governance_pending` y la clase correcta es `waiting`. Un caso
   real necesitó **doce** intentos y terminó bien; con tope de 3 estaba muerto hacía rato.
4. **¿Se cobró?** Si el proveedor aceptó, el gasto es real. Ese es el escenario caro y el que
   justifica el margen ampliado post-gasto.

## Qué significan los estados y señales

| Señal | Dónde se lee | Qué significa |
|---|---|---|
| `outboxTerminalAttempts` > 0 | payload `globe_worker_completed` | Hay trabajo que agotó sus intentos. Mira la **serie**: si el valor ya existía antes de tu deploy, no es tuyo |
| `outboxRetryStorm` > 0 | idem | Hay jobs insistiendo por encima de 10 intentos y **todavía sin cerrar**. Es alerta temprana, no daño consumado |
| Clase `terminal` | `governed-run-failure-policy.ts` | No se reintenta ni una vez. Determinista por contrato |
| Clase `unknown` | idem | Tope 3 antes del gasto; tope 25 después. Sólo legítimo para los catch-all declarados |
| Clase `transient` | idem | 25 intentos con pausas crecientes hasta 5 min ≈ 2 horas de reintentos |
| Clase `waiting` | idem | 240 intentos, con cadencia fija de 10 s (el piso real lo pone el worker, que corre cada minuto). **No es un fallo**: el otro lado está trabajando |
| `run_finalization_failed` sin sufijo | código de error del intento | La causa se perdió en el limpiador. No diagnostiques sobre este código: no dice nada |
| Experimento `running` con corrida terminal | pantalla vs. estado real | El agregado visible quedó divergido. Es exactamente el defecto que cerró el puerto de abandono |
| Experimento en `candidate_ready` | pantalla | La pieza llegó. Ojo: **no** significa "aprobada" — el juicio creativo sigue siendo humano |

## Qué NO hacer

- **NUNCA** clasifiques como `terminal` algo que se recupera solo. Matas corridas sanas **y ya
  pagadas**: un circuito abierto o una falla de persistencia se resuelven en el siguiente intento, y
  marcarlas terminales las condena sin motivo.
- **NUNCA** agregues un código de rechazo sin clasificarlo en el mismo commit. La disciplina ya se
  probó y no funciona: `ISSUE-127` lleva diez apariciones del mismo defecto, la novena cometida por
  quien acababa de documentar las ocho anteriores. Por eso el test existe.
- **NUNCA** confíes en el valor de una señal sin saber en qué **unidad** cuenta. El defecto más caro de esta
  familia no fue una señal ausente: fue una presente que contaba filas donde debía contar intentos.
- **NUNCA** declares un dead letter como propio (ni ajeno) por su valor puntual. Sin serie temporal
  no hay conclusión.
- **NUNCA** metas movimientos de crédito en el camino de abandono. La liquidación es autoridad de otro
  dueño y ya decidió; tocarla ahí arriesga un segundo movimiento sobre una corrida ya liquidada. Una
  reserva colgada la recoge el vencimiento de reservas.
- **NUNCA** le pongas pausas crecientes a una espera. El crecimiento existe para no golpear a un
  sistema **caído**; Asset Governance no está caído, está trabajando, y la pausa sólo agrega latencia
  después de que el trabajo ya terminó.
- **NUNCA** nombres la causa de un abandono como "falló el proveedor". En un abandono el proveedor
  **sí** entregó; lo que se agotó fue nuestra finalización. Nombrar mal la causa es el defecto de
  `ISSUE-127`.

## Problemas comunes

### (a) Clasifiqué el código y el comportamiento no cambió

Casi seguro el código lo lanza el **paso final** de la corrida y no está en `SAFE_FINALIZATION_CODES`.
El limpiador lo está reemplazando por `run_finalization_failed` antes de que la política lo vea, así
que tu clasificación se aplica a un nombre que nunca llega. Agrégalo a esa lista también, en
`packages/domain/src/governed-run-lifecycle.ts`.

### (b) El build rompe con "Sin clasificar en governed-run-failure-policy"

Es el test haciendo su trabajo. El mensaje **nombra el código exacto** que falta. Clasifícalo con el
criterio de arriba, o —si es genuinamente indeterminado— agrégalo a `DELIBERATELY_UNCLASSIFIED` con
la razón escrita.

### (c) La compilación rompe en cuatro implementaciones a la vez tras tocar el finalizador

También es a propósito. El puerto de abandono (`abandon` en `RunFinalizerPort`) es **obligatorio, no
opcional**, precisamente para que quien no lo implemente rompa el build en vez de dejar el hueco
abierto. Cuando se introdujo, el compilador atrapó cuatro implementaciones incompletas.

### (d) Una corrida vieja se ve "generando" y el código no dice nada

Si el código es `run_finalization_failed` sin sufijo, esa corrida es **anterior** al arreglo del
limpiador: su causa ya no es recuperable desde el registro. Diagnostica por la ventana temporal
(¿coincide con un incidente de Asset Governance?) y por si el proveedor cobró, no por el código.

## Referencias técnicas

- Funcional: [El ciclo de vida de una corrida](../../documentation/creative-studio/efeonce-globe-ciclo-de-vida-corridas.md)
- [`TASK-1469` — Governed Run Lifecycle, Submission Fence and Provider Completion](../../tasks/in-progress/TASK-1469-globe-governed-run-lifecycle-submission-fence.md)
- [`ISSUE-135` — la outbox de governed runs reintenta infinito, en silencio y sin dead-letter](../../issues/open/ISSUE-135-globe-governed-run-outbox-infinite-silent-retry.md)
- [`ISSUE-127` — códigos genéricos esconden causas accionables](../../issues/open/ISSUE-127-globe-generic-error-codes-hide-actionable-causes.md)
- [Persistencia durable de Globe](../../architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md) · [Asset Governance Worker](../../architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md)
- Runbook vecino: [Operar el contrato creativo por ruta de Globe](operar-contrato-creativo-ruta-globe.md) — la secuencia de rollout completa y el resto de los cambios que se hacen como dato.
- Repo `efeonce-globe`: `packages/domain/src/governed-run-failure-policy.ts` ·
  `packages/domain/src/governed-run-lifecycle.ts` · `packages/domain/src/model-lab-run-finalizer.ts` ·
  `packages/database/src/stores/governed-run-store.ts` · `apps/studio-web/src/worker-main.ts` ·
  `apps/creative-runner/src/production-route-failure-classification.test.ts`
</content>
