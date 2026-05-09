# Arquitectura Bow-tie Efeonce

**Lifecycle dual asimétrico · contactos y empresas + Sistema de medición de expansión y renovación**

- HubSpot Portal: `48713323`
- Versión: `1.1`
- Fecha: Abril 2026
- Tipo: Documento canónico de arquitectura comercial
- Propietario: Efeonce Group SpA · Chile, Colombia, México, Perú

---

## Changelog

### v1.1 · Abril 2026
**Corrección estructural: arquitectura dual asimétrica para contactos y empresas.**

- Contactos tienen lifecycle de 7 stages (acaba en Customer genérico) porque la segmentación post-venta por tipo de cliente es atributo de la empresa, no de la persona.
- Empresas tienen lifecycle completo de 12 stages con diferenciación Active Account / Self-Serve Customer / Project Customer.
- Properties motion transversales viven primariamente en empresas (`is_in_expansion`, `is_in_renewal`, `is_at_risk`, `is_advocate`) con un equivalente específico a nivel contacto (`is_advocate_individual`) para advocacy personal distinto de empresa.
- Nueva sección 6 documenta el sync bidireccional Contact ↔ Company con reglas asimétricas.

### v1.0 · Abril 2026
- Arquitectura inicial del Bow-tie Efeonce con 12 Lifecycle Stages uniformes y 4 properties motion transversales.
- Sistema de medición con NRR como métrica reina y 5 métricas de soporte.
- 3 dashboards operativos: Revenue Health, Expansion Engine, At Risk Accounts.

---

## 1. Propósito de este documento

Este documento es la fuente de verdad canónica de la arquitectura Bow-tie Efeonce: el sistema de Lifecycle Stages, las properties transversales de motion comercial, y las mediciones de expansión y renovación que operan en el portal HubSpot de Efeonce Group.

El diseño adapta el bow-tie canónico de Winning by Design al modelo de negocio híbrido de Efeonce (ASaaS + agencia + 3 SaaS), con cuatro contribuciones arquitectónicas:

1. La fase Adoption se descompone en tres estados estables diferenciados por tipo de cliente: Active Account (enterprise), Self-Serve Customer (PLG) y Project Customer (transaccional).
2. El motion comercial activo (expansión, renovación, riesgo) se modela como properties transversales, no como stages, para preservar siempre la identidad del tipo de cliente.
3. La arquitectura del lifecycle es dual asimétrica: contactos usan 7 stages (acaba en Customer genérico), empresas usan 12 stages (con segmentación post-venta completa).
4. La integración con Greenhouse vía objetos SOW y MSA provee la fuente de verdad contractual que alimenta automáticamente los workflows de transición.

Cuando cualquier otro documento del ecosistema Efeonce haga referencia a stages de lifecycle, clasificación de clientes, métricas de retención o expansión, este documento es la referencia autoritativa.

### 1.1 Qué problema resuelve

La radiografía del portal HubSpot de marzo 2026 reveló tres problemas críticos de arquitectura:

1. El Lifecycle default de HubSpot no refleja el modelo de negocio híbrido. La distribución actual (95,1% Lead en contactos, 68,6% SQL en empresas, 0,7% Customer en contactos) muestra un CRM donde el post-venta es invisible y la relación contactos-empresas está inconsistente.
2. No existe mecanismo para distinguir clientes enterprise de clientes self-service ni de clientes transaccionales. Todos aparecen como Customer genérico.
3. No hay medición de NRR, GRR, Expansion Rate ni otras métricas críticas de un modelo ASaaS. El revenue retention se gestiona de memoria.

### 1.2 Principio rector

> El Lifecycle Stage responde: ¿qué tipo de relación tenemos con este contacto o empresa? No responde qué producto compró ni qué motion está ocurriendo. El motion comercial activo vive como property transversal para que el tipo de cliente nunca se pierda de vista. Y dado que en B2B el contrato es con la empresa — no con la persona — la segmentación post-venta vive en el objeto Company, no en Contact.

Con esta óptica, Sky Airlines como empresa es Active Account aunque esté simultáneamente en expansión, renovación y riesgo. Los contactos dentro de Sky son simplemente Customer — no son Active Account ni Self-Serve Customer porque esos atributos son de la cuenta, no de la persona.

---

## 2. El Bow-tie Efeonce

El bow-tie canónico de Winning by Design tiene 7 etapas simétricas: Awareness, Education, Selection, Commit, Onboarding, Adoption, Expansion. Fue diseñado para modelos SaaS puros con un solo tipo de cliente.

Efeonce Group opera un ecosistema híbrido con tres motions distintos (enterprise con MSA, PLG con SaaS, transaccional con SOW puntual) y cuatro productos interrelacionados (servicio de agencia, Kortex, Verk, Greenhouse). El Bow-tie Efeonce adapta el marco preservando su lógica pero ajustándolo a la realidad operativa.

