> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-06-06 por Claude (Opus 4.8)
> **Ultima actualizacion:** 2026-06-06 por Claude (Opus 4.8)
> **Documentacion tecnica:** `src/config/maintenance.ts`, `middleware.ts`, `src/views/UnderMaintenance.tsx`, `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

# Pagina "En mantenimiento" + Modo Mantenimiento

## Que es

La pagina **"En mantenimiento"** es una de las paginas institucionales de pantalla
completa de Greenhouse (la misma familia que 404, 401 y "Volvemos pronto"). Avisa,
con un mensaje calmado y la ilustracion de Efeonce, que el portal o una seccion
estan temporalmente fuera por una **mantencion planificada** — distinto de un 404
(recurso que no existe) o un 401 (sin permiso).

Tiene dos partes:

1. **La pagina** (`/maintenance`): siempre existe y se puede visitar directamente.
2. **El modo mantenimiento** (un interruptor por configuracion): cuando se enciende,
   el portal entero se muestra detras de esta pagina hasta que se apaga.

## Como se ve

- Etiqueta "Mantenimiento", titulo grande, mensaje breve y tranquilizador.
- Dos acciones: **Volver al inicio** y **Reintentar** (recarga para verificar si ya
  volvio).
- Ilustracion propietaria de Efeonce + firma institucional Efeonce al pie.
- **5 mensajes rotativos**: cada vez que se refresca la pagina aparece una variante
  distinta (mismo patron que 404/401). El texto vive en el diccionario de microcopy
  (`underMaintenance`, es-CL / en-US).

## El modo mantenimiento (el interruptor)

Por defecto esta **apagado**: la pagina existe pero no bloquea nada. Cuando un
operador lo enciende, todo el trafico (salvo lo permitido) se muestra con la pagina
de mantenimiento y un codigo HTTP **503** honesto (los monitores lo leen como caida
temporal, no como error permanente).

Cosas que **nunca** se bloquean, aun en mantenimiento: la propia pagina
`/maintenance`, los recursos internos del framework, el login/sesion de agentes
(`/api/auth/*`), el health check de monitores, y las imagenes/marca que la pagina
necesita.

**Bypass de operador**: con un secreto configurado, el operador puede seguir
navegando el sitio en vivo (para verificar o apagar el modo) visitando cualquier
ruta con `?gh_bypass=<secreto>`. Eso deja una cookie segura por la sesion; el resto
de las personas sigue viendo la pagina de mantenimiento.

> Para el paso a paso de como encender, verificar y apagar el modo, ver el manual:
> `docs/manual-de-uso/plataforma/modo-mantenimiento.md`.

## Por que esta disenado asi (en simple)

- **Apagado por defecto**: instalarlo no cambia nada hasta que alguien lo enciende.
- **A prueba de fallos (fail-open)**: si el interruptor tuviera un error, el portal
  sigue funcionando — el unico modo de falla aceptable es "el mantenimiento no se
  activo", nunca "el sitio se cayo".
- **Honesto**: responde 503 + "reintentar mas tarde" para que buscadores y monitores
  no lo confundan con un error permanente.

## Que no hace (hoy)

- No se enciende solo: requiere configurar una variable y volver a desplegar.
- No tiene aun un boton en el panel admin para encenderlo/apagarlo (es por
  configuracion). Es un follow-up posible.

> Detalle tecnico: la pagina vive en `(blank-layout-pages)/maintenance`; el
> interruptor y la lista de rutas permitidas viven en `src/config/maintenance.ts`,
> aplicados por `middleware.ts` (el primer middleware del repo).
