# Construcción de Licitaciones — Método Efeonce

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
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

El primer caso completo con este método fue la licitación de **SKY Airline — Producción de Contenido Blog** (plataforma Wherex, julio 2026): se leyeron las bases, se validó admisibilidad, se eligieron los diferenciadores (caso Berel, SEO + AEO, portal, metodología Surround Discovery), se definió la cadencia con las áreas de contenido y SEO, se diseñó un squad de ~2,2 personas dedicadas, se calculó el precio sobre el costo real del equipo, y se redactó la propuesta con un pase de estilo. Los archivos viven en la carpeta comercial de esa licitación.

> **Detalle técnico:** el método canónico, las 10 fases y qué skill entra en cada una están en la skill `greenhouse-public-private-tenders` → `bid-construction-playbook.md`. El manual operativo paso a paso está en `docs/manual-de-uso/comercial/construir-una-licitacion.md`.
