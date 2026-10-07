# Segmentar una prospección en HubSpot por cohorte y propiedades

Manual de operador. Método verificado el 2026-10-06 en portal Efeonce `48713323` con Agent CLI `0.15.1`
(build 1348), definiciones nativas y membresía leída por MCP. Revalidar portal, versión y permisos al reutilizarlo.
Contrato: [runbook CLI/MCP](../../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md) y
[skill de prospección y segmentación](../../../.codex/skills/hubspot-as-a-service/references/prospecting-segmentation.md).

## Arranque rápido para cualquier agente

1. Cargar [modelo funcional y catálogo](../../documentation/hubspot-as-a-service/prospeccion-segmentos-activos.md) y la [decisión](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).
2. Revalidar `hubspot whoami` y la identidad/permisos del conector MCP; portal objetivo **48713323**.
3. Resolver empresa/contacto existentes y el universo autorizado. Cohorte en **ambos** objetos; tipo y fit en Contact. No asignar esta ronda a una futura búsqueda sin autorización de ampliación.
4. Preparar valores exactos y ejecutar dentro de la autorización del operador. Preservar multiselects previos; registrar señal y fuentes en nota asociada.
5. Leer propiedades, asociaciones y miembros reales después del recálculo. El alta no termina sólo por guardar el registro.

**Estado más reciente, 06/10 tras Sika:** 81 empresas/81 contactos en la cohorte; **19 ACTIVE 159–177** y 15 generales 144–158 conservados. 174 = **63**, 176 = **51**, 175 = **26**, 177 = **1**. Las cuatro propiedades ya existen: no volver a crearlas en cada alta. [Catálogo exacto sin PII](../../operations/HUBSPOT_PROSPECT_SEGMENTS_CATALOG_2026-10-06.json).

## 1. Elegir el universo

Registrar si el pedido comprende toda la base, una ronda de búsqueda o personas con email de esa ronda.
Si el usuario ya fijó el alcance, usarlo. Un segmento activo filtrado sólo por industria puede añadir contactos
antiguos; “activo” describe cómo se recalcula, no cuándo se investigaron sus miembros.

Separar empresas investigadas de empresas creadas. Una investigación puede incluir cuentas que ya estaban en
HubSpot. Separar contactos individuales, buzones de área, registros sin correo e identidades pendientes.
No usar la fecha de creación del CRM como única prueba de origen o vigencia de una solicitud.

## 2. Preparar propiedades y completar cada alta

1. Verificar portal, identidad, permisos y ayuda instalada. Reconciliar fuentes con registros existentes.
2. Preservar manifiesto, fuentes y prestate. Reusar campos con significado compatible y opciones exactas.
3. Para incorporar automáticamente, poblar `efeonce_prospecting_cohorts` en empresa y contacto; clasificar
   `efeonce_prospecting_contact_kind` y `efeonce_prospecting_service_fit` en contacto. Añadir cohortes conserva
   los valores previos. Completar industria/cargo respaldados por evidencia.
4. Si falta el campo compatible y su creación está autorizada, definirlo mediante Agent CLI en el grupo de
   negocio correspondiente. Diccionario y significado: [decisión aceptada](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).
5. Registrar la solicitud exacta, fuente y fecha/estado en nota asociada. No forzar audiovisual a Social Media
   ni convertir fit en interés declarado. Leer atributos y membresías efectivas antes de cerrar el alta.

Las listas estáticas anteriores permanecen como evidencia histórica. Ya no se requiere agregar manualmente
cada nuevo prospecto a esas bases: el segmento activo se recalcula desde sus propiedades.

### Ejemplo de escritura con preview

Los IDs siguientes son placeholders; reemplazarlos por los reconciliados. El ejemplo supone que el registro no
contiene otra cohorte/fit: si los tiene, usar la unión de valores leídos y nuevos, separados por `;` en checkbox.
No usar valores de Contact en Company por similitud de nombre.

```bash
hubspot objects update --type companies <COMPANY_ID> \
  --property efeonce_prospecting_cohorts=research_2026_10_06 \
  --property industry=CHEMICALS --dry-run
hubspot objects update --type contacts <CONTACT_ID> \
  --property efeonce_prospecting_cohorts=research_2026_10_06 \
  --property efeonce_prospecting_contact_kind=individual_email \
  --property efeonce_prospecting_service_fit=creative --dry-run
```

