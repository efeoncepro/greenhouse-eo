# TASK-905 International Withholding Americas — SII Discovery 2026-05-17

## Scope

Auditoria normativa para `TASK-905 — International Withholding Engine V1 (Americas)`.

Objetivo: congelar las casuisticas que el motor debe distinguir para un pagador `CL` cuando un colaborador `international_internal` no residente en Chile recibe pagos directos desde Efeonce/Greenhouse.

Esto no es asesoria tributaria. Es input tecnico-operativo para disenar un motor fail-closed y para pedir validacion Tax/Legal antes de aprobar reglas productivas.

## Fuentes oficiales revisadas

- SII, Convenios Tributarios Internacionales: `https://www.sii.cl/normativa_legislacion/convenios_internacionales.html`
- SII, Ley sobre Impuesto a la Renta vigente PDF: `https://www.sii.cl/normativa_legislacion/leyimpuestoalarenta.pdf`
- SII, FAQ Impuesto Adicional Art. 59/60 servicios computacionales/profesionales/tecnicos, actualizada 2025-01-27: `https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_5588.htm`
- SII, Resolucion Exenta N°58 de 2021 sobre declaracion del beneficiario para aplicar convenios: `https://www.sii.cl/normativa_legislacion/resoluciones/2021/reso58.pdf`
- SII, textos de convenios vigentes para Americas: Argentina, Brasil, Canada, Colombia, Ecuador, Estados Unidos, Mexico, Paraguay, Peru y Uruguay, enlazados desde la pagina oficial de convenios SII.

## Decision de diseno recomendada

El motor no debe tener una unica columna `withholding_rate_by_country`. La tasa depende, como minimo, de:

- `tax_residence_country_code`
- `payer_country='CL'`
- `payee_type`: `natural_person`, `company`, `partnership_or_entity`, `unknown`
- `service_category`: `technical_service`, `professional_service`, `consulting_service`, `management_service`, `software_standard_use`, `royalty_ip`, `creative_service`, `reimbursement`, `other`
- `service_performed_country_code` y dias fisicos en Chile dentro de ventana de 12 meses cuando aplica Art. 14 del convenio
- existencia de establecimiento permanente o base fija en Chile
- beneficiario efectivo y residencia fiscal validada
- evidencia de convenio vigente
- relacion especial/related-party y posible regimen fiscal preferencial Art. 41 H LIR
- `tax_borne_by`: contractor vs Efeonce gross-up

Sin esos inputs, el estado correcto es `needs_tax_review` o `blocked_missing_evidence`, no tasa 0.

## Ley interna chilena — baseline SII sin convenio

### Articulo 59 LIR

El Art. 59 aplica Impuesto Adicional a pagos/remesas a personas sin domicilio ni residencia en Chile. Para servicios, el caso central de TASK-905 es el numeral de trabajos de ingenieria/tecnicos y servicios profesionales/tecnicos:

- tasa base: `15%`
- aplica a personas naturales o juridicas
- aplica aunque el servicio se preste en Chile o en el exterior
- sube a `20%` si el acreedor/beneficiario esta en circunstancias de regimen fiscal preferencial conforme al cierre del inciso primero del Art. 59 / Art. 41 H

La FAQ SII confirma el mismo criterio para configuracion/funcionamiento de equipos computacionales por profesional extranjero: Art. 59 N°2, tasa `15%`, o `20%` si concurren las circunstancias especiales.

### Articulo 59 — otras categorias que no deben caer accidentalmente en servicios

- `royalty_ip`: uso/goce/explotacion de marcas, patentes, formulas y similares: `30%` general, con reducciones especificas para ciertos derechos industriales/software.
- `software_standard_use`: uso de software estandar queda exento de Impuesto Adicional bajo el propio Art. 59 si los derechos transferidos se limitan al uso normal y no a explotacion comercial/reproduccion/modificacion. No modelarlo como pago a colaborador.
- `export_related_exemption`: ciertas sumas por publicidad/promocion, analisis de mercado, investigacion cientifica/tecnologica, asesorias/defensas legales, y trabajos/servicios tecnicos ligados estrictamente a exportacion pueden eximirse si cumplen requisitos SII/Aduanas. Esto no debe ser regla automatica de payroll.
- `nontechnical_other_service`: si no encaja en Art. 59 y es renta de fuente chilena, Art. 60 puede llevar a `35%`; si es servicio personal cientifico/cultural/deportivo desarrollado en Chile, Art. 60 contempla `20%`. Para payroll internacional V1 debe bloquear como revision.

