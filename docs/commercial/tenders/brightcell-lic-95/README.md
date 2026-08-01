# Brightcell LIC-95 — registro de construcción

> **Audiencia:** interno de Efeonce. Este archivo documenta el método y las decisiones de construcción;
> no reemplaza la oferta técnica ni la propuesta económica.
>
> **Hito:** Brightcell es la **segunda licitación armada con Artifact Composer y el catálogo de plantillas**.
> SKY Blog 2026 fue el primer caso de referencia. Brightcell conserva el pipeline determinista, pero amplía
> el uso del sistema con un key visual extraíble, mockups de AEO/SEO y una narrativa integrada de web,
> conversión, RRSS y operación mensual.

## Estado del workspace

| Pieza | Archivo / ubicación | Audiencia | Función |
|---|---|---|---|
| Investigación | `research/brightcell-contexto-INTERNO.md` | Interna | Contexto, lectura estratégica, benchmark y supuestos |
| Oferta técnica | `oferta-tecnica.md` | Client-facing | Fuente narrativa y ledger de evidencia |
| Propuesta económica | `propuesta-economica.md` | Client-facing | Inversión inicial, tres paquetes mensuales, beneficios, límites y condiciones |
| Arquitectura económica | `propuesta-economica-arquitectura-INTERNA.md` | Interna | Packaging, límites, recurrencia y dependencias |
| Plan deck económico | `deck-plan-economic.json` | Fuente de composición | Deck client-facing separado, con precios netos sin IVA |
| Plan del deck | `deck-plan.json` | Fuente de composición | Slots y orden narrativo del PDF |
| Artefactos vivos | `artifact-manifest.json`, cuando existan enlaces | Mixta, con gate | Procedencia y uso de piezas externas/interactivas |
| PDF compuesto | `.captures/brightcell-bid-v*` | Entregable | Salida versionada de Artifact Composer; no es la fuente |

El discriminador de audiencia manda: los archivos `research/` y `*-INTERNO` nunca se entregan al cliente.
El deck puede mostrar mockups conceptuales, pero deben estar rotulados como tales y nunca simular resultados
reales de Brightcell.

## Aprendizajes comerciales consolidados — 31 de julio de 2026

> **Gate comercial:** borrador listo para revisión; **no enviar ni presentar** hasta aprobación final de Finance
> y del owner comercial. Los valores de este expediente no constituyen un pricing reutilizable para otros deals.

La económica evolucionó desde una suma de servicios hacia una escalera de capacidades. La landing es un
proyecto único y la operación de crecimiento se contrata mensualmente; no se debe imponer una permanencia o
un programa de 90 días si el cliente no lo solicita.

### Separación de la inversión

- **Implementación única:** landing estratégica preparada para conversión, SEO de lanzamiento, medición,
  GA4, GTM, eventos, formularios y conexión inicial con HubSpot.
- **Operación mensual:** estrategia, RRSS, SEO/AEO, contenidos, optimización de conversión, medición y
  reporting, con capacidades crecientes según el paquete.
- **HubSpot CRM Free:** beneficio incluido dentro de la propuesta, no una línea adicional de activación.
  La configuración se limita a un portal/pipeline básico, formularios, propiedades, dashboard y transferencia.
  Licencias pagadas, upgrades e integraciones avanzadas quedan fuera y son costo del cliente.

### Paquetes definidos para el deck económico

Todos los valores son **netos, sin IVA**, en CLP:

La implementación es una sola línea común a las tres alternativas: **$1.100.000 netos, pago único**. El cliente
elige después una capacidad mensual; cambiar de paquete no cambia retrospectivamente el precio de la landing.

| Paquete mensual | Operación mensual |
|---|---:|
| **Growth Core** | $1.250.000 |
| **Demand & Authority** — recomendado | $1.650.000 |
| **Regional Growth** | $2.200.000 |

El aumento entre paquetes debe explicar capacidad adicional —volumen y adaptación de piezas, profundidad
SEO/AEO, contenidos web, audiovisual derivado, automatización, reporting y acompañamiento estratégico— y no
solo cambiar el nombre del servicio. El alcance cuantitativo y las exclusiones deben permanecer explícitos.

