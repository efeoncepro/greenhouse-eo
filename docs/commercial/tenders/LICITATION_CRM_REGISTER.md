# Registro operativo CRM de licitaciones

> Índice rápido compartido para Codex y Claude. **No reemplaza HubSpot, LicitaLAB, Mercado Público, las bases ni el comprobante de postulación.** Antes de decidir, escribir o afirmar un estado, confirma el dato en su fuente de verdad y luego actualiza este archivo.

## Alcance y corte

- Inicio del registro operativo: **2026-08-28**.
- Última actualización documentada: **2026-08-28, America/Santiago**.
- Universo inicial: tres oportunidades recomendadas obtenidas en modo read-only desde LicitaLAB.
- El snapshot histórico previo identificó 99 deals vinculados a LicitaLAB en HubSpot. Esos registros **no fueron migrados ni enumerados aquí**; siguen consultándose en HubSpot.
- Una fila en este archivo no demuestra que la oferta fue enviada. `Postulada` requiere comprobante, fecha/hora y fuente verificable.

## Relación con el registro comercial general

[`../CRM_DEAL_REGISTER.md`](../CRM_DEAL_REGISTER.md) es la vista transversal de negocios con Deal HubSpot. Este
archivo conserva el detalle especializado de radar, bid/no-bid, bases y postulación. Las oportunidades sin Deal
permanecen sólo aquí; cuando una licitación se promueve a HubSpot, debe aparecer en ambos registros con el mismo
`deal_id`. Después de un cambio de Company, Deal, owner, stage, monto, `closedate`, bucket o resultado, sincroniza
ambos archivos únicamente tras el readback live.

## Fuentes de verdad

| Dato                                                              | Fuente autoritativa                                                | Uso de este archivo              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------- |
| Bases, monto, modalidad, organismo, preguntas y plazo oficial     | Mercado Público/bases; LicitaLAB como discovery y apoyo documental | Resumen fechado                  |
| Empresa, deal, owner, pipeline, stage, propiedades y asociaciones | HubSpot live                                                       | Índice y enlaces rápidos         |
| Decisión bid/no-bid y responsables                                | Aprobación del operador / artefacto de bid                         | Estado operativo                 |
| Presentación de la oferta                                         | Comprobante del portal oficial                                     | Fecha y evidencia de postulación |
| Adjudicación, pérdida o deserción                                 | Resolución/fuente oficial y HubSpot                                | Resultado sincronizado           |

Si una fuente no fue releída, usa `No verificado`; nunca interpretes una celda vacía como `No`.

## Estados controlados

| Estado                   | Significado                                                             |
| ------------------------ | ----------------------------------------------------------------------- |
| `Radar`                  | Detectada; aún no pasó screening bid/no-bid.                            |
| `Screening`              | Se están validando admisibilidad, fit, capacidad, margen y riesgo.      |
| `Preparación`            | Existe GO para preparar/evaluar; no implica autorización para postular. |
| `Postulada`              | Existe comprobante verificable de envío con fecha/hora.                 |
| `Esperando adjudicación` | Postulación confirmada y plazo cerrado; resultado pendiente.            |
| `Ganada`                 | Adjudicación confirmada en fuente oficial y CRM.                        |
| `Perdida`                | Resultado adverso confirmado en fuente oficial y CRM.                   |
| `No bid`                 | Decisión explícita de no participar, con motivo.                        |
| `Expirada`               | Cerró sin postulación y sin una decisión anterior más precisa.          |

## Resumen vigente

