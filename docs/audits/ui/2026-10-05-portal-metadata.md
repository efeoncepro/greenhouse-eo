# Títulos del portal — 2026-10-05

El operador aprobó `Efeonce | Greenhouse` como título general y títulos contextuales con Efeonce primero.
Cambio de copy/metadata; no introduce pantalla, composición ni interacción, por lo que no requiere wireframe.

## Implementación y alcance

- Título raíz: `Efeonce | Greenhouse` en `src/app/layout.tsx`.
- Login: `Efeonce | Acceder`; descripción alineada con la cuenta corporativa de Efeonce.
- Layout `/proyectos`: `Efeonce | Proyectos`, heredado también por el detalle.
- Resumen `/finance`: `Efeonce | Finanzas`.
- Labels de sección derivados de la navegación existente; inglés: `Sign in`, `Projects`, `Finance`.
- Helper y copy de acceso compartidos en `src/lib/copy/portal-metadata.ts`.

No se agrega plantilla global: las otras secciones tienen overrides propios y se evita duplicar marcas.
La descripción raíz permanece vigente. Canon: [arquitectura de marca](../../architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md).

## Verificación y entrega

- ESLint focal de los cinco archivos TypeScript: PASS.
- `pnpm typecheck`: PASS.
- Evaluación local de los exports en ambos locales: raíz y tres títulos contextuales correctos.
- Se verificó que el detalle de proyectos no exporta metadata que reemplace al layout.
- No se ejecutó servidor, captura visual ni comprobación HTML de rutas en esta pasada de metadata.

Implementado y validado localmente. El operador autorizó commit y push a `develop` el 05/10; el resultado
Git se registra en el cierre de la conversación. Despliegue y CI no verificados en este dossier.
El commit anterior `ad467c292` corresponde a la identidad de menú/footer y su documentación.
