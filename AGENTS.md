# AGENTS.md

## Objetivo
Este repositorio es la base operativa de Greenhouse sobre Vuexy + Next.js. Aqui trabajaran multiples agentes y personas. Este documento define reglas obligatorias para evitar conflictos, duplicidad de trabajo y despliegues rotos.

## Alcance
- Este repo corresponde solo a `starter-kit`.
- `full-version` debe usarse como referencia de contexto para entender componentes, patrones, flujos y alcance funcional esperado.
- No versionar `full-version` dentro de este repo.
- Cualquier copia de componentes desde `full-version` debe ser intencional, revisada y adaptada al contexto Greenhouse antes de integrarse.

## Prioridades
1. Mantener el proyecto desplegable en Vercel.
2. Evitar romper la base de Vuexy mientras se adapta a Greenhouse.
3. Dejar handoff claro para el siguiente agente.
4. No mezclar refactors grandes con cambios funcionales pequenos.

## Reglas Operativas

### 1. Antes de cambiar codigo
- Leer `project_context.md`.
- Leer `Handoff.md` para ver trabajo en curso, riesgos y proximos pasos.
- Leer la especificacion externa `../Greenhouse_Portal_Spec_v1.md` cuando el cambio afecte producto, autenticacion, data, rutas principales o arquitectura.
- Revisar `git status` y no asumir que el arbol esta limpio.
- Confirmar si el cambio toca layout global, navegacion, autenticacion, tema o deploy. Si toca alguno, documentarlo en `Handoff.md`.

### 2. Limites de trabajo
- Un agente debe trabajar un objetivo claro por vez.
- No mezclar cambios de producto, infraestructura y refactor en un mismo lote sin necesidad real.
- Si el cambio es exploratorio o incompleto, no dejarlo a medias sin actualizar `Handoff.md`.

### 3. Coordinacion entre agentes
- El agente que toma una tarea debe dejar constancia breve en `Handoff.md` antes de cerrar su turno si:
  - modifico archivos de alto impacto
  - dejo deuda tecnica abierta
  - detecto una decision pendiente del usuario
  - cambio supuestos del proyecto
- Si dos agentes pueden tocar la misma zona, prevalece el ultimo handoff documentado, no la memoria conversacional.

### 4. Regla de cambios minimos
- Preferir cambios pequenos, verificables y reversibles.
- Si un archivo base de Vuexy requiere cambios amplios, separar primero la adaptacion funcional y despues el cleanup.
- Evitar renombrar masivamente archivos o mover carpetas sin una razon fuerte.

### 5. Regla de verificacion
- Todo cambio debe intentar validar al menos una de estas rutas:
  - `pnpm build`
  - `pnpm lint`
  - prueba manual local o en preview de Vercel
- Si no se pudo validar, registrar exactamente que no se valido y por que en `Handoff.md`.

### 6. Regla de despliegue
- El proyecto debe conservar configuracion compatible con Vercel.
- `Framework Preset` en Vercel debe ser `Next.js`.
- No depender de configuraciones manuales opacas en Vercel si el repo puede expresar el comportamiento.
- Si un cambio altera rutas raiz, redirects, `basePath` o variables de entorno, documentarlo en `project_context.md` y `Handoff.md`.

### 7. Regla de documentacion viva
- Actualizar `changelog.md` cuando haya un cambio real en comportamiento, estructura, flujo de trabajo o despliegue.
- Actualizar `project_context.md` cuando cambie arquitectura, stack, rutas clave, decisiones o restricciones.
- No usar estos documentos como dumping ground. Deben quedar legibles.

### 8. Regla de line endings
- El repositorio debe versionar archivos de texto con finales de linea `LF`.
- Mantener `.gitattributes` como fuente de verdad para la politica de `EOL`.
- No forzar conversiones masivas a `CRLF`.
- Si reaparecen warnings de `LF/CRLF`, revisar primero `.gitattributes` y la configuracion local de `core.autocrlf`.

## Convenciones de Trabajo

### Branching y commits
- `main` es solo para codigo listo para produccion.
- `develop` debe funcionar como rama de integracion y rama asociada a `Staging` en Vercel.
- Todo trabajo de agentes debe salir desde rama propia salvo cambios minimos de emergencia.
- Formato recomendado de ramas:
  - `feature/<owner>-<tema>`
  - `fix/<owner>-<tema>`
  - `hotfix/<owner>-<tema>`
  - `docs/<owner>-<tema>`
