# HubSpot: cuentas objetivo, buying groups y operación API / CLI

Fecha de consulta y readback: **2026-10-11**. Portal de lectura: **48713323**, Efeonce/Kortex.
Estado: investigación completada, capacidades documentadas y lecturas verificadas; sin cambios SaaS.
Continuidad: después del commit local **293d3f4cd** de la skill ABM/ABS y buying group.
Método: fuentes primarias públicas, dos subagentes de documentación/API y contraste del principal con
metadatos/lecturas de Agent CLI y MCP. No entrevistas, activación beta, sandbox write ni auditoría visual.
La guía completa Agent CLI dio error en el lector; se contrastaron changelog/repo oficial y help instalado.
Modo de investigación directa del [ADR](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md).

## Resultado y confianza

**Sí hay vía API/CLI para el dato ABM estándar:** selección de Company, tier ICP, roles de Contact y
asociaciones. Lectura comprobada; escritura disponible en contratos/help pero no ejecutada en este encargo.
**No hay contrato público encontrado para operar el organigrama nativo Buying Groups.** La CLI enumera
su tipo y permite metadata, pero rechaza listado y búsqueda. No concluir inexistencia de API interna ni
soporte CRUD a partir de enumeración. Confianza alta en esta distinción al corte; soporte futuro puede cambiar.

Propuesta: usar propiedades/asociaciones documentadas para la capa operativa de prospección y evaluar
Buying Groups como visualización cuando se confirme beta/layout. Roles por iniciativa necesitan un modelo
explícito: el atributo global de Contact no resuelve ese alcance. No crear un objeto paralelo en este research.

## Qué documenta HubSpot

### Cuentas objetivo y dato ABM

ABM está disponible con Marketing o Sales Hub Pro/Enterprise. Sus datos estándar son Company Target account
(checkbox), Company ICP tier (fit en tres niveles) y Contact Buying role (multiselección). Alimentan vistas,
segmentos e informes. Account overview exige seat Sales Pro/Enterprise. [KB ABM, actualizada 06-10-2026][s01].

Target Accounts reúne seguimiento por empresa; marcar/desmarcar cambia el checkbox. La selección UI de
empresas existentes exige dominio conocido; no se presume requisito universal del API PATCH. Añadir empresas
nuevas vía Breeze consume créditos. Buyer Committee muestra contactos asociados y usuarios internos de
actividades, con filtro por buying role: la KB no lo identifica como un Buying Group particular. [Índice, 07-09-2026][s02].

### Organigrama Buying Groups

La KB 15-09-2026 mantiene **Beta**, Sales/Service Hub Pro/Enterprise y opt-in Super Admin. Crear/editar exige
seat Sales/Service; Core/View-only visualiza. Se añade tarjeta a Company; admite varios gráficos nombrados,
plantillas/manual/IA/Breeze, relaciones/notas y heatmap. Auto-build: menos de 100 contactos asociados.
Los placeholders representan stakeholders sin Contact CRM, con nombre/cargo/notas opcionales. Editar buying
role afecta al contacto; la KB no prueba aislamiento de ese rol por grupo o Deal. [Buying Groups][s03].

Interpretación Efeonce: los placeholders podrían preservar brechas sin nuevas altas vacías, previa verificación
del comportamiento real. Un gráfico jerárquico no valida mando/participación. Nombrar varios grupos por
iniciativa ayuda al trabajo humano, pero no demuestra asociación exclusiva iniciativa→grupo→Deal ni
sincronización entre líneas gráficas y labels CRM. No se presume beta habilitada por existir metadata.

## Readback efectivo: campos y permisos

Agent CLI **0.15.1, build 1348**, `whoami` confirmó portal 48713323 y scopes CRM Company/Contact/Deal
de lectura/escritura. MCP confirmó el mismo portal/operador y seats `sales-pro`, `service-professional`.
Son permisos/lecturas fechados; no prueba de write aceptado, beta activa o tarjeta añadida.
No se expandió autenticación ni se consultaron archivos de credenciales.

