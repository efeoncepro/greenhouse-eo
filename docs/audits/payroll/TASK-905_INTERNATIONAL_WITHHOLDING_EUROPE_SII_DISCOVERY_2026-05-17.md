# TASK-905 International Withholding Europe — SII Discovery 2026-05-17

## Scope

Auditoria normativa para extender el aprendizaje de `TASK-905 — International Withholding Engine V1 (Americas)` a Europa.

Objetivo: congelar las casuisticas que el motor debe distinguir para un pagador `CL` cuando un colaborador `international_internal` residente fiscal en Europa recibe pagos directos desde Efeonce/Greenhouse.

Esto no es asesoria tributaria. Es input tecnico-operativo para disenar un motor fail-closed y para pedir validacion Tax/Legal antes de aprobar reglas productivas. TASK-905 V1 sigue siendo Americas; Europa debe quedar fuera del seed aprobado de esa task y resolver `needs_tax_review` hasta una task Europa.

## Fuentes oficiales revisadas

- SII, Convenios Tributarios Internacionales: `https://www.sii.cl/normativa_legislacion/convenios_internacionales.html`
- SII, Ley sobre Impuesto a la Renta vigente PDF: `https://www.sii.cl/normativa_legislacion/leyimpuestoalarenta.pdf`
- SII, Resolucion Exenta N°58 de 2021 sobre declaracion del beneficiario para aplicar convenios: `https://www.sii.cl/normativa_legislacion/resoluciones/2021/reso58.pdf`
- SII, Circular N°22 de 2018, aplicacion clausula nacion mas favorecida: `https://www.sii.cl/normativa_legislacion/circulares/2018/circu22.pdf`
- SII, Circular N°50 de 2018, aplicacion clausula nacion mas favorecida: `https://www.sii.cl/normativa_legislacion/circulares/2018/circu50.pdf`
- SII, Circular N°27 de 2019, aplicacion clausula nacion mas favorecida: `https://www.sii.cl/normativa_legislacion/circulares/2019/circu27.pdf`
- SII, Circular N°5 de 2020, aplicacion clausula nacion mas favorecida al convenio con Italia: `https://www.sii.cl/normativa_legislacion/circulares/2020/circu5.pdf`
- SII, Circular N°65 de 2025, aplicacion clausula nacion mas favorecida a Noruega, Suiza, Uruguay, Nueva Zelandia y Belgica: `https://www.sii.cl/normativa_legislacion/circulares/2025/circu65.pdf`
- SII, textos de convenios vigentes para Europa: Austria, Belgica, Croacia, Dinamarca, Espana, Francia, Irlanda, Italia, Noruega, Paises Bajos, Polonia, Portugal, Reino Unido, Republica Checa, Rusia, Suecia y Suiza, enlazados desde la pagina oficial de convenios SII.

## Decision de diseno recomendada

Europa confirma el mismo principio que Americas: el motor no puede ser `rateByCountry`.

Minimo debe resolver:

- `tax_residence_country_code`
- `payer_country='CL'`
- `payee_type`: `natural_person`, `company`, `partnership_or_entity`, `unknown`
- `service_category`: `technical_service`, `professional_service`, `consulting_service`, `management_service`, `software_standard_use`, `royalty_ip`, `equipment_royalty`, `creative_service`, `reimbursement`, `other`
- `service_performed_country_code` y presencia fisica en Chile
- dias Chile en ventana de 12 meses cuando el convenio use 183 dias, o seis meses cuando el convenio use ese umbral
- establecimiento permanente o base fija en Chile
- certificado de residencia fiscal y declaracion SII Resolucion 58
- beneficiario efectivo, partes relacionadas y posible Art. 41 H
- vigencia del convenio, MLI y circulares SII de nacion mas favorecida
- `tax_borne_by`: contractor vs Efeonce gross-up

Sin esos inputs, el estado correcto es `needs_tax_review` o `blocked_missing_evidence`, no tasa 0.

## Ley interna chilena — baseline sin convenio

El baseline es el mismo de Americas:

