# GA4 Connection UI V1

> Estado: implementado localmente; rollout y prueba OAuth real pendientes.
> Superficie: Account 360, `/agency/clients/[organizationId]/lifecycle`.

## Dirección visual

El panel de GA4 es hermano del panel existente de Search Console. Reutiliza su contenedor, jerarquía de título y estado, botones y diálogo de desconexión. La diferencia visible es la selección de propiedad GA4 desde la lista que devuelve Google. No se introduce una primitive nueva.

## Flujo

1. El operador con `growth.ga4.connect` inicia OAuth de solo lectura para la organización abierta.
2. El callback valida un state de un solo uso vinculado al usuario y a la organización.
3. El panel carga las propiedades accesibles por esa cuenta y permite elegir una.
4. El estado conectado muestra nombre e ID de propiedad; la desconexión pide confirmación y remueve el vínculo al token.

La UI consume comandos/rutas del dominio `src/lib/growth/analytics-ga4`; nunca recibe el refresh token. El flag `GROWTH_GA4_ENABLED` está apagado por defecto. Sin permiso, el panel muestra su estado sin acciones.

## Verificación pendiente

- Aplicar la migración junto con el release y configurar OAuth/IAM para `ga4-token-*`.
- Completar consentimiento real, selección de la propiedad de Grupo Berel y lectura Data API.
- Revisar captura GVC en desktop y 390 px, teclado, foco y diálogo de desconexión sobre el runtime configurado.
