# Segmentar una prospección en HubSpot por cohorte y propiedades

Manual de operador. Método verificado el 2026-10-06 en portal Efeonce `48713323` con Agent CLI `0.15.1`
(build 1348), definiciones nativas y membresía leída por MCP. Revalidar portal, versión y permisos al reutilizarlo.
Contrato: [runbook CLI/MCP](../../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md) y
[skill de prospección y segmentación](../../../.codex/skills/hubspot-as-a-service/references/prospecting-segmentation.md).

## 1. Elegir el universo

Registrar si el pedido comprende toda la base, una ronda de búsqueda o personas con email de esa ronda.
Si el usuario ya fijó el alcance, usarlo. Un segmento activo filtrado sólo por industria puede añadir contactos
antiguos; “activo” describe cómo se recalcula, no cuándo se investigaron sus miembros.

Separar empresas investigadas de empresas creadas. Una investigación puede incluir cuentas que ya estaban en
HubSpot. Separar contactos individuales, buzones de área, registros sin correo e identidades pendientes.
No usar la fecha de creación del CRM como única prueba de origen o vigencia de una solicitud.

## 2. Preparar y enriquecer la cohorte

1. Verificar identidad y portal en cada carril y leer `--help` de los comandos que se usarán.
2. Conservar manifiesto fuente → ID de CRM, asociaciones, señal y fecha/estado, tipo de contacto y fuentes.
3. Inventariar propiedades y opciones existentes. Preparar `actual → propuesto` y fuentes antes de escribir.
   Un rango publicado no es un número exacto de empleados; una solicitud de la organización no es interés
   declarado por la persona. Mantener pendientes las asociaciones o empleos ambiguos.
4. Aplicar únicamente los cambios autorizados, con preview cuando exista y readback de cada fila.
5. Crear o reutilizar una lista base estática con los IDs verificados del manifiesto, y comprobar el conjunto
   completo. Usar otra base de individuos con email cuando la preparación sea para personalización individual.

La base estática es el snapshot de origen. Las industrias, cargos y tamaños se filtran después como atributos
activos; los IDs no se repiten como reglas dentro de cada segmento de industria. Una ronda futura exige una
cohorte nueva o una ampliación del universo autorizada y verificada.

## 3. Componer filtros nativos activos

Plantillas de expresión; reemplazar los valores entre `<...>` por IDs verificados del portal:

```sql
-- Empresas de una investigación con industria software
IN_LIST(list = <empresas_investigadas>) AND industry IN ('COMPUTER_SOFTWARE')

-- Contactos individuales con email del lote y sector tecnología
IN_LIST(list = <contactos_del_lote>) AND IN_LIST(list = <individuales_con_email>)
  AND industria IN ('Tecnología')
```

En filtros con OR, toda rama debe conservar el origen y el universo individual con correo. Por ejemplo, para
Marketing o Growth, ambas ramas deben exigir las mismas dos listas base. Inspeccionar cómo la CLI guarda la
expresión para comprobar que el OR no abre la población a contactos antiguos.

Para crear, preparar un JSON con `name`, `objectTypeId`, `listType: "ACTIVE"` y `filterExpression` o usar los
flags equivalentes. Los tipos verificados son `0-2` para empresas y `0-1` para contactos.

```bash
hubspot segments create --file segmento-propuesto.json --dry-run
hubspot segments create --file segmento-propuesto.json
hubspot segments get <id_devuelto> --format json
```

Ejecutar el segundo comando sólo dentro del alcance autorizado. Si falla o el resultado es incierto, buscar
por nombre y leer las listas existentes antes de reintentar. `ilsListIds` funciona en CRM search para leer
membresía; no sustituye `IN_LIST(list = ...)` en el filtro de creación CLI. El intento con ese campo ordinario
produjo 502 en el caso documentado, sin creación comprobada.

## 4. Verificar sin mezclar alcances

- Leer ID, nombre, objeto, tipo ACTIVE y expresión completa de cada segmento.
- Leer todos los miembros, paginando. Con OAuth de usuario, `segments members-list` puede no estar permitido;
  en la operación documentada se usó MCP CRM search con `ilsListIds`, mediante identidad y portal verificados.
- Comparar conjuntos esperados y reales: faltantes, extras, fuera del lote y fuera de individuales con email.
  Deben ser cero los dos últimos; cualquier diferencia esperada/relevada se resuelve antes de aceptar el grupo.
- Verificar las bases contra el manifiesto original. Si hay segmentos globales conservados, comparar sus
  definiciones antes/después sin presentar su total como contactos nuevos.
- Registrar la fecha de verificación. Antes de un envío futuro, repetir la revisión de destinatarios y su
  estado; una lista activa puede haber cambiado después de documentar su tamaño.

## Caso verificado: búsquedas del 2026-10-06

Se investigaron **80 empresas: 40 nuevas y 40 preexistentes**. Se crearon **79 contactos**, distribuidos en
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
la corrección documentada del lote conserva el universo de 61 individuales con email.