- pagos/remesas a no domiciliados/no residentes pueden caer en Impuesto Adicional;
- para trabajos de ingenieria/tecnicos y servicios profesionales/tecnicos, el caso central de TASK-905 es LIR Art. 59 N°2: candidato `15%`;
- sube a `20%` si el acreedor/beneficiario esta en circunstancias de regimen fiscal preferencial conforme al Art. 59 / Art. 41 H;
- otras rentas no deben colapsarse en el bucket tecnico: royalties/IP, software, servicios personales desarrollados en Chile, rentas Art. 60 y reembolsos requieren clasificacion separada.

Art. 74 N°4 obliga al pagador chileno a retener por rentas afectas a Impuesto Adicional de los articulos 58, 59 y 60 con la tasa que corresponda. Art. 79 exige declarar y pagar lo retenido hasta el dia 12 del mes siguiente al pago/remesa/abono/puesta a disposicion.

## Evidencia obligatoria antes de aplicar convenio

Para aplicar tasa reducida o no retencion por convenio, la Resolucion SII N°58/2021 exige que el beneficiario entregue declaracion al pagador. El motor debe bloquear si falta:

- certificado de residencia fiscal emitido por la autoridad competente del otro Estado;
- declaracion de que no tiene en Chile establecimiento permanente o base fija atribuible a la renta;
- declaracion de que cumple los requisitos para ser beneficiario del convenio respecto de esa renta;
- categoria de servicio, contrato/invoice y periodo;
- snapshot de vigencia de la evidencia;
- day-count/presencia Chile cuando aplique Art. 14 o service PE;
- beneficiario efectivo y revision de partes relacionadas cuando aplique.

Si la declaracion falta o no cumple, SII instruye aplicar las retenciones conforme a reglas generales LIR. Si SII verifica que el convenio fue mal aplicado, el pagador obligado a retener responde por la retencion omitida o retenida de menos.

## Convenios vigentes SII en Europa

Segun la pagina SII de convenios vigentes, Europa con convenio general de doble imposicion aplicable en Chile:

