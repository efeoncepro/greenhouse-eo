# 10 — IA + Producción (la mano de ejecución)

> **Alcance.** Este es el módulo que **hace**: cierra el loop **idear → producir → programar →
> medir → iterar** con las herramientas conectadas. Producir con IA (video/imagen/audio/UGC),
> programar y medir con Metricool, y hacerlo con **autenticidad + brand safety**. El detalle de
> cada herramienta vive en `efeonce/STUDIO_TOOLING.md`; acá está el **loop y las reglas duras**.

> **Regla dura que gobierna todo el módulo (propose → confirm → execute).** El estudio **propone
> y produce**, pero **programar o publicar en vivo pasa SIEMPRE por confirmación humana**. Nunca
> dispares un post, un DM masivo ni una programación sin aprobación explícita del operador. Es la
> misma doctrina Full API Parity del portal: el agente **muta solo en el paso de confirmación humana**.

---

## 1. El loop del estudio

```
IDEAR ──▶ PRODUCIR ──▶ PROGRAMAR ──▶ MEDIR ──▶ ITERAR ──┐
  ▲                    (confirm humano)                  │
  └──────────────────────────────────────────────────────┘
```

1. **Idear** — pilares/serie/hook (módulos 03, 02). Sale un brief, no una corazonada.
2. **Producir** — genera el asset con la herramienta correcta (§2).
3. **Programar** — Metricool, en la mejor ventana, **con confirmación humana** (§3).
4. **Medir** — analítica nativa (módulo 09), señales reales (save/send/completion/dwell).
5. **Iterar** — lo que ganó se amplifica (módulo 07) y alimenta la próxima idea.

## 2. Producir: qué herramienta para qué asset

| Necesitas… | Herramienta | Notas |
|---|---|---|
| Video corto, imagen, audio, UGC, avatares/talking-head | **`higgsfield-*`** | Video/imagen/audio generativo, UGC, avatares, motion, upscale, reframe |
| Estáticos, posts, fondos, arte a medida | **`greenhouse-ai-image-generator`** | Dirección de arte + generación; ver su skill/invariantes |
| Carruseles, piezas de marca, sistema visual | **`greenhouse-digital-brand-asset-designer`** | Assets de marca serializados/consistentes |
| Diseño fino, layout, plantillas editables | **Figma / Adobe Express** | Cuando el asset necesita mano de diseñador |

- **El estudio dirige, los generadores ejecutan.** Este módulo decide *qué* pieza y *con qué
  intención*; el asset concreto lo produce la herramienta (delegación explícita, ver SKILL §2).
- Elige por output, no por costumbre: video/UGC → higgsfield; estático/arte → image-generator;
  carrusel/marca → brand-asset-designer; layout editable → Figma/Express.
- Detalle de capacidades, endpoints y gotchas por herramienta → `efeonce/STUDIO_TOOLING.md`.

## 3. Programar y medir: Metricool MCP

| Tool | Para qué |
|---|---|
| **`getBestTimeToPostByNetwork`** | Mejor ventana de publicación por red (input de cadencia) |
| **`createScheduledPost`** | Programar un post — **solo tras confirmación humana** |
| **`getScheduledPosts`** | Ver lo ya programado (evita duplicar/pisar el calendario) |
| **`getAnalyticsDataByMetrics`** | Traer métricas por red/período (módulo 09) |
| **`getBrandSettings`** | Leer la config de la marca/cuenta conectada antes de operar |

**Flujo canónico (propose → confirm → execute):**
1. Lee `getBrandSettings` para saber sobre qué cuenta operas (no asumas).
2. Consulta `getScheduledPosts` para no pisar lo ya agendado.
3. Usa `getBestTimeToPostByNetwork` para proponer horario.
4. **Propón** el post completo al operador (copy, asset, red, hora).
5. **Espera confirmación humana explícita.**
6. Recién ahí `createScheduledPost`. Nunca antes.
7. Después, `getAnalyticsDataByMetrics` para cerrar el loop (medir → iterar).