### 2.1 Mapeo del bow-tie canónico al Bow-tie Efeonce

| Bow-tie canónico | Bow-tie Efeonce (empresa) | Justificación |
|---|---|---|
| Awareness | Stage 1 · Subscriber | Equivalencia directa |
| Education | Stages 2-3 · Lead + MQL | Dos stages porque MQL tiene criterios operativos propios |
| Selection | Stages 4-6 · PQL + SQL + Opportunity | PQL paralelo porque el PLG de Kortex/Verk es motor propio |
| Commit + Onboarding | Stage 7 · Onboarding | Fusionados: 0-90 días post firma |
| Adoption | Stages 8-10 · Active / Self-Serve / Project | Decomposición en 3 tipos por diferencia en motion, owner y métricas |
| Expansion | Property `is_in_expansion` | Property transversal que preserva el tipo de cliente |
| (sin equivalente) | Property `is_in_renewal` | Efeonce maneja MSA anual + SOWs. Renovación es motion distinto |
| (sin equivalente) | Stage 11 · Former Customer | ASaaS requiere stage terminal honesto con ruta de win-back |

> El bow-tie canónico es template, no dogma. Adaptarlo con propósito es más valioso que aplicarlo literalmente — es lo que distingue una operación industrializada de una operación genérica.

---

## 3. Arquitectura dual asimétrica

Una decisión arquitectónica central: los Lifecycle Stages NO son idénticos en contactos y empresas. Esta asimetría refleja la realidad del B2B — el contrato es con la empresa, las personas son quienes actúan dentro de la empresa.

### 3.1 Por qué asimétrica y no simétrica

HubSpot técnicamente permite configurar los mismos stages custom en contactos y empresas. Sin embargo, aplicar la misma arquitectura en ambos niveles introduce errores conceptuales:

- **Active Account / Self-Serve / Project Customer son atributos de la cuenta, no de la persona.** Sky Airlines como empresa es Active Account. Arturo Labbé como contacto dentro de Sky no es Active Account — es una persona cuyo empleador es cliente enterprise.
- **Former Customer en contacto es ambiguo.** Si una persona cambia de empresa, ¿se vuelve Former Customer? ¿Y si en la nueva empresa es un prospect activo? La answer correcta es separar: la empresa puede ser Former Customer; el contacto solo cambia de empresa asociada.
- **Onboarding aplica a la empresa.** La empresa está en Onboarding durante los primeros 90 días post firma. Los contactos asociados no están en Onboarding — están en Customer.
- **Mantener 12 stages en contactos crea stages zombi.** Nadie va a filtrar contactos por 'Project Customer' porque la información real vive en la empresa. Los stages vacíos confunden al equipo y ensucian reports.

### 3.2 Resumen de la arquitectura dual

| Aspecto | Contactos (persona) | Empresas (cuenta) |
|---|---|---|
| Total de stages | 7 stages + Other | 12 stages + Other |
| Stage terminal de cliente | Customer (genérico, sin segmentación) | Active / Self-Serve / Project (segmentado) |
| Stage Onboarding | No existe — va directo a Customer | Sí existe (stage 7, 0-90 días) |
| Stage Former Customer | Opcional vía workflow (no automático) | Sí existe (stage 11) |
| Properties motion | Solo `is_advocate_individual` | `is_in_expansion`, `is_in_renewal`, `is_at_risk`, `is_advocate` |
| Properties contractuales | No aplican | 13 properties (`msa_end_date`, `total_mrr`, etc.) |
| Dirección del sync | Forward al subir en pre-venta | Recibe sync de contactos + opera independiente en post-venta |

---

## 4. Lifecycle de contactos (7 stages)

El contacto representa a una persona. Su lifecycle sigue el funnel de adquisición lineal hasta que se vuelve parte de una cuenta cliente, momento en el cual se queda como Customer genérico sin segmentación adicional.

### 4.1 Los 7 stages de contactos

| # | Stage | Internal name | Cuándo aplica | Responsable |
|---|---|---|---|---|
| 1 | Subscriber | `subscriber` | Persona con opt-in a contenido. Sin interacción activa. | Valentina / Automated |
| 2 | Lead | `lead` | Persona con interacción activa: formulario, descarga, solicitud. | Valentina / Luis Reyes |
| 3 | MQL | `marketingqualifiedlead` | Lead con los 3 criterios: research + AEO + ICP fit ≥ 3/5. | Luis Reyes (BDR) |
| 4 | PQL | `pql` (custom) | Persona con trial activo en Kortex o Verk. | Luis Reyes / Automated |
| 5 | SQL | `salesqualifiedlead` | MQL que pasó scorecard 4+/6 del BDR Playbook. | Luis Reyes / Julio |
| 6 | Opportunity | `opportunity` | Persona asociada a deal abierto en pipeline New Business. | Julio / AE |
| 7 | Customer | `customer` | Persona asociada a empresa que es cliente (cualquier modalidad). | Automated |
| — | Other | `other` | Partners, vendors, empleados, aliados. | No asignado |

