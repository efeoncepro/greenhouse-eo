# Operar `pnpm globe:dev` — el loop local del Producer de Globe

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-03 por Claude (TASK-1635)
> **Ultima actualizacion:** 2026-08-03 por Claude (TASK-1635)
> **Modulo:** Creative Studio — Efeonce Globe (repo hermano `efeonce-globe`, rama `main`)
> **Ruta local:** `http://127.0.0.1:4400/producer`
> **Documentacion relacionada:** [Doc funcional del loop local](../../documentation/creative-studio/globe-loop-desarrollo-local.md) · [`TASK-1635`](../../tasks/in-progress/TASK-1635-globe-local-development-multimodal-harness.md) · [Gates de UI cliente de Globe](../../operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md)

## Para qué sirve

Para ver un cambio de UI del Producer **al guardar el archivo**, en vez de construir una imagen y
desplegar tres runtimes.

`pnpm globe:dev` levanta Vite con recarga en caliente (HMR) y sirve el **mismo shell que producción**
—`renderShell` importado de `dist/`, igual que hace `seam-smoke-server.mjs`— pero con un bundle que
apunta al servidor de desarrollo en vez del compilado. Eso da HMR sobre el árbol React real, no sobre
una maqueta.

Vive en `scripts/globe-dev.mjs` del repo `efeonce-globe`, rama `main`. **No existe en ninguna imagen
desplegada.**

## Antes de empezar

- Trabajas en el checkout de `efeonce-globe` (`~/Documents/efeonce-globe`), no en Greenhouse.
- No necesitas credenciales, secretos ni base de datos: el modo por defecto usa el fixture del
  Producer.
- El guardarraíl `assertDevelopmentEnvironment` corre **antes** de levantar nada. Si el entorno
  heredado apunta a un recurso productivo, el proceso no arranca y el mensaje nombra el control.

## Paso a paso

```bash
cd ~/Documents/efeonce-globe
pnpm globe:dev
```

Abre `http://127.0.0.1:4400/producer`.

Al arrancar, el comando imprime tres líneas: la URL, el recordatorio de HMR y **de dónde salen los
datos**. Cuando corre con fixture lo dice con todas las letras: *son datos de fixture, NO evidencia
de que una ruta genere*.

Para verificar que el HMR está vivo: edita un string de copy en `apps/studio-client/src`, guarda, y
mira la pantalla. El texto nuevo aparece y el viejo desaparece **sin recargar**. Restaurar el archivo
devuelve el original. (Así se verificó de punta a punta.)

Se corta con `Ctrl+C`: el proceso baja el shell, el fixture y todo el árbol de Vite.

### Variables

| Variable | Default | Para qué |
|---|---|---|
| `GLOBE_DEV_PORT` | `4400` | puerto del shell de desarrollo |
| `GLOBE_DEV_VITE_PORT` | `5173` | puerto del dev server de Vite |
| `GLOBE_DEV_FIXTURE_PORT` | `4178` | puerto del fixture del Producer |
| `GLOBE_DEV_WORKSPACE` | `greenhouse-org:efeonce` | workspace que declara la sesión de desarrollo |
| `GLOBE_DEV_API` | *(vacío = fixture)* | apunta el shell a otro backend |
| `GLOBE_DEV_API_AUDIENCE` | valor de `GLOBE_DEV_API` | audiencia del ID token |
| `GLOBE_DEV_CALLER_SA` | `greenhouse-globe-caller@efeonce-globe.iam.gserviceaccount.com` | service account que se impersona |

### De dónde salen los datos

Del **fixture del Producer** (`producer-gvc-fixture.mjs`), que ya existía y se levanta **dentro del
mismo proceso**: un comando, sin autenticación, sin secretos y sin base. Sirve `/v1/session`,
`/v1/capabilities`, `/v1/readers` y `/v1/outputs/*` con una proyección de flota que ejercita los tres
estados honestos.

Un proceso menos que coordinar y que matar.

## Qué NO es — los límites honestos

Esta es la sección importante del manual.

- **Los datos son de fixture.** Un fixture verde **nunca** es evidencia de que una ruta genere. Sirve
  para trabajar la pantalla, no para afirmar que la plataforma produce.
- **No reemplaza a `seam:smoke`.** `seam:smoke` sirve el bundle **compilado** bajo la CSP **real**.
  Los dos coexisten y prueban cosas distintas: `globe:dev` prueba el **ciclo de trabajo**,
  `seam:smoke` prueba el **artefacto**.
- **La CSP del shell de desarrollo es más laxa a propósito.** HMR necesita websocket y módulos
  servidos por Vite, cosas que la política de producción prohíbe. Es aceptable **porque este proceso
  jamás se despliega**: escucha en loopback y no existe en ninguna imagen.
