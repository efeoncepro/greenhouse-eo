# GA4 Connection UI V1

> Estado reconciliado (2026-10-04): conexión, commands, reader y panel implementados. Canary histórico
> del 02/10: IAM/URIs, consentimiento UI de Berel, propiedad `328274754` active y lectura Data API
> (13 filas). Release `fe261ca2745f` del 03/10: código/flag Production y OAuth/flag worker.
> Fuentes: [TASK-1284](../../tasks/in-progress/TASK-1284-growth-ga4-multitenant-connection-signal.md) y
> [ledger](../../operations/FEATURE_FLAG_STATE_LEDGER.md); sin nuevo readback live el 04/10.

> Superficie: Account 360, `/agency/clients/[organizationId]/lifecycle`.

## Dirección visual

El panel de GA4 es hermano del panel existente de Search Console. Reutiliza su contenedor, jerarquía de título y estado, botones y diálogo de desconexión. La diferencia visible es la selección de propiedad GA4 desde la lista que devuelve Google. No se introduce una primitive nueva.

## Flujo

1. El operador con `growth.ga4.connect` inicia OAuth de solo lectura para la organización abierta.
2. El callback valida un state de un solo uso vinculado al usuario y a la organización.
3. El panel carga las propiedades accesibles por esa cuenta y permite elegir una.
4. El estado conectado muestra nombre e ID de propiedad; la desconexión pide confirmación y remueve el vínculo al token.

La UI consume comandos/rutas del dominio `src/lib/growth/analytics-ga4`; nunca recibe el refresh token. El flag `GROWTH_GA4_ENABLED` está apagado por defecto. Sin permiso, el panel muestra su estado sin acciones.

## Verificación residual

- No repetir IAM/URIs/release ya registrados como trabajo faltante. Si una conexión falla, revisar
  configuración vigente antes de recuperar mediante los comandos gobernados.
- La task conserva integración al grader, conversions/segmento propio del reader y señal de salud.
  Insights ya consume sesiones orgánicas/IA (TASK-1962); no reemplaza esos criterios.
- Verificar reader OFF/revocación, rollback, monitoreo 7d y alcance/estado del consentimiento Google;
  no se revalidaron estos gates en esta pasada documental.
- Captura GVC de runtime configurado: desktop/390 px, teclado/foco y desconexión. La evidencia
  local del 19/09 no se presenta como nueva QA visual productiva.

## Fuentes funcionales y operación

- [Qué hace la conexión](../../documentation/growth/conexion-ga4-por-organizacion.md).
- [Cómo conectar y verificar](../../manual-de-uso/growth/conectar-ga4-por-organizacion.md).