### Presentación económica separada

La propuesta económica se presenta en un deck independiente del deck técnico. El deck técnico demuestra la
solución; el económico permite comparar inversión inicial, operación mensual y niveles de capacidad sin
enterrar el precio dentro de la narrativa técnica. El plan fuente es `deck-plan-economic.json` y su salida
compuesta debe conservar un identificador y una carpeta de captura propios, sin modificar los artefactos de
SKY ni sustituir el deck técnico de Brightcell.

## Método observado, paso a paso

### 1. Intake y evidencia

1. Leer la ficha de Wherex, los anuncios y las respuestas de Brightcell.
2. Separar requerimientos explícitos de señales implícitas: presencia local, generación de leads, claridad
   de servicios, medición y evolución futura hacia equipos móviles.
3. Revisar fuentes públicas de Brightcell para entender servicios, sectores y lenguaje regional.
4. Crear el ledger `BC-E*` antes de escribir claims, cifras o promesas.
5. Marcar qué está confirmado, qué es público no auditado y qué debe validar el cliente.

**Regla aprendida:** el nombre de la licitación no basta para definir el alcance. La evidencia se lee en
capas: ficha, respuestas, sitios públicos y límites declarados por el comprador.

### 2. Taxonomía del desafío

Convertir la solicitud “página web + SEO/AEO + redes” en un sistema comercial:

`visibilidad → comprensión → página de solución → cotización/contacto → seguimiento → aprendizaje`.

Esta taxonomía evita vender disciplinas aisladas. SEO captura demanda existente; AEO mejora comprensión y
citabilidad; RRSS descubre, demuestra y humaniza; la web orienta y convierte; HubSpot registra y da
seguimiento; Greenhouse hace visible la mejora mensual.

### 3. Narrativa antes del diseño

La tesis de Brightcell se fijó antes de seleccionar láminas:

> Brightcell Chile necesita transformar su presencia regional en una puerta de entrada comercial local,
> medible y preparada para evolucionar.

La secuencia narrativa resultante fue:

`desafío → solución → prioridades → conversión → experiencia → sistema → HubSpot → metodología → stack →
RRSS/SEO/AEO → evidencia de diagnóstico → intervención → operación mensual → equipo → medición → roadmap →
alcance → seguridad → cierre`.

Cada lámina responde una pregunta del comprador. Si un recurso no explica una decisión, no entra al deck.

### 4. Deck plan y selección de plantillas

El `deck-plan.json` se escribió desde la oferta técnica, no desde una plantilla visual. La intención se
expresó primero como `contentType`; el catálogo resolvió la plantilla:

- `NarrativeSplit` para tesis y key visual;
- `DualTextSplit` para separar SEO de AEO y visibilidad de seguimiento;
- `ArtifactShowcaseFull` para wireframe, HubSpot, Grader, X-Ray y Greenhouse;
- `ToolStackFull` para el stack heredado del caso SKY;
- `TeamGalleryFull` para personas reales, roles y dedicación;
- `RequirementsTableFull` y `TimelineFull` para medición, gobierno y roadmap.

**Lección:** el catálogo no es decoración. La plantilla debe reforzar la función de la lámina y la
secuencia debe poder leerse aunque se retiren los adornos.

### 5. Assets y mockups

Se distinguieron tres tipos de visual:

1. **Assets de marca o contenido:** logos, wireframe y key visual extraíble.
2. **Mockups conceptuales:** AEO Grader, X-Ray y dashboard Greenhouse, usados para explicar cómo operaría
   la medición; llevan la leyenda “sin datos reales” o “cifras ilustrativas”.
3. **Artefactos vivos:** Radiografía AEO, informe real del Grader o dashboard navegable, que se incorporan
   por enlace y procedencia mediante `artifact-manifest.json`.

El key visual de RRSS se construyó como un objeto extraíble para la slide, no como fondo completo: un
ejecutivo de operaciones, un paquete trazable y los emblemas de LinkedIn, YouTube e Instagram conectados
por una ruta visual. Se revisó el canal alfa para conservar las áreas blancas de los logos, en particular
la “in” de LinkedIn y el play de YouTube.

