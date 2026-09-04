# Autenticacion de personas de clientes en el autorizador de Efeonce

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-09-04 por Claude (sesión greenhouse-eo-18)
> **Ultima actualizacion:** 2026-09-04 por Claude (sesión greenhouse-eo-18)
> **Modulo:** Identidad y acceso (EPIC-044 · TASK-1830)
> **Documentacion tecnica:** [EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md) (ADR del emisor propio), [TASK-1830](../../tasks/in-progress/TASK-1830-efeonce-auth-external-person-authentication.md) (alcance e invariantes), [Autorizador de Efeonce](autorizador-efeonce.md) (el servicio que la aloja), [Binding de Identidad Externa para el MCP](binding-identidad-externa-mcp.md) (quién puede ser invitado)
> **Manual de uso:** [Operar la autenticacion de clientes externos](../../manual-de-uso/identity/operar-autenticacion-clientes-externos.md)
> **Runbook operativo:** [`docs/operations/runbooks/auth-server.md`](../../operations/runbooks/auth-server.md)

---

## La idea central

Este documento explica **cómo demuestra quién es una persona de un cliente** cuando entra al autorizador propio
de Efeonce, `auth.efeonce.org`. Es la ventanilla de personas de esa "oficina de pases": antes existía el
servicio y las reglas para las aplicaciones, pero nadie podía identificarse. Ahora sí.

Hay una decisión que gobierna todo lo demás: **no hay contraseñas, y nunca las habrá.** No se piden, no se
guardan, no se recuperan. La persona demuestra quién es con algo que ya tiene: el desbloqueo de su propio
dispositivo (huella, cara o PIN) o el control de su buzón de correo.

**Esto no cambia el login del portal Greenhouse.** Quien entra a `greenhouse.efeoncepro.com` sigue entrando
igual que siempre, con la cuenta Microsoft de Efeonce. Son dos puertas distintas, con sesiones distintas,
que no comparten nada.

> Detalle técnico: dominio completo en [`src/lib/auth-server/persons/`](../../../src/lib/auth-server/persons/);
> decisión en el [ADR del autorizador nativo](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md).

## Los tres métodos, y para qué sirve cada uno

| Método | Qué es, en simple | Para qué sirve |
| --- | --- | --- |
| **Passkey** | El desbloqueo del propio dispositivo: huella, cara o PIN. La llave vive en el teléfono o el computador de la persona y nunca viaja. | **Método principal para entrar.** Es lo que se busca que use todo el mundo a diario. |
| **Enlace por correo** ("magic link") | Un enlace de un solo uso que llega al buzón de la persona. | **Alternativa para entrar**, y el camino obligatorio la primera vez, antes de que exista alguna passkey. |
| **TOTP** (app de códigos) | Los códigos de seis dígitos que rotan cada 30 segundos en una app como Google Authenticator o 1Password. | **Sólo como segundo factor** para autorizar permisos de **escritura**. Nunca sirve para entrar. |

La distinción del TOTP importa: entrar y **autorizar que una aplicación escriba en nombre tuyo** son dos cosas
distintas. Para lo primero basta la passkey o el correo. Para lo segundo hay que confirmar, además, con el
código de la app.

> Detalle técnico: [`passkeys.ts`](../../../src/lib/auth-server/persons/passkeys.ts),
> [`magic-link.ts`](../../../src/lib/auth-server/persons/magic-link.ts) y
> [`totp.ts`](../../../src/lib/auth-server/persons/totp.ts).

## Cómo entra alguien por primera vez

La primera entrada nunca la inicia la persona: **la inicia un operador de Efeonce**. Nadie se registra solo.

| Paso | Quién lo hace | Qué pasa |
| --- | --- | --- |
| 1. Se emite la invitación | Operador de Efeonce, desde el Admin Center (capability `identity.external_invitation.issue`) | Se genera un enlace de invitación. El operador declara **el correo de esa persona** al emitirla. |
| 2. Se entrega el enlace | Operador | Por el canal que prefiera: correo, mensaje, la conversación que ya tenga con el cliente. |
| 3. La persona abre `/i/<token>` y confirma | La persona | Acepta la invitación. Queda ligada a su organización cliente. |
| 4. El sistema le manda un enlace de acceso | Automático | Al **correo que declaró el operador**, no al que la persona escriba en pantalla. |
| 5. La persona abre ese enlace y confirma | La persona | Recién ahí queda con sesión abierta. |

**Aceptar la invitación no abre sesión por sí solo.** Parece un paso de más, pero es deliberado: tener el
enlace de invitación sólo prueba que alguien te lo pasó, no que controlas el buzón de correo de esa persona.
Si el enlace se filtra o se reenvía por error, quien lo abra no entra: el acceso viaja al buzón declarado por
el operador y sólo quien lo controla puede terminar de entrar.

