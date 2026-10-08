# QuePlan y WIN — investigación y alta de leads, 08-10-2026

Portal `48713323`, Julio owner `75788512`; identidad verificada por MCP y Agent CLI `0.15.1`.
Scope autorizado: investigar dos interlocutores, alta/reuso CRM y memoria del repo; correo corporativo
de Jorge mediante Apollo. **CRM, enriquecimiento y documentación verificados.** El operador confirmó
expresamente el costo waterfall exigido por su tool. No hay envío ni oportunidad calificada.

## Evidencia y resultado

- Jorge: Contact y Company existentes reutilizados; cargo, empresa, LinkedIn y clasificación fría actualizados.
- Fiorella: Contact y Company nuevos, correo individual corporativo publicado por ella en la captura.
- Dos Leads activos `new-stage-id`, owner Julio, Primary Contact y Company correctos, releídos por MCP.
- Dos notas de investigación asociadas a Contact, Company y Lead; fuentes y contenido releídos.
- Contact/Company con `research_2026_10_08`; QuePlan conserva también la cohorte06.
- Fit `creative` en ambos contactos; Fiorella `individual_email`, `Social Media`, `Retail`.
- Jorge `individual_email` tras Apollo: dirección corporativa QuePlan `Verified`, ZeroBounce `valid`,
  dos entradas idénticas del mismo buzón, 2 créditos consumidos. Match de identidad de confianza alta.
  Se reemplazó el correo principal Galgo; el histórico queda en nota/prestate. No se inventó dirección ni
  se atribuyó `servicio_de_interes`; Galgo conserva asociación histórica sin Primary.
- WIN `APPAREL_FASHION`, Perú; discrepancia 51–200 vs 11–50 personas preservada, sin cifra exacta ni ICP aprobado.

El MCP restringe escritura de LEAD (discovery/identity reportan permiso o reautenticación), pero permite
lectura. Se verificó la CLI directa y su lectura real, sin cambiar identidad/portal, usar service keys,
saltarse OAuth ni despertar Kortex. Creates/updates con preview; updates usando digest/confirm.
Lectura final independiente por MCP.

## Corrección del duplicado de esta sesión

La automatización nativa creó el Lead Fiorella segundos después de registrar Contact. El create manual
posterior produjo otro Lead. Se conservó el automático, se asoció la nota y se actualizó su nombre.
El duplicado manual no tenía emails, llamadas, reuniones, comunicaciones ni negocios. Se archivó sólo
ese duplicado con el comando ordinario, sin GDPR/purga; readback MCP `notFound` y CLI 404 para el archivado.
El lector de asociaciones puede conservar la arista hacia un objeto archivado: no usar sólo esa lista
para contar Leads activos. En próximas altas reconsultar asociaciones/objetos tras la automatización
antes de crear otro Lead. Ningún contacto o empresa se borró.

## Segmentos existentes

Se reutilizaron sin modificar filtros ni crear segmentos:

| ID | Tipo | Expresión existente | Membresía del corte |
| --- | --- | --- | --- |
| 178 | CONTACT ACTIVE | cohorte08 AND persona con/sin email AND fit creative | 4; incluye ambos contactos de este delta |
| 179 | COMPANY ACTIVE | cohorte08 | 5; incluye las dos empresas de este delta |

Se enumeraron completos ambos conjuntos, sin paginación restante, y se verificó cada entrada del delta.
El primer readback de 178 aún no incluía Jorge; al recalcular lo incorporó sin cambiar filtros ni
inscribirlo manualmente. Los miembros anteriores pertenecen a otros intakes de la ronda.
178 admite personas sin correo vigente; no es un universo de envío.

Contrato vigente:
[segmentación por propiedades](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).
Sin nuevo schema, ADR, opciones, filtros, consentimiento, contactos de marketing, workflows o secuencias.

## Continuidad y memoria

[QuePlan — Jorge](../../commercial/prospects/queplan-jorge-godoy-2026/README.md): prospección fría, empleo
vigente, vínculo con Cadencia Digital y correo corporativo verificado por Apollo.
[WIN — Fiorella](../../commercial/prospects/win-fitness-wear-social-2026/README.md): convocatoria y alcance
Perú/USA; calificar tamaño, buyer y presupuesto antes de una propuesta.

Capturas copiadas con hash SHA-256, prestate de Jorge, payloads/readbacks e IDs individuales en
`.auth/jorge-fiorella-intake-20261008/`, ignorada por Git, directorio `0700` y archivos `0600`.
El repo conserva continuidad sin correos ni capturas de perfiles. Sin push ni comunicación.
Los próximos agentes deben leer estado fresco antes de enriquecer o contactar.

Validación documental: QA proporcional a los seis paths, closure sin warnings, enlaces/PII y context
gate final PASS tras la última edición de Handoff. No se tocó código runtime.
