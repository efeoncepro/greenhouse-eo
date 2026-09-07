# Revisar y diagnosticar las pantallas de Efeonce ID

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-09-06 por Claude (TASK-1835)
> **Ultima actualizacion:** 2026-09-06 por Claude (TASK-1835)
> **Modulo:** Identidad y acceso (EPIC-044 · TASK-1835)
> **Administracion en portal:** ninguna. Estas pantallas viven en `auth.efeonce.org` (servicio Cloud Run `auth-server`), no en el portal, y se revisan con un harness local y dos verificadores de linea de comandos.
> **Documentacion relacionada:** [Pantallas de Efeonce ID](../../documentation/identity/pantallas-efeonce-id.md) (funcional), [Operar el autorizador de Efeonce](operar-autorizador-efeonce.md) (el servicio, sus llaves y flags), [Operar la autenticacion de clientes externos](operar-autenticacion-clientes-externos.md) (invitar, revocar, canary), [PATTERNS.md § Runtime sin React](../../architecture/ui-platform/PATTERNS.md)

## Para que sirve

Este manual te guia para **mirar y verificar** las pantallas de Efeonce ID sin tocar produccion:
levantar el harness local que las dibuja con datos ficticios, recorrerlas una por una, medir el
contraste real y comprobar el carril de passkey en un navegador de verdad.

Lo usas cuando vas a cambiar una de estas pantallas, cuando alguien reporta que algo se ve mal o no
responde, o cuando necesitas revisar un estado que en produccion no se puede provocar a voluntad
(un enlace vencido, un codigo de respaldo gastandose, una aplicacion sin origen comprobable).

**Este manual no cubre** invitar personas, revocar accesos, rotar llaves ni prender flags: eso esta en
los dos manuales relacionados de arriba.

## Antes de empezar

- Todo corre **en local**. El harness escucha en `127.0.0.1:19036` y no se despliega a ningun lado.
- Necesitas las dependencias del repo instaladas (`pnpm install`). Los dos verificadores usan
  Playwright con Chromium; si nunca lo instalaste en esta maquina, corre `pnpm exec playwright install chromium`.
- El harness **no autentica a nadie ni ejecuta ningun comando**. Usa renderizadores reales con datos
  ficticios; no toca la base de datos, ni KMS, ni el servicio en Cloud Run.
- ⚠️ **Hoy ninguna pantalla ofrece crear una passkey.** El servidor tiene el camino
  (`/auth/passkeys/register/*`) pero no hay superficie que lo use: **quien opere esto debe asumir que
  toda entrada de una persona nueva sera por enlace de correo**, y que el boton «Entrar con mi
  passkey» solo le sirve a quien ya tenga una credencial registrada por otra via. Lo cierra
  `TASK-1842`, bloqueada por `TASK-1834`. No lo prometas en una demo ni en un piloto.

## Paso a paso

### 1. Levantar el harness visual

```bash
pnpm auth-server:dev-ui
```

Imprime la direccion y queda escuchando. Abre `http://127.0.0.1:19036/login`.

Dos detalles que conviene conocer para no confundirlos con una falla:

- Solo responde al host `127.0.0.1:19036`. Cualquier otro `Host` recibe `421`, a proposito.
- Solo responde a `GET`, salvo dos rutas internas de datos ficticios que necesita la pantalla del
  segundo factor. Cualquier otro metodo recibe `405`.
- Una ruta que no este en la lista de abajo devuelve `404` con el texto `Visual harness: route unavailable`.

### 2. Recorrer las pantallas

Cada direccion dibuja una pantalla real con datos ficticios:

| Direccion en el harness | Que muestra |
| --- | --- |
| `/login` | Inicio de sesion con los tres caminos (Microsoft, passkey, correo). |
| `/login/external` | El mismo, sin el acceso corporativo: lo que ve alguien de fuera de Efeonce. |
| `/login/invalid-email` | Inicio de sesion con el error de correo mal escrito. |
| `/consent` | Consentimiento con una organizacion y dos permisos (uno de lectura, uno de escritura). |
| `/consent/multiple` | Consentimiento con varias organizaciones. |
| `/step-up` | Verificacion adicional con segundo factor y passkey ya configurados. |
| `/step-up/enroll` | Verificacion adicional sin factores: la pantalla que ofrece activarlo. |
| `/magic-link/confirm` | Pagina intermedia del enlace por correo. |
| `/magic-link/sent` | «Revisa tu correo». |
| `/magic-link/invalid` · `/magic-link/expired` · `/magic-link/used` | Las tres variantes de enlace no valido. |
| `/invitation/confirm` · `/invitation/accepted` | Pagina intermedia de la invitacion y su confirmacion. |
| `/access/revoked` | «Tu acceso ya no esta activo» (pantalla terminal). |
| `/session/started` · `/session/started-direct` · `/session/closed` | Sesion iniciada desde una aplicacion, sesion consultada directo (con boton de cerrar) y sesion cerrada. |
| `/error/missing` · `/error/step-up-required` | Las dos pantallas del protocolo: falta iniciar sesion, falta el segundo factor. |
| `/error/invalid-client` · `/error/invalid-redirect` · `/error/access-denied` · `/error/unavailable` · `/error/slow-down` · `/error/rate-limited` | Los errores del protocolo y el limite de intentos. |
| `/internal-error` | La pantalla de error del recorrido corporativo. |

Para ver el momento irreversible del alta del segundo factor —clave, QR, diez codigos de respaldo y
la casilla obligatoria— entra a `/step-up/enroll` y presiona «Activar mi segundo factor»: el harness
devuelve una carga ficticia fija. Para ver el aviso de codigo de respaldo gastado, envia el
formulario de codigo desde `/step-up`.

### 3. Medir el contraste real

Con el harness corriendo, en otra terminal:

```bash
pnpm auth-server:verify-contrast
```

Toma la captura de cada pantalla en 1440px y en 390px, y muestrea los pixeles alrededor de cada texto
visible. Imprime cuantos textos midio y cuantos quedaron bajo el piso; termina en error si hay
alguno.

**Este es el mecanismo real de contraste de estas pantallas.** El verificador automatico de
accesibilidad del portal responde «no pude determinar el fondo» sobre el lienzo con degradado, y ese
resultado se lee facil como «cero problemas». Debajo de ese cero hubo un texto a 1.53:1.

### 4. Comprobar el carril de passkey

```bash
pnpm auth-server:verify-passkey
```

Recorre en un Chromium real los cuatro desenlaces del boton de passkey: con soporte, sin soporte, sin
JavaScript, y con la ceremonia rechazada. Verifica ademas que el boton vaya antes del campo de correo
y que no haya desplazamiento horizontal en 390px. Imprime `ok` o `FAIL` por comprobacion y un
recuento al final.

## Que significan los estados y las señales

| Lo que ves | Que significa |
| --- | --- |
| `421` en el harness | Entraste por un host que no es `127.0.0.1:19036`. No es una falla del servicio. |
| `405` en el harness | Intentaste un metodo que no es `GET` sobre una ruta de solo lectura. |
| `contraste OK en todas las pantallas` | Ningun texto quedo bajo 4.5:1 (o 3:1 si es texto grande) en ninguna de las dos anchuras. |
| `🔴 1.53:1 (piso 4.5) /consent …` | Un texto concreto no se lee. La linea dice la pantalla, el tamaño, el texto y los dos colores. |
| Boton de passkey ausente en `/login` | Correcto si el navegador no admite passkeys. Si tu navegador si las admite y el boton no aparece, el controlador quedo bloqueado: revisa la consola. |
| Un control pintado que no responde | Casi siempre el permiso del script de esa pagina. El navegador lo bloquea **sin decir nada visible**; el mensaje sale en la consola. |

## Que no hacer

- **No transcribas un color, un tamaño ni una tipografia** dentro de estas plantillas. Todo sale del
  origen de marca por un paso automatico, y hay una prueba que compara el archivo generado contra su
  generador.
