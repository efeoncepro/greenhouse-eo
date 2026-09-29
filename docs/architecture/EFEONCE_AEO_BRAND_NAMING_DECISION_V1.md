# ADR — Efeonce AEO: nombre de la capacidad y sus superficies

- **Status:** Accepted
- **Date:** 2026-09-29
- **Owner:** Efeonce Brand / Growth / Product / GTM
- **Scope:** nomenclatura de la capacidad AEO, diagnóstico público, informe y relación con Search Visibility 360; documentación, skills y futuras superficies visibles. No cambia `growth.ai_visibility`, scoring, datos, rutas ni entitlements.
- **Reversibility:** two-way-but-slow. Los rótulos documentales se pueden cambiar; una vez distribuidos en campañas, informes y enlaces, el cambio tendrá inercia de marca y SEO.
- **Confidence:** high para la decisión de arquitectura de marca; medium para copy y adopción de cada superficie, que requieren verificación al publicarse.
- **Validated as of:** 2026-09-29. Decisión explícita del operador; contrastada con la arquitectura del grader, el módulo SEO y el glosario de AEO. No es una verificación de despliegue ni de disponibilidad legal de nombres.

## Context

El motor AEO de Greenhouse aparece en documentos y código como **AI Visibility Grader**, **Brand Visibility Grader** o **AEO Grader**. Son nombres comprensibles para encontrar el trabajo previo y los contratos técnicos, pero no había un nombre comercial formal que acumulara reconocimiento para Efeonce. **Search Visibility 360** ya nombra la oferta más amplia que reúne SEO y AEO. La metodología **Surround Discovery** existe en documentación previa, pero el operador no quiere depender de que el mercado la conozca antes de entrar por AEO.

El diagnóstico público expone cómo aparece y se describe una marca en respuestas de IA, qué competidores ocupan ese espacio y qué fuentes sostienen las respuestas. Su papel comercial es abrir una conversación sobre visibilidad de marca y, cuando corresponde, conducir a un servicio más amplio. La relación comercial y la atribución de marca pertenecen a Efeonce.

La [consulta de demanda con la CLI gobernada de DataForSEO](../research/2026-09-29-efeonce-aeo-naming-keyword-signal.md) del 2026-09-29 (Google/es, Chile y México) mostró que `AEO` y `GEO` son señales de categoría ambiguas: las búsquedas relacionadas de `aeo` en México se mezclan con American Eagle. Por eso la sigla orienta la categoría, mientras la masterbrand y un descriptor claro explican la capacidad; el volumen bruto de la sigla no es evidencia de reconocimiento de Efeonce.

## Decision

1. **Efeonce AEO** es el nombre canónico de la **capacidad** de Efeonce para visibilidad y optimización de marca en respuestas y búsqueda con IA. Se escribe con la masterbrand al frente; `AEO` funciona como señal de categoría. No es una product brand independiente ni reemplaza a Efeonce como relación comercial.
2. **Efeonce AEO Assessment** es el nombre destinado al **diagnóstico público**. `Assessment` describe la experiencia y no crea una segunda marca. Hasta que el copy y el runtime se actualicen y verifiquen, los rótulos hoy publicados deben describirse como estado actual, no como si esta decisión ya estuviera desplegada.
3. **Efeonce AI Visibility Report** es el nombre destinado al **entregable compartible** del diagnóstico. El informe debe mantener atribución clara a Efeonce y conservar el contrato técnico de reporte vigente.
4. **Search Visibility 360** conserva su significado como oferta/capa más amplia de SEO y AEO. Un assessment AEO puede ser su puerta de entrada; no renombra el módulo `growth.seo` ni fusiona mediciones SEO y AEO.
5. En el glosario interno vigente, **AEO = AI Engine Optimization**. En comunicación externa se puede usar la sigla con una explicación clara de la capacidad —visibilidad de marca en búsqueda y respuestas de IA— sin exigir al prospecto conocer una expansión particular de la sigla. No prometer presencia, citación, tráfico ni brand lift garantizados.
6. **AI Visibility Grader**, **Brand Visibility Grader** y **AEO Grader** se preservan como aliases históricos o técnicos para búsqueda, trazabilidad, rutas, identificadores, runbooks y evidencia previa. **Surround Discovery Audit** se conserva como propuesta/metodología histórica donde esté documentada; no se usa como requisito de comprensión del diagnóstico público. Un alias no se transforma por esta decisión en una oferta vigente separada.

Esta decisión **actualiza únicamente la cláusula de naming** del ADR [`GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md`](GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md). Sus decisiones de arquitectura, source of truth, acceso y runtime permanecen vigentes. El ADR de [`Search Visibility 360`](GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md) también permanece vigente.

## Alternatives considered

- **Mantener AI Visibility Grader o AEO Grader como nombre formal:** explica la función, pero no pone a Efeonce en cada mención o informe y se parece a nomenclatura genérica de la categoría.
- **Lanzar una marca nueva para el diagnóstico:** exigiría crear y sostener recuerdo adicional antes de que el prospecto conecte la experiencia con Efeonce.
- **Liderar con Surround Discovery:** presupone reconocimiento de una metodología que todavía no está posicionada como puerta de entrada.
- **Llamar Search Visibility 360 al assessment:** confundiría un diagnóstico AEO puntual con el alcance SEO+AEO de la oferta amplia.

## Consequences

- Cada superficie nueva o revisada debe mostrar **Efeonce AEO** como capacidad y usar *Assessment* o *Report* solo según el artefacto concreto. La masterbrand acumula la atribución.
- Los títulos, CTAs, metadata, informes y piezas comerciales requieren una migración editorial y QA de cada runtime; **este ADR no ejecuta esa migración** ni demuestra que un rótulo esté publicado.
- Los identificadores internos (`growth.ai_visibility`, `grader_*`, rutas `/ai-visibility/`, IDs de formularios) y los enlaces históricos **no se renombran** por una decisión de naming. Cambiarlos requeriría una decisión técnica, compatibilidad y rollout propios.
- La evidencia anterior conserva sus nombres y fechas. Los documentos vivos agregan un puntero a esta decisión en vez de reescribir la historia.
- El nombre no constituye prueba de brand lift. Ese efecto requiere medición de atribución/recuerdo, branded search y calidad de demanda con baseline y periodo comparables.

## Runtime contract

Esta es una decisión de **nomenclatura y arquitectura de marca**, no un cambio de runtime. El motor y los contratos actuales siguen definidos por [`GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`](GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md), [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) y el código vigente. La fuente de verdad del nombre comercial para trabajo futuro es este ADR. Cada implementación de copy debe verificar la superficie publicada antes de declarar que la nueva nomenclatura está activa.

## Revisit when

- Una prueba de comprensión con prospectos muestre que `AEO` junto a Efeonce impide entender la promesa incluso con descriptor claro.
- Una búsqueda de disponibilidad marcaria o un conflicto real obligue a modificar el nombre.
- La capacidad evolucione materialmente más allá de visibilidad/optimización en respuestas y búsqueda con IA, o la arquitectura de la oferta SEO+AEO cambie.
- La medición de atribución de marca demuestre que otra arquitectura de naming transfiere mejor reconocimiento a Efeonce.
