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
- Las 80.000 → 40.000 visitas y agosto 2025 son antecedentes declarados por el cliente. El diagnóstico
  del 15-10 observa transición `www.skyairline.com/blog/` → `blog.skyairline.com` el 26–27/09/2025;
  no sustituye el registro de despliegue ni demuestra una causa única o una penalización de Google.
- Expectativa de Pilar: recuperación importante en tres meses desde noviembre. Compromiso de Julio:
  auditoría hasta el 20-10-2026 y preparación del indicador. No prometió recuperar una cifra en ese plazo.

## Elegir el trabajo

**Auditoría/recovery.** Cargar `seo-aeo` y sus módulos técnicos/de migraciones pertinentes. Reconstruir
inventario y cambios con WordPress/GSC/histórico, separar hallazgos de hipótesis, priorizar páginas perdidas
y bloqueos comprobados. No inventar el dominio anterior a partir de los ejemplos de la transcripción.
Cada acción lleva evidencia, owner técnico, dependencia y verificación. No cambiar cuentas, redirects o CMS
como parte de una lectura. El pedido de ejecutar cambios concretos gobierna su alcance.

Para continuar o preguntar qué falta, cargar la [matriz de cobertura y pendientes](../../../docs/services/sky-blog-seo/COBERTURA_Y_PENDIENTES_AUDITORIA_2026-10-15.md).
Al corte del 15-10, diagnóstico base entregado, auditoría integral parcial, primer lote preparado e
implementación pendiente. Conservar separados investigación, preparación, aplicación y resultados.
Los siete frentes abiertos son migración/medición histórica, indexación/seguridad, calidad editorial,
competencia/SERP, backlinks, experiencia móvil y contribución comercial. El censo público no acredita
revisión editorial de los 1.697 posts ni la auditoría técnica del motor de reservas.

Julio no dispone del GSC anterior: es un límite histórico, no una solicitud obligatoria ni un bloqueo
general. Continuar con GA4, GSC actual, archivo y registros recuperables; no simular consultas antiguas
con el dominio padre. Comprobar acceso nominal a WordPress/GTM/infra del sitio correcto. La conexión
analítica no acredita permisos CMS; las credenciales institucionales de Efeonce no habilitan SKY.

**Plan editorial.** Revisar primero el inventario y la intención cubierta. Prioridades de Natalia:
Perú doméstico, rutas internacionales actualizadas, experiencias alrededor del aeropuerto de llegada y
refresh de artículos que ya funcionaban. Confirmar prioridades comerciales y rutas oficiales vigentes.
Proponer título + sinopsis + intención + URL/acción y obtener la aprobación correspondiente antes de producir.
El [primer lote preparado](../../../docs/services/sky-blog-seo/PLAN_RECUPERACION_PRIMER_LOTE_2026-10-15.md)
contiene veinte URLs priorizadas y diez iniciales: nueve artículos actuales y una decisión 404. La guía
histórica rota y la actual de cambios son una decisión coordinada, no dos artículos nuevos. No declarar
equivalencia por slug parecido o HTTP 200; revisar intención, vigencia y destino del CTA antes de proponer 301.

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

## Cierre de cada encargo

Entregar hallazgos/resultado, período y alcance, evidencia verificable, decisiones y pendientes con dueño.
Mantener trazabilidad en el expediente de la cuenta y estado vivo en Notion. Las acciones externas siguen
la autorización del encargo: esta skill no autoriza envíos, cambios de acceso, publicación o gasto por sí sola.

Este archivo tiene espejo byte a byte en `.claude/skills/sky-blog-seo/SKILL.md`.