Aplicar sólo los valores respaldados dentro del alcance autorizado; el preview no escribe. El tipo individual
con email requiere correo disponible y una identidad/canal respaldados, no verificación de Apollo implícita.
`industry=CHEMICALS` no cabe en el enum `industria` del contacto: no forzar Retail ni inventar una opción.
Verificar Primary de contacto/deal tras el create: la automatización por dominio de email puede crear otra
empresa y marcarla como principal. Confirmar entidad legal antes de corregir; no borrar ni fusionar por dominio.
Los cambios automáticos de lifecycle o pipeline no cambian la cohorte ni prueban cliente ganado.

## 3. Componer o corregir filtros nativos activos

```sql
-- Empresa de esta búsqueda e industria software
industry IN ('COMPUTER_SOFTWARE') AND efeonce_prospecting_cohorts IN ('research_2026_10_06')

-- Contacto individual con email y fit creativo de esta búsqueda
efeonce_prospecting_cohorts IN ('research_2026_10_06')
  AND efeonce_prospecting_contact_kind IN ('individual_email')
  AND email IS NOT NULL AND efeonce_prospecting_service_fit IN ('creative')
```

Toda rama OR conserva cohorte, tipo de contacto y email cuando corresponda. Al corregir una definición, usar
el mismo ID mediante `update-filters`; no crear otro segmento duplicado. Para nuevas definiciones, usar
`listType: "ACTIVE"`, `objectTypeId: "0-2"` (Company) o `"0-1"` (Contact).

```bash
hubspot properties batch-create --help
hubspot segments update-filters 176 --filter "efeonce_prospecting_cohorts IN ('research_2026_10_06') AND efeonce_prospecting_contact_kind IN ('individual_email') AND email IS NOT NULL AND efeonce_prospecting_service_fit IN ('creative')" --dry-run
# Aplicar dentro del alcance autorizado, retirando --dry-run; leer luego:
hubspot segments get 176 --format json
```

`properties batch-create` aceptó JSONL con opciones, grupo y definiciones completas en esta operación.
`segments update-filters --dry-run` devuelve preview sin ejecutar; no devolvió digest. Comprobar la versión
instalada antes de reutilizarlo. `ilsListIds` se usa únicamente como lector de membresía por CRM search.

## 4. Verificar sin mezclar alcances

- Leer definiciones de propiedades, valores de todos los registros y conjunto completo etiquetado por cohorte.
- Leer ID, nombre, objeto, tipo ACTIVE y expresión completa; comprobar que no depende de bases estáticas.
- Enumerar miembros por MCP CRM search con `ilsListIds` y paginar hasta completar. El recálculo puede tardar:
  la lectura inmediata de 174 todavía mostraba 61; el readback posterior confirmó 62.
- Comparar IDs esperados y reales, positivos y negativos: cero faltantes, extras, ajenos a la cohorte o contactos
  de tipo no individual dentro del universo con email. Preservar definiciones globales solicitadas.
- Antes de un envío, refrescar destinatarios, supresiones y actividad previa; no sumar listas que se solapan.

### Lectura MCP de membresía y diagnóstico

Después de `get_user_details`, usar `search_crm_objects` en COMPANY o CONTACT según el objeto del segmento.
Filtro de lectura para 174 (no expresión de creación):

```json
{
  "objectType": "CONTACT",
  "filterGroups": [{
    "associatedWith": [],
    "filters": [{"propertyName": "ilsListIds", "operator": "IN", "values": ["174"], "value": null, "highValue": null}]
  }],
  "properties": ["hs_object_id"],
  "query": null, "limit": 100, "offset": 0, "sorts": []
}
```

Paginar con el offset/cursor soportado por el lector hasta que el conjunto acumulado cubra `total`; nunca
presentar una muestra como el total. Para leer la cohorte completa, cambiar el filtro por
`efeonce_prospecting_cohorts CONTAINS_TOKEN research_2026_10_06` en ambos objetos, separado de la definición SQL.
Retener IDs/PII sólo en evidencia local controlada.

| Síntoma | Comprobación / siguiente paso |
| --- | --- |
| Propiedad guardada pero aún no aparece | Leer definición ACTIVE, objeto y enums; esperar recálculo y releer el miembro pendiente |
| Entra la empresa pero no el contacto | Leer cohorte en ambos, tipo individual, email y fit; la asociación no copia esos campos |
| Química entra en 177 pero el contacto no tiene sector | Confirmar `industry` vs `industria`; no existe segmento Contact Química; 174/176 sí pueden incorporar |
| Entra un registro histórico ajeno | Revisar cohorte y todas las ramas OR; no ampliar con fecha de creación ni eliminar el límite |
| CLI miembros devuelve 403 | Usar MCP autenticado como lector; no cambiar credenciales ni escribir membresía manual |
| Cargo/intent no tienen evidencia o enum compatible | Conservar gap y nota; no inventar datos para entrar en 171/172/173 |
| Se corrige una regla existente | Preservar prestate e ID con `update-filters`, preview, lectura de definición y comparación completa |

