# Registro operativo CRM de licitaciones

> Índice rápido compartido para Codex y Claude. **No reemplaza HubSpot, LicitaLAB, Mercado Público, las bases ni el comprobante de postulación.** Antes de decidir, escribir o afirmar un estado, confirma el dato en su fuente de verdad y luego actualiza este archivo.

## Alcance y corte

- Inicio del registro operativo: **2026-08-28**.
- Última actualización documentada: **2026-08-29, America/Santiago**.
- Universo documentado: 30 oportunidades revisadas (18 públicas y 12 privadas); 24 cuentan con Deal HubSpot verificado: 23 abiertos y uno `closedlost`.
- El readback live del 2026-08-29 encontró 24 Deals de licitación abiertos: 23 pertenecen a esta admisión y uno corresponde al RFI CRM Mineduc `1588-33-RFI26`, anterior al corte de este registro.
- Screening comparativo: [`LICITALAB_SCREENING_2026-08-28.md`](LICITALAB_SCREENING_2026-08-28.md).
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

| Estado                   | Significado                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `Radar`                  | Detectada; aún no pasó screening bid/no-bid.                                               |
| `Screening`              | Se están validando admisibilidad, fit, capacidad, margen y riesgo.                         |
| `Preparación`            | Existe GO para preparar/evaluar; no implica autorización para postular.                    |
| `Postulada`              | Existe comprobante verificable de envío con fecha/hora.                                    |
| `Esperando adjudicación` | Postulación confirmada y plazo cerrado; resultado pendiente.                               |
| `Ganada`                 | Adjudicación confirmada en fuente oficial y CRM.                                           |
| `Perdida`                | Resultado adverso confirmado en fuente oficial y CRM.                                      |
| `No bid`                 | Decisión explícita de no participar, con motivo.                                           |
| `HOLD`                   | Evaluación retenida por evidencia, documento o capacidad faltante; no equivale a `No bid`. |
| `Expirada`               | Cerró sin postulación y sin una decisión anterior más precisa.                             |

## Cola operativa — 2026-08-29

De los 23 Deals abiertos de esta admisión, 20 son postulaciones potenciales y tres son RFI de respuesta liviana. La cartera no es una lista plana: sólo las diez prioridades siguientes deben entrar primero a producción; las demás requieren gate de admisibilidad, capacidad y economía antes de consumir esfuerzo de propuesta.

| Prioridad | ID                | Oportunidad                                   | Cierre oficial       | Tratamiento                                               |
| --------: | ----------------- | --------------------------------------------- | -------------------- | --------------------------------------------------------- |
|         1 | `1082957-26-LE26` | Piezas gráficas y audiovisuales ProChile      | 2026-08-31 15:01 CLT | Bid prioritario; acreditar seis profesionales y capacidad |
|         2 | `1062018-22-L126` | Diseño gráfico Informe Anual DDN              | 2026-08-31 16:30 CLT | Bid prioritario; validar portfolio, prueba y margen       |
|         3 | `1878-9-LP26`     | Campaña de posicionamiento turístico Sernatur | 2026-09-02 15:00 CLT | Bid prioritario; resolver equipo, medios y admisibilidad  |
|         4 | `2427-73-LE26`    | Marketing digital Municipalidad de Valparaíso | 2026-09-03 16:00 CLT | Bid prioritario; experiencia acreditable y margen         |
|         5 | `WHX-70`          | Producción de videos corporativos             | 2026-09-04 16:00 CLT | Bid prioritario; cerrar formato, volumen y costos         |
|         6 | `1205889-3-LE26`  | Estrategia de medios Beneficios Estudiantiles | 2026-09-08 15:01 CLT | Bid prioritario; garantía, cashflow y plan de medios      |
|         7 | `1725-193-LE26`   | Estrategia y Plan de Medios Culturas          | 2026-09-09 11:00 CLT | Bid prioritario; acreditar medios, comisión y 40 % local  |
|         8 | `875-6-LP26`      | Marketing Digital InvestChile                 | 2026-09-14 15:00 CLT | Bid prioritario; equipo, certificaciones y cartas B2B     |
|         9 | `1098710-22-LP26` | Campaña Festival de Ciencia y Tecnología      | 2026-09-16 15:00 CLT | Bid prioritario; completar admisibilidad y GO final       |
|        10 | `918434-14-LP26`  | Campaña Nacional VCM 2026                     | 2026-09-28 20:00 CLT | Bid prioritario; acreditar campañas comparables           |

