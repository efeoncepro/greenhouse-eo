# EPIC-028 — revisión de alineación con la visión de mercado de Globe

> Fecha: 2026-07-29
> Alcance: lo construido y lo pendiente en `EPIC-028-efeonce-globe-agentic-creative-studio.md`
> Estado: revisión estratégica; no cambia lifecycle ni autoriza rollout
> Verdict: `product-foundation-aligned | commercial-architecture-incomplete`

## Opinión ejecutiva

EPIC-028 refleja muy bien la visión de **qué debe ser Globe**: una capability creativa gobernada, provider-neutral,
agentic, operable por UI/MCP, con memoria, workflow, rights, lineage, review, spend control y tres modos operativos.

Todavía no refleja con suficiente precisión **cómo se convierte en un negocio distribuido y escalable**. El epic está
optimizado para construir un runtime interno seguro y completo; la estrategia actual exige además una arquitectura
explícita de mercado:

```text
enterprise marketing organizations = ICP estratégico
unidad enterprise / mid-market = beachhead operativo
agencias y productoras = canal multiplicador
e-commerce / DTC / retail = vertical wedge
creators / SMB = distribución y aprendizaje
```

Mi evaluación:

| Dimensión | Evaluación |
| --- | --- |
| Fundamento de producto | **Fuerte** |
| Gobernanza, rights y provider neutrality | **Fuerte** |
| Reutilización de workflow y memoria | **Fuerte en arquitectura; evidencia comercial pendiente** |
| Managed/co-operated/client-operated | **Bien modelado; todavía no validado en cohortes** |
| ICP enterprise y buying group | **Implícito, no suficientemente operacionalizado** |
| Agencias como canal | **Reconocido como hipótesis B2B2B, no diseñado como motion** |
| Distribución masiva / PLG | **Prácticamente ausente** |
| Verticalización | **Insuficiente** |
| Packaging, monetización y economics | **Correctamente bloqueados, pero incompletos** |
| Exit criteria comerciales | **Débiles frente a la visión actual** |

## 1. Lo que EPIC-028 ya hace bien

### 1.1 Define el producto correcto

El epic no reduce Globe a generación de media. Define una experiencia que comienza en brief, referencias,
tratamientos, candidatos y review, y compila el workflow técnico debajo. Eso coincide con la tesis de vender capacidad
creativa aprobada, repetible y trazable.

### 1.2 Tiene una ventaja enterprise real

Ya están presentes o explícitamente previstos:

- tenancy y workspace context;
- actor, aprobadores, delivery owner y authority;
- estimate → reserve → approve → execute → candidate → review → settle;
- provider/model/version propuesto versus ejecutado;
- fallback y readiness;
- rights, lineage, provenance y private ingest;
- budgets, pools, grants y spend fence;
- auditoría, idempotencia, rollback y observabilidad;
- `client-operated`, `co-operated` y `efeonce-managed`;
- UI, MCP, SDK y command/reader parity;
- aprobación humana y separación de maker/promoter.

Esto es mucho más cercano a una infraestructura enterprise que a una app de generación.

### 1.3 Tiene la semilla del flywheel correcto

El epic declara el flywheel:

`managed craft → templates → autonomía cliente en trabajo repetible → excepciones/picos managed`

También incorpora Project, Session, Element, review-to-reuse, Skill System y builder/runner. Esa base puede sostener
la expansión `primer resultado → workflow → pod/workspace → enterprise`.

### 1.4 Mantiene límites comerciales sanos

Es correcto que el epic mantenga cerrados clientes externos, pagos, créditos comerciales, publishing automático y
reseller rights hasta resolver `TASK-1477/1478/1479/1480`, `TASK-1482`, `TASK-1484` y `TASK-1521`. La restricción no es
el problema; el problema es que todavía falta conectar esos gates técnicos a una arquitectura comercial concreta.

## 2. Lo que falta para reflejar la visión completa

