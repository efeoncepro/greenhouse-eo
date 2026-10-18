# Activar y comprobar el ID nativo de HubSpot Forms

Estado 2026-10-18: schema y worker compatibles servidos; propiedad, campo nativo y mapping de
Performance activos y verificados. La primera identidad nativa de una ocurrencia sigue pendiente.
[Reparación y readback](../../audits/releases/2026-10-18-candidate-89d70ec13-review.md).
[Activación y readback de configuración](../../audits/growth/2026-10-18-google-ads-activation.md).
[Contrato funcional](../../documentation/growth/hubspot-native-form-receipts.md) ·
[ADR](../../architecture/GREENHOUSE_HUBSPOT_FORM_RECEIPT_DECISION_V1.md).

## Preparación verificada, 2026-10-17

Portal Efeonce `48713323`, app canónica `33235280`; introspección confirmó `forms` y scopes de
schema contactos read/write. Propiedad técnica inexistente al consultar; grupo existente
`greenhouse_growth_forms`. Performance `89652ccf-8393-4361-a650-878982132cfe` tiene 13 campos,
ninguno oculto. Un PATCH preparado conserva esos 13 y añade el técnico como 14º, `hidden=true`,
`required=false`, `objectTypeId=0-1`. Nunca cambiar los campos comerciales para rastrear el envío.

Plan privado 0600 y evidencias fuera del repo:
`/Users/jreye/Documents/Meta-Efeonce-Connection/occurrence-marker-2026-10-17/`.
Contiene property-create, definición previa/PATCH/esperada, SHA256 y pre/postcondiciones. El plan
no es una escritura. Antes de aplicarlo, revalidar identidad, ausencia o definición equivalente
de propiedad y hash de la definición nativa; si hay drift, volver a preparar conservando lo nuevo.

## Configuración activa verificada, 2026-10-18

Portal `48713323` y app canónica `33235280` confirmados. Se creó
`ef_greenhouse_submission_id` como string/text, `formField=true`, en `greenhouse_growth_forms`.
El formulario Performance `89652ccf-8393-4361-a650-878982132cfe` conserva sus 13 campos/grupos
originales y settings; un único PATCH añadió el 14.º, oculto y opcional, `objectTypeId=0-1`.
HubSpot agregó sólo `groupType=default_group` y `richTextType=text` al grupo nuevo. La diferencia
se reconcilió mediante GET y un guard acotado, sin repetir el PATCH.

`configureHubSpotSubmissionTracing` activó `submissionIdProperty` por CAS del mapping fresco en
el destino existente `fdst-563c7c71-fda6-4fde-a327-5786986b61ee`, preservando versión publicada,
habilitación, mapping comercial y políticas. Readback independiente: propiedad, formulario y
mapping verificados. Los pasos de provisión/configuración siguientes ya están aplicados para
este destino; no repetirlos como prueba. No se crearon contactos, envíos ni reservas.
[Evidencia de activación](../../audits/growth/2026-10-18-google-ads-activation.md).

El próximo envío real autorizado debe producir el marcador histórico y un `conversionId` exacto
antes de declarar verificada la primera ocurrencia. No hacer backfill ni reenviar leads anteriores.

## Activación dentro del release autorizado

1. Promover el código por el control plane habitual. Revisar el lote completo del release antes
   de autorizar push, deploy o transición DB. No ejecutar código local como prueba de producción.
2. La [expansión versionada](../../../migrations/20261018174803715_hubspot-native-form-receipts.sql)
   se aplicó el 18/10 para reparar el dispatcher existente, sin nuevo despliegue. Releer columnas,
   constraints, índice y trigger antes de activar el mapping; no repetir la migración ni un POST.
   El ledger conserva owner/grants y sus filas anteriores.
3. Crear o reusar propiedad `ef_greenhouse_submission_id`, `type=string`, `fieldType=text`,
   `formField=true`, grupo existente. Releer su definición y el formulario; aplicar el PATCH del
   campo oculto sólo contra el snapshot fresco. No crear contactos ni enviar leads de prueba.
4. En el destino existente de Performance usar `configureHubSpotSubmissionTracing` del módulo
   canónico `forms/commands`, con `destinationId`, `expectedMapping` recién leído y `enabled=true`.
   Es configuración interna del release autorizado, no una escritura de la CLI Meta ni una API
   pública. CAS añade sólo `submissionIdProperty`, preserva el mapping y evita desactivar/recrear
   destinos o publicar otra versión de fuente/policy. Un `false` indica drift: releer y revisar.
   Releer destino y versión; no copiarlo a otros portales/formularios sin verificar su schema.
5. Verificar la revisión activa compatible del ops-worker; ya estaba servida al reparar el18/10.
   Si el release añade otro delta, desplegarlo sólo por el control plane autorizado.
   Los drains devuelven `hubspotReceipts`.
   Una migración ausente detiene dispatch antes del POST; nunca arreglarlo redispatchando a ciegas.
6. En el próximo envío real autorizado, comprobar `delivered`, recibo pendiente y luego `verified`
   con `provider_submission_id`. Releer el historial nativo con marcador/ID exactos y cobertura
   completa. Hasta ese readback el round-trip del campo no queda certificado en vivo.

```sh
pnpm --silent meta leads trace --submission-id fsub-UUID --source-only
pnpm --silent meta leads trace --submission-id fsub-UUID --pages 3 --limit 50
```

## Diagnóstico y rollback

- `pending`: revisar próxima consulta, checks y cobertura. El límite de páginas no prueba ausencia.
- `ambiguous`: más de una ocurrencia con ese marcador; no elegir una ni reenviar.
- `denied`: acceso/portal denegado; detener y resolver con el operador, sin ampliar scopes por inferencia.
- `exhausted`: ocho checks o 24 horas; no se certificó el ID, aunque el POST haya sido exitoso.
- `unavailable` en summary: revisar storage/reader; el summary nunca modifica entrega comercial.

Rollback conservador: retirar el opt-in de mapping y desplegar código compatible; conservar columnas
y recibos ya guardados. El Down deliberadamente no borra evidencias. Los históricos sin marcador no
se promueven mediante email/hora ni se vuelve a enviar su formulario.

Pruebas locales incluyen límites, ambigüedad, paginación malformada, CAS, guard antes del POST y
aislamiento de entrega. SQL Up repetido y constraints/triggers ejercitados en PostgreSQL 17.5
aislado (PGlite), sin conexión a la base compartida. Esto no sustituye al readback del release.

Revisión final local: `verified` sin checks/fecha/paginación completa se rechaza también en lecturas;
marcador exacto sin `conversionId` válido no produce confirmación. El selector SQL protege el cast de
fechas inválidas sin detener otros recibos; no corregir estos estados repitiendo el POST comercial.
[Regresiones](../../audits/growth/2026-10-17-meta-cli-final-review.md), sin activación externa.
