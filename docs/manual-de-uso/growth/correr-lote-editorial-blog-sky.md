# Correr un lote editorial del Blog SKY

> **Tipo de documento:** Manual de uso
> **Versión:** 1.0
> **Creado:** 2026-11-05 por Claude, a partir del lote de 54 artículos de esa fecha
> **Última actualización:** 2026-11-05 por Claude
> **Documentación técnica:** [método de lote de la skill `sky-blog-seo`](../../../.claude/skills/sky-blog-seo/references/lote-editorial.md) · [caso de noviembre 2026](../../services/sky-blog-seo/LOTE_NOVIEMBRE_2026_FLUJO_EDITORIAL.md)

## Para qué sirve

Para llevar un grupo de artículos del Content Hub de SKY desde la investigación hasta un paquete listo para
producir imágenes: research SEO/AEO, redacción en POV «El Viajero», ficha SEO y metadatos, callouts de imagen
y de banner de ruta, y specs para la sesión de producción. Termina en Notion, para revisión de Valentina.
No publica nada.

## Antes de empezar

- Carga las skills `sky-blog-seo` (con `references/lote-editorial.md`), `seo-aeo` y `dataforseo-operator`.
  Para imágenes, más adelante, `sky-blog-graphic-line`.
- Ten a mano el [Playbook Producción · Blog SKY](https://app.notion.com/p/06531fec27634eed98b73094ba05ce5e):
  manda en voz, estructura e imágenes.
- Acceso a Notion del teamspace de SKY con permiso de edición de páginas.
- La CLI `pnpm dataforseo` con la organización SKY `org-b9977f96-f7ef-4afb-bb26-7355d78c981f` y un techo de
  gasto acordado. Como referencia, el research de 54 artículos costó USD 1,61.
- Decide quién aprueba qué: Julio prioriza y decide URL/301; Valentina revisa el texto; SKY aprueba el tema y
  la versión final.

## Paso a paso

1. **Arma el inventario.** Lista las filas activas del Content Hub con `Trabajo SEO`, mercado del lector y
   URL existente. Deja fuera las archivadas y las rechazadas por SKY. Marca las que aún no tienen aprobación:
   se pueden redactar, pero no pasan a diseño.
2. **Haz el research con DataForSEO.** No uses Semrush para un lote: se agota la cuota. Un panel de SERP por
   mercado (máximo 20 consultas por panel, Google móvil con AI Overview) y keywords relacionadas (máximo 20
   semillas por corrida). Corre siempre primero con `--dry-run` y después con `--max-usd` y `--yes`. Junta en
   un dossier por artículo: texto publicado, Search Console de la auditoría, SERP, keywords y canibalización.
3. **Escribe el research en Notion.** Al final de cada página, sin tocar propiedades ni contenido: sección
   «🔎 Research SEO/AEO · <fecha>» con lectura del caso, ficha SEO propuesta, demanda y SERP, preguntas AEO,
   análisis del texto actual si existe, plan editorial y lo que hay que verificar. Comprueba con una búsqueda
   que la sección está en todas.
4. **Redacta un piloto.** Un solo artículo completo con la pauta del lote. Revísalo y ajusta la pauta antes de
   repartir el resto. En noviembre el piloto fue Zorritos.
5. **Redacta por lotes.** Cada artículo se agrega al final de su página como `✍️ Artículo vN · <fecha> · POV
   «El Viajero»`, con:
   - la **ficha SEO y metadatos** completa (meta title de hasta 60 caracteres, meta description de 140 a 155,
     slug propuesto o URL existente, extracto de hasta 250, ALT de cada imagen, JSON-LD, enlaces internos y
     301 propuestos);
   - **tres callouts de imagen** (portada y dos escenas; las noticias, dos) y **un callout de banner**;
   - la ruta del banner tomada **sólo** de «Precios y Rutas SKY», 🟢 Activa y del mercado del lector. Si no hay
     ruta, el banner queda escrito como bloqueado, con su motivo y un aviso rojo para Paid / Ad Ops.
6. **Revisa antes y después de insertar.** Antes: TL;DR de 40–60 palabras con la keyword al inicio, variantes
   presentes, «Está bueno SKY.» una sola vez, al menos cuatro H2 en pregunta, sin voseo ni superlativos vacíos,
   ALT iguales en callout y ficha. Después: abre la página y confirma encabezado, callouts, firma, fuentes y
   JSON-LD, una sola vez cada uno.
7. **Genera las specs.** Una por artículo, copiada literal de los callouts, más un índice con el estado de cada
   banner. Al cerrar, regenera y valida todas contra los borradores: si dos lotes compartieron un script, uno
   pudo pisar al otro.
8. **Entrega el paquete.** Specs, índice, esquema, notas por lote (qué no se regenera, qué está bloqueado,
   hallazgos por dueño), brief de producción y prompt de la sesión que producirá las imágenes. Cópialo donde lo
   lee el Creative Workbench.
9. **Reporta en tres grupos:** listos, bloqueados con su motivo y fuera de alcance.

Si se lo pides a un agente, una forma que funcionó:

```text
Con las skills sky-blog-seo (references/lote-editorial.md), seo-aeo y dataforseo-operator,
haz el research SEO/AEO de las filas activas del Content Hub de SKY con DataForSEO y escríbelo
al final de cada página. No cambies propiedades ni publiques. Antes de gastar, muéstrame el preview.
```

## Qué significan los estados

| Estado | Significa |
| --- | --- |
| Research hecho | La sección existe en la página; no hay texto nuevo todavía |
| Redactado | Hay una versión «✍️ Artículo vN» completa; falta la revisión de Valentina |
| Banner listo | Ruta 🟢 Activa del mercado del lector, verificada el día del lote; se vuelve a verificar al publicar |
| Banner bloqueado | No hay ruta catalogada para ese mercado o la nota no lleva llamado de venta: no se produce |
| Sin aprobación de SKY | Se puede redactar; no pasa a diseño ni a producción |
| Publicado | Sólo cuando la URL final abre en WordPress; ningún paso de este manual llega ahí |

## Qué no hacer

- No cambies propiedades del Content Hub, ni siquiera `Trabajo SEO` cuando está mal: déjalo como hallazgo.
- No inventes una URL de ruta ni enlaces una ruta de otro mercado.
- No escribas cifras sin fuente oficial: usa `[Pendiente antes de publicar: …]`.
- No borres el research ni las versiones anteriores: la nueva va debajo.
- No publiques, no ejecutes 301 y no envíes nada a SKY dentro del lote.

## Problemas comunes

| Problema | Qué hacer |
| --- | --- |
| El SERP dice que SKY no aparece | Parte de los resultados viene envuelta en `google.com/goto`. Mira `breadcrumb` y `website_name` antes de concluirlo |
| La CLI rechaza el panel o las semillas | Divide: 20 consultas por panel y 20 semillas por corrida |
| En la página aparece `&lt;br` como texto o una tabla se rompe | El salto dentro de callouts y FAQ es la etiqueta `<br />` sin escapar; nunca uses la barra vertical dentro de celdas ni de callouts, y usa `<toggle>` en vez de `<details>` |
| El JSON-LD no cabe en la tabla | Resúmelo en la fila y pon el código en un bloque aparte debajo |
| Una spec no coincide con Notion | Manda el callout de Notion; corrige el JSON |
| Una ficha «Nuevo» ya tiene URL publicada | Redacta según lo que diga el research y avisa a Julio; no cambies la propiedad |
| No puedes leer Search Console en vivo | Usa los exportes de la auditoría y dilo en el research |

## Referencias técnicas

- Método y trampas: [`.claude/skills/sky-blog-seo/references/lote-editorial.md`](../../../.claude/skills/sky-blog-seo/references/lote-editorial.md).
- Caso, bloqueos y pendientes del lote de noviembre: [`LOTE_NOVIEMBRE_2026_FLUJO_EDITORIAL.md`](../../services/sky-blog-seo/LOTE_NOVIEMBRE_2026_FLUJO_EDITORIAL.md).
- Marco del servicio: [`docs/services/sky-blog-seo/README.md`](../../services/sky-blog-seo/README.md).
- CLI de DataForSEO: [manual](dataforseo-cli.md).
