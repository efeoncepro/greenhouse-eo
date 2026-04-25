# Commercial Parties

Pantalla administrativa para observar y corregir el lifecycle comercial de una organización sin salir de Greenhouse.

## Donde vive

- Lista: `/admin/commercial/parties`
- Detalle: `/admin/commercial/parties/:id`

## Que permite hacer

- Ver cuántas parties están en `prospect`, `opportunity`, `active_client`, `inactive`, `provider_only`, `disqualified` y `churned`
- Detectar conflictos entre Greenhouse y HubSpot
- Revisar el historial completo de transiciones
- Confirmar si la party ya tiene `client_id`, quotes activas o contratos activos
- Forzar una transición manual si el operador tiene permisos

## Como se interpreta

- `Lifecycle`: estado comercial canónico de la organización
- `Sync health`: indica si la señal de Greenhouse y HubSpot está alineada, si falta ancla HubSpot o si requiere atención
- `Client bridge`: muestra si la party ya fue enlazada al carril financiero
- `Conflictos`: avisa cuando hay drift o ownership en disputa entre Greenhouse y HubSpot

## Cuando usarla

- Cuando una party parece estar en el stage equivocado
- Cuando Sales o Finance reportan que HubSpot y Greenhouse no coinciden
- Cuando se necesita revisar por qué una company no avanzó a cliente activo
- Cuando Ops necesita ejecutar o validar el sweep de inactividad

## Permisos

- La surface vive en Admin Center
- Las transiciones manuales requieren la capability `commercial.party.override_lifecycle`

## Límite importante

Esta pantalla no reemplaza las surfaces de cotización, deals o contratos. Sirve para observación, diagnóstico y corrección administrativa del lifecycle.

> Spec técnica: [GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1](../../architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md)
