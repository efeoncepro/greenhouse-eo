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

### Rama
- Rama usada: `feature/greenhouse-shell`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Preview de feature branch y luego `Staging`

### Archivos tocados
- `.gitignore`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `Handoff.md`
- `changelog.md`
- `next.config.ts`
- `project_context.md`
- `README.md`
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
- `../Greenhouse_Portal_Spec_v1.md`

### Verificacion
- `git push -u origin main --force`: correcto
- `git checkout -b develop` y `git push -u origin develop`: correcto
- `npx pnpm install --frozen-lockfile`: correcto
- `npx pnpm build`: correcto
- `npx pnpm build` sobre `feature/greenhouse-shell`: correcto con rutas `/dashboard`, `/proyectos`, `/sprints`, `/settings`
- Verificacion manual en Vercel: correcta despues de cambiar `Framework Preset` a `Next.js`
- Lectura y normalizacion de `../Greenhouse_Portal_Spec_v1.md`: correcta
- Reemplazo de `README.md`: correcto, alineado con la especificacion y el contexto operativo actual
- Documentacion de staging y custom environment: correcta a nivel de repo; falta configuracion manual en Vercel Dashboard

### Riesgos o pendientes
- El shell Greenhouse actual usa datos mock y todavia no consume BigQuery.
- Login sigue siendo una entrada demo sin auth real.
- La especificacion define un target productivo mas avanzado que el estado actual del starter kit.
- `Staging` aun no existe en Vercel hasta que se cree manualmente el `Custom Environment`.
- Si se modifican rutas o `basePath`, validar en Vercel de nuevo.

### Proximo paso recomendado
- Implementar `next-auth` y proteger las rutas del dashboard.
- Crear las primeras API routes server-side para KPIs y proyectos.
- Conectar el shell actual a datos reales de BigQuery.
- Crear en Vercel el `Custom Environment` `Staging`, asociarlo a `develop` y, si aplica, enlazar `dev.greenhouse.efeonce.com`.
