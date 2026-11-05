# Lote de noviembre 2026 · Blog SKY — producción de imágenes

> **Tipo de documento:** Expediente de servicio (producción visual de un lote)
> **Versión:** 1.0
> **Creado:** 2026-11-05 por Claude (misma sesión que el lote editorial), con las instrucciones de Julio Reyes
> **Línea gráfica y método:** skill [`sky-blog-graphic-line`](../../../.claude/skills/sky-blog-graphic-line/SKILL.md)
> (lote en [`references/workflow.md`](../../../.claude/skills/sky-blog-graphic-line/references/workflow.md) §9)
> **Paso a paso:** [Producir las imágenes de un lote del Blog SKY](../../manual-de-uso/growth/producir-imagenes-lote-blog-sky.md)
> **Lote editorial que lo alimenta:** [LOTE_NOVIEMBRE_2026_FLUJO_EDITORIAL.md](LOTE_NOVIEMBRE_2026_FLUJO_EDITORIAL.md)

## Estado al 2026-11-05

| Qué | Estado |
| --- | --- |
| Banners de ruta | 88 compuestos (44 artículos × escritorio y móvil); 10 artículos bloqueados |
| Portadas (IMG 1) | 52 de 54: 43 nuevas y 9 que ya existían; 2 bloqueadas |
| Escenas (IMG 2–3) | 93 generadas y exportadas de 99 pendientes; 6 bloqueadas; 4 ya existían |
| Medición y peso | Todas las portadas pasan `medir-portada`; todo bajo 200 KB (fotos) y 150 KB (banners) |
| Revisión de Diseño y Marca SKY | Pendiente. Todo queda `pending-human-and-pixel-review` |
| Frame.io, Notion, OneDrive, WordPress | **Nada subido ni publicado** |
| Git | Workbench: commits `d74319e`, `b81e0df` y `e8b2098` en `claude/sky-blog-visual-system`, **sin push**. Maestros y WebP fuera de Git |

## Qué pidió Julio

