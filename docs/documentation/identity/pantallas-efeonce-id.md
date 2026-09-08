# Pantallas de Efeonce ID (`auth.efeonce.org`)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-09-06 por Claude (TASK-1835)
> **Ultima actualizacion:** 2026-09-06 por Claude (TASK-1835)
> **Modulo:** Identidad y acceso (EPIC-044 · TASK-1835)
> **Documentacion tecnica:** [PATTERNS.md § Runtime sin React — shell «Efeonce ID»](../../architecture/ui-platform/PATTERNS.md), [EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md), [EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md)
> **Manual de uso:** [Revisar y diagnosticar las pantallas de Efeonce ID](../../manual-de-uso/identity/operar-pantallas-efeonce-id.md)
> **Documentacion funcional relacionada:** [Autenticacion de clientes externos](autenticacion-clientes-externos.md) (el *comportamiento* del acceso: metodos, duracion, revocacion) · [Autorizador de Efeonce](autorizador-efeonce.md) (el servicio, sus llaves y su salud)

---

## La idea central

`auth.efeonce.org` es el unico lugar donde alguien de fuera de Efeonce escribe su correo, decide si
autoriza una aplicacion y confirma su identidad. Es la primera pantalla —y a veces la unica— que esa
persona ve de Efeonce.

Este documento describe **lo que se ve y por que se ve asi**. El comportamiento del acceso (que dura
15 minutos, que no hay contraseñas, que pasa si alguien pierde el telefono) vive en
[Autenticacion de clientes externos](autenticacion-clientes-externos.md) y no se repite aca.

Una particularidad que conviene saber de entrada: estas pantallas **no son el portal**. El portal es
Next.js con React y MUI; el autorizador es un servicio pequeño que arma HTML como texto, sin React,
sin framework de interfaz y con una politica de seguridad de contenido muy cerrada. Se ven como
Efeonce porque los colores, la tipografia y el logotipo **se generan desde la misma fuente de verdad
de marca** del portal, no porque se hayan copiado a mano.

## El marco comun

Todas las pantallas comparten el mismo marco:

| Elemento | Que es |
| --- | --- |
| **Encabezado** | El isotipo de Efeonce y el nombre «Efeonce ID». Aparece siempre, en todas las pantallas. |
| **Ficha de la aplicacion** | Solo cuando hay una aplicacion pidiendo acceso. Muestra su nombre y su marca, y un aviso cuando su origen no es comprobable. |
| **Tarjeta** | El contenido de la pantalla: titulo, explicacion y las acciones. |
| **Panel de marca** | Solo en el inicio de sesion y solo en pantallas anchas. Explica que es Efeonce ID y que el acceso es de un solo uso. |

El panel de marca esta escrito **despues** del formulario en el codigo de la pagina, aunque se vea a
un costado: asi el teclado y los lectores de pantalla llegan primero al campo de correo y no al
mensaje institucional.

Ninguna pantalla es un callejon sin salida. Cada una ofrece una accion —normalmente «Pedir un enlace
nuevo» o «Volver al inicio de sesion»— salvo las declaradas terminales con su razon. Antes de
`TASK-1835` habia pantallas que decian «pide uno nuevo desde el inicio de sesion» sin ofrecer como
llegar ahi.

## Las pantallas, una por una

### Entrar (`/login`)

Es la puerta. Ofrece tres caminos, en este orden visual:

1. **Equipo Efeonce** — «Continuar con Microsoft». Solo aparece cuando el recorrido corporativo esta
   disponible; es el acceso del personal interno y delega en Microsoft.
2. **Entrar con mi passkey** — la ceremonia biometrica del dispositivo. No pide correo.
3. **Enlace por correo** — el campo de correo con el boton «Enviarme el enlace».

El boton de passkey **solo aparece si el navegador admite passkeys**. Si el dispositivo no las
admite, el boton no se dibuja y queda el enlace por correo; si la ceremonia falla, el boton se
conserva para reintentar. Los dos mensajes son distintos a proposito: «este dispositivo no admite
passkeys» es del aparato y «no resulto» es del intento, y confundirlos manda a la persona a revisar
lo que no es.

> ⚠️ **Hoy nadie puede crear una passkey.** El servidor tiene el camino para darlas de alta, pero
> **ninguna pantalla lo ofrece**. El boton «Entrar con mi passkey» solo le sirve a quien ya tenga
> una credencial registrada por otra via. En la practica, **toda entrada de una persona nueva sera
> por enlace de correo**. Lo cierra `TASK-1842`, que a su vez esta bloqueada por `TASK-1834`.

