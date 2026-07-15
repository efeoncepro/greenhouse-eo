# Creative Workflows — Pillar + Cluster Brief V1

> **Estado:** V4 editorial, visual, SEO y E-E-A-T publicada en WordPress `251363`; contenido, fuentes,
> caso SKY, entidad de autor, render desktop/mobile, canonical y Open Graph pasan readback — 2026-07-15.
> **Decisión de producto:** [PDR-014](decisions/PDR-014-creative-workflows-territorio-editorial-pillar-cluster.md).
> **Evolución del conocimiento:** [Creative Workflows Knowledge-to-Product Ladder V1](CREATIVE_WORKFLOWS_KNOWLEDGE_TO_PRODUCT_LADDER_V1.md).
> **Doctrina fuente:** [RESEARCH-009](../research/RESEARCH-009-creative-operations-agentic-workflows.md).
> **Research de publicación:** [Creative Workflows Pillar Research Dossier V1](CREATIVE_WORKFLOWS_PILLAR_RESEARCH_DOSSIER_V1.md).
> **Spec inicial del post privado:** [Creative Workflows Pillar Gutenberg Spec V1](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V1.json).
> **Spec editorial vigente:** [Creative Workflows Pillar Gutenberg Spec V4](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V4.json).
> **Contrato de reescritura:** [Creative Workflows Pillar Editorial Rewrite V2](CREATIVE_WORKFLOWS_PILLAR_EDITORIAL_REWRITE_V2.md).
> **Auditoría editorial:** [Creative Workflows Pillar Editorial Audit V2](CREATIVE_WORKFLOWS_PILLAR_EDITORIAL_AUDIT_V2.md).
> **Sistema visual:** [Creative Workflows Pillar Visual System V1](CREATIVE_WORKFLOWS_PILLAR_VISUAL_SYSTEM_V1.md).
> **Auditoría visual:** [Creative Workflows Pillar Visual Audit V1](CREATIVE_WORKFLOWS_PILLAR_VISUAL_AUDIT_V1.md).
> **Auditoría WordPress/SEO:** [Creative Workflows Pillar WordPress + SEO Audit V3](CREATIVE_WORKFLOWS_PILLAR_WORDPRESS_SEO_AUDIT_V3.md).
> **Auditoría E-E-A-T vigente:** [Creative Workflows Pillar E-E-A-T Audit V4](CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md).
> **Evidencia V1 histórica:** [inspección profunda inicial del post 251363](../operations/public-site-content-factory/post-deep-inspection-251363-2026-07-15T05-25-14+00-00.json).
> **Superficie comercial hermana:** [PDR-004 — Agencia Creativa](decisions/PDR-004-landing-agencia-creativa-posicionamiento.md).
> **Idiomas:** primera versión en español LATAM neutro; arquitectura preparada para localización futura.
> **Owner editorial:** Efeonce / Think / Marketing con Manzanitas.
> **Autor inicial:** Julio Reyes (`WordPress author_id=1`).
> **Frontera:** este brief produce contenido y evidencia editorial. No produce workflows ejecutables ni
> autoriza implementación de Creative Studio.

---

## 1. Resumen ejecutivo

| Campo | Decisión |
|---|---|
| **Territorio** | Creative Workflows |
| **Pieza ancla** | Pillar educativa evergreen |
| **Objetivo de negocio** | Autoridad, creación de categoría, educación de demanda e influencia comercial |
| **Funnel** | Top/mid-funnel; handoff suave a Agencia Creativa |
| **Audiencia primaria** | Líderes de Marketing, Marca, Contenido, Producción y Creatividad con presión de escala |
| **Audiencia secundaria** | Creativos, productores y operadores que incorporan IA sin perder craft ni autoría |
| **Awareness** | Problem-aware / solution-aware; baja claridad de categoría |
| **Gran idea** | Un Creative Workflow es un sistema de decisiones creativas humanas vuelto ejecutable |
| **Promesa** | Escalar la producción creativa sin automatizar el criterio |
| **Compromiso** | Automatizar la repetición, ampliar la exploración y preservar el juicio humano |
| **Conversión** | Continuar aprendiendo dentro del cluster; después, conversar sobre la operación creativa |
| **Estado** | V4 publicada en `https://efeoncepro.com/creative/creative-workflows/`: 111 bloques, tres imágenes, fuentes primarias inline, caso SKY, límites metodológicos, perfil autoral, canonical, render desktop/mobile, Yoast SEO y Open Graph verificados; los satélites y research continuo siguen en roadmap |
| **Relación con producto** | Soporte científico/editorial para Creative Studio futuro; puede madurar a ebook/workbook y, con iniciativa separada, a una tool diagnóstica; no crea backlog ni product spec |

