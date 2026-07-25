# Arquitectura de modelos de negocio de Efeonce V1

> **Estado:** Accepted direction — portfolio models en construcción
> **Owner:** Efeonce Strategy + Finance + Product + práctica dueña
> **Propósito:** explicar cómo se relacionan el modelo de Efeonce Group, el modelo de plataforma, los modelos de cada capability/oferta y sus submodelos económicos.
> **Método operativo:** [`efeonce-business-model-operator`](../../.codex/skills/efeonce-business-model-operator/SKILL.md)
> **Tesis corporativa:** [`EFEONCE_CAPITAL_AND_INVESTMENT_STRATEGY_V1.md`](../strategy/EFEONCE_CAPITAL_AND_INVESTMENT_STRATEGY_V1.md)

## La respuesta corta

Efeonce tiene **un modelo de negocio corporativo** y, debajo, **modelos de negocio para las ofertas que
realmente cambian de cliente, propuesta de valor, delivery, pricing, costos, riesgos o métricas**.

No es correcto elegir entre:

- “Efeonce tiene un solo modelo para todo”; o
- “cada servicio pequeño necesita un documento propio”.

La arquitectura correcta es jerárquica:

```text
Efeonce Group
└── Modelo corporativo
    └── Growth Platform / ASaaS
        ├── Capabilities y líneas de negocio
        │   ├── Efeonce Digital
        │   │   ├── AEO
        │   │   ├── Search Visibility 360
        │   │   ├── SEO/contenido
        │   │   └── CRM/GTM
        │   │   ├── Globe / Creative Studio
        │   │   ├── Reach
        │   │   └── Wave
        │   └── Otras capabilities aprobadas
        ├── Plataformas y activos habilitantes
        │   ├── Greenhouse
        │   ├── Kortex
        │   ├── Verk
        │   └── Globe runtime
        └── Submodelos económicos
            ├── Studio Credits
            ├── Licensing/IP
            ├── Usage
            ├── Revenue share
            └── Partnerships
```

Cada nivel responde una pregunta distinta. Los niveles se conectan; no se reemplazan ni deben duplicar la
misma verdad.

## 1. Las cinco capas

### Capa 1 — Modelo corporativo de Efeonce Group

Responde:

- ¿Qué compañía somos?
- ¿En qué categoría competimos?
- ¿Qué problema amplio resolvemos?
- ¿Cómo se combinan nuestras capacidades?
- ¿Cómo creamos y capturamos valor a nivel grupo?
- ¿Cómo se asignan shared services, IP, datos y plataformas?
- ¿Qué puede financiar un inversionista?

La formulación vigente es:

> **Efeonce es una plataforma de servicios de marketing y crecimiento habilitada por IA, expresada
> comercialmente como Integrated Growth Partner, operada bajo ASaaS y orientada hacia la visión de Growth
> Operating System.**

Este modelo describe la compañía completa: servicios, capabilities, plataformas, datos, método, memoria,
operación recurrente y expansión de cuentas. No debe reducirse a AEO, creatividad, software ni a una lista de
servicios.

Canon: [`EFEONCE_GROUP_BUSINESS_MODEL_V1.md`](efeonce-group/EFEONCE_GROUP_BUSINESS_MODEL_V1.md).

### Capa 2 — Modelo de Growth Platform / ASaaS

Responde cómo funciona el sistema integrado:

```text
capability de entrada
→ primer valor
→ operación visible
→ renovación
→ cross-sell
→ memoria acumulada
→ expansión de cuenta
```

Esta capa explica cómo el servicio humano, el software propio, los datos, el método y el historial se
combinan para mejorar retención, margen, capacidad y expansión.

No afirma que Efeonce sea un SaaS puro. Debe demostrar qué parte escala por software y qué parte sigue
dependiendo de capacidad humana.

Canon: [`EFEONCE_GROWTH_PLATFORM_BUSINESS_MODEL_V1.md`](growth-platform/EFEONCE_GROWTH_PLATFORM_BUSINESS_MODEL_V1.md).

### Capa 3 — Modelos de capability u oferta

Una capability merece un modelo propio cuando tiene una combinación suficientemente distinta de:

- ICP o comprador;
- problema y trigger;
- propuesta de valor;
- mecanismo de entrega;
- unidad de valor y cobro;
- estructura de costos;
- riesgos contractuales o de IP;
- métricas de éxito;
- ciclo de renovación;
- ruta de expansión.

Ejemplos actuales:

| Modelo | Naturaleza | Por qué merece análisis propio |
|---|---|---|
| AEO | Wedge/capability | buyer, metodología, métricas y ruta de expansión propias |
| Search Visibility 360 | Capability/product line en construcción | combina search clásica, visibilidad generativa, data, contenido y tooling |
| Creative Studio | Capability/product line | squads, créditos, derechos, providers, autoría y modos operativos propios |
| CRM/Kortex | Capability/producto | implementación, licencias, managed ops e inteligencia tienen economics distintos |
| Greenhouse | Plataforma/control plane | habilita operación, memoria, visibilidad y switching cost; no se declara SaaS por existir |

Canon de los drafts actuales:

- [`EFEONCE_AEO_BUSINESS_MODEL_V1.md`](aeo/EFEONCE_AEO_BUSINESS_MODEL_V1.md)
- [`SEARCH_VISIBILITY_360_BUSINESS_MODEL_V1.md`](search-visibility-360/SEARCH_VISIBILITY_360_BUSINESS_MODEL_V1.md)
- [`EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`](creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md)

### Capa 4 — Packaging y variantes comerciales

No toda variante necesita un business model nuevo.

```text
AEO Business Model
├── AEO Audit
├── AEO Sprint
├── AEO On-Going
└── AEO + SEO/Content Expansion
```

Estas variantes pueden compartir el mismo modelo si mantienen la misma lógica de valor, delivery, costos y
renovación. Se documentan como packaging, tier, engagement o SOW.

Ejemplos que normalmente **no** requieren modelo separado:

- una campaña puntual;
- una landing específica;
- un tier nuevo que sólo cambia límites;
- un piloto que prueba el mismo modelo;
- una adaptación de alcance dentro del mismo delivery model.

### Capa 5 — Submodelos económicos

Un submodelo merece documento propio cuando tiene lifecycle, riesgos, owners o economía que no pueden quedar
claros dentro del modelo padre.

Ejemplos:

- Studio Credits;
- licencias y derechos de uso;
- usage-based billing;
- revenue share;
- marketplace;
- white-label;
- partnership con exclusividad;
- implementación;
- API o acceso de plataforma.

Ejemplo:

```text
Creative Studio Business Model
└── Studio Credits Credit Model
```

El submodelo hereda del modelo padre y no puede habilitar por sí solo checkout, pricing público, emisión,
spinout o transferencia de IP.

## 2. Cómo se relacionan las capas

| Pregunta | Documento que responde |
|---|---|
| ¿Qué es Efeonce? | Modelo corporativo + estrategia de compañía |
| ¿Cómo se combinan servicios, software y datos? | Growth Platform / ASaaS |
| ¿Qué compra un cliente de AEO? | AEO Business Model |
| ¿Cómo se vende un piloto o retainer? | Packaging/offer brief/SOW del modelo |
| ¿Cómo funcionan los créditos? | Credit Model específico |
| ¿Cuál es el costo real y el margen? | Finance + unit economics del modelo |
| ¿Qué derechos se transfieren? | Legal/IP + contrato de la oferta |
| ¿Qué está live en una plataforma? | Product/Architecture/runtime |
| ¿Qué puede financiarse? | Investor Readiness + Business Model Operator |

El documento más específico no puede contradecir al documento padre. Cuando una decisión cambia materialmente,
se crea una nueva versión o una decisión que la supersede.

## 3. Qué modelo debe presentar cada audiencia

### Cliente

El cliente no necesita ver toda la arquitectura interna. Debe entender:

- qué problema resolvemos;
- qué capability entra primero;
- qué compra;
- cómo se entrega;
- qué puede ver y medir;
- cómo puede expandirse.

Lenguaje recomendado: **Integrated Growth Partner**, acompañado de mecanismos concretos.

### Equipo comercial

Necesita saber:

- qué oferta está vendiendo;
- qué modelo de delivery aplica;
- qué engagement corresponde;
- qué está incluido y excluido;
- qué unidad de valor se cobra;
- qué no se debe prometer;
- qué ruta de expansión existe.

### Finance y Operations

Necesitan saber:

- qué revenue se reconoce y cuándo;
- qué costo consume margen;
- qué unidad devenga valor;
- qué se asigna a shared services;
- qué working capital y riesgo existe;
- qué métricas se pueden reconciliar.

### Inversionistas

Necesitan ver una consolidación, no una carpeta de servicios desconectados:

1. Efeonce Group como compañía.
2. Growth Platform / ASaaS como mecanismo.
3. Capabilities como puntos de entrada y expansión.
4. Plataformas e IP como activos habilitantes.
5. Submodelos y unit economics donde sean materiales.
6. Evidencia que separe servicios, software, plataforma, usage e IP.

