# Operar la portada del blog por CLI

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-10-24 por Claude (sesión «Portada del blog v3»)
> **Ultima actualizacion:** 2026-10-24 por Claude
> **Documentacion tecnica:** [PDR-029](../../public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md) ·
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
```

Formatos: `articulo`, `caso`, `guia`, `grabacion`, `novedad`, `glitch-edicion`, `glitch-flash`, `glitch-nota`. Una
**Novedad** (alianzas, anuncios de Efeonce) sólo entra al slider si se fija.

Una entrada sin imagen propia del slider usa su imagen destacada con un **velo de lectura** a la izquierda. Si el arte
fue hecho para el slider, cárgalo con `hero --image` y el velo desaparece.

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

### 5. Verificar

```bash
pnpm public-website:blog-home verify            # HTTP + estado: plantilla, un H1, menú canónico, indexable, datos reales
pnpm public-website:blog-home verify --browser  # además: 8 anchos de 320 a 1920 sin desborde y axe en los tres tableros
```

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
| `deploy` se niega por drift | Alguien cambió el plugin en Kinsta fuera del repo | Exportar, comparar y llevar el cambio al runtime antes de desplegar. |

## Referencias técnicas

- CLI: `scripts/public-website/blog-home/cli.ts` · remoto: `remote.php` · navegador: `verify-browser.cjs` · ejemplos:
  `examples/`.
- Plugins: `efeonce-public-site-runtime/wp-content/plugins/{efeonce-editorial-blocks,eo-blog-home}/`.
- Pipeline de la plantilla y gates: `scripts/public-website/blog-v3/` y
  `docs/ui/visual-directions/TASK-2051-blog-portada-v3/README.md`.