> **Nunca** llames `createScheduledPost` (ni ningún write) sin el paso 5. Programar en vivo es
> mutación de estado con cara pública — es exactamente lo que la doctrina propose→confirm→execute
> protege.

## 4. IA + autenticidad (la línea que no se cruza)

En 2026 el mercado está saturado de contenido IA. **Gana lo humano, imperfecto y serializado**;
lo pulido-genérico se lee como spam. Doctrina:

- **La IA acelera producción, no reemplaza autenticidad.** Úsala para volumen, variantes,
  ideación y assets de apoyo — no para simular una persona real que no existe cuando el formato
  pide humanidad (UGC, testimonios, community).
- **Etiquetado obligatorio (as-of 2026-07 — reverificar reglas por plataforma):** contenido IA
  que **un espectador razonable pueda confundir con real DEBE etiquetarse**. Regla mnemónica:
  **"ante la duda, revela."** Las plataformas tienen reglas de disclosure (y penalizan el
  incumplimiento); además es un tema de confianza, no solo de compliance.
- **Costo reputacional real:** ~**1/3 de los consumidores** es **menos propenso** a comprar de
  marcas que usan ads de IA evidentes (as-of 2026-07 — reverificar). La IA mal usada **resta**.
- **Dónde la IA suma sin fricción:** ideación, guiones borrador, variantes de un ganador,
  fondos/b-roll, upscaling, subtítulos, versionado por red. **Dónde resta:** falsos testimonios,
  "creadores" sintéticos sin disclosure, review de producto actuado por IA (ver módulos 06/08).

**Checklist de disclosure antes de publicar:**
- [ ] ¿Un espectador razonable podría confundir esto con contenido real/humano? → si sí, etiqueta.
- [ ] ¿Cumple la política de disclosure de IA de la plataforma vigente? (reverifica, es volátil)
- [ ] ¿El contenido IA reemplaza autenticidad donde el formato la exige? → replantea.
- [ ] ¿Hay una persona real detrás cuando el formato promete una (UGC/testimonio)?

## 5. Brand safety con IA generativa

- **Revisa cada asset generado antes de programar:** artefactos, texto deformado, manos/caras
  raras, logos de terceros colados, sesgos, claims falsos. La IA alucina — tú verificas.
- **Nunca** dejes que la IA invente **datos, precios, cifras o claims** de producto: esos vienen
  de la fuente (commercial/catálogo), no del modelo. Un número inventado en un post es un riesgo real.
- **Consistencia de marca:** el asset debe respetar el sistema visual/voz (usa
  `greenhouse-digital-brand-asset-designer` para serializar, no improvises por pieza).
- **Derechos:** no generes estilo/imagen que imite a una persona/marca real sin permiso; cuida
  usage rights de cualquier referencia (cruza con módulo 06 para UGC/creador).
- **Efeonce ≠ Greenhouse:** no transcribas marca; respeta el overlay (`efeonce/EFEONCE_OVERLAY.md`).

## 6. Handoffs y cierre

- **Detalle de herramientas** (capacidades, endpoints, flujos, gotchas) → `efeonce/STUDIO_TOOLING.md`.
- **Copy visible del portal Greenhouse** → `greenhouse-ux-writing` (no es copy social).
- **Publicación al blog/sitio** → `efeonce-public-site-wordpress`. **Lead capture/atribución** →
  `growth-marketing-cro` + `greenhouse-growth-forms`.
- **Medición del loop** → módulo 09. **Amplificar el ganador** → módulo 07.
- **Cierra con un artefacto** de `templates/` (calendario, guion, brief), nunca prosa suelta.

> **Reglas duras del módulo.** **NUNCA** programes/publiques sin confirmación humana explícita
> (propose → confirm → execute). **NUNCA** publiques contenido IA confundible con real sin
> etiquetarlo ("ante la duda, revela"). **NUNCA** dejes que la IA invente datos/precios/claims de
> producto. **NUNCA** uses IA para simular autenticidad donde el formato exige una persona real.
> **SIEMPRE** revisa el asset generado (brand safety) antes de agendar, lee `getBrandSettings`
> antes de operar una cuenta, y cierra el loop midiendo lo que produjiste.
