# TASK-1803 — Landing Branding Studio — Dirección visual

## Meta

- Status: `selected direction; ready for design development, not implementation`
- Owner task: `TASK-1803 — Landing Branding Studio: la marca como sistema de decisión`
- Direction mode: `repo-native-benchmark`
- Surface: nueva landing pública Efeonce en WordPress/Ohio/Elementor; slug final y `postId` por confirmar.
- Related wireframe: `docs/ui/wireframes/TASK-1803-landing-branding-studio.md`
- Related flow: `docs/ui/flows/TASK-1803-landing-branding-studio-flow.md`
- Related motion: `docs/ui/motion/TASK-1803-landing-branding-studio-motion.md`

## Strategic visual thesis

Branding Studio no se representa como una galería de logos ni como una consultora abstracta. La página hace visible
el paso de una empresa que cambió pero se explica de forma fragmentada hacia un sistema de marca que permite decidir,
expresarse y operar con consistencia.

La firma visual es una gramática que se ordena:

```text
fragmentos de realidad → relaciones → decisiones → reglas → activaciones → aprendizaje
```

El visitante debe percibir criterio, transformación y capacidad operativa. La página comparte familia con Agencia
Creativa y Producción Creativa, pero su energía es editorial, precisa y relacional; no cinética-industrial.

## Alternatives considered

### A — Editorial operating system — seleccionada

- Primera lectura: tensión empresarial, tesis clara y un diagrama vivo que conecta decisión, expresión y operación.
- Densidad: alterna manifiesto breve, mapas, artefactos y evidencia; evita una pared de cards.
- Firma: anotaciones, relaciones, reglas, estados antes/después y lenguaje convertido en materia visual.
- Motion: ordena relaciones y explica causalidad; se detiene al completar la idea.
- Riesgo: puede sentirse demasiado consultiva si no muestra aplicaciones reales y continuidad con Agencia/Producción.
- Mitigación: casos por capítulos, artefactos utilizables y módulo explícito `Define · Activa · Escala`.

### B — Brand laboratory — descartada como dirección principal

- Primera lectura: experimentación con nombres, símbolos, tipografía y color.
- Ventaja: alta expresividad y atractivo para perfiles creativos.
- Riesgo: reduce Branding Studio a identidad visual, privilegia el craft sobre la decisión y compite con Agencia.
- Uso residual permitido: momentos acotados para mostrar exploración, nunca como estructura total.

### C — Governance command center — descartada como dirección principal

- Primera lectura: approvals, asset library, owners, reglas y métricas.
- Ventaja: diferenciación operacional fuerte.
- Riesgo: entra demasiado tarde en el problema; puede hacer que una transformación de marca parezca software B2B.
- Uso residual permitido: sección de adopción/gobierno y prueba de continuidad.

## Selected composition

### First fold

- Ohio/Efeonce chrome nativo, sin header paralelo.
- Eyebrow `Efeonce Branding Studio` subordinado a la masterbrand.
- H1 de cambio empresarial, no de listado de servicios.
- Subhead con el mecanismo completo: estrategia, arquitectura, identidad y gobierno.
- CTA principal de diagnóstico/encuadre, sujeto a decisión comercial; CTA secundaria navega al autodiagnóstico.
- Pieza visual: señales fragmentadas de empresa/productos/mensajes que encuentran relaciones y forman un sistema.
- Prueba breve sólo si existe evidencia autorizada; ninguna cifra ilustrativa ocupa el hero.

### Rhythm

1. Tensión y reconocimiento.
2. Explicación: marca = decisión + expresión + operación.
3. Diagnóstico de madurez.
4. Situaciones de compra y ofertas.
5. Artefactos utilizables.
6. Activación en el ecosistema creativo.
7. Casos y evidencia.
8. Identidad semántica, gobierno y medición.
9. Autoselección y conversión.

### Surface model

- Grandes superficies editoriales con propósito propio; no una card por párrafo.
- Diagramas y tablas sólo cuando facilitan relaciones repetidas.
- Cards reservadas para momentos de compra, ofertas, casos o rutas que necesiten comparación/acción.
- Bandas dark/light del Ohio runtime elegidas por contenido y contraste, con clases nativas en el root correcto.
- Espacio negativo como herramienta de jerarquía; ningún bloque ornamental sin función narrativa.

## Family resemblance across Creative Services

