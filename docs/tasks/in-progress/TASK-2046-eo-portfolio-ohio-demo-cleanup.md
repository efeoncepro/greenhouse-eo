# TASK-2046 — EO Portfolio: limpieza de los demos de Ohio en el portafolio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-056`
- Status real: `Slice 2 aplicado en producción el 2026-10-29 con OK del operador: 44 demos en borrador, 44 redirects 410 de Yoast y comentarios cerrados en las 59; 35 demos ya responden 410, 15 reales 200 y el sitemap lista sólo las 15. Los otros 9 demos los redirige WordPress por _wp_old_slug (8, terminan en 404) o por la adivinanza de 404 (lifestyle-app → Eusari). Slice 3 escrito y en dryRun limpio (15 documentos Elementor 100 % demo a vaciar, 3 enlaces Envato, 71 filas _wp_old_slug en 8 slugs demo); falta el OK para aplicarlo`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop para docs y scripts; la operación corre sobre efeonce-public-site-runtime por el carril SSH gobernado (pnpm public-website:wpcli); sin worktrees`

## Summary

Despublica las 44 entradas demo del tema Ohio que hoy viven publicadas e indexadas en el portafolio de
`efeoncepro.com`, hace que sus URLs respondan 410 y las saca del sitemap. En las 15 entradas reales quita el enlace de
afiliado de Envato y los bloques del demo en inglés, y cierra comentarios. Remedia `ISSUE-183` sin esperar el
portafolio nuevo.

## Why This Task Exists

La importación del demo de Ohio nunca se limpió. El tipo `ohio_portfolio` tiene 59 entradas publicadas y sólo 15 son
de Efeonce; las otras 44 muestran «Envato» como cliente, enlazan a un afiliado de terceros y están en
`ohio_portfolio-sitemap.xml`. Cualquier proyecto real lleva a ellas por «Next Project». Las entradas reales, además,
heredaron el bloque «Got a project? Get a Quote» que enlaza a `ohio.clbthemes.com`. Es un problema de marca y SEO que
se arregla en horas, mientras el reemplazo completo (`TASK-2047`…`TASK-2049`) toma semanas.

## Goal

- Ninguna entrada demo de Ohio queda publicada, en el sitemap ni alcanzable desde un proyecto real.
- Las URLs demo responden 410, que le dice a Google que ese contenido no vuelve.
- Las 15 entradas reales siguen publicadas, sin enlaces de afiliado, sin bloques del demo y con comentarios cerrados.
- Todo cambio es reversible desde una foto previa por ID de post.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md` §6 (qué pasa con Ohio)
- `docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md` §4.3 (casos con compuerta de cliente)
- `docs/public-site/LA_ORBITA_SITE_MIGRATION_PLAN_V1.md` §1 (confirmar en Search Console antes de cambiar una URL) y
  §Oleada 5
- `.claude/skills/efeonce-public-site-wordpress/references/taxonomy-permalink-migrations.md` §5 (Yoast Premium como
  único dueño de los redirects) y §Snapshot and rollback
- `.claude/skills/efeonce-public-site-wordpress/references/elementor-mutation.md` (editar datos de Elementor sin romper
  la página)
- `.claude/skills/efeonce-public-site-wordpress/references/runtime-and-discovery.md` (carril SSH, purga de caché)

Reglas obligatorias:

- **Allowlist por ID de post, nunca por título ni por slug parecido.** Existe un demo `lifestyle-app` y una entrada real
  `lifestyle-app-elementor` (Eusari): un filtro por texto se lleva la real.
- **Despublicar, nunca borrar.** Las demos pasan a borrador; los adjuntos y términos no se tocan.
- **Yoast Premium es el único dueño de los redirects.** El 410 se crea con su API (`WPSEO_Redirect_Manager`), nunca
  escribiendo su opción a mano ni restaurándola entera.
- Toda escritura corre primero en `dryRun`, con foto previa, y aborta si el estado leído no coincide con la foto.

## Normative Docs

