# TASK-278 — AI Visual Asset Generator: imagenes + animaciones SVG on-demand

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ai`, `platform`, `tooling`
- Blocked by: `none`
- Branch: `task/TASK-278-ai-visual-asset-generator`
- Legacy ID: —
- GitHub Issue: —

## Summary

Modulo interno que permite al agente AI generar assets visuales on-demand durante el desarrollo de UI: imagenes rasterizadas (banners, ilustraciones, empty states) via **Imagen 3** y animaciones SVG/HTML/CSS interactivas via **Gemini**. Usa el `GoogleGenAI` client existente — zero dependencias nuevas. No es un feature para usuarios — es herramienta de toolchain del agente.

## Why This Task Exists

Cuando el agente desarrolla interfaces, encuentra gaps visuales que hoy no puede resolver: banners de seccion, ilustraciones para empty states, iconos animados, fondos decorativos. La unica opcion es hardcodear placeholders o pedir al usuario que genere la imagen externamente. Con este modulo, el agente puede generar el asset, guardarlo en el repo, e integrarlo en el componente — todo en un solo flujo sin interrupcion.

Google ya provee dos motores complementarios accesibles con el mismo SDK:
1. **Imagen 3** (`imagen-3.0-generate-002`) — genera imagenes rasterizadas fotorrealistas
2. **Gemini** — genera SVG animados con CSS keyframes, path draw animations, micro-interacciones

Ambos accesibles via `@google/genai` con Vertex AI, que ya esta configurado y en produccion para el Greenhouse Agent.

## Goal

- `generateImage(prompt, options)` genera PNG/WebP y lo guarda en `public/images/generated/`
- `generateAnimation(prompt, options)` genera SVG animado via Gemini y lo guarda en `public/animations/generated/`
- Endpoints internos `POST /api/internal/generate-image` y `POST /api/internal/generate-animation` protegidos (solo admin en dev/staging)
- Skill invocable `/generate-image` y `/generate-animation` para uso directo del agente
- Las animaciones SVG usan variables CSS del tema Greenhouse (`--mui-palette-primary-main`, etc.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — arquitectura general
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, animaciones, Lottie wrapper

Reglas obligatorias:

- Usar `getGoogleGenAIClient()` de `src/lib/ai/google-genai.ts` — no crear cliente nuevo
- Endpoints protegidos con `requireAdminTenantContext` — solo admin puede invocar
- Deshabilitado en production (`NODE_ENV !== 'production'` o env var `ENABLE_ASSET_GENERATOR`)
- Imagenes generadas en `public/images/generated/` — WebP preferido, PNG fallback
- Animaciones generadas en `public/animations/generated/` — SVG con CSS keyframes embebidos
- Respetar `prefers-reduced-motion`: las animaciones SVG deben incluir `@media (prefers-reduced-motion: reduce)` que desactive las animaciones

## Normative Docs

- `src/lib/ai/google-genai.ts` — cliente GoogleGenAI existente
- `src/config/nexa-models.ts` — resolucion de modelos Gemini
- `public/animations/` — directorio existente de Lottie JSON assets

## Dependencies & Impact

### Depends on

- `@google/genai ^1.45.0` — ya instalado
- `getGoogleGenAIClient()` en `src/lib/ai/google-genai.ts` — ya configurado con Vertex AI
- Imagen 3 habilitado en el proyecto GCP `efeonce-group` — verificar que la API `aiplatform.googleapis.com` tenga Imagen habilitado

### Blocks / Impacts

- Mejora la velocidad de desarrollo de interfaces — el agente puede generar assets sin interrupcion
- Habilita empty states ilustrados, banners de seccion, iconos animados en futuras tasks de UI
- No impacta funcionalidad existente — es aditivo

### Files owned

- `src/lib/ai/image-generator.ts` — helper principal (NUEVO)
- `src/app/api/internal/generate-image/route.ts` — endpoint imagen (NUEVO)
- `src/app/api/internal/generate-animation/route.ts` — endpoint animacion (NUEVO)

## Current Repo State

### Already exists

- `src/lib/ai/google-genai.ts` — cliente GoogleGenAI con Vertex AI configurado
- `src/lib/ai/greenhouse-agent.ts` — ejemplo de uso de Gemini para generacion de contenido
- `src/config/nexa-models.ts` — resolucion de modelos con fallback
- `public/images/` — directorios existentes: `avatars/`, `greenhouse/`, `illustrations/`, `pages/`
- `public/animations/` — assets Lottie existentes: `empty-chart.json`, `empty-inbox.json`
- `src/libs/Lottie.tsx` — wrapper para animaciones Lottie (dynamic import, SSR-safe)
- `src/hooks/useReducedMotion.ts` — hook para respetar `prefers-reduced-motion`
- Endpoints internos existentes en `src/app/api/internal/` con patron `requireAdminTenantContext`

### Gap

- No existe funcion de generacion de imagenes via Imagen 3
- No existe funcion de generacion de SVG animados via Gemini
- No existe directorio `public/images/generated/` ni `public/animations/generated/`
- No existe skill de Claude para invocar generacion de assets

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Helper: `image-generator.ts`

Crear `src/lib/ai/image-generator.ts` con dos funciones:

**`generateImage(prompt, options)`**
- Usa `ai.models.generateImages()` con modelo `imagen-3.0-generate-002`
- Options: `aspectRatio` (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`), `format` (`webp` | `png`), `filename`
- Guarda en `public/images/generated/{filename}.{format}`
- Retorna `{ path: string, width: number, height: number, format: string }`