### 4.2 Qué NO tiene el lifecycle de contactos

Intencionalmente, contactos NO tienen:

- Stage Onboarding — no aplica conceptualmente a una persona
- Distinción Active Account / Self-Serve / Project — esos son atributos de la empresa
- Stage Former Customer automático — cuando un cliente cancela, la empresa baja a Former Customer pero los contactos permanecen en Customer histórico
- Properties contractuales (`msa_end_date`, `total_mrr`, etc.) — son atributos de la cuenta
- Properties `is_in_expansion`, `is_in_renewal`, `is_at_risk` — motion es de la empresa

### 4.3 Property única de contactos: `is_advocate_individual`

Los contactos tienen una property transversal propia que distingue advocacy personal de advocacy de la empresa:

| Label | Internal name | Tipo | Trigger |
|---|---|---|---|
| Advocate Individual | `is_advocate_individual` | Boolean + criteria | Persona que da referidos directos, es speaker personal, o actúa como amplificador independiente de su empresa |

Esta property captura escenarios reales: un ejecutivo que recomienda Efeonce en su círculo profesional, alguien que habla en eventos representando la solución, un referido personal que se convierte en deal calificado. Es distinto (y puede coexistir con) `is_advocate` a nivel empresa.

---

## 5. Lifecycle de empresas (12 stages)

La empresa representa la cuenta — entidad contractual con la que Efeonce mantiene la relación comercial. El lifecycle completo de 12 stages vive aquí, incluyendo segmentación post-venta por tipo de cliente, oscilación entre tipos, y properties contractuales sincronizadas con Greenhouse.

### 5.1 Los 12 stages de empresas

| # | Stage | Internal name | Cuándo aplica | Owner |
|---|---|---|---|---|
| 1 | Subscriber | `subscriber` | Empresa con al menos un contacto Subscriber asociado. | Automated |
| 2 | Lead | `lead` | Empresa con al menos un contacto Lead asociado. | Automated |
| 3 | MQL | `marketingqualifiedlead` | Empresa donde al menos un contacto es MQL. | Luis Reyes |
| 4 | PQL | `pql` (custom) | Empresa con trial activo en Kortex o Verk. | Automated |
| 5 | SQL | `salesqualifiedlead` | Empresa donde el contacto decisor pasó scorecard 4+/6. | Luis Reyes / Julio |
| 6 | Opportunity | `opportunity` | Empresa con deal abierto en pipeline New Business. | Julio / AE |
| 7 | Onboarding | `onboarding` (custom) | 0-90 días post Closed-Won. Kickoff, primer entregable, first impact. | Account Lead + Greenhouse |
| 8 | Active Account | `active_account` (custom) | Cliente enterprise con MSA activo + SOWs operativos. Sky, ANAM, Grupo Aguas. | Julio |
| 9 | Self-Serve Customer | `self_serve_customer` (custom) | Cliente que paga solo suscripción SaaS sin MSA de servicio. | Automated / CSM futuro |
| 10 | Project Customer | `project_customer` (custom) | Cliente con SOW puntual sin MSA recurrente. | PM + Julio |
| 11 | Former Customer | `former_customer` (custom) | Sin revenue activo. Churn voluntario, involuntario o no-renovación. | Julio (win-back) |
| 12 | Other | `other` | Partners, vendors, empleados, aliados. | No asignado |

### 5.2 Criterios operativos detallados

#### Stage 3 · MQL — definición operativa

Una empresa llega a MQL cuando al menos un contacto asociado cumple los 3 criterios:

1. `research_status = Completo` (del BDR Playbook). Confirma que Luis completó investigación mínima: sitio web, LinkedIn del decisor, señales de ICP.
2. `aeo_check_result` registrado (no puede ser "No verificado"). Confirma que se validó presencia del prospect en motores de IA.
3. `icp_fit_score ≥ 3 de 5`. Score basado en industria, tamaño, geografía, indicadores de necesidad.

Esta definición hace MQL operativa desde hoy, sin depender de volumen de inbound. MQL queda posicionado como "lead investigado y calificado pero aún no contactado activamente".

#### Stage 5 · SQL — scorecard 4+/6

Una empresa llega a SQL cuando el contacto decisor pasa el scorecard del BDR Playbook con 4 o más criterios cumplidos de los 6 posibles: presupuesto estimado, urgencia, decisor identificado, ajuste de timing, capability match, riesgo comercial aceptable.

#### Stages 8-10 · Clasificación post-Onboarding

La transición desde Onboarding (stage 7) hacia Active / Self-Serve / Project se determina automáticamente por workflow basado en el `deal_type` del primer Closed-Won:

| Deal Type del primer Closed-Won | Stage resultante post-Onboarding |
|---|---|
| MSA + SOW en New Business | Stage 8 · Active Account |
| Kortex subscription o Verk subscription | Stage 9 · Self-Serve Customer |
| Single SOW sin MSA | Stage 10 · Project Customer |

### 5.3 Oscilación entre stages 8-10

A diferencia de los stages 1-7 (forward-only), los stages 8, 9 y 10 admiten oscilación bidireccional según evolución contractual. Un cliente puede moverse entre estos tres estados a lo largo del tiempo sin que esto signifique regresión ni churn.

| Trigger contractual | Transición de stage |
|---|---|
| Self-Serve firma primer MSA + SOW de servicio | → Active Account |
| Active Account cancela MSA pero mantiene suscripción SaaS activa | → Self-Serve Customer |
| Active Account cancela MSA pero mantiene SOW puntual sin MSA | → Project Customer |
| Project Customer firma MSA + nuevos SOWs | → Active Account |
| Project Customer mantiene suscripción SaaS al terminar SOW | → Self-Serve Customer |
| Todas las fuentes de revenue se cierran | → Former Customer |
| Former Customer vuelve a firmar cualquier fuente de revenue | → Onboarding (luego reclasificación) |

#### Dependencia técnica crítica

HubSpot por default solo mueve Lifecycle Stages hacia adelante. Para que la oscilación funcione se requieren **workflows de clear-and-reset** que borren el valor previo antes de establecer el nuevo. Se activan por triggers provenientes de:

- Sync Greenhouse → HubSpot de estado contractual (MSA activo, SOWs activos, suscripciones SaaS)
- Cambios en properties de Company: `active_msa_id`, `active_sows_count`, `saas_subscriptions`
- Cierre de deals (Won o Lost) en pipelines New Business, Expansion o Renewal

---

## 6. Sync bidireccional Contact ↔ Company

El sync entre Contact y Company opera con reglas asimétricas que reflejan la arquitectura dual: en pre-venta el sync es forward-only desde contacto hacia empresa, en post-venta el stage de empresa opera independientemente y se refleja en contactos solo como "Customer" genérico.

### 6.1 Sync pre-venta (stages 1-6)

En la zona de adquisición, el contacto es el agente principal — es la persona quien llena formularios, abre emails, agenda reuniones. La empresa hereda el stage más avanzado de sus contactos asociados.

| Trigger en contacto | Acción en empresa asociada |
|---|---|
| Contacto sube a MQL | Empresa sube a MQL si no está ya en stage superior |
| Contacto sube a PQL | Empresa sube a PQL si no está ya en Opportunity o superior |
| Contacto sube a SQL | Empresa sube a SQL si no está ya en Opportunity o superior |
| Contacto sube a Opportunity | Empresa sube a Opportunity |

**Regla clave:** forward-only. Si un contacto baja de SQL a MQL, la empresa no regresa. La empresa toma el stage del contacto más avanzado, no el último actualizado.

### 6.2 Sync en el nudo (Opportunity → Customer)

| Trigger | Acción dual |
|---|---|
| Deal de empresa Closed-Won en pipeline New Business | Empresa → Onboarding · Contactos asociados → Customer |

Aquí ocurre la asimetría por primera vez. La empresa entra a Onboarding (stage 7) que durará 0-90 días. Los contactos asociados saltan directo a Customer (stage 7 de contacto, terminal). Los contactos no tienen Onboarding.

### 6.3 Sync post-venta (stages 8-11 de empresa)

Los stages 8-11 de empresa NO se reflejan en contactos. Los contactos permanecen como Customer genérico mientras la empresa sea cliente en cualquier modalidad.

| Stage empresa | Stage contactos asociados | Comportamiento |
|---|---|---|
| Onboarding (7) | Customer (7) | Contactos no reflejan Onboarding |
| Active Account (8) | Customer (7) | Tipo de cliente no se propaga a contactos |
| Self-Serve Customer (9) | Customer (7) | Tipo de cliente no se propaga a contactos |
| Project Customer (10) | Customer (7) | Tipo de cliente no se propaga a contactos |
| Former Customer (11) | Customer (7) — decisión pragmática | Contactos permanecen como Customer histórico |

#### Decisión pragmática sobre Former Customer en contactos

Cuando una empresa pasa a Former Customer, los contactos asociados permanecen en Customer. Esta decisión se basa en 3 razones:

1. Las personas pueden haber cambiado de empresa entre el tiempo de ser cliente y el churn, lo que introduce ambigüedad si se intenta rastrear individualmente.
2. Bajar a Former Customer requiere workflows complejos de clear-and-reset que no agregan valor operativo proporcional a su complejidad técnica.
3. Preservar a los contactos como Customer histórico facilita el outreach de win-back: el BDR puede trabajar la lista de "ex clientes" sin perder la información.

