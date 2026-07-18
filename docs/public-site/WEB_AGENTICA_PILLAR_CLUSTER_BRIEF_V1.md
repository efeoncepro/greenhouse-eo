# Web agéntica — Pillar y cluster editorial V1

## Rol en el sitio público

- **Pillar:** `El fin de la web “solo para humanos”` — post WordPress `249387`.
- **Slug:** `web-agentica-agentes-ia`.
- **URL canónica proyectada:** `https://efeoncepro.com/loop-marketing/aeo/web-agentica-agentes-ia/`.
- **Landing comercial soportada:** `https://efeoncepro.com/desarrollo-sitios-web/` — página WordPress `250816`.
- **Trabajo de la pillar:** educar, definir la categoría, resolver objeciones y derivar intención calificada.
- **Trabajo de la landing:** explicar el servicio, acreditar el método y convertir mediante cotización.

La pillar no duplica la landing. Explica por qué diseñar para personas y agentes cambia el discovery, la arquitectura, el contenido, la accesibilidad, la seguridad y la medición. La landing convierte esa comprensión en una evaluación de proyecto.

## Tesis y respuesta citable

> Una web agéntica es un sitio diseñado para que personas y agentes de IA puedan comprender su oferta, evaluar alternativas y completar tareas de manera segura. Combina una interfaz humana clara con información estructurada, capacidades invocables, permisos, confirmaciones y medición.

La distinción editorial central es entre sitio tradicional, sitio con IA, sitio preparado para agentes y web agéntica. Usar IA para construir o atender no vuelve operable el negocio para agentes externos.

## Audiencia y recorrido

1. **Descubrimiento:** dirección de Marketing, Producto, Tecnología o Transformación encuentra la guía por búsqueda, respuesta de IA, redes o enlace comercial.
2. **Comprensión:** diferencia AEO de operabilidad, WebMCP de MCP/API y tecnología experimental de fundamentos durables.
3. **Autodiagnóstico:** usa las doce pruebas de preparación agéntica.
4. **Evaluación:** decide si puede optimizar la base actual o necesita rediseño/reconstrucción.
5. **Conversión:** llega a la landing de desarrollo web con una tarea, riesgo y punto de partida más claros.

## Arquitectura de enlaces

### Pillar → servicio

- Tres enlaces contextuales limpios a `/desarrollo-sitios-web/`.
- CTA final primario hacia desarrollo web.
- CTA secundario hacia el servicio AEO para necesidades de percepción y citabilidad.

### Servicio → pillar

- Enlace editorial contextual dentro de la sección “La misma página. Dos lecturas”.
- Texto recomendado: `Lee la guía: qué es una web agéntica y cómo preparar tu sitio.`
- Activación sólo cuando el post esté publicado y la URL canónica responda `200`.

### Pillar → contenidos relacionados

- `El 80% de lo que cita la IA no existe en Google`.
- `Tu cliente ya no busca solo en Google`.

## Cluster recomendado

| Prioridad | Contenido satélite | Intención | Enlace principal |
|---|---|---|---|
| P1 | Qué es WebMCP y qué cambia para un sitio web | Informativa técnica | Pillar + servicio desarrollo web |
| P1 | WebMCP vs MCP vs API: qué interfaz usar | Comparación/decisión | Pillar |
| P1 | Auditoría agent-ready: cómo probar un sitio | Diagnóstico | Pillar + cotización |
| P2 | Accesibilidad web para personas y agentes | Educativa/técnica | Pillar + servicio |
| P2 | Confirmación, permisos y seguridad para agentes | Riesgo/gobernanza | Pillar |
| P2 | Lighthouse Agentic Browsing: qué mide y qué no | Herramienta/QA | Pillar |
| P3 | WordPress y preparación agéntica | Plataforma/viabilidad | Pillar + servicio |

Cada satélite debe resolver una pregunta estrecha, enlazar la definición canónica de la pillar y evitar competir con la intención comercial de la landing.

## Sistema visual

- **WAG-V01:** portada conceptual “una web, dos operadores”.
- **WAG-V02:** matriz de cuatro tipos de sitio.
- **WAG-V03:** arquitectura compartida: interfaces distintas sobre capacidades, gobierno, datos y reglas comunes.
- **WAG-V04:** cadena de autoridad: persona, agente/operador, capacidad y registro atravesados por identidad,
  alcance delegado, confirmación proporcional y evidencia recuperable.
- Sistema canónico: `docs/public-site/WEB_AGENTICA_EDITORIAL_VISUAL_SYSTEM_V1.md`.
- Manifiesto: `docs/public-site/WEB_AGENTICA_VISUAL_ASSET_MANIFEST_V1.json` (`visuals-v4`).
- Media WordPress: portada/OG `251453–251454`; WAG-V02 `251470–251473`; WAG-V03 `251474–251477`; WAG-V04
  `251479–251482`.

## Medición

### Evento del enlace landing → pillar

- Evento: `gh_cta_clicked`.
- `cta_id`: `web_agentica_pillar`.
- `cta_kind`: `editorial_resource`.
- `cta_location`: `two_visitors`.
- `cta_variant`: `inline_resource`.
- `page_uri`: `/desarrollo-sitios-web/`.
- Key event: no.

El evento es el contrato recomendado, pero todavía no se emite. La familia genérica `gh_cta_*` debe nacer primero en la SoT runtime y luego construirse, previsualizarse y publicarse en GTM con autorización humana separada. El enlace recíproco no incluirá instrumentación ad hoc mientras ese slice siga pendiente.

### Lectura del funnel

- Entrada a la pillar por canal y landing page.
- Click landing → pillar mediante `gh_cta_clicked` cuando la familia CTA esté implementada y taggeada.
- Cotización aceptada mediante el pipeline ya vigente `gh_form_submission_accepted → generate_lead`.
- El artículo no usa UTMs en enlaces internos; la atribución se conserva mediante referrer, landing page y eventos.

## Estado operativo — 2026-07-18

- Borrador V3 escrito y validado por Content Factory.
- Estado WordPress: `draft`; autor humano `1`; categoría AEO `156`.
- Featured, OG/Twitter y dos visuales de cuerpo integrados; v4 aumenta densidad editorial y shareability con gate de contención de texto.
- Enlace recíproco preparado, no aplicado mientras la pillar no sea pública.
- Publicación requiere autorización humana separada y explícita.
