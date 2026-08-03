# Efeonce Globe — El loop de desarrollo local del Producer

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-03 por Claude (TASK-1635)
> **Ultima actualizacion:** 2026-08-03 por Claude (TASK-1635)
> **Documentacion tecnica:** [`TASK-1635`](../../tasks/in-progress/TASK-1635-globe-local-development-multimodal-harness.md) · [Manual de uso](../../manual-de-uso/creative-studio/operar-globe-dev-local.md) · [Gates de UI cliente de Globe](../../operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md)

## El problema que resuelve

Hasta ahora, **ver** un cambio de pantalla del Producer de Globe costaba construir una imagen y
desplegar tres runtimes. Eso convierte cada ajuste de una palabra, un espacio o un color en una
operación de despliegue.

`pnpm globe:dev` baja ese costo a **guardar el archivo**.

> **Detalle técnico:** `scripts/globe-dev.mjs` en el repo `efeonce-globe` (rama `main`); comando
> `pnpm globe:dev`. Documentado en [`TASK-1635`](../../tasks/in-progress/TASK-1635-globe-local-development-multimodal-harness.md).

## Cómo funciona, en simple

Tres piezas conviven en un solo comando:

1. **El mismo shell que producción.** No es una copia ni una maqueta: es la misma función que arma el
   documento HTML en el servicio desplegado, importada del build. Lo que ves en local es la pantalla
   real, no una aproximación.
2. **Un bundle que apunta al servidor de desarrollo.** En vez del paquete compilado, el shell recibe
   la dirección de Vite. Eso es lo que permite que al guardar un archivo la página reaccione sin
   recargar (recarga en caliente, o *HMR*).
3. **Los datos de un fixture, dentro del mismo proceso.** El Producer necesita responder preguntas
   ("¿quién soy?", "¿qué modelos tengo?", "¿qué piezas hice?"). Ese fixture ya existía para las
   capturas visuales y se reutilizó: da respuestas realistas **sin autenticación, sin secretos y sin
   base de datos**. Por eso alcanza un solo comando.

La pantalla queda en `http://127.0.0.1:4400/producer`, y sólo ahí: el proceso escucha en la máquina
local y no existe en ninguna imagen desplegada.

> **Detalle técnico:** `renderShell` se importa de `apps/studio-web/dist/shell.js`, igual que hace
> `seam-smoke-server.mjs`. El fixture es `apps/studio-web/scripts/producer-gvc-fixture.mjs`, levantado
> en el mismo proceso Node. Puertos configurables por `GLOBE_DEV_PORT`, `GLOBE_DEV_VITE_PORT` y
> `GLOBE_DEV_FIXTURE_PORT`.

## Qué se verificó

- El Producer **renderiza completo y con estilos**.
- La recarga en caliente se probó de punta a punta: se editó un texto visible, el texto nuevo apareció
  y el viejo desapareció **sin recargar la página**; al restaurar el archivo volvió el original.

> **Detalle técnico:** verificación registrada en `TASK-1635`. El comando imprime al arrancar la URL,
> el recordatorio de HMR y el origen de los datos.

## Por qué vive fuera de la aplicación

El modo de desarrollo **no** está dentro del código que se despliega, y esa separación es
estructural, no una preferencia de orden.

La entrada de producción monta dos cosas que son el perímetro de seguridad de la pantalla: la política
de contenido (qué scripts y estilos puede ejecutar el navegador) y la lista cerrada de archivos que el
servidor acepta servir. Un modo de desarrollo necesita **relajar ambas** para funcionar. Si esa
relajación viviera dentro de la aplicación detrás de un "si estamos en desarrollo…", el perímetro de
producción pasaría a depender de una condición — y una condición se puede evaluar mal.

Por eso el modo de desarrollo vive aparte, y una barrera automática **rompe el build** si alguien
intenta acercarlo.

> **Detalle técnico:** `scripts/development-shell-isolation-gate.mjs` prohíbe imports desde
> `apps/studio-web/src/` hacia `scripts/` y ramas por entorno dentro de la entrada productiva. El
> guardarraíl de entorno `scripts/globe-dev-guard.mjs` (`assertDevelopmentEnvironment`) corre antes de
> levantar nada y aborta si el entorno heredado nombra un recurso productivo.

## Lo que este loop NO prueba

Esto es lo que hay que tener claro antes de usar una corrida local como argumento.

| Afirmación | ¿La sostiene `globe:dev`? |
|---|---|
| "La pantalla se ve así" | **Sí** |
| "El cambio de copy quedó" | **Sí** |
| "Esta ruta genera piezas de verdad" | **No** — los datos son de fixture |
| "La política de seguridad real deja pasar el bundle" | **No** — eso lo prueba `seam:smoke` |

