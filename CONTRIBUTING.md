# Greenhouse — Flujo de desarrollo

## Ambientes

Configuracion esperada en Vercel:
- `main` -> Produccion
- `develop` -> Staging
- `feature/*` y `fix/*` -> Preview deployments efimeros por rama o PR

Dominios objetivo:
- Produccion: `greenhouse.efeonce.com`
- Staging: `dev.greenhouse.efeonce.com`

Notas:
- `Staging` debe configurarse como `Custom Environment` en Vercel y asociarse a la branch `develop`.
- `feature/*` y `fix/*` no deben usar dominios persistentes; usan URLs preview efimeras.

## Flujo para cada tarea

1. Actualizar `develop`:

```bash
git checkout develop
git pull
```

2. Crear rama de trabajo:

```bash
git checkout -b feature/nombre-descriptivo
```

3. Desarrollar y validar:

```bash
npx pnpm build
# o
npx pnpm lint
```

Regla de estructura:
- si el cambio crea una pieza reutilizable de UI Greenhouse, debe vivir en `src/components/greenhouse/*`
- si el cambio es especifico de una pantalla o modulo, debe vivir en `src/views/greenhouse/<modulo>/*`
- evitar dejar componentes genericos atrapados dentro de una vista concreta

4. Commit:

```bash
git commit -m "feat: add greenhouse shared metrics cards"
```

5. Push:

```bash
git push -u origin feature/nombre-descriptivo
```

6. Crear Pull Request:
- `feature/*` o `fix/*` -> `develop`

7. Revisar Preview Deployment en Vercel:
- validar UI
- validar rutas
- validar variables necesarias

8. Merge a `develop`:
- actualiza `Staging`
- revisar `dev.greenhouse.efeonce.com`

9. Cuando `Staging` esta estable:
- crear PR `develop` -> `main`

10. Merge a `main`:
- actualiza Produccion
- validar `greenhouse.efeonce.com`

## Naming de ramas

- `feature/*` -> funcionalidades nuevas
- `fix/*` -> correcciones de bugs
- `hotfix/*` -> correcciones urgentes de produccion
- `docs/*` -> documentacion
- `chore/*` -> configuracion, dependencias, scripts o ajustes no funcionales

## Convencion de commits

- `feat:` nueva funcionalidad
- `fix:` correccion de bug
- `chore:` configuracion o dependencias
- `docs:` documentacion
- `style:` cambios visuales o UI
- `refactor:` reorganizacion interna sin cambio funcional esperado

## Reglas de validacion

- No hacer `push` como cambio cerrado si no hubo validacion razonable.
- Para cambios de UI, layout o rutas, revisar tambien el preview deployment.
- Para cambios de deploy, auth, variables o data access, validar en `Staging` antes de promover a `main`.

## Archivos sensibles

Nunca subir:
- `.env.local`
- `.env*.local`
- `*.pem`
- `service-account*.json`
- keys, tokens o secrets de proveedores

## Secretos y variables

- Las variables deben cargarse por ambiente en Vercel:
  - `Development`
  - `Preview`
  - `Staging`
  - `Production`
- Si una feature nueva necesita variable, debe existir en `Preview` y `Staging` antes de llegar a `main`.

## Regla final

El camino normal del proyecto es:
- rama de trabajo -> Preview -> `develop` -> Staging -> `main` -> Produccion
