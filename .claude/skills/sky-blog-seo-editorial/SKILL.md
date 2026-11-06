---
name: sky-blog-seo-editorial
description: >-
  Metodología completa del servicio SEO editorial del Blog SKY, de punta a punta: auditoría y diagnóstico
  (migración, caída por etapas, hallazgos vs hipótesis, informe A4), proyección a 24 meses, conversión y
  valor del tráfico frente a Google Ads, planificación de lotes mensuales (reescrituras + nuevos, país del
  lector, rutas, calendario), carga al Content Hub, proyecto mensual y tareas del teamspace SKY, research,
  redacción y producción según el Playbook Producción · Blog SKY integrado (voz «El Viajero», ficha SEO,
  imágenes, tareas de diseño, QA y handoff). Usar para repetir o continuar cualquiera de esas fases.
---

# Método editorial SEO del Blog SKY

Esta skill guarda el **cómo** del servicio: cada fase que Efeonce ejecutó para SKY entre octubre y noviembre de
2026, con sus comandos, contratos, readbacks y trampas medidas, para repetirla sin reconstruirla. El **qué y el
estado de la cuenta** (identidad, alcance, equipo, decisiones vigentes) viven en la skill `sky-blog-seo` y en el
[marco del servicio](../../../docs/services/sky-blog-seo/README.md); cargarlos primero. Producir el pixel de una
imagen es de `sky-blog-graphic-line` y del Creative Workbench; acá se fija la spec y la tarea.

## Ciclo del servicio

| # | Fase | Sale con | Capítulo |
| --- | --- | --- | --- |
| 1 | Auditoría y diagnóstico | Hechos verificados, hipótesis separadas, informe A4 y correo | [auditoria-y-diagnostico.md](references/auditoria-y-diagnostico.md) |
| 2 | Proyección, conversión y valor | Escenarios a 24 meses, aporte a la venta y valor en Ads como rango | [proyeccion-conversion-y-valor.md](references/proyeccion-conversion-y-valor.md) |
| 3 | Plan del lote mensual | Lista de reescrituras y nuevos con país, ruta, calendario y riesgos | [planificacion-de-lotes.md](references/planificacion-de-lotes.md) |
| 4 | Carga y montaje del mes | Fichas «Idea» en el Content Hub, proyecto mensual y tareas vinculadas | [planificacion-de-lotes.md](references/planificacion-de-lotes.md) |
| 5 | Research, redacción y specs del lote | Research SEO/AEO, artículo vN, specs y handoff | [lote-editorial.md](references/lote-editorial.md) |
| 6 | Norma por artículo | Voz, estructura, rutas, imágenes, tareas de diseño, QA y estados | [produccion-editorial.md](references/produccion-editorial.md) |
| 7 | Medición | Comparación contra el mismo mes del año anterior y ventanas T−28 / T+28 / T+56 | [proyeccion-conversion-y-valor.md](references/proyeccion-conversion-y-valor.md) |

Cargar sólo el capítulo de la fase en curso. Las fases son estados distintos: auditado no es planificado,
planificado no es aprobado por SKY, redactado no es aprobado, aprobado no es publicado. Al reportar avance,
separar siempre **listos, bloqueados con su motivo y fuera de alcance**.

## Reglas que cruzan todas las fases

- **Fuente única por tipo de dato.** Cifras de la auditoría: `HECHOS.md` del expediente. Estados y aprobaciones:
  Content Hub de Notion. Rutas enlazables: «Precios y Rutas SKY», sólo filas 🟢 Activa del mercado del lector.
  Voz e imágenes: el Playbook y sus normas enlazadas, que mandan sobre cualquier resumen.
- **El blog es estacional.** Toda comparación va contra el mismo mes del año anterior, nunca contra el mes
  previo. El lector de un mes planifica el siguiente; enero es el pico.
