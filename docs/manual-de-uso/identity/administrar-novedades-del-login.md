# Administrar las novedades del login

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-10-02 por Claude (TASK-1963)
> **Modulo:** Identity / acceso al portal
> **Rutas:** `/login` (consumidor), `GET /api/public/login-announcements`, `GET|POST /api/admin/login-announcements`, `PATCH /api/admin/login-announcements/{id}`
> **Documentacion relacionada:** [Novedades del login](../../documentation/identity/novedades-del-login.md)

## Para qué sirve

Para crear, corregir, publicar y retirar las novedades que rotan en el carrusel de la pantalla de ingreso, sin desplegar código. Todavía no hay una pantalla de administración: se opera por la API.

## Antes de empezar

- Necesitas una sesión de administración (`efeonce_admin`) con la capability `login_announcements.manage`.
- En staging, `pnpm staging:request` maneja el bypass de Vercel y la sesión del agente. Sintaxis: `pnpm staging:request [METHOD] <path> ['<json>']`.
- Ten en cuenta que dev, staging y producción comparten la misma base de datos: **lo que publiques se ve en todos los ambientes que ya tengan el login V4**.
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

- **La novedad publicada no aparece:** revisa que esté vigente (`startsAt` pasado, `endsAt` futuro o vacío), que su prioridad la deje entre las tres primeras y espera la caché de 5 minutos.
- **La lente queda lejos del sujeto:** ajusta `lens.x` / `lens.y` (porcentaje de la foto) y `radiusRatio`; la lente se ancla a ese punto de la foto en cualquier proporción de pantalla.
- **Una persona de cuentas u operaciones recibe 403:** hoy la API exige además sesión de administración, aunque esos roles tengan la capability (pregunta abierta en TASK-1963).

## Referencias técnicas

- [TASK-1963](../../tasks/in-progress/TASK-1963-login-announcements-governed-reader.md) — tabla, reader, commands y API.
- [TASK-1964](../../tasks/in-progress/TASK-1964-login-v4-premium-access-transition.md) — pantalla del login V4 que consume el reader.
- Código: `src/lib/login-announcements/**`, `src/app/api/public/login-announcements/route.ts`, `src/app/api/admin/login-announcements/**`.