### Retencion y pago

Art. 74 N°4 obliga al pagador chileno a retener por rentas afectas a Impuesto Adicional de los articulos 58, 59 y 60 con la tasa que corresponda. Art. 79 exige declarar y pagar lo retenido hasta el dia 12 del mes siguiente al pago/remesa/abono/puesta a disposicion.

## Convenios — evidencia obligatoria antes de tasa reducida o cero

Para aplicar un convenio, Art. 74 N°4 y Resolucion SII N°58/2021 exigen que el beneficiario entregue:

- certificado de residencia fiscal emitido por autoridad competente del otro Estado Contratante
- declaracion al agente retenedor, en forma SII, de que no tiene en Chile establecimiento permanente o base fija atribuible a la renta
- declaracion de que cumple requisitos para ser beneficiario del convenio respecto de esa renta

El certificado presume residencia fiscal durante el año calendario de emision, salvo prueba en contrario. Si SII determina que no procedia el convenio, el pagador obligado a retener responde por la retencion omitida o retenida de menos. Por lo tanto, `approved_no_withholding` o tasa reducida siempre requiere snapshot de evidencia.

## Convenios vigentes SII en Americas

Segun la pagina SII de convenios vigentes, Americas con convenio para evitar doble imposicion aplicable en Chile:

| Pais | ISO | Fecha aplicacion Chile SII | Notas TASK-905 |
|---|---:|---:|---|
| Argentina | AR | 2017-01-01 | Convenio vigente. Requiere lectura legal fina para distinguir Art. 12 asistencia tecnica vs Art. 14 servicios personales independientes. No aprobar automatico solo por pais. |
| Brasil | BR | 2004-01-01 | Art. 12 royalties max `15%`; protocolo incluye servicios tecnicos/asistencia tecnica dentro de Art. 12. Art. 14 tiene reglas propias para naturales. |
| Canada | CA | 2000-01-01 | Art. 14 permite fuente con cap `10%` si servicios independientes se llevan a cabo en el otro Estado; Art. 12 royalties max `15%`. |
| Colombia | CO | 2010-01-01 | Art. 12 royalties max `10%` e incluye asistencia tecnica, servicios tecnicos y consultoria. Art. 14 para naturales: Chile solo si base fija o 183 dias. |
| Ecuador | EC | 2004-01-01 | Art. 12 royalties `10%` equipos / `15%` otros. Art. 14 para naturales: Chile solo si base fija o 183 dias. |
| Estados Unidos | US | 2024-01-01, vigencia desde 2023-12-19 | Art. 12 royalties `2%` equipos / `10%` IP. Art. 14 para naturales: Chile solo si base fija o 183 dias. No tratar servicios tecnicos corrientes como royalties sin analisis. |
| Mexico | MX | 2000-01-01 | Art. 14 para naturales con cap `10%` si servicios se llevan a cabo en Chile; Art. 12 royalties requiere clasificacion separada. |
| Paraguay | PY | 2009-01-01 | Art. 14 para naturales: Chile solo si base fija o 183 dias. Art. 12 royalties requiere clasificacion separada. |
| Peru | PE | 2004-01-01 | Art. 14 para naturales con cap `10%` por servicios llevados a cabo en Chile; Art. 12 royalties max `15%`. |
| Uruguay | UY | 2019-01-01 | Art. 14bis honorarios por servicios tecnicos: max `10%` para servicios gerenciales, tecnicos o consultoria; Art. 14 natural no tecnico: base fija o 183 dias. |

La Convencion Alianza del Pacifico figura en SII con aplicacion Chile 2024-01-01. Para TASK-905 no debe cambiar automaticamente servicios de payroll; debe quedar como fuente referencial a revisar por Tax/Legal porque su foco operativo conocido no es autorizar pago bruto a colaboradores.

## Convenios de transporte e intercambio de informacion no habilitan payroll services

SII lista convenios de transporte internacional vigentes con Panama, Uruguay, Venezuela y Estados Unidos, entre otros. Esos convenios no son convenios generales de doble tributacion para servicios profesionales/tecnicos de colaboradores. Para TASK-905:

