# Menu del Portal Cliente — Modulos Contratados

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-08-09 por Claude (TASK-1675)
> **Ultima actualizacion:** 2026-08-09 por Claude (alcance de la regla frente a las vistas base y a la lista heredada)
> **Documentacion tecnica:** [GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md](../../architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md) §12.1, [ORG_CLIENT_AGENT_INVARIANTS.md](../../architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md)

---

## De que se trata este documento

De una sola pregunta: **por que un cliente ve, en el menu de la izquierda de su portal, exactamente los enlaces que ve.** Ni uno mas, ni uno menos.

El documento hermano [Menu dinamico y acceso a modulos](menu-dinamico-y-acceso-a-modulos.md) explica que es un modulo, como se vende y que pantallas de bienvenida o de aviso ve el cliente. Este explica la mecanica de la navegacion: que hace aparecer un enlace, que no lo hace aparecer, y por que un colaborador interno de Efeonce ve algo distinto.

---

## La regla en una linea

**Un cliente ve en su menu los enlaces de los modulos que su organizacion tiene contratados y vigentes.** El cargo de la persona, su rol en el portal y la linea de negocio de la cuenta no agregan ni quitan enlaces de modulo.

Con dos precisiones que evitan malentendidos, y que valen para todo lo que sigue:

- **Hay tres pantallas que no son un modulo** y por eso abren para cualquier organizacion: Notificaciones, Configuracion y Novedades. Viven en "Mi Cuenta" y nadie las contrata. Se llaman **vistas base**.
- **Queda una lista heredada de seis enlaces cliente** —Proyectos, Ciclos, Equipo, Revisiones, Analytics, Campanas— que todavia se muestra segun el rol de la persona y no segun lo contratado. Es la deuda que aparece al final de este documento, y es la razon por la que un cliente puede ver uno de esos seis enlaces y, al entrar, recibir "este modulo no esta activado para tu cuenta".

---

## Que hace aparecer un enlace

Tres condiciones, todas necesarias:

1. **La organizacion tiene el modulo asignado.** La asignacion es un registro con fechas: quien la creo, desde cuando rige y —si aplica— cuando vence. Mientras no exista, no hay enlace.
2. **La asignacion esta vigente.** Cuenta como vigente la que esta en estado activo o piloto, no fue dada de baja y no paso su fecha de vencimiento. Una asignacion pausada, expirada o dada de baja deja de mostrar sus enlaces.
3. **El modulo declara pantallas de cliente.** Cada modulo trae una lista de las pantallas que habilita. Solo esas pantallas se convierten en enlaces.

Cuando las tres se cumplen, el enlace aparece con su nombre y su icono en el grupo que le corresponde.

Hay una condicion previa, silenciosa: **el usuario del cliente tiene que tener su organizacion resuelta.** Si por un problema de datos su cuenta no esta asociada a ninguna organizacion, el portal ni siquiera pregunta por modulos y el menu queda sin ningun enlace de modulo. No es un problema de contratacion y no se arregla activando nada: se arregla reconciliando la cuenta.

