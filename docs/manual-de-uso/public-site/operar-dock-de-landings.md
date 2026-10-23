# Operar el dock de las landings

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.3
> **Creado:** 2026-10-23 por Claude
> **Ultima actualizacion:** 2026-10-23 por Claude
> **Documentacion tecnica:** [Navegación global del sitio público §Dock inferior de las landings](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#dock-inferior-de-las-landings-task-2043)
> **Documentacion funcional:** [Dock de las landings](../../documentation/public-site/dock-de-landings.md)

## Para qué sirve

Para encender, revisar y apagar, landing por landing, el dock inferior de vidrio de [efeoncepro.com](https://efeoncepro.com):
la barra fija abajo con el siguiente paso de cada landing (agendar o ir al formulario). El dock es el componente AXIS
`efeonce.landing-dock`; en WordPress lo pinta el plugin `eo-landing-dock`. Encender el dock en una landing retira su
dock antiguo en el mismo momento; apagarlo lo devuelve.

Landings con dock: Redes Sociales (`social`), Influencers (`influencers`), Inicio (`home`), SEO (`seo`), Inbound
(`inbound`), Servicios HubSpot (`hubspot`) y Performance (`performance`). **Las siete están en `on` desde el
2026-10-23** (AXIS primitives 0.7.14 fijado en el plugin).

## Antes de empezar

- Trabaja desde `greenhouse-eo` con el runtime del sitio en `/Users/jreye/Documents/efeonce-public-site-runtime` (o
  `PUBLIC_SITE_RUNTIME_ROOT`).
- Acceso SSH a Kinsta: `pnpm public-website:ssh-check` debe responder bien.
- **`on` y `off` escriben en producción**: necesitan el visto bueno del operador para esa landing.
- El plugin `eo-landing-dock` debe estar desplegado y activo (ver «Desplegar o actualizar el plugin»).
- Cada landing tiene su archivo en `efeonce-public-site-runtime/manifests/landing-dock/<landing>.json`. Un archivo con
  `pending` no se puede encender hasta resolver lo que dice.

## Paso a paso

### 1. Ver el estado

```bash
pnpm public-website:landing-dock status
```

Muestra cada landing, su URL, si el dock está `on` u `off`, el agendador que abre y su presencia.

### 2. Revisar antes de encender (sin escribir nada)

```bash
pnpm public-website:landing-dock preview inbound
```

Abre la landing real en un Chrome local, quita su dock antiguo, inyecta el dock nuevo con el render del plugin y
captura a 1440 y 390 px en el 35 % y el 60 % del scroll. Rechaza el banner de cookies (con `--with-cookies` lo deja).
Revisa `tmp/landing-dock/preview/<fecha>/report.json` y las capturas: el dock debe estar `shown` a mitad de página,
`removed: 1` (dock viejo encontrado) y `start: true` (hero encontrado). Usa `preview all` para las siete.

### 3. Respaldar la página

```bash
pnpm public-website:landing-dock snapshot inbound
```

Guarda el contenido, los datos de Elementor y el meta del dock en `tmp/landing-dock/snapshots/`. `on` exige un
respaldo de la última hora.

### 4. Encender

```bash
pnpm public-website:landing-dock on inbound --confirm
```

Lee la clave del agendador del HTML en vivo (si la landing usa su propio CTA), valida la configuración con el plugin,
la guarda, purga la caché y verifica el HTML servido: un dock nuevo, ninguno viejo y el lanzador con
`cta-location="landing_dock"` si la landing agenda. Si algo no cuadra, el comando falla y dice qué revisar.

Después, abre la landing en un teléfono y en escritorio: el dock aparece tras el hero, cambia de tono con las secciones,
se retira al llegar al formulario y su botón de agendar abre el agendador.

### Marcador de parada

`stop` en el archivo de la landing deja el dock oculto desde ese elemento hasta el final de la página. Se usa cuando el
botón del dock lleva ahí (SEO `#grader`, Performance `#diagnostico`, Influencers `#conversion`): pasado el destino, el
botón mandaría a la persona hacia arriba. Inicio e Inbound no lo usan porque sus docks anteriores reaparecían.

### 5. Verificar en cualquier momento

```bash
pnpm public-website:landing-dock verify inbound
```

### Purgar la caché

```bash
pnpm public-website:landing-dock purge
```

Después de actualizar el plugin, las landings encendidas sirven los archivos nuevos de AXIS sólo cuando la caché de
página se purga. Una URL puede tardar alrededor de un minuto en reflejarlo.

### Rotar la clave de un CTA propio (Inbound, HubSpot, Influencers)

El dock guarda en su meta la clave de la superficie que leyó del HTML en vivo al encenderse; rotar la clave del CTA y
republicar la landing no la actualiza. Después de rotar:

1. `pnpm public-website:landing-dock snapshot <landing>` y `off <landing> --confirm` (vuelve el dock viejo con su
   lanzador, que ya trae la clave nueva).
2. `on <landing> --confirm`: lee la clave nueva de los lanzadores de la página, nunca del lanzador del propio dock.
   En HubSpot el único lanzador era el del dock viejo, por eso hace falta el `off` previo; en Inbound también sirven
   los del hero y el cierre.

### 6. Apagar (vuelta atrás)

```bash
pnpm public-website:landing-dock off inbound --confirm
```

Borra el meta, purga y verifica que el dock antiguo volvió y el nuevo no está.

## Desplegar o actualizar el plugin

1. En el runtime: `php tests/eo-landing-dock.test.php` y `tests/playground/run-eo-landing-dock.sh` en verde.
2. Copia fijada de AXIS desde el paquete publicado (nunca un build local):
   `node scripts/vendor-axis-landing-dock.mjs --primitives node_modules/@efeoncepro/axis-ui-primitives --contracts node_modules/@efeoncepro/axis-ui-contracts --version <versión> --source "@efeoncepro/axis-ui-primitives@<versión>"`,
   y `EOLD_AXIS` en `eo-landing-dock.php` con esa versión. Commit en el runtime.
3. En Greenhouse: `pnpm public-website:export-live-code` (la línea base incluye el plugin y su copia de AXIS) y
   `node scripts/public-website/build-landing-dock-plugin-package.cjs <baseline>` (rechaza una copia local de AXIS).
4. Con visto bueno del operador: `deploy-landing-dock-plugin-package.php` por `pnpm public-website:wpcli` con el ZIP y
   el manifiesto. Sin documentos, ninguna landing cambia. Después, `pnpm public-website:landing-dock purge`.
5. Al publicar AXIS con `pnpm release:packages`, nadie debe commitear en el `main` de AXIS mientras el script espera la
   CI. Desde el 2026-10-23 el script etiqueta el commit cuya CI verificó (antes etiquetaba el HEAD del momento, y el tag
   `v0.7.13` quedó en un commit de otra sesión); si la publicación se detiene, se relanza el workflow.

## Revisar la medición del dock

Cada clic en el dock llega a GA4 como `gh_landing_dock_clicked` (GTM versión 8, desde el 2026-10-23) con cuatro
dimensiones de evento: `target_type` (`cta` abre el agendador, `link` es un enlace), `target` (`primary` o
`secondary`), `target_label` (texto completo del botón) y `target_url` (ruta y ancla). Para saber qué botón funciona
mejor en una landing, filtra por la página y desglosa por `target_label`. Las reuniones agendadas desde el dock se miden
aparte con `cta_location: landing_dock`; el clic nunca es una conversión.

1. Comprobar en vivo: abre la landing en una ventana privada, responde el banner de cookies, haz clic en un botón del
   dock y busca en la consola `dataLayer.filter(e => e.event === 'gh_landing_dock_clicked')`.
2. Ver que el hit salga: en las herramientas de red, la petición `/g/collect` al servidor de tagging con
   `en=gh_landing_dock_clicked` y los cuatro `ep.target*`. Con las cookies rechazadas sale como `gcs=G100` y no se
   reenvía a GA4: es lo esperado.
3. En GA4 Tiempo real, el evento aparece sólo con visitas que aceptaron analítica.
4. Si se cambia un parámetro, regenera el tag con `scripts/gtm/build-landing-dock-events-workspace.ts` (sin `--publish`
   arma y compila el workspace; con `--publish` versiona, publica y actualiza el snapshot) y commitea el snapshot.

## Qué significan los estados

| Estado | Significa |
|---|---|
| `on` | La landing pinta el dock compartido y su dock antiguo no está en el HTML. |
| `off` | La landing muestra su dock antiguo, como antes de TASK-2043. |
| `pending` en el archivo | Falta una decisión; no se puede encender. Ninguna landing lo tiene hoy. |
| `presence: desktop` / `phone` | El dock (o un botón) sólo existe de un lado del corte de 768 px. Influencers deja «Cuéntanos tu campaña» sólo en escritorio. |

## Qué no hacer

- No edites el meta `_eo_landing_dock` a mano ni con `wp post meta`: usa la CLI, que valida y verifica.
- No cambies el copy de un dock en su archivo sin el operador: es el de cada landing.
- No agregues etiquetas cortas (`shortLabel`) sin aprobación: son copy visible.
- No pongas valores de diseño del dock en el plugin, el tema o la landing: se cambian en AXIS.
- No escribas la clave de un agendador en un archivo del repositorio.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `on` falla con «not one shared dock without the legacy one» | Caché de Kinsta sin purgar, o el dock viejo cambió de marcado | Purga (`kinsta cache purge --all`) y `verify`; si el viejo cambió, ajusta `legacy` en el archivo y vuelve a `preview`. |
| «The live page has no <greenhouse-cta> … to take the key from» | La landing perdió o cambió su CTA de reunión | Revisa el widget de la landing o su script de publicación del CTA. |
| El botón de agendar lleva a `/agenda/` | El renderer no respondió en 2,5 s o la superficie no tiene CTA elegible | Revisa el CTA en Growth; el enlace de respaldo funciona igual. |
| El dock no aparece en escritorio | La landing tiene `presence: phone` | Es lo esperado; cambiarlo es decisión del operador. |
| El dock no aparece en un teléfono nuevo | El banner de cookies está abierto y se superpone | Aparece al aceptar o rechazar las cookies. |
| En escritorio, Redes Sociales no muestra el dock a un visitante nuevo | El banner de cookies ocupa la esquina inferior derecha y se superpone con el lugar del dock | Es lo esperado: aparece al responder el banner. |
| En teléfono no se ve el interruptor claro/oscuro de Ohio | El dock lo cubre mientras está visible (el dock viejo de HubSpot lo apartaba) | Es lo esperado: el interruptor vuelve a verse cuando el dock se retira. |
| `on` falla con «no <greenhouse-cta> … outside the dock» | La única fuente de la clave era el dock viejo (HubSpot) | `off` y después `on`. |

## Referencias técnicas

- Arquitectura: [§Dock inferior de las landings](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#dock-inferior-de-las-landings-task-2043).
- Task: [TASK-2043](../../tasks/complete/TASK-2043-landing-dock-glass-primitive.md).
- CLI: `scripts/public-website/landing-dock/cli.ts`; plugin: `efeonce-public-site-runtime/wp-content/plugins/eo-landing-dock/`.
- AXIS: `docs/quality/landing-dock.md`.
