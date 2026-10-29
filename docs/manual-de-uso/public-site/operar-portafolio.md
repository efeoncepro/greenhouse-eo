# Operar el portafolio de proyectos

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-10-29 por Claude
> **Ultima actualizacion:** 2026-10-29 por Claude
> **Documentacion tecnica:** [Portafolio del sitio público (EO Portfolio)](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md)
> **Documentacion funcional:** [Portafolio de proyectos](../../documentation/public-site/portafolio-de-proyectos.md)

## Para qué sirve

Para cargar, revisar, publicar y despublicar los proyectos del portafolio de [efeoncepro.com](https://efeoncepro.com)
con `pnpm public-website:portfolio`. Cada proyecto es un documento `portfolio-entry.v1` guardado en el plugin
«EO Portfolio»: para quién se hizo, qué tenía que resolver, cómo se hizo, qué pasó (con fuente) y sus piezas en su
formato real. La CLI usa el mismo servicio de guardado que la pantalla del admin y que `wp eo-portfolio`: no tiene
reglas propias.

Estado al 2026-10-29: plugin activo en producción, **sin proyectos**. La pantalla del admin (v0.2.0) está en producción
desde el 2026-10-29. La portada y la entrada pública llegan con
`TASK-2048`; hasta entonces una entrada publicada responde 404 y sólo se ve por la REST.

## Antes de empezar

- `pnpm public-website:ssh-check` responde `"status": "ok"`.
- El repo del runtime está en `/Users/jreye/Documents/efeonce-public-site-runtime` (o en `PUBLIC_SITE_RUNTIME_ROOT`):
  la validación local usa el validador del plugin de ese repo.
- `apply`, `publish`, `unpublish` y `restore` **escriben en producción**: necesitan el OK del operador para cada uno.
- Para publicar hace falta la **aprobación del cliente**: dónde quedó registrada (`ref`), la fecha y qué cubre
  (`scope`: `logo`, `pieces`, `metrics`, `testimonial`). Sin eso el plugin no publica.

## Paso a paso

### Desde el admin de WordPress

Menú **Portafolio** → **Proyectos** (listado) o **Agregar proyecto**. Es el mismo servicio que la CLI:

1. Completa las secciones. Las imágenes se eligen de la biblioteca (sus dimensiones salen de ahí); los videos se pegan
   como URL del bucket público de AXIS y el navegador lee su formato. El formato no se escribe a mano.
2. Escribe en «Qué cambiaste» por qué cambió y pulsa **Guardar**. Si algo no cumple, no se guarda nada: el resumen de
   arriba enlaza a cada campo con su error.
3. Registra la **Aprobación del cliente** (referencia, fecha, qué aprobó) y guarda. Lo que no aprobó muestra
   «No se mostrará» en su sección.
4. **Publicar** se habilita cuando «Falta para publicar» queda vacío, no hay cambios sin guardar y todos los videos se
   pudieron leer. Publica la revisión guardada.
5. En **Historial** puedes ver una revisión o restaurarla (crea una revisión nueva).

### Ver qué hay

```bash
pnpm public-website:portfolio -- list
pnpm public-website:portfolio -- verify
```

### Cargar un proyecto nuevo

1. Arma el documento de partida (por ejemplo, el export de una entrada de Ohio en `TASK-2049`, o un fixture de
   `efeonce-public-site-runtime/tests/fixtures/portfolio/` como plantilla de forma).
2. Crea la copia de trabajo:

   ```bash
   pnpm public-website:portfolio -- new <slug> --from <archivo.json>
   ```

3. Edita `tmp/portfolio/<slug>/working.json`. Reglas que el validador hace cumplir:
   - toda cifra de `results` lleva `source`; un `percent` va de 0 a 100, sin el signo;
   - todo medio lleva `width` y `height` reales y `alt`; una imagen usa `mediaId` de la biblioteca; un video usa `src` y
     `poster` del bucket público de AXIS (`portfolio/v<N>/<slug>/`) y, si tiene voz, `captionsVtt`;
   - `hero.mediaRef` apunta a un `id` de medio de algún capítulo;
   - `services` sólo acepta claves del catálogo (`schema/services.v1.json` del plugin);
   - ningún texto lleva HTML; los enlaces van en `https`.
4. Revisa:

   ```bash
   pnpm public-website:portfolio -- validate <slug>
   pnpm public-website:portfolio -- preview <slug>
   ```

   `preview` muestra qué vería el público según el alcance de la aprobación y guarda la proyección completa en
   `tmp/portfolio/<slug>/preview.json`.
5. Con el OK del operador, guarda (queda en borrador, nunca se publica solo):

   ```bash
   pnpm public-website:portfolio -- apply <slug> --message "<por qué>" --dry-run
   pnpm public-website:portfolio -- apply <slug> --message "<por qué>"
   ```

### Editar un proyecto existente

```bash
pnpm public-website:portfolio -- pull <slug>
# editar tmp/portfolio/<slug>/working.json
pnpm public-website:portfolio -- diff <slug>
pnpm public-website:portfolio -- validate <slug>
pnpm public-website:portfolio -- apply <slug> --message "<por qué>"
```

`apply` guarda contra la revisión de la que partiste. Si alguien guardó entre medio, responde conflicto y no pisa
nada: vuelve a hacer `pull`, reaplica tu cambio y guarda.

### Publicar y despublicar

```bash
pnpm public-website:portfolio -- publish <slug> --message "<referencia de la aprobación>" --dry-run
pnpm public-website:portfolio -- publish <slug> --message "<por qué>"
pnpm public-website:portfolio -- unpublish <slug> --message "<por qué>"
```

Cada publicación queda registrada con quién, cuándo, qué revisión y qué aprobación:
`pnpm public-website:portfolio -- log <slug>`. Ese registro es interno y nunca sale por la REST.

### Historial y restaurar

```bash
pnpm public-website:portfolio -- revisions <slug>
pnpm public-website:portfolio -- restore <slug> <revisión> --message "<por qué>"
```

Restaurar crea una revisión nueva con el contenido de la elegida; el historial nunca se borra.

## Qué significan los estados o señales

| Señal | Significado |
|---|---|
| `○ borrador` | Guardado, no se ve en el sitio ni en la REST. |
| `● publicado` | Está en `GET /wp-json/eo/v1/portfolio` y en su entrada de la REST. |
| `eop_invalid` | El documento no cumple el esquema; el detalle dice qué campo y por qué. No se guardó nada. |
| `eop_conflict` | Alguien guardó mientras editabas. Nada se pisó. |
| `eop_approval_required` | No hay aprobación del cliente con referencia, fecha y alcance. No se publicó. |
| `eop_publish_gate` | El proyecto está publicado y el cambio lo dejaría sin aprobación: despublícalo antes. |
| `eop_slug_taken` | Ya existe una página en `/portafolio/<slug>/`. |
| `sin cambios` | El contenido es igual a la revisión vigente: no se crea revisión. |

## Qué no hacer

- No publicar un proyecto sin aprobación del cliente registrada fuera del sitio (la `ref` apunta a ese registro).
- No poner en `ref` el correo ni el nombre del contacto: es una referencia opaca.
- No subir video a la biblioteca de medios: va al bucket público de AXIS y el documento lo referencia por URL.
- No editar `post_content` ni las meta `_eop_*` a mano: todo cambio pasa por la CLI, `wp eo-portfolio` o el admin.
- No decidir nada por el nombre de un cliente o una campaña: las reglas son del documento.
- No aplicar los fixtures en producción: llevan la marca `[fixture]` y no tienen aprobación real.

## Problemas comunes

- **`El sitio rechazó «apply»` con `eop_conflict`:** `pull`, reaplica el cambio, `apply`.
- **La REST no muestra un cambio de un publicado:** la purga de Kinsta va en cada guardado; espera unos segundos y
  corre `verify <slug>`. Si persiste, `kinsta cache purge --all` por el carril SSH.
- **`/portafolio/<slug>/` responde 404 estando publicado:** esperado hasta `TASK-2048`.
- **`No se pudo correr el validador local`:** revisa `PUBLIC_SITE_RUNTIME_ROOT` y que el runtime tenga
  `wp-content/plugins/eo-portfolio/`.

## Desplegar el plugin

Gates en el runtime: `php tests/eo-portfolio.test.php` y `tests/playground/run-eo-portfolio.sh`. Luego:

```bash
pnpm public-website:export-live-code -- --output tmp/public-site-code-baselines/portfolio
node scripts/public-website/build-portfolio-plugin-package.cjs tmp/public-site-code-baselines/portfolio
pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-portfolio-plugin-package.php \
  --input-file tmp/portfolio-plugin-release/package.zip --input-file tmp/portfolio-plugin-release/manifest.json --wp-user 12
```

El despliegue se niega si un archivo vivo cambió desde la línea base o si `/portafolio/` tiene páginas hijas. Rollback:
`wp plugin deactivate eo-portfolio` y restaurar el tar que imprime.

## Referencias técnicas

- Plugin: `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/` (`includes/class-eop-store.php`,
  `class-eop-validator.php`, `class-eop-projection.php`, `schema/portfolio-entry.v1.schema.json`).
- CLI: `scripts/public-website/portfolio/cli.ts`, `local.php`, `remote.php`.
- Decisión: [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md).
- Tasks: `TASK-2047` (plugin), `TASK-2048` (portada y entrada), `TASK-2049` (migración).