- **No reuses un estilo de texto entre el lienzo oscuro y la tarjeta clara.** Es exactamente lo que
  dejo un texto casi invisible en el consentimiento.
- **No escribas texto visible dentro del HTML.** Todo el copy vive en los dos archivos de copy; texto
  suelto en la plantilla crea un segundo juego de palabras para la misma pantalla, y alguien terminara
  editando el que no se ve.
- **No leas un cero del verificador generico de accesibilidad como evidencia de contraste** en estas
  pantallas. Usa `pnpm auth-server:verify-contrast`.
- **No armes a mano la respuesta de una pagina con controlador.** Hay una forma canonica de servirla
  que declara el permiso del script; construirla aparte deja el control muerto y la pagina se ve bien.
- **No dejes una pantalla nueva sin salida.** Cada pantalla ofrece una accion, salvo las declaradas
  terminales con su razon.
- **No uses el harness como evidencia de produccion.** Sus datos son ficticios y no autentica a nadie.
  La verificacion contra el servicio real se hace con los canaries descritos en
  [Operar la autenticacion de clientes externos](operar-autenticacion-clientes-externos.md).

## Problemas comunes

| Sintoma | Causa probable | Que hacer |
| --- | --- | --- |
| El harness no levanta: puerto ocupado | Quedo una instancia anterior corriendo | Cierra la terminal anterior o libera el `19036`. |
| Los verificadores fallan con «browser not found» | Falta el Chromium de Playwright | `pnpm exec playwright install chromium`. |
| Los verificadores fallan al conectar | El harness no esta corriendo | Levanta `pnpm auth-server:dev-ui` en otra terminal antes. |
| Un boton no hace nada en el navegador | El script de esa pagina esta bloqueado por la politica de seguridad de contenido | Mira la consola del navegador; el bloqueo es silencioso en la pantalla. |
| Una persona reporta que su enlace «ya no sirve» | Los enlaces duran 15 minutos y funcionan una sola vez; tambien los queman algunos escaneres de correo | La pantalla ofrece «Pedir un enlace nuevo». Si se repite, revisa la entrega de correo en el manual de clientes externos. |
| Una persona pide autorizar una escritura y queda en la verificacion adicional | Es el comportamiento esperado: los permisos de escritura exigen segundo factor | Si no tiene ninguno configurado, la misma pantalla le ofrece activarlo. |
| Una persona pregunta como crear su passkey | No existe la pantalla todavia | Explicale que entra por enlace de correo. Lo cierra `TASK-1842`. |

## Referencias tecnicas

- Patron del runtime sin React: [`docs/architecture/ui-platform/PATTERNS.md`](../../architecture/ui-platform/PATTERNS.md) § «Runtime sin React — shell Efeonce ID».
- Plantillas: [`src/lib/auth-server/persons/pages.ts`](../../../src/lib/auth-server/persons/pages.ts), [`src/lib/auth-server/persons/step-up-page.ts`](../../../src/lib/auth-server/persons/step-up-page.ts), [`src/lib/auth-server/oauth/pages/render.ts`](../../../src/lib/auth-server/oauth/pages/render.ts).
- Texto visible: [`src/lib/copy/auth-server.ts`](../../../src/lib/copy/auth-server.ts) y [`src/lib/copy/auth-server-step-up.ts`](../../../src/lib/copy/auth-server-step-up.ts).
- Harness y verificadores: [`scripts/auth-server/dev-ui-server.ts`](../../../scripts/auth-server/dev-ui-server.ts), [`scripts/auth-server/verify-contrast.mjs`](../../../scripts/auth-server/verify-contrast.mjs), [`scripts/auth-server/verify-passkey-lane.mjs`](../../../scripts/auth-server/verify-passkey-lane.mjs).
- Revision visual: [`docs/ui/reviews/TASK-1835-efeonce-id-login-consent-screens-review.md`](../../ui/reviews/TASK-1835-efeonce-id-login-consent-screens-review.md).
