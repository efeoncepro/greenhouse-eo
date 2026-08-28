# Registro operativo general de negocios CRM

> Vista rápida compartida para Codex y Claude. **No reemplaza HubSpot ni demuestra por sí sola el estado actual de un negocio.** HubSpot conserva la autoridad sobre Company, Contact, Deal, asociaciones, owner, pipeline, stage y propiedades. Confirma live antes de decidir o escribir y actualiza este registro después del readback.

## Propósito y cobertura

- Reúne negocios comerciales activos independientemente de su origen: cliente existente, expansión, renovación, inbound, outbound, referido, partner, licitación pública o RFP privado.
- Comienza el **2026-08-28** y sólo incluye negocios incorporados o revisados desde esa fecha. No se realizó una migración masiva del pipeline histórico de HubSpot.
- Resume situación, próximo paso y bloqueo. Los artefactos especializados permanecen en sus registros o workspaces de dominio.
- Una oportunidad de licitación en `Radar` no entra aquí. Se incorpora cuando existe un Deal HubSpot verificado.

## Relación con otros registros

| Registro                                                                   | Qué contiene                                                                                | Regla                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Este archivo                                                               | Vista transversal de deals activos y su siguiente movimiento comercial                      | Una fila por Deal HubSpot verificado              |
| [`tenders/LICITATION_CRM_REGISTER.md`](tenders/LICITATION_CRM_REGISTER.md) | Radar, bid/no-bid, bases, admisibilidad, preguntas, postulación y resultado de licitaciones | Una oportunidad puede existir antes de tener Deal |
| HubSpot                                                                    | Estado CRM, identidades, propiedades y asociaciones                                         | Fuente autoritativa                               |
| Workspace/propuesta del negocio                                            | Investigación, propuesta, pricing, anexos y evidencia                                       | Fuente de artefactos                              |

Cuando una licitación ya tiene Deal, aparece en ambos archivos con el mismo `deal_id`. Este registro conserva el resumen comercial; el registro de licitaciones conserva el detalle del bid. Un cambio de Company, Deal, owner, stage, amount, `closedate`, bucket o resultado debe sincronizarse en ambos después del readback.

## Clasificación mínima

### Origen

`cliente_existente` · `expansion` · `renovacion` · `inbound` · `outbound` · `referido` · `partner` · `licitacion_publica` · `rfp_privado` · `administrativo` · `no_verificado`.

### Movimiento comercial

| Movimiento                       | Uso                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `Core`                           | Renovación, expansión o nuevo negocio con un cliente existente.                              |
| `Strategic Bet`                  | Apuesta relevante con una cuenta nueva, incluyendo licitaciones públicas cuando corresponda. |
| `Opportunistic / Administrative` | Oportunidad táctica o administrativa que no cumple los criterios anteriores.                 |
| `Policy required`                | No existe evidencia suficiente o falta una decisión del operador.                            |

El mecanismo de compra no decide por sí solo el movimiento: primero se verifica la relación con la cuenta.

### Estado operativo del registro

| Estado          | Significado                                                            |
| --------------- | ---------------------------------------------------------------------- |
| `En evaluación` | Se valida fit, autoridad, alcance, capacidad, margen y siguiente paso. |
| `En desarrollo` | Se prepara solución, muestra, propuesta o precio.                      |
| `En decisión`   | Cliente/comité está evaluando o se negocian términos.                  |
| `Formalización` | Acuerdo/adjudicación lograda; contrato, OC o alta pendientes.          |
| `Ganado`        | Resultado ganado y Deal cerrado ganado, verificados.                   |
| `Perdido`       | Resultado perdido y Deal cerrado perdido, verificados.                 |
| `Pausado`       | Sin avance autorizado; conserva motivo y fecha de revisión.            |

Estos estados son una lectura operativa. No sustituyen `pipeline` ni `dealstage` de HubSpot.

## Negocios activos