- Panama: transporte aereo vigente no habilita tasa reducida para payroll services.
- Venezuela: transporte aereo/maritimo vigente no habilita tasa reducida para payroll services.
- Uruguay: si aplica el convenio general UY, usar ese; el convenio de transporte no es la base de servicios personales/tecnicos.
- Bermudas, Guernesey, Jersey y Uruguay figuran en intercambio de informacion; eso no equivale a convenio de doble tributacion para reducir retencion de servicios.

## Casuisticas que debe resolver el motor

| Caso | Inputs obligatorios | Tratamiento recomendado |
|---|---|---|
| Pais sin convenio, servicio profesional/tecnico Art. 59 N°2 | residencia fiscal, contrato/invoice, categoria de servicio, beneficiario no residente, Art. 41 H check | `approved_with_withholding` candidato `15%`; `20%` si Art. 41 H/riesgo preferencial. Requiere aprobacion Tax/Legal antes de production seed. |
| Pais sin convenio, servicio no tecnico/no profesional | servicio, fuente, lugar de prestacion, contrato, legal basis | `needs_tax_review`; posible Art. 60 `35%` si renta fuente Chile o no encaja en Art. 59. |
| Pais sin convenio, export-related exemption | evidencia exportacion, relacion estricta, comunicacion/criterio SII/Aduanas | `blocked_missing_evidence` hasta que Legal apruebe; no usar automatico en payroll. |
| Pais con convenio, servicio tecnico incluido en royalties o FTS | certificado residencia, no EP/base fija, beneficiario efectivo, categoria tecnica/consultoria, articulo aplicable | tasa de convenio si la regla pais/articulo esta aprobada; si falta evidencia, `blocked_missing_evidence`. |
| Pais con convenio, persona natural independiente con Art. 14 | certificado residencia, lugar real de prestacion, dias Chile 12 meses, base fija, contrato | si no hay base fija/183 dias y el convenio solo permite residencia: `approved_no_withholding` candidato; si servicio se presta en Chile y tratado permite fuente, aplicar cap o bloquear segun pais. |
| Pais con convenio, empresa/entidad prestadora | certificado residencia, beneficiario efectivo, PE en Chile, articulo 7 vs 12/14bis | Art. 7 puede llevar a no retencion sin PE, pero si el convenio incluye servicios tecnicos en Art. 12/14bis se aplica tasa fuente. `needs_tax_review` si no hay clasificacion. |
| Related party o beneficiario en regimen fiscal preferencial | ownership/related-party, Art. 41 H check, beneficiario efectivo | nunca tasa 0 automatica; aplicar regla especial o `needs_tax_review`. |
| Reembolso puro | contrato mandato/soporte, no margen, tercero, evidencia | `needs_tax_review`; SII ha tratado gasto reembolsable separadamente segun hechos. |
| Gross-up | `tax_borne_by='efeonce'`, aprobacion Finance, legal basis | no descontar al neto sin modelar costo adicional; si no hay policy, `blocked_missing_evidence`. |
| Certificado vencido | fecha emision, periodo payroll | `blocked_missing_evidence`; no heredar evidencia de años anteriores. |
| Pais/territorio de residencia ambiguo | certificado, address, tax ID, tie-breaker si doble residencia | `needs_tax_review`. |
| Presencia fisica en Chile | travel/day count, work location, base fija | requiere calculo de dias 12 meses y posible fuente Chile. |
| Contrato parece empleo/subordinacion | horario, jefatura, exclusividad, continuidad, dependencia economica | `needs_legal_classification_review`; no resolver como withholding solamente. |

## Matriz Americas para seed V1

Recomendacion: todos los paises/territorios de Americas deben tener al menos fallback `needs_tax_review`. Solo promover a `approved_*` despues de aprobacion Tax/Legal de la combinacion pais + servicio + payeeType + evidencia.