**`generateAnimation(prompt, options)`**
- Usa Gemini (mismo modelo del Greenhouse Agent) con system prompt que instruye generar SVG valido con CSS keyframes
- System prompt incluye: palette Greenhouse, `@media (prefers-reduced-motion)`, viewport sizing
- Options: `filename`, `width`, `height`
- Valida que el output sea SVG valido (empieza con `<svg`, contiene `</svg>`)
- Guarda en `public/animations/generated/{filename}.svg`
- Retorna `{ path: string, svgContent: string }`

### Slice 2 — Endpoints internos

**`POST /api/internal/generate-image`**
- Auth: `requireAdminTenantContext`
- Guard: `process.env.NODE_ENV === 'production'` → 403 (a menos que `ENABLE_ASSET_GENERATOR=true`)
- Body: `{ prompt: string, aspectRatio?: string, format?: string, filename?: string }`
- Response: `{ path: string, width: number, height: number }`

**`POST /api/internal/generate-animation`**
- Auth: `requireAdminTenantContext`
- Guard: mismo que arriba
- Body: `{ prompt: string, filename?: string, width?: number, height?: number }`
- Response: `{ path: string, svgContent: string }`

### Slice 3 — Claude skill

Crear skill en `~/.claude/skills/generate-visual-asset/skill.md` que:
- Acepta `/generate-image "prompt"` y `/generate-animation "prompt"`
- Invoca el endpoint interno via `fetch` o ejecuta la funcion directamente
- Reporta el path generado para integrar en componentes

## Out of Scope

- Generacion de imagenes para usuarios finales — esto es toolchain del agente
- Video generation (Veo) — futuro
- Image editing / inpainting — futuro
- Upload automatico a GCS — se guarda en `public/` que Vercel sirve estaticamente
- Generacion de Lottie JSON — usamos SVG animado en vez de Lottie para los assets generados
- UI admin para gestionar assets generados

## Detailed Spec

### System prompt para animaciones SVG

```
You are an SVG animation specialist for the Greenhouse EO portal.
Generate a single valid SVG file with embedded CSS animations.

Rules:
- Output ONLY the SVG markup, no markdown, no explanation
- Use CSS keyframes inside a <style> tag within the SVG
- Use these CSS custom properties for colors:
  - Primary: #7367F0
  - Success: #6EC207
  - Warning: #FF6500
  - Error: #BB1954
  - Info: #00BAD1
  - Text: #4B465C
- Include @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
- Use viewBox for responsive sizing
- Keep total SVG under 10KB
- Animations should be smooth, professional, subtle — not flashy
```

### Naming convention para assets generados

- Imagenes: `public/images/generated/{slug}-{timestamp}.webp` (e.g. `profile-banner-1775553600.webp`)
- Animaciones: `public/animations/generated/{slug}-{timestamp}.svg` (e.g. `empty-inbox-1775553600.svg`)
- El timestamp evita colisiones y permite trackear cuando se genero

### Modelos disponibles

| Motor | Modelo | Uso |
|-------|--------|-----|
| Imagen 4 | `imagen-4.0-generate-001` (default, configurable via `IMAGEN_MODEL` env var) | Imagenes rasterizadas (PNG/WebP) |
| Gemini | Modelo resuelto por `resolveNexaModel()` (actualmente gemini-2.5-flash) | Animaciones SVG/HTML/CSS |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `generateImage("blue gradient tech banner", { aspectRatio: '16:9' })` genera un WebP valido en `public/images/generated/`
- [ ] `generateAnimation("loading spinner with 3 dots bouncing")` genera un SVG valido con CSS keyframes
- [ ] SVG generado incluye `@media (prefers-reduced-motion: reduce)`
- [ ] SVG generado usa colores del tema Greenhouse (no hardcoded random colors)
- [ ] `POST /api/internal/generate-image` retorna 403 en production (sin env var override)
- [ ] `POST /api/internal/generate-image` retorna 200 + path en staging con admin auth
- [ ] `POST /api/internal/generate-animation` retorna 200 + SVG content en staging con admin auth
- [ ] Assets generados son accesibles via browser en la URL `/images/generated/{filename}`
- [ ] `pnpm build`, `pnpm lint` pasan sin errores

## Verification

- `pnpm build` + `pnpm lint` + `tsc --noEmit`
- Staging: `pnpm staging:request POST /api/internal/generate-image '{"prompt":"abstract tech banner","aspectRatio":"16:9"}'` → 200 + path
- Staging: `pnpm staging:request POST /api/internal/generate-animation '{"prompt":"loading dots animation"}'` → 200 + SVG
- Verificar que el SVG generado renderiza correctamente en browser (abrir la URL directa)
- Verificar que la imagen generada se ve correctamente en browser

## Closing Protocol

- [ ] Agregar seccion en `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` documentando el asset generator
- [ ] Crear skill files en `~/.claude/skills/generate-visual-asset/`

## Follow-ups

- Image editing / inpainting: modificar imagenes existentes con mascaras
- Video generation via Veo: generar micro-videos para onboarding o demos
- Batch generation: generar sets completos de assets para un tema (e.g. todos los empty states de un modulo)
- GCS upload: para assets que no deben vivir en el repo (imagenes grandes, video)
- Asset catalog UI: admin view para ver y gestionar todos los assets generados
