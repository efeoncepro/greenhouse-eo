# Operar el contenido de la portada del blog

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.5
> **Creado:** 2026-10-24 por Claude
> **Ultima actualizacion:** 2026-10-24 por Claude (ficha de autor del blog, TASK-2057)
> **Documentacion tecnica:** [Portada del blog — runtime V1](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md) · [PDR-029 — Modelo de contenido de la portada del blog](../../public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md) · [TASK-2050](../../tasks/in-progress/TASK-2050-blog-portada-v3-content-model.md)
> **Estado:** en producción en `/blog/` desde el 2026-10-24 con datos reales (`eo_content_model_enabled = 1`). Los pasos marcados «producción» necesitan la aprobación del operador.

## Para qué sirve

Para mantener la portada del blog (`/blog/`) con contenido real sin tocar código: el formato de cada entrada, qué va
fijado en el slider y hasta cuándo, las tarjetas de «Para leer con calma» (cliente, última revisión, podcast), los eventos (webinars y talleres) y los recursos (guía, herramienta, diagnóstico,
Glitch), la foto, el cargo, la bio y las redes del autor, y la suscripción a Glitch. La portada se arma sola con eso y se refresca al publicar.
Qué ve el visitante: [Portada del blog](../../documentation/public-site/portada-del-blog.md).

## Antes de empezar

- El modelo vive en el plugin `efeonce-editorial-blocks` (carpeta `includes/content-model/`) del runtime
  `efeonce-public-site-runtime`.
- Lo que ve el visitante depende de la opción `eo_content_model_enabled`: en 0 la portada muestra el contenido de
  ejemplo aprobado y los eventos no tienen URL pública; en 1 usa los datos reales.
- Acceso SSH a Kinsta (`pnpm public-website:ssh-check`) para los pasos de producción.

## Paso a paso para el editor (WordPress)

### Formato de una entrada

En el editor de la entrada, panel **Portada del blog** → **Formato**. Una sola opción: Artículo, Caso, Guía, Grabación,
Podcast, Novedad, Glitch Edición o Glitch Flash (en Glitch, la edición semanal numerada es Edición y todo lo demás es Flash). Una **Novedad** (alianzas, anuncios de Efeonce) lleva un megáfono
en el chip y sólo entra al slider si se fija. Es distinto de la categoría y no cambia la URL. Si se publica sin formato,
el plugin asigna uno por las reglas de PDR-029 §1.1 (nunca Podcast: ése se elige a mano).

### Fijar una entrada en el slider

Mismo panel → **Fijar en la portada hasta (UTC)**. La entrada fijada aparece primero hasta esa fecha y sale sola al
vencer. Opcional: **Título del slider** en dos líneas (liviana y fuerte) e **Imagen del slider**. Sin imagen (propia o
destacada) una entrada no puede ser diapositiva. Sin imagen propia del slider, la portada usa la imagen destacada con un
velo de lectura del lado del texto y corta la bajada en dos líneas; si el arte se hizo para el slider, súbelo como
**Imagen del slider** y el velo desaparece. Las tres invitaciones (Glitch, guía o herramienta, diagnóstico) tienen su
lugar reservado: una entrada fijada ocupa uno de los lugares restantes.

Un artículo nuevo no necesita fijarse para entrar: el slider llena sus lugares de entradas con las más nuevas que
tienen imagen y no son Glitch ni Novedad. Como la portada de Marketing con Manzanitas trae texto, **todo artículo nuevo
necesita su Imagen del slider**, o el título del slider cae encima del texto de la portada:

- **Imagen del slider:** WebP 2:1 de 2400 × 1200, recortada de la placa (la foto sin texto), **sin texto** (el slider
  pone su título). Se ve en todos los anchos entre x 42–96 % · y 7–93 %; la cara va en x 68–92 % · y 10–64 %, a la
  derecha del título, y la mitad izquierda oscura y calma. En el teléfono sólo se ve la parte derecha, con el título
  debajo. La miniatura «Siguiente» usa esta imagen cuando existe.

### Tarjetas de «Para leer con calma»

El riel muestra las cuatro lecturas largas más recientes (12 minutos o más, sin Glitch, Novedades ni grabaciones),
los recursos marcados para el riel y, si hay, el próximo evento como una entrada de webinar. Cada tarjeta se arma sola
con la entrada; en el panel **Portada del blog** decides cuatro datos más:

- **Cliente del caso** (sólo con formato Caso): el cliente del caso; la tarjeta muestra su logo en lugar de la foto.
  Sólo aparecen clientes con logo cargado (hoy, ANAM). Un cliente nuevo lo agrega el equipo técnico.
- **Última revisión** (`AAAA-MM-DD`): la fecha de una revisión de fondo que hiciste tú (datos, enlaces, conclusiones).
  No es la fecha de modificación de WordPress: corregir una coma no cuenta. Enciende «Actualizado» por 30 días, sólo
  en entradas publicadas hace más de 60; el pie de la tarjeta dice «Actualizado <fecha>».
- **Imagen de la tarjeta del riel**: una imagen propia para la tarjeta de foto, distinta de la destacada. La tarjeta
  es vertical (440 × 600 en escritorio, 361 × 492 en tablet y 304 × 540 en el teléfono) y recorta la destacada
  horizontal; úsala cuando la destacada trae texto incrustado (las portadas de Manzanitas, o sea todo artículo nuevo
  de 12 minutos o más, que entra solo al riel): sube la placa sin texto tal cual (PNG 16:9, 2560 × 1440). La destacada
  no cambia y sigue siendo la imagen que se ve al compartir (OG). Vacío = la destacada.
- **Punto focal de la tarjeta** (`x% y%`, de 0 a 100): hacia dónde se mueve el recorte. Vacío = centro. Una cara a
  ≈71 % del ancho de la placa necesita ≈84 %; `84% 30%` funciona en escritorio, tablet y móvil.

**Podcast.** Formato **Podcast** y, en el mismo panel, **Duración del episodio** (`32:10`). Un episodio entra al riel
como una onda aunque dure menos de 12 minutos; su botón dice «Escuchar el episodio».

**Insignias.** Cada tarjeta lleva como máximo una, y sólo con un dato real. Si caben varias, gana la de arriba:

| Insignia | Qué la hace aparecer |
|---|---|
| En vivo | El evento está ocurriendo (entre su inicio y su fin). |
| Últimos cupos / Lista de espera | Las reservas del evento. Todavía no se enciende: espera la lectura de reservas. |
| Más leído / Tendencia | Las visitas de la entrada. Todavía no se encienden: esperan la lectura de visitas. |
| Nuevo | Publicada hace 14 días o menos. |
| Actualizado | **Última revisión** de los últimos 30 días en una entrada de más de 60 días. |
| Gratis | Guías, diagnóstico y eventos sin costo. |

Ninguna insignia se escribe a mano.

**Cómo se recorta la imagen de la tarjeta.** La tarjeta con foto usa su **Imagen de la tarjeta del riel** si la
tiene y, si no, la imagen destacada (nunca la imagen del slider), a sangre en formato vertical y recortada al centro o
hacia el punto focal: de una imagen ancha sólo se ve una franja, de arriba abajo. Encima van el formato (arriba a la
izquierda) y la flecha (arriba a la derecha), entre el 5 % y el 8 % del alto; un degradado desde el 36 % del alto,
sólido bajo el 70 %, y el título desde el 64 %. Con la placa y el foco `84% 30%`, la cara va en x 60–86 % · y 10–40 %
de lo que se ve, y la mitad de abajo pareja y oscura. Medidas y diagramas de todas las imágenes de un artículo:
[inventario de imágenes por artículo](../../operations/public-site-content-factory/BLOG_ARTICLE_IMAGE_INVENTORY_V1.md).
Una entrada sin imagen ni cliente sale como tarjeta tipográfica.

### Foto de perfil del autor

El círculo del autor en el slider y la **ficha de autor** al final de cada artículo (desde el 2026-10-24, TASK-2057)
muestran la foto de perfil que la persona tiene subida en WordPress (plugin One User Avatar), no la de Gravatar.
Qué ve el visitante: [Ficha de autor del blog](../../documentation/public-site/ficha-de-autor-del-blog.md).

1. En el escritorio de WordPress, **Usuarios** → el perfil del autor (o **Perfil** si eres tú).
2. En la sección del avatar que agrega One User Avatar, elige la imagen desde la biblioteca de medios (una foto
   cuadrada, con la cara centrada y encuadre cerrado: la ficha la recorta en un círculo).
