# Operar el portafolio de proyectos

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.7
> **Creado:** 2026-10-29 por Claude
> **Ultima actualizacion:** 2026-10-30 por Claude
> **Documentacion tecnica:** [Portafolio del sitio público (EO Portfolio)](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md)
> **Documentacion funcional:** [Portafolio de proyectos](../../documentation/public-site/portafolio-de-proyectos.md)
> **Manual de la CLI:** [Operar el portafolio por la CLI y sus herramientas](operar-portafolio-por-cli.md)

## Para qué sirve

Para cargar, revisar, publicar y despublicar los proyectos del portafolio de [efeoncepro.com](https://efeoncepro.com)
con `pnpm public-website:portfolio`. Cada proyecto es un documento `portfolio-entry.v1` guardado en el plugin
«EO Portfolio»: para quién se hizo, qué tenía que resolver, cómo se hizo, qué pasó (con fuente) y sus piezas en su
formato real. La CLI usa el mismo servicio de guardado que la pantalla del admin y que `wp eo-portfolio`: no tiene
reglas propias.

Estado al 2026-10-30: plugin **0.8.0** en producción con 17 proyectos publicados, portada y entradas públicas en
`/portafolio/`, y los tipos social, audiovisual, producción con IA y SEO/contenidos disponibles (aún sin proyectos
reales cargados de esos tipos).

Este manual cubre el admin, los lotes, el interruptor y el despliegue. La referencia completa de la CLI (todos los
comandos, recetas por tipo, plantillas, Playground local y scripts de migración) está en
[Operar el portafolio por la CLI y sus herramientas](operar-portafolio-por-cli.md).

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

### Sitios web, partes de un sitio y videos de creadores

El **Tipo de proyecto** (en «Cliente y contexto») dice cómo se arma la página: campaña, sitio web, parte de un sitio,
videos de creadores, sistema u otro. Cada pieza tiene su **Tipo de pieza**, y al elegirlo aparecen sólo sus campos:

| Tipo de pieza | Qué pide |
|---|---|
| Sitio en pantalla | Dispositivo, si es la página completa (se recorre con scroll) y, opcional, la URL en vivo si el sitio sigue tal como lo entregamos. |
| Parte de una página | El nombre con que la reconoce el cliente (obligatorio) y dónde empieza y termina, en % de la página, para ubicarla en la barra. |
| Video de creador | La cuenta con @, la plataforma y dónde quedó registrada su autorización. La autorización nunca se publica. |

Un video de creador se ve sólo si la aprobación marca **Piezas** y **Creadores**; si falta «Creadores», el editor
avisa «sus videos no se verán». Un proyecto de tipo «Videos de creadores» no se publica sin «Creadores».

### Social media, audiovisual, producción con IA y SEO (por la CLI)

Estos cuatro tipos se crean y actualizan por la CLI: el admin los muestra y, al guardar, conserva sus campos propios,
pero todavía no los edita.

```bash
pnpm public-website:portfolio -- kinds
pnpm public-website:portfolio -- new <slug> --kind <social|audiovisual|ai-production|seo-content|campaign>
```

Reemplaza cada `[COMPLETAR…]` y cada `mediaId` 1; `apply` no guarda mientras quede alguno. Los campos de cada tipo,
los roles de pieza y sus valores válidos están en
[Recetas por tipo de proyecto](operar-portafolio-por-cli.md#recetas-por-tipo-de-proyecto).

### Por la CLI: resumen

El ciclo completo, con qué lee y qué escribe cada comando, está en
[Operar el portafolio por la CLI y sus herramientas](operar-portafolio-por-cli.md#referencia-de-comandos). En corto:

```bash
pnpm public-website:portfolio -- list                      # qué hay
pnpm public-website:portfolio -- pull <slug>               # o: new <slug> --kind <tipo> | --from <archivo.json>
pnpm public-website:portfolio -- validate <slug>           # y preview / diff
pnpm public-website:portfolio -- apply <slug> --message "<por qué>" --dry-run
pnpm public-website:portfolio -- apply <slug> --message "<por qué>"            # borrador, con OK del operador
pnpm public-website:portfolio -- publish <slug> --message "<por qué>"          # con OK del operador
pnpm public-website:portfolio -- verify <slug>
pnpm public-website:portfolio -- revisions <slug>          # y restore <slug> <revisión> --message "<por qué>"
pnpm public-website:portfolio -- log <slug>                # quién publicó y con qué aprobación (interno)
```

Un documento de partida puede ser el export de una entrada de Ohio (`TASK-2049`) o un fixture de
`efeonce-public-site-runtime/tests/fixtures/portfolio/` como forma de ejemplo (nunca para aplicarlo tal cual).
`apply` guarda contra la revisión de la que partiste: si alguien guardó entre medio responde `eop_conflict` y no pisa
nada; vuelve a hacer `pull`, reaplica tu cambio y guarda. Restaurar crea una revisión nueva; el historial nunca se borra.

### Sumar piezas que el sitio ya tiene o un caso nuevo con video

1. Imágenes que el sitio ya sirve (por ejemplo en `eo-elementor-widgets/assets/img/creativa/`): llévalas a la
   biblioteca con `import-portfolio-media.php`; devuelve el `mediaId` y las dimensiones de cada una y no duplica si se
   corre de nuevo.
2. Videos: súbelos al bucket público de AXIS en `portfolio/v1/<proyecto>/` (video y póster, `Cache-Control` de un año).
3. Arma el lote `{"projects":[…]}` (en `scripts/public-website/eo-portfolio/batches/`) y cárgalo con
   `apply-portfolio-bundle.php`: con `"publish": true` publica; con `"update": true` cambia proyectos existentes, cada
   documento con la `revision` desde la que se editó.

```bash
pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/import-portfolio-media.php --input-file <json> --wp-user 12
pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/apply-portfolio-bundle.php --input-file <lote.json> --wp-user 12
```

### Encender, apagar o revisar las páginas públicas

`scripts/public-website/eo-portfolio/set-portfolio-switch.php` hace un solo cambio guardado y purga la caché. Ejemplos
de entrada:

| Quiero | JSON |
|---|---|
| Revisar en vivo sin que el público lo vea | `{"enabled":"preview","newToken":true}` (imprime el enlace con el token) |
| Encender | `{"enabled":"1"}` (se niega si no hay proyectos publicados) |
| Apagar (vuelve la página anterior) | `{"enabled":"0"}` |
| Cambiar el orden de la portada | `{"order":["slug-1","slug-2"]}` |
| Cambiar las cifras de la agencia | `{"tally":{"pieces":"15.000+","campaigns":"80+","brands":"32"}}` |

```bash
pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/set-portfolio-switch.php --input-file <json> --wp-user 12
```

## Qué significan los estados o señales

| Señal | Significado |
|---|---|
| `○ borrador` | Guardado, no se ve en el sitio ni en la REST. |
| `● publicado` | Está en `GET /wp-json/eo/v1/portfolio` y en su entrada de la REST. |
| `eop_invalid` | El documento no cumple el esquema; el detalle dice qué campo y por qué. No se guardó nada. |
| `eop_conflict` | Alguien guardó mientras editabas. Nada se pisó. |
| `eop_approval_required` | No hay aprobación del cliente con referencia, fecha y alcance. No se publicó. |
| `APPROVAL_SCOPE_CREATORS` | Proyecto de videos de creadores sin «Creadores» en la aprobación. No se publicó. |
| `eop_publish_gate` | El proyecto está publicado y el cambio lo dejaría sin aprobación: despublícalo antes. |
| `eop_slug_taken` | Ya existe una página en `/portafolio/<slug>/`. |
| `sin cambios` | El contenido es igual a la revisión vigente: no se crea revisión. |

## Qué no hacer

- No publicar un proyecto sin aprobación del cliente registrada fuera del sitio (la `ref` apunta a ese registro).
- No poner en `ref` el correo ni el nombre del contacto: es una referencia opaca.
- No subir video a la biblioteca de medios: va al bucket público de AXIS y el documento lo referencia por URL.
- No editar `post_content` ni las meta `_eop_*` a mano: todo cambio pasa por la CLI, `wp eo-portfolio` o el admin.
- No decidir nada por el nombre de un cliente o una campaña: las reglas son del documento.
- No marcar «Creadores» sin la autorización de cada creador registrada: que el cliente apruebe la campaña no autoriza
  mostrar a la persona.
- No aplicar los fixtures en producción: llevan la marca `[fixture]` y no tienen aprobación real.

## Problemas comunes

- **`El sitio rechazó «apply»` con `eop_conflict`:** `pull`, reaplica el cambio, `apply`.
- **La REST no muestra un cambio de un publicado:** la purga de Kinsta va en cada guardado; espera unos segundos y
  corre `verify <slug>`. Si persiste, `kinsta cache purge --all` por el carril SSH.
- **`/portafolio/<slug>/` responde 404 estando publicado:** revisa que el interruptor esté en `1` (`set-portfolio-switch.php` imprime el estado) y purga la caché.
- **La vista previa da 404 al entrar a un proyecto:** abre el proyecto desde la portada de la vista previa; el enlace lleva el token.
- **Después de desplegar el plugin las páginas siguen iguales:** un despliegue de código no purga la caché (un
  guardado sí). Corre `purge-portfolio-cache.php` (abajo); la caché de Cloudflare suelta la copia vieja en uno o dos
  minutos. Compruébalo con `?ver=` del `portfolio.js` en el HTML.
- **El título de un proyecto aparece cortado con «…»:** no debería pasar (la página nunca muestra un título así), pero
  corrige `seo.title` con `pull` → editar → `apply`: escribe el título completo, de 65 caracteres o menos.
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

El despliegue se niega si un archivo vivo cambió desde la línea base o si `/portafolio/` tiene páginas hijas. Si el
cambio toca el marcado, purga la caché después:

```bash
pnpm public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/purge-portfolio-cache.php --wp-user 12
```

Rollback: `wp plugin deactivate eo-portfolio` y restaurar el tar que imprime.

## Herramientas para agentes (apagadas)

La opción `eo_portfolio_agent_tools` (por defecto `0`) prende las Abilities de WordPress `eo-portfolio/list-projects` y
`eo-portfolio/get-project` y las herramientas WebMCP del navegador. Sólo leen lo público. Prenderla es una decisión de
producto: pide el visto bueno del operador antes.

## Referencias técnicas

- Manual de la CLI y sus herramientas: [operar-portafolio-por-cli.md](operar-portafolio-por-cli.md).
- Plugin: `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/` (`includes/class-eop-store.php`,
  `class-eop-validator.php`, `class-eop-projection.php`, `schema/portfolio-entry.v1.schema.json`).
- CLI: `scripts/public-website/portfolio/cli.ts`, `local.php`, `remote.php`.
- Decisión: [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md).
- Tasks: `TASK-2047` (plugin), `TASK-2048` (portada y entrada), `TASK-2049` (migración).
