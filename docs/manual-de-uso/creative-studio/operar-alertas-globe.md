# Operar las alertas de Globe

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-05 por Claude (TASK-1641)
> **Documentacion funcional:** [El ciclo de vida de una corrida](../../documentation/creative-studio/efeonce-globe-ciclo-de-vida-corridas.md) · [Flota de modelos del Producer](../../documentation/creative-studio/efeonce-globe-producer-flota-modelos.md)
> **Documentacion tecnica:** [`GLOBE_PRODUCER_ALERT_TRIAGE_V1.md`](../../operations/creative-studio/GLOBE_PRODUCER_ALERT_TRIAGE_V1.md) · [`GLOBE_ROUTE_PROMOTION_RUNBOOK_V1.md`](../../operations/creative-studio/GLOBE_ROUTE_PROMOTION_RUNBOOK_V1.md)

## Para qué sirve

Hasta el 2026-08-05 las alertas de Globe estaban documentadas **por dominio**: unas en el runbook del ciclo de
corridas, otras en el de la flota, las nuevas en el triage. No había un solo lugar donde ver el inventario
completo, y eso hace que una alerta caiga en la bandeja de alguien que no sabe si le corresponde.

Esta página es ese inventario. Para el detalle forense de cada una, el dueño sigue siendo el
[triage](../../operations/creative-studio/GLOBE_PRODUCER_ALERT_TRIAGE_V1.md); acá está lo que necesitas para
decidir **si te toca a ti y qué haces primero**.

## Antes de empezar: dos causas de diagnóstico equivocado

1. 🔴 **~8 minutos de espera NO son una cola atascada.** Asset Governance avanza una etapa por tick de su cron,
   así que la latencia la pone el reloj, no el tamaño del archivo. Es la causa número uno de triage equivocado.
2. 🔴 **Un workflow en verde no prueba el estado.** Prueba que el pipeline corrió. Verifica siempre contra la
   revisión activa y el reader que corresponda.

## El inventario

| Alerta | Severidad | Qué significa | Primera acción |
|---|---|---|---|
| `globe_producer_worker_failures` | ERROR | Una ejecución del worker falló entera | Leer el payload sanitizado; el cron reintenta al minuto siguiente |
| `globe_producer_worker_queue_age` | WARNING | Trabajo reclamable envejeciendo en la cola | Descartar primero la latencia normal de governance |
| `globe_credit_expiry_held_age` | WARNING | Una reserva vencida lleva demasiado retenida | Revisar el dueño económico; no liberar a mano |
| `outboxTerminalAttempts` | ERROR | Intentos que ya murieron: trabajo pedido que no va a llegar | Leer la causa nombrada; steady esperado 0 |
| `outboxRetryStorm` | WARNING | Intentos insistiendo por encima del umbral, todavía vivos | Aviso temprano: mirar antes de que el tope actúe |
| `run_aggregate_divergence` | ERROR | Divergencia que el barrido no pudo cerrar | Es el detector de una pareja de agregados no declarada |
| **`globe_promotion_window_closing`** | WARNING | Una promoción `activated` entra en sus últimos 30 min | **Producir el canary ahora** — todavía alcanza |
| **`globe_promotion_readiness_divergent`** | ERROR | Un rollback dejó readiness `promoted` con el binding apagado | Ver abajo: el remedio obvio no existe |
| **`globe_run_abandon_release_degraded`** | WARNING | Falló la devolución rápida de una reserva pre-gasto | No hay pérdida; revisar el dueño económico |
| `globe_promotion_partial` | ERROR | Una promoción parcial se recuperó por rollback | Leer la evidencia del rollback |
| `globe_promotion_rollback_failed` | CRITICAL | El rollback **falló** | Intervención humana inmediata |
| `stalled` (queue age de promociones) | WARNING | Operaciones de promoción **ya reclamables** | Ver el par de abajo |

## Los dos lados del mismo instante: `window_closing` ⟷ `stalled`

Es el par que más se confunde, y confundirlo cuesta la promoción.

- **`globe_promotion_window_closing`** mira **hacia adelante**: la ventana sigue abierta y quedan ~30 min.
  **Todavía se puede salvar** — producir el canary cuesta ~10 min (generación + governance + sello).
- **`stalled`** mira **hacia atrás**: mide operaciones cuyo plazo **ya venció**. Cuando suena, la ventana se
  perdió.

**Si `window_closing` se apagó y `stalled` se encendió sobre la misma operación, el remedio dejó de ser el
canary**: la promoción se revirtió sola y hay que volver a promover.

## `readiness_divergent`: el remedio obvio hoy no existe

El aviso dice que una promoción revertida dejó su readiness en `promoted` con el binding apagado. Lo natural
sería **pausar esa readiness**… y **hoy nadie puede hacerlo**: el command exige una persona (rechaza a los
carriles de servicio) y la capability no está en el permiso de los humanos. Está registrado como pendiente en
`TASK-1463`.

✅ **Lo que sí funciona, y está verificado:** **volver a promover la ruta también cierra la divergencia**, porque
enciende el binding y vuelve coherente la readiness. Se ejercitó el 2026-08-05 y la señal bajó de 1 a 0.

**Cómo elegir:** si la decisión correcta es **restaurar** la ruta, vuelve a promoverla siguiendo el
[runbook de promoción](../../operations/creative-studio/GLOBE_ROUTE_PROMOTION_RUNBOOK_V1.md). Si la decisión es
**retirarla**, ahí sí necesitas el `pause` — y ése es justamente el caso que el diseño quiere que firme una
persona.

⚠️ **Verifica la identidad antes de actuar.** La señal filtra dos veces (última promoción de esa identidad **y**
binding todavía apagado) porque sin el segundo filtro reportaba rutas **vivas** que otro mecanismo había
habilitado — y el remedio las habría retirado.

## `run_abandon_release_degraded`: no cunda el pánico

Significa que la devolución rápida de una reserva falló y el sistema cayó al plazo de 24 h. **No hay pérdida**:
el crédito se recupera igual. Lo que dice la alerta es que la vía rápida se rompió, no que alguien perdió plata.

**No hagas nada manual sobre la reserva.** Revisa el dueño económico; el vencimiento la recoge.

## Qué no hacer

- **No silencies una alerta ni le subas el umbral** para que deje de sonar. Si suena por algo que no puedes
  arreglar, eso es información: regístrala donde su dueño la vea.
- **No trates una latencia normal como incidente.** Ver la primera sección.
- **No ejecutes SQL a mano** para "destrabar" nada. Todos estos caminos tienen su command gobernado.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Una alerta recién creada no aparece | Propagación de Cloud Monitoring (hasta 10 min) | Esperar y reintentar; no es defecto |
| `readiness_divergent` no baja | La divergencia sigue viva: nadie promovió ni pausó | Ver la sección de arriba |
| `window_closing` suena seguido | Promociones activadas sin el canary listo | Activar sólo cuando el canary esté listo para disparar |