## 4. Regla para decidir si una oferta necesita modelo propio

Crear un business model propio si cambian **al menos tres** de estas dimensiones:

- cliente o ICP;
- problema;
- propuesta de valor;
- delivery;
- unidad de valor;
- pricing;
- costos;
- riesgos;
- métrica de éxito;
- renovación;
- expansión;
- IP o datos;
- dependencia tecnológica;
- necesidad de capital.

Si cambia sólo el nombre, el formato, la pieza o el tier, mantenerlo dentro del modelo existente.

## 5. Estados y gates

| Estado | Qué significa | Qué permite |
|---|---|---|
| `Draft` | Hipótesis incompleta | investigación interna |
| `Proposed` | Lista para revisión | revisión de Strategy/Finance/Product/Legal |
| `Approved for validation` | Guardrails aprobados, evidencia pendiente | piloto gobernado |
| `Commercially approved` | Pricing, delivery, costos, contrato y controles aprobados | venta dentro del alcance |
| `Deprecated` | No usar para negocio nuevo | cierre |
| `Superseded` | Reemplazado por otra versión | consultar documento nuevo |

Todo modelo necesita gates de:

- propuesta de valor y packaging;
- delivery y accountability;
- costos, margen y revenue treatment;
- derechos, privacidad y datos;
- plataforma, ledger y runtime;
- validación comercial;
- aprobación de liderazgo.

`Approved for validation` no significa `Commercially approved`.

## 6. Qué no se debe hacer

- No crear un documento por cada pieza vendida.
- No llamar SaaS a una operación de servicios porque tiene login.
- No llamar ARR a un retainer sin definición y evidencia aprobadas.
- No mezclar Managed Squad, Staff Augmentation y `client-operated` como si fueran la misma oferta.
- No esconder costo humano dentro de credits o usage.
- No presentar plataformas internas como productos externos sin adopción, pricing y soporte demostrados.
- No crear un spinout sólo para postular a un programa.
- No transferir IP ni datos porque un modelo lo sugiera.
- No publicar márgenes, clientes, revenue o casos sin evidencia y permisos.
- No usar “Growth Operating System” como sustituto de explicar la categoría y el modelo.

## 7. Cómo se consolida el modelo para inversión

El Investor Readiness Pack debe construir un puente:

```text
modelo corporativo
→ portfolio/platform model
→ capability economics
→ evidence ledger
→ financial model consolidado
→ use of funds
→ milestones
```

La consolidación debe permitir responder:

- qué genera caja hoy;
- qué es recurrente y qué es project-based;
- qué parte depende de personas;
- qué parte escala por software, datos o método;
- qué capabilities generan expansión;
- qué margen tiene cada línea;
- qué capital acelera qué milestone;
- qué todavía es hipótesis.

## 8. Ownership

| Decisión | Owner principal | Skills/documentos relacionados |
|---|---|---|
| Doctrina corporativa | Strategy/Leadership | `efeonce-agency`, estrategia ASaaS |
| Modelo de una oferta | Strategy + práctica dueña | `efeonce-business-model-operator`, `docs/business-models/` |
| Venta y packaging creativo | Creative Practice/Commercial | `creative-practice` |
| Costos, margen y cash | Finance | `greenhouse-finance-accounting-operator` |
| Contratos, IP y privacidad | Legal/IP | `legal-privacy-ip-operator` |
| Runtime y plataforma | Product/Architecture | `software-architect-2026` + skill de dominio |
| Narrativa de capital | Leadership/Strategy | `efeonce-investor-readiness` |
| Craft de copy | Copywriting | `copywriting` + voz Efeonce |

## 9. Estado actual de Efeonce

La arquitectura está definida, pero no todos los modelos están aprobados:

- Efeonce Group: `Draft`.
- Growth Platform: `Draft`.
- AEO: `Draft`.
- Search Visibility 360: `Draft`.
- Creative Studio: `Approved for validation` según su modelo vigente.
- Studio Credits: política económica propia, sin precio público self-serve aprobado.

El siguiente trabajo no es crear más nombres. Es completar evidencia, economics, derechos, delivery y gates
de los modelos que ya tienen una razón real para existir.

## 10. Frase para explicarlo internamente

> **Efeonce tiene un modelo corporativo. Cada capability importante tiene el suyo cuando sus clientes,
> delivery, economía y riesgos cambian. Los tiers, pilotos y campañas son variantes comerciales; los créditos,
> licencias y usage son submodelos cuando tienen lifecycle propio. Todo se consolida en una sola arquitectura
> para operar, vender y levantar capital.**