| Deal / cuenta                                                                                                                                                                                                                                                      | Origen                                                                                                                                        | Movimiento                          |           Monto | Pipeline / stage             | Estado operativo | Próximo paso                                            | Bloqueo                                    | Owner                           | Cierre comercial     | Última verificación |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------: | ---------------------------- | ---------------- | ------------------------------------------------------- | ------------------------------------------ | ------------------------------- | -------------------- | ------------------- |
| [Campaña Festival de Ciencia y Tecnología 2026 · `64461187076`](https://app.hubspot.com/contacts/48713323/record/0-3/64461187076) / [Subsecretaría de Ciencia · `57870164778`](https://app.hubspot.com/contacts/48713323/record/0-2/57870164778)                   | `licitacion_publica` · [`1098710-22-LP26`](tenders/LICITATION_CRM_REGISTER.md#1098710-22-lp26--campaña-festival-de-ciencia-y-tecnología-2026) | `Strategic Bets` verificado live    | CLP 250.000.000 | `default` / `qualifiedtobuy` | `En evaluación`  | Completar admisibilidad y decisión final                | GO final de postulación pendiente          | Julio Reyes Rangel · `75788512` | 2026-10-01 18:00 CLT | 2026-08-28          |
| [Piezas gráficas y audiovisuales ProChile · `64482163516`](https://app.hubspot.com/contacts/48713323/record/0-3/64482163516) / [Dirección General de Promoción de Exportaciones · `31209269815`](https://app.hubspot.com/contacts/48713323/record/0-2/31209269815) | `licitacion_publica` · [`1082957-26-LE26`](tenders/LICITATION_CRM_REGISTER.md#1082957-26-le26--piezas-gráficas-y-audiovisuales-para-prochile) | `Core Pipeline` · cliente existente |  CLP 42.000.000 | `default` / `qualifiedtobuy` | `En evaluación`  | Acreditar seis profesionales y validar capacidad/margen | GO condicionado; postulación no verificada | Julio Reyes Rangel · `75788512` | 2026-09-30 18:00 CLT | 2026-08-28          |
| [Diseño gráfico Informe Anual DDN · `64471071912`](https://app.hubspot.com/contacts/48713323/record/0-3/64471071912) / [Defensoría de los Derechos de la Niñez · `57878590071`](https://app.hubspot.com/contacts/48713323/record/0-2/57878590071)                  | `licitacion_publica` · [`1062018-22-L126`](tenders/LICITATION_CRM_REGISTER.md#1062018-22-l126--diseño-gráfico-informe-anual-ddn)              | `Strategic Bets` · nuevo negocio    |   CLP 7.000.000 | `default` / `qualifiedtobuy` | `En evaluación`  | Validar portfolio, prueba, capacidad y margen           | GO condicionado; postulación no verificada | Julio Reyes Rangel · `75788512` | 2026-09-04 18:00 CLT | 2026-08-28          |
| [Creación y mantención web UOH · `64466117716`](https://app.hubspot.com/contacts/48713323/record/0-3/64466117716) / [Universidad de O'Higgins · `57899319173`](https://app.hubspot.com/contacts/48713323/record/0-2/57899319173) | `licitacion_publica` · [`889473-1673-COT26`](tenders/LICITATION_CRM_REGISTER.md#nuevas-promociones-verificadas--2026-08-28) | `Strategic Bets` · nuevo negocio | CLP 7.000.000 | `default` / `qualifiedtobuy` | `En evaluación` | Preparar cotización, admisibilidad y margen | Cierre urgente; postulación no verificada | Julio Reyes Rangel · `75788512` | No informado | 2026-08-28 |
| [Estrategia de medios Beneficios Estudiantiles 2027 · `64482321775`](https://app.hubspot.com/contacts/48713323/record/0-3/64482321775) / [Ministerio de Educación · `46499468091`](https://app.hubspot.com/contacts/48713323/record/0-2/46499468091) | `licitacion_publica` · [`1205889-3-LE26`](tenders/LICITATION_CRM_REGISTER.md#nuevas-promociones-verificadas--2026-08-28) | `Core Pipeline` · cliente existente | CLP 64.000.000 | `default` / `qualifiedtobuy` | `En evaluación` | Validar garantía, plan de medios y cashflow | Postulación no verificada | Julio Reyes Rangel · `75788512` | 2026-10-27 15:10 CLT | 2026-08-28 |
| [Campaña Nacional VCM 2026 · `64466272830`](https://app.hubspot.com/contacts/48713323/record/0-3/64466272830) / [Ministerio de la Mujer · `31163122599`](https://app.hubspot.com/contacts/48713323/record/0-2/31163122599) | `licitacion_publica` · [`918434-14-LP26`](tenders/LICITATION_CRM_REGISTER.md#nuevas-promociones-verificadas--2026-08-28) | `Core Pipeline` · cliente existente | CLP 350.000.000 | `default` / `qualifiedtobuy` | `En evaluación` | Acreditar campañas equivalentes y preparar briefing | Experiencia sobre CLP 100.000.000; postulación no verificada | Julio Reyes Rangel · `75788512` | 2026-10-05 18:00 CLT | 2026-08-28 |
| [Marketing digital Municipalidad de Valparaíso · `64469214508`](https://app.hubspot.com/contacts/48713323/record/0-3/64469214508) / [Municipalidad de Valparaíso · `32039105348`](https://app.hubspot.com/contacts/48713323/record/0-2/32039105348) | `licitacion_publica` · [`2427-73-LE26`](tenders/LICITATION_CRM_REGISTER.md#nuevas-promociones-verificadas--2026-08-28) | `Core Pipeline` · cliente existente | CLP 14.000.000 | `default` / `qualifiedtobuy` | `En evaluación` | Reunir experiencia acreditable y validar margen | Postulación no verificada | Julio Reyes Rangel · `75788512` | 2026-12-09 18:00 CLT | 2026-08-28 |
| [RFI Software Gestión de Tickets · `64469523247`](https://app.hubspot.com/contacts/48713323/record/0-3/64469523247) / [JUNJI · `57892355617`](https://app.hubspot.com/contacts/48713323/record/0-2/57892355617) | `licitacion_publica` · [`1595-19-RFI26`](tenders/LICITATION_CRM_REGISTER.md#nuevas-promociones-verificadas--2026-08-28) | `Strategic Bets` · nuevo negocio | No informado | `default` / `qualifiedtobuy` | `En evaluación` | Definir plataforma/partner y responder la consulta | Es RFI; no existe oferta ni cierre comercial aún | Julio Reyes Rangel · `75788512` | No informado | 2026-08-28 |

## Campos obligatorios por negocio

`deal_id` · `company_id` · `nombre` · `origen` · `movimiento` · `monto y moneda` · `pipeline` · `dealstage` · `estado operativo` · `próximo paso` · `owner` · `closedate y zona horaria` · `bloqueo` · `última verificación` · `registro especializado`, cuando aplique.

No inventes Company, Contact, asociación, monto, owner ni fecha. Usa `No verificado` cuando falte readback.

## Protocolo de actualización

1. Busca el Deal y la Company live antes de crear una fila; deduplica por IDs y por la llave de negocio aplicable.
2. Relee propiedades y asociaciones de HubSpot. Copia sólo datos observados.
3. Registra el próximo paso como acción concreta, con owner y fecha cuando existan.
4. Si el negocio pertenece a un dominio especializado, sincroniza también su registro: licitaciones, propuestas, partnership u otro.
5. Tras un cambio de stage, monto, owner, close date, asociación o resultado, actualiza este archivo sólo después del readback.
6. Retira una fila de activos cuando esté `Ganado` o `Perdido` únicamente si existe un histórico explícito; mientras no exista, consérvala con su resultado.

No almacenes credenciales, cookies, tokens, datos personales no necesarios ni documentos sensibles en este registro.
