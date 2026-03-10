# project_context.md

## Resumen
Proyecto base de Greenhouse construido sobre el starter kit de Vuexy para Next.js con TypeScript, App Router y MUI. El objetivo no es mantener el producto como template, sino usarlo como base operativa para evolucionarlo hacia el portal Greenhouse.

## Especificacion Fuente
- Documento fuente actual: `../Greenhouse_Portal_Spec_v1.md`
- Ese markdown define el target funcional del portal y debe usarse como referencia primaria de producto.
- Si existe conflicto entre el estado actual del starter kit y la especificacion, prevalece la especificacion como norte de implementacion salvo decision documentada.

## Alcance del Repositorio
- Este repositorio contiene solo `starter-kit`.
- La carpeta `full-version` existe fuera de este repo como referencia de contexto, referencia visual y referencia funcional.
- `full-version` debe servir para entender hacia donde debe evolucionar `starter-kit`.
- No se debe mezclar automaticamente codigo de `full-version` dentro de este repo sin adaptacion y revision.

## Stack Actual
- Next.js 16.1.1
- React 19.2.3
- TypeScript 5.9.3
- MUI 7.x
- App Router en `src/app`
- PNPM lockfile presente
- `.gitattributes` fija archivos de texto en `LF` para estabilizar el trabajo en Windows

## Target Definido por la Especificacion
- Portal de clientes multi-tenant para Efeonce Greenhouse
- BigQuery como fuente principal de datos consumida server-side
- NextAuth.js para autenticacion
- API Routes en App Router para exponer datos filtrados por cliente
- Dominio objetivo final: `greenhouse.efeonce.com`
- Dataset propio del portal: `efeonce-group.greenhouse`

## Comandos Utiles
- `npx pnpm install --frozen-lockfile`
- `npx pnpm dev`
- `npx pnpm build`
- `npx pnpm lint`
- `npx pnpm clean`

## Estructura Base
- `src/app/layout.tsx`: layout raiz
- `src/app/(dashboard)/layout.tsx`: layout principal autenticado o de dashboard
- `src/app/(dashboard)/dashboard/page.tsx`: dashboard principal actual
- `src/app/(dashboard)/proyectos/page.tsx`: vista base de proyectos
- `src/app/(dashboard)/sprints/page.tsx`: vista base de sprints
- `src/app/(dashboard)/settings/page.tsx`: vista base de settings
- `src/app/(blank-layout-pages)/login/page.tsx`: login actual
- `src/app/api/dashboard/kpis/route.ts`: primer endpoint real con datos de BigQuery
- `src/components/layout/**`: piezas del layout
- `src/configs/**`: configuracion de tema y color
- `src/data/navigation/**`: definicion de menu
- `src/lib/bigquery.ts`: cliente reusable de BigQuery
- `src/lib/dashboard/get-dashboard-overview.ts`: capa de datos server-side del dashboard

## Estado de Rutas
- Existe `/dashboard`
- Existe `/proyectos`
- Existe `/sprints`
- Existe `/settings`
- Existe `/login`
- Existe `src/app/page.tsx`
- La raiz `/` redirige a `/dashboard`
- `/home` y `/about` quedaron como rutas de compatibilidad que redirigen a la nueva experiencia

## Rutas Objetivo del Producto
- `/dashboard`: dashboard principal con KPIs ICO
- `/proyectos`: lista de proyectos del cliente
- `/proyectos/[id]`: detalle de proyecto con tareas y sprint
- `/sprints`: vista de sprints y velocidad
- `/settings`: perfil y preferencias del cliente

## Brecha Actual vs Objetivo
- El shell principal ya fue adaptado a Greenhouse con rutas reales y branding base.
- `next-auth` ya esta integrado con credenciales demo, session JWT y proteccion base del dashboard.
- `@google-cloud/bigquery` ya esta integrado con un cliente server-side reusable.
- Ya existe un primer data flow real: `/api/dashboard/kpis` consulta BigQuery y alimenta el dashboard.
- El alcance multi-tenant actual se apoya en `DEMO_CLIENT_PROJECT_IDS`; aun falta una fuente real de clientes.
- Aun no existen `/api/projects`, `/api/sprints` ni el detalle `/proyectos/[id]`.

## Deploy
- Hosting principal: Vercel
- Repositorio remoto: `https://github.com/efeoncepro/greenhouse-eo.git`
- Configuracion importante en Vercel:
  - `Framework Preset`: `Next.js`
  - `Root Directory`: vacio o equivalente al repo raiz
  - `Output Directory`: vacio
- Se detecto un problema inicial de `404 NOT_FOUND` por tener `Framework Preset` en `Other`. Ya fue resuelto.