3. Guarda con **Actualizar perfil**.
4. Reconstruye el indexable de autor de Yoast y purga (ver «Después de cambiar foto o cargo», abajo).

Sin foto subida, el slider y la ficha muestran las iniciales del autor. Una imagen de Gravatar (incluida la silueta
genérica) no reemplaza las iniciales, a propósito. Las diapositivas de Glitch no llevan foto.

### Cargo, bio corta y redes del autor

Todo se edita en el mismo perfil de WordPress (**Usuarios** → el autor). La ficha no tiene campos propios salvo la bio
corta; el resto lo lee de Yoast, que también lo usa para el schema `Person` que ve Google. Los mismos datos arman la
cabecera del archivo del autor (`/author/…`): un cambio aquí se ve en los dos lugares tras la purga.

| Dato en la ficha | Dónde se cambia | Regla |
|---|---|---|
| **Cargo** | Perfil → sección de schema de Yoast → **Job title** (campo de schema del usuario) | Si está vacío, la ficha no inventa un cargo con la bio. |
| **Bio corta** | Perfil → **Ficha de autor del blog → Bio corta** | Hasta 180 caracteres. Vacía = las primeras frases de la bio. |
| **Bio larga** | Perfil → **Información biográfica** | Es la que lee el schema de Yoast. |
| **Redes** | Perfil → campos de contacto de Yoast: Instagram, LinkedIn, X/Twitter, Wikipedia | Se muestran en ese orden, con su isotipo oficial. Un usuario de X se enlaza a `x.com`. |
| **Sitio web** | Perfil → **Sitio web** | Sólo aparece si no es `efeoncepro.com`. |
| **Temas** | Perfil → sección de schema de Yoast → temas que domina (`knowsAbout`) | Sólo los que son una categoría con artículos; máximo 4. |

La organización («Efeonce Group») y el botón «Ver sus N artículos» salen solos. Las cuentas de servicio (la integración
«Greenhouse») y los autores sin artículos no tienen ficha.

### Después de cambiar foto o cargo

1. **Reconstruye el indexable de autor de Yoast.** Si no se hace, el archivo del autor (`/author/<slug>/`) sigue
   compartiéndose con la foto vieja (`og:image`) y el schema puede quedar con el cargo anterior. Referencia:
   `ai-generations/2026-10-24_autor-blog/refrescar-yoast-autor.php`, que se corre con
   `pnpm public-website:wpcli -- --eval-file <script> --wp-user 1` (producción, con aprobación del operador).
2. **Purga** con `pnpm public-website:blog-home purge --apply` (portada) y la caché de Kinsta del artículo y del
   archivo del autor si se necesita ver el cambio de inmediato. Sin purgar, el lector de la ficha refresca solo en hasta
   5 minutos más la caché de página.
3. **Revisa** un artículo del autor: la ficha al final, el «Por {autor}» bajo el título y, en el código fuente, el
   `jobTitle` y la `image` del `Person`.

El caso de referencia (foto nueva de Julio, adjunto 252085, y carga del perfil con `cargar-perfil-julio.php`) está
documentado en el `LEEME.md` de esa misma carpeta; el avatar anterior (244826) sirve para volver atrás.

### Suscripción a Glitch

La píldora de la sección Glitch y la del final de la portada son el formulario real de Growth Forms; no se editan desde
WordPress. Textos, aviso y destino en HubSpot viven en el formulario publicado (`efeonce-blog-subscription`); la portada
sólo guarda cuál está conectado (opciones `eo_blog_glitch_form_key` y `eo_blog_glitch_form_surface`). Conectar,
cambiar o desconectar se hace por CLI (`subscription`, ver
[Operar la portada del blog por CLI](operar-portada-blog-por-cli.md)). Sin formulario conectado la portada no muestra
suscripción.

### Grabación de un webinar

Formato **Grabación**, el video de YouTube incrustado con su transcripción en la entrada y **Duración del video**
(`48:12`). Aparece en «Grabaciones para ver cuando quieras» (no en «Para leer con calma») y lleva marcado
`VideoObject`.

### Crear un evento

