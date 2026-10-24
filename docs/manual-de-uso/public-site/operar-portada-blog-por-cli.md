# Operar la portada del blog por CLI

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-10-24 por Claude (sesión «Portada del blog v3»)
> **Ultima actualizacion:** 2026-10-24 por Claude
> **Documentacion tecnica:** [Portada del blog — runtime V1](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md) ·
> [PDR-029](../../public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md) ·
> [TASK-2050](../../tasks/in-progress/TASK-2050-blog-portada-v3-content-model.md) ·
> [TASK-2051](../../tasks/in-progress/TASK-2051-blog-portada-v3-high-fidelity.md)

## Para qué sirve

`pnpm public-website:blog-home` es la forma de operar `https://efeoncepro.com/blog/` desde la terminal, para una
persona o un agente: ver qué muestra la portada y por qué, fijar o soltar entradas del slider, ajustar su título e
imagen, cargar recursos y eventos, desplegar sus dos plugins y verificar la página en vivo.

Cada cambio pasa por la meta, las taxonomías y los readers del propio plugin (`efeonce-editorial-blocks` 0.2.0), igual
que si se hiciera desde el editor de WordPress: nada de SQL ni de Elementor a mano. Lo que un editor hace en WordPress
(panel **Portada del blog**, **Eventos**, **Recursos del blog**) y lo que hace este comando son el mismo contrato; ver
[Operar el contenido de la portada del blog](operar-contenido-portada-blog.md) para el lado del editor.

## Antes de empezar

- Acceso SSH a Kinsta: `pnpm public-website:ssh-check` en verde.
- Las **lecturas** se pueden correr siempre. Las **escrituras** en producción necesitan el visto bueno del operador.
- Toda escritura es un **plan** hasta que se agrega `--apply`: muestra el antes y el después sin tocar nada.
- Cada `--apply` queda en el ledger `scripts/public-website/blog-home/ledger/<AAAA-MM>.jsonl` (quién, cuándo, antes y
  después). Commitea el ledger junto con tu trabajo.

## Paso a paso

### 1. Mirar el estado

```bash
pnpm public-website:blog-home status
```

Devuelve el flag del modelo, si `/blog/` usa la portada, formatos por entrada, las cinco diapositivas con el motivo
de cada una (`fijada`, `glitch`, `recurso guia`, `recurso diagnostico`, `reciente`), recursos, eventos y las últimas
purgas. `slider` muestra sólo las diapositivas; `post <id|slug>` muestra los campos de portada de una entrada.

### 2. Cambiar lo que muestra el slider

```bash
# Fijar una entrada primero hasta una fecha (UTC). Sale sola al vencer.
pnpm public-website:blog-home pin <id|slug> --until 2026-11-15
pnpm public-website:blog-home pin <id|slug> --until 2026-11-15 --apply

# Soltarla
pnpm public-website:blog-home unpin <id|slug> --apply

# Título del slider en dos líneas (liviana y fuerte) e imagen propia del slider
pnpm public-website:blog-home hero <id|slug> --light "El fin de la web" --bold "«solo para humanos»" --apply
pnpm public-website:blog-home hero <id|slug> --image ./arte.webp --alt "Descripción de la imagen" --apply
pnpm public-website:blog-home hero <id|slug> --attachment 252057 --apply
pnpm public-website:blog-home hero <id|slug> --clear --apply

# Formato (cambia ícono, CTA y en qué secciones aparece)
pnpm public-website:blog-home format <id|slug> novedad --apply

# Línea de servicio de una entrada cuando su categoría no la dice (color del artículo y de su tarjeta)
pnpm public-website:blog-home line <id|slug> voice --apply
pnpm public-website:blog-home line <id|slug> off --apply
```

**Línea de una entrada.** El color de un artículo y de su tarjeta en la portada sale de la línea de su tema: el mapa
de temas, decidido el 2026-10-24. Cuando la categoría no dice la línea, por ejemplo paid media, que está en Marketing
Digital y es Voice, `line` le asigna una propia sin tocar la categoría ni la URL.

- Valores: `growth`, `brand`, `engine`, `voice`, `revenue-hubspot`, `revenue-salesforce`, u `off` para volver al
  color del tema.