**Opcional:** si en el futuro se requiere distinguir contactos activos vs históricos en ex clientes, se puede agregar property `contact_status` (Active / Historical) sin modificar el stage.

### 6.4 Sync de cambio de empresa (contacto muta)

Cuando un contacto cambia de empresa (deja Grupo Aguas, entra a Codelco), el sync debe operar con cuidado:

- El contacto pierde asociación con Grupo Aguas y se asocia con Codelco
- El lifecycle personal del contacto NO se resetea
- Si Codelco es Subscriber, el contacto aparece como "Customer en empresa Subscriber" — comportamiento raro pero correcto
- Esta anomalía se resuelve con política de limpieza manual trimestral donde Luis Reyes revisa contactos cuyo stage es superior al de su empresa y decide acción caso por caso

---

## 7. Properties transversales de motion

Las properties motion son primariamente atributos de la empresa. Solo Advocate tiene equivalente en contactos (`is_advocate_individual`) porque advocacy personal puede existir independientemente de advocacy corporativo.

### 7.1 Properties motion en empresas (las 4)

| Label | Internal name | Tipo | Trigger | Aplica a stages |
|---|---|---|---|---|
| In Expansion | `is_in_expansion` | Boolean | Deal abierto en pipeline Expansion | 8, 9, 10 |
| In Renewal | `is_in_renewal` | Boolean | Deal abierto en pipeline Renewal | 8, 9, 10 |
| At Risk | `is_at_risk` | Boolean | MSA <60 días sin Renewal, MRR en caída, health score bajo | 8, 9, 10 |
| Advocate | `is_advocate` | Boolean + criteria | Referido, caso público, co-marketing o speaker a nombre empresa | 8, 9, 10, 11 |

#### Criterios detallados

**`is_in_expansion`** — Trigger automático por workflow. Se activa cuando el cliente tiene al menos un deal en estado abierto (no Closed-Won ni Closed-Lost) en el pipeline Expansion. Incluye `deal_types`: Cross-sell, Upsell, New SOW. Se desactiva automáticamente cuando todos los deals de Expansion están cerrados.

**`is_in_renewal`** — Trigger automático por workflow. Se activa cuando el cliente tiene al menos un deal en estado abierto en el pipeline Renewal. Incluye `deal_types`: MSA Renewal, SOW Renewal, SOW Extension, Win-back. Se desactiva automáticamente cuando todos los deals de Renewal están cerrados.

**`is_at_risk`** — Trigger compuesto (cualquiera de las 3 condiciones activa la property):
1. MSA con `msa_end_date` a menos de 60 días sin deal abierto en pipeline Renewal.
2. `total_mrr` en caída sostenida últimos 3 meses (delta negativo acumulado mayor a 15%).
3. Health score del cliente en rango rojo (combinación de métricas ICO: OTD% bajo, RpA alto, engagement bajo en Greenhouse).

**`is_advocate`** — Trigger manual con criteria múltiple. Los criterios elegibles:
- Referido documentado que se convirtió en deal calificado
- Caso público firmado (autorización para usar como caso de éxito comunicable)
- Co-marketing activo (contenido conjunto, webinar compartido, evento patrocinado)
- Speaker en evento de industria representando la solución

### 7.2 Property motion en contactos (la 1)

| Label | Internal name | Tipo | Trigger |
|---|---|---|---|
| Advocate Individual | `is_advocate_individual` | Boolean + criteria | Persona que da referidos directos personales, es speaker individual, o actúa como amplificador personal independiente de la empresa |

### 7.3 Combinaciones reales del portfolio

| Escenario | Stage empresa | Properties activas |
|---|---|---|
| Sky negociando Content Lead + Social Care | Active Account | `is_in_expansion = true`, `is_advocate = true` |
| Grupo Aguas a 45 días del MSA con Renewal abierto | Active Account | `is_in_renewal = true` |
| Sky con MSA vencendo + queja de calidad | Active Account | `is_in_renewal = true`, `is_at_risk = true` |
| Arturo Labbé habló en evento recomendando Efeonce | Contacto: Customer · Empresa: Active | Contacto: `is_advocate_individual = true` · Empresa: sin cambio |
| Cliente de Kortex standalone operando estable | Self-Serve Customer | (ninguna) |

---

## 8. Properties contractuales (solo empresas)

Las properties contractuales viven exclusivamente en empresas. Greenhouse es el sistema de verdad; vía sync bidireccional alimenta las properties que HubSpot necesita para workflows de transición, activación de motion, y cálculo de métricas.

### 8.1 Properties a nivel Company

