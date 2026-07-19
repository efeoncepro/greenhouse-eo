# Efeonce Creative Studio — Business Model V1

> **Status:** Approved for validation — no habilita pricing público ni venta self-serve
> **Owner:** Efeonce Strategy + Creative Practice + Efeonce Globe Product
> **Economic owner:** Finance
> **Contract/IP owner:** Legal + Creative Practice
> **Version:** 1.0
> **Date:** 2026-07-19
> **Validated as of:** 2026-07-19
> **Review cadence:** mensual durante piloto; trimestral después de commercial approval
> **Decision:** [Creative Studio Business Model Decision V1](../../architecture/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_DECISION_V1.md)
> **Credit policy:** [Studio Credit Model V1](EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md)
> **Platform:** [Agentic Platform Architecture V1](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md)

## 1. Decisión ejecutiva

Creative Studio comercializa una sola plataforma de producción creativa gobernada que combina software,
capacidad humana e infraestructura generativa. No vende prompts, tokens, horas ni una fábrica de piezas.

El cliente puede comprar tres cosas distintas, solas o combinadas con fronteras explícitas:

1. **Managed Squad:** Efeonce diseña y dirige la operación, aporta capacidad y responde por el delivery que
   controla.
2. **Staff Augmentation:** Efeonce aporta perfiles; el cliente dirige el trabajo y asume el outcome operativo.
3. **Studio Access:** el cliente accede a templates, memoria, controles, ledger y soporte del Studio; no compra
   por defecto dirección ni SLA de Managed Squad.

La relación puede tomar forma `On-Going`, `On-Demand` o `Sample Sprint`. Dentro de cualquier engagement, cada
run o lane declara un modo `efeonce-managed`, `co-operated` o `client-operated`. Ninguna de estas dimensiones
se infiere de otra.

La arquitectura de ingresos tiene cinco líneas separables:

- gobierno/plataforma;
- capacidad humana;
- Studio Credits para operaciones generativas gobernadas;
- implementación e IP específica;
- derechos, licencias y pass-through autorizados.

El modelo está aprobado para medir y pilotear. No están aprobados el precio público por crédito, paquetes de
top-up, checkout, pagos, expiración comercial ni acceso externo general.

## 2. Tesis y problema que resolvemos

### 2.1 El problema del cliente

Equipos in-house de marketing y creatividad ya tienen herramientas y talento. Su restricción suele estar en
convertir demanda variable en producción confiable sin perder control de marca, derechos, contexto o calidad.
Las herramientas generativas bajan el costo marginal de producir una variante, pero introducen otros costos:
selección de modelos, consistencia, retries, derechos, QA, trazabilidad y riesgo de que el sistema produzca más
ruido que capacidad útil.

Creative Studio resuelve cinco jobs:

| Job | Resultado esperado | Mecanismo demostrable |
| --- | --- | --- |
| Escalar output sin inflar permanentemente el equipo | Capacidad elástica y predecible | templates, pool de créditos, routing y squads/lanes |
| Mantener control de marca y craft | Menos retrabajo y menor riesgo | references, invariantes, review humana y lineage |
| Saber qué ocurre y cuánto cuesta | Transparencia y forecast | estimate, reservation, ledger, costo real y telemetría |
| Repetir lo que funcionó sin empezar de cero | Memoria acumulativa | templates versionados, assets, decisiones y rechazos |
| Ganar autonomía sin asumir complejidad innecesaria | Cliente más capaz | progresión managed → co-operated → client-operated por evidencia |

### 2.2 ICP y buying committee

**ICP primario:** equipos de marketing/creatividad mid-market y enterprise con demanda recurrente, múltiples
formatos/mercados, equipo in-house y sensibilidad de marca/derechos.

**ICP secundario:** cuentas Efeonce con campañas o picos de producción donde el Studio incrementa capacidad y
preserva continuidad entre servicio y software.

**No-ICP inicial:** individuo que sólo busca generación barata; cliente sin owner de brief; organización que
exige derechos ambiguos; cuenta que necesita contenido regulado sin revisión; comprador que exige precio de
staff-aug con accountability managed.