| Elemento | Branding Studio | Agencia Creativa | Producción Creativa |
|---|---|---|---|
| Verbo | Definir | Activar | Escalar |
| Objeto | Sistema de marca | Idea/campaña | Piezas y formatos |
| Firma visual | Relaciones, reglas, anotaciones | Conceptos, narrativas, territorios | Flujo, versiones, cadencia |
| Motion | Ordena y conecta | Transforma y dramatiza | Multiplica y sincroniza |
| Prueba | Decisiones, adopción, consistencia | Fuerza de idea y respuesta | Throughput, FTR, OTD y calidad |

La familia comparte chrome, tipografía, gutters, CTAs, formato de casos, accesibilidad y el módulo Creative Services.
No comparte una plantilla rígida ni el mismo set-piece animado.

## Token and primitive mapping

| Visual cue | Mapping requerido | Literal rechazado |
|---|---|---|
| Masterbrand Efeonce | assets/tokens públicos verificados en runtime | logo redibujado o wordmark de texto |
| Dark/light bands | clases Ohio nativas y variables page-scoped | overrides globales de header/footer |
| Acents | tokens de marca vigentes auditados antes de implementación | HEX copiado desde benchmark/captura |
| Relational diagrams | SVG/HTML semántico, texto real y fallback estático | canvas ilegible o diagrama sólo decorativo |
| Cards/rutas | módulos Elementor adaptables existentes o extensión gobernada | widget HTML monolítico |
| Motion | variables semánticas page-scoped + CSS/JS scoped | tiempos/easing dispersos en handlers |

## Signature details

1. **Fragment-to-system hero:** la relación aparece sin que el contenido dependa de la animación.
2. **Three-system field:** decisión, expresión y operación se conectan alrededor de una promesa verificable.
3. **Maturity progression:** cinco estados muestran avance sin fabricar un score universal.
4. **Artifact proof:** cada artefacto responde `qué decisión permite tomar`, no sólo `qué archivo entregamos`.
5. **Creative Services navigator:** `Define · Activa · Escala`, con contexto actual y rutas laterales.
6. **Semantic identity specimen:** una misma verdad visible para personas y máquinas; no un panel de IA ficticio.
7. **Governance trace:** owner, decisión, excepción y vigencia como secuencia legible.

## Desktop target

- 1440px: composición editorial de 12 columnas; texto principal 5–7 columnas y set-piece relacional 5–7 según región.
- El hero comunica situación, mecanismo y acción sin depender de completar una timeline.
- Un único bloque sticky localizado puede probarse para `decisión · expresión · operación`; no se aprueba por defecto.
- El módulo Creative Services muestra las tres rutas simultáneamente sin presentar marcas contractuales separadas.

## Mobile target

- 390px: orden narrativo lineal; ninguna composición se limita a encoger desktop.
- Diagramas se transforman en secuencias etiquetadas y relaciones verticales.
- Sin pinning, scroll horizontal obligatorio, parallax ni travel lateral.
- CTA principal visible después del argumento, no como dock persistente que tape contenido.
- La autoselección conserva labels completos y foco visible; cada ruta explica su destino antes de navegar.

## Anti-patterns

- Logo wall como sustituto de casos.
- Mockups de identidad sin problema/decisión/resultado.
- Gradientes, partículas, vidrio o glow como sistema visual principal.
- Paleta semáforo para niveles de madurez.
- Tres columnas repetidas para cada sección.
- Frases genéricas de transformación sin mecanismo.
- Motion que mantiene el viewport secuestrado o contenido oculto esperando JS.
- Paneles ficticios de IA, métricas ilustrativas presentadas como reales o testimonios sin autorización.

## Design decision log

- Decision: `Editorial operating system` es la dirección seleccionada.
- Why: expresa la promesa diferencial —marca como sistema de decisión operable— y crea una frontera clara frente a
  Agencia Creativa y Producción Creativa.
- Reuse / extend / new: reusar chrome/ritmo/CTAs públicos; extender módulos Elementor adaptables sólo después de
  primitive lookup; crear un set-piece one-off únicamente para la relación `decisión · expresión · operación`.
- Open risks: falta de inventario de casos autorizados; CTA/offer de entrada aún no aprobada; slug/canonical por
  investigación SEO; posible solape de copy con TASK-1350.
- Stop condition: no implementar hasta aprobar una dirección de hero entre 2–3 composiciones y completar el claim
  ledger/case-rights inventory.