| ISO | Jurisdiccion | Convenio SII general DTA | Seed V1 recomendado |
|---:|---|---|---|
| AI | Anguilla | No | `needs_tax_review`; si Art. 59 tecnico/profesional aprobado, posible `15/20%`. |
| AG | Antigua and Barbuda | No | `needs_tax_review`; revisar Art. 41 H/beneficiario. |
| AR | Argentina | Si | `needs_tax_review` por servicio; convenio vigente pero Art. 12/14 requiere clasificacion. |
| AW | Aruba | No | `needs_tax_review`; posible regimen preferencial segun facts. |
| BS | Bahamas | No | `needs_tax_review`; revisar Art. 41 H/beneficiario. |
| BB | Barbados | No | `needs_tax_review`; revisar Art. 41 H/beneficiario. |
| BZ | Belize | No | `needs_tax_review`; revisar Art. 41 H/beneficiario. |
| BM | Bermuda | No DTA; solo intercambio informacion | `needs_tax_review`; intercambio informacion no reduce retencion. |
| BO | Bolivia | No | `needs_tax_review`; no convenio SII vigente. |
| BQ | Bonaire, Sint Eustatius and Saba | No | `needs_tax_review`; no asumir convenio Paises Bajos. |
| BR | Brasil | Si | candidato tecnico/asistencia tecnica Art. 12 `15%`; otros casos `needs_tax_review`. |
| VG | British Virgin Islands | No | `needs_tax_review`; revisar Art. 41 H/beneficiario. |
| CA | Canada | Si | Art. 14 natural en Chile cap `10%`; remote/no base fija requiere review; royalties `15%`. |
| KY | Cayman Islands | No | `needs_tax_review`; revisar Art. 41 H/beneficiario. |
| CL | Chile | N/A pagador/domestico | fuera del motor internacional; usar dependiente/honorarios Chile. |
| CO | Colombia | Si | candidato Art. 12 tecnico/asistencia/consultoria `10%`; Art. 14 natural solo base fija/183; requiere evidencia. |
| CR | Costa Rica | No | `needs_tax_review`. |
| CU | Cuba | No | `needs_tax_review`. |
| CW | Curacao | No | `needs_tax_review`; no asumir convenio Paises Bajos. |
| DM | Dominica | No | `needs_tax_review`. |
| DO | Dominican Republic | No | `needs_tax_review`. |
| EC | Ecuador | Si | royalties `10/15%`; servicios naturales solo base fija/183; tecnico no-royalty requiere review. |
| SV | El Salvador | No | `needs_tax_review`. |
| FK | Falkland Islands | No | `needs_tax_review`; residencia fiscal/evidencia especial. |
| GF | French Guiana | No DTA propio | `needs_tax_review`; no asumir Francia sin opinion legal. |
| GL | Greenland | No | `needs_tax_review`; no asumir Dinamarca sin opinion legal. |
| GD | Grenada | No | `needs_tax_review`. |
| GP | Guadeloupe | No DTA propio | `needs_tax_review`; no asumir Francia sin opinion legal. |
| GT | Guatemala | No | `needs_tax_review`. |
| GY | Guyana | No | `needs_tax_review`. |
| HT | Haiti | No | `needs_tax_review`. |
| HN | Honduras | No | `needs_tax_review`. |
| JM | Jamaica | No | `needs_tax_review`. |
| MQ | Martinique | No DTA propio | `needs_tax_review`; no asumir Francia sin opinion legal. |
| MX | Mexico | Si | Art. 14 natural en Chile cap `10%`; otros/remote/empresa requieren review; royalties segun Art. 12. |
| MS | Montserrat | No | `needs_tax_review`. |
| NI | Nicaragua | No | `needs_tax_review`; caso explicitamente requerido por TASK-905. |
| PA | Panama | No DTA general; transporte aereo si | `needs_tax_review`; transporte no aplica a payroll services. |
| PY | Paraguay | Si | Art. 14 natural solo base fija/183; royalties segun Art. 12; tecnico requiere review. |
| PE | Peru | Si | Art. 14 natural en Chile cap `10%`; royalties `15%`; otros casos requieren review/evidencia. |
| PR | Puerto Rico | No confirmar cobertura US | `needs_tax_review`; no asumir treaty US sin certificado/opinion legal. |
| BL | Saint Barthelemy | No DTA propio | `needs_tax_review`; no asumir Francia sin opinion legal. |
| KN | Saint Kitts and Nevis | No | `needs_tax_review`. |
| LC | Saint Lucia | No | `needs_tax_review`. |
| MF | Saint Martin | No DTA propio | `needs_tax_review`; no asumir Francia sin opinion legal. |
| PM | Saint Pierre and Miquelon | No DTA propio | `needs_tax_review`; no asumir Francia sin opinion legal. |
| VC | Saint Vincent and the Grenadines | No | `needs_tax_review`. |
| SX | Sint Maarten | No | `needs_tax_review`; no asumir Paises Bajos. |
| GS | South Georgia and South Sandwich Islands | No | `needs_tax_review`; residencia natural improbable, no excluir del coverage test. |
| SR | Suriname | No | `needs_tax_review`. |
| TT | Trinidad and Tobago | No | `needs_tax_review`. |
| TC | Turks and Caicos Islands | No | `needs_tax_review`. |
| US | United States of America | Si | Art. 14 natural solo base fija/183; royalties `2/10%`; servicios corrientes no son royalties automaticamente. |
| UY | Uruguay | Si | Art. 14bis tecnico/gerencial/consultoria `10%`; Art. 14 natural no tecnico base fija/183; evidencia obligatoria. |
| VI | U.S. Virgin Islands | No confirmar cobertura US | `needs_tax_review`; no asumir treaty US sin certificado/opinion legal. |
| VE | Venezuela | No DTA general; transporte aereo/maritimo si | `needs_tax_review`; transporte no aplica a payroll services. |