- `docs/issues/open/ISSUE-183-portfolio-ohio-demo-entries-indexed.md`
- `scripts/public-website/create-yoast-redirect.php` (precedente de redirect gobernado por Yoast)

## Dependencies & Impact

### Depends on

- Acceso SSH vigente al runtime (`pnpm public-website:ssh-check`).
- Yoast SEO Premium activo con `WPSEO_Redirect_Manager` disponible [verificar en el discovery].
- Acceso de lectura a Search Console de `efeoncepro.com` para revisar tráfico y enlaces de las URLs demo.

### Blocks / Impacts

- Resuelve `ISSUE-183`.
- `TASK-2049` parte de este estado: hereda sólo las 15 entradas reales, ya limpias, y crea sus 301.
- `TASK-2047` y `TASK-2048` no dependen de esta task.

### Files owned

- `scripts/public-website/eo-portfolio/inventory-ohio-portfolio.php` (nuevo)
- `scripts/public-website/eo-portfolio/retire-ohio-demos.php` (nuevo)
- `scripts/public-website/eo-portfolio/clean-ohio-real-entries.php` (nuevo)
- `scripts/public-website/eo-portfolio/README.md` (nuevo)
- `scripts/public-website/eo-portfolio/gsc-project-urls.ts` (nuevo, lectura de Search Console)
- `scripts/public-website/eo-portfolio/allowlist-2026-10-23.json` (nuevo)
- `scripts/public-website/eo-portfolio/snapshots/ohio-portfolio-2026-10-23.json.gz` (nuevo)
- `scripts/public-website/eo-portfolio/evidence/gsc-project-urls-2026-10-23.json` (nuevo)
- `scripts/public-website/eo-portfolio/evidence/retire-ohio-demos-dryrun-2026-10-23.json` (nuevo)
- `scripts/public-website/eo-portfolio/evidence/http-baseline-2026-10-23.csv` (nuevo)
- `docs/issues/open/ISSUE-183-portfolio-ohio-demo-entries-indexed.md`

## Current Repo State

### Already exists

- Auditoría del 2026-10-23: 59 entradas, 15 reales y 44 demo, con slugs, enlaces y medios (resumen en `ISSUE-183`).
- `scripts/public-website/create-yoast-redirect.php`: 301 gobernado por Yoast con relectura y rollback.
- Carril SSH gobernado: `pnpm public-website:ssh-check`, `pnpm public-website:wpcli -- --eval-file … --input-file …`.
- `wp-content/mu-plugins/efeonce-redirect-query-passthrough.php` en el runtime: hace que los redirects de Yoast
  respondan también con query; no guarda reglas propias.

### Gap