## Estrategia de Ramas y Ambientes
- `main`:
  - rama productiva
  - su deploy en Vercel corresponde a `Production`
- `develop`:
  - rama de integracion compartida
  - debe usarse como entorno de prueba funcional del equipo
  - esta asociada al `Custom Environment` `staging` en Vercel
- `feature/*` y `fix/*`:
  - ramas personales o por tarea
  - cada push debe validarse en `Preview`
- `hotfix/*`:
  - salen desde `main`
  - sirven para corregir produccion con el menor alcance posible
  - deben volver tanto a `main` como a `develop`

## Logica de Trabajo Recomendada
1. Crear rama desde `develop` para trabajo normal o desde `main` para hotfix.
2. Implementar cambio pequeno y verificable.
3. Validar localmente con `npx pnpm build`, `npx pnpm lint` o prueba manual suficiente.
4. Hacer push de la rama y revisar su Preview Deployment en Vercel cuando el cambio afecte UI, rutas, layout o variables.
5. Mergear a `develop` cuando el cambio ya este sano en su preview individual.
6. Hacer validacion compartida sobre `Staging` asociado a `develop`.
7. Mergear a `main` solo cuando el cambio este listo para produccion.
8. Confirmar deploy a `Production` en Vercel.

## Regla de Entornos
- `Development`: uso local de cada agente
- `Preview`: validacion remota de ramas de trabajo
- `Staging`: entorno persistente controlado asociado a `develop`
- `Production`: estado estable accesible para usuarios finales

## Regla de Variables en Vercel
- Toda variable debe definirse conscientemente por ambiente.
- No asumir que una variable de `Preview` o `Staging` existe en `Production`, ni al reves.
- Si una feature necesita variable nueva, primero debe existir en `Preview` y `Staging` antes de promocionarse a `main`.
- Mantener `.env.example` alineado con las variables requeridas.

## Variables de Entorno
- `.env.example` define:
  - `NEXT_PUBLIC_APP_URL`
  - `BASEPATH`
  - `GCP_PROJECT`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON`
  - `DEMO_CLIENT_ID`
  - `DEMO_CLIENT_EMAIL`
  - `DEMO_CLIENT_PASSWORD`
  - `DEMO_CLIENT_NAME`
  - `DEMO_CLIENT_PROJECT_IDS`
- `next.config.ts` usa `process.env.BASEPATH` como `basePath`
- Riesgo operativo: si `BASEPATH` se configura en Vercel sin necesitarlo, la app deja de vivir en `/`

## Variables de Entorno Objetivo
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GCP_PROJECT`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` y `GCP_PROJECT` ya existen en Vercel para `Development`, `staging` y `Production`.
- `NEXTAUTH_SECRET` y `NEXTAUTH_URL` aun no estan integradas al starter kit actual.

## Multi-Tenant Actual
- Dataset creado: `efeonce-group.greenhouse`
- Tabla creada: `greenhouse.clients`
- Tenant bootstrap cargado: `greenhouse-demo-client`
- Documento de referencia: `MULTITENANT_ARCHITECTURE.md`
- DDL versionado: `bigquery/greenhouse_clients.sql`

## Decisiones Actuales
- Mantener cambios iniciales pequenos y reversibles.
- Usar `full-version` como fuente de contexto y referencia para construir la version Greenhouse dentro de `starter-kit`.
- Usar `../Greenhouse_Portal_Spec_v1.md` como especificacion funcional principal.
- No versionar `full-version` como parte de este repo.
- Favorecer despliegues frecuentes y verificables en Vercel.
- Usar `develop` como rama de `Staging` y `main` como rama de produccion.
- Documentar toda decision que afecte layout, rutas, deploy o variables de entorno.
- Mantener la politica de finales de linea en `LF` y evitar depender de conversiones automaticas de Git en Windows.
- En Windows local, `build` usa un `distDir` dinamico bajo `.next-local/` para evitar fallos `EPERM` al reutilizar la misma salida dentro de OneDrive.
- Evitar comandos Git mutantes en paralelo para no generar `index.lock`.

## Deuda Tecnica Visible
- El proyecto ya tiene shell Greenhouse, pero aun no refleja la identidad funcional final.
- La autenticacion actual es demo y debe reemplazarse por modelo multi-tenant real.
- Falta mover el scope de cliente a una fuente real como `greenhouse.clients`.
- Faltan el detalle de proyecto y los data flows reales definidos en la especificacion.

## Supuestos Operativos
- El repo puede estar siendo editado por varios agentes y personas en paralelo.
- `Handoff.md` es la fuente de continuidad entre turnos.
- `AGENTS.md` define las reglas del repositorio y prevalece como guia operativa local.
