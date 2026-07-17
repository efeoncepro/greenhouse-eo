# Construcción de Licitaciones — Método Efeonce

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.1
> **Creado:** 2026-07-11 por Claude (con Julio Reyes)
> **Última actualización:** 2026-07-11 por Claude
> **Documentación técnica / método canónico:** skill `greenhouse-public-private-tenders` → `bid-construction-playbook.md`

## Para qué sirve este documento

Explica, en lenguaje simple, **cómo Efeonce construye una propuesta para una licitación** (pública o privada, tipo RFP/RFQ) de principio a fin. No es un instructivo paso a paso (eso está en el manual de uso); es la explicación de la lógica y por qué se hace así.

La idea de fondo: **una buena propuesta no se improvisa ni se escribe de memoria.** Se arma sobre evidencia real —las bases, el contexto del negocio, datos de nómina, casos reales— y se apoya en el conocimiento experto de cada área (contenido, SEO, equipos, finanzas, redacción).

## El método en pocas palabras

Construir una licitación pasa por diez momentos encadenados. Cada uno produce algo que alimenta el siguiente:

1. **Leer las bases.** Entender qué pide el cliente, para cuándo, en qué formato, con qué reglas (plazos, garantías, penalidades, contrato).
2. **Revisar si podemos participar (admisibilidad).** Antes de trabajar la propuesta, chequear que cumplimos los requisitos obligatorios. Un requisito obligatorio faltante nos deja fuera aunque la propuesta sea excelente.
3. **Decidir si conviene (bid / no-bid).** ¿Encaja con lo que hacemos? ¿Hay relación previa? ¿Cuál es el ángulo? Y una regla dura: **nunca decir que sí a un precio que no deja margen.**
4. **Traer el contexto y los diferenciadores.** Qué hace fuerte a Efeonce en *esta* licitación, con casos reales y sin inventar cifras.
5. **Definir el alcance con criterio experto.** Cuánto y cómo se entrega, apoyándose en las áreas que saben (por ejemplo, contenido y SEO deciden la cadencia de artículos, no un número al azar). Antes de dimensionar, se **analiza con datos el activo real del cliente** (su sitio o blog actual): casi nunca se parte de cero, y ese diagnóstico sirve como prueba en la propuesta y para elegir el mix correcto (contenido nuevo vs. optimizar lo que ya existe).
6. **Diseñar el equipo (squad).** Qué roles, con qué seniority, cuánta dedicación, quién coordina y cómo se complementan. Al cliente se le muestran roles, no nombres.
7. **Poner el precio.** Se calcula sobre el **costo real del equipo** (Efeonce conoce su nómina) más un margen sano. En licitaciones privadas, además, se cuida no cobrar de menos por el valor entregado.
8. **Escribir la propuesta técnica.** Redactar de forma clara y persuasiva, con cada afirmación respaldada por su mecanismo o una prueba, sin humo.
9. **Armar la oferta económica y el paquete.** La planilla de precios en el formato pedido, revisar que todo lo obligatorio esté, y exportar a PDF.
10. **Presentar (lo hace una persona).** La oferta la sube un humano a la plataforma; el sistema solo la prepara. Nunca se envía ni se firma solo.

Antes de dar la propuesta por lista, se hace una **revisión crítica con tres miradas**: comercial (¿convence al comité y baja el miedo a decidir?), equipo (¿el equipo es real y tiene capacidad?) y finanzas (¿el precio cubre el costo real y no se erosiona con el tiempo?). Si las tres no pasan, la propuesta no está lista aunque el texto se lea bien.

## El diagnóstico y la demostración AEO (cuando el servicio es de contenido/SEO)

Cuando la licitación es de contenido, SEO o presencia digital, Efeonce mide el activo del cliente con su propia herramienta —el **AI Visibility Grader**— y lo presenta en la propuesta como diferencial. La forma de mostrarlo tiene tres capas:

1. **Números concretos** que cuentan una historia (¿la IA conoce la marca?, ¿el blog del cliente aparece como fuente cuando la IA responde?, ¿quién lidera la categoría?).
2. **Un enlace vivo** al informe completo, para que el cliente vea su propio diagnóstico en tiempo real.
3. **La escalera de madurez "Be X"** —Ser encontrada, Ser legible, Ser correcta, Ser accionable, Ser intrínseca— con el valor real del cliente en cada peldaño y qué significa estar ahí. Esa escalera ordena todo en una foto y muestra que los peldaños débiles son, justamente, lo que el servicio va a trabajar.

