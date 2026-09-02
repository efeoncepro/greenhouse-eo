# TASK-1801 — Dirección visual para Contacto multistakeholder

Estado: seleccionada para planificación; aceptación del first fold pendiente
Modo: `repo-native-benchmark`
Rigor: `ui-standard`
Fuente de producto: `docs/public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md`

## Tesis

Contacto debe sentirse como una recepción editorial que orienta y responde, no como un formulario comercial
genérico. El primer fold presenta una pregunta clara, las dos vías independientes —mensaje y reunión— y una
superficie de captura con suficiente calma para temas comerciales, sugerencias o reclamos.

## Alternativas comparadas

| Dirección | Primer fold | Ventaja | Riesgo | Decisión |
| --- | --- | --- | --- | --- |
| **Recepción editorial** | Mensaje fuerte + selector de motivo + agenda secundaria visible | Una sola puerta para todas las audiencias; jerarquía clara; continuidad con el sitio | Requiere cuidar densidad en móvil | **Seleccionada** |
| Directorio de stakeholders | Cards por cliente, partner, prensa, empleo, reclamo | Clasificación explícita | Card soup; obliga a entender la organización antes de escribir | Rechazada |
| Split comercial 50/50 | Formulario y calendario con el mismo peso | Agenda muy visible | Hace que reclamos y sugerencias parezcan oportunidades de venta | Rechazada |

## Dirección seleccionada

- Orden: eyebrow de contacto → H1 «¿En qué podemos ayudarte?» → frase breve → selector de vía → formulario.
- La agenda está visible como acción secundaria de alto contraste, sin interrumpir ni bloquear el formulario.
- Una superficie editorial dominante contiene el flujo. Dirección, teléfonos y cobertura forman una banda de
  evidencia operativa debajo, sin cards repetitivas.
- Países: Chile, Estados Unidos, Colombia, México y Perú. La lista comunica cobertura, no oficinas.
- Tipografía y color reutilizan el sistema público Efeonce/Ohio y sus tokens; ningún HEX, px o fuente se copia
  desde un mockup externo.

## Targets

- Desktop: 1440 × 1100; lectura de izquierda a derecha, formulario dominante y agenda secundaria.
- Tablet: 890 × 1100; composición apilada, acciones conservan jerarquía.
- Mobile: 390 × 844; una columna, selector y CTA de agenda visibles antes de contenido institucional.
- Reduced motion: cambios de paso y campos condicionales sin desplazamiento animado; feedback por estado y foco.

## Firma y antipatrones

Firma: selector de motivo como encabezado de conversación, progreso corto y banda institucional verificable.
Evitar hero gigante, mapa pesado, card soup, iconos decorativos por stakeholder, promesas de SLA no aprobadas,
colores de semáforo en reclamos y una agenda que parezca obligatoria.

## Token y primitive mapping

- Host: primitives Ohio/Elementor ya gobernadas y page-scoped.
- Formulario: `<greenhouse-form>` / Growth Forms, composición `conditional_simple` o `multi_step_light` según
  evidencia de implementación; la definición gobierna condiciones y copy.
- Agenda: `MeetingSchedulerHost` mediante acción `open_meeting_scheduler`, con binding allowlisted para Contacto.
- Motion: transición CSS/tokenizada sólo si el renderer existente ya la provee; sin sistema nuevo.
- Primitive decision: `reuse`; si aparece un gap de renderer reusable, se separa como task de plataforma.