| Rol | Job / preocupación |
| --- | --- |
| Economic buyer: CMO/Marketing Director | capacidad, predictibilidad, riesgo, presupuesto y TTM |
| Champion: Head of Creative/Brand | craft, control, consistencia, visibilidad y no reemplazo del equipo |
| Usuarios: designers/producers/marketers | velocidad, referencias, templates, review y menor trabajo repetitivo |
| Procurement/Finance | unidad de compra, límites, forecast, margen, facturación y refunds |
| Legal/Brand Safety | IP, licencias, likeness/voice, territorio, plazo, subprocesadores y evidencia |

## 3. Taxonomía canónica: tres ejes, no una lista plana

### 3.1 Eje A — modelo de delivery

| Modelo | Quién dirige | Qué se compra | Accountability Efeonce | Unidad comercial principal |
| --- | --- | --- | --- | --- |
| **Managed Squad** | Efeonce | outcome + capacidad gobernada | Delivery/OTD/FTR sobre scope controlado | capacidad + gobierno + uso |
| **Staff Augmentation** | Cliente | uno o más perfiles | Disponibilidad/calidad contractual del perfil; no outcome dirigido por cliente | perfil/dedicación + términos laborales |
| **Studio Access** | Cliente dentro de policy | plataforma, templates, memoria y operaciones generativas | disponibilidad, policy, soporte y límites pactados | acceso/gobierno + credits |
| **Hybrid** | Separado por lane | combinación explícita de los anteriores | sólo según owner de cada lane/run | líneas separadas en SOW/CPQ |

`Hybrid` no es una zona gris. Requiere lanes separadas, owner, precio, SLA y mecanismo de escalamiento. Si una
persona asignada queda bajo dirección cotidiana del cliente, esa lane es Staff Augmentation aunque el resto del
engagement sea un Managed Squad.

### 3.2 Eje B — forma de engagement

| Forma | Duración/lógica | Uso recomendado | Economía |
| --- | --- | --- | --- |
| **On-Going** | relación recurrente con capacidad/pool por período | demanda sostenida y memoria acumulativa | recurring fee + pool + expansiones |
| **On-Demand** | proyecto con alcance, inicio y término | campaña, lanzamiento, sistema o producción puntual | fee cerrado/por fases + reserva de uso |
| **Sample Sprint** | piloto pagado, acotado y gobernado | validar fit, workflow, costo y colaboración | costo real + margen; sin loss-leading |

Sample Sprint es una forma de entrada, no un nivel de calidad, descuento ni modelo de delivery. Puede probar
Managed Squad, Studio Access o una configuración co-operated siempre que el outcome y las fronteras estén
documentados.

### 3.3 Eje C — modo operativo por run o lane

| Modo | Operador de record | Mejor ajuste | Efeonce puede comprometer |
| --- | --- | --- | --- |
| `efeonce-managed` | Efeonce | alta ambigüedad, hero/identity, derechos/riesgo altos | delivery del tramo que controla |
| `co-operated` | uno por etapa/lane, nunca “ambos” sin owner | dirección aprobada + producción compleja/picos | sólo sus etapas y handoffs pactados |
| `client-operated` | cliente | baja ambigüedad, repetición, adaptaciones curadas | plataforma/policy/soporte, no outcome creativo |

### 3.4 Matriz de compatibilidad

| Modelo de delivery × modo | `efeonce-managed` | `co-operated` | `client-operated` |
| --- | --- | --- | --- |
| Managed Squad | **Natural** | **Válido** con lanes/RACI | **Condicionado:** sólo si una lane se gradúa; el fee managed se ajusta si baja capacidad real |
| Staff Augmentation | **Inválido** dentro de la misma lane | **Condicionado:** perfil sigue dirigido por cliente; servicios managed van separados | **Natural** para el perfil, pero no convierte acceso en staff-aug |
| Studio Access | **Condicionado:** add-on de operación managed | **Válido** como soporte/capacidad elástica | **Natural** |
| Hybrid | **Válido** | **Válido** | **Válido**, siempre con ownership y líneas económicas separadas |