La recuperación restaura sólo propiedades/filtros modificados dentro del alcance autorizado, desde el prestate;
no borra personas, empresas ni snapshots. No restaurar ni recrear definiciones para resolver recálculo lento.

## Corte anterior: corrección del operador, antes de Sika — 2026-10-06

Se crearon por Agent CLI cuatro definiciones: cohorte en Company y Contact, tipo y fit en Contact. Valores
verificados en **80 empresas y 80 contactos**. Se migraron los **18 ACTIVE 159–176 en el mismo ID**; las 15
reglas globales 144–158 se conservaron exactamente. Los conjuntos completos coinciden con el corte inicial
más un contacto autorizado: **62 individuales con email**, nueve sin email, siete buzones y dos pendientes.

Retail 167 pasa a **11**, roles 171 a **32**, individuales 174 a **62**, fit creativo 176 a **50**; los demás
conteos de la tabla histórica siguiente no cambian. El contacto incorporado tiene cohorte, tipo individual,
industria Retail y fit creativo: entra por reglas, sin añadir membresías manuales. No entra a fit CRM ni a las
solicitudes HubSpot o Contenido/social. Su solicitud audiovisual precisa se conserva en la nota de intención.

Comprobaciones: cuatro definiciones, 160 escrituras y lecturas de atributos, 18 filtros y conjuntos exactos,
cero registros etiquetados ajenos al manifiesto, 15 reglas globales intactas. Evidencia local nueva en
`Propiedades-activas/`, dentro de la carpeta de trabajo indicada abajo. La base 118 recibió una incorporación
manual intermedia (79 → 80) antes de esta corrección; no se presenta como el snapshot original intacto.
Las bases 140/122/124 dejaron de ser requisitos operativos y no recibieron nuevas incorporaciones manuales.

## Corte inicial histórico: búsquedas del 2026-10-06

Antes de la corrección descrita arriba, se investigaron **80 empresas: 40 nuevas y 40 preexistentes**. Se crearon **79 contactos**, distribuidos en
61 individuales con email, nueve sin email, siete buzones de área y dos con identidad pendiente. Estos grupos
no acreditan vigencia del empleo, validación actual del correo ni consentimiento para marketing.

Bases: empresas investigadas **119**, contactos creados **118**, individuales con email **140**. Los 15
segmentos globales **144–158** se conservaron. Los 18 derivados **159–176** restringen el origen y mantienen
sus filtros activos. Los contactos de esta tabla ya incluyen las dos bases requeridas.
Para **175/176**, el fit usa además la clasificación de investigación conservada en las listas **124/122**,
respectivamente. Esa pertenencia registra una clasificación comercial del lote; no se presenta como una
propiedad nativa de intención ni como interés declarado por el contacto.

| Objeto    |  ID | Clasificación                               | Miembros al verificar |
| --------- | --: | ------------------------------------------- | --------------------: |
| Empresas  | 159 | Software                                    |                    16 |
| Empresas  | 160 | Retail y consumo                            |                    11 |
| Empresas  | 161 | Finanzas y seguros                          |                     8 |
| Empresas  | 162 | Educación                                   |                     8 |
| Empresas  | 163 | Gobierno                                    |                    15 |
| Empresas  | 164 | Chile, rango registrado 51–1.000            |                    38 |
| Empresas  | 165 | Tecnología Chile, rango registrado 51–1.000 |                    15 |
| Contactos | 166 | Tecnología                                  |                    16 |
| Contactos | 167 | Retail                                      |                    10 |
| Contactos | 168 | Finanzas                                    |                     4 |
| Contactos | 169 | Educación                                   |                     5 |
| Contactos | 170 | Gobierno                                    |                    11 |
| Contactos | 171 | Roles Marketing/Growth/Comunicaciones       |                    31 |
| Contactos | 172 | Solicitud observada HubSpot                 |                     3 |
| Contactos | 173 | Solicitud observada Contenido/social        |                     1 |
| Contactos | 174 | Universo individual con email               |                    61 |
| Contactos | 175 | Fit HubSpot/CRM                             |                    26 |
| Contactos | 176 | Fit creativo                                |                    49 |