La Pillar debe poder educar a alguien que nunca ha oído el término, ser suficientemente precisa para que una
persona experta la cite y conducir a una decisión práctica sin convertirse en manual de software ni landing de
producto.

### Frontera editorial y de producto

Este programa de contenido precede a la implementación operativa. Su trabajo es construir una base pública y
rigurosa para Creative Studio: definir el problema, ordenar la evidencia, contrastar categorías, formular
principios, revelar preguntas de equipos creativos y probar qué ideas ayudan a comprender el producto.

No diseña ni crea los Creative Workflows que correrán en Creative Studio. En particular:

- Una sección del artículo no es una feature.
- Un satélite no es una task.
- Un diagrama no es un DAG ni una arquitectura de runtime.
- Un checklist o “template” editorial no es un template ejecutable.
- Una respuesta favorable de audiencia no reemplaza fixtures, evals, review humana ni evidencia de producto.

El flujo correcto es:

```text
investigación científica y de mercado
  -> síntesis editorial pública
  -> preguntas, lenguaje y señales de audiencia
  -> hipótesis de producto en RESEARCH-009
  -> validación empírica y decisión de arquitectura
  -> task formal de EPIC-028 en el repositorio de Creative Studio
  -> implementación operativa futura
```

La retroalimentación puede viajar del contenido al producto y del producto al contenido, pero cada capa
conserva su propia fuente de verdad y sus gates.

En paralelo, el sistema editorial puede madurar por la escalera `Pillar -> satélites -> ebook/workbook -> tool
diagnóstica -> Creative Studio`. El ebook exige método y valor nuevos; la tool exige PDR, modelo, privacidad,
evals, analytics y task propia. Ver el
[Knowledge-to-Product Ladder](CREATIVE_WORKFLOWS_KNOWLEDGE_TO_PRODUCT_LADDER_V1.md).

## 2. Content-market fit

### El problema que el lector ya siente

- La demanda de piezas, formatos y variantes crece más rápido que la capacidad del equipo.
- Las herramientas de IA multiplican producción, pero también archivos, decisiones, costos y riesgo de marca.
- El conocimiento del proceso vive en personas, chats, prompts y hábitos difíciles de transferir.
- Marketing quiere autonomía; el equipo creativo teme que “automatizar” signifique perder criterio o control.
- Un flujo diseñado como diagrama técnico exige que el creativo piense como ingeniero para poder usarlo.

### La categoría que proponemos

**Creative Workflow** no es sinónimo de automatización creativa. Es la infraestructura que conserva intención,
contexto, decisiones y evidencia alrededor de un acto creativo humano, y permite que lo repetible se ejecute de
forma gobernada.

La secuencia canónica es:

```text
intención
  -> exploración divergente
  -> decisión creativa humana
  -> producción convergente gobernada
  -> revisión humana
  -> entrega + aprendizaje reutilizable
```

### El aporte que Efeonce puede poseer

1. **El workflow no es la primera interfaz.** La persona creativa trabaja con brief, referencias, variantes,
   descartes, intensidad y aprobación; el sistema traduce esas acciones a una receta ejecutable.
2. **Hay dos velocidades.** La exploración necesita divergencia y ambigüedad; la producción necesita control,
   repetibilidad y trazabilidad. Mezclarlas demasiado pronto produce homogeneidad.
3. **Builder y Runner son grados de autoridad creativa.** No equivalen a ingeniero y usuario ni obligan a
   revelar grafos, providers o secretos operativos.
4. **La autonomía es progresiva.** Managed, co-operated y client-operated son asignaciones de control según
   ambigüedad, repetibilidad, riesgo y evidencia.
5. **La velocidad no basta.** TTM, FTR, RpA y OTD deben convivir con diversidad, escalamiento humano, costo,
   derechos y calidad de la decisión.

### El enemigo conceptual

La promesa pobre es **“más contenido, más rápido”**. Convierte la creatividad en throughput y a la IA en una
máquina de variaciones parecidas. La postura Efeonce es: **más capacidad para explorar, decidir y producir con
intención**.

### Naturaleza de la apuesta

Este territorio es primero una apuesta de **category creation + thought leadership**. Puede capturar demanda
existente, pero todavía no se ha medido el volumen ni la intención de `creative workflows`, `flujo de trabajo
creativo` y términos vecinos en mercados hispanohablantes. No se usarán volúmenes ni forecasts hasta completar
esa investigación.

## 3. Audiencias y JTBD

