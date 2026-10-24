# Operar el contenido de la portada del blog

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-24 por Claude
> **Ultima actualizacion:** 2026-10-24 por Claude
> **Documentacion tecnica:** [PDR-029 — Modelo de contenido de la portada del blog](../../public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md) · [TASK-2050](../../tasks/in-progress/TASK-2050-blog-portada-v3-content-model.md)
> **Estado:** code complete en local; nada está desplegado. Los pasos marcados «producción» necesitan la aprobación del operador.

## Para qué sirve

Para mantener la portada del blog (`/blog/`) con contenido real sin tocar código: el formato de cada entrada, qué va
fijado en el slider y hasta cuándo, los eventos (webinars y talleres) y los recursos (guía, herramienta, diagnóstico,
Glitch). La portada se arma sola con eso y se refresca al publicar.

## Antes de empezar

- El modelo vive en el plugin `efeonce-editorial-blocks` (carpeta `includes/content-model/`) del runtime
  `efeonce-public-site-runtime`.
- Lo que ve el visitante depende de la opción `eo_content_model_enabled`: en 0 la portada muestra el contenido de
  ejemplo aprobado y los eventos no tienen URL pública; en 1 usa los datos reales.
- Acceso SSH a Kinsta (`pnpm public-website:ssh-check`) para los pasos de producción.

## Paso a paso para el editor (WordPress)

### Formato de una entrada

En el editor de la entrada, panel **Portada del blog** → **Formato**. Una sola opción: Artículo, Caso, Guía, Grabación,
Glitch Edición, Glitch Flash o Glitch Nota. Es distinto de la categoría y no cambia la URL. Si se publica sin formato,
el plugin asigna uno por las reglas de PDR-029 §1.1.

### Fijar una entrada en el slider

Mismo panel → **Fijar en la portada hasta (UTC)**. La entrada fijada aparece primero hasta esa fecha y sale sola al
vencer. Opcional: **Título del slider** en dos líneas (liviana y fuerte) e **Imagen del slider**. Sin imagen (propia o
destacada) una entrada no puede ser diapositiva.

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
8. **Encender** `eo_content_model_enabled = 1` junto con la publicación de la portada de TASK-2051.

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

## Rollback

- Rápido y sin tocar archivos: opción `eo_content_model_enabled = 0`.
- Formatos: `backfill-format.php` en modo `restore` con el ledger del apply.
- Código: restaurar el `.tar` que imprimió el despliegue.

## Referencias técnicas

- Código: `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/`.
- Pruebas: `tests/eo-content-model.test.php` y `tests/playground/run-eo-content-model.sh` +
  `tests/playground/eo-content-model.e2e.mjs` en el runtime.
- REST de sólo lectura: `/wp-json/eo/v1/home`, `/wp-json/eo/v1/home/{featured|topics|glitch|events|rail|archive|resources}`,
  `/wp-json/eo/v1/home/board/{portada|movil}`, `/wp-json/eo/v1/events/{id}/ics`.