### 3.5 Ejemplos que eliminan ambigüedad

- On-Going + Managed Squad + runs mayormente `efeonce-managed`, con adaptaciones repetibles
  `client-operated`: válido; el contrato distingue capacidad managed y pool de acceso.
- On-Demand + Studio Access + `co-operated`: válido para una campaña donde el cliente fija dirección y Efeonce
  opera video/finishing.
- Sample Sprint + Managed Squad + `efeonce-managed`: válido para demostrar un workflow completo.
- Staff Augmentation + `efeonce-managed` en la misma persona/lane: inválido; cambia dirección, riesgo y precio.
- “Co-operated” sin operador por etapa ni aprobador: inválido; es responsabilidad difusa, no colaboración.

## 4. Propuesta de valor por configuración

### Managed Squad

El cliente compra capacidad creativa gobernada: Efeonce configura el sistema, dimensiona roles, dirige lanes,
absorbe complejidad de modelos y responde por el delivery dentro del scope. Los créditos funcionan detrás de la
promesa como un envelope de producción; no deben convertir la relación en una calculadora por pieza.

### Studio Access

El cliente compra autonomía gobernada: templates curados, memoria, referencias, controles, review, budget y
soporte. El valor no es “usar IA”; es operar capacidades repetibles sin administrar providers, lineage o
policy. No incluye por defecto dirección creativa, curation, QA managed ni compromiso OTD/FTR.

### Co-operated / hybrid

El cliente conserva brand authority y dirección donde aporta ventaja; Efeonce cubre producción especializada,
excepciones o picos. La propuesta sólo funciona si el handoff es un contrato de operación, no una conversación:
operator, inputs, output, deadline, approver, budget y failure owner.

### Staff Augmentation

El cliente gana talento específico bajo su dirección. Creative Studio puede ser una herramienta disponible para
ese perfil si el entitlement lo permite, pero no cambia quién dirige ni crea accountability managed.

## 5. Arquitectura de ingresos

| Línea | Qué remunera | Trigger | Qué excluye |
| --- | --- | --- | --- |
| **Gobierno/plataforma** | workspace, policy, ledger, memoria, observabilidad, seguridad, soporte base | período/tenant o engagement | trabajo creativo y uso variable |
| **Capacidad humana** | squad, dirección, producción, curation, QA, account/delivery management | capacidad reservada o fase/outcome | provider spend y derechos |
| **Studio Credits** | operaciones generativas gobernadas | settlement de run aprobado | horas, piezas, deterministic finishing y licencias |
| **Implementación/IP** | onboarding, brand profile, templates/custom workflows, integración y training | milestone/aceptación | consumo futuro y buyout de método |
| **Derechos/licencias/pass-through** | stock, talento, voz/likeness, música, territorios, exclusividad, media/vendor fees | autorización/uso | creación y capacidad base |

### Reglas comerciales

1. Gobierno/plataforma no se descuenta; si baja el precio, baja capacidad o alcance.
2. La capacidad se cotiza con fully loaded cost y piso de margen bruto de 45%.
3. Derechos de uso se especifican y cotizan por separado; nunca se regalan dentro de credits.
4. Un run no puede cobrar capacidad humana dentro del crédito y nuevamente como fee sin declarar la
   composición. La doble imputación opaca está prohibida.
5. On-Demand marginal debe ser más caro por unidad de capacidad que el compromiso recurrente equivalente.
6. Ningún precio se publica sin pasar por CPQ/Finance y conservar cost snapshot, FX y aprobación.

## 6. Packaging propuesto para validación

Estos packages describen composición; no contienen precio aprobado.