| Segmento | Situación | Tensión | Qué necesita de la Pillar |
|---|---|---|---|
| **CMO / Director de Marketing** | El plan exige más campañas y canales sin crecer al mismo ritmo | Velocidad vs control de marca | Entender el modelo, riesgo, modos de operación y resultado |
| **Creative Director / Head of Content** | Su criterio se volvió cuello de botella y conocimiento tácito | Escala vs craft/autonomía | Ver cómo preservar decisiones y empaquetar producción sin rigidizar la exploración |
| **Brand / Marketing Operations** | Coordina herramientas, aprobaciones y versiones fragmentadas | Gobernanza vs agilidad | Ver trazabilidad, roles, gates, medición y excepciones |
| **Diseñador / copywriter / productor** | Usa IA, pero recibe procesos diseñados desde tecnología | Ayuda vs pérdida de agencia | Reconocerse en la interfaz y entender qué sigue bajo control humano |
| **Ingeniería / automatización** | Puede conectar sistemas, pero no posee el criterio creativo | Ejecución vs significado | Entender contratos, límites y escalamiento sin decidir la dirección |

### JTBD principal

> Cuando la demanda de contenido supera la capacidad de mi equipo, ayúdame a estructurar y escalar la
> producción con IA sin perder calidad, control de marca, derechos ni criterio creativo.

### JTBD secundarios

- Cuando un proceso depende demasiado de una persona, ayúdame a volver transferible lo repetible sin codificar
  su sensibilidad como una lista rígida.
- Cuando Marketing necesita autonomía, ayúdame a decidir qué templates puede operar y cuándo debe escalar a
  dirección creativa.
- Cuando incorporo IA, ayúdame a distinguir exploración, producción, revisión y aprobación para no automatizar
  la decisión equivocada.

### Preguntas que deben quedar resueltas

- ¿Qué es exactamente un Creative Workflow?
- ¿En qué se diferencia de usar una herramienta de IA o automatizar tareas?
- ¿Qué gana un creativo y qué control conserva?
- ¿Qué puede operar Marketing sin transformarse en un equipo técnico?
- ¿Qué parte debe seguir siendo humana?
- ¿Cómo se implementa, gobierna y mide?
- ¿Cuándo conviene operación managed, co-operated o client-operated?

## 4. Especificación de la Pillar

### Metadata de trabajo

- **H1 / título:** *Creative Workflows: cómo escalar la creatividad sin automatizar el criterio*.
- **SEO title aplicado:** *Creative Workflows: qué son y cómo funcionan - Efeonce*.
- **Slug/permalink privado:** `/creative/creative-workflows/`.
- **Meta description aplicada:** *Descubre qué es un Creative Workflow, cómo combina creatividad humana, IA y
  automatización, y qué decisiones deben permanecer en manos de las personas.*
- **Excerpt aplicado:** *Un Creative Workflow convierte decisiones creativas humanas en un sistema ejecutable
  para explorar, producir, revisar y aprender sin automatizar el criterio.*
- **Pregunta canónica:** *¿Qué es un Creative Workflow y cómo permite escalar la creatividad sin automatizar
  el criterio?*
- **Formato:** guía Pillar, answer-first, con índice y H2/H3 anclados.
- **Extensión orientativa:** 3.500–5.000 palabras; manda la cobertura de intención, no el conteo.
- **Freshness:** revisión trimestral y refresh extraordinario ante cambios materiales en proveedores, derechos,
  modos de operación o evidencia Efeonce.

### Answer capsule principal

> Un Creative Workflow es un sistema de decisiones creativas humanas vuelto ejecutable. Conecta intención,
> exploración, criterio, producción, revisión y aprendizaje para automatizar lo repetible sin delegar a la
> máquina qué merece ser creado, descartado o aprobado.

### Resultado para el lector

Al terminar, el lector puede dibujar un proceso creativo real, separar exploración de producción, identificar
qué automatizar, asignar autoridad humana y elegir un primer workflow acotado para probar.

### Estructura editorial

