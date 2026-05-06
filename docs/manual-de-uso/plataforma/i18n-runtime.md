# Verificar idioma del portal

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-06
> **Modulo:** Plataforma
> **Ruta en portal:** Transversal
> **Documentacion relacionada:** [Runtime i18n de Greenhouse](../../documentation/plataforma/i18n-runtime.md)

## Para que sirve

Esta guia explica como verificar el runtime i18n mientras no existe todavia una preferencia persistida en perfil de usuario. Es principalmente para QA, agentes y operadores tecnicos.

## Antes de empezar

- El idioma default es `es-CL`.
- El primer idioma adicional activo es `en-US`.
- El portal privado no cambia de URL: no uses `/en-US/...`.
- La preferencia persistida queda para TASK-431.

## Paso a paso

1. Abre el portal en staging o local.
2. Fuerza el idioma con la cookie `gh_locale`.
3. Recarga la pagina.
4. Verifica que el shell muestre labels en ingles para `en-US`, por ejemplo `Projects`, `Payment orders` o `My Payroll`.
5. Borra la cookie y recarga para volver al fallback `es-CL`.

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
| El portal sigue en espanol | Cookie ausente o valor invalido | Usa `gh_locale=en-US` y recarga. |
| Una pantalla profunda sigue en espanol | Esa superficie aun no fue migrada | Verifica shell/shared copy; abrir child task para el modulo. |
| Una API falla con `/en-US/api/...` | Las APIs no llevan prefix | Usa `/api/...` sin locale. |
| El email no cambia de idioma | Emails no dependen del provider | Usar el bridge de emails y su rollout especifico. |

## Referencias tecnicas

- `src/i18n/request.ts`
- `src/i18n/resolve-locale.ts`
- `src/i18n/messages.ts`
- `src/config/greenhouse-navigation-copy.ts`
- `src/lib/copy/dictionaries/en-US/`
