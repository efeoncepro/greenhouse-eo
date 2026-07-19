# Spot Studio — sistema de producción de spots (IA + humano)

> **Tipo:** playbook + arquitectura (agent-facing). **Estado:** V1 — piloto AEO Grader (2026-07-05).
> **Idioma:** es-CL neutro (tuteo). **Diseñado con** `arch-architect` (contrato de 4 pilares).
> **Router:** referenciado desde `SKILL.md §8`. Recetas atómicas en `../workflows/`; contrato del modelo en
> `../efeonce/GEMINI_OMNI_VERTEX.md`; capacidades+sinergia en `../efeonce/GEMINI_OMNI_CAPABILITIES.md`.

## Decisión (qué ES)

El Spot Studio **no es un software nuevo**: es un **pipeline determinista por etapas, con artefactos
tipados y gates humanos** entre las etapas caras/riesgosas. Vive como **playbook + `workflows/` +
templates + herramientas conectadas** — NO como feature de portal (todavía). El primer spot (AEO Grader)
es la **instancia de referencia** que puebla etapas, lanes, gates y checklists.

> **Boring-tech + puerta reversible:** sistematizamos el *workflow* antes de construir "hierros" de runtime.
> Un Spot Studio como capability de portal (jobs async, asset DB, cost dashboard) es una puerta poco
> reversible → se decide tras 2-3 spots (ver Roadmap).

> **Accounting boundary:** un spot no tiene un precio fijo en credits. Descompón clips/transformaciones/audio
> generativos por segundos, tier y attempts; storyboard/animatic, edición, conform, color, mix/master, overlay,
> export y cutdowns determinísticos son `0 credits` y se financian por capacidad. Lifecycle, ejemplos de spot
> 30 s y refund policy: `../modules/13_STUDIO_CREDITS_AND_ACCOUNTABILITY.md`.

## El pipeline por etapas + gates (garantía del acabado final)

La garantía **no es "quedó lindo"** — son **gates objetivos**: validar barato antes de gastar caro, y nunca
confiar lo exacto a la IA. Cada etapa **emite un artefacto persistido y re-ejecutable** (resiliencia).

| # | Etapa | Artefacto | **Gate (garantía)** | Herramienta |
|---|---|---|---|---|
| 0 | Brief | `motion-brief.md` | objetivo/formato/marca aprobados | template |
| 1 | Concepto + guion + storyboard | guion/VO + storyboard (artifact) | **arco + VO + reparto** aprobados | `storyboard.md` + artifact |
| 2 | **Animatic** | stills + VO scratch + timing | 🔒 **ritmo aprobado ANTES de gastar créditos IA** (gate clave) | edición |
| 3 | Keyframes | stills on-brand por beat | on-brand, arte controlado | `design-studio` / `greenhouse-ai-image-generator` |
| 4 | Producción por **lane** | clips por beat | 👁 **mirar el frame/motion real** de cada beat | UI-crisp / Omni / Grader-real |
| 5 | Audio | VO + música + SFX + mezcla | licencia + consentimiento + **loudness target** | `audio-studio` |
| 6 | Ensamble + overlay | corte + pull-back + UI/logos crisp | corte aprobado; **texto/logo = asset real, NUNCA IA** | edición + mograph |
| 7 | **Finish** | master 1080p+ | ✅ **pre-flight técnico** (checklist abajo) | Resolve + Magnific |
| 8 | Entrega + gobernanza | 16:9 + 9:16 + 1:1 | disclosure IA (SynthID) + **confirmación humana** | `social-media-studio` |

### Lanes (taxonomía de reparto por beat)

- **`UI-crisp`** — texto/citas/gauge/logo **exactos** → mograph (HTML + Playwright, `../workflows/ui-without-after-effects.md`). La IA NUNCA los pinta.
- **`Omni-world`** — mundo/emoción/cámara → Gemini Omni (i2v desde keyframe + reference-chaining, `../workflows/reference-video-to-omni.md`).
- **`product-real`** — captura de UI real del producto (ej. el Grader: gauge, Share of Voice, citas con logos).

### Los 4 mecanismos que garantizan el finish

1. **Animatic gate** — validas el ritmo con centavos (stills + VO scratch) antes de gastar en Omni.
2. **Invariante de exactitud** — texto/logos/citas/precios/gauge = **overlay de asset real**; verificado que Omni los deforma (ChatGPT→ChatOFT, precio 890→850).
3. **Revisión por beat** — mirar el frame/motion real (no un gate que "no ve").
4. **Pre-flight técnico** — checklist pass/fail, no vibes.

## Checklist — Animatic gate (etapa 2)