| Package | Líneas incluidas | Para quién | No incluye por defecto |
| --- | --- | --- | --- |
| **Managed Production** | gobierno + capacidad + pool de credits | cuenta que delega delivery | buyouts, media, talento/stock |
| **Co-operated Studio** | gobierno + access + pool + lanes de capacidad | equipo in-house que comparte producción | SLA sobre lanes cliente |
| **Studio Access** | gobierno/access + credits + onboarding | equipo maduro con trabajo repetible | dirección, curation y QA managed |
| **Studio Foundation** | implementación/IP + training + primer template | onboarding o capability nueva | consumo recurrente |

No crear nombres públicos definitivos hasta validar comprensión con clientes y compatibilidad con la
arquitectura de marca Efeonce. Los nombres anteriores son internos/descriptivos.

## 7. Unit economics y modelo financiero

### 7.1 Ecuación por cuenta y período

```text
Revenue
  = governance_fee
  + capacity_fee
  + credit_revenue_recognized
  + implementation_ip_fee
  + rights_and_pass_through_markup

Cost_to_serve
  = fully_loaded_human_cost
  + provider_and_compute_cost
  + storage_egress_and_tooling
  + support_and_success_cost
  + refund_retry_reserve
  + allocated_platform_operations
  + rights_and_pass_through_cost

Gross_margin = (Revenue - Cost_to_serve) / Revenue
```

El business model usa costos observados, no list prices de vendors. Provider cost se registra por attempt y se
agrega por run/template/account/mode. Capacidad humana usa loaded cost vigente y dedicación real/planificada.

### 7.2 Guardrails

- margen bruto total mínimo: **45%**;
- observar margen además por línea, account, template y modo para evitar subsidios cruzados invisibles;
- cotizar con p50 y protegerse con p95 de costo variable en rutas volátiles;
- mantener retry/refund reserve explícita;
- separar FX snapshot y cláusula de reajuste cuando costos USD y contrato CLP divergen;
- créditos no usados, expiración y breakage no se reconocen como “margen gratis” sin política contable aprobada;
- pass-through sin markup suficiente para cubrir procurement/administración se declara como tal, no se mezcla.

### 7.3 Sensibilidades obligatorias antes de aprobar precio

| Variable | Escenario requerido |
| --- | --- |
| utilización de capacidad | 60 / 75 / 90% |
| costo provider por operación | p50 / p75 / p95 + shock 2× |
| tasa de retry/refund | 5 / 15 / 30% |
| mix de modos | managed-heavy / balanced / client-operated-heavy |
| soporte por cuenta | base / 2× / 4× |
| FX | spot / -15% CLP / +15% CLP |
| volumen | 0.5× / 1× / 3× pool |

## 8. Scope, accountability y fallas

### 8.1 Compromiso por modelo

| Aspecto | Managed Squad | Staff Augmentation | Studio Access |
| --- | --- | --- | --- |
| Brief quality | co-responsabilidad con owner cliente | cliente | cliente; template valida mínimos |
| Dirección creativa | Efeonce | cliente | cliente salvo add-on |
| Operación de run | según modo, normalmente Efeonce | cliente/perfil dirigido por cliente | cliente |
| QA creativo | Efeonce dentro de scope | cliente | cliente salvo add-on |
| SLA delivery | posible sobre tramo controlado | no por outcome | plataforma/soporte, no outcome |
| Provider/platform failure | Efeonce gestiona/refunda según policy | Studio según entitlement | Studio según policy |
| Cambio de dirección | change order/nuevo run | cliente absorbe | nuevos credits/alcance |

### 8.2 Clasificación de rework

| Evento | Tratamiento económico |
| --- | --- |
| fallo técnico/provider sin output utilizable | release/refund; retry no cobra doble |
| defecto de template/plataforma | Efeonce absorbe y corrige |
| output falla una rúbrica objetiva pactada | retry/refund según owner de la causa |
| output válido, cliente cambia preferencia/dirección | nuevo run/credits o change order |
| error Efeonce de ejecución sobre brief aprobado | Efeonce absorbe |
| input/asset/derechos incorrectos provistos por cliente | pausa; reestimate/change order según impacto |