Por la misma razón el correo de destino lo fija el operador. Si la persona pudiera escribirlo, la invitación
serviría para llevarse el acceso a cualquier buzón.

> Detalle técnico: [`invitations.ts`](../../../src/lib/auth-server/persons/invitations.ts); el grafo de
> organización, binding e invitación está en
> [Binding de Identidad Externa para el MCP](binding-identidad-externa-mcp.md).

## El enlace por correo, en detalle

| Regla | Valor | Por qué |
| --- | --- | --- |
| Cuánto dura | **15 minutos** | Ventana corta: un correo viejo reenviado no sirve. |
| Cuántas veces sirve | **Una sola** | Si alguien ya lo usó, deja de valer para todos. |
| Qué pasa al abrirlo | Aparece una **pantalla intermedia con un botón** | Los escáneres antivirus y los clientes de correo abren los enlaces automáticamente para revisarlos. Si el enlace se consumiera con sólo abrirlo, esos escáneres lo quemarían antes de que la persona llegara. El botón exige un clic humano. |

### La respuesta siempre es la misma

Cuando alguien pide un enlace de acceso, el sistema responde **exactamente lo mismo exista o no ese correo**:
la misma pantalla, con el mismo texto, y tardando lo mismo. No dice "te enviamos el enlace" en un caso y
"ese correo no existe" en el otro.

Esto es a propósito, no un descuido de la interfaz. Si la respuesta cambiara, cualquiera podría averiguar
**quién tiene cuenta** simplemente probando correos, uno por uno, y viendo cuál responde distinto. Sabría qué
personas de qué empresas trabajan con Efeonce. Con la respuesta idéntica no aprende nada.

Consecuencia práctica para soporte: si una persona dice que no le llegó el enlace, la pantalla **no** te va a
decir si su correo está bien escrito. Hay que revisarlo contra la invitación que emitió el operador.

> Detalle técnico: [`magic-link.ts`](../../../src/lib/auth-server/persons/magic-link.ts) y
> [`pages.ts`](../../../src/lib/auth-server/persons/pages.ts) (la página intermedia existe justamente para
> que el consumo no sea un simple GET).

## Passkeys: el método de todos los días

Una passkey es la forma cómoda de entrar. Se registra **estando ya dentro** (no se puede registrar antes de
la primera entrada, porque hace falta una sesión).

| Regla | Valor |
| --- | --- |
| Cuántas por persona | Hasta **5** |
| Cómo se distinguen | Cada una lleva un **nombre de dispositivo** que la persona elige ("iPhone del trabajo", "notebook") |
| Qué se pide al entrar | **Nada más que la passkey.** No se pide el correo: el dispositivo ya dice de quién es la llave. |

### La defensa contra copias

Cada passkey lleva un contador interno que sube cada vez que se usa. Si ese contador **retrocede**, sólo hay
una explicación razonable: existen dos copias de la misma llave, y una de ellas va atrasada.

Cuando eso pasa, esa credencial **queda invalidada automáticamente** y se levanta una alerta. No hay que
esperar a que alguien lo note: el sistema corta primero y avisa después.

> Detalle técnico: [`passkeys.ts`](../../../src/lib/auth-server/persons/passkeys.ts).

## TOTP: el permiso para escribir

El TOTP no sirve para entrar. Sirve para **autorizar que una aplicación haga cambios** en nombre de la persona.

| Momento | Qué pasa |
| --- | --- |
| **Al enrolarlo** | Se hace desde dentro. Queda en estado **"pendiente"**: todavía no sirve. |
| **Al confirmarlo** | La persona escribe un código correcto. Recién en ese momento el segundo factor queda activo. Esto evita el caso clásico de alguien que enrola la app, la configura mal y queda encerrado. |
| **Los códigos de respaldo** | Se entregan **10**, se muestran **una sola vez** y cada uno sirve **una vez**. Son el salvavidas si el teléfono no está a mano. |
| **Al usarlo** | Un mismo código TOTP **no se acepta dos veces**. Si alguien lo interceptó mientras la persona lo escribía, ya no le sirve. |
| **Cuánto dura la autorización** | **10 minutos.** Pasado ese rato, para volver a autorizar una escritura hay que confirmar el segundo factor de nuevo. |

Los 10 minutos no son un capricho: significan que una sesión abierta y olvidada en un computador ajeno no
queda con permiso permanente para hacer cambios.

> Detalle técnico: [`totp.ts`](../../../src/lib/auth-server/persons/totp.ts) y
> [`totp-cipher.ts`](../../../src/lib/auth-server/persons/totp-cipher.ts).

## Cuánto dura una sesión

| Límite | Valor | Qué significa |
| --- | --- | --- |
| **Inactividad** | 12 horas | Si la persona sigue usando el servicio, la sesión se mantiene. Si deja de usarlo 12 horas, se cierra. |
| **Máximo absoluto** | 7 días | Aunque la use todos los días sin parar, a los 7 días hay que volver a identificarse. |
| **Revocación** | Inmediata en la práctica | Si el operador revoca el acceso de esa persona, la sesión **muere en su siguiente acción**, no cuando expire. No hay que esperar 12 horas ni 7 días. |

