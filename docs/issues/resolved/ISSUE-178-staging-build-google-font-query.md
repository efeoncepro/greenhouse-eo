# ISSUE-178 — Staging no compila: parser de Google Fonts en Turbopack

## Ambiente

staging, proyecto Vercel `greenhouse-eo`, rama `develop`.

## Detectado

2026-10-04, correo Vercel aportado por el operador; logs verificados directamente.

## Síntoma

El deployment `dpl_FMfd8rTqcdR68dWDgSGXPC8tzWrW`, commit `b9f7e314f`, falla en
`pnpm build`: Next.js 16.1.1/Turbopack emite 25 errores al compilar Geist.

## Causa raíz

`next/font/google` consulta Google Fonts durante la compilación. Las URLs de Geist devueltas
contienen query parameters (`kit`, `skey`, `v`) y el reemplazador interno de fuentes falla con
`next/font/google queries have exactly one entry`; luego no resuelve su módulo virtual.
La disponibilidad del build depende de la respuesta mutable de un proveedor externo.
Reintentar o limpiar caché no elimina esa dependencia.

## Impacto

La actualización de staging queda bloqueada; el alias conserva el deployment anterior
`dpl_68f2mdqkApHTyoqct2p9awNLYfJu` (`afd700695`, READY). Su endpoint de sesión responde 200.
Producción permanece en `7182af769`, READY, login HTTP 200.

## Solución

Triage: `issue-only fix`. Sustituir el transporte de las fuentes por `next/font/local` con
assets versionados, sin cambiar roles, pesos, variables CSS, copy ni estructura de UI.
Eliminar la dependencia externa en las tres familias que hoy usan el loader de Google:
Geist/Poppins del layout y Bricolage de la excepción de login ya aprobada.
Añadir guard de regresión y verificar el build, el contrato tipográfico y staging.
ADR aplicable: `EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md`: el producto posee
la traducción al motor, no redefine valores de diseño. Canon de carga: §3 de
`GREENHOUSE_DESIGN_TOKENS_V1.md` y `cloud-infrastructure/VERCEL.md`.

## Verificación

- [x] Error y alias anterior verificados por Vercel CLI.
- [x] `pnpm build:fast` PASS completo: Turbopack, TypeScript y generación de páginas. No se invocan loaders remotos.
- [x] 90 pruebas focales PASS (guard, tipografía y elevación); lint focal PASS. El guard rechaza los dos imports originales y detecta assets faltantes/corruptos.
- [x] Los cinco WOFF2 versionados tienen exactamente el SHA-256 de los archivos servidos por staging anterior; acentos ES/PT-BR, euro y cifras presentes.
- [x] Staging READY con la corrección; fuentes servidas y cargadas en navegador.
- [x] Sesión anónima/login sanos; producción sin promover.

### Evidencia local y no regresión

- Build: `.tmp/issue-178/local-build.log`; lint focal PASS, `git diff --check` PASS.
- GVC: `.captures/2026-10-04T16-18-36_auth-login-v4` — PASS, 1440/1280/390 px, seis frames.
- Browser/font network: `.captures/issue-178-before/evidence.json` y
  `.captures/issue-178-local/evidence.json`; HTTP 200, cero page errors, sin overflow horizontal.
- `/api/auth/session` local: 200. Esto verifica la superficie anónima, no un login humano completo.
- Los cinco WOFF2 locales coinciden por SHA con los servidos por el deployment anterior; las
  métricas de Geist coinciden en 225/225 glifos comparados. PDF y contratos de MUI intactos.
- GVC anónimo en staging no inyecta bypass y terminó en la protección Vercel. La referencia
  anterior se obtuvo por Playwright enfocado, header sólo para el origen exacto y sin sesión humana.
- QA/doc gates se ejecutaron con alcance propio; el árbol contiene WIP ajeno. Context strict:
  0 errores/0 warnings tras rotación canónica de una entrada del changelog. `project_context.md`
  ya apunta al contrato tipográfico; no requiere otro delta. No cambia el manual de usuario.
- Rollback: conservar como referencia `dpl_68f2mdqkApHTyoqct2p9awNLYfJu`. Revertir este cambio
  restaura el loader remoto y su riesgo; no retirar el guard para ocultar un asset corrupto.

### Evidencia del despliegue

- Commit publicado: `63c9b875ba541cc90e548e1ab7b12a1812227519`; incluye los tres commits
  documentales previos autorizados por el operador. Pre-push completo PASS, sin bypass.
- Vercel: `dpl_tHV1tw9veEnafX4dkLmxuEM5uwSE`, target `staging`, **READY**;
  build completo en 5 minutos. El alias `dev-greenhouse.efeoncepro.com` apunta a ese ID.
- `.captures/issue-178-staging/evidence.json`: login HTTP 200 en 1440/390 px, cinco
  WOFF2 HTTP 200, Geist 400/800 y Poppins 600/700/800 cargados explícitamente, Bricolage
  500 cargada; cero page errors, cero peticiones Google Fonts y sin overflow horizontal.
- `/api/auth/session`: HTTP 200, sesión anónima vacía. No se ensayó login humano.
- Producción conserva `dpl_A2HgtQRfKTcC6isrPitjHh4Gr47U`, target `production`, READY.
- GitHub: smoke Playwright y cuatro workflows de gobernanza/contratos PASS.

## Estado

resolved — 2026-10-04, corrección publicada y verificada en staging. Producción sin promover.

## Relacionado

- `src/app/layout.tsx`
- `src/views/login/login-fonts.ts`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- https://vercel.com/efeonce-7670142f/greenhouse-eo/FMfd8rTqcdR68dWDgSGXPC8tzWrW
