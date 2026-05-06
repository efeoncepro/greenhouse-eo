# Verificar idioma del portal

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-05-06
> **Modulo:** Plataforma
> **Ruta en portal:** Transversal
> **Documentacion relacionada:** [Runtime i18n de Greenhouse](../../documentation/plataforma/i18n-runtime.md)

## Para que sirve

Esta guia explica como verificar y cambiar el idioma del portal. Es principalmente para QA, agentes y operadores tecnicos mientras el rollout de traducciones por modulo sigue avanzando.

## Antes de empezar

- El idioma default es `es-CL`.
- El primer idioma adicional activo es `en-US`.
- El portal privado no cambia de URL: no uses `/en-US/...`.
- La preferencia personal se cambia desde Settings.
- El default del space se cambia desde Admin > Tenants > Settings para usuarios con acceso admin.

## Paso a paso

1. Abre el portal en staging o local.
2. Entra a Settings.
3. En "Idioma del portal", elige `English (United States)` o `Español (Chile)`.
4. Guarda y recarga la pagina si necesitas verificar el siguiente request completo.
5. Verifica que el shell muestre labels en ingles para `en-US`, por ejemplo `Projects`, `Payment orders` o `My Payroll`.

Para cambiar el default de un space:

1. Entra a Admin > Tenants.
2. Abre el detalle del space.
3. Ve a Settings.
4. En "Idioma default", elige el idioma.
5. Los usuarios sin preferencia personal usaran ese default en el siguiente request.

La cookie `gh_locale` queda como ayuda para QA y rutas publicas/anonimas. En usuarios autenticados, la preferencia persistida gana sobre la cookie.

En DevTools puedes crear la cookie:

```txt
gh_locale=en-US
```

Para volver al default:

```txt
gh_locale=es-CL
```

## Que no hacer

- No agregues prefijos de idioma a rutas privadas.
- No cambies APIs ni callbacks de auth para probar idioma.
- No uses locale para saltarte permisos.
- No traduzcas emails desde el provider App Router.

## Problemas comunes

| Problema | Causa probable | Que hacer |
| --- | --- | --- |
| El portal sigue en espanol | El usuario tiene preferencia persistida en `es-CL` o la cookie no aplica por estar autenticado | Cambia el idioma desde Settings y recarga. |
| Una pantalla profunda sigue en espanol | Esa superficie aun no fue migrada | Verifica shell/shared copy; abrir child task para el modulo. |
| Una API falla con `/en-US/api/...` | Las APIs no llevan prefix | Usa `/api/...` sin locale. |
| El email no cambia de idioma | Emails no dependen del provider | Usar el bridge de emails y su rollout especifico. |

## Referencias tecnicas

- `src/i18n/request.ts`
- `src/i18n/resolve-locale.ts`
- `src/i18n/messages.ts`
- `src/config/greenhouse-navigation-copy.ts`
- `src/lib/copy/dictionaries/en-US/`