| Objeto/campo | Metadata CLI/MCP observada | Decisión operativa |
| --- | --- | --- |
| Company `hs_is_target_account` | `bool`, `booleancheckbox`, visible, opciones `true`/`false`, valor no read-only | Indicador vigente de selección; no equivale a demanda/calificación |
| Company `hs_ideal_customer_profile` | Enum radio, visible, `tier_1`, `tier_2`, `tier_3`, valor no read-only | Fit ICP; no sobrescribir como intensidad o presupuesto ABM |
| Contact `hs_buying_role` | Enum checkbox multiselect, visible, valor no read-only | Roles globales del Contact; evidencia por iniciativa se conserva aparte |
| Company `hs_target_account` | Enum radio oculto `tier_1/2/3`, definido desde 2019; MCP no lo devuelve | Campo antiguo coexistente; no confundir con checkbox actual ni borrar/migrar |
| Company `hs_num_contacts_with_buying_roles` | Number, read-only | Conteo de contactos asociados con rol; no prueba participación |
| Company `hs_num_decision_makers` / `hs_num_blockers` | Number, read-only | Resumen de etiquetas; no autoridad o postura confirmadas |

Roles live: `BLOCKER`, `BUDGET_HOLDER`, `CHAMPION`, `DECISION_MAKER`, `END_USER`, `EXECUTIVE_SPONSOR`,
`INFLUENCER`, `LEGAL_AND_COMPLIANCE`, `OTHER`. No asignar por cargo ni eliminar valores existentes.
CLI y MCP coincidieron en checkbox actual, tier y roles. El campo oculto sólo apareció en CLI; que MCP
lo omita no prueba que haya sido borrado. Los ejemplos públicos pueden tener opciones diferentes del portal.

Una búsqueda CLI `hs_is_target_account=true`, limit 1 y sin campos personales, fue exitosa y devolvió
`meta.total=4`. Es total reportado por Search al corte, no auditoría de esos cuatro expedientes, selección
aprobada nueva ni clasificación de su relación/ICP. Se evitó guardar registros o emails reales en Git.

## Buying Groups: metadata disponible, registros rechazados

`objects types` enumeró `buying_groups`, ID **0-3196**. `properties list` devolvió **38 definiciones**.
Una muestra útil:

| Propiedad observada | Significado declarado por el proveedor | Límite de interpretación |
| --- | --- | --- |
| `hs_name` | Nombre del grupo; valor no read-only | No demuestra que este endpoint permita crear/editar grupos |
| `hs_chart_data_id` | Identificador de datos del gráfico, oculto/read-only | No usarlo para buscar endpoints internos |
| `hs_contacts_count` | Posiciones con Contact asignado, read-only | Cuenta posiciones; no asumir personas únicas |
| `hs_placeholders_count` | Posiciones sin Contact, read-only | Brechas representadas; no prueba rol crítico ni búsqueda agotada |
| `hs_template_contacts_count` / `hs_template_placeholders_count` | Posiciones de origen plantilla, read-only | Denominador del porcentaje de completitud |
| `hs_completeness_percent` | Posiciones de plantilla ocupadas / total posiciones de plantilla × 100; cero si no hay plantilla | No equivale a suficiencia funcional ni calificación comercial |
| `hs_buying_role` del grupo | Rollup string de roles de posiciones, read-only | Distinto del checkbox escribible del Contact |

Comandos reales de lectura, ambos fallidos con 400:

```sh
hubspot objects list --type buying_groups --limit 1 --properties hs_name --format json
hubspot objects search --type buying_groups --limit 1 --properties hs_name --format json
```

Mensaje relevante: `Object type BUYING_GROUP is not supported by this endpoint`.
El listado efectivamente probado incluyó también los conteos/completitud. No se hicieron intentos create,
update, delete, búsquedas de IDs alternativos ni cambios de credenciales. Dos lecturas distintas rechazadas
son evidencia del carril instalado; no de todos los endpoints posibles. MCP no expuso BUYING_GROUP como
objeto disponible: su búsqueda semántica devolvió Campaign, que se descartó como match incorrecto.

## API pública: superficie documentada

Los contratos permiten leer definiciones, leer/actualizar Company/Contact y buscar por propiedad. Se usa
el nombre interno del portal y sus opciones. Para roles multiselect, Properties documenta valores separados
por `;` y append con `;` inicial. [Companies][s04], [Properties][s05], [Search][s06].

Ejemplo preparado, **no ejecutado**; modifica un registro existente y no crea otra Company:

```http
PATCH /crm/v3/objects/companies/{COMPANY_ID}
Content-Type: application/json

{"properties":{"hs_is_target_account":"true"}}
```

Ejemplo [Contact][s15] preparado: `PATCH /crm/v3/objects/contacts/{CONTACT_ID}` con
`{"properties":{"hs_buying_role":";BUDGET_HOLDER;END_USER"}}` para agregar esos roles sólo cuando
la evidencia/alcance los autoricen. Readback solicita las propiedades explícitamente, preserva historial
cuando corresponda y valida automatización posterior; Search puede tener demora de indexación.

Associations permite etiquetas Contact–Company y Contact–Deal, IDs por portal/dirección y lectura de
`toObjectId`/`associationTypes`. Usar Contact–Deal para el rol en una iniciativa es **propuesta de modelado**;
no API nativa del gráfico. Verificar contrato/labels existentes antes de cambiarlo. [Associations][s07].

```http
GET /crm/associations/2026-03/contact/deal/labels
PUT /crm/objects/2026-03/contact/{CONTACT_ID}/associations/deal/{DEAL_ID}
Content-Type: application/json

[{"associationCategory":"USER_DEFINED","associationTypeId":{LABEL_TYPE_ID}}]
```

`LABEL_TYPE_ID` es un placeholder de documentación, no JSON válido hasta resolver el ID real.
No crear Deal sólo para alojar un mapa. Antes de calificación, usar expediente/nota autorizada con ancla
de necesidad/decisión; después, considerar asociación con el Deal existente. Un label no confirma autoridad
y la propiedad Contact no debe mezclarse entre oportunidades. No se implementó ese modelo en este encargo.

### Versiones, límites y permisos

`latest` resuelve actualmente a **2026-09**; `2026-03` es una versión fija distinta y legacy conserva sus
rutas v3/v4. Cada familia necesita su ruta explícita; no reemplazar sólo un segmento de URL ni usar `latest`
como garantía de estabilidad. Los ejemplos fijan contratos verificados, no la versión interna de la CLI.
[Versionado][s08], [Spotlight septiembre 2026][s09].

Verificar scope exacto, permiso por objeto, suscripción y restricción del endpoint. El widget público Required
Scopes no se pudo leer íntegro; no se certifica aquí un manifiesto de mínimos por API. `whoami` y MCP prueban
scopes/availability observados, no todos los writes. Las reglas de validación y read-only pueden impedir cambios.

Search documenta 5 requests/s/cuenta, 200 filas/página, límite de 10.000 por consulta y demora de indexación.
Paginar sin confundir primer lote con cobertura; diseñar cortes para volúmenes mayores. [Search][s06].
Los límites de asociaciones son específicos de versión/plan. La KB actual de labels dice 50 por par mientras
la guía Association Schema 2026-03 dice 10: conservar el conflicto, consultar límite efectivo antes de una
taxonomía extensa y no introducir cuotas desde documentación discrepante. [KB labels][s10], [schema][s11].

## CLI: qué sirve hoy en este host

Agent CLI `hubspot` opera CRM; Developer CLI `hs` se orienta a proyectos/CMS y mantiene autenticación
distinta. El anuncio de Agent CLI es genérico; el `--help` de 0.15.1 define flags/auth efectivos.
[Changelog oficial][s12], [repo oficial][s13].

Lecturas reproducibles, sin datos personales:

```sh
hubspot whoami
hubspot properties get --type companies hs_is_target_account --format json
hubspot properties get --type companies hs_ideal_customer_profile --format json
hubspot properties get --type contacts hs_buying_role --format json
hubspot objects search --type companies --filter 'hs_is_target_account=true' --properties hs_is_target_account --limit 1 --format json
```

Preview preparado, **no ejecutado**, con ID que debe resolver el operador:

```sh
hubspot objects update --type companies COMPANY_ID --property hs_is_target_account=true --dry-run --format json
```

No asumir `--dry-run` para todos los verbos: `objects update` lo documenta, `associations create` instalado
no lo muestra. El help de `associations create` y `labels-list` exige service key y no soporta OAuth de usuario;
`associations list` sí acepta OAuth. No se cambió a service key ni se probó escritura para resolver esa limitación.
API pública/MCP pueden ser alternativas dentro del mismo alcance, con su propia identidad/permiso verificados.

