# Contrato del método operativo de diseño asistido por IA · V1

> **Estado:** aprobado como contrato interno · **Fecha:** 2026-09-22
> **Owner:** Efeonce Strategy + prácticas de diseño y producción
> **Ámbito:** cualquier disciplina de diseño presente o futura; diseño gráfico, digital, UI, UX, web, 3D y motion
> son ejemplos, no un catálogo exhaustivo
> **Arquitectura de marca:** **Efeonce es la única marca que se busca posicionar.** La metodología no recibe por
> ahora nombre comercial, sigla, submarca ni identidad propia. `Design Context` nombra uno de sus artefactos
> centrales, no el método completo.
> **Expresión editorial:** [CDR-003 · Del output a la pieza](../campaigns/decisions/CDR-003-tu-ia-no-conoce-del-output-a-la-pieza.md)

## 1. Propósito

Este contrato documenta cómo Efeonce convierte capacidad generativa general en diseño específico de una empresa.
El objetivo no es producir más outputs, sino **escalar procesos creativos con velocidad sin diluir aquello que hace
reconocible, relevante y diferente a una organización**.

La posición central es:

> **Sin contexto propio, la IA escala el promedio. Con contexto construido, puede escalar la diferencia.**

La metodología es **agnóstica respecto de la disciplina, pero rigurosa respecto de las reglas de cada disciplina**.
El núcleo puede aplicarse a cualquier oficio de diseño capaz de declarar contexto, decisiones, constraints, evidencia
y criterios de aceptación; la ejecución no se homogeneiza.

## 2. Distinción canónica: método, Design Context y ejecución

| Nivel | Qué es | Qué no es |
|---|---|---|
| **Método operativo** | El ciclo completo para descubrir diferencia, construir contexto, traducirlo, producir, seleccionar, terminar, validar y aprender | Se comunica como `la metodología de Efeonce`; no recibe por ahora un nombre comercial y no equivale a prompting |
| **Design Context** | La representación operativa y versionada de lo que la empresa necesita expresar, preservar, evitar y demostrar | No es el nombre de la metodología, un prompt largo, un moodboard ni sólo un brandbook |
| **Contrato de disciplina** | La traducción del Design Context a reglas, estados, constraints, quality gates y entregables propios de cada oficio | No es una receta técnica universal copiada entre disciplinas |
| **Ejecución** | Exploración, producción, selección, composición, finishing, QA y entrega mediante personas, herramientas y modelos elegidos por operación | No es evidencia de calidad sólo porque el modelo produjo algo visualmente atractivo |

El Design Context es un artefacto que el método **construye, usa y actualiza**. Puede alimentar prompts, briefs,
tokens, referencias, anti-referencias, componentes, journeys, escenas, contratos de salida y checklists, pero no se
reduce a ninguno de ellos.

### 2.1 Jerarquía pública de comunicación

```text
Efeonce — marca y fuente de autoridad
└── Del output a la pieza — territorio creativo
    ├── «A nosotros tampoco nos gusta el AI Slop» — entrada cultural
    ├── metodología de Efeonce + Design Context — mecanismo
    └── Behind the Build — formato de demostración
```

El territorio, el artefacto y el formato existen para acumular reconocimiento y autoridad en **Efeonce**. No llevan
logo, cuenta, arquitectura verbal, registro de marca, oferta o personalidad independientes. `Behind the Build` describe una
forma de mostrar el proceso; tampoco es una franquicia o submarca. Esta regla puede reabrirse sólo cuando exista una
razón comercial y de arquitectura de marca que compense el costo de introducir otro nombre en la memoria del mercado.

## 3. Por qué existe: la homogeneización a escala

El riesgo más importante del *AI Slop* no es que todo se vea defectuoso. Es que una salida técnicamente correcta
pueda pertenecerle a cualquier marca: mismas composiciones, iluminación, metáforas, interfaces, movimientos y
decisiones tomadas desde el promedio del modelo.

La gravedad económica cambia según el contexto:

| Contexto | Valor dominante de la IA | Riesgo que pasa a primer plano |
|---|---|---|
| **PYME / capacidad inicial** | acceso, autonomía y posibilidad de producir donde antes no había presupuesto o equipo | la genericidad puede existir, pero suele pesar menos que no producir; no se afirma que sea inocua |
| **Mid-market** | throughput, experimentación y despliegue multicanal | fragmentación, retrabajo y pérdida de diferenciación a medida que crece el volumen |
| **Enterprise** | capacidad productiva distribuida entre equipos, mercados y proveedores | erosión acumulativa de marca, inconsistencia, rights, governance, aprobación y costo del error a escala |

Efeonce no compite contra el acceso económico a una herramienta. Interviene cuando el desafío deja de ser generar
algo y pasa a ser **producir variedad reconocible, consistente y aprobable a escala**.

## 4. El ciclo del método

```text
entender el negocio y la superficie
→ identificar diferencia y convenciones que evitar
→ construir el Design Context
→ traducirlo al contrato de la disciplina
→ divergir y producir
→ seleccionar, rechazar y corregir
→ componer, terminar y validar
→ publicar o implementar con autorización
→ medir, aprender y actualizar el contexto
```

### 4.1 Entender

- definir el problema, usuario o audiencia, job, decisión y outcome controlable;
- identificar la superficie, canal, sistema o experiencia donde vivirá el resultado;
- separar evidencia disponible de hipótesis y claims aún no autorizados.

### 4.2 Identificar la diferencia

