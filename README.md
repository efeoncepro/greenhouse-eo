# Greenhouse Portal

Portal de clientes de Efeonce construido sobre Vuexy + Next.js. Este repositorio contiene la base operativa del producto Greenhouse y ya no debe tratarse como un starter genérico.

## Objetivo

Greenhouse busca darle a cada cliente acceso a:
- métricas ICO
- estado de su operación creativa
- dashboards de proyectos y sprints
- una capa de transparencia conectada al sistema Greenhouse

La especificación funcional principal está en:
- `../Greenhouse_Portal_Spec_v1.md`

La documentación operativa interna del repo está en:
- `AGENTS.md`
- `Handoff.md`
- `project_context.md`
- `changelog.md`

## Alcance del Repo

- Este repo versiona solo `starter-kit`.
- `full-version` vive fuera del repo y se usa como referencia de contexto, referencia visual y referencia funcional.
- No se debe subir `full-version` a este repositorio.
- Si se toman componentes desde `full-version`, deben adaptarse al contexto Greenhouse antes de integrarse.

## Estado Actual

Estado hoy:
- base técnica funcionando en Vercel
- starter kit de Vuexy todavía visible en varias rutas y componentes
- deploy operativo en `greenhouse-eo.vercel.app`
- documentación multi-agente ya instalada

Rutas actuales:
- `/home`
- `/about`
- `/login`

Rutas objetivo del producto:
- `/dashboard`
- `/proyectos`
- `/proyectos/[id]`
- `/sprints`
- `/settings`

Brecha visible:
- falta autenticación real con `NextAuth.js`
- falta integración server-side con BigQuery
- faltan API Routes de negocio
- falta reemplazar branding y navegación demo por Greenhouse

## Stack

- Next.js 16.1.1
- React 19.2.3
- TypeScript 5.9.3
- MUI 7.x
- App Router
- PNPM
- Vercel para deploy

Stack objetivo adicional:
- `next-auth`
- `@google-cloud/bigquery`

## Arquitectura Objetivo

La app debe operar así:

```text
Cliente autenticado
  -> request
Next.js App Router / API Routes
  -> query server-side filtrada por client_id
BigQuery
  -> resultados
UI del portal
```

Reglas clave:
- BigQuery no se consulta desde el browser.
- Las queries deben ejecutarse server-side.
- El modelo es multi-tenant por `client_id`.
- La especificación funcional prevalece como norte del producto salvo decisión documentada.

## Comandos

Instalación:

```bash
npx pnpm install --frozen-lockfile
```

Desarrollo:

```bash
npx pnpm dev
```

Build:

```bash
npx pnpm build
```

Lint:

```bash
npx pnpm lint
```

## Variables de Entorno

Actuales en `.env.example`:
- `NEXT_PUBLIC_APP_URL`
- `BASEPATH`

Objetivo funcional:
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GCP_PROJECT`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

Notas:
- `next.config.ts` usa `BASEPATH` como `basePath`.
- Si `BASEPATH` se define innecesariamente en Vercel, la app deja de vivir en `/`.
- Toda variable nueva debe documentarse también en `project_context.md`.

## Deploy

Repositorio:
- `https://github.com/efeoncepro/greenhouse-eo.git`

Entorno actual:
- Vercel
- dominio actual: `greenhouse-eo.vercel.app`
- dominio objetivo: `greenhouse.efeonce.com`

Configuración importante en Vercel:
- `Framework Preset`: `Next.js`
- `Root Directory`: vacío o equivalente al repo raíz
- `Output Directory`: vacío

Nota operativa:
- hubo un `404 NOT_FOUND` inicial por tener `Framework Preset` en `Other`
- ese problema ya fue corregido

## Flujo de Trabajo

Ramas:
- `main`: producción
- `develop`: integración y prueba compartida
- `feature/*`, `fix/*`, `docs/*`: trabajo aislado por agente
- `hotfix/*`: correcciones de producción

Camino normal:
1. Crear rama desde `develop`.
2. Implementar cambio pequeño y verificable.
3. Validar con `npx pnpm build`, `npx pnpm lint` o validación manual suficiente.
4. Hacer push y revisar Preview Deployment en Vercel si el cambio afecta UI, rutas, layout o deploy.
5. Mergear a `develop`.
6. Validar en entorno compartido.
7. Mergear a `main`.
8. Confirmar deploy a `Production`.

## Estructura Relevante

- `src/app/layout.tsx`: layout raíz
- `src/app/(dashboard)/layout.tsx`: layout principal del dashboard
- `src/components/layout/**`: piezas de navegación y shell
- `src/configs/**`: tema y configuración visual
- `src/data/navigation/**`: definición del menú
- `src/app/api/**`: aquí debe vivir la capa de endpoints server-side del producto

## Referencias de Trabajo

Leer antes de cambios importantes:
- `AGENTS.md`
- `Handoff.md`
- `project_context.md`
- `../Greenhouse_Portal_Spec_v1.md`

Usar como referencia de implementación:
- `../full-version`

## Próximos Pasos Recomendados

1. Crear `src/app/page.tsx` para que la raíz no dependa solo del redirect.
2. Reemplazar rutas demo por las rutas objetivo del portal.
3. Integrar autenticación multi-tenant.
4. Instalar e integrar BigQuery server-side.
5. Implementar el dashboard principal y las primeras API Routes del MVP.