**Eventos → Agregar evento**. Título, bajada (extracto) y descripción pública. En **Datos del evento**: inicio en UTC,
zona horaria, duración, modalidad, sede, categoría, **arte clave** (obligatorio para el bloque grande), speakers
(`user:ID | rol | organización` o `Nombre | rol | organización`), tres aprendizajes (`título | detalle`), agenda
(`HH:MM | tema`), `form_key` del Growth Form, estado y cupos. El enlace privado del webinar **no se escribe aquí**.

El evento es «próximo» hasta inicio + duración; al terminar sale solo. El botón «Agregar al calendario» baja el `.ics`.
Mientras es próximo también aparece al final de «Para leer con calma» como una entrada con la fecha y «Faltan N días»
(«Mañana», «Hoy», «En vivo ahora»).

### Registrar un recurso

**Recursos del blog → Agregar recurso**: tipo (newsletter, herramienta, guía, diagnóstico), URL canónica, categoría,
título del slider, bajada, dato corto, imagen, orden, **Revisado el** y dónde aparece (slider, riel). Sin revisión de
los últimos 180 días el recurso deja de mostrarse.

## Paso a paso para el operador (producción)

> Desde el 2026-10-24 la operación diaria y los despliegues van por `pnpm public-website:blog-home` (ver
> [Operar la portada del blog por CLI](operar-portada-blog-por-cli.md)). Los pasos de abajo describen el despliegue
> inicial y siguen valiendo como referencia de lo que el CLI hace por dentro.

1. **Paquete** (no escribe en el sitio):
   `pnpm public-website:export-live-code -- --output tmp/public-site-code-baselines/<nombre>` y
   `node scripts/public-website/build-blog-v3-content-model-package.cjs tmp/public-site-code-baselines/<nombre>`.
2. **Ensayo local** (opcional, recomendado): `bash scripts/public-website/blog-v3/rehearse-content-model-deploy.sh
   tmp/public-site-code-baselines/<nombre>` corre el despliegue, el verificador y el backfill completos en Playground.
3. **Despliegue en dry-run** (producción, sólo lectura): `pnpm public-website:wpcli -- --eval-file
   scripts/public-website/deploy-blog-v3-content-model-package.php --input-file
   tmp/blog-v3-content-model-release/package.zip --input-file tmp/blog-v3-content-model-release/manifest.json
   --input-file <archivo con el texto dry-run>`.
4. **Despliegue** (producción, con aprobación): el mismo comando sin el tercer archivo. Imprime la ruta del respaldo
   `.tar`. La opción queda en 0.
5. **Verificar** (sólo lectura): `pnpm public-website:wpcli -- --eval-file
   scripts/public-website/blog-v3/verify-content-model.php` → `ok: true`.
6. **Backfill de formato**: dry-run con `--input-file scripts/public-website/blog-v3/backfill/dry-run.json`, revisar
   las 44 propuestas (corregir con `overrides` por slug), copiar `backfill/apply.example.json` con el
   `proposal_sha256` revisado y aplicar por lotes de 10 guardando cada salida en
   `scripts/public-website/blog-v3/ledger/`.
7. **Cargar** eventos, recursos y fijadas reales.
8. **Encender** `eo_content_model_enabled = 1` junto con la publicación de la portada de TASK-2051. Hecho el
   2026-10-24: 44 entradas con formato (ledger en `scripts/public-website/blog-v3/ledger/`), recursos 252050 (guía) y
   252054 (diagnóstico), corte de `/blog/` con snapshot `_gh_blog_home_v3_before_20261024_081327`.

## Qué significan los estados

| Señal | Significado |
|---|---|
| `flag: 0` en el verificador | Instalado e inerte: la portada muestra el contenido de ejemplo. |
| `without_format > 0` | Entradas publicadas sin formato: falta el backfill. |
| Evento `state: ended` | Ya terminó; no aparece como próximo. |
| Recurso `stale: true` | Sin revisión reciente; no se muestra hasta revisarlo. |
| `eo_cm_purge_log` con `kinsta_url` | La portada se purgó por URL; `coalesced` = se juntó con la purga siguiente. |

## Qué no hacer