Al pie de la tarjeta hay una linea fina: «Te escribimos solo al correo con el que te invitaron». Es
la unica pista sobre a quien le llega el enlace, y es deliberadamente vaga.

### Revisa tu correo (despues de pedir el enlace)

Confirma que, **si ese correo tiene acceso**, el enlace ya salio. La redaccion condicional no es un
descuido de estilo: la respuesta es identica exista o no exista ese correo —el mismo texto, el mismo
codigo y el mismo tiempo—, para que nadie pueda usar la pantalla como directorio de quien tiene
cuenta en Efeonce.

### Demasiados intentos

Aparece cuando alguien pide enlaces en rafaga. Pide esperar unos minutos y ofrece volver al inicio de
sesion.

### Confirma tu acceso (`/m/<token>`)

Es la pagina intermedia del enlace de correo. **Abrirla no consume el enlace**: solo dibuja un boton
«Entrar», y el consumo ocurre al presionarlo.

Existe por una razon concreta: los antivirus de correo y los adelantadores de los clientes de correo
visitan los enlaces por su cuenta. Si abrir el enlace lo consumiera, se quemaria antes de que la
persona lo abriera.

### Activa tu acceso (`/i/<token>`)

Es la pagina intermedia de la invitacion, con la misma logica que la anterior. Al presionar «Activar
mi acceso» **no se abre sesion**: se envia un enlace de acceso al correo con el que se invito. Tener
el token de invitacion no prueba que se controla ese buzon; el enlace por correo es el que lo prueba.
La pantalla siguiente dice exactamente eso: «Activamos tu invitacion. Te enviamos un enlace…».

### Este enlace ya no es valido

Un enlace invalido, vencido o ya usado comparten titulo; solo cambia la linea de ayuda («expiro»,
«ya se uso», «es invalido o ya fue usado»). Distinguir «no existe» de «vencido» le sirve mas a quien
sondea que a quien se equivoco. Siempre ofrece «Pedir un enlace nuevo».

### Tu acceso ya no esta activo

Pantalla terminal: el acceso de esa persona fue retirado. No ofrece reintentar —no habria que
reintentar— y manda a escribirle a la persona de Efeonce que la invito.

### Autorizar acceso (`/oauth/authorize` → consentimiento)

Es la pantalla de la decision, y la mas cargada de informacion a proposito. Antes de que la persona
autorice, la pantalla le dice:

| Lo que muestra | Por que importa |
| --- | --- |
| **Nombre de la aplicacion** y su marca | Que esta pidiendo el acceso. |
| **Aviso «Aplicacion no verificada»** | Cuando el origen de la aplicacion no es comprobable. Dice el hecho —no pudimos comprobar quien la publica— sin acusar a nadie, y va **antes** de la decision. |
| **Destino de la autorizacion** | El *host* al que viajara el codigo de autorizacion. Es un requisito del protocolo: nadie autoriza a ciegas hacia donde se envia. |
| **Organizacion (u organizaciones)** | Para que organizacion se pide el acceso, con un desplegable para ver los permisos vigentes ahi. |
| **Cada permiso, separado en lectura y escritura** | Cada permiso lleva su etiqueta —«Lectura» o «Escritura»—, su descripcion en lenguaje simple y su nombre tecnico. El icono acompaña; la etiqueta de texto es la que porta el significado. |
| **Identificador de la aplicacion** | El `client_id` completo, al pie. |

Los dos botones son «Cancelar» y «Autorizar acceso». Al pie, el recordatorio de que el acceso se
puede revocar en cualquier momento desde Efeonce.

### Verificacion adicional (`/login/step-up`)

**Un permiso de escritura no se concede con la sesion normal.** Si la aplicacion pide cualquier
permiso de escritura, la autorizacion se detiene y pide confirmar la identidad con un segundo factor.

La pantalla ofrece, segun lo que la persona ya tenga configurado:

- **Verificar con mi passkey** — si tiene alguna passkey activa.
- **Codigo de tu aplicacion o codigo de respaldo** — si tiene un segundo factor configurado.
- **Activar mi segundo factor** — si no tiene ninguno.

Esta pantalla **solo puede devolver a la solicitud de autorizacion original** del mismo emisor. No
acepta ningun otro destino de retorno: no es una puerta de entrada de proposito general.

### Alta del segundo factor

Cuando la persona activa su segundo factor, la pantalla muestra **de una sola vez**:

- la clave de configuracion manual,
- el codigo QR para la aplicacion de autenticacion,
- **diez codigos de respaldo**.

