# Greenhouse AI Visual Asset Generator V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-07 por Claude (TASK-278)
> **Ultima actualizacion:** 2026-04-07
> **Task:** TASK-278 — AI Visual Asset Generator

---

## Purpose

Define el contrato, arquitectura y reglas del **AI Visual Asset Generator** — un modulo interno de toolchain que permite al agente AI generar assets visuales on-demand durante el desarrollo de interfaces: imagenes rasterizadas (banners, ilustraciones, fondos) via **Imagen 4** y animaciones SVG con CSS keyframes via **Gemini**.

No es un feature para usuarios finales. Es infraestructura de productividad del agente.

## Architecture

```
Agent (Claude) durante desarrollo de UI
    |
    v
[generateImage(prompt, options)]     o     [generateAnimation(prompt, options)]
    |                                            |
    v                                            v
[Imagen 4 via Vertex AI]              [Gemini via Vertex AI]
    |                                            |
    v                                            v
PNG/WebP → public/images/generated/   SVG+CSS → public/animations/generated/
    |                                            |
    v                                            v
<img src="/images/generated/...">     <img src="/animations/generated/...">
    |                                            |
    v                                            v
git add + commit → asset servido por Vercel CDN
```

### Canales de generacion

| Canal | Motor | Modelo | Output | Uso |
|-------|-------|--------|--------|-----|
| Imagenes rasterizadas | Imagen 4 | `imagen-4.0-generate-001` (configurable via `IMAGEN_MODEL`) | PNG/WebP | Banners, ilustraciones, fondos, thumbnails |
| Animaciones SVG | Gemini | Resuelto via `resolveNexaModel()` | SVG con CSS keyframes | Loading spinners, iconos animados, empty states, micro-interacciones |

## Files

| File | Purpose |
|------|---------|
| `src/lib/ai/image-generator.ts` | Helper con `generateImage()` + `generateAnimation()` |
| `src/app/api/internal/generate-image/route.ts` | Endpoint POST admin-only (imagen rasterizada) |
| `src/app/api/internal/generate-animation/route.ts` | Endpoint POST admin-only (SVG animado) |
| `scripts/generate-banners.mts` | Script batch para generar sets de banners |
| `~/.claude/skills/generate-visual-asset/skill.md` | Skill invocable `/generate-visual-asset` |
| `public/images/generated/` | Output de imagenes generadas |
| `public/animations/generated/` | Output de animaciones generadas |
| `public/images/banners/` | Banners pre-generados por categoria |
| `src/lib/person-360/resolve-banner.ts` | Resolver: role/department → banner category |

## API

### `generateImage(prompt, options)`

```typescript
import { generateImage } from '@/lib/ai/image-generator'

const result = await generateImage('tech banner blue gradient', {
  aspectRatio: '16:9',   // '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  format: 'png',         // 'webp' | 'png'
  filename: 'my-banner'  // optional
})
// result: { path, filename, format, sizeBytes }
```

### `generateAnimation(prompt, options)`

```typescript
import { generateAnimation } from '@/lib/ai/image-generator'

const result = await generateAnimation('loading dots bouncing', {
  width: 120,             // optional viewBox width
  height: 120,            // optional viewBox height
  filename: 'loading'     // optional
})
// result: { path, filename, svgContent, sizeBytes }
```

### REST Endpoints

| Endpoint | Method | Auth | Production |
|----------|--------|------|------------|
| `/api/internal/generate-image` | POST | `requireAdminTenantContext` | Disabled (403) unless `ENABLE_ASSET_GENERATOR=true` |
| `/api/internal/generate-animation` | POST | `requireAdminTenantContext` | Disabled (403) unless `ENABLE_ASSET_GENERATOR=true` |

## Profile Banner System

### Pre-generated banners

7 banners generados con Imagen 4, uno por categoria contextual:

| Categoria | Archivo | Asignado a | Estetica |
|-----------|---------|------------|----------|
| `leadership` | `public/images/banners/leadership.png` | `efeonce_admin` | Navy-purple, constelacion con nodos dorados |
| `operations` | `public/images/banners/operations.png` | `efeonce_operations`, `efeonce_account`, dept Operations | Blue-teal, pipeline con formas geometricas |
| `creative` | `public/images/banners/creative.png` | dept Design, UX, Branding, Content | Magenta-coral, formas organicas fluidas |
| `technology` | `public/images/banners/technology.png` | dept Development, Engineering | Midnight-cyan, circuit board topology |
| `strategy` | `public/images/banners/strategy.png` | dept Strategy, Media, Analytics | Indigo-purple, ondas de analytics |
| `support` | `public/images/banners/support.png` | `hr_manager`, `finance_manager`, dept HR, Finance | Teal-green, cristales geometricos |
| `default` | `public/images/banners/default.png` | Cualquier otro | Navy-purple, mesh network universal |

### Banner Resolver

```typescript
import { resolveProfileBanner } from '@/lib/person-360/resolve-banner'

const bannerUrl = resolveProfileBanner(
  identity.activeRoleCodes,  // ['efeonce_admin']
  identity.departmentName    // 'Desarrollo'
)
// → '/images/banners/leadership.png' (role has priority over department)
```

Prioridad de resolucion:
1. **roleCodes** — primer match en el mapa role→category
2. **departmentName** — normalizado (lowercase, sin acentos), match en mapa department→category
3. **default** — fallback universal

### Integracion en MyProfileHeader

```tsx
<MyProfileHeader
  fullName="Julio Reyes"
  avatarUrl="/api/media/users/.../avatar"
  designation="Managing Director & GTM"
  department={null}
  joiningDate="7 abr 2026"
  bannerUrl="/images/banners/leadership.png"  // ← from resolver
/>
```

El header renderiza el banner como `background: url(...) center/cover` con fallback al gradiente CSS si `bannerUrl` es null.

## SVG Animation Contract

Las animaciones SVG generadas por Gemini siguen estas reglas (enforced via system prompt):

- Output: SVG valido con `<style>` embebido conteniendo CSS keyframes
- Colores: palette Greenhouse (Primary #7367F0, Success #6EC207, Warning #FF6500, Error #BB1954, Info #00BAD1)
- Accesibilidad: incluye `@media (prefers-reduced-motion: reduce)` que desactiva animaciones
- Sizing: `viewBox` responsive, sin width/height fijos en root
- Peso: max 10KB
- Tipografia: `DM Sans, system-ui, sans-serif`
- Sin JavaScript — solo CSS animations
- Loops seamless para animaciones ciclicas

## Security

- Endpoints deshabilitados en production por defecto (`NODE_ENV === 'production'` → 403)
- Override: `ENABLE_ASSET_GENERATOR=true` en env vars
- Auth: `requireAdminTenantContext` — solo efeonce_admin con route group admin
- Los assets generados son archivos estaticos commiteados al repo — no hay generacion en runtime para usuarios

## Infraestructura reutilizada

| Componente | Source |
|------------|--------|
| GoogleGenAI client | `src/lib/ai/google-genai.ts` (singleton, Vertex AI) |
| Model resolution | `src/config/nexa-models.ts` (`resolveNexaModel()`) |
| GCP auth | `src/lib/google-credentials.ts` (WIF/SA key/ADC) |
| Admin auth guard | `src/lib/tenant/authorization.ts` (`requireAdminTenantContext`) |

Zero dependencias nuevas.

## Related Docs

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, animaciones, Lottie
- `docs/tasks/to-do/TASK-278-ai-visual-asset-generator.md` — task spec
- `src/hooks/useReducedMotion.ts` — hook para respetar prefers-reduced-motion
- `src/libs/Lottie.tsx` — wrapper Lottie existente (para JSON animations)

## Future

- Image editing / inpainting: modificar imagenes existentes con mascaras
- Video generation via Veo: micro-videos para onboarding
- Batch generation: sets completos de assets por tema (todos los empty states)
- GCS upload: para assets grandes que no deben vivir en el repo
- Banner personalizado por persona: foto propia subida por el usuario