| Orden | Sección | Trabajo de la sección | Profundización |
|---:|---|---|---|
| 0 | **Apertura: producir más no es crear mejor** | Partir de la tensión real, no de la tecnología | Sin link antes de establecer el problema |
| 1 | **Qué es un Creative Workflow** | Respuesta canónica, modelo y ejemplo simple | CW-02 para límites de categoría |
| 2 | **Por qué aparece ahora** | Demanda multicanal + IA + fragmentación + presión de escala | Evidencia de mercado con fecha |
| 3 | **No es solo automatización: tres niveles** | Operación, aumentación cognitiva y orquestación creativa | CW-01 y CW-03 |
| 4 | **Cómo funciona: dos velocidades y seis momentos** | Exploración divergente; producción convergente; loop completo | CW-07 |
| 5 | **Qué hace el sistema y qué decide una persona** | Frontera práctica con ejemplos y gates | CW-03 y CW-09 |
| 6 | **Cómo lo usa un creativo sin pensar como ingeniero** | Acciones creativas visibles; compilación invisible de la receta | CW-04 y CW-10 |
| 7 | **Builder, Runner y tres modos de operación** | Autoridad, autonomía progresiva y accountability | CW-05 y CW-08 |
| 8 | **Cómo se mide sin reducir creatividad a throughput** | Eficiencia + calidad + diversidad + riesgo | CW-06 |
| 9 | **Riesgos: fijación, homogeneidad, derechos y control** | Mostrar límites, mitigaciones y señales de escalamiento | CW-07, CW-09 y CW-11 |
| 10 | **Cómo empezar con un primer workflow** | Selección de caso, mapeo, piloto, review y graduación | CW-04 y CW-12 |
| 11 | **Preguntas frecuentes** | Resolver objeciones recuperables por búsqueda y LLM | Links solo cuando agregan profundidad |
| 12 | **Cierre: automatizar lo repetible para potenciar lo irrepetible** | Síntesis + próximo paso editorial/comercial | CTA gradual |

### Límite de profundidad

La Pillar explica cada concepto hasta que el lector puede usar el mapa, pero no intenta agotar todos los temas.
Neurociencia, comparación de categorías, métricas, derechos, Builder/Runner, templates, agentes y modos de
operación se resumen con precisión y continúan en sus satélites. Esto evita una enciclopedia imposible de citar
y permite que cada pregunta profunda tenga una URL propia.

## 5. Mapa de satélites

### Ola 1 — Fundamentos y adopción

| Prioridad provisional | ID | Título de trabajo | Intención | Entregable para el lector | Evidencia obligatoria |
|---:|---|---|---|---|---|
| 1 | CW-03 | **Qué automatizar en un proceso creativo y qué debe seguir siendo humano** | Práctica / decisión | Matriz repetición-exploración-juicio + señales de escalamiento | Ejemplos operativos y límites explícitos |
| 2 | CW-02 | **Creative Workflow vs Creative Operations vs Content Supply Chain** | Definición / comparación | Mapa de términos, alcances y cuándo usar cada uno | Fuentes primarias de cada categoría |
| 3 | CW-01 | **Automatización y creatividad: qué cambia en el cerebro cuando externalizamos la operación** | Educativa / científica | Modelo de carga, atención, asociación y criterio sin neuromitos | Papers y revisiones primarias; revisión experta si hay claims fuertes |
| 4 | CW-04 | **Cómo implementar Creative Workflows en equipos creativos y de marketing** | How-to / consideración | Método de diagnóstico, piloto y adopción por roles | Caso ilustrativo + checklist accionable |

### Ola 2 — Sistema operativo creativo

| Prioridad | ID | Título de trabajo | Intención | Entregable para el lector | Evidencia obligatoria |
|---:|---|---|---|---|---|
| 5 | CW-05 | **Builder y Runner: cómo repartir autoridad sin convertir al creativo en ingeniero** | Diseño operativo | Matriz de permisos, inputs y excepciones | RESEARCH-009 + ejemplo de receta |
| 6 | CW-06 | **Cómo medir un Creative Workflow sin medir solo volumen** | Evaluación | Scorecard con TTM, FTR, RpA, OTD, diversidad, costo y escalamiento | Definiciones, fórmulas y limitaciones |
| 7 | CW-07 | **Cómo usar IA sin homogeneizar la creatividad** | Riesgo / craft | Patrones contra fijación y convergencia prematura | Literatura de creatividad + experimentos/pilotos verificables |
| 8 | CW-08 | **Creative Workflows managed, co-operated y client-operated** | Modelo operativo | Árbol de decisión según ambigüedad, riesgo y repetibilidad | Fronteras comerciales y accountability vigentes |

### Ola 3 — Gobierno, tecnología y prueba

| Prioridad | ID | Título de trabajo | Intención | Entregable para el lector | Evidencia obligatoria |
|---:|---|---|---|---|---|
| 9 | CW-09 | **Derechos, trazabilidad y gobierno de marca en Creative Workflows** | Enterprise / riesgo | Checklist de lineage, licencias, policy y aprobación | Fuentes legales/policy vigentes; revisión humana |
| 10 | CW-10 | **Cómo convertir un proceso creativo en un template reutilizable** | How-to avanzado | Anatomía de una receta: invariantes, variables, límites y fallback | Ejemplo no confidencial probado |
| 11 | CW-11 | **Qué pueden hacer los agentes de IA dentro de un Creative Workflow** | Tecnología / decisión | Mapa de roles, autonomía y escalamiento | Docs primarias de providers + arquitectura Efeonce sin anunciar disponibilidad |
| 12 | CW-12 | **Del piloto al sistema: aprendizajes de Creative Workflows en Efeonce** | Prueba / decisión | Caso con hipótesis, fallos, métricas y graduación | Datos reales, tamaño de muestra, fecha y permisos de publicación |

