# Handoff.md

## Uso
Este archivo es el estado operativo entre agentes. Debe priorizar claridad y continuidad. No escribir narrativas largas.
Si un cambio fue dejado sin `commit` o sin `push` por falta de verificacion, eso debe quedar escrito aqui de forma explicita.

## Formato Recomendado

### Fecha
- YYYY-MM-DD HH:MM zona horaria

### Agente
- Nombre del agente o persona

### Objetivo del turno
- Que se hizo o que se intento resolver

### Rama
- Rama usada
- Rama objetivo del merge

### Ambiente objetivo
- Development, Preview o Production

### Archivos tocados
- Lista corta de archivos relevantes

### Verificacion
- Comandos ejecutados
- Resultado
- Lo que no se pudo verificar

### Riesgos o pendientes
- Riesgos activos
- Decisiones bloqueadas
- Proximo paso recomendado

---

## Estado Actual

### Fecha
- 2026-03-09 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Inicializar y subir `starter-kit` como repo independiente.
- Diagnosticar `404 NOT_FOUND` en Vercel.
- Confirmar configuracion correcta de despliegue.
- Crear base documental multi-agente.
- Corregir encoding de la especificacion externa y alinearla con la documentacion operativa.
- Reemplazar el README default por uno alineado a Greenhouse.
- Crear `develop` y documentar el flujo `Preview -> Staging -> Production`.
- Montar el primer shell Greenhouse sobre el starter-kit.
- Integrar la primera capa real de auth con `next-auth`.
- Integrar el branding base real del portal en navegacion y favicon.
- Corregir el flujo de limpieza local para evitar bloqueos de `.next` en Windows.
- Corregir la operacion Git para evitar `index.lock` por comandos mutantes en paralelo.

### Rama
- Rama usada: `feature/greenhouse-shell`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Preview de feature branch y luego `Staging`

### Archivos tocados
- `.gitattributes`
- `.gitignore`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `Handoff.md`
- `changelog.md`
- `next.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- `project_context.md`
- `package.json`
- `tsconfig.json`
- `scripts/clean-paths.mjs`
- `scripts/run-next-build.mjs`
- `scripts/run-next-start.mjs`
- `README.md`
- `.env.example`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/lib/auth.ts`
- `src/components/auth/AuthSessionProvider.tsx`
- `src/types/next-auth.d.ts`
- `src/app/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/proyectos/page.tsx`
- `src/app/(dashboard)/sprints/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/data/navigation/verticalMenuData.tsx`
- `src/data/navigation/horizontalMenuData.tsx`
- `src/configs/themeConfig.ts`
- `src/views/Login.tsx`
- `src/views/greenhouse/*`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/@core/svg/Logo.tsx`
- `public/branding/avatar.png`
- `public/branding/logo-full.svg`
- `public/branding/logo-negative.svg`
- `../Greenhouse_Portal_Spec_v1.md`

### Verificacion
- `git push -u origin main --force`: correcto
- `git checkout -b develop` y `git push -u origin develop`: correcto
- `npx pnpm install --frozen-lockfile`: correcto
- `npx pnpm build`: correcto
- `npx pnpm build` sobre `feature/greenhouse-shell`: correcto con rutas `/dashboard`, `/proyectos`, `/sprints`, `/settings`
- `npx pnpm add next-auth@4.24.13`: correcto
- `npx pnpm build` con `next-auth` integrado: correcto
- `npx pnpm build` con branding Greenhouse en navegacion y favicon: correcto
- `npx pnpm build` ejecutado varias veces seguidas en Windows local con `distDir` dinamico: correcto
- Verificacion manual en Vercel: correcta despues de cambiar `Framework Preset` a `Next.js`
- Lectura y normalizacion de `../Greenhouse_Portal_Spec_v1.md`: correcta
- Reemplazo de `README.md`: correcto, alineado con la especificacion y el contexto operativo actual
- Documentacion de staging y custom environment: correcta y alineada con Vercel
- `git config --local core.autocrlf false`: correcto
- `git config --local core.eol lf`: correcto
- `git add .gitattributes` y `git add .`: correctos, sin warnings `LF/CRLF`
- Vercel CLI enlazado a `greenhouse-eo`: correcto
- `staging` confirmado en Vercel y asociado a `develop`: correcto
- Variables `GCP_PROJECT` y `GOOGLE_APPLICATION_CREDENTIALS_JSON` cargadas en `Development`, `staging` y `Production`: correcto

### Riesgos o pendientes
- El shell Greenhouse actual usa datos mock y todavia no consume BigQuery.
- Login ya autentica con `next-auth`, pero contra credenciales demo configurables por env.
- La especificacion define un target productivo mas avanzado que el estado actual del starter kit.
- Si se modifican rutas o `basePath`, validar en Vercel de nuevo.
- El branding actual usa assets temporales entregados por el usuario; falta reemplazo por versiones finales de diseno.
- El repo sigue dentro de OneDrive; si otro proceso externo bloquea archivos, la limpieza ahora reintenta antes de fallar, pero no elimina el riesgo sistémico del sync.
- En Windows local, `build` ya no reutiliza la misma carpeta de salida; `start` usa la ultima ruta registrada en `.next-build-dir`.
- La configuracion Git local que evita warnings vive en `.git/config`; si otro agente trabaja en otra maquina y reaparecen avisos, debe revisar `core.autocrlf` contra `.gitattributes`.

### Proximo paso recomendado
- Crear las primeras API routes server-side para KPIs y proyectos.
- Reemplazar la validacion demo por modelo multi-tenant real de clientes.
- Conectar el shell actual a datos reales de BigQuery.
- Crear en Vercel el `Custom Environment` `Staging`, asociarlo a `develop` y, si aplica, enlazar `dev.greenhouse.efeonce.com`.
