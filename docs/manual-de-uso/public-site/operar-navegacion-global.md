# Operar la navegación global del sitio

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-10-23 por Claude
> **Ultima actualizacion:** 2026-10-23 por Claude
> **Documentacion tecnica:** [Navegación global del sitio público](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md)
> **Documentacion funcional:** [Navegación global del sitio](../../documentation/public-site/navegacion-global-del-sitio.md)

## Para qué sirve

Para operar de punta a punta el menú global de [efeoncepro.com](https://efeoncepro.com):

- cambiar su contenido (textos, títulos, descripciones, fotos, íconos, servicios, líneas, ítems, formatos y tarjetas
  de lectura) sin tocar código, publicarlo como una revisión nueva y volver atrás;
- prenderlo, pasarlo a piloto o apagarlo (el rollback del menú completo);
- operar el agendador del botón «Agenda tu diagnóstico» y rotar su llave sin exponerla;
- redirigir una landing que deja de ser destino del menú;
- desplegar el plugin y el adaptador del tema, y actualizar la versión de AXIS que dibuja el menú;
- verificar en vivo sin caer en las trampas conocidas.

El menú es el componente AXIS `efeonce.site-nav`. Está prendido en todo el sitio desde el 2026-10-23 00:09 UTC
(`eo_site_nav_enabled=on`), por decisión del operador y sin piloto previo. La única página que conserva el header de
Ohio es `/blog/` (página `18456`, la gobierna TASK-1802). Al cierre de este manual la revisión viva del documento es la
**4** y el tema dibuja con AXIS primitives **0.7.13**.

El dock inferior de vidrio de las landings es otra pieza, con su propio plugin y su propio manual:
[Operar el dock de las landings](operar-dock-de-landings.md).

## Antes de empezar

- **Acceso SSH al sitio.** Todo lo que lee o escribe WordPress viaja por WP-CLI sobre SSH. Corre primero:

  ```bash
  pnpm public-website:ssh-check
  ```

  Si falla, no sigas: ningún comando del menú va a poder leer el documento vivo.
- **gcloud para las fotos.** `photo` revisa y sube archivos al bucket público
  `gs://efeonce-group-axis-public-media/site-nav/v1/`. Necesita una sesión de `gcloud` vigente; si pide reautenticar,
  corre `pnpm gcloud:auth:playwright -- --force`.
- **Chrome y PHP locales.** `preview` y `fit` usan Chrome vía Playwright y el PHP local con el renderizador del plugin,
  que se lee desde el repo `efeonce-public-site-runtime` (o desde la ruta de `PUBLIC_SITE_RUNTIME_ROOT`).
- **Quién autoriza.** Toda escritura en producción necesita el visto bueno del operador **antes** de correrla: subir
  fotos (`photo` sin `--dry-run`), `apply`, `restore`, el interruptor, la opción del agendador, republicar el CTA,
  desplegar el tema o el plugin y crear redirecciones. Leer (`pull`, `show`, `diff`, `check`, `fit`, `preview`,
  `verify`, `revisions`) no necesita permiso.
- **Checkout compartido.** Corre `git status --short` en `greenhouse-eo` y en `efeonce-public-site-runtime` antes de
  empezar. Las copias de trabajo del menú viven en `tmp/site-nav/` (ignorado por git). Si otra sesión está editando el
  menú al mismo tiempo, coordinen: el sistema nunca pisa un guardado ajeno, pero dos copias de trabajo en la misma
  carpeta sí se pisan entre sí.

## Qué vive dónde

| Pieza | Dónde vive | Cómo se cambia |
| --- | --- | --- |
| Textos, enlaces, fotos, íconos, servicios, líneas, tarjetas de lectura, onepage | Documento del menú en WordPress (plugin «EO Navegación», tipo de contenido privado con revisiones nativas). **Es la fuente de verdad.** | `pnpm public-website:site-nav` → `apply` |
| Fotos | Bucket `gs://efeonce-group-axis-public-media/site-nav/v1/` (inmutable) | `photo` |
| Dibujo del menú (HTML, CSS, JS, tipografía, movimiento, tono de la isla) | AXIS `@efeoncepro/axis-ui-primitives` y `@efeoncepro/axis-ui-contracts`, copiados y fijados en el tema `ohio-child` (`assets/vendor/axis/site-nav/<versión>/`) | Publicar en AXIS → vendorizar → desplegar el tema ([paso 13](#13-actualizar-axis-en-el-sitio)) |
| Renderizador y validador PHP | Plugin `eo-site-nav` (`EOSN_Render`, idéntico byte a byte al `siteNavHtml` de AXIS; validador idéntico al de AXIS) | Carril del plugin ([paso 12](#12-desplegar-el-plugin-o-el-tema)) |
| Dónde se pinta, estado inicial, fuentes, medición, agendador | Adaptador del tema `ohio-child/inc/site-nav.php` + `site-nav-host.css`, `site-nav-host.js`, `meeting-dialog.css` | Carril del tema ([paso 12](#12-desplegar-el-plugin-o-el-tema)) |
| Prendido / piloto / apagado | Opción `eo_site_nav_enabled` (`off`, `pilot`, `on`) y `eo_site_nav_pilot_pages` | `set-site-nav-switch.php` ([paso 9](#9-prender-pasar-a-piloto-o-apagar-el-menú)) |
| Agendador de «Agenda tu diagnóstico» | Opción `eo_site_nav_scheduler` + CTA `site-nav-discovery-meeting` en Greenhouse | `publish-site-nav-meeting-cta.ts` + `set-site-nav-scheduler.php` ([paso 10](#10-el-agendador-del-menú)) |
| Redirecciones de landings | Yoast SEO Premium | `create-yoast-redirect.php` ([paso 11](#11-redirigir-una-landing)) |
| Espejo del documento en git | `efeonce-public-site-runtime/manifests/site-nav/efeoncepro.com.json` | `pull --mirror` (nunca se edita a mano) |

`manifests/site-nav/build-efeoncepro-document.mjs` (en el runtime) sólo sirvió para crear la primera revisión y se
niega a correr sin `--bootstrap`. No lo uses para cambiar el menú.

## El ciclo de todo cambio de contenido

```bash
pnpm public-website:site-nav <comando>    # sin argumentos imprime la ayuda
```

1. `pull` — trae la revisión viva a `tmp/site-nav/working.json`.
2. Editar con `set`, `unset`, `photo`, `glyph`, `add`, `move`, `remove` o `patch`.
3. `diff` — mira exactamente qué cambió.
4. `check` y `fit` — valida y comprueba que todo cabe.
5. `preview` — míralo en escritorio y teléfono.
6. `apply --message "…" --dry-run` y, con el visto bueno del operador, `apply --message "…"`.
7. `verify` — confirma que el sitio sirve la revisión nueva.
8. `pull --mirror` — deja el espejo al día y comitéalo en el runtime.

## Paso a paso

### 1. Ver el menú vivo

```bash
pnpm public-website:site-nav pull                          # revisión viva → tmp/site-nav/working.json y live.json
pnpm public-website:site-nav show                          # esquema: primarios, líneas, servicios, formatos e ítems con sus ids
pnpm public-website:site-nav show service:loop-marketing   # un nodo completo como JSON
pnpm public-website:site-nav diff                          # tu copia contra la revisión que bajaste
```

- `pull --revision 3` baja una revisión vieja para mirarla (no la publica).
- `pull --keep` refresca `live.json` sin pisar tu copia de trabajo.
- `pull --mirror` además escribe el espejo en el runtime; después comitéalo allá.
- `diff` compara por id: si moviste un servicio, se lee como un cambio de orden, no como un borrado más un alta.

**Selectores.** Todos los comandos apuntan a un nodo con un selector legible:

| Selector | Apunta a |
| --- | --- |
| `primary:<id>` | Un ítem del menú principal (`inicio`, `nosotros`, `soluciones`, `recursos`, `contacto`) |
| `line:<id>` | Una línea de Soluciones (`growth`, `brand`, `engine`, `voice`, `revenue`) |
| `service:<id>` | Un servicio de una línea (por ejemplo `loop-marketing`, `seo`, `aeo`) |
| `format:<id>` | Un formato de Recursos (`glitch`, `blog`, `herramientas`, `guias`) |
| `item:<id>` | Un ítem de un panel, de un formato o del onepage |
| `case:<idLínea>` | La tarjeta de lectura de una línea |
| `reading:<idServicio>` | La tarjeta de lectura de un servicio |
| `featured:<idFormato>` | La tarjeta destacada de un formato |
| `strip:<idPrimario>` | La franja inferior de un panel |
| `onepage:<idPrimario>` | El bloque del menú de pantalla completa de ese primario |
| `header`, `cta`, `logo`, `footer` | Cabecera, botón «Agenda tu diagnóstico», logo y pie del onepage |

### 2. Cambiar un título, una descripción u otro texto

```bash
pnpm public-website:site-nav set service:loop-marketing description "Crecer en ciclos cortos que aprenden."
pnpm public-website:site-nav set line:growth title "Crecer con método"
pnpm public-website:site-nav set cta label "Agenda tu diagnóstico"
pnpm public-website:site-nav set reading:loop-marketing title "¿Qué es Loop Marketing? El framework que reemplaza al funnel"
```

- El valor se interpreta como JSON si lo es; si no, como texto. Para un subcampo usa punto:
  `set line:growth photo.alt "…"`. `set` imprime la ruta del nodo (por ejemplo
  `/primary/2/lines/0/services/0/description`), útil para un `patch`.
- `unset <selector> <campo>` borra un campo.

Reglas del texto:

- **Escribe el carácter, no la entidad HTML.** Si copias desde WordPress un `&#x2122;`, el sitio lo pinta literal.
  Escribe «™». `check` lo detecta y falla. (La revisión 4 existió justamente para corregir «Surround Discovery™».)
- **Títulos de tarjeta de lectura (de línea o de servicio): 65 caracteres como máximo.** Es el más largo que se midió
  cabiendo entre 1200 y 1440; uno más largo se corta a 1200–1280. `check` avisa.
- **Si acortas, conserva las palabras del post.** En la revisión 2 se acortaron 10 de 16 títulos de lectura quitando
  palabras, sin reescribir. Las tarjetas de Growth, Engine y Voice enlazan posts reales.
- **Descripciones de servicio:** bajo 1440 se muestran en una línea con puntos suspensivos (diseño aprobado,
  tablero Mega1280); a 1440 tienen que verse completas. Corre `fit` después de cambiarlas.

### 3. Cambiar una foto

```bash
# Primero en seco: recorta en local y dice qué subiría, sin subir nada ni tocar la copia de trabajo
pnpm public-website:site-nav photo line:growth --file ~/ruta/foto.png \
  --alt "Una especialista con chaqueta de Efeonce entre cinco órbitas de luz" --dry-run

# Con el visto bueno del operador: sube los recortes y actualiza la copia de trabajo
pnpm public-website:site-nav photo line:growth --file ~/ruta/foto.png \
  --alt "Una especialista con chaqueta de Efeonce entre cinco órbitas de luz"
```

- **Recortes.** `mm` 880×472 (foto del panel), `op` 996×1080 (foto del onepage) y `card` 880×496 (tarjeta
  editorial). Por defecto: `featured` y `format` → `card`; `item` y `onepage` → `op`; el resto → `mm,op`. Para elegir:
  `--crops mm,op,card`.
- **Encuadre.** `--position attention` (por defecto, busca el punto de interés), `centre` o `north`.
- **Nombre.** Por defecto, el id del nodo; cámbialo con `--slug`.
- **`--alt` es obligatorio** y describe la foto, no repite el título.
- **Nunca se sobrescribe.** El bucket es inmutable (`--no-clobber`, caché `immutable` de un año). Si el nombre ya
  existe, el comando sube la versión siguiente: `growth-mm.v2.webp`, `growth-mm.v3.webp`… La foto anterior sigue
  disponible, así que volver atrás es apuntar a la URL vieja (o restaurar la revisión anterior).
- **Foto chica.** Si la imagen es más chica que un recorte, avisa con `!` y la agranda; busca una fuente más grande.
- Subir la foto **no la publica**: queda en la copia de trabajo hasta `apply`.

### 4. Cambiar un ícono

Los íconos de los servicios salen del catálogo Trazo (60 glifos).

```bash
pnpm public-website:site-nav glyphs              # todo el catálogo
pnpm public-website:site-nav glyphs medic        # filtrado por texto
pnpm public-website:site-nav glyph service:loop-marketing medicion
```

`glyph` sólo aplica a servicios (`service:<id>`) y se niega si el nombre no está en el catálogo.

### 5. Agregar, mover o quitar un servicio, una línea, un ítem o un formato

```bash
# Agregar un servicio a una línea, después de otro
pnpm public-website:site-nav add line:growth services \
  --json '{"id":"nuevo-servicio","label":"Nuevo servicio","description":"Una línea que cabe.","href":"/servicios/nuevo/","glyph":"medicion"}' \
  --after loop-marketing

# Agregar un ítem al principio de un panel
pnpm public-website:site-nav add primary:nosotros items --json '{…}' --first

# Mover
pnpm public-website:site-nav move service:nuevo-servicio --before loop-marketing
pnpm public-website:site-nav move line:revenue --last

# Quitar
pnpm public-website:site-nav remove service:nuevo-servicio
```

- `add <padre> services|lines|items|formats` agrega al final si no indicas `--after <id>` ni `--first`. Se niega si el
  id ya existe en esa lista o si el padre no tiene esa lista.
- `move` acepta `--after <id>`, `--before <id>`, `--first` o `--last`. `move` y `remove` sólo aplican a entradas de una
  lista.
- Para lo que los selectores no cubren, usa un parche RFC 6902 (sólo `add`, `replace` y `remove`):

  ```bash
  pnpm public-website:site-nav patch tmp/site-nav/mi-parche.json
  ```

  con, por ejemplo, `[{"op":"replace","path":"/header/cta/label","value":"Agenda tu diagnóstico"}]`.
- **«Estás aquí» no necesita configuración.** Una página de servicio se marca sola cuando su dirección coincide con el
  `href` del servicio (relativo, o en `https://efeoncepro.com` o `www.`). Un enlace a otro host (por ejemplo
  `think.efeoncepro.com`) nunca marca una página del sitio, y dos servicios con la misma URL no marcan ninguno. Los
  matchers de contexto quedan sólo para excepciones y ganan sobre el enlace; `show` dice cuántos hay. Ejemplo vivo:
  Loop Marketing e Inbound Marketing apuntan los dos a `/agencia-inbound-marketing/`, y el matcher de esa ruta hace que
  se marque Inbound Marketing (verificado en vivo el 2026-10-23). Si agregas un servicio con la URL de otro, agrega
  también el matcher o la página dejará de marcar.

### 6. Validar y previsualizar

```bash
pnpm public-website:site-nav check
pnpm public-website:site-nav fit
pnpm public-website:site-nav preview --open soluciones --line growth
```

- **`check`** corre el validador del propio plugin (idéntico al de AXIS), revisa que cada enlace del sitio y cada foto
  respondan 200, busca entidades HTML y mide los títulos de tarjeta. Sale con error si hay errores (`✗`); los avisos
  (`!`) no bloquean.
- **`fit`** dibuja tu copia con el renderizador real a 1440, 1280 y 1200, abre cada panel, pasa por cada línea y lista
  todo texto recortado. **Una descripción de servicio cortada a 1280 o 1200 sale con `·` y es el diseño aprobado**
  (tablero Mega1280: bajo 1440 una línea con puntos suspensivos); sólo es error si se corta a 1440. Los títulos de
  Recursos salen con `!` porque en vivo los reemplazan los posts más recientes. Cualquier otro corte es `✗` y falla.
- **`preview`** deja dos capturas: `tmp/site-nav/preview-desktop.png` (1440×900) y `tmp/site-nav/preview-phone.png`
  (390×844, con el onepage abierto). `--open <primario>` abre ese panel en escritorio; `--line <línea>` pasa sobre esa
  línea; `--path /x/` simula la página (para revisar «Estás aquí»); `--state top|fixed` y `--tone dark|light` eligen el
  estado inicial de la cabecera (por defecto `top` y `dark`). Mira las capturas antes de publicar.

### 7. Publicar

```bash
pnpm public-website:site-nav apply --message "Acorta la descripción de Loop Marketing" --dry-run
# visto bueno del operador
pnpm public-website:site-nav apply --message "Acorta la descripción de Loop Marketing"
# espera entre 40 segundos y 2 minutos
pnpm public-website:site-nav verify
pnpm public-website:site-nav verify --path /servicios/posicionamiento-seo/
pnpm public-website:site-nav pull --mirror    # y comitea el espejo en el runtime
```

- **Siempre hay un dry run en el servidor.** `apply` valida primero con el servicio de guardado del plugin; si no
  valida, no guarda nada. Con `--dry-run` se queda ahí.
- **Revisión base.** Guarda contra la revisión que bajaste con `pull`. Si alguien guardó después, se niega con
  `eosn_conflict` y **no pisa nada**.
- **El mensaje es obligatorio** y explica por qué cambió. Queda en la revisión.
- **Guardado verificado.** El plugin guarda el documento como JSON con los caracteres no ASCII escapados (así ningún
  filtro de contenido de WordPress puede alterarlo), lo vuelve a leer y exige el mismo hash; si no coincide, falla con
  `eosn_storage_altered`.
- **Purga.** Cada `apply` purga las cachés. El borde de Kinsta tarda entre 40 segundos y 2 minutos en servir la
  revisión nueva.
- `verify` comprueba que `https://efeoncepro.com/wp-json/eo/v1/site-nav` sirve la misma revisión que tu `live.json` y
  que la página (`/` por defecto, o `--path`) pinta el menú.

### 8. Ver revisiones y volver atrás

```bash
pnpm public-website:site-nav revisions
pnpm public-website:site-nav restore 3 --message "Vuelve a la revisión 3: la 4 rompió el título de Growth"
pnpm public-website:site-nav verify
```

- `revisions` lista número, fecha, autor, hash y mensaje de cada revisión. Historia actual: 1 inicial · 2 posts reales
  y títulos de lectura acortados · 3 Loop Marketing → Inbound · 4 «Surround Discovery™» en vez de la entidad HTML.
- `restore <n>` publica el contenido de la revisión `n` **como una revisión nueva** (no borra las posteriores) y vuelve
  a bajar la copia de trabajo (pisa la tuya). Necesita el visto bueno del operador.
- Para quitar el menú completo, no restaures: apágalo con el interruptor (paso 9).

### 9. Prender, pasar a piloto o apagar el menú

El interruptor es la opción `eo_site_nav_enabled`. Se cambia con un archivo JSON de entrada:

```bash
mkdir -p tmp/site-nav
printf '%s\n' '{"mode":"off"}' > tmp/site-nav/switch.json
# o {"mode":"on"}, o {"mode":"pilot","pilot":[251078, 242261]}
pnpm public-website:wpcli -- --eval-file scripts/public-website/set-site-nav-switch.php \
  --input-file tmp/site-nav/switch.json --wp-user 12
```

- `on` pinta el menú en todo el sitio salvo `/blog/`. Es el estado actual.
- `pilot` lo pinta sólo en las páginas listadas (cada una debe estar publicada).
- `off` deja todo el sitio con el header de Ohio. **Es el rollback del menú completo.**
- Se niega a prender (`on` o `pilot`) si el plugin no está activo, el adaptador no está cargado o no hay documento
  publicado.
- Imprime el valor anterior (`previous`) y purga Kinsta. Si avisa que no hay purga disponible, corre
  `kinsta cache purge --all`.
- Correrlo con el modo actual (`{"mode":"on"}`) es también la forma de **purgar** después de desplegar el tema.
- Apagar en producción (`off`) sólo se probó en Playground. Si lo haces, verifica una página a 1440 y a 390 después
  (debe verse el header de Ohio y ningún `data-axis-site-nav` en el HTML).
- Aunque el interruptor esté en `on`, una página que no puede pintar el menú (plugin inactivo, sin documento, documento
  inválido o error de render) muestra el header de Ohio y deja una línea `[eo-site-nav] …` en el log de PHP.

### 10. El agendador del menú

«Agenda tu diagnóstico» (cabecera, panel de Soluciones y onepage) abre el agendador nativo de reuniones sin salir de la
página:

- Cada página lleva un `<greenhouse-cta>` oculto, impreso en el pie, cuando la opción `eo_site_nav_scheduler` tiene un
  `{cta, surface, key}` válido.
- El renderizador del CTA se carga cuando el navegador está libre o cuando el visitante se dirige al botón (una sola
  copia en las landings que ya lo cargan). Si todavía no está listo, el clic espera hasta 2,5 segundos.
- Si el lanzador está vacío (`data-ghc-state="empty"`: CTA pausado u origen no permitido), el enlace va directo a
  `/agenda/`.
- El diálogo lleva `data-eo-meeting-skin="site"` y la piel `assets/css/meeting-dialog.css` (marco aprobado para
  Inbound el 2026-10-18, con la paleta de `/agenda/`). En una landing con diálogo propio, el de la landing conserva el
  suyo. Al cerrarse, el foco vuelve al control que lo abrió.
- Con el agendador abierto, la isla de la cabecera conserva su tono (AXIS 0.7.13).
- En Greenhouse: CTA `site-nav-discovery-meeting` (agendador `discovery`, rutas `/**`) en la superficie WordPress
  `csur-eb834d53-fd99-4f6b-9615-979e329e7d37`, que sólo permite ese CTA, con orígenes `efeoncepro.com` y `www.`.

**Rotar la llave de la superficie.** Volver a correr el publicador rota la llave y la anterior deja de funcionar al
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

# 3. Escribir la opción (purga) y borrar la entrada
pnpm public-website:wpcli -- --eval-file scripts/public-website/set-site-nav-scheduler.php \
  --input-file tmp/site-nav/scheduler.json --wp-user 12
rm tmp/site-nav/scheduler.json
```

- La llave vive sólo en `.auth/site-nav-meeting-cta-surface.json` (permisos 0600, ignorado por git) y en la opción de
  WordPress. Nunca la escribas en un comando, un documento, un commit o un chat.
- `set-site-nav-scheduler.php` nunca imprime la llave. Si los valores no son válidos, vacía la opción y falla.
- Para quitar el agendador, usa `{"clear":true}` como entrada: el botón vuelve a llevar a `/agenda/`.

### 11. Redirigir una landing

Cuando un servicio deja de apuntar a una landing (caso del 2026-10-23: la landing de Loop Marketing no está optimizada,
así que el servicio enlaza `/agencia-inbound-marketing/`), la landing vieja se redirige con Yoast SEO Premium, el único
dueño de las redirecciones del sitio:

```bash
printf '%s\n' '{"origin":"/landing-loop-marketing/","target":"/agencia-inbound-marketing/","noindexPostId":248840,"dryRun":true}' \
  > tmp/site-nav/redirect.json
pnpm public-website:wpcli -- --eval-file scripts/public-website/create-yoast-redirect.php \
  --input-file tmp/site-nav/redirect.json --wp-user 12
# revisa la salida en seco; con el visto bueno, repite sin "dryRun"
```

- Se niega si la API de Yoast Premium no está, si el origen ya redirige, si origen y destino son iguales o si el
  destino no es una página o post publicado.
- `noindexPostId` marca la página redirigida como noindex para que salga del sitemap e imprime el valor anterior para
  revertir.
- Lee la redirección de vuelta y purga. La evidencia final es HTTP en vivo:
  `curl -sI https://efeoncepro.com/landing-loop-marketing/` debe responder 301 hacia el destino. Los parámetros UTM se
  conservan (mu-plugin `efeonce-redirect-query-passthrough`).
- Después, en el documento del menú, apunta el servicio al destino final y quita su matcher si tenía uno. `check` avisa
  con `!` cuando un enlace del menú responde con una redirección.

### 12. Desplegar el plugin o el tema

Los dos carriles viajan por SSH/WP-CLI con archivos de entrada, comparan el sha256 de cada archivo contra lo que hay en
vivo (se niegan si algo cambió por fuera), guardan un tar de respaldo en el servidor e invalidan opcache. Ambos exigen
que los archivos del runtime estén comiteados. Necesitan el visto bueno del operador.

Primero, en `greenhouse-eo`, exporta la línea base del código vivo (conserva los archivos AXIS fijados del tema para
que la guarda de drift los vea):

```bash
pnpm public-website:export-live-code -- --output tmp/public-site-code-baselines/site-nav
```

**Plugin `eo-site-nav`** (gates en el runtime antes de empaquetar: `php tests/eo-site-nav-validator.test.php`,
`php tests/eo-site-nav-render.test.php` y `tests/playground/run-eo-site-nav.sh`, 49 chequeos):

```bash
node scripts/public-website/build-site-nav-plugin-package.cjs tmp/public-site-code-baselines/site-nav
pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-site-nav-plugin-package.php \
  --input-file tmp/site-nav-plugin-release/package.zip --input-file tmp/site-nav-plugin-release/manifest.json --wp-user 12
```

Escribe el archivo principal al final y activa el plugin; nunca escribe el documento del menú. Rollback:
`wp plugin deactivate eo-site-nav` y restaurar el tar que imprime (o borrar las rutas creadas que lista).

**Tema `ohio-child`** (gates en el runtime: `php tests/eo-site-nav-render.test.php` y la comparación en Playground):

```bash
node scripts/public-website/build-site-nav-theme-package.cjs tmp/public-site-code-baselines/site-nav
pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-site-nav-theme-package.php \
  --input-file tmp/site-nav-theme-release/package.zip --input-file tmp/site-nav-theme-release/manifest.json --wp-user 12
```

- Sólo lleva su lista: `functions.php`, `inc/site-nav.php`, `parts/headers/header-style-1..8.php`,
  `site-nav-host.css`, `meeting-dialog.css`, `site-nav-host.js` y los archivos AXIS fijados de la versión que declara
  `EO_SITE_NAV_AXIS`. El empaquetador comprueba que esos archivos coincidan con su `VERSION.json`.
- Exige que existan las 8 partes de header de Ohio (los overrides vuelven a ellas) y escribe `functions.php` al final.
- **Nunca toca el interruptor**: si no existe, lo crea en `off`. **Tampoco purga**: con el menú prendido, corre el
  interruptor con `{"mode":"on"}` para purgar.
- Rollback: restaurar el tar que imprime sobre `wp-content/themes/ohio-child` y borrar las rutas creadas que lista
  (`functions.php` primero).

Después de cualquiera de los dos, espera 1–2 minutos (un PHP existente modificado tarda por opcache, y el borde entre
40 segundos y 2 minutos) y verifica (paso 14).

### 13. Actualizar AXIS en el sitio

El sitio nunca usa una versión «latest» de AXIS: dibuja con archivos copiados y fijados en el tema. Hoy está fijado en
`@efeoncepro/axis-ui-primitives` **0.7.13** (contratos 0.7.12, brand assets 0.4.30), en
`assets/vendor/axis/site-nav/0.7.13/`. El dock de las landings lleva su propia copia, aparte del tema (plugin `eo-landing-dock`,
primitives 0.7.14): se actualiza con su [manual](operar-dock-de-landings.md#desplegar-o-actualizar-el-plugin).

1. **Publicar en AXIS.** El cambio se hace en el repo `axis-design-system` y se publica en GitHub Packages con su tag
   (`v0.7.x`). **Un tag que no llegó a publicar no es un paquete** (`v0.7.11` se detuvo antes de publicar y no existe
   como paquete; además, un tag ya tomado obliga a subir de versión, como pasó con `v0.7.2` y la entrega 0.7.8): vendoriza sólo una versión que exista en el registro. Nunca
   vendorices un build local para producción.
2. **Bajar los paquetes publicados.** Ningún repo los tiene instalados, así que se bajan con `npm pack` en una carpeta
   temporal (aquí `tmp/axis-pack/` de `greenhouse-eo`, ignorada por git), con un `.npmrc` de permisos 0600 armado desde
   `gh auth token` y borrado enseguida. La versión de brand assets es la que registra el `VERSION.json` vigente (hoy
   0.4.30):

   ```bash
   mkdir -p tmp/axis-pack && cd tmp/axis-pack
   umask 077
   { printf '@efeoncepro:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken='; gh auth token; } > .npmrc
   npm pack @efeoncepro/axis-ui-primitives@<versión> @efeoncepro/axis-brand-assets@0.4.30
   rm .npmrc
   mkdir primitives brand
   tar -xzf efeoncepro-axis-ui-primitives-<versión>.tgz -C primitives
   tar -xzf efeoncepro-axis-brand-assets-0.4.30.tgz -C brand
   cd -
   ```

   Si `npm pack` no encuentra la versión, no está publicada.
3. **Vendorizar**, en `efeonce-public-site-runtime`:

   ```bash
   node scripts/vendor-axis-site-nav.mjs \
     --primitives <greenhouse-eo>/tmp/axis-pack/primitives/package \
     --brand <greenhouse-eo>/tmp/axis-pack/brand/package \
     --version <versión> \
     --source "published @efeoncepro/axis-ui-primitives@<versión> and @efeoncepro/axis-brand-assets@0.4.30 (GitHub Packages, tag v<versión>)"
   ```

   Copia `site-nav.css`, `site-nav.js` y los SVG de marca a
   `wp-content/themes/ohio-child/assets/vendor/axis/site-nav/<versión>/` y escribe `VERSION.json` con el sha256 de
   cada archivo.
4. **Subir la constante** `EO_SITE_NAV_AXIS` en `wp-content/themes/ohio-child/inc/site-nav.php` y quitar la carpeta
   anterior con `git rm -r` (el tema sólo carga la versión que declara la constante).
5. **Regenerar los datos de paridad** con un checkout de AXIS en ese tag (con sus paquetes compilados):

   ```bash
   node tests/fixtures/site-nav/generate-render-data.mjs <checkout de axis-design-system>
   ```

   Reescribe `wp-content/plugins/eo-site-nav/schema/render-data.json` y `tests/fixtures/site-nav/render-cases.json`.
   Si cambiaron los contratos, regenera también los casos del validador con
   `node tests/fixtures/site-nav/generate-cases.mjs <checkout>/packages/contracts/dist/index.js`. Nunca edites esas
   salidas a mano.
6. **Gates**: `php tests/eo-site-nav-render.test.php` (17 casos) y `php tests/eo-site-nav-validator.test.php` (35
   casos), más `tests/playground/run-eo-site-nav.sh` si cambió el plugin. Si AXIS cambió el HTML del menú, el
   renderizador PHP `EOSN_Render` tiene que seguir idéntico a `siteNavHtml`.
7. **Comitear** en el runtime y **desplegar el tema** (paso 12). Si `render-data.json` del plugin cambió, despliega
   también el plugin. Al final, `{"mode":"on"}` en el interruptor para purgar (mantiene el modo e imprime el anterior).
8. **Verificar en vivo** (paso 14). Borra `tmp/axis-pack/` cuando termines.

### 14. Verificar en vivo

- **Usa un navegador en primer plano.** Un panel de navegador oculto (por ejemplo, el Browser pane de la app de
  escritorio cuando está colapsado) corre la página en segundo plano: no hay cuadros de animación ni eventos de
  scroll, así que el tono de la isla no se actualiza y el bloqueo de scroll del agendador parece trabado. **No es un
  defecto del sitio.** Playwright headless (Chrome) sí sirve.
- **Desplázate de forma instantánea.** En este tema `window.scrollTo(0, y)` es suave y puede no moverse en una espera
  corta. Usa `window.scrollTo({ top: y, behavior: 'instant' })`.
- **Qué revisar**, a 1440 y a 390:
  - `verify` y `verify --path` de la página tocada;
  - el menú pintado y sin el header de Ohio (salvo `/blog/`);
  - abrir Soluciones, Recursos y Nosotros, y el onepage del teléfono;
  - «Estás aquí» en una página de servicio;
  - el tono de la isla: en `/servicios/posicionamiento-seo/` debe verse oscura sobre la banda navy y clara sobre las
    secciones claras, también con el agendador abierto, después de cerrarlo con «Cerrar agenda» y con Escape, y al
    volver a desplazarse;
  - al cerrar el agendador se libera el bloqueo de scroll (`overflow: hidden` en `<html>`);
  - en el dataLayer, `gh_site_nav_opened` al abrir un panel, y `gh_site_nav_clicked` más `greenhouse_cta_clicked` /
    `greenhouse_cta_action_started` con `cta_location: site_nav` al usar el agendador;
  - sin errores en la consola de la página.

## Qué significan los estados y señales

| Señal | Qué significa |
| --- | --- |
| Número de revisión | Cada `apply` o `restore` crea la siguiente. `pull` imprime la que bajaste; `verify`, la que sirve el sitio. |
| `✗` / `!` en `check` | `✗` es error (esquema, entidad HTML, enlace o foto que no responde 200) y bloquea; `!` es aviso (enlace que redirige, título de tarjeta de más de 65 caracteres). La última línea resume errores y avisos. |
| `✗ cut at …: «…»` en `fit` | Ese texto se recorta donde no debe. Acórtalo conservando sus palabras. |
| `· cut at 1280…: «…» — by design below 1440 (Mega1280)` | Descripción de servicio en una línea con puntos suspensivos bajo 1440: es el diseño aprobado. |
| `! cut at …: «…» — fallback title; live posts replace it` | Título fijo de Recursos: en vivo lo reemplazan los posts más recientes. Aviso, no error. |
| `✓ fit: every text that must fit does, at 1440, 1280 and 1200` | Estado sano de `fit`. |
| `Válido. Se guardaría como la revisión N (dry run, nada se guardó).` | El dry run de `apply` pasó. |
| `REST serves revision X, expected Y` en `verify` | El borde todavía sirve la revisión anterior, o alguien publicó otra. Espera y repite; si persiste, haz `pull`. |
| `eosn_conflict` (409) «Alguien guardó mientras editabas; no se pisó nada.» | Otra persona o sesión publicó después de tu `pull`. Nada se perdió. |
| `eosn_storage_altered` (500) «El sitio alteró el documento al guardarlo; revisa los filtros de contenido.» | El documento leído de vuelta no tiene el mismo hash: algún filtro de contenido lo modificó. Es un problema del sitio, no de tu edición. |
| `[eo-site-nav] …` en el log de PHP | El adaptador no pudo pintar el menú y dejó el header de Ohio (plugin inactivo, sin documento o error de render). La página sigue funcionando. |
| `data-ghc-state="empty"` en el lanzador | El CTA del agendador no está disponible (pausado u origen no permitido). El botón lleva a `/agenda/`. |
| `gh_site_nav_opened`, `gh_site_nav_line_viewed`, `gh_site_nav_clicked` en el dataLayer | Medición del menú: panel abierto, línea vista, clic (con `target_type` y `target`; el botón del agendador va como `target_type: cta` con `target` `menu_header`, `menu_mega` o `menu_onepage`). No existe un evento `site_nav_cta` aparte. La configuración en GTM/GA4 está pendiente y publicar el contenedor requiere confirmación humana. |
| `site_nav_switch_set` con `previous` | El interruptor cambió; `previous` es el valor para revertir. |
| `site_nav_theme_installed` con `purge: run set-site-nav-switch.php to purge` | El tema se desplegó con el menú prendido; falta purgar. |

## Qué no hacer

- **No** edites el menú en el espejo `efeoncepro.com.json` ni con `build-efeoncepro-document.mjs`: la fuente de verdad
  es el documento vivo.
- **No** publiques (`photo`, `apply`, `restore`, interruptor, agendador, despliegues, redirecciones) sin el visto bueno
  del operador.
- **No** fuerces un `apply` después de un `eosn_conflict`: vuelve a bajar y rehaz el cambio.
- **No** sobrescribas una foto del bucket ni borres versiones viejas: el comando versiona solo.
- **No** escribas entidades HTML en el texto; escribe el carácter.
- **No** reescribas un título de lectura para que quepa: acórtalo con sus propias palabras.
- **No** «arregles» las descripciones cortadas a 1280: es el diseño aprobado.
- **No** escribas la llave del agendador en ningún comando, archivo versionado, documento o mensaje.
- **No** vendorices un build local de AXIS ni una versión «latest», ni un tag que no publicó.
- **No** estilices el menú desde el tema: el host sólo controla `--axis-site-nav-offset` y `--axis-site-nav-z` y carga
  las fuentes (Bricolage Grotesque y Poppins). Lo demás se cambia en AXIS.
- **No** crees redirecciones fuera de `create-yoast-redirect.php` ni escribas la opción de Yoast a mano.
- **No** concluyas que algo está roto mirando la página en un panel de navegador oculto.

## Problemas comunes

| Problema | Causa y solución |
| --- | --- |
| Publiqué y el sitio sigue mostrando lo anterior | El borde de Kinsta tarda entre 40 segundos y 2 minutos. Espera y repite `verify`. |
| Desplegué el tema y no cambió nada | El despliegue no purga y un PHP existente modificado puede tardar 1–2 minutos por opcache. Corre el interruptor con el modo actual (`{"mode":"on"}`) y espera. |
| El sitio muestra «&#x2122;» u otra entidad literal | Se escribió la entidad en vez del carácter. Corrígelo con `set` escribiendo «™»; `check` lo detecta. |
| `apply` falla con `eosn_storage_altered` | Un filtro de contenido de WordPress alteró el documento al guardarlo. No reintentes a ciegas: revisa qué plugin o filtro nuevo apareció en el sitio. |
| `apply` falla con `eosn_conflict` | Alguien guardó después de tu `pull`. Guarda tu `diff`, corre `pull`, rehaz el cambio sobre la revisión nueva, `check` y vuelve a aplicar. |
| Un título de tarjeta se ve cortado | Pasa de 65 caracteres o `fit` lo marca. Acórtalo conservando sus palabras y repite `check` y `fit`. |
| A 1280 se cortan descripciones de servicio | Es el diseño aprobado (tablero Mega1280, confirmado por la sesión de fidelidad el 2026-10-23). En 1440 deben verse completas. |
| `photo` avisa que la imagen es más chica que el recorte | Se agrandaría y se vería blanda. Busca una fuente de al menos 880×472 (`mm`), 996×1080 (`op`) o 880×496 (`card`). |
| La isla no cambia de tono o el scroll queda bloqueado tras cerrar el agendador | Casi siempre es un navegador oculto o en segundo plano. Repite en primer plano o con Playwright headless (paso 14). |
| `scrollTo` no mueve la página en la prueba | El scroll del tema es suave. Usa `behavior: 'instant'`. |
| Un barrido de muchas páginas recibe respuestas 429 o se corta por tiempo | El sitio limita las peticiones simultáneas. En el barrido del 2026-10-23 los 429 y los cortes desaparecieron con 3 páginas a la vez; baja a esa concurrencia y repite antes de concluir que una página falla. |
| Una página con hero claro arranca con el logo blanco ilegible | Esa página debe estar en `EO_SITE_NAV_LIGHT_HERO_PAGES` del adaptador (hoy 251078, 242261, 223787, 223841, 21460, 19820) para arrancar con la isla clara. Es un cambio del tema (paso 12). |
| `check` marca `«…» answers 000` | El enlace no respondió en 20 segundos. Repite; si persiste, revisa la página. |
| `pull` falla con «Unexpected remote output» | Problema de SSH o WP-CLI. Corre `pnpm public-website:ssh-check`. |
| El empaquetador del tema o del plugin se niega por cambios sin comitear | Comitea en el runtime los archivos de su alcance y vuelve a empaquetar. |
| El despliegue se niega con `Live drift: …` | Alguien cambió ese archivo en vivo por fuera del carril. Revisa la diferencia antes de seguir; nunca la pises sin entenderla. |
| En zsh, después de un bucle, ningún comando funciona (`command not found`) | En zsh la variable `path` está atada a `PATH`. Un `for path in …` deja la terminal sin programas. Usa otro nombre (`for ruta in …`) o abre otra terminal. |

## Referencias técnicas

- Arquitectura: [`docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md`](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md)
  ([edición gobernada](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#edición-gobernada-desde-greenhouse-pnpm-public-websitesite-nav),
  [carriles](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#carriles-de-despliegue-y-operación),
  [rollout y rollback](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#rollout-y-rollback)).
- Documentación funcional: [`docs/documentation/public-site/navegacion-global-del-sitio.md`](../../documentation/public-site/navegacion-global-del-sitio.md)
- Dock de las landings (pieza aparte): [funcional](../../documentation/public-site/dock-de-landings.md) ·
  [manual](operar-dock-de-landings.md).
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
  `scripts/vendor-axis-site-nav.mjs`, `tests/fixtures/site-nav/generate-render-data.mjs` y `generate-cases.mjs`, espejo
  `manifests/site-nav/efeoncepro.com.json`, suite `tests/playground/run-eo-site-nav.sh`.
- AXIS: `@efeoncepro/axis-ui-primitives` (0.7.13 en vivo), `@efeoncepro/axis-ui-contracts` (0.7.12),
  `@efeoncepro/axis-brand-assets` (0.4.30); contrato `efeonce.site-nav`; contrato del host en `PRIMITIVES.md` de AXIS;
  nota de calidad en `docs/quality/site-nav.md` de AXIS.
- Programa: EPIC-055 · TASK-2040 · TASK-2041 · TASK-2042.