> Detalle tecnico: el resolver canonico es [`resolveClientPortalModulesForOrganization`](../../../src/lib/client-portal/readers/native/module-resolver.ts); la composicion de los items es [`composeNavItemsFromModules`](../../../src/lib/client-portal/composition/menu-builder.ts). Ambos corren en el servidor. Contrato: `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12.1.

---

## Que NO hace aparecer un enlace

Esto es lo que suele confundirse en soporte:

| No sirve para agregar un enlace de modulo | Por que |
|---|---|
| Cambiarle el rol al usuario del cliente | Los tres roles de cliente se diferencian en que puede hacer una persona dentro de una pantalla, no en que modulos compro la empresa |
| Darle permisos de vista al rol en la tabla de gobernanza de vistas | Esa tabla gobierna otra cosa. Para las pantallas que dependen de un modulo, ademas, esta escrita a proposito con el permiso en "no": si se cambia a "si", el enlace deja de depender de lo contratado y pasa a verse por rol —para todos los clientes con ese rol, hayan comprado o no |
| Cambiar la linea de negocio de la cuenta | La linea de negocio describe que tipo de cliente es, no que compro |
| Agregar el enlace a mano en el codigo del menu | Deja de reflejar lo contratado y hay que repetirlo por cada cliente nuevo. Es exactamente lo que este diseno vino a eliminar |

---

## El agujero que esto vino a cerrar

Hasta agosto de 2026 el portal tenia **dos verdades que nunca se tocaban**:

- La **puerta de cada pantalla** —lo que decide si el cliente puede entrar— miraba los modulos contratados.
- El **menu** miraba los permisos de vista por rol.

El resultado no era el error de un modulo puntual: era estructural. Un cliente podia tener un modulo contratado, la pantalla renderizaba con sus datos reales, y **no habia forma de llegar salvo escribiendo la direccion a mano**. Se midio con un cliente que tenia el modulo SEO contratado y su pantalla funcionando, invisible en la navegacion.

Desde entonces los **enlaces de modulo** y la puerta leen **el mismo origen**: si el enlace de modulo esta, la pantalla se abre.

La vuelta no es cierta todavia, y conviene decirlo: que un enlace este no prueba que su modulo este contratado, porque los seis enlaces heredados se siguen mostrando por rol. Lo que si es cierto siempre es que **la puerta no depende del menu**: cada pantalla vuelve a preguntar por su cuenta.

---

## Como se ordena el menu del cliente

Los enlaces de modulo se reparten en tres zonas del menu, en este orden:

1. **Arriba, sin encabezado** — el dia a dia: inicio, proyectos, ciclos, equipo, revisiones, campanas, y los modulos que pertenecen a esa zona (por ejemplo, SEO).
2. **Modulos** — capacidades especializadas y complementos.
3. **Mi Cuenta** — lo transversal: novedades, notificaciones, configuracion.

Dos detalles que explican ausencias legitimas:

- **Hay pantallas que son hijas de otra y no tienen enlace propio.** Se llega a ellas desde su pantalla padre. El informe SEO es el caso vivo: se abre con el boton "Ver informe" del encabezado del panel SEO, y por eso no aparece como una linea aparte del menu.
- **Si un modulo declara una pantalla que ya esta en el menu, no se duplica.** El enlace existente se conserva.

> Detalle tecnico: el reparto por zona, los iconos y la marca de ruta hija viven en el descriptor declarativo de [`menu-builder.ts`](../../../src/lib/client-portal/composition/menu-builder.ts). El nombre visible y la direccion de cada pantalla salen del registro de vistas.

---

## Por que un colaborador interno ve otra cosa

El portal es uno solo, pero atiende a tres poblaciones: colaboradores de Efeonce, equipos internos por area (finanzas, personas, comercial, operaciones) y clientes.

- **Los usuarios internos por area** arman su menu con su propia logica y **no consultan modulos contratados**: no tienen una organizacion cliente que los tenga.
- **Los clientes** reciben los enlaces de sus modulos sumados a su menu base.
- **Los colaboradores puros** —quienes solo tienen su espacio personal— comparten la misma rama de codigo que los clientes. Por eso los enlaces de modulo **se suman** al menu, nunca lo reemplazan: reemplazarlo dejaria a esos colaboradores sin navegacion.

> Detalle tecnico: la suma ocurre en [`VerticalMenu.tsx`](../../../src/components/layout/vertical/VerticalMenu.tsx), bloque `CLIENT USERS`. Hay un test que fija que la suma no reemplace la lista base.

---

## Cuando se ve un cambio

Cuando alguien de Efeonce activa, pausa o da de baja un modulo:

- **El cambio se aplica de inmediato en la base**, con su registro de auditoria.
- **El cliente lo ve en su siguiente carga completa del portal.** Moverse entre pantallas dentro del portal no vuelve a calcular el menu: hace falta recargar la pagina o volver a entrar.
- **En el peor caso, hasta alrededor de un minuto.** El sistema recuerda la respuesta por un rato corto para no consultar la base en cada pantalla. La activacion limpia ese recuerdo, pero el portal corre en varias instancias y alguna puede tardar ese minuto en enterarse.

No hay que cerrar sesion ni pedirle nada especial al cliente: recargar alcanza.

> Detalle tecnico: cache en memoria de 60 s por organizacion, invalidado por los commands de activacion/pausa/baja ([`src/lib/client-portal/commands/`](../../../src/lib/client-portal/commands/)). El menu se resuelve en el layout servidor de `(dashboard)`, que no se re-ejecuta en navegacion dentro del mismo segmento.

---

## Que pasa si algo falla

El calculo del menu de cliente ocurre en la raiz del portal, la misma que sostiene a **todos** los usuarios, internos incluidos. Por eso esta disenado para fallar hacia el lado seguro:

- Si la consulta de modulos falla, **el portal sigue funcionando** y el cliente ve su menu base. Nunca un menu vacio, nunca una pantalla en blanco.
- El fallo queda registrado para el equipo de operaciones.
- **La seguridad no se apoya en el menu.** Que un enlace no aparezca no es lo que protege el dato: cada pantalla vuelve a preguntar por su cuenta si la organizacion tiene el modulo. Un menu degradado no abre puertas.

---

## Lo que este mecanismo no hace

- **No cobra ni factura nada.** Que un modulo aparezca en el menu no significa que este facturado; eso vive en el acuerdo comercial.
- **No escribe nada.** El menu solo lee las asignaciones. Activarlas, pausarlas o darlas de baja es trabajo de las acciones de administracion, que dejan auditoria.
- **No distingue visualmente un complemento de un modulo base.** Hoy el menu del portal muestra todos los enlaces igual; la diferencia entre modulo base, complemento y piloto se ve en la vista de administracion, no en el menu del cliente.
- **Quedan dos deudas conocidas, las dos del mismo tipo:** enlaces que no salen de lo contratado. Una es la lista heredada de seis enlaces cliente, que se muestra por rol. La otra es un bloque antiguo que arma unos pocos enlaces a partir de la linea de negocio y los servicios de la cuenta. Ninguna de las dos abre puertas —la pantalla sigue preguntando por su cuenta—, pero ambas pueden prometer de mas en el menu. Estan pendientes de migrar al mismo origen.

---

## Glosario minimo

| Termino | Que es |
|---|---|
| **Modulo** | Paquete vendible de pantallas del portal cliente |
| **Asignacion** | El vinculo entre una organizacion y un modulo, con fechas y estado |
| **Vigente** | Asignacion activa o en piloto, no dada de baja y no vencida |
| **Ruta hija** | Pantalla que se alcanza desde otra y no tiene enlace propio en el menu |
| **Carga completa** | Entrar de nuevo al portal o recargar la pagina, a diferencia de moverse entre pantallas |

---

> Como operar esto paso a paso: [Diagnosticar un modulo contratado que no aparece en el menu](../../manual-de-uso/client-portal/diagnosticar-modulo-no-visible-en-menu.md).
