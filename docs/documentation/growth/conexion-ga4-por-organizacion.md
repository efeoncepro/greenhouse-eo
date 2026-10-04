# Conexión GA4 por organización

La conexión permite a un operador vincular una propiedad Google Analytics 4 a la organización abierta
para leer actividad del sitio. Usa consentimiento Google de sólo lectura y una propiedad por
organización. Greenhouse no instala medición ni modifica eventos de la propiedad al conectarla.

## Quién puede usarla y cómo funciona

El operador necesita `growth.ga4.connect` y el flag GA4 activo en ese runtime. En Account 360 inicia
consentimiento con una cuenta Google que tenga acceso a la propiedad, y elige una de las propiedades
que devuelve esa cuenta. El callback queda vinculado al usuario y organización; otro usuario no
puede usar ese state. Las rutas de conexión excluyen al cliente externo.

Estados: pending hasta seleccionar propiedad; active cuando queda vinculada; revoked al desconectar
la referencia o cuando la lectura detecta credencial inválida; expired está declarado en el contrato.
El token vive en Secret Manager; la conexión sólo guarda su referencia. Una org conectada no concede
acceso ni representa a otra org.

## Qué datos aporta

El reader permite sesiones, usuarios, sesiones con interacción y duraciones por ventana/dimensión.
Insights usa el reader para visitas orgánicas y desde asistentes IA, conservando ventana, fuente y
metodología. Flag OFF omite la fuente; sin conexión expresa not_connected; token inválido o consulta
fallida expresa datos insuficientes, nunca visitas cero inventadas.

Conversions aún no está admitido por el reader. Integración al grader y señal de salud de token siguen
pendientes en TASK-1284. TASK-1787 entrega la serie de referrals IA de producto y consume la conexión
existente; no duplica el resolver ni espera el cierre de todas las ampliaciones de TASK-1284.

## Disponibilidad y evidencia

Canary histórico 02/10: Berel conectada por UI en staging, propiedad 328274754 active y lectura Data API
real. Release fe261ca2745f del 03/10 llevó código/flag a Production y OAuth/flag al worker. Fuentes:
[TASK-1284](../../tasks/in-progress/TASK-1284-growth-ga4-multitenant-connection-signal.md) y
[ledger](../../operations/FEATURE_FLAG_STATE_LEDGER.md). No se hizo nuevo canary live el 04/10 ni se
certificó toda la cohorte. La task permanece abierta por las capacidades y verificaciones residuales.

[Manual](../../manual-de-uso/growth/conectar-ga4-por-organizacion.md) y
[arquitectura](../../architecture/growth/ga4-connection-ui-v1.md).