- No existe inventario versionado de qué entradas `ohio_portfolio` son reales.
- No existe un script de 410 por lote (el precedente sólo crea 301 de a uno).
- Las 15 entradas reales conservan enlaces de afiliado y bloques del demo.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `greenhouse-eo/scripts/public-website/eo-portfolio/` (scripts PHP que corren por `wp eval-file` en el WordPress de Kinsta)
- Future candidate home: `public`
- Boundary: scripts de operación de una sola vez sobre `ohio_portfolio` y la API de redirects de Yoast; ningún otro consumidor
- Server/browser split: los scripts corren en el servidor de WordPress por WP-CLI; nada llega al navegador
- Build impact: `none` — scripts sueltos, sin dependencias nuevas
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` — escribe en producción, pero cada cambio es un cambio de estado reversible
  (publicado → borrador, comentarios abiertos → cerrados, un bloque de contenido guardado en la foto previa) sobre
  contenido de marketing. No toca identidad, dinero, datos personales ni borra nada; por eso no se justifica
  `backend-critical`. La evidencia en vivo sigue siendo obligatoria.
- Impacto principal: `integration`
- Source of truth afectado: posts `ohio_portfolio` en WordPress, metadatos de Ohio/Elementor de las 15 entradas reales,
  opción de redirects de Yoast Premium
- Consumidores afectados: visitantes de `/project/*` y `/portfolio-category/*`, buscadores (sitemap), portada
  `/portafolio/` (que hoy muestra 5 entradas reales)
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: API de Yoast Premium (`WPSEO_Redirect_Manager`, `WPSEO_Redirect`); API de posts de
  WordPress (`wp_update_post`, `update_post_meta`); datos de Elementor (`_elementor_data`)
- Contrato nuevo o modificado: tres scripts de `wp eval-file` con entrada JSON y salida JSON (`inventory`, `retire`,
  `clean`), cada uno con `dryRun`
- Backward compatibility: `compatible` — las 15 entradas reales conservan URL y contenido propio
- Full API parity: no introduce capability de negocio; es una operación única de limpieza por el carril gobernado

### Data model and invariants

- Entidades/tablas/views afectadas: `wp_posts` (estado y comentarios de 59 posts `ohio_portfolio`), `wp_postmeta` de
  las 15 reales (enlace «Open Project» de Ohio y `_elementor_data`), opción de redirects de Yoast
- Invariantes que no se pueden romper:
  - Ninguna de las 15 entradas reales cambia de estado ni de URL.
  - Ningún post, adjunto o término se borra.
  - Cada post tocado está en la allowlist por ID resuelta en el Slice 1 y su estado leído coincide con la foto.
  - Ningún 410 se crea sobre una ruta que ya tiene un redirect.
- Write-target allowlist: `N/A` — no hay boundary test de dominio en el runtime; la allowlist es la lista de IDs del
  Slice 1, versionada en el input de cada script
- Tenant/space boundary: sitio único `efeoncepro.com`
- Idempotency/concurrency: correr dos veces deja el mismo resultado (post ya en borrador se salta; redirect ya creado se
  reporta y no se duplica); el script aborta si el `post_modified` leído difiere de la foto (otra sesión lo editó)
- Audit/outbox/history: la foto previa (JSON con estado, comentarios y metadatos por ID) queda en el scratchpad y en la
  task; revisiones de WordPress para el contenido de Elementor

### Migration, backfill and rollout

- Migration posture: `none` en esquema; mutación de contenido acotada
- Default state: `dryRun: true` en los tres scripts
- Backfill plan: no aplica; lote único de 44 + 15 posts
- Rollback path: restaurar estado, comentarios y metadatos desde la foto previa por ID; borrar sólo los redirects 410
  creados por esta task (lista en la salida del script)
- External coordination: purga de caché de Kinsta tras cada slice; revisión de Search Console antes del Slice 2

### Security and access

- Auth/access gate: SSH al runtime + `--wp-user 12` por el carril gobernado
- Sensitive data posture: sin datos sensibles
- Error contract: el script termina con `WP_CLI::error` y no escribe nada si la allowlist, la foto o Yoast no cuadran
- Abuse/rate-limit posture: no aplica; operación interna única

### Runtime evidence

- Local checks: `php -l` de los tres scripts
- DB/runtime checks: salida JSON de `inventory` y de cada `dryRun`; relectura del estado tras aplicar
- Integration checks: `curl -sI` de cada URL demo (410) y de las 15 reales (200); sitemap sin slugs demo
- Reliability signals/logs: no aplica (contenido); errores en el log de PHP de Kinsta
- Production verification sequence: ver §Production verification sequence

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: no aplica, la task no crea tablas.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Delta 2026-10-23 — Slice 2 en dryRun

- `retire-ohio-demos.php` escrito y corrido en producción con `dryRun: true` (sólo lectura). La allowlist calza con las 59
  entradas, ningún post cambió desde la foto y ningún origen demo tiene redirect previo. Plan: 44 redirects 410, 44
  demos a borrador y comentarios cerrados en las 59 (pings ya cerrados). Evidencia:
  `evidence/retire-ohio-demos-dryrun-2026-10-23.json`.
- Línea base HTTP: 59 URLs `/project/<slug>/` en 200 y sitemap con 59 URLs (`evidence/http-baseline-2026-10-23.csv`).
- Para aplicar falta la revisión de enlaces externos en Search Console (la hace el operador) y su OK.

## Delta 2026-10-23 — Slice 1 (inventario, foto previa y Search Console)

- **Inventario y foto:** `inventory-ohio-portfolio.php` corrió en producción por WP-CLI (`--wp-user 12`) a las 22:46 UTC,
  sólo lectura. 59 entradas, todas `publish` y con comentarios abiertos. Foto completa para rollback en
  `scripts/public-website/eo-portfolio/snapshots/ohio-portfolio-2026-10-23.json.gz` (sha256 del JSON
  `42fc18f89688dc155d6b04d71be8fe1ccddb8be7a8f91c872562c6997609745f`).
- **Allowlist por ID:** `allowlist-2026-10-23.json`, 15 reales y 44 demo; criterio y lista en
  `scripts/public-website/eo-portfolio/README.md`.
- **Yoast:** Premium 27.7 con `WPSEO_Redirect_Manager` y tipo 410 disponibles. El Slice 2 usa la API de Yoast.
- **Redirects existentes:** 12 redirects 301 bajo `/project/` desde slugs viejos de demos hacia entradas reales; ninguno
  sale de un slug demo actual, así que no chocan con los 410. No se tocan; los reencadena `TASK-2049`.
- **Metadatos duplicados:** 12 de las 15 entradas reales tienen el set de Ohio y `_elementor_data` en dos filas (tres en
  `ssilva-campaign`). El Slice 3 debe limpiar el bloque del demo en todas las filas y comparar cada una con la foto.
- **Search Console por API** (2025-06-23 a 2026-10-23): las 44 URLs demo suman 0 clics y 81 impresiones; el 410 no
  pierde tráfico. Las 15 reales suman 18 clics y 2.431 impresiones (dato para los 301 de `TASK-2049`). Evidencia en
  `evidence/gsc-project-urls-2026-10-23.json`. **Pendiente antes del Slice 2:** revisar en la interfaz de Search
  Console si alguna URL demo tiene enlaces externos (la API no los expone).
- **Hallazgo fuera de alcance:** `cms.efeoncepro.com` aparece indexado con URLs `/project/`; es un segundo host del
  mismo WordPress. Registrado en ISSUE-183 para revisión aparte.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Inventario, Search Console y foto previa

- `inventory-ohio-portfolio.php`: lista las 59 entradas `ohio_portfolio` con ID, slug, estado, fecha, comentarios,
  categorías, enlace «Open Project» y huellas del demo (`1.envato.market`, `ohio.clbthemes.com`,
  `colabrio.ams3.cdn.digitaloceanspaces.com`, cliente «Envato»). Sólo lee.
- Allowlist versionada en `scripts/public-website/eo-portfolio/README.md`: 15 IDs reales y 44 IDs demo, con el criterio
  que clasificó cada una. Las 15 reales esperadas: `bresler`, `marca-chile`, `gobierno-de-santiago`,
  `social-media-nutribait`, `fivest-branding`, `lifestyle-app-elementor` (Eusari), `sky-airlines-propuesta`,
  `flick-identity`, `pabellotogo-design`, `motogas-social-media`, `dmark-social-media`, `ghamadent-design`,
  `ssilva-campaign`, `beebot-social-media`, `bighouse-design`.
- Search Console: clics, impresiones y enlaces externos de las 44 URLs demo en los últimos 16 meses. Si alguna tiene
  tráfico o enlaces relevantes, se anota y se decide con el operador antes del Slice 2.
- Foto previa en JSON (estado, `comment_status`, metadatos de Ohio y `_elementor_data`) de las 59 entradas.

### Slice 2 — Retirar las 44 demos

- `retire-ohio-demos.php` con `dryRun`:
  - pasa a borrador cada ID demo de la allowlist (`wp_update_post`), sin borrar;
  - crea un redirect **410** por cada `/project/<slug>/` demo con la API de Yoast Premium, rechazando rutas que ya
    redirigen [verificar en el discovery que la versión instalada de Yoast acepta el tipo 410 por API];
  - cierra comentarios y pings en los 59 posts `ohio_portfolio`.
- Aplicar, purgar la caché de Kinsta y verificar que el sitemap ya no lista slugs demo.
- Si Yoast no acepta 410 por API, el plan alternativo es una regla en un mu-plugin del runtime que responda 410 para
  la lista exacta de slugs; se decide en el discovery y se documenta [verificar].

### Slice 3 — Limpiar las 15 entradas reales

- `clean-ohio-real-entries.php` con `dryRun`:
  - quita el enlace «Open Project» de Bresler, Flick y Ghamadent (hoy al afiliado de Envato);
  - quita el bloque del demo en inglés («Let's Collaborate / Got a project? / Get a Quote» y el texto sobre fin-tech)
    del contenido de Elementor de las 15 entradas;
  - quita de Beebot y Big House el caso de estudio demo completo con imágenes de Colabrio, dejando su galería propia.
- Aplicar, purgar caché y verificar en HTML que no queda ninguna huella del demo.

## Out of Scope

- El plugin nuevo, la portada, la entrada y la migración (`TASK-2047`, `TASK-2048`, `TASK-2049`).
- 301 de las entradas reales hacia `/portafolio/<slug>/` (es de `TASK-2049`).
- Desactivar el plugin Ohio Portfolio o borrar la taxonomía `ohio_portfolio_category`.
- Corregir fechas, textos, `alt` o categorías de las entradas reales; se rehacen en la migración.
- Rediseñar `/portafolio/`.

## Detailed Spec

Entrada de cada script (JSON por `--input-file`):

```json
{
  "dryRun": true,
  "expectedIds": { "real": [/* 15 IDs */], "demo": [/* 44 IDs */] },
  "snapshot": "inventory-2026-10-XX.json"
}
```

- Cada script relee el inventario actual, compara `post_modified` y estado con la foto y aborta ante cualquier
  diferencia.
- La salida lista lo que haría (`dryRun`) o lo que hizo, con IDs, rutas y redirects creados, para usarla como evidencia
  y rollback.
- Corren con: `pnpm public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/<script>.php --input-file <json> --wp-user 12`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. Slice 2 y 3 no corren sin la allowlist y la foto del Slice 1.
- La revisión de Search Console (Slice 1) cierra antes del Slice 2.
- Slice 3 puede correr antes que el 2 si el operador lo prioriza; ambos dependen sólo del Slice 1.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se despublica una entrada real (p. ej. Eusari por el slug `lifestyle-app`) | WordPress / contenido | medium | Allowlist por ID, `dryRun` revisado, relectura de las 15 reales tras aplicar | `curl -sI` de las 15 reales distinto de 200 |
| Se pierde contenido propio al quitar el bloque del demo | Elementor | low | Foto previa de `_elementor_data`, cambio acotado al bloque identificado, revisión de WordPress | HTML de la entrada sin su galería |
| Una URL demo con enlaces externos cae a 410 | SEO | low | Revisión de Search Console en el Slice 1 | Search Console: caída de clics en `/project/*` |
| El 410 pisa un redirect existente | Yoast | low | El script rechaza rutas que ya redirigen | salida del script con `already_redirects` |
| La caché sirve la versión vieja | Kinsta | medium | Purga tras cada slice y verificación con query de bypass | HTML con huellas del demo tras la purga |

### Feature flags / cutover

- Sin flag: operación de contenido única. El `dryRun` es el control previo; el cutover es la aplicación de cada slice.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | No escribe | — | sí |
| Slice 2 | Volver a `publish` los IDs demo desde la foto; borrar sólo los redirects 410 listados en la salida con `WPSEO_Redirect_Manager::delete_redirects`; reabrir comentarios desde la foto | < 15 min | sí |
| Slice 3 | Restaurar `_elementor_data` y el enlace de Ohio desde la foto previa (o la revisión de WordPress) por ID | < 15 min | sí |

### Production verification sequence

1. `pnpm public-website:ssh-check`.
2. Slice 1: correr el inventario y guardar la foto; revisar Search Console.
3. Slice 2 en `dryRun`; revisar la lista de IDs y rutas con el operador; aplicar; purgar; `curl -sI` de las 44 URLs
   (410) y de las 15 reales (200); sitemap sin slugs demo.
4. Slice 3 en `dryRun`; aplicar; purgar; `curl -s` de las 15 reales sin `1.envato.market`, `ohio.clbthemes.com` ni
   `colabrio.ams3.cdn.digitaloceanspaces.com`.
5. Revisión visual rápida de Bresler, Beebot y Big House en escritorio y 390.

### Out-of-band coordination required

- Acceso a Search Console de `efeoncepro.com`.
- Aviso a quien esté publicando en el sitio ese día (otras sesiones de EPIC-047/055) para no cruzar purgas de caché.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] La allowlist versionada tiene exactamente 15 IDs reales y 44 IDs demo, y suma las 59 entradas del inventario. (`allowlist-2026-10-23.json`, 2026-10-23)
- [x] Las 44 entradas demo están en borrador y ninguna fue borrada. (readback del script y foto `ohio-portfolio-2026-10-29.json.gz`, 2026-10-29)
- [ ] `curl -sI` de cada `/project/<slug>/` demo responde `410`. (Parcial 2026-10-29: 35 de 44; 8 los redirige `_wp_old_slug`, que limpia el Slice 3, y `lifestyle-app` cae en la adivinanza de 404 de WordPress hacia la entrada real de Eusari. La verificación va sin query string: Yoast compara la URL completa y `?nc=` no calza.)
- [x] `https://efeoncepro.com/ohio_portfolio-sitemap.xml` no lista ningún slug demo. (15 URLs, todas reales, 2026-10-29)
- [ ] Las 15 entradas reales responden `200` y su HTML no contiene `1.envato.market`, `ohio.clbthemes.com` ni
      `colabrio.ams3.cdn.digitaloceanspaces.com`.
- [x] Los 59 posts `ohio_portfolio` tienen comentarios y pings cerrados. (foto `ohio-portfolio-2026-10-29.json.gz`, 2026-10-29)
- [ ] La foto previa y la salida de cada script quedaron enlazadas en la task.
- [ ] La revisión de Search Console de las URLs demo quedó registrada antes del Slice 2. (Parcial: clics e impresiones por API registrados; los enlaces externos sólo se ven en la interfaz y siguen pendientes.)

## Verification

- `php -l scripts/public-website/eo-portfolio/*.php`
- `pnpm public-website:ssh-check`
- `curl -sI https://efeoncepro.com/project/<slug-demo>/` por cada demo (esperado `410`)
- `curl -s https://efeoncepro.com/project/<slug-real>/ | grep -c "1.envato.market\|ohio.clbthemes.com"` (esperado `0`)
- `curl -s https://efeoncepro.com/ohio_portfolio-sitemap.xml`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `ISSUE-183` movido a `docs/issues/resolved/` con fecha y verificación, y `docs/issues/README.md` actualizado
- [ ] `TASK-2049` recibió un `## Delta` con la lista final de las 15 entradas reales y sus IDs

## Follow-ups

- `TASK-2049` crea los 301 de las entradas reales y desactiva Ohio Portfolio.
- Si Search Console muestra enlaces externos relevantes a alguna URL demo, evaluar un 301 a `/portafolio/` en vez de 410.

## Open Questions

- ~~¿La versión instalada de Yoast Premium acepta redirects 410 por API, o hace falta la regla en un mu-plugin?~~ Resuelta el 2026-10-23: Yoast SEO Premium 27.7 acepta 410 (`WPSEO_Redirect_Types`); no hace falta el mu-plugin.
- ¿Las categorías de `ohio_portfolio_category` que quedan vacías se marcan `noindex` ahora o esperan a `TASK-2049`?