| Property | Tipo | Fuente | Actualización |
|---|---|---|---|
| `active_msa_id` | Text | Greenhouse sync | Automática |
| `msa_start_date` | Date | Greenhouse sync | Automática |
| `msa_end_date` | Date | Greenhouse sync | Automática |
| `msa_value_monthly` | Currency | Greenhouse sync | Automática |
| `active_sows_count` | Number | Greenhouse sync | Automática |
| `active_sows_value_monthly` | Currency | Greenhouse sync | Automática |
| `saas_subscriptions` | Multi-select (Kortex / Verk / Ambos / Ninguno) | Greenhouse sync | Automática |
| `saas_mrr` | Currency | Greenhouse sync | Automática |
| `total_mrr` | Calculated (`msa_value` + `sows` + `saas`) | HubSpot (suma) | Automática |
| `customer_since` | Date | Primer Closed-Won | Automática |
| `last_expansion_date` | Date | Último deal Expansion ganado | Automática |
| `last_renewal_date` | Date | Último deal Renewal ganado | Automática |
| `lifetime_value_ytd` | Currency | Suma Closed-Won del año | Automática |

### 8.2 Properties a nivel Deal

| Property | Valores | Propósito |
|---|---|---|
| `deal_sub_type` | MSA Renewal, SOW Renewal, SOW Extension, Cross-sell, Upsell, New SOW, Win-back | Motion específico dentro del pipeline |
| `expansion_type` | Same unit, Cross unit, New product | Tipo de expansión para reporting |
| `previous_mrr` | Currency | MRR del cliente antes del deal |
| `post_deal_mrr` | Currency | MRR proyectado si el deal se gana |
| `mrr_delta` | Calculated (`post - previous`) | Impacto neto del deal en MRR |
| `is_downsell` | Boolean | Marca deals que reducen scope |

---

## 9. Las 6 métricas de retención y expansión

Las métricas se calculan a nivel de empresa (cuenta), no de contacto. El MRR y los ciclos contractuales son atributos de la cuenta.

### 9.1 La métrica reina: NRR

**NRR (Net Revenue Retention)** mide qué porcentaje del revenue de clientes existentes retienes incluyendo expansión y churn.

**Fórmula:**

```
NRR = (MRR_inicio + Expansion - Churn - Downsell) / MRR_inicio × 100
```

**Interpretación:**
- **NRR > 100%** — clientes existentes crecen contigo. Santo grial SaaS/ASaaS.
- **NRR = 100%** — retienes exactamente.
- **NRR < 100%** — pierdes revenue neto. Alerta roja.

**Target Efeonce Q3 2026:** `NRR > 110%`.

### 9.2 Las 5 métricas de soporte

| Métrica | Fórmula | Para qué sirve | Target |
|---|---|---|---|
| GRR (Gross Revenue Retention) | `(MRR_inicio - Churn - Downsell) / MRR_inicio × 100` | Retención pura sin expansión | >90% |
| Expansion Rate | `Expansion_MRR / MRR_inicio × 100` | Crecimiento de base existente | >15% trimestral |
| Logo Retention | `Clientes_activos_final / Clientes_inicio × 100` | Retención por conteo de cuentas | >95% |
| Time-to-Expansion | `Días desde Closed-Won hasta primera expansión` | Velocidad de detección | <180 días |
| Renewal Rate on MSA | `MSAs_renovados / MSAs_elegibles × 100` | Retención de contratos anuales | >90% |

### 9.3 Cadencia de cálculo

| Métrica | Frecuencia | Dashboard principal |
|---|---|---|
| NRR | Mensual (rolling 12m) + Trimestral | Revenue Health |
| GRR | Mensual | Revenue Health |
| Expansion Rate | Mensual + Trimestral | Expansion Engine |
| Logo Retention | Trimestral | Revenue Health |
| Time-to-Expansion | Trimestral | Expansion Engine |
| Renewal Rate | Trimestral | At Risk Accounts |

---

## 10. Los 3 dashboards operativos

### 10.1 Dashboard Revenue Health

**Audiencia:** Julio (GTM Director).
**Propósito:** visión ejecutiva de la salud del portfolio.

Componentes:
- NRR rolling 12 meses (gauge)
- GRR rolling 12 meses (gauge)
- MRR total actual + tendencia mensual
- Breakdown de MRR por tipo de cliente: Active Account vs Self-Serve vs Project
- Logo Retention trimestral
- Top 10 cuentas por MRR con flag `is_at_risk`

### 10.2 Dashboard Expansion Engine

**Audiencia:** Luis Reyes + Julio.
**Propósito:** pipeline de expansión activo y oportunidades no detectadas.

Componentes:
- Expansion Rate mensual + trimestral
- Deals abiertos en pipeline Expansion por `deal_sub_type`
- Time-to-Expansion por cohort
- Active Accounts sin expansion últimos 180 días (target list QBR)
- MRR Delta ponderado del pipeline Expansion

### 10.3 Dashboard At Risk Accounts