La prioridad es provisional. Search research, preguntas de clientes y evidencia operativa pueden reordenarla.
No se abre una ola completa si las piezas anteriores todavía no tienen señal, fuentes o distribución.

## 6. Arquitectura de enlaces

| Desde | Hacia | Anchor orientativo | Relación lateral útil |
|---|---|---|---|
| Pillar §3 | CW-01 | `automatización, carga cognitiva y creatividad` | CW-01 → CW-03 |
| Pillar §1 | CW-02 | `diferencias entre Creative Workflow, Creative Operations y Content Supply Chain` | CW-02 → CW-04 |
| Pillar §5 | CW-03 | `qué automatizar y qué debe seguir siendo humano` | CW-03 → CW-01 y CW-09 |
| Pillar §6/10 | CW-04 | `cómo implementar un Creative Workflow` | CW-04 → CW-05 y CW-10 |
| Pillar §7 | CW-05 | `Builder y Runner` | CW-05 → CW-10 |
| Pillar §8 | CW-06 | `cómo medir un Creative Workflow` | CW-06 → CW-07 |
| Pillar §4/9 | CW-07 | `evitar la homogeneización creativa` | CW-07 → CW-06 |
| Pillar §7 | CW-08 | `managed, co-operated y client-operated` | CW-08 → CW-09 |
| Pillar §5/9 | CW-09 | `derechos y gobierno de marca` | CW-09 → CW-08 y CW-11 |
| Pillar §6 | CW-10 | `convertir un proceso en un template reutilizable` | CW-10 → CW-05 |
| Pillar §9 | CW-11 | `agentes dentro de Creative Workflows` | CW-11 → CW-09 |
| Pillar §10 | CW-12 | `aprendizajes de pilotos reales` | CW-12 → CW-04 y CW-06 |

### Reglas

- Todo satélite enlaza la Pillar en el primer tercio cuando define el concepto madre.
- La Pillar solo enlaza piezas ya publicadas; no crea destinos vacíos.
- Los anchors describen la pregunta, no repiten mecánicamente la misma keyword.
- Un satélite no intenta rankear por la definición genérica de `Creative Workflow`.
- El enlace comercial aparece cuando el lector ya entiende el problema; no interrumpe la respuesta.
- Una pieza pública tiene una sola canonical aunque WordPress participe en authoring y Think en distribución.

## 7. SEO y AEO

### Entidades y términos candidatos

- `creative workflow` / `creative workflows`
- `flujo de trabajo creativo`
- `automatización creativa`
- `creative operations`
- `content supply chain`
- `IA generativa para equipos creativos`
- `producción creativa a escala`
- `workflow de marketing`

La muestra SERP de 2026-07-15 confirma intención fragmentada y una oportunidad de categoría, pero no aporta
volúmenes. `Creative Workflows` queda como entidad principal de trabajo y `flujo de trabajo creativo` como
definición/variante española; la asignación final se revisa antes de indexar.

### Research previo a publicación

1. Medir demanda y dificultad por país prioritario en español; no extrapolar solo desde Chile.
2. Inspeccionar SERP e intención para términos en inglés y español: informacional, software, jobs o servicios.
3. Identificar preguntas, comparaciones, videos y fuentes dominantes en Google/Bing y motores de respuesta.
4. Revisar GSC y contenido existente de Efeonce para evitar canibalización.
5. Definir keyword primaria, variantes, SEO title, H1, slug y taxonomía con la evidencia.
6. Resolver canonical Think/WordPress y redirects antes de indexar.
7. Guardar fecha, mercado y fuente de toda cifra en un claim ledger editorial.

### Requisitos AEO de la pieza

- Respuesta directa bajo cada H2 antes de desarrollar el argumento.
- Definiciones estables, listas y tablas solo cuando mejoran recuperación y comprensión.
- Autor y revisor visibles, fecha de actualización real y fuentes primarias próximas al claim.
- Ejemplos originales de Efeonce claramente separados de evidencia general.
- `Article` y `BreadcrumbList` según el runtime; `FAQPage` solo si las preguntas y respuestas son visibles y el
  schema sigue siendo pertinente al momento de publicar.
- Índice con anclas reales; el H1 pertenece al título del post y no se duplica dentro de Gutenberg.
- Extractos autocontenidos que mantengan sentido cuando un buscador o LLM recupere un solo párrafo.

