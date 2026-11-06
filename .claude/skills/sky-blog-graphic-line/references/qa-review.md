# Revisión y estados

## 1. Píxel al 100 %, en este orden

| Qué | Falla típica |
|---|---|
| Manos | Dedos de más o fundidos, escala equivocada respecto del objeto, apoyos imposibles |
| Arquitectura | Líneas que se curvan, ventanas fuera de ritmo, pisos que cambian de altura |
| Texturas | Adobe, fruta, ladrillo o adoquín con patrón repetido idéntico |
| Letreros | Texto que parece legible y no lo es: el artefacto que más se cuela |
| Sombras | Dirección distinta de la luz declarada |
| Fidelidad | Elementos que no existen en el lugar o forma del monumento alterada (contra REF-01) |
| Personas | Poses, miradas al lente, rostros en primer plano, personas reales identificables |
| Miradas (E) | Ojos divergentes del mismo objetivo, iris lechosos, atención sin relación con el gesto. Con ojos ocultos no se certifica la dirección de ambas pupilas |
| Microescena (E) | La cámara no está donde la ficha dice que está quien fotografía (el modelo puede invertirla: delante en vez de detrás); acción, contacto o consecuencia distintos de los declarados |
| Profundidad | Borrón gaussiano plano, franjas, halos, máscaras, primer plano nítido o que tapa al protagonista, sujeto borroso |
| Luz y color | Exposición apagada, sombras empastadas, altas luces quemadas, HDR, sobresaturación, luz que no corresponde a la hora |
| Producto | Avión, cabina, uniforme o tripulación SKY: rechazo inmediato |

Un artefacto en el punto focal **se regenera, no se retoca**. Después de una edición generativa, repetir anatomía,
mirada y geografía. Tres intentos fallidos = estado `Bloqueado`, anotar qué falla y escalar.

**Letras dentro de la foto.** Toda letra legible, falsa o real, se borra antes de exportar: la foto editorial no
lleva texto. Casos del 2026-11-05: el arco de entrada de Catacaos con letras inventadas («ETTCGOUNTE»), la inscripción
tallada del arco de Yanahuara (escena 2) y un letrero en una fachada de la escena 2 de la noticia de Talara. Se retoca
con máscara y Flare:

```bash
cd /Users/jreye/Documents/greenhouse-eo
pnpm -s ai:mask --base <maestro>.png --rect u0,v0,u1,v1 --feather 8 --out <retoque>/<id>-mask.png
# o --polygon "u,v;u,v;…" --dilate 10 --feather 12 para una forma curva (arco)
OPENAI_API_KEY_PROFILE=personal gtimeout 900 pnpm -s ai:inpaint image --image <maestro>.png --mask <retoque>/<id>-mask.png \
  --adapter openai --model gpt-image-2.5-flare --quality high --run <retoque>/<id> --max-usd 1 --yes \
  --prompt "the same carved white sillar stone arch, its face plain and smooth with only natural stone texture and joints, absolutely no carved inscription, no letters and no words; same sunlight and shadows"
```

- El prompt describe en positivo la superficie limpia y **nunca nombra «logo», «marca» ni «brand»**, ni siquiera en
  negativo: la guarda de marca de `ai:inpaint` aborta con FATAL. En Talara, «with no sign, no logo, no letters» falló y
  pasó «the same plain white building facade above the windows, with nothing mounted on it; same light».
- Si la máscara no cubre toda la banda de texto, queda un resto: segundo paso con una máscara nueva sobre el resultado
  del primero (Yanahuara necesitó dos).
- `ai:inpaint` no acepta `--openai-key`; sin `OPENAI_API_KEY_PROFILE=personal` paga la clave de empresa.
- Guardar el `-antes.png` y mirar el resultado al 100 %: herrería, piedra y luz deben seguir siendo las del lugar.
  Costo de referencia: USD 0,04–0,06 estimado por paso (los tres retoques de escenas sumaron ≈ USD 0,15).

## 2. Portada

Además del píxel: `medir-portada.mjs` en verde **y** mirar las vistas `-hero-desktop` y `-hero-mobile` (¿se lee el H1?
¿el sujeto queda entero arriba?). Revisar og y cuadrado por separado. La caja del sujeto se declara desde la coronilla:
un gate verde con la caja desde los hombros deja pasar cabezas cortadas. Si la portada viene de una expansión,
comparar con el maestro anterior: el modelo puede reencuadrar o borrar al sujeto.

## 3. Secuencia del artículo

Mirar las piezas juntas: un mismo viaje (clima, hora, vestuario, objetos coherentes) con variedad de tipo, escala y
encuadre. Si la tanda pierde variedad, se escala a Editorial; no se cambia la escena en el motor para compensar.

## 4. Banner de ruta

Ruta primero y destacada; ruta verificada el día de publicación; copy sin precios ni ofertas; titular de máximo 6
palabras, sin viudas, dentro de sus líneas y distinto del H1; CTA correcto; sin etiqueta inferior (retirada el
2026-11-05); avión legible como jet sobre el arco; en B, titular fuera de la foto; peso < 150 KB; ALT presente. Ver
`qa.json`.

