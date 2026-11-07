# Administrar las novedades del login

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-10-02 por Claude (TASK-1963)
> **Última actualización:** 2026-11-01 (Efeonce ID consume el feed en producción)
> **Modulo:** Identity / acceso al portal
> **Rutas:** `/login` del portal y `https://auth.efeonce.org/login` (consumidores), `GET /api/public/login-announcements`, `GET|POST /api/admin/login-announcements`, `PATCH /api/admin/login-announcements/{id}`
> **Documentacion relacionada:** [Novedades del login](../../documentation/identity/novedades-del-login.md)

## Para qué sirve

Para crear, corregir, publicar y retirar las novedades que rotan en el carrusel de la pantalla de ingreso, sin desplegar código. Todavía no hay una pantalla de administración: se opera por la API.

## Dónde se ven — desde 2026-11-01

Las novedades que publicas aquí aparecen en **dos pantallas**:

- El login del portal Greenhouse (`/login`).
- El login de Efeonce ID (`https://auth.efeonce.org/login`), que es también el que ve quien entra desde Rooms («Entra a
  Rooms»). Está en producción desde el release del 2026-11-01.

Efeonce ID no tiene administración propia: lee el mismo feed público (`GET /api/public/login-announcements`).

- Toma como máximo tres novedades.
- Espera hasta 600 ms la respuesta del feed.
- Guarda lo leído 30 segundos, además de los 5 minutos de caché del feed.
- Si el feed falla, muestra la fotografía oficial sin titulares.

Un cambio aquí cambia ambos logins: no publiques para «probar» Efeonce ID. Para mirar el carrusel con el feed real sin
tocar nada, usa el arnés local (`pnpm auth-server:dev-ui` → `/login/public-feed-preview`; ver
[Revisar las pantallas de Efeonce ID](operar-pantallas-efeonce-id.md)).

## Antes de empezar

- Necesitas una sesión de administración (`efeonce_admin`) con la capability `login_announcements.manage`.
- En staging, `pnpm staging:request` maneja el bypass de Vercel y la sesión del agente. Sintaxis: `pnpm staging:request [METHOD] <path> ['<json>']`.
- Ten en cuenta que dev, staging y producción comparten la misma base de datos: **lo que publiques se ve en todos los ambientes que ya tengan el login V4, incluido `auth.efeonce.org`**.
- Si la novedad lleva una foto nueva, primero tiene que estar en `public/images/login/` y desplegada. La API no sube imágenes.

## Paso a paso

### 1. Revisar lo que hay

```bash
pnpm staging:request /api/admin/login-announcements --pretty
```

Devuelve todas las novedades (cualquier estado), las más recientes primero. Para ver lo que el login muestra hoy:

```bash
pnpm staging:request /api/public/login-announcements --pretty
```

### 2. Crear una novedad (queda en borrador)

```bash
pnpm staging:request POST /api/admin/login-announcements '{
  "kind": "text",
  "serviceLine": "growth",
  "tabLabel": "Growth",
  "kicker": "Nuevo · Marketing de contenidos",
  "title": "Un tema, todos los canales",
  "body": "Una línea de apoyo, de no más de 180 caracteres.",
  "cta": { "label": "Conocer el servicio", "url": "https://efeoncepro.com" },
  "image": { "path": "/images/login/announcement-marketing-de-contenidos.webp", "alt": "Descripción de la foto" },
  "lens": { "x": 61, "y": 36, "radiusRatio": 0.29 },
  "priority": 10
}'
```

- Responde `201` con la novedad creada y su `id` (forma `lgan-…`).
- Sin `lens` (u omitiendo el campo) la foto se muestra a color entero y sin lente.
- `startsAt` y `endsAt` son opcionales (fecha ISO). Sin `startsAt`, empieza ahora; sin `endsAt`, no vence.

### 3. Publicar, devolver a borrador o archivar

```bash
pnpm staging:request PATCH /api/admin/login-announcements/<id> '{ "status": "published" }'
```

Usa `"draft"` para retirarla a revisión o `"archived"` para sacarla del login conservándola. Repetir el mismo estado no falla.

