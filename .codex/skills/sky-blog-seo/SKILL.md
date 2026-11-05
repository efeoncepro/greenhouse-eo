---
name: sky-blog-seo
description: >-
  Operar el servicio SEO del Blog SKY: recuperación tras la migración, análisis GA4/GSC,
  prioridades editoriales, lotes editoriales (research SEO/AEO, redacción en Notion, ficha SEO,
  callouts, specs y handoff) y valor publicitario estimado por consulta y país. Usar para
  trabajo de esta cuenta; artículos e imágenes conservan su playbook vivo de Notion.
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

## Elegir el trabajo

**Auditoría/recovery.** Cargar `seo-aeo` y sus módulos técnicos/de migraciones pertinentes. Reconstruir
inventario y cambios con WordPress/GSC/histórico, separar hallazgos de hipótesis, priorizar páginas perdidas
y bloqueos comprobados. No inventar el dominio anterior a partir de los ejemplos de la transcripción.
Cada acción lleva evidencia, owner técnico, dependencia y verificación. No cambiar cuentas, redirects o CMS
como parte de una lectura. El pedido de ejecutar cambios concretos gobierna su alcance.

Para continuar o preguntar qué falta, cargar la [matriz de cobertura y pendientes](../../../docs/services/sky-blog-seo/COBERTURA_Y_PENDIENTES_AUDITORIA_2026-10-15.md).
Al corte del 23-10, los frentes 01 a 06 avanzaron y ninguno cerró; implementación pendiente. Conservar
separados investigación, preparación, aplicación y resultados. Los siete frentes abiertos son
migración/medición histórica, indexación/seguridad, calidad editorial, competencia/SERP, backlinks,
experiencia móvil y contribución comercial. El censo público no acredita revisión editorial de los
1.697 posts ni la auditoría técnica del motor de reservas.

El GSC de Efeonce es sólo la propiedad del blog (subdominio), no `www.skyairline.com` (confirmado el 01-11).
La historia previa a la migración, cuando el blog vivía en `skyairline.com/blog`, está en la propiedad `www`.
No bloquea el diagnóstico, pero GSC conserva 16 meses: jul–sep 2025 vence entre noviembre de 2026 y enero de
2027. Quedó como decisión pedida a SKY en el kickoff («Historia de Search Console»: SKY da acceso a `www`,
Efeonce exporta). No simular consultas antiguas con el dominio padre.
Comprobar acceso nominal a WordPress/GTM/infra del sitio correcto. La conexión analítica no acredita
permisos CMS; las credenciales institucionales de Efeonce no habilitan SKY.

**Plan editorial.** Revisar primero el inventario y la intención cubierta. Prioridades de Natalia:
Perú doméstico, rutas internacionales actualizadas, experiencias alrededor del aeropuerto de llegada y
refresh de artículos que ya funcionaban. Confirmar prioridades comerciales y rutas oficiales vigentes.
Proponer título + sinopsis + intención + URL/acción y obtener la aprobación correspondiente antes de producir.
El [primer lote preparado](../../../docs/services/sky-blog-seo/PLAN_RECUPERACION_PRIMER_LOTE_2026-10-15.md)
quedó reordenado el 23-10 (ver su Delta): primero palancas de todo el sitio y contenidos de temporada antes
del 15-11; la URL larga de cambio de vuelo va con 301 a `/cambiar-vuelo-sky/`; Trujillo, Destinos de verano
y SKY Plus bajan como recuperación. Backlog de 30 piezas: `outputs/sky-blog-seo-audit-2026-10-23/SKY-backlog-editorial-nov-ene.csv`.
No declarar equivalencia por slug parecido o HTTP 200; revisar intención, vigencia y destino del CTA antes de proponer 301.

**Lote editorial (research → redacción → specs → handoff).** Cargar
[`references/lote-editorial.md`](references/lote-editorial.md) antes de investigar o redactar más de un
artículo: inventario, research con DataForSEO (no Semrush a ese volumen), pauta + piloto, redacción por lotes
con ficha SEO y callouts, rutas sólo de «Precios y Rutas SKY» 🟢 del mercado del lector, specs literales y
paquete de handoff. Fija el orden y las trampas; la voz sigue siendo del Playbook.