## 5. Qué se registra en la ficha (Notion)

Tipo A–H y registro D/E · decisión de primer plano (elemento o razón) · para E: posición de quien fotografía, acción,
contacto y objetivo de mirada · prompt final BASE y NEGATIVE tal como se usó · motor y versión desde el log · parámetros,
semilla e ID si el motor los expone · versión V01, V02… (sube con cada regeneración entregada, no con cada intento) ·
REF usadas (REF-ESTILO-D separada de REF-01 reales) · caja del sujeto y foco de la portada · salida de `medir-portada`.

## 6. Estados

**Ejecución completada ≠ criterio de marca confirmado ≠ aprobación ≠ entrega.** Una no implica las demás.

- `qa.approval` del Workbench queda `pending-human-and-pixel-review` siempre.
- Revisión por versión en Frame.io. Un comentario en Frame.io no reemplaza el cambio de estado en Notion.
- **Leer la revisión completa antes de corregir.** Los correos de resumen de Frame.io no traen todos los
  comentarios. Se barre el enlace compartido en vivo, desde el navegador integrado, con GraphQL y los encabezados de
  la sesión, y además el chat interno en `teams.cloud.microsoft`, donde vienen las capturas
  ([lessons.md](lessons.md), 2026-11-05). Responder en Frame o Teams requiere permiso del operador.
- **Corregir la zona, no regenerar.** Una observación sobre una zona se repinta sobre el maestro instalado, con una
  máscara que cubra objetos enteros. Un cambio global (cielo, hora, luz) se hace con una edición de la imagen
  completa. Después se vuelve a medir y a exportar. El maestro anterior queda en `salidas/<id>/anteriores/`.
- Aprueban Diseño (Daniela, Melkin) y, para el estilo, Marca SKY. Entrega final en `SKY Blog SEO › 04 Entregables`
  (sólo la última versión aprobada), luego WordPress.
- Estado de la ficha y estado de la tarea que no coinciden son un hallazgo (Playbook, 2026-10-14): no se aprueba encima.

## 7. Revisar un lote

- Mirar las piezas en **hojas de contacto** (miniaturas etiquetadas con el id) antes del gate y después de exportar, y
  abrir al 100 % las dudosas. En portadas, la hoja usa la vista `-hero-desktop` de cada una.
- Separar lo que es error del flujo (se corrige antes de entregar) de lo que es **observación para revisión humana**
  (se anota en el expediente del lote y no se «arregla» por cuenta propia). Ejemplos del 2026-11-05: portada de Punta
  Cana sin la viajera tras la expansión; cenas navideñas con la persona cortada a la altura del pecho porque el foco son
  las manos y la comida; ícono del avión en el celular de la portada de check-in; escenas con bikini de espaldas
  (Tarapoto 2, playas de Buenos Aires 3); referencias aproximadas (Catacaos 2 con un taller de paja toquilla de Ecuador,
  Titicaca 3 con Taquile para Amantaní, lodge de selva 2 y 3 con vegetación amazónica genérica).
- Un lote no se aprueba en bloque: cada pieza sigue su estado en Notion y su versión en Frame.io.

## 8. Llevarlo a un canvas de Claude Design (`/design`)

Canvas vigente (privado): «Blog SKY — Línea gráfica», https://claude.ai/artifact/XSXa4MRuNjnyaKmhdLTvUD (8 láminas,
2026-11-02, sin sistema de diseño: ninguno de la cuenta es de SKY; texto en Assistant, la fuente del tema, porque Metric
no tiene derechos de distribución). Para actualizarlo: leer el artifact, subir las piezas nuevas como assets y editar sólo
las láminas que cambian.

Cuando se pida presentar la línea en un canvas:

- El canvas **muestra piezas compuestas por el motor; nunca redibuja a mano** piezas de marca (lección de
  `efeonce-graphic-line`). Los banners de ruta se componen con `componer-ruta.mjs` y las portadas se exportan con
  `exportar.mjs`; el canvas recibe esos WebP/PNG como assets.
- Láminas sugeridas: principios (la imagen hace avanzar el artículo) · D y E con ejemplos · tipos A–H · la portada en el
  tema (vista `-zonas` y las dos simulaciones del hero) · antes/después de una portada de octubre · banner A y B en
  escritorio y móvil · reglas del banner · revisión y estados · pendientes de Marca.
- Formato del proyecto: carpeta con un `*.dc.html` por lámina y `canvas.json` (patrón del kickoff
  `ai-generations/2026-10-31_kickoff-seo-sky/canvas/project/`). Publicar con la herramienta Artifact (privado por
  defecto); subir las imágenes como assets y referenciarlas por la URL que devuelve.
- Las piezas de octubre son entregas reales del cliente: mostrarlas en un canvas privado de revisión está bien; no
  publicarlas fuera del equipo.
