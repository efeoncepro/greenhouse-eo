Vas a producir las imágenes editoriales y los banners de ruta de los 54 artículos del Blog SKY (blog.skyairline.com, servicio SEO / Marca) redactados el 05/11/2026 en el Content Hub de Notion: por artículo, IMG 1 portada, IMG 2 e IMG 3 (escenas, sin texto) y BANNER 1 de ruta. Trabajas en /Users/jreye/Documents/creative-workbench.

Lee completo, antes de nada, el brief de producción, que es tu norma:
/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-05_sky-blog-lote/specs/PRODUCTION_BRIEF.md
Luego carga las skills sky-blog-graphic-line (con todas sus references/) y efeonce-creative-workbench (con references/state-continuity.md).

Insumos:
- Una spec por artículo: /Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-05_sky-blog-lote/specs/<id>.json. MANIFEST.json dice cuáles están listas (las 54 listas, validadas contra los callouts el 05/11) y SCHEMA.md trae el esquema.
- Cada spec copia los callouts 🖼️ y 🎫 del artículo en Notion. Antes de producir una pieza, compárala con su callout: si difieren, manda el callout.

Orden de trabajo:
1. Registra en el Workbench (contrato + prueba) y en la skill sky-blog-graphic-line (más su espejo en .codex/) la decisión de Julio del 05/11: no se usa Nano Banana Pro. El motor es gpt-image-2.5-sunburst (max, 3840×2160); con una foto real REF-01, el mismo motor en modo edición (--image). Detalle en el brief §3.
2. Ajusta el compositor del banner, brands/sky-airline/blog/compose/route-banner.mjs, según el brief §9:
   - El avión pasa de «2 palitos» a una silueta rellena que sigue la tangente del arco, con un hueco en la línea punteada.
   - Nueva jerarquía: la ruta «Lima → Tumbes» va primero, arriba y más destacada; el titular baja a segundo nivel y no repite el H1.
   Después recompone los ejemplos A y B (escritorio y móvil), muéstraselos a Julio al 100 % y pregúntale si quiere más ajustes. No produzcas banners del lote hasta que los apruebe.
3. Calibra la fotografía con 2 o 3 artículos antes de escalar (Zorritos es un buen candidato), con gate medir-portada y QA al 100 %. Antes de pagar generaciones, pregúntale a Julio el tope de gasto y la prioridad.
4. Escala por lotes. Un lugar identificable sin REF-01 real queda Bloqueado con su motivo, y los banners con estado bloqueado no se producen.

Reglas:
- Una marca por corrida.
- Cambios solo en brands/sky-airline/blog/** y projects/sky/<pieza>/**.
- Corre los gates del brief §7 antes de cada commit. No hagas push sin indicación.
- qa.approval queda siempre pending-human-and-pixel-review.
- No cambies propiedades del Content Hub ni crees tareas en Notion sin que Julio lo pida.

Terminado significa: el motor registrado, el compositor ajustado y aprobado por Julio, las piezas calibradas con su QA, y un reporte por artículo con lo producido, lo bloqueado con su motivo y el costo.

Contexto. La sesión «Research SEO/AEO Content Hub» redactó los artículos en POV «El Viajero» según el Playbook Producción · Blog SKY. Cada artículo trae su ficha SEO y metadatos, tres callouts de imagen y un callout de banner. Los banners usan solo rutas 🟢 Activas de «Precios y Rutas SKY» del mercado del lector; las rutas no catalogadas quedan con el banner bloqueado y un aviso rojo para Paid/Ad Ops.
Decisiones de Julio del 05/11:
- Portada, dos escenas y un banner por artículo.
- No se usa Nano Banana Pro.
- El avión del banner no puede seguir siendo «2 palitos».
- La ruta destaca más que el titular y va antes de él.
- El titular no repite el título del artículo.
Lo de Performance/KV de SKY no aplica al blog. Si la skill y un contrato difieren, manda el contrato, salvo en estas decisiones de Julio.
Canvas de la línea gráfica: https://claude.ai/artifact/XSXa4MRuNjnyaKmhdLTvUD. Háblale a Julio en español neutro, con tuteo y sin voseo.

Antes de planificar, lee también NOTAS_LOTES.md, en la misma carpeta. Trae:
- **Imágenes ya producidas que NO se regeneran:** Valdivia, Curanto, Copacabana, Paraty, Cancún, Lima, mal de altura, las IMG 1 y 3 de equipaje de mano, y adulto mayor. Hay que revisar los adjuntos de Paraty y de adulto mayor, que están cruzados.
- **Una pieza para archivar:** la IMG 2 de equipaje de mano, porque muestra una cabina de avión.
- **Artículos sin aprobación de SKY,** que no se producen hasta que la tengan: Ayacucho, equipaje de bodega, equipaje de mano y Colán.
- **Los 10 banners bloqueados:** Cajamarca, Carnaval de Cajamarca, Chiclayo, Cumbemayo, Lima, Talara, Cancún y tres noticias (puntualidad CL, puntualidad PE y Talara).
- **Las noticias:** llevan 2 imágenes cada una.
