---
name: sky-blog-seo
description: >-
  Operar el servicio SEO del Blog SKY: recuperación tras la migración, análisis GA4/GSC,
  prioridades editoriales y valor publicitario estimado por consulta y país. Usar para
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

## Estado al 23-10-2026

Auditoría consolidada e informe A4 (23 páginas) generados y revisados; correos redactados; **nada enviado
a SKY**. Diagnóstico: caída en tres etapas (previa con AI Overviews y volumen, migración, posterior),
causa técnica nombrada (plugin SEO no migrado), alerta de nueve artículos de Perú retirados entre el 15 y
el 23-10, escenarios nov–ene y valor publicitario como rango. El expediente vive en
[`caso-auditoria-2026-10/`](../../../docs/services/sky-blog-seo/caso-auditoria-2026-10/README.md), con sus
pendientes y dueños; toda cifra sale de [HECHOS.md](../../../docs/services/sky-blog-seo/caso-auditoria-2026-10/HECHOS.md).
Auditoría interna: [consolidada del 23-10](../../../docs/audits/growth/2026-10-23-sky-blog-seo-audit-consolidada.md),
cuyo §6 corrige el trabajo del 15-10.

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

Julio no dispone del GSC anterior. No bloquea el diagnóstico, pero GSC conserva 16 meses: los datos de
jul–sep 2025 de la propiedad `www` o de dominio vencen entre noviembre de 2026 y enero de 2027, así que
pedir el acceso a SKY y exportarlos es urgente. No simular consultas antiguas con el dominio padre.
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

**Producción.** Cargar el [Playbook Producción · Blog SKY](https://app.notion.com/p/06531fec27634eed98b73094ba05ce5e)
y sólo sus normas enlazadas que hagan falta. No copiar voz, formatos visuales ni catálogo de rutas a esta skill.
La propuesta antigua de flujo visual no reemplaza las normas vigentes. Handoff, aprobación, publicación y
URL pública verificada son estados diferentes. Publicar por lotes según calendario aprobado.

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
- Terceros con acceso al WordPress despublican: comparar el inventario contra el corte anterior en cada
  pasada y alertar con la lista de URL.
- El logo de la organización SKY en Greenhouse es una imagen generada por IA; el oficial es
  `ai-generations/2026-09-23_cmp003-sky-hangar/refs/sky-official.svg`. No usar el de la organización.
- El canal OneDrive «Sky - Efeonce - General» está compartido con SKY: no dejar borradores ahí. Lo interno va
  a «1. Clientes (Interno) › Sky - SEO-AEO»; al canal compartido sólo después del envío.

## Cierre de cada encargo

Entregar hallazgos/resultado, período y alcance, evidencia verificable, decisiones y pendientes con dueño.
Mantener trazabilidad en el expediente de la cuenta y estado vivo en Notion. Las acciones externas siguen
la autorización del encargo: esta skill no autoriza envíos, cambios de acceso, publicación o gasto por sí sola.

Este archivo tiene espejo byte a byte en `.claude/skills/sky-blog-seo/SKILL.md`.