| Pais | ISO | Aplicacion Chile SII | Servicios / business profits | Regalias Art. 12 despues de circulares SII | Notas para motor |
|---|---:|---:|---|---|---|
| Austria | AT | 2016-01-01 | Art. 7 business profits si no PE; Art. 14 para persona natural independiente con base fija o 183 dias. | `2%` equipos industriales/comerciales/cientificos; `10%` otros, por Circular 50/2018. | Requiere revisar MLI/PPT y acuerdo mutuo listado por SII. |
| Belgica | BE | 2011-01-01 | Art. 7 business profits si no PE; Art. 14 natural con base fija o 183 dias. | `2%` equipos; `10%` otros, por Circular 65/2025. | No usar tasa vieja `5/10` del PDF base sin circular. |
| Croacia | HR | 2005-01-01 | Art. 7 business profits si no PE; Art. 14 natural con base fija o 183 dias. | `5%` equipos; `10%` otros. | No se identifico circular SII de rebaja para regalias en la fila oficial. |
| Dinamarca | DK | 2005-01-01 | Art. 7 business profits si no PE; Art. 14 natural con base fija o 183 dias. | `2%` equipos; `10%` otros, por Circular 22/2018. | No asumir cobertura de Groenlandia o Islas Feroe. |
| Espana | ES | 2004-01-01 | Art. 7 business profits y service PE; el Art. 14 del convenio es rentas del trabajo dependiente, no independientes. | `2%` equipos; `10%` otros, por Circular 50/2018. | Caso esperado Daniela/Espana: fuera de TASK-905 V1 Americas; resolver `needs_tax_review` hasta task Europa. |
| Francia | FR | 2007-01-01 | Art. 7 business profits y service PE; el Art. 14 es servicios personales dependientes. | `2%` equipos; `10%` otros, por Circular 27/2019. | No asumir automatico para territorios franceses no metropolitanos sin opinion legal. |
| Irlanda | IE | 2009-01-01 | Art. 7 business profits y service PE; el Art. 14 es rentas de empleo. | `2%` equipos; `10%` otros, por Circular 22/2018. | Independientes/empresas requieren analisis Art. 7/PE, no Art. 14 natural. |
| Italia | IT | 2017-01-01 | Art. 7 business profits si no PE; Art. 14 natural con base fija o 183 dias. | `2%` equipos; `10%` otros, por Circular 5/2020. | Circular 5 fija aplicacion desde 2017 para regalias de equipo y desde 2019 para interes general. |
| Noruega | NO | 2004-01-01 | Art. 7 business profits; service PE por servicios/consultorias sobre seis meses; Art. 14 natural con base fija o 183 dias. | `2%` equipos; `10%` otros, por Circular 65/2025. | No usar tasa vieja `5/15`; no asumir Svalbard/Jan Mayen. |
| Paises Bajos | NL | 2023-01-01 | Art. 7 business profits si no PE; Art. 14 natural con base fija o 183 dias. | `2%` equipos; `10%` otros en el tratado vigente. | No asumir Caribe neerlandes ni territorios fuera de NL europeo. |
| Polonia | PL | 2004-01-01 | Art. 7 business profits; service PE por servicios/consultorias sobre seis meses; Art. 14 natural con base fija o 183 dias. | `2%` equipos; `10%` otros, por Circular 22/2018. | PDF base muestra `5/15`; usar circular vigente. |
| Portugal | PT | 2009-01-01 | Art. 7 business profits si no PE; Art. 14 natural con base fija o 183 dias. | `5%` equipos; `10%` otros. | No se identifico circular SII de rebaja para regalias en la fila oficial. |
| Reino Unido | GB | 2005-01-01 | Art. 7 business profits y service PE; el Art. 14 es rentas de empleo. | `2%` equipos; `10%` otros, por Circular 22/2018. | No asumir Guernsey, Jersey, Isla de Man, Gibraltar ni territorios britanicos. |
| Republica Checa | CZ | 2017-01-01 | Art. 7 business profits si no PE; Art. 14 natural con base fija o 183 dias. | `2%` equipos; `10%` otros, por Circular 22/2018. | Requiere evidencia de servicio y residencia. |
| Rusia | RU | 2013-01-01 | Art. 7 business profits si no PE; Art. 14 natural con base fija o 183 dias. | `5%` equipos; `10%` otros. | Agregar revision legal/compliance operacional antes de pagos por sanciones, bancos, moneda y contraparte. |
| Suecia | SE | 2006-01-01 | Art. 7 business profits si no PE; Art. 14 natural con base fija o 183 dias. | `2%` equipos; `10%` otros, por Circular 27/2019. | No asumir tasa vieja `5/10` del PDF base para equipos. |
| Suiza | CH | 2011-01-01 | Art. 7 business profits si no PE; Art. 14 natural con base fija o 183 dias. | `2%` equipos; `10%` otros, por Circular 65/2025. | SII lista acuerdo mutuo 2018 y Circular 65/2025. |

## MLI y anti-abuso

SII indica que el MLI entro en vigor para Chile el 2021-03-01 y que su entrada en efecto es parcelada segun la ratificacion de cada contraparte. En la pagina SII existen textos sintetizados MLI para varios convenios europeos, incluyendo Austria, Belgica, Croacia, Dinamarca, Espana, Francia, Irlanda, Noruega, Polonia, Portugal, Reino Unido, Republica Checa y Rusia.

Para el motor:

- guardar `mli_applicability_snapshot` o equivalente en la regla/fuente;
- no tratar el MLI como una tasa por si mismo;
- bloquear beneficios si falta validacion de proposito principal/anti-abuso cuando Tax/Legal lo exija;
- no aprobar treaty shopping, back-to-back, conduit o beneficiario efectivo dudoso.

## Casuisticas que debe resolver el motor para Europa