### 2.1 El ICP estratégico enterprise está implícito, no gobernando el backlog

El epic menciona clientes externos, equipos de agencias y Studio Access, pero no fija como contrato de programa que
enterprise marketing organizations es el ICP estratégico. Sin esa decisión, el backlog puede optimizar el Producer
para uso individual interno sin garantizar:

- sponsor y buying group;
- security/procurement readiness;
- multi-team y multi-region;
- enterprise contract y support model;
- expansión por workspace, markets, lanes e integraciones.

### 2.2 La distribución masiva no está en el epic

No hay una capa explícita para:

- demos y micro-tools de adquisición;
- templates de jobs completos;
- artifact/template loop;
- creator affiliates, template creators y creative partners;
- referrals basados en revisión/aprobación;
- content-led education;
- marketplace o superficies de integración;
- activación por segundo run y workflow guardado;
- PQL, template use, workspace conversion o Sample Sprint conversion.

La UI de Producer puede ser excelente y aun así no crear distribución. El epic necesita distinguir product surface de
distribution surface.

### 2.3 Agencias están mencionadas como riesgo, no como motion

EPIC-028 dice que B2B2B es una hipótesis condicionada a tenancy agencia→cliente, confidencialidad, rights, brand
authority y economics. Eso es correcto, pero incompleto. Debe definir al menos un experimento de:

`Agency Workflow Sprint → workflow por cliente → segundo cliente → co-operated lane → partner validado`

Con owner, margen, soporte, white-label/attribution, aprobación final y criterios para descartar el canal.

### 2.4 La verticalización aún no tiene un wedge comercial

La arquitectura soporta image/video/audio/3D, pero eso no equivale a una vertical. El epic necesita probar un job con
frecuencia y output medible, por ejemplo:

- variantes de campaña para retail/e-commerce;
- adaptación multiformato y localización;
- producción social recurrente;
- previsualización para productoras.

La primera plantilla técnica no debe ser sólo “media generativa”; debe ser un workflow comercial que un buyer pueda
reconocer y aprobar.

### 2.5 La monetización está bloqueada, pero falta el diseño de captura

El bloqueo de `TASK-1484` es correcto. Sin embargo, el epic no conecta todavía los lanes comerciales con sus streams:

- diagnostic/Sample Sprint;
- implementation y workflow IP;
- Studio Access/workspace governance;
- managed production;
- co-operated capacity;
- API/integration;
- rights/pass-through;
- enablement;
- usage/credits como settlement operativo.

Sin esa separación, el riesgo es construir créditos y billing antes de decidir qué compra el cliente.

## 3. Lectura de lo construido versus lo que falta

| Capa | Estado observado en EPIC-028 | Opinión |
| --- | --- | --- |
| Runtime/provider seam | Tres rutas promovidas internal-only; más rutas abiertas | Base suficiente para validar, no para vender general |
| Producer | Superficie amplia implementada/validada localmente; rollout no equivale a comercial | Buen wedge de producto, todavía no oferta vertical |
| Workbench | Brief-first y primitivos compartidos previstos | Debe materializar el buyer workflow, no sólo la superficie |
| Projects/Sessions/Elements | Tasks 1580–1583 como foundation y reuse | Muy alineado con retención; falta medir repetición |
| Review/Share/Lineage | Foundation fuerte, varios slices y despliegue parcial | Diferenciador enterprise potencial |
| Modes | Managed/co-operated/client-operated definidos | Falta prueba comparativa software versus managed |
| Commercial readiness | TASK-1476…1480, 1521, 1482, 1484 abiertas o gateadas | Es el cuello de botella real |
| Agency B2B2B | Hipótesis reconocida | Falta experimento con cuenta agencia + cliente final |
| Enterprise readiness | Contratos técnicos presentes | Falta paper process, security pack, support y design partners |
| Mass distribution | No es una línea del epic | Gap estratégico |
| Vertical workflow | Capabilities generales; no wedge comercial canónico | Gap de positioning y validación |