Y una casilla obligatoria: «Guarde mis codigos de respaldo». Sin marcarla no se puede confirmar.

El texto es explicito en que esta es la unica vez que se ven. Si la persona cierra la pantalla sin
guardarlos, el camino es volver a activar el segundo factor, no recuperarlos.

### Usaste un codigo de respaldo

Cuando alguien entra con un codigo de respaldo en vez del codigo de la aplicacion, la pantalla
**se detiene** y le dice cuantos le quedan («Te quedan 3 codigos de respaldo», «Te queda 1», o «Era
el ultimo que te quedaba»). Solo continua al presionar «Entendido, continuar».

Frenar es el punto: hasta el 2026-09-06 la pantalla tenia ese dato y navegaba igual, asi que alguien
podia quemar su ultimo codigo y enterarse el dia que perdiera el telefono.

### Listo, ya entraste · Cerraste tu sesion

La primera confirma la sesion y devuelve a la aplicacion que pidio el acceso. Cuando alguien llega
directo a `/auth/session` sin venir de una aplicacion, la misma pantalla explica que la sesion esta
activa y ofrece cerrarla. La segunda confirma el cierre y ofrece volver al inicio de sesion.

`/auth/session` responde en dos formatos segun quien pregunte: una pagina para un navegador, o una
respuesta de datos para un programa. En la respuesta de datos **el identificador de la persona nunca
sale en crudo**: viaja como una huella corta.

### Errores del protocolo

Cuando la solicitud de la aplicacion no se puede completar, la pantalla dice «No pudimos completar la
autorizacion» y una linea segun el caso: aplicacion no reconocida, direccion de retorno no
registrada, cuenta sin organizacion vinculada, o demasiados intentos. Nunca sale detalle tecnico
hacia la persona.

## Por que estas pantallas se hacen distinto

| Regla | Que significa |
| --- | --- |
| **La marca se genera, no se transcribe** | Los colores, la tipografia y los espaciados salen del mismo origen de marca que el portal, por un paso automatico. Nadie escribe un color a mano en estas plantillas. |
| **Una clase, una superficie** | La pantalla tiene dos fondos opuestos (lienzo oscuro y tarjeta clara). Reusar un estilo de texto entre ambos arrastra el color del otro: eso costo un texto casi invisible en el consentimiento. |
| **El contraste se mide sobre pixeles** | El verificador automatico de accesibilidad no sabe leer un fondo con degradado y responde «no pude mirar», que es facil de confundir con «esta bien». Por eso el contraste se mide tomando la captura y mirando los pixeles reales. |
| **El poco JavaScript que hay va con permiso explicito** | La pagina solo ejecuta el codigo que ella misma declara. Si esa declaracion falta, el navegador lo bloquea **en silencio** y el control queda pintado pero muerto. La forma canonica de servir el login obliga a declararlo. |
| **Ninguna pantalla sin salida** | Una prueba automatica recorre pantalla por pantalla y verifica que cada una ofrezca una accion, que su politica de seguridad sea la correcta y que la respuesta al pedir un enlace no revele si el correo existe. |

## Lo que estas pantallas todavia no hacen

| Hueco | Consecuencia practica | Quien lo cierra |
| --- | --- | --- |
| **No hay pantalla para crear una passkey** | Nadie puede registrar su primera credencial. Toda entrada nueva sera por enlace de correo, y el boton de passkey solo sirve a quien ya tenga una. | `TASK-1842` (bloqueada por `TASK-1834`) |
| **No hay pantalla de dispositivos** | La persona no puede ver ni retirar sus credenciales registradas. | `TASK-1842` |

> Detalle tecnico: plantillas en [`src/lib/auth-server/persons/pages.ts`](../../../src/lib/auth-server/persons/pages.ts),
> [`src/lib/auth-server/persons/step-up-page.ts`](../../../src/lib/auth-server/persons/step-up-page.ts) y
> [`src/lib/auth-server/oauth/pages/render.ts`](../../../src/lib/auth-server/oauth/pages/render.ts).
> Todo el texto visible vive en [`src/lib/copy/auth-server.ts`](../../../src/lib/copy/auth-server.ts) y
> [`src/lib/copy/auth-server-step-up.ts`](../../../src/lib/copy/auth-server-step-up.ts), nunca dentro del HTML.
> Revision visual en [`docs/ui/reviews/TASK-1835-efeonce-id-login-consent-screens-review.md`](../../ui/reviews/TASK-1835-efeonce-id-login-consent-screens-review.md).