| Caso | Inputs obligatorios | Tratamiento recomendado |
|---|---|---|
| Pais europeo sin convenio, servicio profesional/tecnico Art. 59 N°2 | residencia fiscal, contrato/invoice, categoria de servicio, beneficiario no residente, Art. 41 H check | `approved_with_withholding` candidato `15%`; `20%` si Art. 41 H/riesgo preferencial. Requiere aprobacion Tax/Legal antes de production seed. |
| Pais europeo sin convenio, servicio no tecnico/no profesional | servicio, fuente, lugar de prestacion, contrato, legal basis | `needs_tax_review`; posible Art. 60 `35%` si renta fuente Chile o no encaja en Art. 59. |
| Pais con convenio, empresa/entidad prestadora de servicios remotos | certificado residencia, declaracion no PE, beneficiario efectivo, service PE/day count, contrato | candidato Art. 7 `approved_no_withholding` solo si Tax/Legal aprueba que no hay PE/service PE ni articulo especifico de fuente. Sin evidencia: `blocked_missing_evidence`. |
| Pais con convenio, persona natural independiente con Art. 14 independiente | certificado residencia, base fija, dias Chile 12m, lugar de prestacion | si no hay base fija/183 dias o seis meses segun convenio: candidato no retencion; si hay presencia/base fija, Chile puede gravar la porcion atribuible. Requiere Legal signoff. |
| Espana/Francia/Irlanda/Reino Unido persona natural contractor | certificado residencia, contrato, si hay empleo/subordinacion, PE/service PE, articulo aplicable | no mapear a Art. 14 independiente porque esos convenios usan Art. 14 para empleo/dependientes. Revisar Art. 7/PE y clasificacion laboral. |
| Servicios tecnicos/consultoria prestados por empresa y service PE | dias/meses de actividades en Chile, personas asignadas, contratos relacionados, pais | varios convenios crean PE por servicios/consultorias si superan umbral; si se configura, no aplicar pago bruto. |
| Royalty/software/equipo | contrato IP/software/equipo, derechos transferidos, beneficiario efectivo | usar Art. 12 solo si realmente es royalty/equipment royalty. No reclasificar servicios de colaborador como royalty para buscar tasa menor. |
| Software estandar de uso normal | contrato/licencia, derechos limitados a uso, sin explotacion/reproduccion/modificacion | puede no ser Impuesto Adicional bajo LIR, pero no es payroll personal por defecto; `needs_tax_review`. |
| Reembolso puro | mandato/soporte, no margen, tercero, evidencia | `needs_tax_review`; no asumir fuera de renta sin facts. |
| Crown dependencies / territorios / paises autonomos | certificado autoridad competente, texto treaty territorial, opinion legal | `needs_tax_review`; no heredar automaticamente GB, DK, FR, NL, NO o FI. |
| Doble residencia o certificado ambiguo | certificados, tie-breaker treaty, tax ID, domicilio fiscal | `needs_tax_review`; bloquear pago si determina treaty benefit. |
| Related party / beneficiario efectivo dudoso | ownership, flow of funds, back-to-back, conduit, Art. 41 H | `needs_tax_review`; nunca tasa 0 automatica. |
| Gross-up | `tax_borne_by='efeonce'`, aprobacion Finance, legal basis | no descontar al neto sin modelar costo adicional; si no hay policy, `blocked_missing_evidence`. |
| Contrato parece empleo/subordinacion | horario, jefatura, exclusividad, continuidad, dependencia economica, pais donde trabaja | `needs_legal_classification_review`; no resolver solo como withholding. |

## Matriz Europa para seed futuro

Recomendacion: una task Europa debe seedear todos estos paises/territorios con fallback `needs_tax_review`. Solo promover a `approved_*` despues de aprobacion Tax/Legal de la combinacion pais + servicio + payeeType + evidencia.