**Audiencia:** Julio + CSM futuro.
**Propósito:** cuentas que requieren atención urgente.

Componentes:
- MSAs vencendo en próximos 90 días (kanban por fecha)
- Deals en pipeline Renewal con probabilidad y owner
- Cuentas con `is_at_risk = true` con razón de activación
- Señales de riesgo: MRR en caída, engagement bajo, retraso en pagos
- Former Customers recientes como candidatos win-back

---

## 11. Workflows automáticos

La arquitectura funciona solo si las transiciones ocurren sin intervención manual. Los workflows se dividen entre los que operan en contactos, los que operan en empresas, y los que sincronizan ambos.

### 11.1 Workflows en contactos

| Workflow | Trigger | Acción |
|---|---|---|
| `contact_promote_to_mql` | Lead con `research_status = Completo` + `aeo_check_result` registrado + `icp_fit_score ≥ 3` | Lifecycle Stage → MQL |
| `contact_promote_to_pql` | Trial activado en Kortex o Verk (sync desde plataforma SaaS) | Lifecycle Stage → PQL |
| `contact_promote_to_sql` | Scorecard ≥ 4/6 completado por BDR | Lifecycle Stage → SQL |
| `contact_to_opportunity` | Deal creado asociado a contacto en pipeline New Business | Lifecycle Stage → Opportunity |
| `contact_to_customer` | Empresa asociada llega a Onboarding | Lifecycle Stage → Customer |

### 11.2 Workflows en empresas

| Workflow | Trigger | Acción |
|---|---|---|
| `company_sync_from_contact` | Contacto asociado cambia de stage (pre-venta) | Empresa hereda stage más alto de contactos |
| `company_closed_won_to_onboarding` | Deal Closed-Won en pipeline New Business | Empresa → Onboarding + set `customer_since` |
| `onboarding_complete_classify` | 90 días desde `customer_since` O `first_impact_date` registrado | Clasificar a Active / Self-Serve / Project por `deal_type` |
| `oscillation_8_9_10` | Cambio en `active_msa_id`, `saas_subscriptions` o `active_sows_count` | Re-evaluar stage 8/9/10 según reglas de oscilación |
| `churn_detection` | `total_mrr = 0` durante 30 días consecutivos | Empresa → Former Customer |
| `win_back_detection` | Former Customer con nuevo deal Closed-Won | Empresa → Onboarding + registrar win-back |

### 11.3 Workflows de activación de properties motion (empresas)

| Workflow | Trigger | Acción |
|---|---|---|
| `set_in_expansion` | Deal abierto en pipeline Expansion asociado a Company | `is_in_expansion = true` |
| `clear_in_expansion` | Todos los deals Expansion de Company cerrados | `is_in_expansion = false` |
| `set_in_renewal` | Deal abierto en pipeline Renewal asociado a Company | `is_in_renewal = true` |
| `clear_in_renewal` | Todos los deals Renewal de Company cerrados | `is_in_renewal = false` |
| `set_at_risk_mrr_decline` | `total_mrr` en caída >15% durante 3 meses consecutivos | `is_at_risk = true` |
| `set_at_risk_msa_expiring` | `msa_end_date` en <60 días sin deal Renewal abierto | `is_at_risk = true` + crear tarea Julio |
| `clear_at_risk` | Condiciones at_risk dejan de cumplirse | `is_at_risk = false` |
| `auto_create_renewal_deal` | `msa_end_date` en 90 días sin deal Renewal abierto | Crear deal en pipeline Renewal + notificar Julio |

---

## 12. Plan de implementación

La implementación se realiza en 3 fases. Cada fase es usable por sí misma y no requiere esperar a la siguiente para generar valor. El sync bidireccional Greenhouse ↔ HubSpot es dependency crítica que determina el timing.

### 12.1 Fase 1 — Arquitectura base (Mes 1-2)

**Objetivo:** stages y properties creadas en contactos y empresas, reportes básicos operativos.

- Crear 2 stages custom en contactos (Customer ya existe default, agregar PQL)
- Crear 7 stages custom en empresas (PQL, Onboarding, Active Account, Self-Serve Customer, Project Customer, Former Customer — Customer ya existe default pero no se usa post-firma en empresas)
- Crear las 4 properties motion en empresas: `is_in_expansion`, `is_in_renewal`, `is_at_risk`, `is_advocate`
- Crear la property `is_advocate_individual` en contactos
- Crear las 13 properties contractuales en empresas con poblamiento manual inicial
- Crear las 6 properties custom a nivel Deal
- Redefinir MQL con los 3 criterios operativos (research + AEO + ICP fit)
- Migrar contactos y empresas actuales a los nuevos stages (clasificación manual supervisada)
- Setup inicial de Dashboard Revenue Health con métricas manuales mensuales

### 12.2 Fase 2 — Automatización con Greenhouse sync (Mes 3-4)

