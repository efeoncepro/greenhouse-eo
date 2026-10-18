# Segmentar una prospección en HubSpot por cohorte y propiedades

Nombres de Deal/Lead: [convención vigente Efeonce](../../operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md),
aceptada el 15/10/2026. Marca/cuenta primero y separador ` | `; nuevas altas autorizadas la adoptan.
El histórico se normaliza sólo por lote autorizado con identidad/dedupe, antes/después y readback;
no reescribir snapshots fechados ni alterar asociaciones para acomodar el nombre.

Manual de operador. Método verificado el 2026-10-06 en portal Efeonce `48713323` con Agent CLI `0.15.1`
(build 1348), definiciones nativas y membresía leída por MCP. Revalidar portal, versión y permisos al reutilizarlo.
Contrato: [runbook CLI/MCP](../../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md) y
[skill de prospección y segmentación](../../../.codex/skills/hubspot-as-a-service/references/prospecting-segmentation.md).

> **Vigente desde el 11/10/2026:** ya no se crean opciones de cohorte por fecha. En cada alta o reinvestigación
> se escribe `efeonce_prospecting_researched_on` (fecha, `AAAA-MM-DD`) en empresa **y** contacto. Esa fecha es
> lo que incorpora el registro a los segmentos de «Prospección continua» **180–187**. La propiedad
> `efeonce_prospecting_cohorts` queda como histórico de las rondas del 06 al 10 de octubre: no añadirle opciones
> ni asignarla a registros nuevos. Detalle en la sección 7; lo anterior describe las rondas históricas.
>
> **Vigente desde el 12/10/2026:** la industria se registra en la **empresa** y los segmentos de contactos
> 151–155 y 188 la leen de la empresa principal. Ya no se llena `industria` en el contacto para segmentar ni se
> escriben IDs en un filtro. Detalle en la sección 9.

## Arranque rápido para cualquier agente

1. Cargar [modelo funcional y catálogo](../../documentation/hubspot-as-a-service/prospeccion-segmentos-activos.md) y la [decisión](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).
2. Revalidar `hubspot whoami` y la identidad/permisos del conector MCP; portal objetivo **48713323**.
3. Resolver empresa/contactos existentes y el universo autorizado; investigar al objetivo y buscar inicialmente 2–3 adicionales, ampliando por roles/riesgos de la oportunidad. Aplicar el gate de correo siguiente antes del alta.
4. Preparar valores exactos y ejecutar dentro de la autorización del operador. Preservar multiselects previos; registrar señal y fuentes en nota asociada.
5. Poblar fecha de investigación en **ambos** objetos; tipo y fit respaldados en Contact. Leer correo, propiedades, asociaciones Primary, notas y miembros reales después del recálculo. El alta no termina sólo por guardar el registro.

### Gate previo al alta: correo y contactos adyacentes

- Investigar al objetivo **más una base inicial de 2–3 contactos relevantes**, incluso si tiene correo.
  Ampliar por roles críticos, decisiones y riesgos de la oportunidad/fase, sin techo numérico universal. Priorizar
  pares, responsables del área, jefatura y decisores relacionados; registrar fuente, rol y razón de acceso.
  Etiquetar la relación como confirmada o hipótesis funcional, sin inventar jefatura ni intención de compra.
- **No crear Contact/Lead de prospección sin correo corporativo individual verificado y atribuible a la persona.**
  Conservar dirección exacta, procedencia, fecha y estado de validación; resolver contradicciones antes de
  declarar el canal accionable. No deducir emails ni usar un buzón compartido como email de una persona.
- Si Apollo devuelve `emails: []` o no se obtiene correo, conservar identidad y señal en el expediente o nota
  de Company y seguir por personas adyacentes. Un buzón compartido queda sólo como vía secundaria de cuenta.
