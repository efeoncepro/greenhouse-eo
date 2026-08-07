# Autenticación local de Gcloud con Playwright

> **Tipo de documento:** Manual de uso operativo
> **Alcance:** solo workstation local del operador; no CI, Vercel ni Cloud Run.

## Qué resuelve

El flujo canónico de Google Cloud tiene dos carriles independientes:

- `gcloud auth login`: credencial que usa la CLI.
- `gcloud auth application-default login`: credencial ADC que usan librerías y scripts.

El comando `pnpm gcloud:auth:playwright` comprueba ambos carriles. Solo abre Chrome mediante Playwright cuando alguno está vencido, o cuando se solicita `--force`. Después entrega el código OAuth a gcloud y ejecuta el preflight canónico como verificación final.

## Configuración de una sola vez

Ejecuta desde la raíz del repo:

```bash
pnpm gcloud:auth:playwright:setup
```

El setup toma la cuenta activa de gcloud y solicita la clave en una entrada que no la muestra. Escribe `.auth/gcloud-auth-credentials.json` con permisos `0600`.

`.auth/` está ignorado por Git. La credencial y el perfil aislado de Chrome son artefactos locales; nunca los agregues al índice, a un commit, a un screenshot ni a un log.

## Uso cuando lo solicites

Flujo normal — renueva solo si hace falta:

```bash
pnpm gcloud:auth:playwright
```

Forzar una nueva autorización en ambos carriles:

```bash
pnpm gcloud:auth:playwright -- --force
```

Verificar sin abrir Playwright:

```bash
pnpm gcloud:auth:playwright -- --check-only
```

El navegador se lanza en modo visible con un perfil aislado en `.auth/gcloud-auth-profile`. Si Google solicita una verificación adicional, complétala en esa ventana; el proceso espera el callback sin registrar su URL ni su código.

## Guardas

- La ejecución es explícita y local; no hay scheduler ni hook automático.
- El script usa `domcontentloaded`, locators accesibles y espera por estados reales; no depende de `networkidle`.
- No imprime contraseñas, cookies, URLs OAuth ni códigos de autorización.
- No uses el perfil personal real de Chrome mediante `GCLOUD_AUTH_PLAYWRIGHT_PROFILE`.
- Si la credencial local pierde `0600`, el script se detiene hasta corregirla.
- Si el flujo falla, comprueba primero `pnpm gcloud:auth:playwright -- --check-only`; no copies tokens desde la terminal.