| ISO | Jurisdiccion | Convenio SII general DTA | Seed recomendado |
|---:|---|---|---|
| AD | Andorra | No | `needs_tax_review`; posible LIR Art. 59 si servicio tecnico/profesional aprobado. |
| AL | Albania | No | `needs_tax_review`. |
| AM | Armenia | No | `needs_tax_review`; edge EMEA/transcontinental. |
| AT | Austria | Si | `needs_tax_review`; candidatos Art. 7/14 sin PE/base fija, Art. 12 `2/10%` solo si royalty real. |
| AX | Aland Islands | No DTA propio | `needs_tax_review`; no asumir Finlandia. |
| AZ | Azerbaijan | No | `needs_tax_review`; edge EMEA/transcontinental. |
| BA | Bosnia and Herzegovina | No | `needs_tax_review`. |
| BE | Belgica | Si | `needs_tax_review`; Art. 12 `2/10%` por Circular 65/2025 si royalty real. |
| BG | Bulgaria | No | `needs_tax_review`. |
| BY | Belarus | No | `needs_tax_review`; agregar compliance/sanciones si aplica. |
| CH | Suiza | Si | `needs_tax_review`; Art. 12 `2/10%` por Circular 65/2025 si royalty real. |
| CY | Cyprus | No | `needs_tax_review`; revisar Art. 41 H/beneficiario. |
| CZ | Republica Checa | Si | `needs_tax_review`; Art. 12 `2/10%` por Circular 22/2018 si royalty real. |
| DE | Alemania | No DTA general; transporte maritimo/aereo si | `needs_tax_review`; transporte no aplica a payroll services. |
| DK | Dinamarca | Si | `needs_tax_review`; no asumir Groenlandia/Islas Feroe. Art. 12 `2/10%` si royalty real. |
| EE | Estonia | No | `needs_tax_review`. |
| ES | Espana | Si | `needs_tax_review`; fuera TASK-905 V1. Art. 14 es empleo, no independiente; Art. 12 `2/10%` si royalty real. |
| FI | Finlandia | No | `needs_tax_review`. |
| FO | Faroe Islands | No DTA propio | `needs_tax_review`; no asumir Dinamarca. |
| FR | Francia | Si | `needs_tax_review`; Art. 14 es dependiente; Art. 12 `2/10%` si royalty real. |
| GB | United Kingdom | Si | `needs_tax_review`; no asumir Crown dependencies/territorios. Art. 14 es empleo; Art. 12 `2/10%` si royalty real. |
| GE | Georgia | No | `needs_tax_review`; edge EMEA/transcontinental. |
| GG | Guernsey | No DTA; intercambio informacion si | `needs_tax_review`; TIEA no reduce retencion. |
| GI | Gibraltar | No | `needs_tax_review`; no asumir Reino Unido. |
| GR | Greece | No | `needs_tax_review`. |
| HR | Croacia | Si | `needs_tax_review`; Art. 12 `5/10%` si royalty real. |
| HU | Hungary | No | `needs_tax_review`. |
| IE | Irlanda | Si | `needs_tax_review`; Art. 14 es empleo; Art. 12 `2/10%` si royalty real. |
| IM | Isle of Man | No DTA propio | `needs_tax_review`; no asumir Reino Unido. |
| IS | Iceland | No | `needs_tax_review`. |
| IT | Italia | Si | `needs_tax_review`; Art. 12 `2/10%` por Circular 5/2020 si royalty real. |
| JE | Jersey | No DTA; intercambio informacion si | `needs_tax_review`; TIEA no reduce retencion. |
| KZ | Kazakhstan | No | `needs_tax_review`; edge transcontinental. |
| LI | Liechtenstein | No | `needs_tax_review`; revisar Art. 41 H/beneficiario. |
| LT | Lithuania | No | `needs_tax_review`. |
| LU | Luxembourg | No | `needs_tax_review`; revisar Art. 41 H/beneficiario. |
| LV | Latvia | No | `needs_tax_review`. |
| MC | Monaco | No | `needs_tax_review`; revisar Art. 41 H/beneficiario. |
| MD | Moldova | No | `needs_tax_review`. |
| ME | Montenegro | No | `needs_tax_review`. |
| MK | North Macedonia | No | `needs_tax_review`. |
| MT | Malta | No | `needs_tax_review`; revisar Art. 41 H/beneficiario. |
| NL | Paises Bajos | Si | `needs_tax_review`; solo NL cubierto por certificado/territorio aplicable. Art. 12 `2/10%` si royalty real. |
| NO | Noruega | Si | `needs_tax_review`; Art. 12 `2/10%` por Circular 65/2025 si royalty real; no asumir Svalbard/Jan Mayen. |
| PL | Polonia | Si | `needs_tax_review`; service PE por seis meses; Art. 12 `2/10%` si royalty real. |
| PT | Portugal | Si | `needs_tax_review`; Art. 12 `5/10%` si royalty real. |
| RO | Romania | No | `needs_tax_review`. |
| RS | Serbia | No | `needs_tax_review`. |
| RU | Russia | Si | `needs_tax_review`; Art. 12 `5/10%` si royalty real; agregar compliance/sanciones/banca. |
| SE | Suecia | Si | `needs_tax_review`; Art. 12 `2/10%` por Circular 27/2019 si royalty real. |
| SI | Slovenia | No | `needs_tax_review`. |
| SJ | Svalbard and Jan Mayen | No DTA propio | `needs_tax_review`; no asumir Noruega. |
| SK | Slovakia | No | `needs_tax_review`. |
| SM | San Marino | No | `needs_tax_review`. |
| TR | Turkiye | No | `needs_tax_review`; edge transcontinental. |
| UA | Ukraine | No | `needs_tax_review`. |
| VA | Vatican City | No | `needs_tax_review`. |
| XK | Kosovo | No | `needs_tax_review`; no ISO oficial, pero puede aparecer en vendor data. |
| EU | European Union | No es residencia fiscal | `blocked_invalid_tax_residency`; exigir pais/jurisdiccion fiscal especifica. |