- Verificar autorización del conjunto acotado antes de gastar créditos; no extender un permiso individual.
  Crear sólo los contactos elegibles dentro del alcance autorizado y leerlos de vuelta. Si faltan contactos
  accionables para la base inicial o falta una función crítica, reportar brecha/riesgo y owner/ruta de validación.
  Personas únicas y funciones se cuentan por separado; correo no prueba autoridad ni participación.
  Un stakeholder crítico sin correo puede permanecer en el mapa, sin alta vacía. La ronda puede terminar con
  entrega parcial útil; no afirmar grupo completo ni exigir todo el comité para la primera conversación.

[Canon de admisión y cobertura](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md#delta-2026-10-11--contactos-accionables-y-cobertura-de-la-cuenta-b2b).
La clasificación de registros históricos sin correo se conserva; este cambio no elimina registros ni altera
filtros, esquema o permisos de envío.

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

## 2 bis. Reutilizar registros en otra licitación

Un ID de licitación distinto tiene su propio Deal. Reutilizar empresa/contacto no exige repetir el alta de
prospecto: leer sus atributos, conservar la cohorte y comprobar las membresías que correspondan. No sumar
otra cohorte sin ampliación autorizada ni volver a inscribir manualmente en listas históricas.

Si el brief no identifica comprador, documentar al contacto reutilizado como contacto de relación y dejar
su responsabilidad en ese proceso por confirmar. La intención específica va en la nota del nuevo Deal;
no inventar cargo/interés HubSpot para que entre en otro segmento.

Para verificar sólo un registro, añadir al lector MCP `hs_object_id EQ <ID>` junto a `ilsListIds IN [<segmento>]`.
El resultado confirma esa pertenencia, no el total del segmento; no modifica filtros activos. Para un cambio
de definición o una afirmación sobre toda la cohorte, seguir la comparación completa de la sección 4.

Ejemplo 07/10: [LIC-1169 Q4](../../commercial/tenders/sika-mexico-campana-q4-home-center-1169/README.md) reutilizó
los registros de Sika México. Se verificaron Contact 174/176 y Company 177, sin escrituras de propiedades/listas.
Los totales y catálogo del 06/10 conservan su fecha: no se recontó toda la cohorte en este corte.

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

## Ronda del 08-10-2026

La opción research_2026_10_08 y los ACTIVE 178 (Contact, fit creativo con/sin email) y 179 (Company, empresas
de la ronda) incorporaron dos contactos y dos empresas, con conjuntos completos y Primary verificados.
No se reutilizó la etiqueta del 06/10 ni se modificaron sus filtros. El segmento 178 no es un universo de
envío: comprobar el correo, supresiones y autorización de cada destinatario antes de cualquier comunicación.
[Expresiones, alcance y auditoría](../../audits/commercial/2026-10-08-creative-prospect-intake.md).

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

## 6. Precisión operativa del 08/10/2026

Reutilizar los segmentos activos compatibles y completar sólo propiedades respaldadas. No crear segmentos
adicionales por cada alta. Los 178–179 corresponden a la ronda del 08/10; 180–187 agrupan todas las cohortes
etiquetadas y se crearon antes de la precisión del operador. No eliminar segmentos históricos ni alterar
negocios existentes para forzar elegibilidad. Una alta es lead hasta calificación efectiva.

Prospecting Agent admite inscripción manual filtrada por segmento y automatización al entrar en una lista.
La incorporación al segmento no ejecuta ninguna de ellas por sí sola. Al 08/10, la guía está activada y exige
revisión; la cuenta agotó 3.000/3.000 créditos y muestra consumo en pausa, con reposición el 29/10.
[Procedimiento observado, límites y evidencia](../../audits/commercial/2026-10-08-prospecting-agent-active-segments.md).

## 7. Fecha de investigación en lugar de cohortes fechadas — 11/10/2026

Una opción nueva por día obligaba a cambiar el esquema en cada ronda. El alta ahora es:

1. Reconciliar empresa y contacto existentes; crear sólo lo que falte.
2. Escribir `efeonce_prospecting_researched_on` con la fecha de la investigación en empresa y contacto. Una no
   copia a la otra. Si el registro ya tenía fecha, reemplazarla por la nueva: guarda la última investigación.
3. Clasificar `efeonce_prospecting_contact_kind` y `efeonce_prospecting_service_fit` en el contacto, con evidencia.
4. Dejar la señal, fuente y fecha en la nota asociada. La nota es también el historial cuando hay más de una ronda.
5. Leer de vuelta propiedades, asociaciones y pertenencia a 180–187.

```bash
printf '{"id":"<CONTACT_ID>","properties":{"efeonce_prospecting_researched_on":"2026-10-11","efeonce_prospecting_contact_kind":"individual_no_email","efeonce_prospecting_service_fit":"creative"}}\n' \
  | hubspot objects update --type contacts --dry-run
```

El modo de un solo registro (`hubspot objects update --type contacts <ID> --property …`) se quedó esperando sin
escribir en la CLI `0.15.1` cuando se ejecutó sin terminal interactiva; no dejó cambios. Usar la entrada JSONL
por stdin, que devuelve preview y digest, o el conector MCP.

Los segmentos 180–187 usan `efeonce_prospecting_researched_on IS NOT NULL` como límite. Para ver un período
(«lo investigado esta semana») filtrar por rango de esa fecha en una vista; no crear una opción ni un segmento
por ronda. Los segmentos 159–179 siguen leyendo la propiedad histórica y no reciben registros nuevos.

Estado verificado el 11/10: 97 contactos y 92 empresas con fecha; 180 = **97**, 181 = **78**, 182 = **59**,
183 = **31**, 184 = **10**, 185 + 186 = **9**, 187 = **92**. Son conteos del lector MCP, no una enumeración de
miembros. Evidencia local (prestate, backfill, definiciones antes y después) fuera del repositorio; no copiar PII.

## 9. Agrupar por industria de la empresa — vigente desde el 12/10/2026

**Para qué sirve.** Que un contacto aparezca en el segmento de su sector porque su empresa pertenece a ese
sector, sin llenar nada en la ficha de la persona, y que un subsegmento (Bancos) quede dentro de su padre
(Finanzas).

**Antes de empezar.** Portal 48713323, `hubspot whoami` vigente y autorización para escribir en empresas o
filtros. Leer la [decisión](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md#delta-2026-10-12--la-industria-vive-en-la-empresa).

**En cada alta.**

1. Dejar `industry` y `country` en la empresa, con el valor exacto del catálogo y evidencia. Es lo que decide
   los segmentos 151–155 y 188 para todos sus contactos.
2. Confirmar que la empresa correcta es la principal del contacto. El dominio del correo no la define.
3. No llenar `industria` en el contacto para provocar membresía: ya no la lee ningún segmento vigente.
4. Leer de vuelta la membresía. Lector que funciona con OAuth de usuario:

```bash
hubspot objects search --type contacts --filter "hs_crm_search.ilsListIds=153" --properties associatedcompanyid --format json
```

Paginar con `--after` hasta que no haya cursor. `segments members-list` sigue exigiendo service key.

**Subsegmentos por sector.** Bancos Chile (188) y Seguros Chile (195) usan la misma regla y sólo cambia el valor
de industria de la empresa principal. Un sector nuevo se crea igual, a pedido del operador, y se comprueba que
quede contenido en Finanzas (153) o en el segmento padre que corresponda.

**Si un contacto no aparece en su segmento.** Revisar en este orden: empresa principal asociada, `industry` de
esa empresa, `country` (sólo 188). Casi siempre falta la industria en la empresa o el enriquecimiento automático
la clasificó mal. Corregir la empresa; no editar al contacto ni el filtro.

**Antes de cambiar un filtro.** Guardar definición y miembros, simular quién entra y quién sale, aplicar con
`segments update-filters`, leer de vuelta y comparar miembros reales con lo simulado. El `--dry-run` de ese
comando no valida la expresión ni entrega digest: la única prueba es la escritura real y su lectura.

**Qué no hacer.** No escribir IDs de empresas o contactos en un filtro. No reclasificar una empresa con un
valor falso para que calce: Consorcio es grupo asegurador y por eso no está en Bancos. No migrar 166–170, que
son históricos. No usar el crecimiento de un segmento como permiso de envío o inscripción.

**Problemas comunes.**

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| El segmento de contactos tiene menos gente que su industria en empresas | Empresas sin `industry` | Completar la empresa |
| Un contacto cambió de sector tras el 12/10 | Su empresa tiene otra industria que la que decía su ficha | Revisar la empresa; si está bien, el cambio es correcto |
| Un subsegmento no está contenido en su padre | Usa otra llave | Redefinirlo con la llave del padre |
| La consulta SQL del MCP devuelve todo el CRM | Se combinó `ilsListIds` con columnas de empresa | Leer la lista sola y cruzar aparte |

[Definiciones, conteos y valores previos](../../operations/HUBSPOT_INDUSTRY_SEGMENTS_2026-10-12.json).

## 8. Seleccionar bancos por empresa principal (corte del 11/10, sustituido)

> Desde el 12/10 el segmento 188 se define por atributos de la empresa principal (banca en Chile), no por
> una lista de IDs: ver la sección 9. Lo siguiente describe el corte anterior y sirve como historial.

Para el universo aprobado de bancos chilenos, reutilizar ACTIVE **188**. La definición y los 14 Company IDs
viven en el [snapshot fechado](../../operations/HUBSPOT_BANKS_SEGMENT_2026-10-11.json); los contactos y sus
focos, en el [expediente comercial](../../commercial/prospects/bancos-chile-2026-10/README.md).

1. Verificar identidad y portal 48713323. Leer 188 y comprobar que el pedido sigue dentro de sus 14 cuentas.
2. Reconciliar Primary, fecha de investigación, `individual_email` y email conocido. No usar dominio del correo
   ni industria vacía del contacto como sustitutos de la asociación principal. No modificar personas para
   que coincidan con un filtro; completar atributos sólo con evidencia y dentro del alcance autorizado.
3. Mantener la fecha como condición conocida, sin fijarla al día de creación del segmento. Una nueva persona
   que cumpla entra automáticamente; un banco nuevo exige ampliar la condición de empresas con autorización.
4. Leer la definición ACTIVE por CLI y la membresía completa por MCP `ilsListIds=188`, sin restringir por IDs
   de Contact. Paginar hasta terminar y comparar con el manifiesto: el corte 11/10 dio 28, cero faltantes/extras.
5. Reportar propiedades presentes, vacías y señales en notas por separado. SEO/web no tiene enum compatible;
   no inventarlo ni marcar `creative`/`hubspot_crm` por conveniencia. Revisar conflictos de canal antes de usarlo.

### Recuperación de create 502 observada en 188

Si `segments create` falla, listar todos los segmentos y comprobar si el nombre/definición ya existe antes de
reintentar: un error no garantiza ausencia de escritura. El 11/10 hubo dos 502 con ausencia comprobada. El MCP
tenía lectura de listas pero escritura no disponible; la UI autenticada permitió crear 188 en el mismo portal.

En la UI: **Crear segmento → Manual → Contactos → filtros**. Agregar en un único grupo AND fecha de
investigación conocida, Persona con email, Correo conocido y Empresa principal asociada en las 14 cuentas.
Revisar 28 coincidencias, elegir **Activo**, guardar y procesar. Después leer por CLI tipo/expresión y por MCP
miembros completos. Guardar captura de la UI con Activo y tamaño procesado. No recrear 188 si ya existe ni
activar envíos, secuencias o workflows como parte de la selección.