Dos cuidados de honestidad: **(a)** la escalera medida por la IA (percepción) puede diferir de la revisión técnica del sitio (¿tiene los datos que la IA necesita?), y no se contradicen —una mide la marca, la otra el activo—; al cliente va la medida. **(b)** Que la IA cite "fuentes creíbles" no significa que cite al cliente; el dato fuerte es si el dominio del propio cliente aparece entre esas fuentes.

Cuando la venta necesita pasar de "diagnóstico" a "prueba de ejecución", se suma la **Radiografía AEO**. Su rol es distinto: el Grader dice dónde está el hueco; la Radiografía muestra un artículo real que cubre un hueco, lo abre en canal y permite ver qué produce cada bloque en la capa de máquina. En propuestas y comités, esa muestra funciona como sales enablement: enlace vivo, lámina de deck, demo en reunión y evidencia verificable.

La cadena correcta es:

1. **AI Visibility Grader:** mide la situación del cliente.
2. **Radiografía AEO:** demuestra el método de ejecución sobre un hueco concreto.
3. **Propuesta/deck:** convierte esa evidencia en alcance, equipo, precio y plan.

> Operación: Grader → `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md`; Radiografía → `docs/manual-de-uso/comercial/usar-radiografia-aeo-en-venta.md`; método canónico → skill `greenhouse-public-private-tenders` → `bid-construction-playbook.md` (Fase 4-bis).

## Principios que no se negocian

- **Primero admisibilidad, después todo lo demás.** Es el error más común quedar fuera por un anexo o una declaración faltante, no por el precio.
- **Nunca un "sí" sin margen.** Un encaje perfecto con precio que pierde plata es un "no".
- **Fundar, no suponer.** Cada decisión se apoya en las bases, el contexto real y el conocimiento de cada área.
- **Sin humo.** Cada beneficio va acompañado de cómo lo logramos o una prueba real (un caso, un dato).
- **La persona manda.** El sistema prepara; el humano decide, firma y presenta.

## Los tres planos donde vive este método

Este método es **vivo**: cada vez que armamos o mejoramos una licitación, se actualiza en tres lugares para que no se pierda:

| Plano | Dónde | Para quién |
|---|---|---|
| **Método canónico** (fuente de verdad) | skill `greenhouse-public-private-tenders` (`bid-construction-playbook.md`) | agentes y quien construye la propuesta |
| **Documentación funcional** (este documento) | `docs/documentation/comercial/` | entender cómo funciona, en simple |
| **Manual de uso** (paso a paso) | `docs/manual-de-uso/comercial/construir-una-licitacion.md` | operar el proceso paso a paso |

## Primer caso de referencia

El primer caso completo con este método fue la licitación de **SKY Airline — Producción de Contenido Blog** (plataforma Wherex, julio 2026): se leyeron las bases, se validó admisibilidad, se eligieron los diferenciadores (caso Berel, SEO + AEO, portal, metodología Surround Discovery, WordPress + partner de Automattic), se analizó el blog real con Semrush y el AI Visibility Grader, se benchmarkeó a la competencia (JetSMART, LATAM, Flybondi), se definió la cadencia con las áreas de contenido y SEO, se diseñó un squad de ~2,2 personas dedicadas, se calculó el precio sobre el costo real del equipo, y se redactó la propuesta con un pase de estilo. La propuesta incrusta el informe de visibilidad IA en vivo, la escalera Be X con los valores reales de SKY y la Radiografía AEO como muestra viva de trabajo. Los archivos viven en la carpeta comercial de esa licitación.

Este caso dejó dos aprendizajes que ya son parte del método: **medir antes de afirmar** (una versión previa dijo "SKY casi no aparece en la IA" por inferencia técnica; el grader real lo desmintió —SKY sí es reconocida y citada— y afirmar un negativo falso en una propuesta es grave), y **si la herramienta sale incompleta, se arregla la herramienta, no el informe del cliente** (así el resto de clientes no hereda el mismo hueco).

## Hacia dónde va esto (norte)

Este método manual es el **precursor de una plataforma agéntica de licitaciones**: cada fase (leer bases, admisibilidad, diagnóstico, squad, precio, redacción, deck y económica) está pensada para volverse una **capacidad con contrato programático gobernado** que la interfaz, el agente Nexa y las integraciones puedan operar —la misma doctrina de "todo tiene contrato programático" que rige a Greenhouse—. Los layouts de esa plataforma ya existen en Figma. Documentar bien el método hoy es construir el plano de ese producto: cuando se implemente, parte de aquí, no de cero.

> **Detalle técnico:** el método canónico, las 10 fases (+ Fase 4-bis) y qué skill entra en cada una están en la skill `greenhouse-public-private-tenders` → `bid-construction-playbook.md`. El manual operativo paso a paso está en `docs/manual-de-uso/comercial/construir-una-licitacion.md`.