| ID                | Oportunidad / organismo                                                                         | Modalidad             |           Monto | Cierre oficial       | Estado operativo | Decisión                                              | Postulación                                       | HubSpot                                                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------- | --------------------- | --------------: | -------------------- | ---------------- | ----------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `1098710-22-LP26` | Campaña Festival de Ciencia y Tecnología 2026 / Subsecretaría de Ciencia                        | Licitación pública LP | CLP 250.000.000 | 2026-09-16 15:00 CLT | `Preparación`    | GO para evaluación; GO final de postulación pendiente | No postulada al corte 2026-08-28; sin comprobante | [Deal 64461187076](https://app.hubspot.com/contacts/48713323/record/0-3/64461187076) · [Company 57870164778](https://app.hubspot.com/contacts/48713323/record/0-2/57870164778) |
| `4841-69-COT26`   | Revista Conserva N.° 27 y requerimientos CNCR / Servicio Nacional del Patrimonio Cultural       | Compra Ágil           |   CLP 2.400.000 | 2026-08-31 12:00 CLT | `Radar`          | Bid/no-bid pendiente                                  | No verificada                                     | No promovida                                                                                                                                                                   |
| `1082957-26-LE26` | Piezas gráficas y audiovisuales para ProChile / Dirección General de Promoción de Exportaciones | Licitación pública LE |  CLP 42.000.000 | 2026-08-31 15:01 CLT | `Radar`          | Bid/no-bid pendiente                                  | No verificada                                     | No promovida                                                                                                                                                                   |

## Fichas activas

### `1098710-22-LP26` — Campaña Festival de Ciencia y Tecnología 2026

| Campo                                         | Valor al corte                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Nombre LicitaLAB                              | Diseño Producción y Reporte Campaña Comunicacional                                                                              |
| Alcance leído                                 | Diseño, producción, implementación y reporte métrico de campaña comunicacional para el Festival de la Ciencia y Tecnología 2026 |
| Tipo                                          | `public_opportunity` / Licitación Pública LP, 1.000–2.000 UTM                                                                   |
| Organismo                                     | Subsecretaría de Ciencia, Tecnología, Conocimiento e Innovación                                                                 |
| RUT organismo                                 | `62.000.740-4`                                                                                                                  |
| Región                                        | Región Metropolitana de Santiago                                                                                                |
| Monto disponible                              | CLP 250.000.000                                                                                                                 |
| Publicación                                   | 2026-08-27 13:22 CLT                                                                                                            |
| Cierre de preguntas                           | 2026-09-03 12:00 CLT                                                                                                            |
| Cierre oficial de postulación                 | 2026-09-16 15:00 CLT (`2026-09-16T18:00:00Z`)                                                                                   |
| Adjudicación estimada / `closedate` comercial | 2026-10-01 18:00 CLT (`2026-10-01T21:00:00Z`)                                                                                   |
| Score LicitaLAB                               | 83 %; señal de discovery, no decisión bid/no-bid                                                                                |
| Criterios observados                          | Formal 5 %; integridad/compliance 5 %; precio 25 %; experiencia 25 %; técnico 40 %                                              |
| Estado operativo                              | `Preparación` — evaluación/admisibilidad en curso; GO final de postulación pendiente                                            |
| Postulación                                   | No postulada al corte 2026-08-28; no hay comprobante registrado                                                                 |
| Fuente de discovery                           | [Ficha LicitaLAB](https://app.licitalab.cl/search/details/1098710-22-LP26)                                                      |

#### HubSpot verificado

| Campo                | Valor                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Company              | [Subsecretaría de Ciencia, Tecnología, Conocimiento e Innovación · `57870164778`](https://app.hubspot.com/contacts/48713323/record/0-2/57870164778)          |
| Dominio              | `minciencia.gob.cl`                                                                                                                                          |
| Deal                 | [Subsecretaría de Ciencia - Campaña Festival de Ciencia y Tecnología 2026 · `64461187076`](https://app.hubspot.com/contacts/48713323/record/0-3/64461187076) |
| Pipeline / stage     | `default` / `qualifiedtobuy` — Calificado para comprar                                                                                                       |
| Bucket               | `Strategic Bets`                                                                                                                                             |
| Tipo / canal / línea | `newbusiness` / `Mercado público` / `efeonce_digital`                                                                                                        |
| Owner                | Julio Reyes Rangel · `75788512`                                                                                                                              |
| ID licitación        | `1098710-22-LP26`                                                                                                                                            |
| Idempotencia         | `hubspot-public-tender:CL:1098710-22-LP26`                                                                                                                   |
| Asociación           | Deal ↔ Company verificada; `num_associated_deals=1`                                                                                                         |
| Contactos            | Ninguno creado: no se verificó un contacto real                                                                                                              |
| Brecha               | `gh_commercial_party_id` vacío; no asumir sincronización Greenhouse                                                                                          |

### `4841-69-COT26` — Revista Conserva N.° 27 y requerimientos CNCR

| Campo                    | Valor al corte                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Organismo                | Servicio Nacional del Patrimonio Cultural                                                                       |
| Región                   | Región Metropolitana de Santiago                                                                                |
| Modalidad                | Compra Ágil (`COT`)                                                                                             |
| Monto                    | CLP 2.400.000                                                                                                   |
| Cierre oficial observado | 2026-08-31 12:00 CLT                                                                                            |
| Score LicitaLAB          | 80 %; señal de discovery                                                                                        |
| Estado / decisión        | `Radar` / bid-no-bid pendiente                                                                                  |
| Postulación              | No verificada                                                                                                   |
| HubSpot                  | No promovida; para una Compra Ágil nueva, `pipeline_bucket` sigue `policy_required` hasta decisión del operador |
| Próximo control          | Leer bases y validar admisibilidad, alcance, loaded cost, margen y capacidad antes de decidir                   |

### `1082957-26-LE26` — Piezas gráficas y audiovisuales para ProChile

| Campo                    | Valor al corte                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Organismo                | Dirección General de Promoción de Exportaciones (ProChile)                                                           |
| Región                   | Región Metropolitana de Santiago                                                                                     |
| Modalidad                | Licitación pública (`LE`)                                                                                            |
| Monto                    | CLP 42.000.000                                                                                                       |
| Cierre oficial observado | 2026-08-31 15:01 CLT                                                                                                 |
| Score LicitaLAB          | 80 %; señal de discovery                                                                                             |
| Estado / decisión        | `Radar` / bid-no-bid pendiente                                                                                       |
| Postulación              | No verificada                                                                                                        |
| HubSpot                  | No promovida; buscar la Company live y deduplicar antes de crear cualquier deal                                      |
| Próximo control          | Leer bases y validar admisibilidad, entregables, volumen, derechos, loaded cost, margen y capacidad antes de decidir |

## Protocolo de actualización

Actualiza este registro inmediatamente después de cualquiera de estos hitos:

1. Radar o triage: agrega la fila con fuente y fecha de corte.
2. Bid/no-bid: registra decisión, motivo, aprobador y fecha; un score de LicitaLAB no equivale a GO.
3. Promoción a CRM: busca por ID normalizado e idempotencia, reutiliza Company, crea/asocia sólo entidades reales y relee HubSpot antes de copiar IDs, pipeline, stage y enlaces.
4. Cambio de plazo o aclaración: actualiza la fecha oficial desde bases/portal; conserva separada la fecha de adjudicación o cierre comercial.
5. Postulación: cambia a `Postulada` sólo con fecha/hora, responsable y enlace/ruta al comprobante verificable.
6. Resultado: confirma resolución oficial, sincroniza HubSpot y registra `Ganada`, `Perdida`, `No bid` o `Expirada` con motivo.

### Campos obligatorios para una nueva fila

`ID` · `tipo público/privado` · `fuente` · `organismo/empresa` · `modalidad` · `monto y moneda` · `cierre oficial y zona horaria` · `estado` · `decisión` · `postulación` · `Company/deal HubSpot` · `owner` · `próximo control` · `última verificación`.

No almacenes credenciales, cookies, tokens, datos personales no necesarios ni documentos sensibles en este registro.
