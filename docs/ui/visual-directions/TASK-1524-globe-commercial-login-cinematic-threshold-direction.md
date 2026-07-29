# TASK-1524 — Globe Commercial Login Cinematic Threshold Visual Direction

## Mode and source

- Mode: `repo-native-benchmark`.
- Durable source: este documento, baseline `TASK-1455`, assets Globe canónicos y futuros keyframes/animatic
  versionados bajo `docs/ui/visual-sources/TASK-1524/`.
- Product truth: Globe es una suite AI Gen comercial; acceso/capabilities reales se resuelven por cuenta.
- Selected frame/state: poster inicial, beat image→video→audio y settle final Globe.

## Alternatives

### A — One Idea, Many Forms — selected

Una materia visual nace como trazo/textura, se vuelve imagen, adquiere movimiento, se comprime en secuencia,
se transforma en onda sonora y termina dibujando el isotipo Globe real. Full-bleed, copy/CTA estables y una
sola reproducción.

### B — Living Contact Sheet — conditional/rejected for v1

Outputs reales y rights-cleared se organizan como mesa editorial viva hasta formar Globe. Tiene gran prueba
comercial, pero depende de un corpus aprobado y puede convertir el Login en showreel o prometer trabajo ajeno.

### C — Generative Portal — rejected

Portal tridimensional reactivo al cursor que atraviesa modalidades. Se rechaza por costo WebGL/GPU, peor
equivalencia mobile/reduced motion, dependencia de interacción y riesgo de anteponer espectáculo al acceso.

## Decision

Seleccionar **One Idea, Many Forms** y evolucionar `Orbital Threshold` a **Cinematic Threshold**. La metáfora
explica el producto sin interfaces falsas, tiene firma propia, puede renderizarse como video determinístico y
degrada al mismo poster sin perder significado.

## Visual thesis

- Reading order: marca/product category → promesa → CTA → suite signals → media control.
- El frame más fuerte es el poster/LCP; no se abre con negro, logo intro o loading.
- El video ocupa el viewport como mundo, no como rectángulo dentro de una card.
- El área de copy se compone en cámara/grade; no se rescata con una card de glassmorphism.
- La transición de modalidades usa match cuts y una materia común, no un slideshow de clips.
- La UI permanece quieta mientras el mundo audiovisual cambia detrás.

## Copy lock

- Eyebrow: `GLOBE · AI CREATIVE SUITE`
- Headline: `Tu marca puede crear más. Sin dejar de ser tu marca.`
- Subheadline: `Lleva una idea a imagen, video y audio en un solo estudio, con la velocidad de la IA y el criterio de tu equipo.`
- CTA: `Entrar a Globe`
- Helper: `Inicio de sesión seguro con tu cuenta de Greenhouse.`
- Signals: `Imagen · Video · Audio`
- Motion control: `Pausar animación` / `Reproducir animación`

## Desktop target

- Full viewport 16:9 media stage with safe composition for `1440×1000`.
- Copy block anchored in the left/start third; CTA visible from first paint.
- Visual subject travels through center/right and settles as Globe geometry without crossing text contrast zone.
- Footer/legal/support are low-priority but readable; no environment/correlation rail.

## Mobile target

- Dedicated 9:16 master or 3–4-frame vertical sequence; no desktop crop.
- Headline + CTA remain above fold at `390×844`.
- Subject travels behind/below copy safe zone and ends as a cropped atmospheric mark.
- Pause control has a 44px target and cannot collide with browser chrome/footer.

## Cinematic grammar

- Hook: macro/ECU texture in the first rendered frame.
- Camera: one controlled slow push-in per shot; layered depth, not arbitrary “cinematic” motion.
- Edit: dry/match cuts; no plugin transitions, generic glitch or rapid flashing.
- Pacing: immediate hook → transformation build → brief acceleration → hard settle.
- Light: low-key Globe navy with controlled luminous material; intermediate frames retain copy contrast.
- Logo: actual asset composited in post.

## Token/primitive mapping

| Cue | Globe system decision | Intent preserved | Rejected literal |
|---|---|---|---|
| Full-bleed stage | extend Orbital Threshold | product arrival | card/video player chrome |
| Poster-first | native picture/media manifest | immediate identity/LCP | JS-mounted hero |
| Cinematic master | native video progressive enhancement | deterministic craft | WebGL runtime |
| Copy safe zone | Globe typography/contrast tokens | stable action | glass card rescue |
| Motion control | native button + Globe control variant | user agency | hidden hover control |
| Settle frame | canonical Globe asset | brand fidelity | generated logo |

## Anti-patterns

- Infinite background loop, autoplay audio, showreel collage or fake client work.
- Login card centered over stock footage.
- Cursor parallax, particles, WebGL portal or cinematic library in the critical path.
- Copy synchronized so tightly to video that static/reduced users lose meaning.
- `Piloto interno`, environment codes, correlation IDs or technical bridge status in normal state.
- “Unlimited”, provider/model claims, prices or capabilities not enabled for the account.

## Acceptance signature

At first glance the screen must read “commercial AI creative suite with human direction,” then “enter here.”
It must not read “OAuth test,” “internal tool,” “stock-video SaaS,” or “AI demo reel.”
