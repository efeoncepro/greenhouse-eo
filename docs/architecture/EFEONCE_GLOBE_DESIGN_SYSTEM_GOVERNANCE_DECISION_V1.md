# Efeonce Globe Design System Governance Decision V1

## Status

`Accepted` — 2026-07-19, decisión explícita del operador.

## Context

Globe ya posee una shell branded `Orbital Threshold` y comenzará a sumar workbenches creativos/operativos.
Greenhouse es el control plane del programa EPIC-028, pero su producto UI usa otra arquitectura, semántica y
historia. Confundir gobierno con herencia crearía coupling visual/técnico y diluiría la identidad Globe.

## Decision

Globe posee un Design System independiente e incremental.

| Responsabilidad | Owner |
|---|---|
| Decisions, registry metadata, lifecycle, QA gates, evidence, promotion/deprecation governance | Greenhouse |
| Selected tokens, patterns, components, compositions, motion contracts, source code and runtime | Globe |
| Product-task use case and `reuse | extend | new` proposal | Task Greenhouse; implementation/evidence Globe |

No existe herencia automática desde el Design System Greenhouse. Globe no adopta por defecto Vuexy, MUI,
CompositionShell, layouts, recipes, component APIs, surface semantics ni motion presets de Greenhouse.

Un color o asset de marca puede compartirse sólo mediante decisión token-by-token con provenance, rol
semántico y contraste verificados. Esa decisión no arrastra el resto del sistema.

## Pattern lifecycle

`candidate -> trial -> stable -> deprecated -> retired`

Cada entry `globe.*` declara versión, owner, source path, anatomy/slots, variants/states, responsive behavior,
content, accessibility, motion, consumers, evidence y migration/deprecation. Las product tasks crean patterns
cuando el use case las necesita; no se construye una biblioteca exhaustiva anticipada.

## Repository boundary

- Greenhouse conserva el registro canónico de decisiones/lifecycle/evidence y los gates de EPIC-028.
- Globe conserva source packages, Pattern Lab, fixtures runtime y releases del Design System.
- Una entry Greenhouse sin source/consumer/evidence Globe no puede promoverse a `stable`.
- Un component Globe sin entry/owner/lifecycle queda local al feature y no se presenta como reusable.

## Quality contract

La barra de calidad puede usar los mismos criterios enterprise —responsive, WCAG AA, keyboard, reduced motion,
overflow, states, GVC y regression evidence— sin copiar la solución visual de Greenhouse. Quality equivalence
no implica design inheritance.

## Consequences

- `TASK-1485` implementa registry, Pattern Lab y promotion gates.
- `TASK-1474` y `TASK-1483` quedan bloqueadas por la foundation, pero pueden proponer candidates en paralelo.
- Globe obtiene coherencia acumulativa y autonomía; Greenhouse conserva auditabilidad y control del programa.
- Existe costo explícito de mantener otro Design System; se acepta porque Globe es producto/runtime separado.

## Rejected alternatives

- Heredar Greenhouse UI y sólo cambiar colores: rechazada por coupling e identidad falsa.
- Gobernar todo dentro de Globe: rechazada porque rompe el control plane central del programa.
- Diseñar una biblioteca completa antes de features: rechazada por inventario sin consumers/evidencia.
- Compartir un package UI cross-repo por conveniencia: rechazado salvo ADR futuro con necesidad probada.

## Verification

- Registry lint bloquea IDs/versiones/owners/evidence incompletos.
- Dependency/import gate detecta UI cross-system no aprobada.
- Pattern Lab y consumers validan desktop/mobile, keyboard, a11y, reduced motion y visual regression.
- Cada shared color/token conserva decision/provenance independiente.

## Supersession

Una futura decisión puede autorizar un primitive compartido específico. Debe nombrar su owner, API,
versioning, blast radius y migration; no modifica por inferencia la regla general de no inheritance.
