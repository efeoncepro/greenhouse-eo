# Novedades del login — Carrusel del acceso a Greenhouse

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-10-02 por Claude (TASK-1963 / TASK-1964)
> **Ultima actualizacion:** 2026-10-02 por Claude
> **Documentacion tecnica:** [TASK-1963](../../tasks/in-progress/TASK-1963-login-announcements-governed-reader.md) · [TASK-1964](../../tasks/in-progress/TASK-1964-login-v4-premium-access-transition.md) · [Wireframe del login V4](../../ui/wireframes/TASK-1964-login-v4-premium-access.md)
> **Manual de uso:** [Administrar las novedades del login](../../manual-de-uso/identity/administrar-novedades-del-login.md)

## Qué son

La pantalla de ingreso a Greenhouse (`/login`) tiene dos partes: el formulario para entrar y, al lado (o debajo en el celular), un escenario con una foto. Sobre esa foto rota un carrusel de **novedades**: productos nuevos de Efeonce, funciones de Greenhouse o servicios que conviene conocer.

Las novedades no están escritas en el código. Viven en una tabla de la base de datos y se administran por una API con permiso propio, así que se pueden cambiar sin desplegar nada.

> Detalle técnico: tabla `greenhouse_core.login_announcements`; reader `listActiveLoginAnnouncements` en `src/lib/login-announcements/reader.ts`.

## Qué se muestra en el login

- Como máximo **tres** novedades a la vez, una pestaña por novedad.
- Sólo las que están **publicadas** y **vigentes** (ya empezaron y no han terminado).
- En orden de **prioridad**: el número más alto va primero; a igual prioridad, la que empezó más tarde.
- Si no hay ninguna vigente, el escenario muestra la foto por defecto, sin texto ni pestañas.
- Si la consulta falla, el login no se cae: se comporta como si no hubiera novedades y el error queda registrado.

> Detalle técnico: `LOGIN_ANNOUNCEMENT_ACTIVE_LIMIT = 3`; orden `priority DESC, starts_at DESC`. El comportamiento ante error está en el código; todavía no tiene evidencia en un ambiente real.

## Estados

| Estado | Qué significa | ¿Se ve en el login? |
|---|---|---|
| `draft` (borrador) | Recién creada o devuelta a revisión | No |
| `published` (publicada) | Aprobada para mostrarse | Sí, si está vigente y entra en las tres de mayor prioridad |
| `archived` (archivada) | Retirada; se conserva y se puede volver a publicar | No |

Toda novedad nace en borrador. Publicarla es un paso aparte y explícito. Cambiar a un estado que ya tiene no da error.

## Qué tiene cada novedad

| Campo | Para qué sirve | Límite |
|---|---|---|
| Tipo (`text` o `banner`) | `text`: titular sobre la foto. `banner`: una imagen completa que es el enlace, sin texto encima | — |
| Línea de servicio | `growth`, `brand`, `engine`, `voice`, `revenue-hubspot`, `revenue-salesforce` o `greenhouse`. Define el color de acento del anillo y la esfera | — |
| Pestaña | Nombre corto de la pestaña del carrusel (obligatorio) | 24 caracteres |
| Kicker | Línea pequeña sobre el titular | 60 caracteres |
| Titular | Obligatorio en las novedades de tipo `text` | 80 caracteres |
| Bajada | Una línea de apoyo | 180 caracteres |
| Llamado a la acción | Texto + enlace; van juntos o no van | 40 caracteres el texto |
| Imagen | Ruta de la foto + texto alternativo (obligatorio si hay imagen) | 200 caracteres el texto alternativo |
| Lente | Centro (`x`, `y` en % de 0 a 100) y tamaño (`radiusRatio`, fracción de 0 a 1) del círculo de «La órbita» sobre la foto | — |
| Prioridad | Número entero; más alto = antes | — |
| Vigencia | Inicio y término opcional; el término debe ser posterior al inicio | — |

Los enlaces y las rutas de imagen sólo pueden ser rutas del portal (`/…`) o direcciones `https://`. Cualquier otra cosa se rechaza.

## Con lente o sin lente

- **Con lente:** la foto se ve apagada y, dentro del círculo, a color y ampliada, con el anillo, el arco y la esfera de «La órbita» en el color de la línea de servicio. La lente se ancla a un punto de la foto, así que acompaña al sujeto en cualquier tamaño de pantalla.
- **Sin lente:** la foto se ve a color entero. Se usa con fotos en registro cine, donde la luz de la escena ya cumple el papel de la órbita (una sola órbita por pieza).

## Imágenes

Las fotos del escenario viven en `public/images/login/` y se publican con el código: agregar una foto nueva requiere un cambio en el repositorio. La API sólo guarda la ruta (por ejemplo `/images/login/announcement-ai-visibility-report.webp`), no sube archivos.

## Novedades vigentes al 2026-10-02

| Orden | Línea | Titular | Lente |
|---|---|---|---|
| 1 (prioridad 40) | Engine | «Que la IA te encuentre» — AI Visibility Report | Sin lente |
| 2 (prioridad 30) | Brand | «Una idea, todos los formatos» — Escalar producción creativa | Sin lente |
| 3 (prioridad 10) | Growth | «Un tema, todos los canales» — Marketing de contenidos | Con lente |

La novedad inicial de Globe Studio quedó archivada. Las dos novedades nuevas enlazan a `https://efeoncepro.com` mientras se define la página de cada servicio.

## Quién puede administrarlas

- Leer las novedades vigentes es público: no requiere sesión.
- Crear, editar, publicar o archivar exige la capability `login_announcements.manage`, concedida a `efeonce_admin`, `efeonce_account` y `efeonce_operations`. Ningún rol de cliente la tiene.
- Hoy la API de administración además exige sesión de administración (`efeonce_admin`), así que en la práctica sólo administración puede operarla. Ampliarlo a cuentas y operaciones está abierto en TASK-1963.

> Detalle técnico: guarda `requireLoginAnnouncementsManager` en `src/lib/login-announcements/http.ts`, que llama primero a `requireAdminTenantContext` y después a `can(…, 'login_announcements.manage', …)`.