- Evitar trabajar directo sobre `main`.
- Evitar trabajar directo sobre `develop` salvo integracion, resolucion de conflictos o consolidacion final.
- No hacer `commit` ni `push` hasta tener evidencia razonable de que el cambio esta sano.
- Validacion minima esperada antes de `commit` o `push`:
  - `npx pnpm build`, o
  - `npx pnpm lint`, o
  - validacion manual suficiente cuando el cambio no rompa build pero afecte UI o deploy
- Si no se pudo validar, no hacer `push` como si el cambio estuviera cerrado. Dejarlo explicitado en `Handoff.md`.
- Mensajes de commit:
  - `feat: ...`
  - `fix: ...`
  - `refactor: ...`
  - `docs: ...`
  - `chore: ...`

### Flujo por ramas
- `feature/*` y `fix/*`:
  - sirven para trabajo aislado por agente
  - cada push debe generar Preview Deployment en Vercel
  - no deben considerarse aptas para produccion por defecto
- `develop`:
  - integra trabajo ya validado en preview individual
  - es la rama de prueba compartida del proyecto
  - debe mapear al `Custom Environment` `Staging` en Vercel
  - debe mantenerse funcional y demostrable
- `main`:
  - refleja el estado productivo
  - solo recibe cambios validados previamente en `develop` o hotfixes justificados
- `hotfix/*`:
  - salen desde `main`
  - corrigen produccion
  - deben validarse en preview antes de volver a `main`
  - despues de cerrar el hotfix, sincronizar tambien con `develop`

### Regla de merge
- No mergear una rama si no esta claro:
  - que problema resuelve
  - como se valido
  - que riesgo introduce
- Antes de mergear a `develop`:
  - validar build o lint
  - revisar preview deployment de la rama si el cambio afecta UI o rutas
- Antes de mergear a `main`:
  - el cambio ya debio haber pasado por `develop`, salvo hotfix
  - revisar preview o entorno de prueba compartido
  - confirmar que no hay pendientes abiertos en `Handoff.md` para esa zona

### Ambientes y Vercel
- `Production` en Vercel debe estar asociado a `main`.
- `Staging` en Vercel debe ser un `Custom Environment` asociado a `develop`.
- `Preview` en Vercel debe usarse para:
  - ramas `feature/*`
  - ramas `fix/*`
  - ramas `hotfix/*` antes de promocion
- Si se define un dominio de staging, debe apuntar al `Custom Environment` de `develop`, no a ramas personales.
- No usar Production como entorno de prueba manual.

### Variables por ambiente
- Separar variables en Vercel por entorno:
  - `Development`: trabajo local
  - `Preview`: feature branches, fix branches y hotfix
  - `Staging`: branch `develop`
  - `Production`: solo main
- No crear una variable solo en Production si el cambio necesita validacion previa en Preview o Staging.
- Toda variable nueva debe indicar:
  - nombre
  - proposito
  - en que entornos debe existir
  - valor esperado o formato

### Regla de promocion
- El camino normal es:
  - rama de trabajo
  - Preview Deployment
  - merge a `develop`
  - validacion compartida en `Staging`
  - merge a `main`
  - deploy a Production
- Si un cambio no paso por ese camino, debe existir razon explicita en `Handoff.md`.

### Archivos sensibles
- Tratar con cuidado:
  - `next.config.ts`
  - `package.json`
  - `pnpm-lock.yaml`
  - `src/app/layout.tsx`
  - `src/app/(dashboard)/layout.tsx`
  - `src/components/layout/**`
  - `src/configs/**`
- Si alguno cambia, dejar nota en `Handoff.md`.

### Variables de entorno
- No introducir variables nuevas sin documentarlas en `project_context.md`.
- Mantener `.env.example` alineado con cualquier variable requerida por el proyecto.
- No asumir que Vercel tiene variables cargadas.

## Checklist de Cierre de Turno
- Cambios acotados y entendibles.
- Verificacion ejecutada o limitacion documentada.
- Ningun `commit` o `push` hecho sin revisar que el cambio este estable para su alcance.
- Rama de trabajo y destino de merge claros.
- `Handoff.md` actualizado si hubo impacto real.
- `changelog.md` actualizado si hubo cambio relevante.
- `project_context.md` actualizado si cambio la arquitectura, el deploy o los supuestos.

## Regla Final
Si una decision no esta documentada y puede afectar a otros agentes, aun no esta cerrada.
