# 09 · Production Studio — la mano de ejecución

> **Qué es esto.** El módulo de **orquestación**: cómo design-studio pasa de idea a asset
> entregado sin reinventar la producción. La regla madre de la skill vive acá — **director,
> no dictador**: decides el arte y eliges la mano; **no rehaces** la producción canónica.
> Un primitive/mano por tarea, muchos consumidores del concepto. Detalle operativo y
> herramientas conectadas en `efeonce/STUDIO_TOOLING.md`.

> **Sello de frescura.** El **router de herramientas es VOLÁTIL** *(as-of 2026-07 —
> reverificar)*; el **loop** y la **regla de intención→tokens** son estables.

---

## 1. El loop del estudio

```
idear → dirigir → producir → auditar → iterar
```

| Fase | Qué pasa | Dónde vive |
|---|---|---|
| **Idear** | Concepto, ángulo, mensaje visual | `modules/04` (KV), `modules/06` (mood) |
| **Dirigir** | Brief + mood board + selección de herramienta + prompt | `modules/06`, `08` + `templates/` |
| **Producir** | La mano correcta genera/edita el pixel | §2 router (delega) |
| **Auditar** | Rúbrica puntuada contra brief y marca | `modules/05` + scorecard |
| **Iterar** | Refinar el ganador (edita > rifa) o handoff humano | `modules/08` §4, §3 handoff |

**No saltes fases.** Producir sin dirigir = azar caro. Cerrar sin auditar = entregar sin
criterio. El loop es corto y barato en las primeras vueltas (miniaturas), caro solo al final
(4K/upscale/print).

## 2. Router de producción (a qué mano va cada cosa)

> Volátil en la columna de herramientas *(as-of 2026-07 — reverificar)*; el ruteo por destino
> es estructural.

| Destino del asset | Mano / herramienta | Regla |
|---|---|---|
| **UI de Greenhouse** (icono, empty state, banner, hero de producto, PNG transparente, edición) | **`greenhouse-ai-image-generator`** | Helper canónico + DESIGN.md/AXIS + QA de transparencia. **NUNCA** por fuera. |
| **Marketing / campaña / concepto** (afiche, social, hero de landing, mood) | Secuencia de manos según operación: Seedream Lite/Pro, GPT Image 2, Nano Banana, Midjourney, Ideogram, Firefly, Higgsfield o Magnific (`modules/08` y `modules/12`) | design-studio dirige el linaje; cada herramienta cambia un delta y preserva el anchor. |
| **Logo real de tercero / marca de pago** | **`greenhouse-digital-brand-asset-designer`** | **NUNCA** dibujar de memoria. |
| **Craft final humano** (retoque fino, ilustración propietaria, print) | Persona del equipo creativo | Handoff con spec + refs (§4). |
| **Motion / identidad kinética** | Dirige acá → implementa **`motion-design`** | El estado estático se resuelve primero. |
| **Chart / infografía de datos** | **`dataviz-design`** | Encoding de datos ≠ dirección de arte. |

**Cómo se lee el router:** primero preguntas *¿dónde vive el asset?* No *¿qué herramienta me
gusta?*. El destino manda la mano.

## 3. Cuándo IA y cuándo humano

| Favorece IA | Favorece humano |
|---|---|
| Divergencia rápida, muchas opciones baratas | Craft final, decisión de marca |
| Fotoreal genérico, texturas, fondos, mood | Ilustración propietaria de Efeonce |
| Iteración de variantes, exploración de dirección | Retoque quirúrgico, composición fina, print CMYK |
| Concepto/thumbnail para validar antes de invertir | Casos con riesgo legal/disclosure alto |
| Upscale/enhance de un frame ya elegido | Sistema de marca que debe ser gobernado a mano |

**Regla:** la IA hace el 80% barato y rápido; el humano pone el 20% que decide si es marca o
ruido. El juicio de marca **nunca** se delega al modelo.

## 4. Handoff humano (cuando el craft final es de una persona)

Si el cierre lo hace el equipo creativo, no fuerces IA — **entrega dirección, no un pixel a
medias**. El handoff mínimo:

- **Concepto y mensaje** en una frase (qué debe sentir/entender el que ve).
- **Refs visuales** curadas (mood board, `templates/art-direction-moodboard.md`).
- **Sistema visual** aplicable: paleta (tokens si va a UI), tipo, grilla, tratamiento.
- **Assets base** ya generados que la persona toma como punto de partida.
- **Spec de entrega** (formato, ratio, resolución, color space) → `modules/10` +
  `templates/asset-delivery-spec.md`.
- **Qué NO tocar** (invariantes de marca): logo, proporciones, colores institucionales.

## 5. Gasto gobernado

Producir con IA **cuesta créditos**. Dimensiona antes de producir en volumen — no rifes en
alta calidad sin haber validado dirección barata primero.

**Escalera de costo (barato → caro), no la saltes:**

1. **Miniaturas de exploración** (baratas, muchas) → leer dirección.
2. **Curaduría humana** → elegir 1–3 direcciones.
3. **Generación de calidad** de las elegidas (menos, mejor).
4. **Edición dirigida** (inpaint/outpaint) del ganador — más barato que regenerar.
5. **Upscale/enhance** solo del frame final (`modules/08` §4).

En campañas multi-modelo, costo y azar también se controlan en los relevos: aprobar un anchor
antes de derivar, ejecutar en paralelo sólo ramas independientes y registrar first-pass
compliance. Cargar `modules/12_HYBRID_IMAGE_CAMPAIGN_PRODUCTION.md`.

> **Regla dura (dimensionar antes de volumen).** No saques **20 variantes en 4K** de una
> dirección sin validar. Saca ~12 miniaturas, elige 2, *esas* van a alta + upscale. La
> virality/iteración vive en la fase barata; el gasto vive al final, sobre lo ya decidido.
> Antes de una tanda grande, estima créditos y confírmalo (ver `efeonce/STUDIO_TOOLING.md`).

## 6. Regla de intención → tokens (el borde con la UI)

Cuando un asset o su *look* aterriza en la UI de Greenhouse, **la imagen es intención, no
valores literales.**

- **NUNCA** transcribas HEX/px/fontFamily/ms crudos del concepto IA al código.
- El color se mapea a **tokens AXIS** (`theme.axis.*` / `theme.palette.*`), el tipo a la SoT
  tipográfica (variante/token), el spacing a la escala **4n**, el motion a tokens de motion.
- El concepto IA **dirige**; la implementación tokenizada la hace `product-design-loop` /
  `greenhouse-ai-image-generator` / `modern-ui`. design-studio entrega la intención mapeada,
  no el pixel a copiar.

Fuente de la regla: doctrina de `product-design-loop` + Figma Implementation Contract (ver
CLAUDE.md · UI Platform).

## 7. Checklist de cierre de producción

> - [ ] ¿El asset fue **ruteado por destino** (§2), no por herramienta preferida?
> - [ ] Si es **UI de Greenhouse**, ¿lo produjo `greenhouse-ai-image-generator`?
> - [ ] Si es **logo real**, ¿pasó por `greenhouse-digital-brand-asset-designer`?
> - [ ] ¿Divergí barato antes de producir en alta (§5)? ¿Estimé créditos antes del volumen?
> - [ ] ¿Audité contra brief y marca (`modules/05`) antes de declarar listo?
> - [ ] Si va a UI, ¿la intención se mapeó a **tokens AXIS**, sin HEX/px crudos?
> - [ ] Si hay craft humano, ¿entregué spec + refs + assets base (§4)?
> - [ ] ¿Cerré con el artefacto (`templates/asset-delivery-spec.md` o el que aplique)?
> - [ ] ¿Reverifiqué las herramientas volátiles (`SOURCES.md`)?

---

> **Cierre.** Production Studio es la mano que ejecuta *sin reinventar la mano*. Dirige el
> concepto, rutea por destino, delega la producción canónica, gobierna el gasto y mapea la
> intención a tokens. Detalle operativo + herramientas conectadas + estimación de créditos en
> `efeonce/STUDIO_TOOLING.md`.
