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

## Presentación humana: estilos, colores y alcance de la API

Revisión readonly **19/10/2026**, portal48713323, sesión Julio / `jreyes@efeoncepro.com`.
Se inspeccionaron los editores de `canal_de_adqusicion` y `dealtype`; se salió con **Cancelar**, sin
guardar. La consulta Agent CLI de ambas definiciones y la documentación pública se contrastaron
con los controles visibles. Esto acredita configuración del editor, no QA de todas las vistas CRM.

| Campo / selección | Estilos observados en el portal |
|---|---|
| `dealtype`, selección única `radio` | Valor predeterminado, Con punto, Insignia |
| `canal_de_adqusicion`, selección múltiple `checkbox` | Valor predeterminado, Insignia |

El legacy ya tiene **Insignia** seleccionado. Paleta observada por opción, que debe conservarse
durante la transición; no es una paleta aprobada automáticamente para campos nuevos:

| Opción legacy | Color del selector |
|---|---|
| WherEX | `#016DE1` |
| Mercado público | `#D20688` |
| Partnership | `#C93700` |
| Marketing | `#00823A` |
| Referidos | `#7D53E9` |
| Prospección directa | `#141414` |

**Propuesta visual pendiente de aprobación/aplicación:** origen comercial con insignia de relleno;
canal de adquisición con punto de color; fuente concreta como texto. Elegir colores categóricos
consistentes y mantener siempre la etiqueta: el color no sustituye el significado ni expresa
calificación, avance, éxito o riesgo. No colorear un vacío como si fuera un canal conocido.
La fuente sigue siendo `string/text` en el schema candidato; no convertirla a enum sólo para
obtener una insignia. Si su slug resulta poco legible, resolver la representación humana al
revisar el schema/consumidor, sin cambiar silenciosamente la identidad de la fuente.

| Carril | Qué se verificó / límite |
|---|---|
| API pública Properties, creación y actualización `2026-09` | Contratos documentados con labels, opciones, orden y otros atributos; no exponen color por opción ni estilo punto/insignia. No hay vía pública soportada verificada para escribir esos detalles. |
| Agent CLI instalada, `properties get` | Devuelve catálogo y metadata; las dos lecturas no devolvieron colores ni el estilo visible. `optionsDisplay` es un resumen de valores/labels, no prueba del estilo. |
| Agent CLI instalada, `properties update --help` | Expone cambios de label/grupo y preview; no ofrece flags de colores ni estilo. No se probaron mutaciones. |
| Interfaz de HubSpot | Configuración → Propiedades → objeto → propiedad → Tipo de campo → Estilo de opciones; selector de color por opción cuando aplica. Es el carril verificado para esos ajustes. |

No inventar claves `color`/`displayMode` en un PATCH, interpretar `fieldType=select` como estilo
de insignia ni reproducir endpoints privados del navegador para prometer paridad API.
La ausencia de esos atributos en un GET **no demuestra** que la propiedad carezca de colores.
Revisar el contrato público otra vez antes de automatizar: esta limitación es evidencia fechada.

En un cambio futuro autorizado:

1. Añadir al changeset estilo por propiedad, mapa opción→color y etiquetas visibles; guardar el
   estado anterior de UI por separado del snapshot API. No copiar la paleta legacy sin revisar su significado.
2. Aplicar schema/valores por su carril aprobado y los estilos por la interfaz. Crear un campo no
   autoriza el backfill, cambiar defaults ni activar automatizaciones. No tocar el legacy como efecto lateral.
3. Guardar únicamente el delta autorizado, reabrir el editor y verificar persistencia de estilo y colores.
4. Comprobar tabla y ficha del negocio en las vistas usadas por el equipo; tablero de pipeline si
   muestra esos campos. Revisar legibilidad, texto, contraste y ausencia de truncamiento; el color de
   una opción no acredita color de tarjeta, tag de objeto ni color de gráfico en informes.
5. Usar registros reales ya elegibles cuando existan; mientras no haya valores, limitar evidencia a
   editor/vista previa. No crear ni poblar negocios ficticios para QA. Registrar cada superficie pendiente.
6. Para rollback visual, restaurar sólo estilo/mapa de colores propios si aún coinciden con el postestado
   esperado; no reemplazar opciones, nombres internos o valores CRM con un snapshot incompleto de UI.

Fuentes oficiales consultadas19/10/2026:
[editor de propiedades](https://knowledge.hubspot.com/properties/understand-the-property-editor),
[opciones y colores](https://knowledge.hubspot.com/properties/manage-enumeration-property-options),
[crear propiedad](https://developers.hubspot.com/docs/api-reference/latest/crm/properties/create-property) y
[actualizar propiedad](https://developers.hubspot.com/docs/api-reference/latest/crm/properties/update-property).
HubSpot excluye colores de opciones en propiedades de etapa/lifecycle y de tipo property sync;
los tags de objeto son otra capacidad. No extender la configuración a esas superficies por inferencia.

## Aplicación futura por lotes

1. Completar la cobertura de consumidores y revisar el schema final; conservar snapshot/hash y
   propuesta por fila. El plan privado preparado vive en `.auth/acquisition-taxonomy-20261019/plan.json`;
   no contiene credenciales ni payload de leads, pero incluye IDs internos y no se versiona.
2. Obtener aprobación concreta del schema y luego del lote/IDs/campos; la aceptación conceptual
   no autoriza la creación ni el backfill. Separar cambios de consumidores de los de valores.
3. Crear/reutilizar schema, leerlo y verificar consumidores antes de poblar. Aplicar/verificar por
   separado la presentación humana autorizada según la sección anterior. No cambiar el tipo del
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