## Catalog shape recomendado

Cada regla debe declarar:

- `payer_country_code='CL'`
- `tax_residence_country_code`
- `service_category`
- `payee_type`
- `treaty_applicability`: `none`, `dta`, `transport_only`, `tiea_only`, `unknown_territory_coverage`
- `legal_basis`: `lir_art_59_2`, `lir_art_60`, `treaty_art_7`, `treaty_art_12`, `treaty_art_14`, `treaty_art_14bis`, `manual`
- `rate`
- `rate_basis`: `gross_amount`, `net_grossup`, `not_applicable`
- `requires_residence_certificate`
- `requires_no_pe_base_fixed_declaration`
- `requires_beneficial_owner_declaration`
- `requires_service_performed_location`
- `requires_chile_day_count_12m`
- `requires_article_41h_check`
- `evidence_ttl_policy`: default calendar year for residence certificate unless Legal defines stricter policy
- `source_url`, `source_reference`, `source_validated_at`, `approved_by_actor`, `approval_expires_at`

## Initial approved-rule candidates for Legal/Tax review

No marcar estas reglas como `approved_*` hasta que Tax/Legal las firme. Son candidatas tecnicas para acelerar la revision:

| Pais | Servicio | Payee | Candidato |
|---|---|---|---|
| Non-DTA Americas | `technical_service` / `professional_service` Art. 59 N°2 | natural/company | `15%`, o `20%` si Art. 41 H/riesgo preferencial. |
| BR | technical services / asistencia tecnica cubiertos por protocolo Art. 12 | natural/company segun facts | `15%` treaty cap. |
| CO | asistencia tecnica, servicios tecnicos, consultoria Art. 12 | natural/company | `10%` treaty cap. |
| UY | servicios gerenciales, tecnicos o consultoria Art. 14bis | natural/company | `10%` treaty cap. |
| CA/MX/PE | servicios personales independientes llevados a cabo en Chile | natural person | `10%` treaty cap, salvo base fija con tributacion neta/local. |
| US/CO/EC/PY/UY | servicios personales independientes sin base fija ni 183 dias en Chile | natural person | posible `0%` solo con certificado + no base fija + day-count + Legal signoff. |

## Bloqueadores antes de production cutover

- Definir si `international_internal` es pago por servicios independientes o relacion de empleo. Si hay subordinacion, no basta retener Impuesto Adicional.
- Definir source of truth para `service_category`.
- Definir si el engine cubre solo personas naturales o tambien entidades/invoices de empresa.
- Definir tratamiento de territorios con cobertura treaty ambigua: PR/VI/US, GF/GP/MQ/BL/MF/PM/FR, BQ/CW/SX/NL, GL/DK.
- Definir politica de gross-up y pago/registro de la obligacion retenida.
- Confirmar formularios operativos Finance: F50 mensual para Impuesto Adicional y DJ anual aplicable segun tipo de renta.
- Pedir opinion Tax/Legal escrita para cada regla `approved_*`.

## Decision para TASK-905 Slice 0

TASK-905 debe implementar primero el schema/resolver con fallback total Americas `needs_tax_review`, luego seedear reglas candidatas con `status='draft_tax_review'` o equivalente. El salto a `approved_with_withholding` / `approved_no_withholding` debe ser una mutacion auditada con actor, fuente, evidencia y fecha de expiracion.