- [ ] Duración total dentro del target (±2 s).
- [ ] Cada beat tiene su still/placeholder y su timing.
- [ ] VO scratch encaja en cada beat sin apurarse ni sobrar.
- [ ] El **arco** se lee (gancho → desarrollo → clímax → CTA).
- [ ] La **costura** (pull-back/match-cut) funciona en el corte.
- [ ] Operador aprueba el ritmo → recién ahí se producen tomas Omni.

## Checklist — Finish pre-flight (etapa 7, pass/fail)

- [ ] Resolución **1080p+** (Magnific Video Sequence Enhancement, frame-consistent).
- [ ] Loudness **−14 LUFS** web / **−16 LUFS** social · true peak **−1 dBTP**.
- [ ] Color space **Rec.709** (o P3 si el destino lo pide).
- [ ] Versiones **16:9 + 9:16 + 1:1**; safe zones OK por red.
- [ ] Logo/citas/texto **nítidos** (overlay real, no IA).
- [ ] **Disclosure "generado por IA"** presente (SynthID lo respalda).
- [ ] Música con **licencia** documentada; voz con **consentimiento** si es clonada.
- [ ] **Confirmación humana** antes de publicar/entregar.

## SSOT / registries del sistema

- **Brief:** una sola fuente por spot.
- **Brand assets:** `public/branding/*` (logos reales) + `src/config/efeonce-brand.ts` (marca) — el logo se compone, no lo pinta la IA.
- **Model registry:** qué modelo por beat = el **mapa de sinergia** de `../efeonce/GEMINI_OMNI_CAPABILITIES.md`.
- **Recetas:** `../workflows/` (validadas end-to-end). **Contrato Omni:** `../efeonce/GEMINI_OMNI_VERTEX.md`.

## 4 pilares

- **Safety:** invariante de exactitud + licencia + consentimiento + disclosure SynthID + confirmación humana. Blast radius de un mal spot = daño de marca → gateado.
- **Robustez:** animatic atrapa ritmo malo antes del gasto; revisión por beat atrapa garbling; cada etapa valida su input; degradación (beat Omni falla → regen o fallback mograph).
- **Resiliencia:** artefactos persistidos → re-run desde cualquier etapa; contrato Omni como SSOT para reverificar cuando cambie el preview (`PUBLIC_PREVIEW`, techos 720p/10s se moverán).
- **Escalabilidad:** pipeline + workflows + model registry = rieles para N spots; escalar = más spots por los mismos gates, no rediseño.

## Reglas duras (anti-regresión)

- **NUNCA** texto/logos/citas/precios/gauge por IA → overlay de asset real.
- **NUNCA** producir tomas Omni antes del **animatic gate**.
- **NUNCA** publicar sin disclosure IA + confirmación humana.
- **NUNCA** música sin licencia comercial ni voz clonada sin consentimiento documentado.
- **SIEMPRE** persistir el artefacto de cada etapa (re-ejecutable).
- **SIEMPRE** correr el **finish pre-flight** antes de declarar "listo".
- **SIEMPRE** estimar/reservar/aprobar antes de generar y conciliar settlement/release/refund con evidencia.
- **NUNCA** cobrar un retry técnico; cambio de dirección tras aprobación = nuevo branch/estimate.

## Alternativas rechazadas

- *Todo en Omni* → deforma UI/texto (probado). *Todo mograph* → pierde el "wow" del mundo. → **híbrido por lanes**.
- *Construir ya el Spot Studio como feature de portal* → puerta poco reversible; primero 1-2 pilotos, después platform task si el volumen lo justifica.

## Open questions

- Beat 7: ¿**Grader real** capturado (necesita run con org enlazada + datos) o recreación mograph fiel? → se decide en etapa 4.
- Voz final: ¿**NExa** (Seed Audio) o humana/ElevenLabs cuando cargue el MCP? → decisión de `audio-studio`.
- ¿El Spot Studio "con todos los hierros" será playbook permanente o capability de portal (Full API Parity)? → decidir tras 2-3 spots.

## Roadmap por slices

1. **Piloto (ahora):** etapa 2 (animatic gate) → beats 6-8 (Omni + Grader real) → audio → ensamble → finish → 9:16.
2. **Post-piloto:** enriquecer este doc con las lecciones reales + agregar `templates/` (brief, animatic, finish) si conviene.
3. **Si el volumen lo pide:** task de plataforma (jobs async + cost tracking + asset management) — Full API Parity.

> **Cómo crece:** cada spot nuevo pasa por estas etapas y **documenta lo que aprende** en `../workflows/` + acá. El piloto AEO es la V1; los siguientes la endurecen.