## 4. Qué debe agregarse al programa

No recomiendo crear otro epic. Recomiendo añadir una **capa comercial explícita dentro de EPIC-028**, con tasks
dependientes de los contratos existentes y sin duplicar owners técnicos.

### P0 — Commercial strategy and ICP contract

Debe fijar:

- enterprise marketing organizations como ICP estratégico;
- unidad enterprise/mid-market como beachhead operativo;
- agencias/productoras como canal multiplicador;
- e-commerce/DTC/retail como vertical wedge;
- creators/SMB como distribución y aprendizaje;
- anti-ICP, buying group, trigger y expansion trigger por lane.

### P0 — Enterprise design-partner readiness

Debe probar con dos unidades enterprise:

- un workflow real;
- sponsor, operator, creative approver, IT/security, Legal y Procurement;
- security/data/rights pack;
- MSA/SOW y acceptance criteria;
- tiempo de paper process;
- soporte, SLA, onboarding y offboarding;
- expansión a otro equipo, mercado o lane.

### P1 — Agency Workflow Sprint

Debe probar con cuatro agencias/productoras:

- un cliente final y una campaña por agencia;
- tenancy y ownership por cliente;
- workflow master y variantes;
- aprobación final del cliente;
- baseline de tiempo, rondas, coordinación y costo;
- margen bruto mínimo 45%;
- segunda ejecución y segunda fase.

### P1 — Campaign Variant Workflow

Debe convertir la primera plantilla en un proving ground comercial:

`brief/producto/key visual aprobado → variantes social/paid/e-commerce → localización → QA → review → manifest`

La plantilla debe declarar inputs, outputs, derechos, costo estimado, aprobación, provider fallback y métricas.

### P1 — Distribution and activation layer

Debe definir, aunque el runtime inicial siga privado:

- artifact loop;
- template library y workflow recipes;
- contenido operativo;
- creator/affiliate/partner taxonomy;
- referral de revisión/aprobación;
- segundo run como activation event;
- template use, workspace conversion y Sample Sprint conversion;
- integración como distribución, separada de partnership.

### P1 — Commercial packaging and economics

Debe conectar cada lane con:

- Product Service;
- operating mode;
- revenue stream;
- value trigger;
- cost-to-serve;
- margin gate;
- stop-loss;
- rights/pass-through;
- renewal y expansion trigger.

## 5. Veredicto

EPIC-028 **sí refleja la visión de producto y la ventaja defensible de Globe**, pero **todavía no refleja de forma
completa la visión de negocio y distribución**.

La frase más precisa es:

> EPIC-028 está construyendo una buena infraestructura para convertirse en la capa enterprise de producción creativa;
> todavía no ha convertido la estrategia de mercado, distribución y monetización en un contrato operativo del programa.

No hay que desviar el epic hacia una app masiva de creators ni hacia un clon de Higgsfield/Magnific. Hay que agregar la
capa que falta: ICP enterprise explícito, lanes de validación, agencia como multiplicador, vertical workflow, loops de
distribución y gates comerciales medibles.

## Fuentes y documentos relacionados

- [EPIC-028 vigente](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md)
- [Globe Market, Distribution & Monetization Strategy V1](../../strategy/EFEONCE_GLOBE_MARKET_DISTRIBUTION_AND_MONETIZATION_STRATEGY_V1.md)
- [Creative Studio Business Model V1](../../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md)
- [Commercial Focus & Beachheads V1](../../strategy/EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md)
- [Higgsfield benchmark](HIGGSFIELD_PARTNERSHIP_AND_VERTICAL_EXPANSION_RESEARCH_2026-07-29.md)
- [Magnific benchmark](MAGNIFIC_GO_TO_MARKET_AND_PLATFORM_EXPANSION_RESEARCH_2026-07-29.md)
