# Operar la navegación global del sitio

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-23 por Claude
> **Ultima actualizacion:** 2026-10-23 por Claude
> **Documentacion tecnica:** [Navegación global del sitio público](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md)
> **Documentacion funcional:** [Navegación global del sitio](../../documentation/public-site/navegacion-global-del-sitio.md)

## Para qué sirve

Para cambiar el menú global de [efeoncepro.com](https://efeoncepro.com) —textos, fotos, íconos, servicios, líneas y
tarjetas de lectura— sin tocar código, publicarlo como una revisión nueva, volver atrás, prender o apagar el menú,
operar su agendador de reuniones, actualizar la versión de AXIS que lo dibuja y redirigir una landing que deja de
ser destino.

El menú es el componente AXIS `efeonce.site-nav`. Está prendido en todo el sitio desde el 2026-10-23 00:09 UTC
(`eo_site_nav_enabled=on`). La única página que conserva el header de Ohio es `/blog/` (página `18456`, la gobierna
TASK-1802). Al cierre de este manual la revisión viva es la **4**.

Todo lo que se edita del menú vive en **un documento** dentro de WordPress (plugin «EO Navegación»), con revisiones
nativas que guardan autor y mensaje. Ese documento vivo es la fuente de verdad. Se edita con un solo comando:

```bash
pnpm public-website:site-nav <comando>
```

Sin argumentos imprime la ayuda.

## Antes de empezar

- **Acceso SSH al sitio.** Todo lo que lee o escribe WordPress viaja por WP-CLI sobre SSH. Corre primero:

  ```bash
  pnpm public-website:ssh-check
  ```

  Si falla, no sigas: ningún comando del menú va a poder leer el documento vivo.
- **gcloud para las fotos.** El comando `photo` revisa y sube archivos al bucket público
  `gs://efeonce-group-axis-public-media/site-nav/v1/`. Necesita una sesión de `gcloud` vigente. Si `gcloud` pide
  reautenticar, renueva la sesión con `pnpm gcloud:auth:playwright -- --force`.
- **Quién autoriza.** Las escrituras en producción necesitan el visto bueno del operador **antes** de correrlas:
  subir fotos (`photo` sin `--dry-run`), `apply`, `restore`, el interruptor del menú, la opción del agendador,
  republicar el CTA, desplegar el tema o el plugin y crear redirecciones. Leer (`pull`, `show`, `diff`, `check`,
  `fit`, `preview`, `verify`, `revisions`) no necesita permiso.
- **Checkout compartido.** Corre `git status --short` en `greenhouse-eo` y en `efeonce-public-site-runtime` antes de
  empezar. Las copias de trabajo del menú viven en `tmp/site-nav/` (ignorado por git); no las mezcles con las de otra
  sesión que esté editando el menú al mismo tiempo.
- **Herramientas locales.** `preview` y `fit` usan Chrome vía Playwright y el PHP local con el renderizador del plugin.
  El renderizador se lee desde `efeonce-public-site-runtime` (o desde lo que diga `PUBLIC_SITE_RUNTIME_ROOT`).

## Qué vive dónde

| Pieza | Dónde vive | Cómo se cambia |
| --- | --- | --- |
| Textos, enlaces, fotos, íconos, servicios, líneas, tarjetas de lectura, onepage | Documento del menú en WordPress (plugin «EO Navegación», revisiones nativas) | `pnpm public-website:site-nav` → `apply` |
| Fotos | Bucket `gs://efeonce-group-axis-public-media/site-nav/v1/` (inmutable) | `photo` |
| Dibujo del menú (HTML, CSS, JS, tipografía, movimiento) | AXIS `@efeoncepro/axis-ui-primitives` y `@efeoncepro/axis-ui-contracts`, copiados y fijados en el tema `ohio-child` (`assets/vendor/axis/site-nav/<versión>/`) | Publicar en AXIS → vendorizar → desplegar el tema |
| Dónde se pinta, estado inicial, fuentes, medición, agendador | Adaptador del tema `ohio-child/inc/site-nav.php` | Carril de despliegue del tema |
| Prendido / apagado / piloto | Opción `eo_site_nav_enabled` (`off`, `pilot`, `on`) y `eo_site_nav_pilot_pages` | `set-site-nav-switch.php` |
| Agendador del botón «Agenda tu diagnóstico» | Opción `eo_site_nav_scheduler` + CTA `site-nav-discovery-meeting` en Greenhouse | `publish-site-nav-meeting-cta.ts` + `set-site-nav-scheduler.php` |
| Redirecciones de landings | Yoast SEO Premium | `create-yoast-redirect.php` |
| Espejo del documento en git | `efeonce-public-site-runtime/manifests/site-nav/efeoncepro.com.json` | `pull --mirror` (nunca se edita a mano) |

`manifests/site-nav/build-efeoncepro-document.mjs` (en el runtime) sólo sirvió para crear la primera revisión y se
niega a correr sin `--bootstrap`. No lo uses para cambiar el menú.

## El ciclo de todo cambio

Todos los cambios de contenido siguen el mismo ciclo:

1. `pull` — trae la revisión viva a `tmp/site-nav/working.json`.
2. Editar con `set`, `photo`, `glyph`, `add`, `move`, `remove` o `patch`.
3. `diff` — mira exactamente qué cambió.
4. `check` y `fit` — valida y comprueba que todo cabe.
5. `preview` — míralo en escritorio y teléfono.
6. `apply --message "…" --dry-run` y, con el visto bueno del operador, `apply --message "…"`.
7. `verify` — confirma que el sitio sirve la revisión nueva.
8. `pull --mirror` — deja el espejo al día y comitéalo en el runtime.

## Paso a paso

### 1. Ver el menú vivo

```bash
pnpm public-website:site-nav pull          # revisión viva → tmp/site-nav/working.json (y live.json)
pnpm public-website:site-nav show          # esquema: primarios, líneas, servicios y formatos con sus ids
pnpm public-website:site-nav show service:loop-marketing   # un nodo completo como JSON
pnpm public-website:site-nav diff          # cambios de tu copia contra la revisión que bajaste
```

- `pull --revision 3` baja una revisión vieja para mirarla (no la publica).
- `pull --keep` refresca `live.json` sin pisar tu copia de trabajo.
- `pull --mirror` además escribe el espejo en el runtime; después comitéalo allá.

**Selectores.** Todos los comandos apuntan a un nodo con un selector legible:

| Selector | Apunta a |
| --- | --- |
| `primary:<id>` | Un ítem del menú principal (`inicio`, `nosotros`, `soluciones`, `recursos`, `contacto`) |
| `line:<id>` | Una línea de negocio dentro de Soluciones (`growth`, `brand`, `engine`, `voice`, `revenue`) |
| `service:<id>` | Un servicio de una línea |
| `format:<id>` | Un formato de Recursos (por ejemplo `glitch`) |
| `item:<id>` | Un ítem de un panel, de un formato o del onepage |
| `case:<idLínea>` | La tarjeta de lectura de una línea |
| `reading:<idServicio>` | La tarjeta de lectura de un servicio |
| `featured:<idFormato>` | La tarjeta destacada de un formato |
| `strip:<idPrimario>` | La franja inferior de un panel |
| `onepage:<idPrimario>` | El bloque del menú de pantalla completa de ese primario |
| `header`, `cta`, `logo`, `footer` | Cabecera, botón «Agenda tu diagnóstico», logo y pie del onepage |

`diff` compara por id: si moviste un servicio, se lee como un cambio de orden, no como un borrado más un alta.

### 2. Cambiar un texto

```bash
pnpm public-website:site-nav set service:loop-marketing description "Crecer en ciclos cortos que aprenden."
pnpm public-website:site-nav set line:growth title "Crecer con método"
pnpm public-website:site-nav set cta label "Agenda tu diagnóstico"
pnpm public-website:site-nav set reading:loop-marketing title "¿Qué es Loop Marketing? El framework que reemplaza al funnel"
```

- El valor se interpreta como JSON si lo es; si no, como texto. Para un subcampo usa punto:
  `set line:growth photo.alt "…"`.
- `unset <selector> <campo>` borra un campo.

Reglas del texto:

- **Escribe el carácter, no la entidad HTML.** Si copias desde WordPress un `&#x2122;`, el sitio lo pinta literal.
  Escribe «™». `check` lo detecta y falla.
- **Títulos de tarjeta (lectura de línea o de servicio): 65 caracteres como máximo.** Es el título más largo que se
  midió cabiendo en la tarjeta entre 1200 y 1440. Uno más largo se corta a 1200–1280. `check` avisa.
- **Si acortas, conserva las palabras del post.** En la revisión 2 se acortaron 10 de 16 títulos de lectura sin
  inventar texto: se quitaron palabras, no se reescribió el título. Las tarjetas de Growth, Engine y Voice enlazan
  posts reales.
- **Lo que el diseño recorta tiene que caber.** Corre `fit` (paso 6) después de cambiar descripciones o títulos.

### 3. Cambiar una foto

```bash
# Primero, en seco: recorta en local y te dice qué subiría, sin subir nada ni tocar el documento
pnpm public-website:site-nav photo line:growth --file ~/ruta/foto.png \
  --alt "Una especialista con chaqueta de Efeonce entre cinco órbitas de luz" --dry-run

# Con el visto bueno del operador: sube los recortes y actualiza la copia de trabajo
pnpm public-website:site-nav photo line:growth --file ~/ruta/foto.png \
  --alt "Una especialista con chaqueta de Efeonce entre cinco órbitas de luz"
```

- **Recortes.** `mm` 880×472 (foto del panel), `op` 996×1080 (foto del onepage) y `card` 880×496 (tarjeta
  editorial). Por defecto: `featured` y `format` → `card`; `item` y `onepage` → `op`; el resto → `mm,op`. Para
  elegir: `--crops mm,op,card`.
- **Encuadre.** `--position attention` (por defecto, busca el punto de interés), `centre` o `north`.
- **Nombre.** Por defecto el id del nodo; cámbialo con `--slug`.
- **`--alt` es obligatorio** y describe la foto, no repite el título.
- **Nunca se sobrescribe.** El bucket es inmutable (`--no-clobber`, caché `immutable` de un año). Si el nombre ya
  existe, el comando sube la versión siguiente: `growth-mm.v2.webp`, `growth-mm.v3.webp`… La foto anterior sigue
  disponible, así que volver atrás es sólo apuntar a la URL vieja.
- **Foto chica.** Si la imagen es más chica que el recorte, avisa con `!` y la agranda. Mejor busca una fuente más
  grande.
- Subir la foto **no la publica**: queda en la copia de trabajo hasta `apply`.

### 4. Cambiar un ícono

Los íconos de los servicios salen del catálogo Trazo (60 glifos).

```bash
pnpm public-website:site-nav glyphs              # todo el catálogo
pnpm public-website:site-nav glyphs medic        # filtrado
pnpm public-website:site-nav glyph service:loop-marketing medicion
```

`glyph` se niega si el nombre no está en el catálogo. Sólo aplica a servicios (`service:<id>`).

### 5. Agregar, mover o quitar

```bash
# Agregar un servicio a una línea, después de otro
pnpm public-website:site-nav add line:growth services \
  --json '{"id":"nuevo-servicio","label":"Nuevo servicio","description":"Una línea que cabe.","href":"/servicios/nuevo/","glyph":"medicion"}' \
  --after loop-marketing

# Agregar al principio
pnpm public-website:site-nav add primary:nosotros items --json '{…}' --first

# Mover
pnpm public-website:site-nav move service:nuevo-servicio --before loop-marketing
pnpm public-website:site-nav move line:revenue --last

# Quitar
pnpm public-website:site-nav remove service:nuevo-servicio
```

- `add <padre> services|lines|items|formats` agrega al final si no indicas `--after <id>` ni `--first`. Se niega si el
  id ya existe en esa lista.
- `move` acepta `--after <id>`, `--before <id>`, `--first` o `--last`.
- Para lo que los selectores no cubren, usa un parche RFC 6902 (`add`, `replace`, `remove`):

  ```bash
  pnpm public-website:site-nav patch tmp/site-nav/mi-parche.json
  ```

  con, por ejemplo, `[{"op":"replace","path":"/header/cta/label","value":"Agenda tu diagnóstico"}]`. La ruta de cada
  nodo la imprime `set` al aplicarse (por ejemplo `/primary/2/lines/0/services/0/description`).
- **«Estás aquí» no necesita nada.** Una página de servicio se marca sola cuando su dirección coincide con el `href`
  del servicio (relativo, o en `https://efeoncepro.com` o `www.`). Un enlace a otro host (por ejemplo
  `think.efeoncepro.com`) nunca marca una página del sitio, y dos servicios con la misma URL no marcan ninguno. Los
  matchers de contexto quedan sólo para excepciones; `show` dice cuántos hay.

### 6. Validar y previsualizar

```bash
pnpm public-website:site-nav check
pnpm public-website:site-nav fit
pnpm public-website:site-nav preview --open soluciones --line growth
```

- **`check`** corre el validador del propio plugin (idéntico al de AXIS), revisa que cada enlace del sitio y cada foto
  respondan 200, busca entidades HTML y mide los títulos de tarjeta. Sale con error si hay errores.
- **`fit`** dibuja tu copia con el renderizador real a 1440, 1280 y 1200, abre cada panel, pasa por cada línea y
  lista todo texto recortado. Sale con error si algo se corta.
- **`preview`** deja dos capturas: `tmp/site-nav/preview-desktop.png` (1440×900) y `tmp/site-nav/preview-phone.png`
  (390×844, con el onepage abierto). `--open <primario>` abre ese panel en escritorio y `--line <línea>` pasa sobre
  esa línea. Mira las capturas antes de publicar.

### 7. Publicar

```bash
pnpm public-website:site-nav apply --message "Acorta la descripción de Loop Marketing" --dry-run
# visto bueno del operador
pnpm public-website:site-nav apply --message "Acorta la descripción de Loop Marketing"
pnpm public-website:site-nav verify
pnpm public-website:site-nav verify --path /servicios/posicionamiento-seo/
pnpm public-website:site-nav pull --mirror    # y comitea el espejo en el runtime
```

- `apply` siempre hace primero un dry run en el servidor; si no valida, no guarda nada. Con `--dry-run` se queda ahí.
- Guarda contra la revisión que bajaste con `pull`. Si alguien guardó después, se niega y no pisa nada (ver
  `eosn_conflict` más abajo).
- El mensaje es obligatorio y explica **por qué** cambió. Queda en la revisión.
- Cada `apply` purga las cachés. El borde de Kinsta tarda **entre 40 segundos y 2 minutos** en servir la revisión
  nueva. Espera antes de `verify`.
- `verify` comprueba que `https://efeoncepro.com/wp-json/eo/v1/site-nav` sirve la misma revisión que tu `live.json` y
  que la página (`/` por defecto) pinta el menú.

### 8. Volver atrás

```bash
pnpm public-website:site-nav revisions
pnpm public-website:site-nav restore 3 --message "Vuelve a la revisión 3: la 4 rompió el título de Growth"
pnpm public-website:site-nav verify
```

- `revisions` lista número, fecha, autor, hash y mensaje de cada revisión.
- `restore <n>` publica el contenido de la revisión `n` **como una revisión nueva** (no borra las posteriores) y
  vuelve a bajar la copia de trabajo. Necesita el visto bueno del operador.
- **Para quitar el menú completo** (no sólo un cambio de contenido), apágalo con el interruptor (paso 9, `off`): el
  sitio vuelve al header de Ohio.

### 9. Prender, apagar o piloto del menú

El interruptor es la opción `eo_site_nav_enabled`. Se cambia con un archivo JSON de entrada:

```bash
mkdir -p tmp/site-nav
printf '%s\n' '{"mode":"off"}' > tmp/site-nav/switch.json
# o {"mode":"on"}, o {"mode":"pilot","pilot":[251078, 242261]}
pnpm public-website:wpcli -- --eval-file scripts/public-website/set-site-nav-switch.php \
  --input-file tmp/site-nav/switch.json --wp-user 12
```

- `off` deja todo el sitio con el header de Ohio. Es el rollback del menú.
- `pilot` lo pinta sólo en las páginas listadas (cada una debe estar publicada).
- `on` lo pinta en todo el sitio salvo `/blog/`.
- Se niega a prender (`on` o `pilot`) si el plugin no está activo, el adaptador no está cargado o no hay documento
  publicado.
- Imprime el valor anterior (`previous`) y purga Kinsta. Si responde que no hay purga disponible, corre
  `kinsta cache purge --all`.
- Apagar en producción (`off`) sólo se probó en Playground; si lo haces, verifica una página a 1440 y 390 después.

### 10. El agendador del menú

El botón «Agenda tu diagnóstico» (cabecera, paneles y onepage) abre el agendador nativo de reuniones sin salir de la
página:

- Cada página lleva un `<greenhouse-cta>` oculto, impreso en el pie, cuando la opción `eo_site_nav_scheduler` tiene un
  `{cta, surface, key}` válido.
- El renderizador del CTA se carga cuando el navegador está libre o cuando el visitante se acerca al botón (una sola
  copia en las landings que ya lo cargan). Si todavía no está listo, el clic espera hasta 2,5 segundos.
- Si el lanzador está vacío (`data-ghc-state="empty"`: CTA pausado, origen no permitido), el enlace va directo a
  `/agenda/`.
- El diálogo lleva `data-eo-meeting-skin="site"` y la piel `assets/css/meeting-dialog.css` (marco aprobado para
  Inbound el 2026-10-18, con la paleta de `/agenda/`). Al cerrarse, el foco vuelve al control que lo abrió.
- En Greenhouse: CTA `site-nav-discovery-meeting` (agendador `discovery`, rutas `/**`) en la superficie WordPress
  `csur-eb834d53-fd99-4f6b-9615-979e329e7d37`, que sólo permite ese CTA, con orígenes `efeoncepro.com` y `www.`.

**Rotar la llave de la superficie.** Volver a correr el publicador rota la llave: la anterior deja de funcionar al
instante, así que la opción de WordPress se actualiza **en la misma pasada**. Pide el visto bueno antes.

```bash
# 1. Publicar / rotar (proxy de Cloud SQL en 15432 + credenciales de .env.local). Primero en seco:
GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= \
  npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-site-nav-meeting-cta.ts --dry-run
GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= \
  npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-site-nav-meeting-cta.ts

# 2. Armar la entrada desde .auth/ sin imprimir la llave
node -e '
const fs = require("fs")
const s = JSON.parse(fs.readFileSync(".auth/site-nav-meeting-cta-surface.json", "utf8"))
fs.mkdirSync("tmp/site-nav", { recursive: true })
fs.writeFileSync("tmp/site-nav/scheduler.json", JSON.stringify({ cta: "site-nav-discovery-meeting", surface: s.surfaceId, key: s.embedKey }), { mode: 0o600 })
'

# 3. Escribir la opción y borrar la entrada
pnpm public-website:wpcli -- --eval-file scripts/public-website/set-site-nav-scheduler.php \
  --input-file tmp/site-nav/scheduler.json --wp-user 12
rm tmp/site-nav/scheduler.json
```

- La llave vive sólo en `.auth/site-nav-meeting-cta-surface.json` (permisos 0600, ignorado por git) y en la opción de
  WordPress. Nunca la escribas en un comando, un documento, un commit o un chat.
- `set-site-nav-scheduler.php` nunca imprime la llave. Si los valores no son válidos, vacía la opción y falla.
- Para quitar el agendador, usa `{"clear":true}` como entrada: el botón vuelve a llevar a `/agenda/`.
- Verifica en vivo: abre el diálogo desde la cabecera, un panel y el onepage del teléfono; ciérralo con Escape y con el
  botón; en el dataLayer deben aparecer `gh_site_nav_clicked` y `greenhouse_cta_clicked` /
  `greenhouse_cta_action_started` con `cta_location: site_nav`, sin errores en la página.

### 11. Actualizar AXIS en el sitio

El sitio nunca usa una versión «latest» de AXIS: dibuja con archivos copiados y fijados en el tema. Hoy está fijado en
`@efeoncepro/axis-ui-primitives` **0.7.12** (contratos 0.7.12).

1. **Publicar en AXIS.** El cambio se hace en el repo `axis-design-system` y se publica en GitHub Packages con su tag
   (`v0.7.x`). Nunca vendorices un build local para producción.
2. **Vendorizar desde el paquete publicado**, en `efeonce-public-site-runtime`. Instala desde GitHub Packages la
   versión publicada de `@efeoncepro/axis-ui-primitives` y de `@efeoncepro/axis-brand-assets` (ninguno de los dos
   repos los trae instalados hoy) y pasa sus carpetas:

   ```bash
   node scripts/vendor-axis-site-nav.mjs \
     --primitives <carpeta>/node_modules/@efeoncepro/axis-ui-primitives \
     --brand <carpeta>/node_modules/@efeoncepro/axis-brand-assets \
     --version 0.7.13 \
     --source "published @efeoncepro/axis-ui-primitives@0.7.13 and @efeoncepro/axis-brand-assets@<versión> (GitHub Packages, tag v0.7.13)"
   ```

   El `--source` sigue la forma del que quedó registrado para 0.7.12 (con brand assets 0.4.30). Un tag que no llegó a publicar (como `v0.7.11`) no existe como paquete: se vendoriza la versión que sí está en el registro.

   Copia `site-nav.css`, `site-nav.js` y los SVG de marca a
   `wp-content/themes/ohio-child/assets/vendor/axis/site-nav/<versión>/` y escribe `VERSION.json` con el sha256 de
   cada archivo.
3. **Subir la constante** `EO_SITE_NAV_AXIS` en `wp-content/themes/ohio-child/inc/site-nav.php` a la versión nueva.
4. **Gates en el runtime**: `php tests/eo-site-nav-render.test.php` y la comparación en Playground
   (`tests/playground/run-eo-site-nav.sh`, 49 chequeos). Si AXIS cambió el HTML del menú, el renderizador PHP
   `EOSN_Render` del plugin tiene que seguir idéntico al `siteNavHtml` de AXIS (carril del plugin).
5. **Comitear** los archivos del tema en el runtime: el paquete se niega si hay cambios sin comitear.
6. **Desplegar el tema** (visto bueno del operador), desde `greenhouse-eo`:

   ```bash
   pnpm public-website:export-live-code -- --output tmp/public-site-code-baselines/site-nav
   node scripts/public-website/build-site-nav-theme-package.cjs tmp/public-site-code-baselines/site-nav
   pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-site-nav-theme-package.php \
     --input-file tmp/site-nav-theme-release/package.zip --input-file tmp/site-nav-theme-release/manifest.json --wp-user 12
   ```

   El despliegue sólo lleva los archivos de su lista (`functions.php`, `inc/site-nav.php`, `header-style-1..8`,
   `site-nav-host.css`, `meeting-dialog.css`, `site-nav-host.js` y los archivos AXIS fijados), compara cada archivo
   contra lo que hay en vivo y se niega si algo cambió por fuera, guarda un tar de respaldo y nunca toca el
   interruptor. Para revertir: restaura el tar que imprime.
7. **Purgar y verificar.** Como el despliegue no purga, corre el interruptor con el modo actual
   (`{"mode":"on"}`), que purga Kinsta. Espera 1–2 minutos (un PHP existente modificado tarda por opcache) y revisa
   `verify` más una página a 1440 y 390.

El plugin tiene su propio carril con la misma forma: `build-site-nav-plugin-package.cjs` +
`deploy-site-nav-plugin-package.php` (gates en el runtime: `php tests/eo-site-nav-validator.test.php` y
`tests/playground/run-eo-site-nav.sh`).

### 12. Redirigir una landing

Cuando un servicio deja de apuntar a una landing (caso del 2026-10-23: Loop Marketing ahora enlaza
`/agencia-inbound-marketing/`), la landing vieja se redirige con Yoast SEO Premium, el único dueño de las
redirecciones del sitio:

```bash
printf '%s\n' '{"origin":"/landing-loop-marketing/","target":"/agencia-inbound-marketing/","noindexPostId":248840,"dryRun":true}' \
  > tmp/site-nav/redirect.json
pnpm public-website:wpcli -- --eval-file scripts/public-website/create-yoast-redirect.php \
  --input-file tmp/site-nav/redirect.json --wp-user 12
# revisa la salida en seco; con el visto bueno, repite sin "dryRun"
```

- Se niega si el origen ya redirige, si origen y destino son iguales o si el destino no es una página o post
  publicado.
- `noindexPostId` marca la página redirigida como noindex para que salga del sitemap; imprime el valor anterior para
  revertir.
- Lee la redirección de vuelta y purga. La evidencia final es HTTP en vivo:
  `curl -sI https://efeoncepro.com/landing-loop-marketing/` debe responder 301 hacia el destino. Los UTM se conservan
  (mu-plugin `efeonce-redirect-query-passthrough`).
- Después, en el documento del menú: apunta el servicio al destino final y quita su matcher si tenía uno. `check`
  avisa con `!` cuando un enlace del menú responde con una redirección.

## Qué significan los estados y señales

| Señal | Qué significa |
| --- | --- |
| Número de revisión | Cada `apply` o `restore` crea la siguiente. `pull` imprime la que bajaste; `verify` la que sirve el sitio. Historia actual: 1 inicial · 2 posts reales y títulos de lectura acortados · 3 Loop Marketing → Inbound · 4 «Surround Discovery™» en vez de la entidad HTML. |
| `✓` / `✗` / `!` en `check` | `✗` es error (esquema, entidad HTML, enlace o foto que no responde 200) y bloquea; `!` es aviso (enlace que redirige, título de tarjeta de más de 65 caracteres). La última línea resume errores y avisos. |
| `✗ cut at …: «…»` en `fit` | Ese texto se recorta donde no debe. Acórtalo conservando sus palabras. `✓ fit: every text that must fit does…` es el estado sano. |
| `· cut at 1280: «…» … by design below 1440 (Mega1280)` | Una descripción de servicio en una línea con puntos suspensivos bajo 1440: es el diseño aprobado. Sólo es error si se corta a 1440. |
| `! cut at …: «…» … fallback title` | Título fijo de Recursos: en vivo lo reemplazan los posts más recientes. Es un aviso, no un error. |
| `Válido. Se guardaría como la revisión N (dry run, nada se guardó).` | El dry run de `apply` pasó. |
| `REST serves revision X, expected Y` en `verify` | El borde todavía sirve la revisión anterior, o alguien publicó otra. Espera y repite; si persiste, haz `pull`. |
| `eosn_conflict` (409) «Alguien guardó mientras editabas; no se pisó nada.» | Otra persona o sesión publicó después de tu `pull`. Nada se perdió. |
| `eosn_storage_altered` (500) «El sitio alteró el documento al guardarlo…» | Al leer de vuelta lo guardado, el hash no coincidió: algún filtro de contenido de WordPress lo modificó. El documento se guarda como ASCII escapado justamente para evitarlo; si aparece, es un problema del sitio, no de tu edición. |
| `[eo-site-nav] …` en el log de PHP | El adaptador no pudo pintar el menú y dejó el header de Ohio: plugin inactivo, sin documento o error de render. La página sigue funcionando. |
| `data-ghc-state="empty"` en el lanzador | El CTA del agendador no está disponible (pausado u origen no permitido). El botón lleva a `/agenda/`. |
| `gh_site_nav_opened`, `gh_site_nav_line_viewed`, `gh_site_nav_clicked` en el dataLayer | Medición del menú: panel abierto, línea vista, clic (con `target_type` y `target`; el botón del agendador va como `target_type: cta`, `target` `menu_header`, `menu_mega` o `menu_onepage`). La configuración en GTM/GA4 todavía está pendiente. |

## Qué no hacer

- **No** edites el menú en el espejo `efeoncepro.com.json` ni con `build-efeoncepro-document.mjs`: la fuente de verdad
  es el documento vivo.
- **No** publiques (`photo`, `apply`, `restore`, interruptor, agendador, despliegues, redirecciones) sin el visto bueno
  del operador.
- **No** sobrescribas una foto del bucket ni borres versiones viejas: el comando versiona solo.
- **No** escribas entidades HTML en el texto; escribe el carácter.
- **No** reescribas un título de lectura para que quepa: acórtalo con sus propias palabras.
- **No** escribas la llave del agendador en ningún comando, archivo versionado, documento o mensaje.
- **No** vendorices un build local de AXIS para producción ni uses una versión «latest».
- **No** estilices el menú desde el tema: el host sólo controla `--axis-site-nav-offset` y `--axis-site-nav-z` y carga
  las fuentes (Bricolage Grotesque y Poppins).
- **No** crees redirecciones fuera de `create-yoast-redirect.php` ni escribas la opción de Yoast a mano.
- **No** fuerces un `apply` después de un `eosn_conflict`: vuelve a bajar y rehaz el cambio.

## Problemas comunes

| Problema | Causa y solución |
| --- | --- |
| Publiqué y el sitio sigue mostrando lo anterior | El borde de Kinsta tarda entre 40 segundos y 2 minutos. Espera y repite `verify`. |
| Desplegué el tema y no cambió nada | Un archivo PHP existente modificado puede tardar 1–2 minutos por opcache, y el despliegue no purga: corre el interruptor con el modo actual para purgar. |
| En zsh, después de un bucle, ningún comando funciona (`command not found`) | En zsh la variable `path` está atada a `PATH`. Un `for path in /x/ /y/; do …` deja la terminal sin programas. Usa otro nombre (`for ruta in …`) o abre otra terminal. |
| Un título de tarjeta se ve cortado | Pasa de 65 caracteres o `fit` lo marca. Acórtalo conservando sus palabras y repite `check` y `fit`. |
| `photo` avisa que la imagen es más chica que el recorte | La agrandaría y se vería blanda. Busca una fuente de al menos 880×472 (`mm`), 996×1080 (`op`) o 880×496 (`card`). |
| `apply` falla con `eosn_conflict` | Alguien guardó después de tu `pull`. Guarda tu `diff`, corre `pull`, rehaz el cambio sobre la revisión nueva, `check` y vuelve a aplicar. |
| A 1280 se cortan cinco descripciones de servicio (contenidos, redes sociales, medios, performance, inbound) | Es el diseño aprobado: el tablero Mega1280 del canvas recorta las descripciones a una línea con puntos suspensivos (confirmado por la sesión de fidelidad el 2026-10-23). En 1440 deben verse completas; `fit` sólo lo marca como error a 1440. |
| Una página con hero claro arranca con el logo blanco ilegible | Las páginas con hero claro deben estar en `EO_SITE_NAV_LIGHT_HERO_PAGES` del adaptador (hoy 251078, 242261, 223787, 223841, 21460, 19820) para arrancar con la isla clara. Agregar una es un cambio del tema (carril del paso 11). |
| `check` marca `«…» answers 000` | El enlace no respondió en 20 segundos. Repite; si persiste, revisa la página. |
| `pull` falla con «Unexpected remote output» | Problema de SSH o WP-CLI. Corre `pnpm public-website:ssh-check`. |

## Referencias técnicas

- Arquitectura: [`docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md`](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md)
- Documentación funcional: [`docs/documentation/public-site/navegacion-global-del-sitio.md`](../../documentation/public-site/navegacion-global-del-sitio.md)
- Guía del agente: `.claude/skills/efeonce-public-site-wordpress/references/global-site-navigation.md`
- CLI: `scripts/public-website/site-nav/cli.ts` (con `local.php`, `remote.php` y `repair-revision-meta.php`, este
  último de uso único para metadatos de revisiones).
- Scripts de WordPress en `scripts/public-website/`: `apply-site-nav-document.php`, `set-site-nav-switch.php`,
  `set-site-nav-scheduler.php`, `create-yoast-redirect.php`, `build-site-nav-plugin-package.cjs`,
  `deploy-site-nav-plugin-package.php`, `build-site-nav-theme-package.cjs`, `deploy-site-nav-theme-package.php`,
  `export-live-code-baseline.ts`.
- Publicador del CTA: `scripts/growth/publish-site-nav-meeting-cta.ts`.
- Runtime (`efeonce-public-site-runtime`): plugin `wp-content/plugins/eo-site-nav/` (REST `eo/v1/site-nav`, comandos
  `wp eo-nav validate|apply|export|revisions|restore`), adaptador `wp-content/themes/ohio-child/inc/site-nav.php`,
  `scripts/vendor-axis-site-nav.mjs`, espejo `manifests/site-nav/efeoncepro.com.json`, suite
  `tests/playground/run-eo-site-nav.sh`.
- AXIS: `@efeoncepro/axis-ui-primitives` (0.7.12 en vivo), `@efeoncepro/axis-ui-contracts` (0.7.12),
  `@efeoncepro/axis-brand-assets`; contrato `efeonce.site-nav`; contrato del host en `PRIMITIVES.md` de AXIS.
- Programa: EPIC-055 · TASK-2040 · TASK-2041 · TASK-2042.