### Preguntas candidatas para el FAQ

- ¿Qué es un Creative Workflow?
- ¿En qué se diferencia de una automatización?
- ¿Un Creative Workflow reemplaza a los creativos?
- ¿Qué partes de un proceso creativo se pueden automatizar?
- ¿Necesito un equipo de ingeniería para usarlo?
- ¿Cómo sé si un proceso está listo para convertirse en workflow?
- ¿Cómo se mide su calidad?
- ¿Qué diferencia hay entre operación managed, co-operated y client-operated?

## 8. Plan de evidencia y fuentes

| Capa | Qué debe probar | Fuente preferida |
|---|---|---|
| **Doctrina Efeonce** | Definición, dos velocidades, Builder/Runner, autonomía progresiva | RESEARCH-009 + ADR/arquitectura de Creative Studio |
| **Mercado** | Cómo proveedores y organizaciones nombran/operan el problema | Documentación primaria de Adobe, IBM, Google, Magnific, ComfyUI, Anthropic y otros vigentes |
| **Neurociencia** | Carga cognitiva, atención, asociación, control ejecutivo, fijación e incubación | Papers originales, revisiones sistemáticas y textos académicos; no notas comerciales |
| **Operación** | TTM, FTR, RpA, OTD, costos, escalamiento y diversidad | Datos Efeonce con definición, período, tamaño de muestra y permiso |
| **Derechos/gobierno** | Licencias, provenance, policy y responsabilidad | Términos y documentación legal vigente; revisión especializada para claims jurídicos |

### Disciplina de claims

- Distinguir dato, inferencia, hipótesis y postura editorial.
- Toda cifra lleva fuente y `as-of`; una cifra sin contexto se elimina.
- No convertir correlación neurocientífica en receta causal de productividad.
- No afirmar que un provider conserva derechos, privacidad o indemnidad sin revisar sus términos actuales.
- No usar “probado por Efeonce” con `n=1` sin explicitar que es un piloto.
- Creative Studio puede aparecer como dirección y arquitectura, nunca como producto disponible si todavía no lo
  está.

## 9. Conversión y CTA

### Escalera de CTA

1. **Educativo, dentro de la pieza:** continuar al satélite relevante según el problema del lector.
2. **Relacional:** suscribirse a Glitch cuando la ruta y el consentimiento estén verificados.
3. **Comercial, al cierre:** *Conversemos sobre tu operación creativa* → mecanismo gobernado de reunión con
   atribución; fallback a contacto vigente.

Copy de apoyo de trabajo:

> Si tu equipo ya tiene criterio pero la operación no escala, podemos mapear dónde se pierde capacidad y qué
> parte del proceso está lista para convertirse en workflow.

No se ofrece acceso a Creative Studio, demo ficticia ni diagnóstico automatizado inexistente. La conversación
comercial aterriza en la capacidad Agencia Creativa de PDR-004.

Un CTA a ebook o tool solo se incorpora cuando el activo exista, tenga consentimiento/atribución gobernados y
pase su gate. No se abre waitlist ficticia para validar interés.

## 10. Medición

### Scorecard del territorio

| Dimensión | Señales |
|---|---|
| **Descubrimiento** | Consultas no-brand, impresiones, posición, CTR, entradas y cobertura por país |
| **AEO/autoridad** | Presencia, mención y citación en un panel estable de preguntas; calidad de la atribución |
| **Comprensión** | Scroll útil, interacción con índice, retorno, navegación Pillar↔satélite y consumo de diagramas |
| **Conversión** | Suscripciones, reuniones, oportunidades e ingresos influenciados con source/campaign gobernados |
| **Topical system** | Satélites publicados, enlaces válidos, canibalización, freshness y cobertura de intenciones |
| **Reutilización** | Átomos publicados, uso por ventas, formación interna y menciones ganadas |
| **Madurez del conocimiento** | Preguntas recurrentes, cobertura del cluster, ejercicios útiles y evidencia suficiente para evaluar un ebook o diagnóstico |

No se fijan metas absolutas antes de tener baseline. La primera revisión compara indexación, recuperación y
comportamiento; la segunda decide qué satélite merece inversión. Tráfico sin citación, navegación ni influencia
no valida por sí solo el territorio.

### Panel inicial de preguntas AEO

- ¿Qué es un Creative Workflow?
- ¿Cómo escalar la producción creativa con IA sin perder calidad?
- ¿Qué tareas creativas se deben automatizar?
- ¿Cuál es la diferencia entre Creative Operations y Content Supply Chain?
- ¿Cómo evitar que la IA vuelva genérico el contenido de una marca?
- ¿Cómo implementar IA en un equipo creativo?
- ¿Cómo medir un workflow creativo?
- ¿Cuándo conviene operar un workflow con una agencia?