- Sin `--apply` muestra el plan, con `before` (el valor anterior) y `after`.
- Con `--apply` escribe el meta `_eo_line`, comprueba que la URL no cambió, deja el registro en el ledger y purga
  `/blog/` y el propio artículo.
- Para deshacerlo, vuelve a correr `line` con el `before` del ledger.
- En vivo desde el 2026-10-24: 245605 (paid media) en Voice y 245154 (topic clusters) en Engine.

Nunca cambies la categoría principal de una entrada publicada para cambiarle el color: la categoría forma parte de la
URL (`/%category%/%postname%/`).

Formatos: `articulo`, `caso`, `guia`, `grabacion`, `novedad`, `glitch-edicion`, `glitch-flash`, `glitch-nota`. Una
**Novedad** (alianzas, anuncios de Efeonce) sólo entra al slider si se fija.

Una entrada sin imagen propia del slider usa su imagen destacada con un **velo de lectura** a la izquierda. Si el arte
fue hecho para el slider, cárgalo con `hero --image` y el velo desaparece.

Orden de los cinco lugares: las tres invitaciones (Glitch, guía o herramienta, diagnóstico) tienen lugar reservado y
una fijada nunca las desplaza; los lugares restantes son para las fijadas vigentes y, si sobran, para las entradas
recientes con imagen. En pantalla van primero las entradas y después las invitaciones. `slider` muestra el motivo de
cada una.

### 2b. Foto del autor