### 4. Corregir el contenido

```bash
pnpm staging:request PATCH /api/admin/login-announcements/<id> '{ "announcement": { … } }'
```

Manda la novedad **completa**, con el mismo formato del paso 2: el contenido se reemplaza entero (no es una edición parcial) y el estado no cambia.

### 5. Verificar

1. Llama a `GET /api/public/login-announcements` y confirma que aparece, en el orden esperado.
2. Abre `/login` y mira la pestaña en desktop y en 390 px. La API pública guarda en caché hasta 5 minutos.
3. Abre `https://auth.efeonce.org/login` y confirma que la novedad también aparece ahí. Puede tardar unos 30 segundos más que en el portal.

## Qué significan los estados y respuestas

| Respuesta | Significado | Qué hacer |
|---|---|---|
| `201` / `200` | Creada o actualizada | Verifica en la API pública |
| `400 invalid_request` + `issues` | Uno o más campos no cumplen; vienen todos los problemas juntos | Corrige según la lista (abajo) |
| `401` / `403 forbidden` | Sin sesión de administración o sin la capability | Pide acceso; no hay atajo |
| `404 login_announcement_not_found` | El `id` no existe | Revisa el listado del paso 1 |
| `500 internal_error` | Falla inesperada; queda registrada en Sentry (`surface=login-announcements`) | Reintenta y avisa si persiste |

Códigos frecuentes en `issues`: `tab_label_required`, `title_required` (tipo `text`), `banner_image_required` (tipo `banner`), `image_alt_required`, `cta_incomplete` (texto sin enlace o al revés), `cta_url_unsafe` / `image_path_unsafe` (sólo `/…` o `https://`), `*_too_long`, `lens_invalid`, `priority_invalid`, `window_invalid` (el término no es posterior al inicio), `status_invalid`.

## Qué no hacer

- No escribas en la tabla con SQL a mano: los commands validan, registran quién cambió qué y mantienen el contrato que también usará Nexa.
- No publiques contenido sin la aprobación del operador: el login es la primera impresión del producto.
- No uses enlaces `http://`, `javascript:` ni rutas que empiecen con `//`.
- No archives para «probar»: dev, staging y producción ven la misma tabla.
- No pongas texto dentro de la foto de un `banner` que no esté también en el texto alternativo.

## Problemas comunes

- **Aparece en el portal pero no en `auth.efeonce.org/login`:** espera la caché de 30 segundos del autorizador. Si el carrusel desapareció del todo, el autorizador no pudo leer el feed a tiempo (más de 600 ms, respuesta mayor a 16 KB o con formato inválido) y volvió a la fotografía oficial. Revisa que la API pública responda rápido y que la novedad pase la validación.
- **La novedad publicada no aparece:** revisa que esté vigente (`startsAt` pasado, `endsAt` futuro o vacío), que su prioridad la deje entre las tres primeras y espera la caché de 5 minutos.
- **La lente queda lejos del sujeto:** ajusta `lens.x` / `lens.y` (porcentaje de la foto) y `radiusRatio`; la lente se ancla a ese punto de la foto en cualquier proporción de pantalla.
- **Una persona de cuentas u operaciones recibe 403:** hoy la API exige además sesión de administración, aunque esos roles tengan la capability (pregunta abierta en TASK-1963).

## Referencias técnicas

- [TASK-1963](../../tasks/in-progress/TASK-1963-login-announcements-governed-reader.md) — tabla, reader, commands y API.
- [TASK-1964](../../tasks/in-progress/TASK-1964-login-v4-premium-access-transition.md) — pantalla del login V4 que consume el reader.
- [TASK-2064](../../tasks/in-progress/TASK-2064-efeonce-id-login-v4-rooms.md) — login V4 de Efeonce ID que consume el feed público (`src/lib/auth-server/persons/login-announcements.ts`).
- Código: `src/lib/login-announcements/**`, `src/app/api/public/login-announcements/route.ts`, `src/app/api/admin/login-announcements/**`.
