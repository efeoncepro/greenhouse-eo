# 05 · Creative & Video

> En 2026 **el creativo es el nuevo targeting**: el algoritmo optimiza la entrega, tú aportas
> el volumen y la calidad de variantes. Ganan los ciclos creativos rápidos, no los presupuestos
> grandes. La *implementación visual en producto* es de las skills de diseño; aquí decides la
> *estrategia creativa*.

## 1. Creative-as-targeting (la tesis central)

Con delivery automatizado (PMax/Advantage+), el creativo determina a quién y cómo se sirve el
anuncio. Implicaciones:
- **Necesitas más variantes.** Un solo anuncio topa los resultados. El diferencial es la
  **velocidad del ciclo creativo**.
- **La creatividad es una decisión de performance**, no solo estética. Cada variante es una
  hipótesis de mensaje/audiencia.

## 2. El hook manda (los primeros ~3 segundos)

- En video/social, el **hook** decide si siguen viendo. Es la palanca #1. Testea muchos hooks.
- Tipos de hook: pregunta/dolor, resultado/promesa, contraste/patrón roto, prueba/dato,
  narrativa/POV. El mensaje del `01` alimenta el hook.

## 3. Variant factory (sistema de producción)

- **Matriz 3×2×2:** 3 hooks × 2 duraciones × 2 CTAs = **12 variantes**. Lanza, aprende rápido,
  escala ganadores, repón antes de la fatiga.
- **Modular:** produce piezas intercambiables (hook + cuerpo + CTA) para recombinar sin rodar
  todo de nuevo.
- **Cadencia de refresh:** el creativo se fatiga (frequency sube, CTR baja); ten un pipeline de
  reposición, no una tanda única.

### Frontera económica y de producción de la variant factory

La matriz define hipótesis y volumen; no convierte cada variante en unidad tarifaria. Si la ejecuta Efeonce
Creative Studio, desglosa acceso/gobernanza, capacidad humana, Studio Credits, implementación/IP y
rights/licencias/pass-through. Sólo las operaciones generativas gobernadas pasan por
`estimate → reservation → approval → execution → settlement/release/refund`; recomposición, copy, edición,
subtítulos, layout, export y QA determinísticos consumen 0 Studio Credits pero se financian como capacidad o
implementación. Media spend, platform fees de ads, creator/talent, whitelisting y derechos no entran al wallet.

Hand-off por craft: visual → `design-studio`/`greenhouse-ai-image-generator`; motion/video →
`motion-design-studio`; audio/VO → `audio-studio`; social/UGC → `social-media-studio`; business/credits →
`creative-practice` + canon en `docs/business-models/creative-studio/`.

## 4. UGC y creator-style (confianza que convierte)

- **UGC/creator-style ads** rinden porque **parecen hechos por una persona para otras**,
  nativos en el feed. No abandones la producción, pero **deja de sobre-producir todo**.
- Fuentes: creadores reales, clientes, equipo. Whitelisting (correr desde el handle del creator)
  suma autenticidad.
- Autenticidad > pulido: real gana incluso con menos presupuesto (converge con `04`).

## 5. Formatos y canales creativos

| Formato | Canal | Nota |
|---|---|---|
| Video corto vertical | TikTok/Reels/Shorts | hook-first, subtítulos, nativo |
| UGC / testimonio | paid social + landing | confianza; whitelisting |
| Estático/carrusel | Meta/LinkedIn | claridad de mensaje, rápido de iterar |
| Video largo / CTV | YouTube/CTV | storytelling de brand, reach+frequency |
| Motion/animación | display/social | usar tokens de marca; skills de diseño |

## 6. IA creativa (volumen + testing, con brand safety)

- **La IA hace escalable la creatividad:** testea rápido, baja el costo-por-variante, permite
  "10 hooks en el tiempo que antes tomaba 1". Los mejores **combinan**: IA para encontrar qué
  funciona + creators para escalar confianza.
- **AI UGC:** generación de creativos estilo UGC a escala (con cuidado de autenticidad y
  disclosure). Ver `09` para gobernanza.
- **Brand safety:** todo output IA pasa control de marca/legal/claims. No delegues la marca a un
  modelo sin oversight (`ANTIPATTERNS`, `09`).

## 7. Medir creatividad

- **Métricas creativas:** hook rate (3s view), hold/retention, thumb-stop, CTR, y sobre todo la
  conversión/CPA de la variante (dato de `03`/growth).
- **Aprendizaje transferible:** documenta qué hooks/ángulos ganan → alimenta el próximo mensaje
  (`01`) y la próxima tanda. El creativo es un activo de aprendizaje, no solo un asset.
- La *herramienta de generación de assets visuales IA* del repo y los *logos de medios de pago*
  tienen skills propias (`greenhouse-ai-image-generator`, `greenhouse-digital-brand-asset-designer`);
  la *implementación visual en producto* es de `modern-ui`/diseño.

## Checklist de salida

- [ ] Volumen de variantes planificado (variant factory), no un solo anuncio.
- [ ] Hooks múltiples testeados; refresh antes de la fatiga.
- [ ] UGC/creator-style donde la confianza importa; autenticidad > sobre-producción.
- [ ] IA para escalar testing/volumen, con brand safety y disclosure.
- [ ] Métricas creativas (hook rate/retention) + conversión de variante; aprendizajes documentados.
- [ ] Producción, media spend y rights separados; operation map y estimate de credits delegados al Studio.

## Cross-links

- Mensaje que alimenta el hook → `01`; el creativo alimenta el paid → `03`; social → `04`
- Gobernanza de IA creativa → `09`; conversión de la variante → `growth-marketing-cro`
- Assets visuales IA → `greenhouse-ai-image-generator`; logos de pago →
  `greenhouse-digital-brand-asset-designer`; UI en producto → `modern-ui`
- Artefacto → `templates/creative-brief.md`; errores → `ANTIPATTERNS.md`
