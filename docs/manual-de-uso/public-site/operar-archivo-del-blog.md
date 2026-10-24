# Operar el Archivo del blog (búsqueda, temas, etiquetas y autores)

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-10-24 por Claude (TASK-2055)
> **Documentacion tecnica:** [BLOG_ARCHIVE_RUNTIME_V1](../../architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md) ·
> **Funcional:** [Archivo del blog](../../documentation/public-site/archivo-del-blog.md)

## Para qué sirve

Encender, apagar o probar la plantilla del archivo del blog, escribir la descripción de un tema y verificar que todo
siga bien después de un cambio. Todo pasa por `pnpm public-website:blog-home`, el mismo CLI de la portada.

## Antes de empezar

- `pnpm public-website:ssh-check` debe responder `status: ok`.
- Cualquier `--apply` en producción necesita el visto bueno del operador. Sin `--apply` el comando sólo muestra el plan.
- Si otra sesión está desplegando `eo-blog-home` o `efeonce-editorial-blocks`, pedir turno antes.

## Paso a paso

### Ver el estado

```bash
pnpm public-website:blog-home archive 1
```

Sin `--apply` sólo imprime `before` (valor actual del flag) y `after`.

### Probar sin que nadie más lo vea

```bash
pnpm public-website:blog-home archive preview --apply
```

Devuelve una URL de ejemplo con `?eoba_preview=<token>`. Sólo esas URL muestran la plantilla; el resto del sitio sigue
igual. Las URL con query string no se guardan en el caché, así que el preview nunca le llega a otro visitante.

### Encender o apagar para todos

```bash
pnpm public-website:blog-home archive 1 --apply
pnpm public-website:blog-home archive 0 --apply
```

Ambos purgan todo el caché de Kinsta. Esperar uno o dos minutos antes de verificar: la purga tarda en propagarse.

### Escribir la descripción de un tema

1. Redactar el texto (máximo 200 caracteres, español neutro con tuteo) y hacer que el operador lo apruebe.
2. Ponerlo en un JSON como `scripts/public-website/blog-archive/ops/descripciones-temas.json`:
   `{ "descriptions": { "hubspot": "…" } }`.
3. `pnpm public-website:blog-home topic-descriptions <archivo.json>` (plan) y luego con `--apply`.

El `before` de la respuesta es el rollback. Un tema con descripción y al menos 4 publicaciones queda indexable.

### Verificar

```bash
pnpm public-website:blog-home verify
node scripts/public-website/blog-archive/fidelity/overflow.cjs --urls tmp/task-2055/urls-live.json
node scripts/public-website/blog-archive/fidelity/a11y.cjs --urls tmp/task-2055/urls-live.json
```

El archivo de URL es un JSON `{ "tema": "https://efeoncepro.com/category/hubspot/", … }` con las seis vistas.

## Qué significan los estados

| Valor de `eo_blog_archive_enabled` | Qué ve el visitante |
|---|---|
| `0` (o ausente) | La plantilla de Ohio de siempre |
| `preview` | Ohio; sólo quien tiene el token ve la nueva |
| `1` | La plantilla nueva en búsqueda, temas, etiquetas y autores |

## Qué no hacer

- No editar a mano `assets/generated/archive*`: se regeneran con `node scripts/public-website/blog-archive/build-archive.cjs`.
- No cambiar la plantilla sin correr los gates (`test-bound-equivalence.cjs`, `test-php-parity.cjs`, captura y comparación).
- No escribir descripciones sin aprobación: definen qué temas entran a Google.
- No desplegar con el árbol del runtime sucio en esos plugins: el paquete se niega.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Justo después de encender, algunas páginas siguen con Ohio | La purga de Kinsta todavía se propaga | Esperar 1–2 minutos y volver a pedir la página |
| Una vista vuelve a Ohio con el flag en `1` | El adaptador falló (queda `eo-content-model: archive adapter failed` en el log) | Revisar el log de PHP; el resto del sitio no se afecta |
| Franja blanca sobre la cabecera | El `header-cap` de Ohio volvió a mostrarse (cambio del tema) | Revisar `assets/css/eoba-host.css` |
| Un tema no aparece en Google | Le falta descripción o tiene menos de 4 publicaciones | Escribir la descripción con el comando de arriba |

## Referencias técnicas

- [BLOG_ARCHIVE_RUNTIME_V1](../../architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md)
- [Operar la portada por CLI](operar-portada-blog-por-cli.md)
- [TASK-2055](../../tasks/complete/TASK-2055-blog-archive-v3-template.md)
