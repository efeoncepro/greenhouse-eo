# TASK-233 — Three.js 3D Logo Animation

## Delta 2026-04-05

- El `Out of Scope` de `TASK-230` ya referencia explícitamente a esta task como lane 3D — ajuste cerrado por el cierre documental de `TASK-230`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui / platform`
- Blocked by: `none`
- Branch: `task/TASK-233-threejs-3d-logo`
- GitHub Issue: `[pending]`

## Summary

Integrar Three.js al portal Greenhouse para renderizar el isotipo SVG existente como un objeto 3D interactivo con materiales, iluminacion y animacion. Target principal: login page (GreenhouseBrandPanel y post-auth loading). El SVG (`negative-isotipo.svg`, 2 paths geometricos limpios) esta listo para extrusion.

## Why This Task Exists

La login page y el brand panel son las primeras superficies que ve un usuario del portal. Hoy son completamente estaticos: logo SVG plano, gradientes CSS, CircularProgress generico de MUI. No existe ningun elemento 3D ni interactivo que comunique la identidad visual de Greenhouse como plataforma tecnologica. El isotipo tiene una geometria limpia de 2 paths que se presta naturalmente a extrusion 3D con iluminacion y materiales.

## Goal

- Instalar `three`, `@react-three/fiber` y `@react-three/drei`
- Crear un componente reutilizable que renderice el isotipo de Greenhouse como objeto 3D
- Integrar el logo 3D en la login page (brand panel y/o post-auth transition)
- Respetar `prefers-reduced-motion` con fallback al SVG estatico actual

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- Three.js usa canvas WebGL — debe cargarse con dynamic import `ssr: false` (patron existente en `src/libs/ApexCharts.tsx`)
- `prefers-reduced-motion: reduce` debe desactivar la escena 3D y mostrar el SVG estatico como fallback
- El componente debe ser `'use client'` y no bloquear SSR
- El canvas WebGL no debe impactar el performance del resto de la pagina — usar `frameloop="demand"` o `"always"` con throttle segun el caso

## Dependencies & Impact

### Depends on

- `public/images/greenhouse/SVG/negative-isotipo.svg` — fuente de los paths para extrusion
- `src/views/Login.tsx` — layout de login page (split panel 60/40)
- `src/views/login/GreenhouseBrandPanel.tsx` — panel de marca donde se integraria
- `src/app/auth/landing/loading.tsx` — pantalla post-auth con logo + CircularProgress
- `src/libs/ApexCharts.tsx` — patron de dynamic import a seguir

### Blocks / Impacts

- Login page visual (mejora, no breaking change)
- TASK-230 (Portal Animation Library) — actualizar su Out of Scope para referenciar esta task

### Files owned

- `src/libs/ThreeCanvas.tsx` (nuevo — wrapper con dynamic import)
- `src/components/greenhouse/Greenhouse3DLogo.tsx` (nuevo — componente del logo 3D)
- `src/views/login/GreenhouseBrandPanel.tsx` (modificar — integrar logo 3D)
- `src/app/auth/landing/loading.tsx` (modificar — reemplazar logo estatico con 3D)

## Current Repo State

### Already exists

- `public/images/greenhouse/SVG/negative-isotipo.svg` — SVG con 2 paths (`111.64 x 111.6` viewBox, fill `#fff`)
- `src/views/Login.tsx` — split layout con brand panel (60%) + auth form (40%)
- `src/views/login/GreenhouseBrandPanel.tsx` — fondo dark `#03345e`, gradientes radiales, logo estatico (28x28px isotipo + wordmark), hero title, value cards
- `src/app/auth/landing/loading.tsx` — logo (isotipo 20x20 en caja 32x32 verde) + CircularProgress + mensaje
- `src/libs/ApexCharts.tsx` — patron de dynamic import con `ssr: false`
- Patron de `prefers-reduced-motion` establecido en `src/components/greenhouse/PeriodNavigator.tsx`

### Gap

- Cero librerias 3D instaladas (`three`, `@react-three/fiber`, `@react-three/drei`)
- No existe ningun componente canvas/WebGL en el proyecto
- Login page y post-auth loading son completamente estaticos
- No hay assets 3D ni configuracion de escena/camara/luces

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Library installation + Three.js wrapper

- `pnpm add three @react-three/fiber @react-three/drei`
- `pnpm add -D @types/three`
- Crear `src/libs/ThreeCanvas.tsx` — dynamic import wrapper (`ssr: false`) que exporta Canvas de fiber
- Verificar que el build pasa sin errores con las nuevas dependencias

### Slice 2 — Greenhouse3DLogo component

- Crear `src/components/greenhouse/Greenhouse3DLogo.tsx`
- Parsear los 2 paths de `negative-isotipo.svg` y extruirlos con `ExtrudeGeometry`
- Aplicar material (candidato: `MeshStandardMaterial` o `MeshPhysicalMaterial` con propiedades a definir)
- Configurar escena minima: camera perspectiva, ambient light + directional/spot light
- Animacion idle: rotacion sutil en Y o floating (sin/cos en useFrame)
- Interactividad: responde a hover (scale up sutil o cambio de light intensity)
- Props: `variant` (`brand-panel` | `loading`), `fallbackSrc` (SVG estatico), `reducedMotion` (boolean)
- Si `reducedMotion = true`: renderizar `<img>` con el SVG estatico en vez del canvas