**Objetivo:** sync bidireccional activo, workflows de transición funcionando.

- Completar sync bidireccional Greenhouse ↔ HubSpot de SOW y MSA (dependency Kortex)
- Implementar los 5 workflows de contactos
- Implementar los 6 workflows de transición de stages en empresas
- Implementar los 8 workflows de activación de properties motion
- Implementar el workflow de sync forward Contact → Company (`company_sync_from_contact`)
- Activar cálculo automático de `total_mrr` y `mrr_delta`
- Activar Dashboards Expansion Engine y At Risk Accounts

### 12.3 Fase 3 — Optimización y escalamiento (Mes 6+)

**Objetivo:** modelo maduro operando autónomamente, equipo CSM incorporado.

- NRR, GRR y métricas calculándose automáticamente
- Benchmarks históricos establecidos tras 6+ meses
- Revisión trimestral del modelo dual
- Política de limpieza trimestral de contactos en empresa cambiada
- Evaluación de si `is_advocate_individual` genera insights suficientes o requiere promoción a stage

---

## 13. Decisiones arquitectónicas documentadas

### 13.1 Por qué arquitectura dual asimétrica

HubSpot permite técnicamente los mismos stages en contactos y empresas. Se rechazó la simetría forzada porque:

1. Active Account / Self-Serve / Project son atributos de la cuenta, no de la persona. Aplicarlos en contactos genera confusión semántica.
2. Onboarding como stage en contactos no tiene significado operativo claro. Una persona no está en onboarding; la empresa sí.
3. Former Customer en contactos es ambiguo cuando la persona cambia de empresa.
4. Mantener stages vacíos en contactos ensucia dropdown y reports sin valor.

### 13.2 Por qué Expansion y Renewal son properties, no stages

Un cliente puede estar simultáneamente en expansión y en renovación. Modelar ambos como stages obligaría a elegir uno y perder información. Como properties transversales, coexisten sin conflicto.

Adicionalmente, el tipo de cliente (Active / Self-Serve / Project) es más estable y más importante para playbook comercial que la fase de motion. Mantener el tipo siempre visible fue decisión explícita del principio rector.

### 13.3 Por qué At Risk es property, no stage

At Risk es una señal, no una fase del journey. Un Active Account At Risk sigue siendo Active Account — no deja de serlo porque esté en crisis.

### 13.4 Por qué 3 tipos de cliente post-Onboarding

Active Account, Self-Serve Customer y Project Customer tienen diferencias radicales en owner, cadencia de QBR, lógica de expansión, y valor medio. Aplanar estos 3 en "Customer" obligaría a leer properties adicionales para entender el caso.

### 13.5 Por qué MQL se redefine operativamente

El MQL default asume scoring inbound de marketing. Efeonce no tiene ese volumen hoy. La redefinición (research BDR + AEO check + ICP fit) convierte MQL en algo útil desde el día uno para el flujo outbound real.

### 13.6 Por qué el bow-tie canónico se adaptó

El bow-tie canónico asume un solo tipo de cliente y motion lineal. Efeonce opera tres motions distintos y maneja expansión + renovación como motions paralelos. El Bow-tie Efeonce preserva la lógica pero evoluciona la granularidad.

### 13.7 Por qué Former Customer en contactos queda como Customer histórico

Cuando una empresa cancela, los contactos asociados permanecen como Customer. Esta decisión pragmática evita workflows complejos de clear-and-reset y preserva el historial para outreach de win-back. Si en el futuro se requiere distinguir activos vs históricos, se agrega property `contact_status` sin modificar stage.

---

## 14. Cierre y próximos pasos

Esta arquitectura v1.1 es la fuente de verdad canónica hasta que sea explícitamente reemplazada. Cambios menores se documentan como patches (v1.2, v1.3); cambios estructurales requieren v2.0 con justificación formal.

### Próximos documentos derivados

- **Arquitectura de Pipelines HubSpot Efeonce v1.1** — agregar pipeline Renewal + `deal_sub_types` + properties MRR
- **Playbook de Workflows HubSpot** — detalles técnicos de implementación de los 19 workflows documentados
- **Manual de Onboarding del BDR** — cómo usar MQL redefinido, scorecard SQL
- **Playbook de QBR por tipo de cliente** — cadencias diferenciadas para Active / Self-Serve / Project

### Actualizaciones pendientes del ecosistema

- **Estrategia Comercial Efeonce Q2-Q3 2026** — incorporar NRR, GRR, Expansion Rate en KPIs
- **BDR Prospecting Playbook 2026** — redefinir MQL con los 3 criterios operativos
- **ASaaS Strategy Efeonce 2026** — confirmar NRR como métrica reina

---

*Fin del documento canónico*

*Efeonce Group SpA*
*Arquitectura Bow-tie Efeonce · Versión 1.1 · Abril 2026*