El panel debe registrar motor/modelo, fecha, país/idioma, respuesta, fuentes citadas y presencia Efeonce. No se
compara una captura aislada contra otra como si fuera una métrica estable.

## 11. Atomización planificada

| Derivado | Pieza | Fuente dentro de la Pillar | Trabajo |
|---|---|---|---|
| **Diagrama propietario** | El loop de seis momentos y dos velocidades | §4 | Asset citable y reutilizable |
| **Carrusel LinkedIn** | “Automatizar lo repetible no es automatizar la creatividad” | §1–5 | Crear categoría |
| **Post POV** | “Más contenido, más rápido es una promesa insuficiente” | Enemigo conceptual | Conversación y postura |
| **Glitch** | Edición editorial con tesis + caso breve | Pillar completa | Nurturing |
| **Video corto 1** | Qué es un Creative Workflow en 60–90 s | Answer capsule | Awareness |
| **Video corto 2** | Dos velocidades: explorar y producir | §4 | Educación visual |
| **Video corto 3** | Qué decide la persona y qué ejecuta el sistema | §5 | Desactivar miedo |
| **Lámina comercial** | Intención → exploración → decisión → producción → review → aprendizaje | Modelo canónico | Enablement sin convertir la Pillar en pitch |
| **Checklist** | ¿Está tu proceso listo para convertirse en workflow? | §10 | Utilidad y futuro lead magnet, solo tras validar demanda |
| **FAQ social** | Ocho respuestas autocontenidas | §11 | Distribución sostenida |

Cada átomo enlaza o atribuye la pieza canónica cuando el canal lo permite. La atomización adapta formato y
contexto; no publica el mismo extracto sin edición en todos los canales.

### Evolución a activos de mayor orden

Ebook y tool no son átomos. Resuelven trabajos nuevos y se evalúan por gates distintos:

| Activo | Trabajo | Estado | Gate |
|---|---|---|---|
| **Ebook/workbook** | Convertir el cluster en método enseñable con modelos, casos y ejercicios | Dirección futura | Cobertura suficiente, preguntas recurrentes, promesa propia y revisión experta |
| **Creative Workflow Opportunity Mapper** | Priorizar qué workflow abordar primero y qué decisiones conservar humanas | Hipótesis de tool | PDR propio, modelo explicable, evals, privacidad, analytics y utilidad sin venta |
| **Creative Studio** | Operar y escalar workflows reales | Producto futuro separado | Arquitectura, rollout y evidencia propia de producto |

El contrato completo está en
[Creative Workflows Knowledge-to-Product Ladder V1](CREATIVE_WORKFLOWS_KNOWLEDGE_TO_PRODUCT_LADDER_V1.md).

## 12. Distribución

- **Owned:** Think/Marketing con Manzanitas, Glitch, LinkedIn de Efeonce y vocerías, enablement comercial.
- **Earned:** conversaciones con líderes creativos, partners y comunidades cuando exista una idea o dato que
  merezca ser citado; no outreach genérico.
- **Paid:** solo después de observar qué ángulo logra atención cualificada de forma orgánica.
- **Sales:** usar Pillar o satélite como educación previa a la reunión; la landing Agencia Creativa conserva el
  trabajo de conversión.
- **Internal enablement:** Creative, Growth, Ventas e Ingeniería comparten la misma definición y frontera.

## 13. Flujo de producción

Este es el flujo de producción **editorial** de la Pillar y sus satélites. No es el lifecycle de una Creative
Run ni el plan de implementación de Creative Studio.

### Paso 1 — Research de publicación

- Ejecutar keyword/intent/SERP research.
- Actualizar fuentes primarias del mercado.
- Construir el dossier neurocientífico solo para las afirmaciones que entren a la Pillar.
- Elegir ejemplos públicos o ficticios declarados; proteger información de cliente.
- Resolver canonical, categoría y slug.

### Paso 2 — Content spec

- Convertir este brief a `GutenbergArticleSpec`.
- Definir título, excerpt, SEO, intro, secciones, fuentes, enlaces y CTA.
- Planificar hero/diagrama con licencia y ALT; no usar arte atmosférico que no explique el sistema.

### Paso 3 — Borrador privado

- Autoría gobernada con Content Factory y `author_id=1`.
- El pipeline termina en privado y nunca publica automáticamente.
- El contenido no incluye un H1 adicional; usa H2/H3 anclados y TOC poblado.