### 8.3 Rondas y aprobación

El SOW define 2–3 rondas según disciplina, feedback consolidado, owner y reloj. Un cambio de dirección no es una
ronda. `candidate_ready` no equivale a aprobado; sólo aprobación humana habilita delivery.

## 9. Rights, IP, privacidad y compliance

### 9.1 Separación de IP

| Clase | Owner por defecto |
| --- | --- |
| marca, assets originales e información cliente | cliente |
| entregable final | según licencia/SOW aprobado |
| templates base, método, rubricas, routing y tooling | Efeonce |
| template específico financiado por cliente | se declara portable/proprietary/compartido en SOW |
| provider/model output | sujeto a términos vigentes y SOW; nunca asumir exclusividad automática |

### 9.2 Derechos obligatorios por asset/run

- fuente y licencia;
- canal, territorio, plazo y exclusividad;
- talento, likeness, voz y consentimiento;
- música: master, sincronización y ejecución cuando corresponda;
- restricciones de training/reuse del provider;
- autorización de portfolio;
- retención y eliminación.

High-risk, minor, salud, finanzas, política, biometría/deepfake o uso regulado requieren review especializado y
pueden quedar fuera de V1. Ningún agente aprueba derechos, gasto o publicación de forma autónoma.

## 10. Journey y flywheel

```text
diagnóstico / Sample Sprint
  → primer workflow managed con evidencia
  → template estable + memoria
  → co-operación en lanes repetibles
  → client-operated donde riesgo y ambigüedad son bajos
  → Efeonce absorbe excepciones, picos y dirección crítica
  → evidencia mejora template, forecast y capacidad del cliente
```

La graduación no es obligatoria. Un workflow permanece managed si la ambigüedad, derechos, riesgo de marca,
costo o tasa de escalamiento lo justifican. El objetivo es autonomía segura, no maximizar self-service.

## 11. Métricas y scorecard

### Cliente/valor

- time-to-first-approved-deliverable;
- TTM sobre alcance controlado;
- porcentaje de trabajo repetible operable sin escalamiento;
- capacidad desbloqueada, no sólo outputs;
- calidad percibida y confianza del Head of Creative.

### Delivery/craft

- OTD, FTR, RpA y cycle time con trust policy;
- candidate-to-approved rate;
- razones de rechazo por categoría;
- estimate-to-actual variance;
- escalamiento entre modos.

### Producto/adopción

- active workspaces y active creators;
- successful runs por template;
- template reuse y time-to-success;
- porcentaje de runs con RACI/rights completos;
- support minutes por successful run.

### Economía

- revenue y gross margin por account/model/mode/template;
- provider cost y fully loaded cost por approved candidate;
- retry/refund rate y reserve coverage;
- credit utilization y forecast accuracy;
- NRR/expansión sólo cuando exista cohort suficiente.

### Guardrails

- incidentes de derechos, fuga cross-tenant o publicación no autorizada: tolerancia cero;
- outputs no aprobados entregados como finales: tolerancia cero;
- provider concentration y route availability;
- diversidad creativa/route concentration para detectar homogeneización.

Cada dashboard debe declarar período, denominador, fuente, sample size y confiabilidad. Telemetría no se vuelve
SLA por aparecer en el portal.

## 12. Plan de validación comercial y económica

### Fase 0 — instrumentación interna

- 30–50 runs reales distribuidos entre imagen, video y audio;
- registrar attempts, costo, tiempo humano, retries, QA, rechazo y modo;
- shadow credits: calcular sin facturar;
- reconciliar estimate vs actual por template.

**Gate:** al menos 80% de templates estables con forecast dentro de ±20%; ningún gap de lineage/derechos.

### Fase 1 — discovery comprador

- 5–8 entrevistas con CMO/Head of Creative/Brand/Procurement;
- probar comprensión de los tres ejes y de cada línea de ingreso;
- usar willingness-to-pay por package/outcome, no preguntar “cuánto pagarías por un crédito”;
- registrar objeciones de control, lock-in, IP y forecast.