| Pedido (2026-11-05) | Qué se hizo |
| --- | --- |
| «¿Y si produces tú las imágenes?» | La producción se hizo en la misma sesión del lote editorial, en vez de una sesión derivada |
| «Nano banana pro no lo uses, no tiene buena calidad» | Motor único `gpt-image-2.5-sunburst`, calidad max, 3840×2160; con REF, el mismo motor con `--image` |
| Shutterstock «para pedir imágenes reales de referencia»; luego eligió «Usar Wikimedia Commons» donde no hubiera | REF-01 reales de las dos fuentes, con procedencia |
| «El avión no es un avión, son 2 palitos»; la ruta antes del título y más destacada; «hazlo más avión moderno como el de SKY» | Compositor del banner reescrito (commit `d74319e`): ruta primero en Metric Black, titular de máximo 6 palabras que no repite el H1, sin etiqueta inferior, jet visto desde arriba sobre el arco. Aprobado: nunca se achica la letra |
| «Haz todos los banners y portadas» y «recuerda la colorimetría de SKY, bokeh y demás» | 88 banners y 43 portadas; bloque Brandlift (hoja 15 de Daniela Ferreira) y lente por tipo en cada prompt |
| «Avanza con las imágenes que te faltan» | 93 escenas IMG 2–3 |
| «Tenemos dos API key, ¿cuál estás usando?» | Ver [Costos](#costos): las expansiones y retoques de portada corrieron con la clave de empresa por error. Julio: «no hay problema» |

## Resultados

### Banners de ruta

- 88 WebP (1408×400 y 1080×1080), todos bajo 150 KB, en `runs/banners/<uuid>/` del Workbench con su `qa.json`.
- Cinco artículos con foto (receta B): cena chilena, retablo, Sauce y Yanahuara en los dos formatos, y Paraty sólo en
  móvil. Paraty escritorio pasó a la receta A porque «Santiago → Río de Janeiro» no cabe con foto sin achicar la letra
  (se probó achicar y se revirtió). El resto, receta A.
- Ruta tomada del catálogo de Notion «Precios y Rutas SKY» (filas 🟢 Activa del mercado del lector, consultado el
  2026-11-05). Cada job pide volver a verificar en skyairline.com el día de publicación.

### Portadas (IMG 1)

- 43 nuevas, exportadas en 1408×768, 1200×630 y 1080×1080, bajo 200 KB, con `medir-portada` en verde.
- 9 ya existían de octubre y no se regeneraron: Valdivia, Curanto, Copacabana, Paraty, Cancún, Lima en 3 días, Mal de
  altura, Equipaje de mano y Adulto mayor.
- 49 generaciones de portada (43 piezas más 6 versiones v2): 33 con REF real y 16 sin REF.
- 39 maestros pasaron por la expansión que aleja la cámara (Flare, candidato crudo ampliado de 2560 a 3840 px).
- Tres portadas de aeropuerto (noticia de Talara, GOL Chile y puntualidad Chile) pasaron el gate con la cabeza cortada
  porque la caja del sujeto empezaba en los hombros; se rehicieron con la figura más abajo (`ZOOM_TOP=0.18`).
- El arco de Catacaos traía letras falsas; se retocó con máscara.

### Escenas (IMG 2–3)

- 99 escenas pendientes (157 imágenes del lote menos 54 portadas menos 4 ya producidas: IMG 2 y 3 de Valdivia y de
  Curanto, marcadas «no regenerar» en su spec).
- 32 sin REF y 67 con REF; de las 67, 61 con referencia válida y 6 bloqueadas.
- 93 generadas y exportadas en 1408×768 bajo 200 KB. 11 necesitaron exportarse desde una copia con desenfoque leve
  (σ 0,6–2,0) por follaje, manglar u oleaje.
- Retoque de letras en dos escenas: inscripción del arco de Yanahuara (dos pasos) y un letrero en una fachada de la
  escena 2 de la noticia de Talara.

## Bloqueados y por qué

| Pieza | Motivo | Qué lo destraba |
| --- | --- | --- |
| Portadas de Colán y Amigos | Sin foto real del lugar (REF-01) | Una REF válida del lugar |
| Escenas Amigos 2 y 3, asado alemán (cena chilena 2), picante a la tacneña (Tacna 3), cerámica Wayku (Lamas 3), poza de Baños del Inca (Cajamarca 3) | Sin referencia real válida | Una REF válida o cambio de spec por Editorial |
| Banners de Cajamarca, Carnaval de Cajamarca, Chiclayo, Cumbemayo, Talara y noticia de Talara | Ruta no 🟢 Activa en «Precios y Rutas SKY» para Perú | Paid / Ad Ops cataloga la ruta con URL limpia |
| Banner de Lima en 3 días | Ruta no 🟢 Activa para Chile | Paid / Ad Ops crea la fila es-cl |
| Banner de Cancún | SCL → CUN figura 🔴 Archivada | Paid / Ad Ops confirma una ruta activa |
| Banners de las dos notas de puntualidad | No hay dato de puntualidad por ruta con fuente que sostenga una venta | Política de la nota: sin CTA de venta |

El motivo de cada banner queda en `specs/MANIFEST.json` de la pieza.

## Costos

Cifras **estimadas** desde los logs del CLI (la entrada se cobra aparte), salvo donde se dice medida.

| Partida | Corridas | Costo | Clave |
| --- | --- | --- | --- |
| Generación de portadas (`ai:image`, Sunburst max) | 49 | ≈ USD 20,00 | Personal |
| Expansión y corrección de uniones de portada, retoque de Catacaos (`ai:inpaint`, Flare high) | — | ≈ USD 3 (suma de los manifiestos) | Empresa, por error |
| Generación de escenas (`ai:image`, Sunburst max) | 93 | ≈ USD 37,20 | Personal |
| Retoques de escenas (`ai:inpaint`, Flare high) | 3 | ≈ USD 0,15 | Personal |
| **Total** | | **≈ USD 60** | |
| Shutterstock | 20 licencias (7 portadas + 13 escenas) | De las 100 descargas de la suscripción | — |

**Corrección.** Al cerrar portadas y banners se informó a Julio «cerca de USD 43 en generación». Esa suma contó dos
veces los logs `batch*.log` (dos globs que los incluían); sin duplicar, la generación de portadas estima ≈ USD 20,00.

Logs: `ai-generations/2026-11-05_sky-blog-lote/portadas/{batch1..4,zoom,heal}.log` y `escenas/gen-a..f.log`. Toda
generación con `ai:image` registra «clave personal».

## Procedencia de las referencias

- 33 portadas y 61 escenas usaron una REF-01 real. Escenas: 40 de Wikimedia Commons, 13 de Shutterstock y 8 que
  reusan la REF de la portada del mismo artículo.
- Registro en `projects/sky/blog-lote-2026-11/refs-ledger/` del Workbench, sin URLs firmadas:
  `shutterstock-licencias-portadas-2026-11-05.json` y `shutterstock-licencias-escenas-2026-11-05.json` (`image_id` y
  `license_id`), `wikimedia-refs-2026-11-05.json` (título, página, licencia y autor), `ledger-escenas-2026-11-05.json`
  (fuente por escena) y `plan-referencias-escenas.json`.
- Uso declarado: «REF-01 solo como evidencia geográfica para generar; no se publica».
- Shutterstock devolvió candidatos de otros países (Norfolk, Marrakech, Oropesa en España, Langkawi en Malasia); se
  descartaron al leer la descripción y se reemplazaron por Wikimedia.

## Para revisión humana

No son errores del flujo; son decisiones que tienen que mirar Julio, Diseño o Marca SKY antes de aprobar:

- Portada de Punta Cana sin la viajera: la expansión rehízo la escena y la borró.
- Cenas navideñas: la persona sale cortada a la altura del pecho, porque el foco son las manos y la comida.
- Portada de check-in: el ícono del avión en la pantalla del celular.
- Escenas con bikini de espaldas: Tarapoto 2 y playas de Buenos Aires 3.
- Referencias aproximadas: Catacaos 2 con un taller de paja toquilla de Ecuador; Titicaca 3 con Taquile para Amantaní;
  lodge de selva 2 y 3 con vegetación amazónica genérica.
- Expansión con Flare y ampliación de 2560 a 3840 px: método sin validar por Julio.
- Avión del banner (`plane-topview.svg`): dibujado para el blog, no es asset oficial de SKY; validar con Marca SKY.
- `specs/NOTAS_LOTES.md` dice que Mal de altura, Copacabana, Paraty, Cancún y Lima ya tenían imágenes producidas y que
  Equipaje de mano reutiliza IMG 1 e IMG 3 de su v1; el lote igual generó sus IMG 2–3. Diseño cruza las dos versiones
  antes de subir y decide cuál va.

## Dónde vive cada cosa

| Qué | Dónde |
| --- | --- |
| Pieza del lote (specs, jobs, plates, refs-ledger, scripts) | Creative Workbench `projects/sky/blog-lote-2026-11/` (rama `claude/sky-blog-visual-system`, sin push) |
| Specs y MANIFEST | `specs/<id>.json`, `specs/MANIFEST.json`, `specs/NOTAS_LOTES.md`, `specs/PRODUCTION_BRIEF.md` |
| Jobs de banners | `jobs/<id>-ruta.json` y `jobs/<id>-ruta-movil.json` (88) |
| Entradas de prompt | `plates/portadas-*.json`, `plates/escenas-img23.json`, `plates/brandlift.json` |
| Scripts del lote | `tools/imagenes/` (copia de lo que corrió; rutas absolutas, algunos leen el scratchpad de la sesión) |
| Banners compuestos | `runs/banners/<uuid>/` (fuera de Git) |
| Portadas y escenas exportadas | `salidas/<articulo>/entrega/` con el maestro aprobado en `salidas/<articulo>/img{1,2,3}-maestro.png` (fuera de Git) |
| Vistas del gate | `salidas/vistas/` y `ai-generations/2026-11-05_sky-blog-lote/portadas/vistas/` |
| Maestros, prompts, expansiones, retoques, copias suaves y logs | greenhouse-eo `ai-generations/2026-11-05_sky-blog-lote/{portadas,escenas}/` (fuera de Git) |
| Fotos de referencia descargadas | `ai-generations/2026-11-05_sky-blog-lote/{portadas,escenas}/refs/` (fuera de Git) |
| Lecciones de esta producción | [`sky-blog-graphic-line/references/lessons.md`](../../../.claude/skills/sky-blog-graphic-line/references/lessons.md) (entradas del 2026-11-05) |

## Pendientes

| Pendiente | Dueño |
| --- | --- |
| Validar la expansión con Flare y la ampliación 2560 → 3840 | Julio |
| Revisar las observaciones de la sección anterior y decidir qué se regenera | Julio y Diseño (Daniela, Melkin) |
| Subir por versión a Frame.io y cambiar el estado de cada ficha en Notion | Diseño, con la indicación de Julio |
| Entregar la última versión aprobada en OneDrive `SKY Blog SEO › 04 Entregables` y publicar en WordPress (ALT literal, portada sin lazy) | Diseño / Valentina, tras aprobación |
| Aprobar los artículos sin aprobación del tema: Ayacucho, Equipaje de bodega, Equipaje de mano y Colán (sus imágenes no se suben hasta entonces) | SKY |
| Catalogar las rutas bloqueadas | Paid / Ad Ops |
| Conseguir REF para Colán, Amigos y las 6 escenas bloqueadas | Producción, con Editorial si cambia la spec |
| Validar el avión del banner, el verde de los puntos y la tipografía | Marca SKY |
| Push de la rama del Workbench | Julio indica |
| Llevar el bloque Brandlift al contrato y los scripts del lote a un CLI gobernado del Workbench | Producción (siguiente lote) |
| Volver a verificar cada ruta en skyairline.com el día de publicación | Quien publica |