Esa última fila es la importante para operaciones: cortar el acceso de alguien surte efecto de verdad, no
"cuando se le venza el pase".

> Detalle técnico: [`sessions.ts`](../../../src/lib/auth-server/persons/sessions.ts).

## Si la persona pierde el teléfono o cambia de dispositivo

**No hay "olvidé mi contraseña"**, porque no hay contraseña que olvidar. Tampoco hay una pregunta secreta ni
un correo de recuperación distinto. El único camino es que **el operador emita una invitación nueva**
(una re-invitación).

Cuando la persona acepta esa invitación nueva, **todo lo anterior de esa persona muere**:

- su sesión abierta, si tenía una;
- **todas** sus passkeys, no sólo la del dispositivo perdido;
- su TOTP, junto con los códigos de respaldo que le quedaban.

Queda como el primer día: entra por correo y vuelve a registrar sus dispositivos. Es más drástico de lo que
la persona espera, y conviene avisárselo antes. La razón es simple: si el teléfono se perdió, no sabemos qué
más se perdió con él, y dejar credenciales viejas vivas sería dejar puertas abiertas sin saber cuántas.

> Detalle técnico: [`recovery.ts`](../../../src/lib/auth-server/persons/recovery.ts).

## Corte de emergencia

Cuando hace falta cortar el acceso de alguien de inmediato — sospecha de robo, salida abrupta, un incidente —
existe una acción administrativa dedicada.

| Qué | Detalle |
| --- | --- |
| **Qué hace** | Revoca de una vez la sesión, todas las passkeys y el TOTP de esa persona. |
| **Qué NO hace** | **No le devuelve el acceso.** No es un "reset": es un corte. Para que vuelva a entrar hay que re-invitarla. |
| **Quién puede** | Sólo el rol interno `EFEONCE_ADMIN`, con la capability `identity.auth_person.revoke`. |
| **Por dónde** | `POST /api/admin/auth-server/persons/revoke` |
| **Qué exige** | Una **razón escrita de al menos 10 caracteres**. Sin razón, no se ejecuta. |

La razón obligatoria existe para que, meses después, alguien pueda reconstruir por qué se cortó ese acceso
sin depender de la memoria de quien apretó el botón.

> Detalle técnico: runbook en [`docs/operations/runbooks/auth-server.md`](../../operations/runbooks/auth-server.md).

## Qué no se guarda nunca

Esta lista es tan importante como lo que sí se guarda, porque define qué se pierde si alguien lograra leer la
base de datos.

| Cosa | Qué pasa en realidad |
| --- | --- |
| **Contraseñas** | No existen. No hay nada que filtrar. |
| **El enlace de correo en claro** | Se guarda sólo una **huella** (un resumen irreversible). Con la base de datos en la mano, nadie puede reconstruir un enlace válido. |
| **El secreto del TOTP** | Va **cifrado** con una llave de Google Cloud KMS. La base de datos sola no alcanza para generar códigos. |
| **El correo, dentro del registro de intentos** | En el registro de intentos de acceso queda sólo su huella, no el correo. El registro sirve para detectar abuso, no para armar una lista de contactos. |
| **El identificador de la persona en los registros** | Nunca en claro. Los registros permiten investigar un patrón sin exponer quién es cada quien. |

> Detalle técnico: [`store`](../../../src/lib/auth-server/persons/store) (persistencia),
> [`totp-cipher.ts`](../../../src/lib/auth-server/persons/totp-cipher.ts) (cifrado con KMS) y
> [`rate-limit.ts`](../../../src/lib/auth-server/persons/rate-limit.ts) (registro de intentos).

## Estado actual: construido y apagado

Todo lo descrito arriba **está construido y probado, pero apagado**. El interruptor es
`AUTH_SERVER_PERSON_AUTH_ENABLED`, hoy en `false`.

| Con el interruptor apagado | Qué ocurre |
| --- | --- |
| Las pantallas de esta documentación | **No existen**: responden `404`. No responden "prohibido", porque un "prohibido" ya confirmaría que la pantalla está ahí. |
| Autorizar una aplicación | Sigue respondiendo **"necesitas iniciar sesión"**, igual que antes. Ninguna aplicación recibe un pase. |

Dicho de otra forma: hoy nadie de un cliente puede entrar todavía. Lo que cambió es que la pieza que faltaba
ya existe y está lista para prenderse cuando corresponda.

> Detalle técnico: estado del flag por entorno en
> [`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md); configuración en
> [`config.ts`](../../../src/lib/auth-server/persons/config.ts); alcance y pendientes en
> [TASK-1830](../../tasks/in-progress/TASK-1830-efeonce-auth-external-person-authentication.md).