### Slice 3 — Integration in GreenhouseBrandPanel

- Reemplazar el logo estatico (isotipo 28x28) por `Greenhouse3DLogo` variant `brand-panel`
- El logo 3D ocupa un area mayor que el isotipo actual — ajustar layout del brand panel
- Mantener el wordmark text (`negative-sin-claim.svg`) como complemento estatico
- Fallback: si WebGL no esta disponible o `prefers-reduced-motion`, mostrar el SVG original

### Slice 4 — Integration in post-auth loading

- Reemplazar el isotipo estatico + CircularProgress en `src/app/auth/landing/loading.tsx`
- El logo 3D reemplaza ambos: la animacion del logo ES el indicador de carga
- Variant `loading` con animacion mas pronunciada (rotacion continua o pulse)
- Fallback: si WebGL no disponible, mantener isotipo + CircularProgress original

## Out of Scope

- Animaciones 2D (Lottie, Lordicon, Framer Motion) — eso es TASK-230
- Logo 3D en otras superficies del portal (sidebar, dashboard, settings) — follow-up
- Modelo 3D importado de Blender/Cinema4D — se construye desde el SVG existente
- Particulas, post-processing (bloom, SSAO) — evaluar como follow-up si el resultado base lo justifica
- Onboarding — no existe vista de onboarding hoy; si se crea, el logo 3D se puede reutilizar

## Detailed Spec

### SVG Path Extrusion (Slice 2)

Los 2 paths del isotipo se convierten a `THREE.Shape` via `SVGLoader` (de drei/three) o parseando el `d` attribute directamente con `THREE.ShapePath`. Luego se extruyen:

```tsx
const extrudeSettings = {
  depth: 8, // profundidad del extrude
  bevelEnabled: true,
  bevelThickness: 1,
  bevelSize: 0.5,
  bevelSegments: 3
}

// Por cada path del SVG:
const shape = svgPathToShape(pathData)
const geometry = new ExtrudeGeometry(shape, extrudeSettings)
```

### Scene Setup

```tsx
<Canvas
  camera={{ position: [0, 0, 120], fov: 50 }}
  frameloop='demand' // solo renderiza cuando hay cambios
  gl={{ antialias: true, alpha: true }} // fondo transparente
>
  <ambientLight intensity={0.4} />
  <directionalLight position={[10, 10, 5]} intensity={0.8} />
  <Greenhouse3DLogoMesh />
  <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
</Canvas>
```

### Reduced Motion Fallback

```tsx
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

if (prefersReducedMotion || !supportsWebGL) {
  return <img src={fallbackSrc} alt="Greenhouse" ... />
}

return <ThreeCanvas>...</ThreeCanvas>
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `three`, `@react-three/fiber`, `@react-three/drei` instalados y build pasa sin errores
- [ ] Wrapper `ThreeCanvas.tsx` con dynamic import `ssr: false` funciona correctamente
- [ ] `Greenhouse3DLogo` renderiza el isotipo extruido con material, luces y animacion idle
- [ ] El logo responde a hover con feedback visual sutil
- [ ] GreenhouseBrandPanel muestra el logo 3D en vez del isotipo estatico
- [ ] Post-auth loading usa el logo 3D como indicador de carga en vez de CircularProgress
- [ ] Con `prefers-reduced-motion: reduce` activo, se muestra el SVG estatico original en ambas superficies
- [ ] Sin WebGL disponible, se muestra el SVG estatico original como fallback
- [ ] `pnpm build` y `pnpm lint` pasan sin errores nuevos
- [ ] El canvas WebGL no degrada el performance de la login page (no jank en scroll ni input)

## Verification

- `pnpm build`
- `pnpm lint`
- `pnpm tsc --noEmit`
- Preview manual de login page con logo 3D activo
- Preview manual con `prefers-reduced-motion: reduce` — confirmar fallback a SVG
- Test en navegador sin WebGL (o con WebGL deshabilitado) — confirmar fallback
- Lighthouse performance check en login page — confirmar que no hay regression significativa

## Closing Protocol

- [x] Actualizar Out of Scope de TASK-230 para referenciar TASK-233 en vez de "no hay caso de uso claro"

## Follow-ups

- Evaluar logo 3D en sidebar collapsed (heartbeat/breathing animation sutil)
- Evaluar post-processing (bloom en los bordes del logo para efecto luminoso)
- Evaluar particulas orbitando el logo en la login page
- Si se crea una vista de onboarding, reutilizar `Greenhouse3DLogo` como hero
- Evaluar lazy loading del bundle de Three.js para no impactar TTI de la login page

## Open Questions

- Material del logo: metallic reflectivo, glass translucido, o matte solido? Impacta la percepcion de marca. Definir con el owner antes de Slice 2.
- Color del logo 3D en brand panel: blanco como el SVG actual sobre fondo dark, o verde Greenhouse (#2d6a4f)? Podria ser gradient entre ambos.