**Producción.** Cargar el [Playbook Producción · Blog SKY](https://app.notion.com/p/06531fec27634eed98b73094ba05ce5e)
y sólo sus normas enlazadas que hagan falta. No copiar voz, formatos visuales ni catálogo de rutas a esta skill.
La propuesta antigua de flujo visual no reemplaza las normas vigentes. El criterio fotográfico es el «SKY Blog ·
Sistema visual de imágenes» de Daniela Ferreira, en SharePoint Sky-Efeonce:
`Documentos compartidos/General/SKY Blog SEO/01 Onboarding/SKY_Blog_Sistema_Visual.pdf`. Tres imágenes por
artículo con función propia, sin aviones ni uniformes SKY sin aprobación de Marca; sus fotos IA son pilotos del
criterio, no del lugar. Su aprobación se pidió a Marca SKY en el kickoff; resumen en los insumos §7.
Producir o revisar cualquier imagen del blog (prompt, portada, exportación, banner de ruta) es de la skill
`sky-blog-graphic-line` y del Creative Workbench (`brands/sky-airline/blog/`); esta skill sólo fija la spec.
Handoff, aprobación, publicación y URL pública verificada son estados diferentes. Publicar por lotes según calendario aprobado.

**Analítica.** Usar readers canónicos y aislar host/período/canal. El top 50 existente ordena sesiones con
actividad por página: no equivale a entradas ni suma sesiones únicas. Para adquisición usar Organic Search
con landing en el alcance. GA4 y GSC conservan sus calendarios; clics no equivalen a sesiones. No emitir una
edición nueva de Insights o alterar snapshots históricos sólo para preparar un análisis.

Reconciliar cada cruce GSC contra su control: página y país independientes no acreditan cobertura de
página × país ni de consulta × página × país. Paginar o quitar query no recupera necesariamente el total;
mantener faltantes y cobertura explícitos. Fecha CMS actual puede ser republicación, no creación.
Antes de intervenir, congelar T−28..T−1, actor/versión y fecha efectiva; observar T+28/T+56 con ventanas
comparables. Septiembre es referencia analítica, no baseline automático de una publicación de noviembre.

**Valor publicitario estimado.** Cargar [el método](../../../docs/services/sky-blog-seo/INDICADOR_VALOR_ORGANICO_V1.md)
y [el manual](../../../docs/manual-de-uso/growth/valorar-trafico-organico.md). Usar el cálculo canónico de
`src/lib/growth/seo/organic-traffic-value/`. GSC clics page/query/país × CPC del mismo país. Extraer detalle
paginado y controles sin query. El top 5 por página no reconstruye el total. Publicar cobertura y ausencias,
con marca/sin marca separadas. No extrapolar consultas ocultas ni llamar ahorro/ROI al resultado.

**Datos de mercado.** Cargar `dataforseo-operator`. Leer snapshots antes de comprar. Usar `pnpm dataforseo`
con preview, organización, consumer SEO y techo de gasto, conservar recibo y persistir mediante el writer
canónico. No usar APIs paralelas ni aumentar tracking recurrente para una valoración puntual. CPC de hoy
aplicado a un mes anterior es una revaloración a precios actuales, no precio histórico.

**Informe al cliente.** El informe A4 se regenera con `pnpm exec tsx scripts/seo/sky-blog-audit-report.ts`
y `pnpm report:compose <plan.json> --out <dir> --asset org-logo:sky=ai-generations/2026-09-23_cmp003-sky-hangar/refs/sky-official.svg`
(cargar `report-studio`). Lenguaje para gerencia de marketing, no de auditoría interna.

## Lecciones operativas (23-10-2026)

- Antes de aceptar la tesis de penalización, verificar redirecciones (muestra de URL antiguas con su código
  y destino) y revisar acciones manuales y seguridad en GSC. La capa SEO perdida explicaba más que Google.
- Medir la recuperación contra el mismo mes del año anterior, nunca contra septiembre: el blog es estacional.
- La propiedad GSC antigua vence a los 16 meses; exportarla antes de que se pierda la historia previa.
- Un acceso a Search Console nombra una propiedad: confirmar cuál (blog o `www`) antes de dar por resuelta la
  historia. El 31-10 se registró por error acceso a `www`; era la del blog (corregido el 01-11).
- Terceros con acceso al WordPress despublican: comparar el inventario contra el corte anterior en cada
  pasada y alertar con la lista de URL.
- El logo de la organización SKY en Greenhouse es una imagen generada por IA; el oficial es
  `ai-generations/2026-09-23_cmp003-sky-hangar/refs/sky-official.svg`. No usar el de la organización.
- El canal OneDrive «Sky - Efeonce - General» está compartido con SKY: no dejar borradores ahí. Lo interno va
  a «1. Clientes (Interno) › Sky - SEO-AEO»; al canal compartido sólo después del envío.

## Lecciones del lote editorial (05-11-2026)

- Research de lote con DataForSEO: Semrush agotaría la cuota (Julio). `serp-compare` admite 20 queries por
  panel y `research` 20 seeds por corrida; costo del lote de 54, USD 1,61.
- El SERP orgánico de DataForSEO llega en parte envuelto (`google.com/goto`): `serp-compare` puede dar a SKY
  por ausente. Recalcular la posición desde `breadcrumb`/`website_name`.
- Ocho fichas «Nuevo» ya tenían URL publicada. Se decidió caso a caso (reescribir sobre la URL, 301 propuesto
  o URL por decidir) y la propiedad `Trabajo SEO` no se cambió sin aprobación de Julio. Buscar la URL
  existente del tema antes de proponer un slug nuevo.
- Lotes en paralelo sobrescribieron el generador común de specs: un generador por lote y validación de todas
  las specs contra los borradores al cierre.
- Pilotear un artículo y ajustar la pauta antes de repartir; el piloto (Zorritos) fijó el formato de ficha,
  JSON-LD y callouts que replicaron los nueve lotes.

## Cierre de cada encargo

Entregar hallazgos/resultado, período y alcance, evidencia verificable, decisiones y pendientes con dueño.
Mantener trazabilidad en el expediente de la cuenta y estado vivo en Notion. Las acciones externas siguen
la autorización del encargo: esta skill no autoriza envíos, cambios de acceso, publicación o gasto por sí sola.

Este archivo tiene espejo byte a byte en `.claude/skills/sky-blog-seo/SKILL.md`.
