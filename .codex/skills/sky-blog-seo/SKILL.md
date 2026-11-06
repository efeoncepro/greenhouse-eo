---
name: sky-blog-seo
description: >-
  Marco de la cuenta del servicio SEO del Blog SKY: identidad, alcance, equipo, estado al día, accesos
  vigentes y decisiones de SKY. Cargar antes de cualquier trabajo de esta cuenta; el método de cada fase
  (auditoría, proyección y valor, lotes, Content Hub y tareas, Playbook de producción) vive en la skill
  `sky-blog-seo-editorial`, y la producción de imágenes en `sky-blog-graphic-line`.
---

# Operación SEO del Blog SKY

Cargar el [marco del servicio](../../../docs/services/sky-blog-seo/README.md) antes de planificar o reportar.
Es la instancia de cuenta, no una oferta SEO genérica. El anexo firmado gobierna cantidades y condiciones;
el Content Hub de SKY gobierna estados y aprobaciones. Conservar ambas fuentes sin duplicarlas.

## Identidad y alcance

- SKY: `org-b9977f96-f7ef-4afb-bb26-7355d78c981f`.
- Alcance medido: host exacto `blog.skyairline.com`. No asumir que toda `skyairline.com` es el servicio.
- GA4 verificado 15-10-2026: `354430952`, SKY web GA4 - Prod. GSC: `https://blog.skyairline.com/`.
  Verificar el vínculo actual antes de nuevas extracciones; estas identidades son referencia fechada.
- El «80.000 → 40.000» de Pilar está confirmado en GA4 (sep-25 → oct-25); la transición
  `www.skyairline.com/blog/` → `blog.skyairline.com` ocurrió el 26–27/09/2025. Sin evidencia de
  penalización; el registro de despliegue de TI sigue pendiente.
- Expectativa de Pilar: recuperación importante en tres meses desde noviembre. Compromiso de Julio:
  auditoría hasta el 20-10-2026 y preparación del indicador. No prometió recuperar una cifra en ese plazo.
- Equipo Efeonce (confirmado por Julio el 01-11-2026): Julio Reyes, SEO Account Strategist (temporalmente);
  Valentina Hoyos, Content Lead (reemplazó a María Fernanda, SEO Copywriter en la oferta); Daniela Ferreira,
  Creative Operations Lead; Andrés Carlosama y Melkin Hernandez, Senior Visual Designer. La oferta listaba a
  Andrés como «SEO Specialist»: no usar ese rol ni los porcentajes de dedicación de la oferta.

## Estado

Al 23-10-2026: auditoría consolidada e informe A4 (23 páginas) generados, revisados y enviados ese día a Pilar y
Natalia. Diagnóstico: caída en tres etapas (previa con AI Overviews y volumen, migración, posterior),
causa técnica nombrada (plugin SEO no migrado), alerta de nueve artículos de Perú retirados entre el 15 y
el 23-10, escenarios nov–ene y valor publicitario como rango. El expediente vive en
[`caso-auditoria-2026-10/`](../../../docs/services/sky-blog-seo/caso-auditoria-2026-10/README.md), con sus
pendientes y dueños; toda cifra sale de [HECHOS.md](../../../docs/services/sky-blog-seo/caso-auditoria-2026-10/HECHOS.md).
Auditoría interna: [consolidada del 23-10](../../../docs/audits/growth/2026-10-23-sky-blog-seo-audit-consolidada.md),
cuyo §6 corrige el trabajo del 15-10.

Al 01-11: SKY restauró los nueve artículos de Perú y entregó
administrador de WordPress; deck del kickoff del 02-11 armado. Deck, equipo, sistema visual y las siete decisiones
pedidas: [insumos del kickoff §7](../../../docs/services/sky-blog-seo/caso-auditoria-2026-10/KICKOFF_2026-11-02_INSUMOS.md).

Al 05-11: los 54 artículos activos del Content Hub tienen research SEO/AEO y una versión redactada en POV
«El Viajero» al final de su página de Notion, con ficha SEO, callouts de imagen y banner, y specs para
producción. Nada se publicó ni está aprobado por SKY. Estado, bloqueos y decisiones pendientes:
[lote de noviembre](../../../docs/services/sky-blog-seo/LOTE_NOVIEMBRE_2026_FLUJO_EDITORIAL.md).

Al 05-11 también quedó lista la proyección a 24 meses pedida en el kickoff (informe A4, planilla de búsquedas
valorizadas y correo, sin enviar): [PROYECCION_2026-11](../../../docs/services/sky-blog-seo/caso-auditoria-2026-10/PROYECCION_2026-11.md).
Conversión medida: unas 1.000 personas al mes leen el blog y compran ese mes (2.350 antes de migrar); el evento
`purchase` de SKY no trae monto, así que no hay ingresos por blog.

