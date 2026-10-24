# Operar el contenido de la portada del blog

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-10-24 por Claude
> **Ultima actualizacion:** 2026-10-24 por Claude
> **Documentacion tecnica:** [Portada del blog — runtime V1](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md) · [PDR-029 — Modelo de contenido de la portada del blog](../../public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md) · [TASK-2050](../../tasks/in-progress/TASK-2050-blog-portada-v3-content-model.md)
> **Estado:** en producción en `/blog/` desde el 2026-10-24 con datos reales (`eo_content_model_enabled = 1`). Los pasos marcados «producción» necesitan la aprobación del operador.

## Para qué sirve

Para mantener la portada del blog (`/blog/`) con contenido real sin tocar código: el formato de cada entrada, qué va
fijado en el slider y hasta cuándo, los eventos (webinars y talleres) y los recursos (guía, herramienta, diagnóstico,
Glitch), la foto del autor y la suscripción a Glitch. La portada se arma sola con eso y se refresca al publicar.
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
Novedad, Glitch Edición, Glitch Flash o Glitch Nota. Una **Novedad** (alianzas, anuncios de Efeonce) lleva un megáfono
en el chip y sólo entra al slider si se fija. Es distinto de la categoría y no cambia la URL. Si se publica sin formato,
el plugin asigna uno por las reglas de PDR-029 §1.1.

### Fijar una entrada en el slider

Mismo panel → **Fijar en la portada hasta (UTC)**. La entrada fijada aparece primero hasta esa fecha y sale sola al
vencer. Opcional: **Título del slider** en dos líneas (liviana y fuerte) e **Imagen del slider**. Sin imagen (propia o
destacada) una entrada no puede ser diapositiva. Sin imagen propia del slider, la portada usa la imagen destacada con un
velo de lectura del lado del texto y corta la bajada en dos líneas; si el arte se hizo para el slider, súbelo como
**Imagen del slider** y el velo desaparece. Las tres invitaciones (Glitch, guía o herramienta, diagnóstico) tienen su
lugar reservado: una entrada fijada ocupa uno de los lugares restantes.

### Foto de perfil del autor

El círculo del autor en el slider muestra la foto de perfil que la persona tiene subida en WordPress (plugin One User
Avatar), no la de Gravatar.

1. En el escritorio de WordPress, **Usuarios** → el perfil del autor (o **Perfil** si eres tú).
2. En la sección del avatar que agrega One User Avatar, elige la imagen desde la biblioteca de medios (una foto
   cuadrada, con la cara centrada).
3. Guarda con **Actualizar perfil**. La portada la toma en la próxima purga (o pide `purge --apply` por CLI).

Sin foto subida, el slider muestra las iniciales del autor. Una imagen de Gravatar (incluida la silueta genérica) no
reemplaza las iniciales, a propósito. Las diapositivas de Glitch no llevan foto.

### Suscripción a Glitch

La píldora de la sección Glitch y la del final de la portada son el formulario real de Growth Forms; no se editan desde
WordPress. Textos, aviso y destino en HubSpot viven en el formulario publicado (`efeonce-blog-subscription`); la portada
sólo guarda cuál está conectado (opciones `eo_blog_glitch_form_key` y `eo_blog_glitch_form_surface`). Conectar,
cambiar o desconectar se hace por CLI (`subscription`, ver
[Operar la portada del blog por CLI](operar-portada-blog-por-cli.md)). Sin formulario conectado la portada no muestra
suscripción.

### Grabación de un webinar

Formato **Grabación**, el video de YouTube incrustado con su transcripción en la entrada y **Duración del video**
(`48:12`). Aparece en «Grabaciones para ver cuando quieras» y lleva marcado `VideoObject`.

### Crear un evento

**Eventos → Agregar evento**. Título, bajada (extracto) y descripción pública. En **Datos del evento**: inicio en UTC,
zona horaria, duración, modalidad, sede, categoría, **arte clave** (obligatorio para el bloque grande), speakers
(`user:ID | rol | organización` o `Nombre | rol | organización`), tres aprendizajes (`título | detalle`), agenda
(`HH:MM | tema`), `form_key` del Growth Form, estado y cupos. El enlace privado del webinar **no se escribe aquí**.

El evento es «próximo» hasta inicio + duración; al terminar sale solo. El botón «Agregar al calendario» baja el `.ics`.

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

- No escribir a mano el contador de reservas: lo entrega TASK-2053 o queda oculto.
- No guardar enlaces privados de webinars en ningún campo del evento.
- No usar «Fijar arriba» (sticky) de WordPress: la portada no lo lee.
- No aplicar el backfill sin revisar el dry-run ni con un `expect_sha256` viejo (el script lo rechaza).
- No encender la opción antes de cargar contenido real.

## Problemas comunes

| Problema | Causa | Qué hacer |
|---|---|---|
| La portada sigue con el contenido de ejemplo | Opción en 0, o falta una diapositiva, un tema o un año | Revisar la opción y el log de PHP (`home adapter skipped`). |
| Un evento no ocupa el bloque grande | Sin arte clave, cancelado o ya terminó | Cargar el arte clave o revisar las fechas. |
| Una entrada fijada no aparece | Sin imagen o fijación vencida | Agregar imagen o mover la fecha. |
| La portada tarda en actualizarse | Ventana de 60 s o caché de 5 min | Esperar hasta 2 minutos; revisar `eo_cm_purge_log`. |
| El autor sale con iniciales | No tiene foto subida en su perfil (Gravatar no cuenta) | Subir la foto en el perfil de WordPress. |
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