**Estado inicial 2026-07-15:** completado para V1. Content Factory creó el post `251363` con manifest
`greenhouse-cf-creative-workflows-pillar-v1`, estado `private`, autor `1` (Julio Reyes) y 75 bloques gobernados.
La reejecución devolvió `already_exists`, el permalink anónimo respondió `404` y la inspección profunda confirmó
20 headings, TOC poblado, metadata Yoast y cero bloques `core/freeform` con contenido.

Ese corte tenía unas 2.650 palabras visibles y todavía no incorporaba media, categoría pública ni enlaces
editoriales inline. Se conserva como evidencia de iteración, no como estado vigente.

**Estado vigente 2026-07-15:** la [V4](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V4.json) fue revisada,
autorizada y publicada en `https://efeoncepro.com/creative/creative-workflows/`. Tiene 111 bloques, fuentes
primarias inline, caso SKY, tres imágenes de cuerpo, categoría `Creative`, CTA final gobernado y `index, follow`.
El canonical, Open Graph, schema, entidad de autor y render desktop/mobile fueron verificados en vivo.

### Paso 4 — Revisión

- **Editorial:** claridad, una gran idea, tuteo, ejemplos y ausencia de jerga innecesaria.
- **Creative:** fidelidad al oficio, frontera exploración/producción y utilidad para quien ejecuta.
- **SEO/AEO:** intención, answers, entities, enlaces, schema, canonical y citabilidad.
- **Claims:** fuente, fecha, inferencia y permisos.
- **Comercial:** handoff coherente con PDR-004; cero promesa prematura de producto.
- **Accesibilidad:** jerarquía, contraste, ALT, tabla/listas legibles y enlaces descriptivos.

### Paso 5 — Publicación y aprendizaje

- Publicar una sola canonical y verificar indexación/render/schema/analytics.
- Distribuir los átomos con UTMs gobernadas.
- Capturar preguntas reales que puedan corregir la Pillar o priorizar satélites.
- Publicar la ola 1 progresivamente; actualizar enlaces desde ambas direcciones.

## 14. Gates antes de publicar

- [x] Intención y muestra SERP documentadas sin inventar volúmenes; la investigación de demanda regional continúa como optimización, no como bloqueo de la Pillar.
- [x] Canonical, slug, taxonomía y runtime decididos.
- [x] Fuentes primarias vigentes y claim ledger completo.
- [x] Distinción visible entre evidencia, inferencia y doctrina Efeonce.
- [x] Título, excerpt y meta description revisados con evidencia de intención.
- [x] Pillar entendible para un creativo sin vocabulario técnico.
- [x] Ningún claim de disponibilidad de Creative Studio.
- [x] Ningún artículo, diagrama o template editorial está redactado como spec, feature comprometida o
  implementación ya decidida.
- [x] Casos y métricas con permiso, período y tamaño de muestra.
- [x] Enlaces internos apuntan solo a destinos publicados.
- [x] CTA final enlazado a contacto con UTMs y sin PII en `dataLayer`.
- [x] Autor, fecha y fuentes visibles; perfil de entidad Yoast verificado.
- [x] TOC, anchors, schema, mobile, accesibilidad y performance verificados.
- [x] No existe una segunda copia pública indexable en WordPress/Think.

## 15. Decisiones resueltas y pendientes

| Decisión | Estado | Resolución |
|---|---|---|
| Keyword primaria y combinación inglés/español | Baseline suficiente | `Creative Workflows` gobierna H1, meta title, slug y definición; la demanda regional seguirá iterándose sin volúmenes inventados |
| URL canónica y ownership de render WP/Think | Resuelta | WordPress: `https://efeoncepro.com/creative/creative-workflows/`; Think no publica copia equivalente |
| Categoría/tag editorial canónico | Resuelta | Categoría `Creative` (`193`); no se agregaron tags redundantes |
| Arte principal y diagramas | Resuelta | Sistema `La señal seleccionada`, tres imágenes de cuerpo y featured/OG JPEG `251370` |
| Copy y destino final del CTA | Resuelta | Contacto Efeonce con UTMs editoriales gobernadas |
| Primer caso público Efeonce | Resuelta para la Pillar | Caso SKY con permiso, método, resultados y límites visibles |
| Orden definitivo de ola 1 | Pendiente | Se priorizará con investigación de demanda y preguntas reales posteriores a la publicación |
| Ebook/workbook | Dirección futura, no iniciado | Se evalúa después de observar cobertura del cluster y demanda de una síntesis aplicable |
| Tool diagnóstica | Hipótesis, no autorizada | Requiere PDR, modelo, privacidad, evals, analytics y task separados |

La única decisión editorial abierta de ejecución inmediata afecta el calendario de satélites. Ebook y tool son
horizontes condicionados, no bloquean ni invalidan la Pillar publicada y no tienen fecha comprometida.