- **El modo con datos reales (`GLOBE_DEV_API` contra la API privada) está DESHABILITADO.** Estaba mal
  orientado: servía una superficie **humana** con un token de **service account**, y eso no es
  equivalente — faltan las miniaturas y la capacidad propia (ver *Problemas comunes*). El carril
  humano correcto exige registrar el dev shell como **cliente OAuth público propio, con PKCE y
  redirect loopback** — el patrón que el repo ya canonizó en `TASK-1629` para el CLI de
  administración. Ese registro lo mueve un humano en el broker de Greenhouse; queda **pendiente**.

## Problemas comunes

### El puerto 4178 está ocupado

**Causa:** sobró un fixture de una corrida anterior. El comando ya lo dice al fallar, con el remedio.

```bash
lsof -ti:4178 | xargs kill
```

O usa otro: `GLOBE_DEV_FIXTURE_PORT=4179 pnpm globe:dev`.

### Pantalla negra con la consola del navegador limpia

**Causa:** falta el preamble de Fast Refresh de `@vitejs/plugin-react`. React monta, el punto de
montaje queda vacío y la página se ve negra.

**El síntoma no dice nada de la causa:** el error real (`can't detect preamble`) sale por la **salida
del dev server**, no por el navegador — justo donde nadie mira cuando lo que falla es la pantalla.

Ya está resuelto en el script (el preamble se inyecta antes del entry). Se documenta porque es la
clase de cosa que reaparece si alguien toca el shell.

### Contenido correcto y cero estilos

**Causa:** en CSP, declarar un nonce hace que el navegador **ignore** `'unsafe-inline'` para esa
directiva — es justamente la regla que vuelve seguros los nonces. Vite inyecta el CSS por JavaScript
en desarrollo, así que con nonce presente esos estilos se bloquean **en silencio**.

Por eso `style-src` va **sin nonce** en este shell, y **sólo acá**. En producción el CSS viaja como
`<link nonce>` del bundle compilado y el nonce es lo que hay que conservar.

### Tarjetas del feed sin imagen y contador de créditos en «—»

*(Sólo aplicaba al modo con datos reales, hoy deshabilitado.)*

**No es CORS ni el bucket.** Los bytes llegan: el logo responde 200 y `/v1/outputs/:sha256` con su
grant devuelve el PNG real completo (7,4 MB, 2048×2048).

Lo que falta es el **derivado**: `globe.media.derivative.*` sale `policy-blocked` para un principal de
workload, y `globe.credits.capacity.self.get` da **403** porque las capabilities `*.self.*` piden un
"yo" que un service account no tiene. Los flags del runtime están en `true`: **es un grant, no
configuración.**

> **Regla que se lleva a cualquier diagnóstico:** antes de culpar al transporte, pide el objeto con su
> grant y **mira los bytes**. Un 200 con cuerpo JSON de error es indistinguible de un 200 con imagen
> hasta ver el `content-type`.

### «Tu sesión expiró»

*(Sólo modo datos reales.)* `GET /v1/session` responde **404** contra la API privada porque ese
endpoint vive en el **BFF**, no en la API. El mensaje acusa a la sesión cuando el problema es que se
le pidió a la API algo que nunca fue suyo.

## Qué no hacer

- **No muevas el shell de desarrollo dentro de `apps/studio-web/src/**`.** Esa entrada monta la CSP
  por nonce y el allowlist derivado del manifest, que son el **perímetro de producción**. Un
  `if (dev)` ahí los vuelve condicionales, y una condición se puede evaluar mal. Hay un gate
  (`development-shell-isolation-gate.mjs`) que **rompe el build** si se intenta.
- **No "arregles" el carril humano proxeando el login del BFF** con reescritura de cookies (quitarles
  `Secure`/`Domain`) ni del `redirect_uri`. Funcionaría, y es **exactamente la mecánica de un secuestro
  de sesión**. Un control del entorno lo bloqueó al escribirlo, con razón: la forma del código es la
  del ataque, y que la intención sea legítima no la cambia. La forma correcta es OAuth público con
  PKCE (`TASK-1629`).
- **No presentes una corrida sobre fixture como evidencia de generación.** No lo es, y el propio
  comando lo dice al arrancar.
- **No reemplaces `seam:smoke` con esto.** La política real sólo se prueba con el bundle compilado.

## Referencias técnicas

- Script: `scripts/globe-dev.mjs` (repo `efeonce-globe`)
- Guardarraíl de entorno: `scripts/globe-dev-guard.mjs` (`assertDevelopmentEnvironment`)
- Gate de aislamiento: `scripts/development-shell-isolation-gate.mjs`
- Fixture: `apps/studio-web/scripts/producer-gvc-fixture.mjs`
- Shell real reutilizado: `apps/studio-web/dist/shell.js` (`renderShell`)
- Task: [`TASK-1635`](../../tasks/in-progress/TASK-1635-globe-local-development-multimodal-harness.md)
- Carril humano canónico: [`TASK-1629`](../../tasks/complete/TASK-1629-globe-admin-cli-pkce.md)