- No escribir a mano el contador de reservas ni las insignias de cupos: lo entrega TASK-2053 o queda oculto.
- No usar **Última revisión** para una corrección menor: «Actualizado» promete una revisión de fondo.
- No cambiar la destacada para arreglar el recorte de la tarjeta: la destacada es la imagen OG. Usar **Imagen de la
  tarjeta del riel** y **Punto focal de la tarjeta**.
- No guardar enlaces privados de webinars en ningún campo del evento.
- No usar «Fijar arriba» (sticky) de WordPress: la portada no lo lee.
- No subir la foto del autor a Gravatar ni escribir el cargo como primera frase de la bio: la ficha no los lee.
- No aplicar el backfill sin revisar el dry-run ni con un `expect_sha256` viejo (el script lo rechaza).
- No encender la opción antes de cargar contenido real.

## Problemas comunes

| Problema | Causa | Qué hacer |
|---|---|---|
| La portada sigue con el contenido de ejemplo | Opción en 0, o falta una diapositiva, un tema o un año | Revisar la opción y el log de PHP (`home adapter skipped`). |
| Un evento no ocupa el bloque grande | Sin arte clave, cancelado o ya terminó | Cargar el arte clave o revisar las fechas. |
| Una entrada fijada no aparece | Sin imagen o fijación vencida | Agregar imagen o mover la fecha. |
| La portada tarda en actualizarse | Ventana de 60 s o caché de 5 min | Esperar hasta 2 minutos; revisar `eo_cm_purge_log`. |
| Un caso no muestra el logo del cliente | Sin **Cliente del caso**, o el formato no es Caso | Elegir el cliente en el panel; si no está en la lista, pedir su logo al equipo técnico. |
| No sale «Actualizado» | La entrada tiene 60 días o menos, o la revisión tiene más de 30 | Es lo esperado: «Nuevo» o nada. |
| La tarjeta de foto corta el texto de la portada o deja fuera la cara | La destacada tiene texto incrustado y se recorta al centro | Cargar **Imagen de la tarjeta del riel** sin texto y ajustar **Punto focal de la tarjeta** hacia el sujeto. |
| Un podcast no aparece en el riel | Le falta el formato Podcast, o es de Glitch o Novedades | Cambiar el formato a Podcast. |
| El autor sale con iniciales | No tiene foto subida en su perfil (Gravatar no cuenta) | Subir la foto en el perfil de WordPress. |
| Al compartir el archivo del autor sale la foto vieja | El indexable de autor de Yoast no se reconstruyó | Correr `refrescar-yoast-autor.php` y purgar. |
| La ficha no muestra el cargo | **Job title** de Yoast vacío | Cargarlo en el campo de schema del perfil. |
| Al pasar el mouse, un botón de la ficha se pinta de otro color o pierde el texto | El tema Ohio colorea y subraya todos los enlaces al hover; un enlace nuevo de la ficha o del byline quedó sin las clases `-unlink -undash` | Agregar `-unlink -undash` al enlace y correr la prueba que las exige en cada enlace de la ficha. El círculo azul que sigue al mouse es el cursor del tema, no un error. |
| Un artículo no tiene ficha de autor | El autor es una cuenta de servicio o no tiene artículos publicados | Es lo esperado; reasignar el autor de la entrada si corresponde. |
| No se ve la suscripción a Glitch | No hay formulario conectado (`data-subscribe="off"`) | Conectarlo por CLI con un formulario publicado. |
| No se ve la sección de eventos | No hay un evento próximo | Crear el evento con arte clave y fecha futura. |

## Rollback

- Suscripción: `pnpm public-website:blog-home subscription off --apply`.
- Rápido y sin tocar archivos: opción `eo_content_model_enabled = 0`.
- Formatos: `backfill-format.php` en modo `restore` con el ledger del apply.
- Código: restaurar el `.tar` que imprimió el despliegue.

## Referencias técnicas

- Código: `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/`.
- Pruebas: `tests/eo-content-model.test.php` y `tests/playground/run-eo-content-model.sh` +
  `tests/playground/eo-content-model.e2e.mjs` en el runtime.
- REST de sólo lectura: `/wp-json/eo/v1/home`, `/wp-json/eo/v1/home/{featured|topics|glitch|events|rail|archive|resources}`,
  `/wp-json/eo/v1/home/board/{portada|movil}`, `/wp-json/eo/v1/events/{id}/ics`.