El círculo del autor usa la foto de perfil subida en WordPress (plugin One User Avatar); sin foto, las iniciales. Un
Gravatar de respaldo se descarta a propósito. No hay comando para esto: la foto se sube en el perfil de WordPress
del autor ([Operar el contenido de la portada](operar-contenido-portada-blog.md#foto-de-perfil-del-autor)). Para
comprobarla después: `purge --apply` y `verify --browser`, o mira el slider en vivo.

### 3. Recursos (guía, herramienta, diagnóstico, newsletter)

```bash
cp scripts/public-website/blog-home/examples/resource.example.json tmp/mi-recurso.json   # editar
pnpm public-website:blog-home resource tmp/mi-recurso.json                      # plan
pnpm public-website:blog-home resource tmp/mi-recurso.json --image ./img.webp --alt "…" --apply
pnpm public-website:blog-home review <id> --apply        # lo marca revisado hoy
pnpm public-website:blog-home retire resource <id> --apply
```

El recurso se identifica por `id`, `slug` o por el par tipo + URL, así que correr el mismo archivo dos veces actualiza
el mismo recurso. **Un recurso sin revisión en 180 días deja de mostrarse**: `status` lo marca `stale: true`; se
reactiva con `review`.

### 4. Eventos

```bash
cp scripts/public-website/blog-home/examples/event.example.json tmp/mi-evento.json      # editar
pnpm public-website:blog-home event tmp/mi-evento.json --image ./arte-clave.webp --alt "…" --apply
pnpm public-website:blog-home retire event <id> --apply    # lo cancela
```

`meta.start_utc` es obligatorio y va en UTC. El comando **rechaza enlaces privados** de Zoom, Teams o Meet: la sala no
se guarda en el evento. Sin arte clave el evento no ocupa el bloque grande. La sección de eventos aparece sola cuando
hay un evento próximo y desaparece cuando termina (inicio + duración). `form_key` es el formulario de reserva de
Growth Forms (`pnpm growth:forms:publish-event-registration`).

### 4b. Suscripción real a Glitch

```bash
pnpm growth:forms:publish-glitch-pill                      # dry-run: compila la versión píldora en memoria
pnpm growth:forms:publish-glitch-pill --apply              # borrador + destino HubSpot + revisión
pnpm growth:forms:publish-glitch-pill --publish            # publica (exige que origin/main sirva el código)
pnpm public-website:blog-home subscription 6bc62588-a4a0-4214-9501-13b0c2948c81            # plan: before/after
pnpm public-website:blog-home subscription 6bc62588-a4a0-4214-9501-13b0c2948c81 --apply   # conecta la portada
pnpm public-website:blog-home subscription off --apply     # la desconecta (borra las dos opciones)
```

`subscription` escribe las opciones de WordPress `eo_blog_glitch_form_key` y `eo_blog_glitch_form_surface`; la
superficie por defecto es `fhsf-efeonce-blog-subscription` y se cambia con `--surface <id>`. Sólo acepta una clave
con forma de UUID o `off`. El formulario publicado hoy es `efeonce-blog-subscription` (destino HubSpot con subscription
type `535702717`).

Para probar la píldora real **antes** de conectarla en vivo, usa el preview local:

```bash
node scripts/public-website/blog-v3/preview/serve.cjs --subscribe 6bc62588-a4a0-4214-9501-13b0c2948c81
```

El preview lee el formulario publicado por un proxy local que sólo hace GET: ves la píldora real y sus estados sin
exponerla en el sitio y sin que un envío sea posible.

Después de conectarla, `verify --browser` y una mirada en vivo en los tres tamaños. Confirmar que funciona de punta a
punta exige un envío **de una persona**: el navegador automatizado no pasa la verificación invisible (Turnstile), y no
se intenta eludirla. El envío se confirma en HubSpot (contacto suscrito al tipo `535702717`).

Con un formulario conectado, la píldora de Glitch y la suscripción del final son el renderer real de Growth Forms.
Sin formulario no hay suscripción en la portada: nunca un «¡Listo!» simulado. La suscripción a Glitch en HubSpot
nace del acto de suscribirse bajo el aviso (`consentBy: 'submission'`, aprobado el 2026-10-24): el servidor guarda el
hash del aviso y el destino sólo suscribe si lo encuentra.

### 4c. Flag y purga

```bash
pnpm public-website:blog-home flag 0 --apply    # contenido de ejemplo aprobado (rollback rápido, datos inertes)
pnpm public-website:blog-home flag 1 --apply    # datos reales
pnpm public-website:blog-home purge --apply     # purga /blog/ ahora
```

No enciendas el flag sin contenido real mínimo (una diapositiva, un tema y un año): el adaptador mostraría el ejemplo
completo y dejaría `home adapter skipped` en el log de PHP.

### 5. Verificar

```bash
pnpm public-website:blog-home verify            # HTTP + estado: plantilla, un H1, menú canónico, indexable, datos reales
pnpm public-website:blog-home verify --browser  # además: 8 anchos de 320 a 1920 sin desborde y axe en los tres tableros
pnpm public-website:blog-home verify --url https://efeoncepro.com/blog-v3-revision/   # otra página con la portada
```

La parte HTTP busca la raíz `#eobh`, un solo H1, la barra del menú canónico, robots `index` y que no queden datos de
ejemplo. La parte de navegador espera el selector `#eobh` y no el evento `load`: los terceros del sitio (etiquetas,
chat) pueden retener ese evento varios minutos. Si `verify` falla, sale con código 1.

### 6. Desplegar código (operador)

```bash
pnpm public-website:blog-home deploy home                    # paquete de eo-blog-home (no escribe)
pnpm public-website:blog-home deploy home --apply
pnpm public-website:blog-home deploy content-model           # paquete + dry-run de efeonce-editorial-blocks
pnpm public-website:blog-home deploy content-model --apply   # apaga el flag, despliega, lo restaura y verifica
```

Cada `deploy` exporta primero la línea base del sitio en vivo, así que el paquete se niega si alguien cambió esos
archivos en Kinsta. Los cambios del runtime deben estar commiteados en `efeonce-public-site-runtime`; para la
plantilla, antes corre en `greenhouse-eo` `bind-canvas.cjs`, `make-tablet.cjs`, `build-plugin.cjs`,
`test-bound-equivalence.cjs`, `test-php-parity.cjs --write-fixtures` y el gate de píxeles (ver
`scripts/public-website/blog-v3/`). Un PHP nuevo tarda 1–2 minutos en llegar a PHP-FPM.

### 7. Corte y rollback de `/blog/`

```bash
pnpm public-website:blog-home page publish --apply                      # imprime el snapshot
pnpm public-website:blog-home page rollback --snapshot <opción> --apply # vuelve exactamente al snapshot
```

El corte del 2026-10-24 dejó el snapshot `_gh_blog_home_v3_before_20261024_081327`.

Rollback por capa, del más chico al más grande: `subscription off --apply` (quita la suscripción) → `flag 0 --apply`
(vuelve el contenido de ejemplo) → restaurar el `.tar` que imprimió el `deploy` (código anterior) → `page rollback`
(la página previa al corte).

### Archivo del blog (búsqueda, temas, etiquetas y autores)

El mismo CLI opera la plantilla del archivo (TASK-2055): `archive <0|preview|1> [--apply]` y
`topic-descriptions <archivo.json> [--apply]`. Paso a paso, estados y problemas comunes en
[Operar el Archivo del blog](operar-archivo-del-blog.md).

## Qué significan los estados

| Señal | Significado |
|---|---|
| `flag: "1"` | La portada muestra datos reales. `"0"`: contenido de ejemplo aprobado. |
| `why: fijada` | Entrada fijada con `pin`, va primero hasta `pin_until`. |
| `why: glitch` | La última edición o Flash de Glitch (no hay recurso newsletter). |
| `why: reciente` | Completa los cinco lugares con la entrada más nueva que puede liderar. |
| `scrim: true` | Usa la imagen destacada con velo de lectura. |
| `stale: true` | Recurso sin revisión reciente: no se muestra. |
| `applied: false` | Fue un plan; nada cambió. |
| `data-subscribe="off"` en `#eobh` | Datos reales sin formulario de Glitch conectado: la suscripción no se muestra. |
| `<greenhouse-form data-dc-keep …>` en el HTML | Suscripción real conectada; el slider no toca ese elemento al animarse. |

## Qué no hacer

- No usar «Fijar arriba» (sticky) de WordPress: la portada no lo lee. Usa `pin`.
- No escribir meta con `wp post meta` ni SQL: se saltan los saneadores y las purgas.
- No guardar enlaces privados de una sala en ningún campo del evento.
- No desplegar con cambios sin commitear en el runtime: el paquete se arma desde git.
- No encender el flag sin contenido real cargado (al menos una diapositiva, un tema y un año).

## Problemas comunes

| Problema | Causa | Qué hacer |
|---|---|---|
| `The remote refused the operation` | Validación del lado de WordPress (slug inexistente, fecha pasada, enlace privado) | Leer el error impreso arriba y corregir el dato. |
| La portada no cambia | Caché de 5 min o purga agrupada de 60 s | `purge --apply` y volver a mirar. |
| El autor sale con iniciales | El perfil no tiene foto subida (un Gravatar no cuenta) | Subir la foto en el perfil de WordPress del autor. |
| La portada no muestra suscripción | `data-subscribe="off"`: no hay formulario conectado | `subscription <clave> --apply` con un formulario `inline_pill` publicado. |
| La píldora se ve aplastada o con texto doble | Un estilo del host alcanzó el interior de `<greenhouse-form>` | `subscription off --apply` de inmediato; el reset del host debe excluir `greenhouse-form *` (`build-plugin.cjs`). |
| El formulario desaparece al cambiar la diapositiva | Falta `data-dc-keep` en `<greenhouse-form>` | Regenerar con `bind-canvas.cjs` y desplegar `deploy home`. |
| `verify --browser` se queda esperando | La página no llegó a pintar `#eobh` en 30 s | Revisar que `/blog/` responda y que el shortcode siga en la página. |
| `verify --browser` muestra `… reintento` o `✗ … no abrió: net::ERR_…` | El sitio cortó una conexión (cada ancho se salta la caché) | Un reintento que termina en ✓ es normal. Si después de dos reintentos sigue sin abrir, revisa que el sitio responda y vuelve a correrlo. |
| `deploy` se niega por drift | Alguien cambió el plugin en Kinsta fuera del repo | Exportar, comparar y llevar el cambio al runtime antes de desplegar. |

## Referencias técnicas

- CLI: `scripts/public-website/blog-home/cli.ts` · remoto: `remote.php` · navegador: `verify-browser.cjs` · ejemplos:
  `examples/`.
- Plugins: `efeonce-public-site-runtime/wp-content/plugins/{efeonce-editorial-blocks,eo-blog-home}/`.
- Suscripción: `scripts/growth/publish-glitch-inline-pill.ts` y
  [contrato de Growth Forms](../../architecture/growth-public-forms-runtime-contract.md).
- Pipeline de la plantilla y gates: `scripts/public-website/blog-v3/` y
  `docs/ui/visual-directions/TASK-2051-blog-portada-v3/README.md`.
