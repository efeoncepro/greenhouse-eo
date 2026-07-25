# Share board — la pieza que ve el cliente

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-07-25 por Claude (TASK-1558)
> **Ultima actualizacion:** 2026-07-25 por Claude
> **Documentacion tecnica:** [ADR-014 — Client Application](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md) · [Wireframe](../../ui/wireframes/TASK-1558-globe-share-board.md)

## Qué es

Cuando alguien de Efeonce comparte una pieza creativa con un cliente, el cliente recibe un link. Lo
abre y ve **el share board**: la pieza, sus datos y los comentarios. Nada más.

Es **la única superficie de Globe que ve alguien de afuera**. Todo lo demás —el Producer, la
biblioteca, el Model Lab— es interno. Por eso esta pantalla tiene un estándar distinto: no es una
herramienta que el equipo aprende a usar, es la cara del trabajo frente a quien lo paga.

## Cómo entra el cliente

Sin cuenta, sin contraseña, sin instalar nada. El permiso viaja **en el propio link**.

Y hay un detalle que importa: apenas la página carga, **el permiso se saca de la barra de
direcciones** y pasa a viajar por dentro. Así, si el cliente comparte una captura de pantalla o copia
la URL de la barra, no está regalando el acceso sin darse cuenta.

## Qué ve y qué nunca

**Ve:** la pieza, su título, los datos que le dan contexto, y los comentarios del equipo.

**Nunca ve** —y esto no es una omisión, es el contrato de la superficie:

- Con qué proveedor se generó, ni con qué modelo interno
- Cuánto costó
- El margen
- Fechas en formato de máquina o estados con nombre técnico
- La palabra "Producer" ni ninguna jerga de la herramienta

Un cliente mirando su pieza no debería poder deducir la mecánica de proveedores ni la estructura de
costos de Efeonce. Y hay un canary automático que revisa el HTML servido buscando exactamente esas
fugas, en los seis estados y en tres anchos de pantalla.

## Cuando algo falla, lo dice — y dice qué hacer

Un link compartido llega en el peor momento posible: el cliente lo abre en el subte, en un teléfono
viejo, tres semanas después. La pantalla está diseñada para eso.

| Situación | Qué ve el cliente |
|---|---|
| Cargando | La estructura de la página, ya armada, mientras llega la pieza |
| Todo bien | La pieza, sus datos y los comentarios |
| **Los datos llegaron, la pieza no** | **Los datos igual**, y un aviso de que el archivo no cargó, con Reintentar |
| El link venció | Que venció — no un error genérico |
| El link fue revocado | Que ya no está disponible |
| Algo se cayó | Que se cayó, con Reintentar |

El tercer caso es el que separa una pantalla bien hecha de una que no: **si el archivo no carga pero
los datos sí, mostrás los datos.** Tirar toda la página porque falló una parte le hace creer al cliente
que no hay nada, cuando sí hay.

Y "Reintentar" aparece **sólo cuando reintentar sirve**. Si el link venció, reintentar no lo revive —
ofrecer el botón ahí es hacerle perder el tiempo y esconderle la acción real, que es pedir un link
nuevo.

## Por qué se reconstruyó

Antes, esta pantalla se armaba pegando texto en el servidor: un archivo generaba el HTML como una
cadena gigante. Eso funcionaba, pero tenía un costo que se veía en el resultado — mejorarla
significaba editar miles de líneas de texto pegado, así que en la práctica no se mejoraba.

Ahora está construida con piezas reutilizables sobre un conjunto único de colores, tipografías y
tiempos. La diferencia práctica: **mejorar esta pantalla dejó de ser caro.**

Es también la primera superficie que estrena esa forma de construir. Las que siguen —el Producer, la
pantalla de entrada— la heredan.

## Estado actual

**Construida y verificada, todavía no sirviendo.** El canary pasó en seis estados y tres anchos, con
puntaje 4,71 sobre 5.

Lo que falta **no es sólo encender un interruptor**, como se creyó al principio: el interruptor todavía
no está conectado al servidor, y el contenedor que corre en producción es anterior a esta versión. La
cadena real —cablear el interruptor, completar los datos que hoy se descartan, desplegar, encender y
verificar con un link real— está en el
[manual del share board](../../manual-de-uso/creative-studio/operar-share-board-globe.md).

Hasta que eso pase, el cliente sigue viendo la pantalla vieja, que funciona.

> **Detalle técnico:** superficie en
> `efeonce-globe/apps/studio-client/src/surfaces/share/ShareBoardSurface.tsx`; primitives en
> `src/primitives/`. Decisión de arquitectura:
> [ADR-014](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md).
> Para operarlo: [manual del share board](../../manual-de-uso/creative-studio/operar-share-board-globe.md).
