# Preparar la transición de origen y canales en HubSpot

Estado19/10/2026: dirección conceptual aceptada; schema/backfill propuestos, **sin writes**.
Portal exclusivo Efeonce48713323. [Contrato](../../architecture/EFEONCE_COMMERCIAL_ACQUISITION_TAXONOMY_DECISION_V1.md) ·
[Funcional](../../documentation/hubspot-as-a-service/origen-canales-adquisicion.md).

## Antes de cambiar algo

1. Verificar `hubspot whoami`, conexión MCP, portal y permiso efectivo de cada operación. CLI y
   MCP no comparten necesariamente autoridad. No usar perfiles de otro cliente ni service keys
   para eludir un403. [Runbook](../../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md).
2. Releer metadata de `canal_de_adqusicion`, todos sus valores y los campos candidatos. Mantener
   nombre interno, multiselect, opciones y valores legacy. La lectura19/10 confirma472 propiedades
   Contact y252 Deal; el inventario11/10 sigue siendo una captura histórica, no se reescribe.
3. Capturar valores por Deal y paginación completa, sólo IDs y campos necesarios en almacenamiento
   privado0600. Excluir nombres, correos y montos si no son necesarios. La evidencia pública sólo
   contiene conteos; relectura fresca antes de cada lote.
4. Auditar informes/definiciones, workflows v4/clásicos, vistas, forms, segmentos propios y con
   asociaciones, scripts, integraciones y consumidores de agentes. Metadata listada sin referencia
   literal no prueba ausencia de uso. El403 de workflows permanece como cobertura pendiente.

## Payload propuesto y reglas

Los tres nombres candidatos son `ef_acquisition_origin`, `ef_acquisition_channel` y
`ef_acquisition_source` en Deal, grupo existente dealinformation. No existen en la lectura19/10.
El [artefacto saneado](../../audits/commercial/2026-10-19-acquisition-taxonomy-discovery.json) contiene
opciones, tipos, expectedAbsent y ausencia de defaults. Es un plan descriptivo `executable:false`;
no es un comando que cree schema o migre registros.

Antes del create, revisar la tabla nombre/label/objeto/tipo/opciones/description/owner/writer y consumidores.
Preparar descriptions y reglas de validación definitivas; los labels y catálogo pueden ajustarse tras
review. Metadata editable no autoriza writes. Usar dry-run sólo si el comando lo ofrece: no inventarlo
para `properties create`. Leer la definición después de una escritura concreta autorizada.

| Legacy único | Candidato | Qué permanece desconocido |
|---|---|---|
| WherEX / Mercado público | tender + procurement_platform + fuente correspondiente | Veracidad de la clasificación original y atribución comercial |
| Partnership | partner | Partner concreto y canal |
| Referidos | referral | Quién refirió y por qué canal |
| Prospección directa | outbound | Si fue email, teléfono, LinkedIn u otro |
| Marketing | Revisión | Todos los canales específicos y el origen comercial |
| Varios valores / vacío | Revisión | Primario y evidencia suficiente |

168 filas sólo son candidatas a traducción;125 no se traducen automáticamente. No asignar unknown,
other, inbound o direct como relleno. No sobrescribir targets ya informados por un proceso nuevo.
No convertir clasificación legacy en prueba de intención, oportunidad válida o venta.

## Aplicación futura por lotes

1. Completar la cobertura de consumidores y revisar el schema final; conservar snapshot/hash y
   propuesta por fila. El plan privado preparado vive en `.auth/acquisition-taxonomy-20261019/plan.json`;
   no contiene credenciales ni payload de leads, pero incluye IDs internos y no se versiona.
2. Obtener aprobación concreta del schema y luego del lote/IDs/campos; la aceptación conceptual
   no autoriza la creación ni el backfill. Separar cambios de consumidores de los de valores.
3. Crear/reutilizar schema, leerlo y verificar consumidores antes de poblar. No cambiar el tipo del
   campo legacy de checkbox a select ni renombrar su key para corregir la ortografía.
4. Antes de cada PATCH, revalidar portal, metadata, valor legacy esperado y targets vacíos. Si cambió,
   conflicto y revisión; no forzar el snapshot. Guardar journal privado y no repetir unknown.
5. Excluir del backfill disparadores de lifecycle, conversiones Ads y comunicaciones. Nunca cambiar
   etapa, monto, consentimiento, asociaciones o marketing-contact status para reconciliar taxonomía.
6. Leer cada fila y consumidor afectado; comprobar conteos, campos preservados y efecto nulo fuera
   del lote. No evaluar éxito por HTTP únicamente. Si hay drift, detener sin revertir cambios ajenos.
7. Mantener legacy durante la convivencia. Sólo retirar su uso tras readback de consumidores,
   cobertura y aceptación del operador; no eliminar propiedades o datos como limpieza.

Rollback vuelve a los consumidores anteriores y restaura únicamente valores que el lote cambió,
si aún coinciden con el postestado esperado. Conserva nuevas evidencias y no crea conversiones ni
reenvía solicitudes históricas. No borrar campos para fingir que no hubo una migración.