| Operación | API pública | CLI instalada | Evidencia de este encargo |
| --- | --- | --- | --- |
| Seleccionar/desmarcar Company target | PATCH documentado | `objects update`/preview documentados | Metadata + Search exitosos; write no probado |
| Leer/asignar tier ICP | Propiedad Company documentada | Get/update de objeto | Enum leído; asignación no ejecutada |
| Leer/agregar buying roles | Contact + multiselect documentados | Get/update de objeto | Enum leído por ambos carriles; write no probado |
| Relacionar contactos/Deal con labels | Associations documentada | Create/labels-list exige service key | Sólo help; modelo y write pendientes |
| Leer esquema Buying Groups | Metadata observada | Types/properties exitosos | 0-3196 y 38 definiciones |
| Listar/buscar registros Buying Groups | Contrato específico no encontrado | Rechazados con 400 | Ambos reads fallidos, no escalar |
| Gráfico, posiciones, personas, relaciones, placeholders | API específica no encontrada | Sin comando especializado observado | UI documentada; beta/layout no comprobados |

## Próximas mejoras posibles de la skill

Propuestas, sin implementación automática:

1. **Adapter HubSpot account-based:** diccionario validado, Company/Contact/Deal separados, flags/roles
   y changeset/readback. Conservar estado UI/CLI/API por capability; no simular sincronización del gráfico.
2. **Plantilla de capacidad y economía:** horas por owner, plazas simultáneas, seguimiento, costo cargado,
   herramientas asignadas y caja incremental. Finance/Pricing conserva tarifas y aprobación.
3. **Proof y discovery por oferta/función:** preguntas y material compartible conectado a casos aprobados,
   con criterios de decisión y evidencia exigida; no paquetes de mensajes por cargo sin contexto.
4. **Aprendizaje de cuenta:** win/loss/no decisión, vigencia de mapas y triggers para reabrir investigación;
   distinguir resultado comprador de actividad. Ampliar evals desde fallos reales y evidencia local.

Primer trabajo recomendado: diseño del adapter y contrato de roles por iniciativa. Aprovecha capacidades
comprobadas sin depender del CRUD del gráfico. Confirmar beta/layout y un caso reversible del gráfico
requeriría un encargo operativo concreto; investigar API no autoriza activarlo o crear grupos/contactos.

## Fuentes y verificación

Todas abiertas el 2026-10-11; páginas de proveedor son autoridad del contrato declarado, no prueba de
disponibilidad del portal. No se encontró Buying Groups en la [documentación indexada pública][s14]; la
ausencia en ese índice limita el claim a contrato no encontrado. No se afirma inexistencia absoluta.
Lecturas live agregadas/metadata sin tokens, credenciales ni PII de prospectos versionada. Reporte revisado;
enlaces locales, referencias y whitespace aprobados; cierre documental estricto del informe/Handoff sin
warnings y `pnpm docs:context-check:strict` sin errores/warnings. Investigación posterior al commit de método;
este informe no modifica skills ni CRM y no forma parte de 293d3f4cd.

[s01]: https://knowledge.hubspot.com/branding/get-started-with-account-based-marketing-in-hubspot?tab=tab-crm
[s02]: https://knowledge.hubspot.com/prospecting/use-the-target-accounts-index-page
[s03]: https://knowledge.hubspot.com/prospecting/review-stakeholders-with-buying-groups
[s04]: https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/companies/guide
[s05]: https://developers.hubspot.com/docs/api-reference/legacy/crm/properties/guide
[s06]: https://developers.hubspot.com/docs/api-reference/2026-03/crm/search-the-crm
[s07]: https://developers.hubspot.com/docs/api-reference/2026-03/crm/associations/associate-records/guide
[s08]: https://developers.hubspot.com/docs/developer-tooling/platform/versioning
[s09]: https://developers.hubspot.com/changelog/fall-2026-spotlight
[s10]: https://knowledge.hubspot.com/object-settings/create-and-use-association-labels
[s11]: https://developers.hubspot.com/docs/api-reference/2026-03/crm/associations/associations-schema/guide
[s12]: https://developers.hubspot.com/changelog/hubspot-agent-cli-available-in-public-beta
[s13]: https://github.com/HubSpot/agent-cli
[s14]: https://developers.hubspot.com/docs/llms.txt
[s15]: https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/contacts/guide