- reconocer activos, comportamientos, códigos y tensiones propios de la organización;
- detectar convenciones saturadas de la categoría y outputs que podrían pertenecerle a cualquiera;
- declarar tanto lo que debe permanecer como lo que debe evitarse.

### 4.3 Construir el Design Context

El Design Context combina tres capas, con profundidad proporcional al trabajo:

1. **Núcleo compartido:** negocio, usuarios/audiencias, marca, diferenciadores, voz, derechos, evidencia y límites.
2. **Extensión de disciplina:** principios, reglas, estados, patrones, anti-patrones y quality gates del oficio.
3. **Contexto de ejecución:** objetivo concreto, superficie, constraints técnicos, herramientas elegibles, owners,
   criterios de aceptación y estado de publicación o implementación.

El contexto debe ser utilizable por personas y sistemas. Si sólo inspira, pero no permite decidir, rechazar o validar,
está incompleto.

### 4.4 Traducir por disciplina

La aplicabilidad no se limita a una taxonomía cerrada. Los siguientes son ejemplos de traducción, no los únicos
oficios que puede cruzar el método:

| Disciplina | Traducción mínima del contexto |
|---|---|
| **Diseño gráfico y digital** | concepto, sistema visual, tipografía, composición, color, fotografía, formatos y producción |
| **UI** | tokens, componentes, jerarquías, estados, interacción, accesibilidad y comportamiento responsive |
| **UX** | jobs, journeys, modelos mentales, flujos, fricciones, research, hipótesis y criterios de validación |
| **Web** | arquitectura de información, narrativa, conversión, contenido, responsive, accesibilidad, rendimiento e implementación |
| **3D** | forma, escala, materiales, iluminación, cámara, física, continuidad y entrega técnica |
| **Motion y audiovisual** | lenguaje temporal, puesta en escena, ritmo, transición, sonido, continuidad y formatos |
| **Otra disciplina presente o futura** | su objeto de diseño, usuarios, materiales o medios, decisiones, restricciones, interfaces, estados, evidencia y quality gates propios |

Las prácticas dueñas mantienen sus boundaries. La transversalidad del método no convierte las disciplinas ni sus
servicios en una sola oferta, ni cambia su ownership comercial.

### 4.5 Producir, seleccionar y terminar

- elegir personas, modelos y herramientas por operación, no por preferencia de proveedor;
- conservar anchors, editables, versiones y provenance cuando correspondan;
- registrar descartes con una razón observable;
- componer deterministicamente texto, datos, logos, legales y otros elementos exactos;
- validar el resultado en la superficie y formato reales.

### 4.6 Aprender

El contexto no se congela. Feedback, decisiones, desempeño de delivery, hallazgos de QA y evidencia de mercado
actualizan la siguiente iteración. Consistencia significa **parentesco reconocible**, no repetición de una estética.

## 5. Promesa y límites

La promesa controlable es aumentar velocidad y capacidad manteniendo dirección, memoria, coherencia y quality gates.
El patrón de impacto es transversal: **más velocidad sin pérdida de identidad, más consistencia sin homogeneización y
mayor capacidad de elevar calidad y diferenciación a escala**. Cada disciplina expresa y mide ese impacto de forma
distinta; no se promete venta, conversión, awareness, adopción u otro outcome externo sin medición comparable.

La formulación pública recomendada es:

> **La IA democratizó la producción. Efeonce convierte la diferencia de una empresa en capacidad de diseño
> escalable.**

Frases derivadas aprobadas para desarrollar, sujetas a la voz y superficie:

- **El problema del AI Slop no es sólo que algo se vea mal. Es que podría pertenecerle a cualquiera.**
- **La IA produce desde patrones generales. El contexto construido le da coordenadas propias.**
- **Escalar creatividad no es repetir una estética. Es multiplicar una identidad.**
- **No usamos IA para hacer más de lo mismo. La usamos para producir más de aquello que sólo esa empresa puede ser.**
- **Una metodología aplicable a cualquier disciplina; una ejecución específica para cada oficio.**

## 6. Evidencia y uso público

El operador confirma que Efeonce ya ha aplicado este enfoque en diseños implementados o puestos en mercado para
organizaciones grandes. Esa confirmación acredita experiencia interna, pero **no autoriza por sí sola** a publicar
nombres, logos, activos, métricas ni detalles propietarios.

Una prueba pública requiere, según el claim:

- permiso y derechos de portfolio;
- entregable real y estado verificable de implementación o publicación;
- problema, disciplina, alcance y rol efectivo de Efeonce;
- versiones, descartes, decisiones y QA cuando se presente el proceso;
- baseline y denominador cuando se afirme mejora de tiempo, costo, calidad o desempeño;
- separación entre craft observable, delivery medido e impacto comercial.

Si no existe autorización, se puede mostrar el mecanismo con un caso anonimizado o una demostración rotulada. No se
expone la receta completa ni material interno que constituya propiedad intelectual innecesaria para probar la tesis.

## 7. Lo que este contrato no decide

- No asigna un nombre comercial a la metodología; mientras la prioridad sea posicionar Efeonce, se evita crear uno.
- No crea una SKU, práctica ni línea de negocio nueva.
- No fusiona Creative Services, Product Design, Web Experience u otras ofertas.
- No autoriza precios, claims de ahorro, publicación, pauta ni uso de activos de clientes.
- No convierte el Design Context en un entregable único obligatorio: su forma depende de la disciplina y el scope.
- No sustituye los contratos de oficio, derechos, accesibilidad, producción, implementación o QA de cada práctica.