Las filas se solapan. Los rangos registrados mezclan valores previos y rangos respaldados por investigación;
son clasificaciones de tamaño, no censos exactos. País corresponde a la empresa registrada: una sede extranjera
con operación chilena puede quedar fuera del filtro Chile. El segmento Software no incluye automáticamente
ciberseguridad u otros sectores tecnológicos.

Las solicitudes observadas HubSpot de este caso corresponden a **tres contactos de una sola cuenta: TVN**;
no son tres oportunidades independientes. La nota fuente conserva el proceso y su fecha/estado. El segmento
Contenido/social sólo cuenta un individuo con email; otras señales pueden corresponder a buzones de área o
contactos fuera de ese universo. No convertir ese conteo en el total de demanda encontrada.

En el enriquecimiento anterior se completó `servicio_de_interes` en **12 contactos** a partir de solicitudes
públicas de sus cuentas, incluidas históricas. Se interpretan aquí como **solicitud observada**, con fuente,
fecha y estado en las notas originales; no como interés individual confirmado o compra vigente. El reuso
futuro debe comprobar que la definición del campo admite el dato. Si falta una propiedad compatible para
fit, señal o SEO/AEO/GEO, conservar esa evidencia en su clasificación/nota sin forzar campos de servicios
contratados, composición de deals o keywords para usarlos como etiquetas.

Comprobaciones: 18 definiciones y conjuntos completos coincidentes, cero miembros fuera del lote, cero contactos
fuera del universo individual con email y 15 definiciones globales preservadas.
[Auditoría agregada](../../audits/commercial/2026-10-06-prospeccion-segmentacion-hubspot.md).
Los manifiestos, fuentes, notas, readbacks y filas individuales permanecen en la carpeta local de trabajo
`/Users/jreye/Documents/Codex/2026-10-06-segmentos-busquedas-nuevas/`; no copiar PII al repositorio.

## 5. Preparar el abordaje personalizado

Usar **174** como universo, **175/176** para elegir la propuesta y **171 + industria** para modularla según
función y sector. No enviar automáticamente a cada lista: deduplicar por contacto y elegir un solo ángulo inicial.
Dar prioridad a las solicitudes explícitas cuya fecha y estado permitan un contacto honesto, después al fit.

Cada ficha para redacción debe conservar nombre/empresa/cargo verificados, señal exacta, fuente y fecha/estado,
servicio pertinente, hipótesis de valor y siguiente paso pequeño. La nota original permite distinguir una
solicitud abierta de una histórica; si el proceso cerró, consultar futuras invitaciones sin prometer reabrirlo.
Un responsable de pago/contrato publicado no equivale a comprador de marketing.

| Familia          | Ángulo para explorar                                            | Evidencia antes de afirmar                               |
| ---------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| HubSpot/CRM      | Handoff comercial, lifecycle, adopción, integración y reporting | CRM instalado, proceso y problema real                   |
| Creativos        | Capacidad de contenido/campaña y consistencia de producción     | Brief o contexto de marca; existencia de estudio interno |
| Tecnología       | Generación de demanda y coordinación Marketing–Ventas           | Modelo comercial, etapa y rol                            |
| Retail           | Adaptaciones, campañas y volumen multicanal                     | Calendario, canales y solicitud específica               |
| Finanzas/seguros | Claridad de propuesta, confianza y coordinación comercial       | Servicio, canales y proceso de revisión                  |
| Educación        | Captación/admisión, contenidos y trazabilidad de consultas      | Oferta, ventana y necesidad documentada                  |
| Gobierno/compras | Registro como proveedor y próximas invitaciones                 | Procedimiento publicado, función y estado del proceso    |

La tabla propone hipótesis comerciales; no acredita necesidades, presupuesto, urgencia ni autoridad de compra.
Si se documentó SEO, AEO o GEO, referir la disciplina exacta, no intercambiarlas ni inferir una solicitud ausente.

Preparar estos segmentos no cambia suscripciones, consentimiento, estado de contacto de marketing, workflows
o secuencias y no autoriza enviar. Antes de un envío autorizado, revisar la ruta concreta de correo, exclusiones,
estado de bajas/suscripción, identidad y vigencia, y cargar
[email-api-routing.md](../../../.codex/skills/hubspot-as-a-service/references/email-api-routing.md).
Una verificación previa de Apollo no sustituye la validación actual del correo ni resuelve por sí sola un
resultado de entregabilidad desconocido. Mantener separados los registros `do_not_mail` y los correos vacíos;
el corte inicial tenía 61 individuales con email; el último corte, tras Sika, tiene 63.