Al 06-11: lote de diciembre planificado (25 reescrituras y 15 nuevos) y cargado en el Content Hub como «Idea»,
con el proyecto «SKY · Producción Creativa - Diciembre 26» y las tareas Artículo 49 a 88 en el teamspace SKY, creadas
antes de la aprobación de SKY por pedido de Julio: [lote de diciembre](../../../docs/services/sky-blog-seo/LOTE_DICIEMBRE_2026_PLAN.md).

## Elegir el trabajo

El método de cada fase vive en la skill **`sky-blog-seo-editorial`**. Cargar su `SKILL.md` y sólo el capítulo de
la fase en curso:

| Trabajo | Capítulo de `sky-blog-seo-editorial` | Skills que lo acompañan |
| --- | --- | --- |
| Auditoría, recovery, migración, informe A4 | `references/auditoria-y-diagnostico.md` | `seo-aeo`, `report-studio` |
| Proyección, conversión, valor publicitario | `references/proyeccion-conversion-y-valor.md` | `dataforseo-operator`, `report-studio` |
| Plan del lote mensual, carga al Content Hub, proyecto y tareas | `references/planificacion-de-lotes.md` | `dataforseo-operator` |
| Research, redacción, specs y handoff de un lote | `references/lote-editorial.md` | `seo-aeo`, `dataforseo-operator` |
| Norma por artículo (voz, estructura, rutas, imágenes, tareas de diseño, QA) | `references/produccion-editorial.md` | `sky-blog-graphic-line` para el pixel |

Hechos de la cuenta que esos capítulos dan por sabidos:

- **Pendientes de la auditoría:** [matriz de cobertura y pendientes](../../../docs/services/sky-blog-seo/COBERTURA_Y_PENDIENTES_AUDITORIA_2026-10-15.md).
  Al 23-10 avanzaron los frentes 01 a 06 y ninguno cerró. Los siete abiertos son migración/medición histórica,
  indexación/seguridad, calidad editorial, competencia/SERP, backlinks, experiencia móvil y contribución comercial.
- **Search Console:** la conexión de la organización es la propiedad del blog. Desde el 05-11-2026 el token del
  operador ve también `https://www.skyairline.com/` (`siteFullUser`, comprobado con `sites.list`). Su historia
  `/blog/` se exportó ese día a `outputs/sky-blog-proyeccion-2026-11/valor/historia-www-blog-*.csv`; ene–may 2025
  ya no existe. El collector canónico sólo lee la propiedad conectada.
- **GA4:** `pnpm ga4:query` usa la cuenta de servicio de Efeonce y al 05-11 recibe 403 en la propiedad de SKY,
  hasta que SKY la agregue como Lector. Mientras tanto, la vía es la conexión GA4 por organización.
- **Accesos:** la conexión analítica no acredita permisos CMS; las credenciales de Efeonce no habilitan SKY.
  SKY entregó administrador de WordPress el 27-10; las claves llegaron en texto plano y no se registran.
- **Prioridades de Natalia:** Perú doméstico, rutas internacionales actualizadas, alrededores del aeropuerto de
  llegada y refresh de lo que ya funcionaba, sin duplicar. Temas rechazados por SKY: cambio de vuelo, mascotas,
  bebé y Cancún.
- **Criterio fotográfico:** «SKY Blog · Sistema visual de imágenes» de Daniela Ferreira, en SharePoint Sky-Efeonce
  (`Documentos compartidos/General/SKY Blog SEO/01 Onboarding/SKY_Blog_Sistema_Visual.pdf`). Su aprobación se pidió
  a Marca SKY en el kickoff. Producir o revisar una imagen es de `sky-blog-graphic-line` y del Creative Workbench
  (`brands/sky-airline/blog/`).
- **Logo:** el de la organización en Greenhouse es una imagen generada por IA; el oficial es
  `ai-generations/2026-09-23_cmp003-sky-hangar/refs/sky-official.svg`.
- **OneDrive:** los adjuntos que envía Julio van en OneDrive › Workspace › Clientes › Sky Airlines › <carpeta>.
  «Sky - Efeonce - General» es un canal compartido con SKY: nada de borradores ahí.

Las lecciones de la auditoría (23-10), del lote de noviembre y de la proyección (05-11) se movieron el 06-11 a los
capítulos de `sky-blog-seo-editorial`, en sus tablas de trampas.

## Cierre de cada encargo

Entregar hallazgos/resultado, período y alcance, evidencia verificable, decisiones y pendientes con dueño.
Mantener trazabilidad en el expediente de la cuenta y estado vivo en Notion. Las acciones externas siguen
la autorización del encargo: esta skill no autoriza envíos, cambios de acceso, publicación o gasto por sí sola.

Este bundle tiene espejo byte a byte en `.codex/skills/sky-blog-seo/` (gate `pnpm skills:mirrors`).
