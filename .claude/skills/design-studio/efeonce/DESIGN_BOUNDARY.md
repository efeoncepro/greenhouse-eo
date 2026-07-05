# DESIGN_BOUNDARY — la costura completa

> Dónde termina `design-studio` y empieza cada skill hermana. Regla de precedencia al final.
> El borde más fino es con `greenhouse-ai-image-generator` (la mano que produce el pixel).

## La frase que resuelve el 80% de los casos

**`greenhouse-ai-image-generator` GENERA el pixel (la mano, atada al runtime Greenhouse);
`design-studio` DIRIGE el arte (concepto, sistema visual, Key Visual, auditoría) y decide qué
mano/herramienta.** Para un asset que aterriza en la UI, design-studio dirige y DELEGA la
producción canónica a `greenhouse-ai-image-generator`.

## Tabla de hand-offs

| Si el trabajo es… | Pertenece a… | design-studio aporta… |
|---|---|---|
| Producir el asset IA para la **UI de Greenhouse** (helper canónico, DESIGN.md, transparencia) | `greenhouse-ai-image-generator` | concepto, prompt, dirección de arte |
| **Logo real de tercero** / marca de pago (vectorizar, variantes) | `greenhouse-digital-brand-asset-designer` | dónde/cómo va en la composición |
| **Pantalla/layout/interacción** de producto, ruta tokenizada, componentes | `modern-ui` / `product-design-loop` / `greenhouse-ux` | la capa visual/imagen de esa pantalla |
| Decisión fina de **tipografía** (peso/variante/escala/tracking/leading) | `typography-design` | tipo-como-imagen (lockup, headline art) |
| Encoding de **chart/infografía de datos** | `dataviz-design` | estética/dirección del gráfico |
| **Motion**/animación/identidad kinética (implementar) | `motion-design` | dirección conceptual del movimiento |
| **Formato/algoritmo/cadencia por red social** | `social-media-studio` | el KV y su craft visual que la red consume |
| **Estrategia** creativa de campaña / media mix | `digital-marketing` | ejecución del visual de la campaña |
| Doctrina de **marca/GTM/ASaaS** | `efeonce-agency` | expresión visual de esa marca |
| Publicar el **hero/OG/blog** en el sitio | `efeonce-public-site-wordpress` | el arte que se publica |

## Zonas donde SÍ mandamos (para no regalarlas)

- Concepto y sistema visual · Key Visual + su **auditoría** · dirección de arte + mood ·
  fundamentos visuales (composición/color/tipo-como-imagen) · tendencias visuales · **selección de
  modelo IA por tarea** + craft del prompt · orquestación de producción + handoff humano ·
  formatos y specs de entrega.

## El borde con greenhouse-ai-image-generator (detallado)

- Esa skill **ya actúa de operador + director** para assets de Greenhouse UI y usa el CLI `pnpm ai:image`
  + helper canónico. **No la reemplaces.** design-studio la usa como mano cuando el asset es de UI.
- design-studio agrega valor **arriba** (Key Visual, campañas de marketing, auditoría, dirección de
  arte, sistema visual, selección de herramienta entre modelos que la otra skill no cubre — MJ,
  Recraft, Seedance, etc.) y **al lado** (imagen que no vive en el portal: marca, social, print, OOH).
- Regla práctica: **¿el asset vive dentro del portal Greenhouse?** Sí → produce con
  `greenhouse-ai-image-generator`. No (marketing/marca/social/print) → design-studio dirige y elige el modelo.

## Regla de precedencia

1. Si el asset **vive en la UI de Greenhouse** → `greenhouse-ai-image-generator` produce (design-studio dirige).
2. Si es **layout/interacción de producto** → `modern-ui`/`product-design-loop`/`greenhouse-ux`.
3. Si es **logo real de tercero** → `greenhouse-digital-brand-asset-designer`.
4. Si es **concepto/KV/imagen de marketing/auditoría/dirección de arte** → **esta skill manda**.
5. Ante duda genuina, nombra ambas y aclara el hand-off; no invadas silenciosamente.

> Cross-runtime: algunas siblings existen solo en un runtime. Al encadenar, nombra la sibling y su
> runtime, y confirma que la mano de producción elegida está disponible ahí.
