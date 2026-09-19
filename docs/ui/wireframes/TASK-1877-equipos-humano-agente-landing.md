# TASK-1877 — Wireframe de la landing transversal humano-agente

> Estado: contrato inicial de planificación; no es dirección visual aprobada ni implementación.
> Fuente: docs/services/revenue-operations-crm/HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md y narrativa Q4.
> Runtime previsto: sitio público WordPress/Ohio. URL de trabajo: /servicios/equipos-humano-agente/.

## Intención y jerarquía

Dos compradores llegan con un job, no con un proveedor: COO/CRO/VP Service quiere rediseñar una
operación; CMO/Marketing Ops quiere conectar descubrimiento AEO, contexto de campaña y un equipo
humano-agente. Un mismo H1 ofrece la transformación del trabajo. La página no obliga a seleccionar
plataforma ni crea un diagnóstico automático.

## Estructura propuesta

| Orden | Región | Trabajo y prueba | Acción |
|---|---|---|---|
| 1 | First fold | Servicio, para quién, autoridad humana y resultado de un proceso; cero logos de proveedor como idea | Conversemos sobre tu primer proceso |
| 2 | Problema | Antes: actualizar CRM/producir output. Ahora: definir job, contexto y responsabilidad | Lectura |
| 3 | Proceso demostrable | Entrada → agente propone/ejecuta dentro de límites → revisión/escala → corrección → outcome válido. Ejemplo real autorizado o ilustrativo rotulado | Comprender método |
| 4 | Dos rutas por job | Operaciones/revenue/service y marketing; en marketing, AEO público y contexto privado de campaña se separan | Identificar fit |
| 5 | Mapa de autoridad | Ficha read/propose/write, supervisor, handoff, consentimiento, detener/retirar | Ver límites |
| 6 | Escalera | Fit → Blueprint pagado → First Hybrid Team → transformación por olas → operación continua | Elegir conversación |
| 7 | Plataformas | HubSpot, Salesforce u otra herramienta sólo si el job y tenant lo justifican | Enlaces contextuales, no CTA primaria |
| 8 | Prueba y FAQ | Artefacto/caso autorizado, límites, cuándo no sumar agente, costo total sin cifra inventada | Conversación o contacto alternativo |

## First fold · targets iniciales

- Desktop 1440: H1 y párrafo de mecanismo arriba de CTA; al lado, artefacto de trabajo legible
  (no robot/diagrama decorativo). Sin caso ficticio presentado como real.
- Mobile 390: orden H1 → mecanismo → CTA → artefacto; no comprimir el artefacto hasta hacerlo ilegible.
- Jerarquía de acciones: conversación de fit primaria; exploración de método secundaria; selección
  de proveedor no se ofrece como primer click.
- Fuente visual: modo repo-native-benchmark por resolver en Discovery con 2–3 alternativas, tokens
  y primera pantalla aprobada. Este wireframe no declara fidelidad final.

## Estados, accesibilidad y medición

- Sin prueba autorizada: mostrar método y escenario ilustrativo rotulado, sin testimonial vacío.
- CTA/form: pending, error y receipt reales por host gobernado; fallback de contacto visible.
- HTML servido legible sin JavaScript; headings y tabla/lista de autoridad semánticos; foco visible.
- Mobile 390, teclado, reduced motion y scrollWidth <= clientWidth son gates.
- UTM y eventos distinguen orgánico, paid, outbound y referido; no equiparar click con lead ni
  volumen de campañas con outcome.

## Implementation Mapping

- Superficie: WordPress/Ohio, página nueva con postId y slug por confirmar.
- Reuso propuesto: módulos Elementor/Ohio, Growth Form o Growth CTA existentes, sin primitive global.
- Copy y claims: ledger de la task, validación humana y proof/rights antes de publicar.
- Server/browser: WordPress y hosts Growth sirven estados; JS local sólo mejora presentación.

## GVC Scenario Plan

- Escenario premium por crear en Discovery; preview noindex primero, URL canónica después.
- Viewports: desktop 1440 y mobile 390; capturar fold, proceso, rutas, autoridad, CTA y error.
- Assertions: H1 único, jerarquía estable, links correctos, sin claims no autorizados, no overflow.
- Revisar foco, reduced motion, JS-off, consentimiento y receipt sin envío real no autorizado.
- Baseline: 404 de la ruta propuesta observado 2026-09-19; no es captura visual de producto.

## Design Decision Log

- Elegida para planificar: una landing neutral con rutas por job dentro de una sola oferta.
- Descartada: convertir HubSpot en página genérica o crear páginas por cada agente.
- Pendiente: comparar direcciones visuales, aprobar first fold, CTA y assets antes de UI ready yes.