Respuestas RFI livianas: `MET-1468` (2026-08-31 16:00 CLT), `2465-18-RFI26` (2026-09-08 19:00 CLT) y `1595-19-RFI26` (2026-09-09 12:00 CLT). No deben recibir el costo de una propuesta completa mientras no exista proceso de compra.

Requieren gate antes de producción: `889473-1673-COT26`, `1305527-35-COT26`, `1498185-35-LE26`, `CIA-67`, `PRO-192`, `ACH-133`, `ESV-5122`, `MET-1464`, `SMZ-100` y `1007793-16-LE26`.

Esta prioridad es un snapshot operativo, no una propiedad permanente: debe recalcularse al cambiar plazos, documentos, admisibilidad, capacidad o economía.

## Resumen inicial LicitaLAB

| ID                  | Oportunidad / organismo                                                                         | Modalidad             |           Monto | Cierre oficial       | Estado operativo | Decisión                                              | Postulación                                       | HubSpot                                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------- | --------------------- | --------------: | -------------------- | ---------------- | ----------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `1098710-22-LP26`   | Campaña Festival de Ciencia y Tecnología 2026 / Subsecretaría de Ciencia                        | Licitación pública LP | CLP 250.000.000 | 2026-09-16 15:00 CLT | `Preparación`    | GO para evaluación; GO final de postulación pendiente | No postulada al corte 2026-08-28; sin comprobante | [Deal 64461187076](https://app.hubspot.com/contacts/48713323/record/0-3/64461187076) · [Company 57870164778](https://app.hubspot.com/contacts/48713323/record/0-2/57870164778) |
| `1062018-22-L126`   | Diseño gráfico Informe Anual DDN / Defensoría de los Derechos de la Niñez                       | Licitación pública L1 |   CLP 7.000.000 | 2026-08-31 16:30 CLT | `Preparación`    | GO condicionado; gates técnicos/económicos pendientes | No verificada                                     | [Deal 64471071912](https://app.hubspot.com/contacts/48713323/record/0-3/64471071912) · [Company 57878590071](https://app.hubspot.com/contacts/48713323/record/0-2/57878590071) |
| `1082957-26-LE26`   | Piezas gráficas y audiovisuales para ProChile / Dirección General de Promoción de Exportaciones | Licitación pública LE |  CLP 42.000.000 | 2026-08-31 15:01 CLT | `Preparación`    | GO condicionado; staffing declarado, gates pendientes | No verificada                                     | [Deal 64482163516](https://app.hubspot.com/contacts/48713323/record/0-3/64482163516) · [Company 31209269815](https://app.hubspot.com/contacts/48713323/record/0-2/31209269815) |
| `564162-108-L126`   | Campaña digital Despega USACH 2026 / Universidad de Santiago de Chile                           | Licitación pública L1 |   CLP 3.500.000 | 2026-09-02 15:00 CLT | `Screening`      | No-bid recomendado; decisión humana pendiente         | No verificada                                     | No promovida                                                                                                                                                                   |
| `4841-69-COT26`     | Revista Conserva N.° 27 y requerimientos CNCR / Servicio Nacional del Patrimonio Cultural       | Compra Ágil           |   CLP 2.400.000 | 2026-08-31 12:00 CLT | `Screening`      | No-bid recomendado; decisión humana pendiente         | No verificada                                     | No promovida                                                                                                                                                                   |
| `889473-1673-COT26` | Creación y mantención de página web / Universidad de O'Higgins                                  | Compra Ágil           |   CLP 7.000.000 | 2026-08-31 10:00 CLT | `Preparación`    | GO para preparar; admisibilidad y margen pendientes   | No verificada                                     | [Deal 64466117716](https://app.hubspot.com/contacts/48713323/record/0-3/64466117716) · [Company 57899319173](https://app.hubspot.com/contacts/48713323/record/0-2/57899319173) |
| `1205889-3-LE26`    | Estrategia de medios Beneficios Estudiantiles 2027 / Ministerio de Educación                    | Licitación pública LE |  CLP 64.000.000 | 2026-09-08 15:01 CLT | `Preparación`    | GO para preparar; validar medios, garantía y margen   | No verificada                                     | [Deal 64482321775](https://app.hubspot.com/contacts/48713323/record/0-3/64482321775) · [Company 46499468091](https://app.hubspot.com/contacts/48713323/record/0-2/46499468091) |
| `918434-14-LP26`    | Campaña Nacional VCM 2026 / Ministerio de la Mujer y la Equidad de Género                       | Licitación pública LP | CLP 350.000.000 | 2026-09-28 20:00 CLT | `Preparación`    | GO para preparar; acreditar campañas de gran escala   | No verificada                                     | [Deal 64466272830](https://app.hubspot.com/contacts/48713323/record/0-3/64466272830) · [Company 31163122599](https://app.hubspot.com/contacts/48713323/record/0-2/31163122599) |
| `2427-73-LE26`      | Marketing digital para redes sociales / Municipalidad de Valparaíso                             | Licitación pública LE |  CLP 14.000.000 | 2026-09-03 16:00 CLT | `Preparación`    | GO para preparar; acreditar contratos y margen        | No verificada                                     | [Deal 64469214508](https://app.hubspot.com/contacts/48713323/record/0-3/64469214508) · [Company 32039105348](https://app.hubspot.com/contacts/48713323/record/0-2/32039105348) |
| `1595-19-RFI26`     | RFI Software Gestión de Tickets / JUNJI                                                         | Consulta al mercado   |    No informado | 2026-09-09 12:00 CLT | `Preparación`    | GO para responder RFI; definir plataforma/alianza     | No verificada                                     | [Deal 64469523247](https://app.hubspot.com/contacts/48713323/record/0-3/64469523247) · [Company 57892355617](https://app.hubspot.com/contacts/48713323/record/0-2/57892355617) |

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
| Bucket               | `Strategic Bets`, corregido mediante MCP y verificado live el 2026-08-28                                                                                     |
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
| Estado / decisión        | `Screening` / no-bid recomendado; decisión humana pendiente                                                     |
| Postulación              | No verificada                                                                                                   |
| HubSpot                  | No promovida; para una Compra Ágil nueva, `pipeline_bucket` sigue `policy_required` hasta decisión del operador |
| Próximo control          | Confirmar portfolio/cartas, cuantificar alcance y demostrar margen; si falla un gate, cerrar como `No bid`      |

### `1082957-26-LE26` — Piezas gráficas y audiovisuales para ProChile

| Campo                    | Valor al corte                                                                                                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organismo                | Dirección General de Promoción de Exportaciones (ProChile)                                                                                                                                                                                                             |
| Región                   | Región Metropolitana de Santiago                                                                                                                                                                                                                                       |
| Modalidad                | Licitación pública (`LE`)                                                                                                                                                                                                                                              |
| Monto                    | CLP 42.000.000                                                                                                                                                                                                                                                         |
| Cierre oficial observado | 2026-08-31 15:01 CLT                                                                                                                                                                                                                                                   |
| Score LicitaLAB          | 80 %; señal de discovery                                                                                                                                                                                                                                               |
| Estado / decisión        | `Preparación` / GO condicionado; equipo disponible declarado por el operador, acreditación y margen pendientes                                                                                                                                                         |
| Postulación              | No verificada                                                                                                                                                                                                                                                          |
| HubSpot                  | [Deal `64482163516`](https://app.hubspot.com/contacts/48713323/record/0-3/64482163516) asociado a [Company `31209269815`](https://app.hubspot.com/contacts/48713323/record/0-2/31209269815); `Core Pipeline`, `existingbusiness`, `default/qualifiedtobuy` verificados |
| Próximo control          | Nominar/acreditar seis profesionales, validar capacidad sin afectar Sky y demostrar margen positivo                                                                                                                                                                    |

### `1062018-22-L126` — Diseño gráfico Informe Anual DDN

| Campo                    | Valor al corte                                                                                                                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organismo                | Defensoría de los Derechos de la Niñez                                                                                                                                                                                                                                      |
| Región                   | Región Metropolitana de Santiago                                                                                                                                                                                                                                            |
| Modalidad                | Licitación pública (`L1`)                                                                                                                                                                                                                                                   |
| Monto                    | CLP 7.000.000 con impuestos                                                                                                                                                                                                                                                 |
| Cierre oficial observado | 2026-08-31 16:30 CLT                                                                                                                                                                                                                                                        |
| Score LicitaLAB          | 80 %; señal de discovery                                                                                                                                                                                                                                                    |
| Estado / decisión        | `Preparación` / GO condicionado; gates técnicos y económicos pendientes                                                                                                                                                                                                     |
| Postulación              | No verificada                                                                                                                                                                                                                                                               |
| HubSpot                  | [Deal `64471071912`](https://app.hubspot.com/contacts/48713323/record/0-3/64471071912) asociado a la nueva [Company `57878590071`](https://app.hubspot.com/contacts/48713323/record/0-2/57878590071); `Strategic Bets`, `newbusiness`, `default/qualifiedtobuy` verificados |
| Próximo control          | Validar portfolio, prueba, capacidad y margen; la Company conserva RUT `62.000.410-3` y queda separada de Subsecretaría                                                                                                                                                     |

### `564162-108-L126` — Campaña digital Despega USACH 2026

| Campo                    | Valor al corte                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Organismo                | Universidad de Santiago de Chile                                                                               |
| Región                   | Región Metropolitana de Santiago                                                                               |
| Modalidad                | Licitación pública (`L1`)                                                                                      |
| Monto                    | CLP 3.500.000 con impuestos                                                                                    |
| Cierre oficial observado | 2026-09-02 15:00 CLT                                                                                           |
| Score LicitaLAB          | 82 %; señal de discovery                                                                                       |
| Estado / decisión        | `Screening` / no-bid recomendado; decisión humana pendiente                                                    |
| Postulación              | No verificada                                                                                                  |
| HubSpot                  | No promovida; buscar la Company live y deduplicar antes de crear cualquier deal                                |
| Próximo control          | Reconsiderar sólo con operación ultraliviana y valor de credencial explícito; por rentabilidad aislada, no-bid |

### Nuevas promociones verificadas — 2026-08-28

| ID                  | Evidencia de alcance                                                                                                             | HubSpot live                                                                                        | Próximo control                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `889473-1673-COT26` | Sitio a medida, CMS, UX, SEO, VPS, SSL/WAF y mantención anual; entrega máxima de 90 días hábiles                                 | `Strategic Bets` · `newbusiness` · `default/qualifiedtobuy`; cierre comercial no informado          | Preparar cotización excluyente y validar capacidad/margen antes del cierre     |
| `1205889-3-LE26`    | Estrategia y ejecución de medios por aproximadamente 40 días; presupuesto máximo CLP 64.000.000 y comisión de agencia máxima 3 % | `Core Pipeline` · `existingbusiness` · `default/qualifiedtobuy`; `closedate` 2026-10-27 15:10 CLT   | Validar garantía, cashflow, plan de medios y antecedentes                      |
| `918434-14-LP26`    | Campaña nacional integral; 60 % medios y 40 % producción; propuesta creativa pondera 70 puntos                                   | `Core Pipeline` · `existingbusiness` · `default/qualifiedtobuy`; `closedate` 2026-10-05 18:00 CLT   | Acreditar campañas comparables sobre CLP 100.000.000 y preparar briefing/pitch |
| `2427-73-LE26`      | Gestión de avisaje Meta/YouTube con piezas entregadas por el municipio; experiencia evaluable sobre CLP 5.000.000                | `Core Pipeline` · `existingbusiness` · `default/qualifiedtobuy`; `closedate` 2026-12-09 18:00 CLT   | Reunir contratos acreditables y validar margen por gestión                     |
| `1595-19-RFI26`     | Consulta al mercado por plataforma de tickets a 36 meses, Teams/Bot IA, Power BI y aproximadamente 45.000 tickets anuales        | `Strategic Bets` · `newbusiness` · `default/qualifiedtobuy`; monto y cierre comercial no informados | Definir solución/partner y responder costos, arquitectura y experiencia        |

Las cinco asociaciones Deal ↔ Company fueron releídas live. No se asociaron contactos: no existe evidencia de que
los contactos disponibles participen en estos procesos. La búsqueda exacta por `id_de_licitacion` devolvió un único
Deal para cada ID. `gh_idempotency_key` no fue poblado en estos cinco Deals durante la carga aprobada; hasta que un
write posterior cierre esa brecha, la deduplicación operativa debe consultar obligatoriamente el ID exacto antes de
cualquier retry.

### Segundo lote MCP promovido y verificado — 2026-08-28

| ID                 | Evidencia de alcance                                                                                                                                 | HubSpot live                                                                                                                                              | Próximo control                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `875-6-LP26`       | Marketing digital B2B para InvestChile: pauta, HubSpot, WordPress→HubSpot, CRO, SEO/AEO/GEO, analítica y tres perfiles con dedicación definida       | Deal `64481242885` ↔ Company nueva `57907401372`; `Strategic Bets` · `newbusiness` · `default/qualifiedtobuy`; CLP 225.000.000                           | Mapear jefe full-time, analista y full-stack; reunir certificaciones vigentes y cartas B2B            |
| `1007793-16-LE26`  | Campaña integral de admisión por 9 meses; marketing, pauta, audiovisual, diseño y web; exige equipo presencial y experiencia educacional acreditable | Deal `64483101221` ↔ Company existente `34959053323`; `Core Pipeline` · `existingbusiness` · `default/qualifiedtobuy`; CLP 23.438.000                    | Validar contratos educacionales ≥ CLP 5.000.000, cinco perfiles y capacidad de presencia en Los Lagos |
| `2465-18-RFI26`    | Consulta de mercado por planificación y difusión en siete plataformas, dashboard, acompañamiento 24/7 y horizonte de 36 meses                        | Deal `64481086492` ↔ Company existente `31776227440`; `Core Pipeline` · `existingbusiness` · `default/qualifiedtobuy`; monto y `closedate` no informados | Preparar respuesta de mercado y vigilar la licitación derivada                                        |
| `1878-9-LP26`      | Campaña de posicionamiento turístico de Magallanes; estrategia, producción y ejecución de medios                                                     | Deal `64465215819` ↔ Company existente `31640422315`; `Core Pipeline` · `existingbusiness` · `default/qualifiedtobuy`; CLP 146.051.371                   | Resolver experiencia, equipo, medios y plazo de preparación antes del cierre                          |
| `1498185-35-LE26`  | Dos líneas independientes de monitoreo de medios y redes sociales por 12 meses; experiencia aporta puntaje pero no es excluyente                     | Deal `64474119987` ↔ Company existente `52875089791`; `Core Pipeline` · `existingbusiness` · `default/qualifiedtobuy`; CLP 10.500.000                    | Definir plataforma propia/partner y línea ofertable; cierre urgente                                   |
| `1305527-35-COT26` | Ticketera SaaS para tres agentes por 12 meses; migración Freshdesk ≥95 %, capacitación, SLA 99,5 % y multas                                          | Deal `64471694515` ↔ Company nueva `57888044943`; `Strategic Bets` · `newbusiness` · `default/qualifiedtobuy`; CLP 4.500.000                             | Confirmar solución/licencias, margen y capacidad de migración antes del cierre                        |
| `1725-193-LE26`    | Estrategia y plan de medios nacional para Mes de la Música; bolsa máxima CLP 71.000.000, reporting y restricciones de comisión                       | Deal `64498934284` ↔ Company existente `31209274438`; `Core Pipeline` · `existingbusiness` · `default/qualifiedtobuy`                                    | Resolver acreditación de medios, comisión, 40 % local y cashflow                                      |
| `2099-45-LE26`     | Gestión de campaña comunicacional SEREMI Magallanes; experiencia exige facturas de medios y favorece contratación regional                           | Deal `64471076758` ↔ Company existente `32340888618`; `Core Pipeline` · `existingbusiness` · `default/closedlost`; CLP 26.000.000                        | `No bid`: no existen facturas acreditables de medios contratados; conservar seguimiento documental    |

Las ocho búsquedas previas por `id_de_licitacion` y `gh_idempotency_key` devolvieron cero Deals. Después del write,
el readback devolvió un Deal por código, las ocho llaves técnicas pobladas y las ocho asociaciones Deal ↔ Company.
No se crearon contactos. Una automatización de HubSpot marcó temporalmente las Companies nuevas como clientes y
movió sus Deals a `Core Pipeline`; el readback detectó la deriva y restituyó InvestChile y SLEP del Pino a
`Strategic Bets`, conforme a la relación comercial previa verificada.

### RFP privados Wherex promovidos y verificados — 2026-08-28

| ID         | Comprador / oportunidad                                             | Cierre oficial Wherex | HubSpot live                                                                                                                                                                                                                                          | Próximo control                                                            |
| ---------- | ------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `WHX-70`   | wherEX — Producción de videos corporativos                          | 2026-09-04 16:00 CLT  | Deal [`64467206723`](https://app.hubspot.com/contacts/48713323/record/0-3/64467206723) ↔ Company [`32707352491`](https://app.hubspot.com/contacts/48713323/record/0-2/32707352491); `Core Pipeline` · `newbusiness` · `default/qualifiedtobuy`       | Revisar formato, volumen, calendario y costo de producción                 |
| `ESV-5122` | Esval — Mantención y evolución Portal SGI                           | 2026-09-07 16:00 CLT  | Deal [`64469838993`](https://app.hubspot.com/contacts/48713323/record/0-3/64469838993) ↔ Company nueva [`57897950377`](https://app.hubspot.com/contacts/48713323/record/0-2/57897950377); `Core Pipeline` · `newbusiness` · `default/qualifiedtobuy` | Revisar ficha técnica, SLA e integración Microsoft 365                     |
| `MET-1468` | Metrogas — Experiencias inmersivas para capacitaciones              | 2026-08-31 16:00 CLT  | Deal [`64468445746`](https://app.hubspot.com/contacts/48713323/record/0-3/64468445746) ↔ Company [`29954747479`](https://app.hubspot.com/contacts/48713323/record/0-2/29954747479); `Core Pipeline` · `newbusiness` · `default/qualifiedtobuy`       | Revisar pliego técnico y responder el RFI                                  |
| `SMZ-100`  | Simoniz — Agencia creativa y plan de medios TITAN                   | 2026-09-07 18:00 CLT  | Deal [`64457200722`](https://app.hubspot.com/contacts/48713323/record/0-3/64457200722) ↔ Company [`39129628052`](https://app.hubspot.com/contacts/48713323/record/0-2/39129628052); `Core Pipeline` · `newbusiness` · `default/qualifiedtobuy`       | Leer brief; validar operación y facturación en Colombia                    |
| `PRO-192`  | Grupo Diagnóstico Médico PROA — Plataforma de registro para eventos | 2026-09-02 18:00 CLT  | Deal [`64499710344`](https://app.hubspot.com/contacts/48713323/record/0-3/64499710344) ↔ Company nueva [`57909266316`](https://app.hubspot.com/contacts/48713323/record/0-2/57909266316); `Core Pipeline` · `newbusiness` · `default/qualifiedtobuy` | Resolver las 82 preguntas pendientes y revisar el alcance completo         |
| `ACH-133`  | ACHS — Mantención y desarrollo sitios web 2026                      | 2026-09-08 16:00 CLT  | Deal [`64486815558`](https://app.hubspot.com/contacts/48713323/record/0-3/64486815558) ↔ Company [`27767787435`](https://app.hubspot.com/contacts/48713323/record/0-2/27767787435); `Core Pipeline` · `newbusiness` · `default/qualifiedtobuy`       | Validar Sitefinity, ciberseguridad y garantía de 100 UF                    |
| `CIA-67`   | CIAL — Atención omnicanal de clientes                               | 2026-08-31 16:00 CLT  | Deal [`64467051589`](https://app.hubspot.com/contacts/48713323/record/0-3/64467051589) ↔ Company [`53957217621`](https://app.hubspot.com/contacts/48713323/record/0-2/53957217621); `Core Pipeline` · `newbusiness` · `default/qualifiedtobuy`       | Dimensionar dotación, canales, SLA y experiencia sectorial                 |
| `MET-1464` | Metrogas — Plataforma de gestión de procesos comerciales            | 2026-09-07 09:00 CLT  | Deal [`64456890965`](https://app.hubspot.com/contacts/48713323/record/0-3/64456890965) ↔ Company [`29954747479`](https://app.hubspot.com/contacts/48713323/record/0-2/29954747479); `Core Pipeline` · `newbusiness` · `default/qualifiedtobuy`       | Revisar nueve documentos, ciberseguridad, finanzas e integración Kanbanize |

Las ocho búsquedas exactas por ID devolvieron un solo Deal después de la creación. El readback inicial solicitó
`Strategic Bets`, pero la segunda verificación live del 2026-08-29 encontró los ocho Deals en `Core Pipeline`,
todos con `newbusiness` y `default/qualifiedtobuy`. Esto contradice la política relación-primero para cuentas
nuevas; la automatización o regla causante no está verificada y no se corrigió silenciosamente en este cierre
documental. Se mantienen owner `75788512`, fecha límite separada de `closedate` y asociación Deal ↔ Company.
No se crearon contactos porque no se acreditó un interlocutor real.

### Wherex retenidas o descartadas — 2026-08-28

| ID                                             | Comprador / oportunidad                                                       | Decisión al corte                      | Evidencia y siguiente control                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CNX-239`                                      | CINTERMEX — Estrategia de comunicación, PR y medios para Expo Constructo 2027 | `HOLD vencido / portal no verificado`  | Fit comercial aparente, pero el cierre observado fue 2026-08-28 20:00 CLT y no existe evidencia de extensión o reapertura. El alcance exige experiencia comprobable en PR y eventos B2B, referencias, al menos 30 notas, medios y monitoreo. El adjunto sigue `manual-save-required`. No reabrir ni crear Deal sin readback del portal, DOCX local y referencias verificadas. |
| `GRD-1496`, `GRD-1499`, `GRD-1501`, `GRD-1502` | Grupo Reditos                                                                 | `No bid / descartadas por el operador` | No crear Deals ni modificar la Company existente. `GRD-1496` quedó fuera de la promoción inicial, pero se incluye en el descarte de grupo para evitar recurrencia. Reabrir únicamente por instrucción explícita.                                                                                                                                                              |

## Protocolo de actualización

Actualiza este registro inmediatamente después de cualquiera de estos hitos:

1. Radar o triage: agrega la fila con fuente y fecha de corte.
2. Bid/no-bid: registra decisión, motivo, aprobador y fecha; un score de LicitaLAB no equivale a GO.
3. Promoción a CRM: busca por ID normalizado e idempotencia, reutiliza Company, crea/asocia sólo entidades reales y relee HubSpot antes de copiar IDs, pipeline, stage y enlaces. Ejecuta un segundo readback después de las automatizaciones y registra cualquier deriva sin corregirla silenciosamente.
4. Cambio de plazo o aclaración: actualiza la fecha oficial desde bases/portal; conserva separada la fecha de adjudicación o cierre comercial.
5. Postulación: cambia a `Postulada` sólo con fecha/hora, responsable y enlace/ruta al comprobante verificable.
6. Resultado: confirma resolución oficial, sincroniza HubSpot y registra `Ganada`, `Perdida`, `No bid` o `Expirada` con motivo.

### Campos obligatorios para una nueva fila

`ID` · `tipo público/privado` · `fuente` · `organismo/empresa` · `modalidad` · `monto y moneda` · `cierre oficial y zona horaria` · `estado` · `decisión` · `postulación` · `Company/deal HubSpot` · `owner` · `próximo control` · `última verificación`.

No almacenes credenciales, cookies, tokens, datos personales no necesarios ni documentos sensibles en este registro.