**Gate:** 70%+ clasifica correctamente Managed Squad vs Staff Augmentation vs Studio Access sin ayuda.

### Fase 2 — Sample Sprints

- 2 managed, 2 co-operated y 1 client-operated simulation/pilot;
- SOW real, pool visible, refund policy y review humana;
- medir margen, soporte, time-to-value, predictibilidad y calidad.

**Gate:** margen ≥45% a costo fully loaded; 0 incidentes de derechos/tenant; soporte financiable; aceptación del
modelo económico por buyer y procurement.

### Fase 3 — commercial approval

Requiere sign-off documentado de Finance, Legal/IP, Security, Product, Operations y Leadership sobre pricing,
tax, revenue recognition, expiración, top-ups, refund, support, SLA y contrato. Sólo entonces se crea catálogo
en `docs/services/` y habilitación externa en EPIC-028.

## 13. Riesgos y self-critique

| Riesgo | Horizonte | Mitigación / señal |
| --- | --- | --- |
| créditos se perciben como tokens caros | inmediato | vender outcome/capacidad; credits visibles donde ayudan al control |
| doble cobro de humano + crédito | inmediato | líneas separadas, cost mapping y auditoría CPQ |
| canibalización del Managed Squad | 12 meses | graduación por evidencia; cobrar IP/gobierno; mover talento a dirección/excepciones |
| heavy users destruyen margen | 6–12 meses | pool, reserve, p95, alerts y re-pricing |
| client-operated produce baja calidad y culpa a Efeonce | inmediato | templates acotados, onboarding, no SLA managed y escalation |
| dependencia de providers | continuo | routing provider-neutral, portfolio y equivalencia estable |
| rights/deepfake incident | continuo | gates humanos, provenance, restricted workflows y legal review |
| soporte no financiado | 6 meses | medir minutos/run, tier de soporte y office hours/add-on |
| homogeneización creativa | 12–36 meses | diversidad, razones de rechazo, exploración separada y revisión humana |
| modelo demasiado complejo para ventas | inmediato | configurador de tres preguntas y packages descriptivos |
| cognitive debt del modelo | 12 meses | taxonomía única, glossary, ejemplos, owner y revisión trimestral |
| lock-in percibido como hostil | 12 meses | exportabilidad de assets/evidencia cliente; IP Efeonce explícita, no oculta |

## 14. Decisiones abiertas

No están decididos:

- price point, moneda, pool sizes y minimum commitment;
- expiración, rollover, borrow y top-ups;
- inclusión exacta de soporte por package;
- revenue recognition y tratamiento tributario de créditos prepagados;
- markup/pass-through por licencias;
- qué templates se habilitan primero a clientes;
- SLOs de plataforma y SLAs managed;
- portabilidad de templates específicos;
- disponibilidad regional y términos de subprocesadores.

Cada decisión requiere owner, evidencia, fecha y actualización de este modelo o de su submodelo.

## 15. Fuentes y trazabilidad

Fuentes internas canónicas:

- [RESEARCH-009 — Creative Operations](../../research/RESEARCH-009-creative-operations-agentic-workflows.md)
- [Creative Studio Agentic Platform Architecture](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md)
- [Creative Studio Enterprise Model Portfolio](../../architecture/EFEONCE_CREATIVE_STUDIO_ENTERPRISE_MODEL_PORTFOLIO_V1.md)
- [ASaaS context](../../context/14_modelo-negocio-asaas.md)
- [Creative Practice offer](../../../.codex/skills/creative-practice/modules/03_OFERTA.md)
- [Creative Practice pricing](../../../.codex/skills/creative-practice/modules/04_PRICING.md)
- [Creative Practice SOW](../../../.codex/skills/creative-practice/modules/05_SCOPE_SOW.md)
- [EPIC-028](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md)

Benchmark externo se conserva como evidencia direccional de packaging/usage, no como autoridad de precio. Los
precios, términos y capabilities de vendors deben revalidarse cerca de cualquier decisión comercial.