- **Verificado no es estimado.** Search Console y GA4 son datos propios; Semrush y DataForSEO, estimaciones de
  mercado. El valor en Ads es un piso con cobertura declarada, no ahorro ni ROI.
- **Medir antes de comprar.** Leer snapshots y recibos antes de pagar DataForSEO; preview, organización, techo
  de gasto y recibo en cada compra. Semrush no se usa para lotes grandes (agota la cuota).
- **Escribir en Notion es acción externa.** Cargar ideas, crear proyectos y tareas o mover estados se hace por
  pedido del operador y se lee de vuelta con SQL. No cambiar `Aprobación cliente` ni `Trabajo SEO` sin aprobación.
  Las tareas y proyectos van en las bases del teamspace SKY, nunca en las generales de la agencia.
- **SKY decide.** Temas rechazados (cambio de vuelo, mascotas, bebé, Cancún) y sus vecinos no vuelven a proponerse
  sin pedido. Una excepción al Playbook se anota donde el equipo la lee: en el proyecto y en cada tarea.
- **Envíos y publicación.** Los correos se dejan como borrador; los envía Julio. Publicar en WordPress, ejecutar
  301 o tocar accesos requiere autorización del encargo. El canal compartido de OneDrive con SKY no recibe
  borradores; los adjuntos de Julio van en OneDrive › Workspace › Clientes › Sky Airlines.
- **Nada de secretos.** Las claves que SKY envió por correo o Teams no se copian a ningún archivo ni respuesta.
- **Norma nueva, el mismo día.** Si un caso cambia el método, se escribe en el capítulo que corresponde de esta
  skill; si cambia la voz, las imágenes o el proceso por artículo, también en su página de Notion.

## Comandos y datos de uso frecuente

| Para | Dónde |
| --- | --- |
| Consultar GA4 sin depender de Vercel | `pnpm ga4:query` ([manual](../../../docs/manual-de-uso/growth/consultar-ga4-por-cli.md)) |
| Demanda y SERP | `pnpm dataforseo` (skill `dataforseo-operator`) |
| Informe A4 | `pnpm exec tsx scripts/seo/sky-blog-audit-report.ts` + `pnpm report:compose` (skill `report-studio`) |
| Valor del tráfico | cálculo canónico en `src/lib/growth/seo/organic-traffic-value/` |
| Generadores del lote de diciembre (plantilla) | `outputs/sky-blog-plan-diciembre-2026/` (`build.py`, `final.py`, `content-hub.py`, `tareas-sky.py`) |
| Notion | Content Hub `collection://f1e39c2f-efe7-83f0-86db-0725e4f71611` · Precios y Rutas `collection://f5b6f169-6765-4981-834a-b018d8953ed3` · Proyectos SKY `collection://74939c2f-efe7-8317-93fc-07d23a1dfba2` · Tareas SKY `collection://a0039c2f-efe7-82ac-a67d-87513c3c50df` |

## Casos de los que sale el método

| Caso | Expediente |
| --- | --- |
| Auditoría (15-10 y 23-10-2026) | [caso-auditoria-2026-10](../../../docs/services/sky-blog-seo/caso-auditoria-2026-10/README.md) |
| Proyección y conversión (05-11-2026) | [PROYECCION_2026-11.md](../../../docs/services/sky-blog-seo/caso-auditoria-2026-10/PROYECCION_2026-11.md) |
| Lote de noviembre (54 artículos) | [LOTE_NOVIEMBRE_2026_FLUJO_EDITORIAL.md](../../../docs/services/sky-blog-seo/LOTE_NOVIEMBRE_2026_FLUJO_EDITORIAL.md) |
| Lote de diciembre (40 artículos, Artículos 49 a 88) | [LOTE_DICIEMBRE_2026_PLAN.md](../../../docs/services/sky-blog-seo/LOTE_DICIEMBRE_2026_PLAN.md) |

Este bundle tiene espejo byte a byte en `.codex/skills/sky-blog-seo-editorial/` (gate `pnpm skills:mirrors`).