## Catalog shape recomendado para Europa

Cada regla debe declarar, como minimo:

- `payer_country_code='CL'`
- `tax_residence_country_code`
- `service_category`
- `payee_type`
- `treaty_applicability`: `none`, `dta`, `transport_only`, `tiea_only`, `unknown_territory_coverage`
- `legal_basis`: `lir_art_59_2`, `lir_art_60`, `treaty_art_7`, `treaty_art_12`, `treaty_art_14`, `treaty_art_15_or_employment`, `manual`
- `rate`
- `rate_basis`: `gross_amount`, `net_grossup`, `not_applicable`
- `requires_residence_certificate`
- `requires_no_pe_base_fixed_declaration`
- `requires_beneficial_owner_declaration`
- `requires_service_performed_location`
- `requires_chile_day_count_12m_or_6m`
- `requires_article_41h_check`
- `requires_mli_ppt_check`
- `requires_territorial_coverage_check`
- `source_url`, `source_reference`, `source_validated_at`, `approved_by_actor`, `approval_expires_at`

## Initial approved-rule candidates for Legal/Tax review

No marcar estas reglas como `approved_*` hasta que Tax/Legal las firme. Son candidatas tecnicas para acelerar la revision:

| Pais/grupo | Servicio | Payee | Candidato |
|---|---|---|---|
| Europa sin DTA | `technical_service` / `professional_service` Art. 59 N°2 | natural/company | `15%`, o `20%` si Art. 41 H/riesgo preferencial. |
| AT/BE/DK/FR/IE/IT/NL/NO/PL/GB/CZ/SE/CH/ES | royalty/equipment royalty real | natural/company segun facts | Art. 12 `2%` equipos, `10%` otros; evidencia y beneficiario efectivo obligatorios. |
| HR/PT/RU | royalty/equipment royalty real | natural/company segun facts | Art. 12 `5%` equipos, `10%` otros; evidencia y beneficiario efectivo obligatorios. |
| DTA Europa con Art. 14 independiente | servicios personales independientes de persona natural | natural person | posible `0%` si no base fija ni 183 dias/seis meses y servicio no cae en otro articulo; Legal signoff obligatorio. |
| ES/FR/IE/GB | contractor natural o empresa | natural/company | `needs_tax_review`; no usar Art. 14 independiente, revisar Art. 7/PE/service PE y clasificacion laboral. |

## Bloqueadores antes de production cutover Europa

- Definir si el colaborador europeo es persona natural independiente, empresa, empleado o relacion laboral encubierta.
- Definir source of truth de `service_category`.
- Definir day-count y service PE, incluyendo umbrales de 183 dias vs seis meses.
- Definir tratamiento de Espana/Daniela como primera regla Europa o mantener bloqueo manual.
- Definir territorial coverage para GB, DK, FR, NL, NO, FI y dependencias/territorios.
- Incorporar circulares MFN como fuentes versionadas; no seedear tasas historicas del PDF base cuando SII instruyo rebajas.
- Incorporar snapshot MLI/PPT y anti-abuso para paises con texto sintetizado SII.
- Confirmar formularios operativos Finance: F50 mensual para Impuesto Adicional y DJ anual aplicable segun tipo de renta.