**Un fixture verde nunca es evidencia de que una ruta genere.** El propio comando lo dice al arrancar.

Y la política de contenido de este shell es **más laxa a propósito**: la recarga en caliente necesita
un websocket y módulos servidos por el dev server, cosas que la política real prohíbe. Es aceptable
únicamente porque este proceso no se despliega nunca. La política verdadera se sigue probando con
`seam:smoke`, que sirve el bundle compilado bajo ella. **Los dos coexisten y prueban cosas
distintas:** este loop prueba el ciclo de trabajo; `seam:smoke` prueba el artefacto.

> **Detalle técnico:** la CSP de desarrollo admite el origen de Vite y su websocket; `style-src` va
> **sin nonce** porque un nonce declarado hace que el navegador ignore `'unsafe-inline'` y Vite inyecta
> el CSS por JavaScript en desarrollo. En producción el CSS viaja como `<link nonce>` del bundle
> compilado.

## El modo con datos reales, y por qué está apagado

Existía una segunda forma de correr el mismo shell: apuntándolo a la API privada, para trabajar contra
datos reales. **Quedó deshabilitada porque estaba mal orientada.**

El Producer es una superficie **humana**. Servirla con la credencial de una **máquina** (un service
account) no es equivalente: hay cosas que un "yo" tiene y una máquina no. El síntoma medido eran
tarjetas del feed sin imagen y el contador de créditos en «—» — y ninguna de las dos era un problema
de red ni del almacenamiento:

- las **miniaturas** no son el archivo original sino un derivado, y el permiso para pedir derivados no
  está concedido a ese carril;
- el **contador de capacidad propia** responde 403 porque pregunta "cuánta capacidad tengo **yo**", y
  una máquina no tiene un yo.

La pantalla estaba degradando **bien**. El carril era el equivocado.

El camino correcto ya está decidido y es el que el repo canonizó para el CLI de administración: el
shell de desarrollo se registra como **su propio cliente de inicio de sesión**, abre la sesión del
operador con su consentimiento y opera con la autoridad de esa persona. No intercepta la sesión de
nadie. Queda **pendiente** porque exige un registro que mueve un humano en el broker de Greenhouse.

> **Detalle técnico:** capabilities `globe.media.derivative.*` → `policy-blocked` para principal de
> workload; `globe.credits.capacity.self.get` → 403 (las `*.self.*` exigen un sujeto humano);
> `globe.credits.balance.get` → 200. Los flags `GLOBE_MEDIA_DERIVATIVES_ENABLED` y
> `GLOBE_MEDIA_RANGE_GATEWAY_ENABLED` están en `true`: es un grant faltante, no configuración apagada.
> El carril humano exige cliente OAuth público con PKCE y redirect loopback, patrón de
> [`TASK-1629`](../../tasks/complete/TASK-1629-globe-admin-cli-pkce.md).

## Las lecciones de diagnóstico que deja

Tres síntomas de este trabajo valen más allá de él, porque en los tres **el síntoma no dice nada de la
causa**.

1. **Pantalla negra con la consola limpia.** El error real no salía por el navegador sino por la
   salida del servidor de desarrollo — justo donde nadie mira cuando lo que falla es la pantalla.
2. **Contenido correcto y cero estilos.** Una regla de seguridad correcta (un nonce declarado anula
   `'unsafe-inline'`) bloqueando estilos en silencio.
3. **Imágenes que no aparecen.** Invita a acusar al transporte —"CORS", "el bucket"— porque un
   marcador de posición se ve igual que una imagen que no cargó. Los bytes del original **sí**
   llegaban. **Antes de culpar al transporte, pide el objeto con su permiso y mira los bytes:** un 200
   con un cuerpo JSON de error es indistinguible de un 200 con una imagen hasta ver el tipo de
   contenido.

> **Detalle técnico:** (1) preamble de `@vitejs/plugin-react` (`can't detect preamble`), inyectado
> antes del entry en `globe-dev.mjs`; (2) `style-src` sin nonce, comentado en el mismo archivo; (3)
> `/v1/outputs/:sha256` con grant devolvió el PNG real completo (7,4 MB, 2048×2048).

## Frontera con el resto de Globe

- **No sustituye el despliegue.** Un cambio verificado en local sigue necesitando su build, su CI y su
  despliegue por los workflows de Globe antes de existir para alguien más.
- **No sustituye a `seam:smoke`** ni a los canaries de UI cliente.
- **No genera piezas.** Ninguna corrida local reserva crédito ni llama a un proveedor.

> **Detalle técnico:** ver [Gates de UI cliente de
> Globe](../../operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md) y el manual operativo
> [Operar `pnpm globe:dev`](../../manual-de-uso/creative-studio/operar-globe-dev-local.md).
