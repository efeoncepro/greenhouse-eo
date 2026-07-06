# TASK-1345 — Hero right-side base (motion source)

Imagen base para el **lado derecho del hero** de la landing pública "Desarrollo de sitios web"
(`efeoncepro.com/desarrollo-sitios-web/`). Pensada como **frame base para un motion** (image-to-video)
del hero. Sitio público Efeonce — NO portal Greenhouse (no AXIS/MUI).

- Motor: `gpt-image-2` vía `pnpm ai:image` · 1024×1024 · quality high · 2 variantes.
- Concepto (design-studio + digital-marketing): **"doble lectura"** — una superficie web glossy leída
  a la vez por presencia humana (haz coral) y por buscador/IA/agente (nodos teal) vía líneas de datos.
- Paleta 1:1 con el hero de referencia Velo/v11: navy `#022A4E` → azure `#023C70`, teal `#2EC4B6`
  (energía/datos), coral `#FF6B5B` (calidez humana). Sin texto, sin logos.

## Variantes

| Archivo | Concepto | Beats de motion | Nota dir. arte |
|---|---|---|---|
| `task-1345-hero-right_v1-scan-beam.png` | Scan beam (narrativa explícita) | barrido teal horizontal, pulso de nodos, haz coral, robot idle | lectura "humano + máquina" más literal; tile-foto algo stocky, robot algo caricaturesco |
| `task-1345-hero-right_v2-edge-dissolve.png` ⭐ | Edge dissolve (premium/enterprise) | borde derecho disolviéndose en partículas + stream de datos a nodos, shimmer coral, flotación del panel | recomendada como base de motion — más "infraestructura, no brochure" |

## Prompt

Verbatim en `_cli-manifest.json` (campo del CLI) y en el scratchpad de la sesión.
Dirección: hero right-side visual, foco centrado-derecha con aire a la izquierda para H1/CTA,
fondo navy→azure opaco que funde con el hero, glow volumétrico teal arriba-derecha, grano fino,
DOF cinemático. Constraints: sin texto/letras/números, sin logos, sin rostros detallados (solo
presencia insinuada), sujeto completo sin recorte.

## Motion (V2 elegida)

- Fuente: `task-1345-hero-right_v2-edge-dissolve.png` (start = end para loop seamless).
- Motor: **Magnific → Seedance 2.0** (`bytedance-seedance-pro-2.0`) · 1:1 · 1080p · 5s · `cameraMotion: static` · silencioso.
- Salida: `task-1345-hero-right_v2-motion-seedance-5s-1080p.mp4` (3.5 MB) + `task-1345-hero-right_v2-motion-poster.jpg`.
- QA: composición preservada, sin jerk de cámara, borde/partículas/nodos/haz coral animados sutil. Leve "completado" de una tile a foto de montaña (drift menor aceptable).

## Estado

V2 elegida y motion generado. Pendiente para publicar en el hero:
1. Reframe al aspecto real del slot derecho si no es 1:1 (Seedance soporta 3:4/16:9 directo).
2. Comprimir/optimizar (`webm` + `mp4`), montar `<video autoplay muted loop playsinline poster>` con la imagen como LCP + fallback `prefers-reduced-motion`.
3. Mobile 390: servir solo poster estático.
No commiteado ni publicado en el sitio live.