**Lección:** generar una imagen no termina el trabajo. Hay que inspeccionarla sobre el fondo real, revisar
bordes, transparencia, logos, legibilidad a escala y su función dentro de la composición.

### 6. Composición determinista

El deck se compone con:

```bash
pnpm deck:compose docs/commercial/tenders/brightcell-lic-95/deck-plan.json --out .captures/brightcell-bid
```

El JSON es la fuente de slots; el PDF es una salida versionada. No se edita el PDF a mano ni se reemplaza
la fuente por una captura.

### 7. Auditoría visual

La revisión se hace sobre el PDF renderizado, no solo sobre el JSON. El checklist mínimo es:

- una idea principal por lámina;
- continuidad entre texto, mockup y siguiente acción;
- jerarquía y legibilidad en 16:9;
- coherencia de color, tipografía e iconografía;
- assets extraíbles sin halos ni fondos accidentales;
- logos y textos críticos legibles;
- personas reales en la lámina de equipo;
- mockups rotulados como conceptuales;
- ausencia de cifras o resultados ficticios;
- enlaces vivos verificables cuando la lámina los promete.

La auditoría debe provocar iteraciones: en Brightcell corrigió la secuencia SEO/AEO, agregó el stack, separó
la lámina de equipo y reemplazó una imagen tipo collage por un asset integrado y extraíble.

### 8. Validación y cierre

1. Componer desde el `deck-plan.json` final.
2. Revisar todas las páginas exportadas y las láminas nuevas en contexto.
3. Confirmar que SKY no fue alterada: Brightcell tiene su propio `tenderId`, plan, assets y salida.
4. Ejecutar las pruebas del Artifact Composer.
5. Verificar que la oferta técnica, el deck y la económica no se contradicen.
6. Confirmar que investigación, costos, benchmark y supuestos permanecen internos.
7. Registrar la versión del PDF y el siguiente paso humano.

## Lecciones específicas de Grader, X-Ray y Greenhouse

### AEO Grader: línea base, no promesa

El Grader debe responder “¿qué entiende hoy el motor sobre Brightcell?” y abrir un backlog de entidad,
servicios, categoría, cobertura, preguntas y citabilidad. Un score sin run, fecha y procedencia no es una
prueba. En la propuesta se usa un mockup conceptual hasta contar con una medición real de Brightcell.

### X-Ray: mostrar la intervención

El X-Ray traduce una página de solución a sus capas de trabajo: intención, estructura, entidad, servicio,
respuesta directa, schema, evidencia y CTA. Su valor en el deck es demostrar que SEO/AEO termina en una
página que ayuda a cotizar o agendar, no en una lista abstracta de keywords.

### Greenhouse: hacer visible el mes a mes

Greenhouse debe conectar visibilidad, contenidos, citabilidad, conversiones, responsables y siguiente
acción. El dashboard conceptual no debe inventar resultados: explica el sistema de operación y se poblará
con datos de Brightcell. La lectura mensual debe cerrar el circuito:

`medir → priorizar → intervenir → publicar → observar → decidir`.

## Qué aprendemos del primer caso SKY

SKY validó el uso de Artifact Composer, las plantillas cerradas, el stack visual, la Radiografía AEO, el
Grader y el hub de operación. Brightcell agrega cuatro aprendizajes:

- la narrativa debe unir web, conversión, SEO/AEO y RRSS desde el inicio;
- los artefactos visuales deben explicar una decisión del cliente, no solo demostrar capacidad;
- el stack y el equipo son láminas de confianza, no anexos decorativos;
- la diferencia entre mockup conceptual, evidencia real y artefacto vivo debe quedar explícita.

## Siguiente uso de este registro

Para una tercera licitación, copiar este método como checklist, no copiar ciegamente el deck. Primero
repetir intake y ledger; luego decidir qué parte del sistema aplica al comprador; finalmente elegir las
plantillas y assets que hagan visible esa decisión.
