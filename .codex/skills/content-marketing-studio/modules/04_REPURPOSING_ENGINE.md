# 04 · Repurposing / Atomization Engine

El multiplicador que separa un estudio de contenidos de un blog. Producir una pieza pilar y publicarla una vez es dejar el 90% del valor en la mesa. **Una pieza pilar → N átomos por canal.** Este es el motor con mayor ROI del studio.

## Principio: create once, distribute forever

- Cada activo pilar (blog largo, webinar, podcast, data study, ebook) es una **cantera**, no una publicación única.
- La atomización se **planifica en el brief** (`02`), no se improvisa después.
- No es "recortar y republicar": es **re-empaquetar el insight para el nativo de cada canal** (un thread no es el post pegado; un Reel no es el video largo cortado sin criterio).

## La convención se DERIVA del cliente, nunca se inventa (as-of 2026-08-25)

Antes de escribir un plan de atomización para un cliente, **inventaría sus entregables
reales** y **deriva de ahí su convención de nombres y sus slots**. El mapa de átomos
que sigue se escribe *dentro* de esa convención — no encima de ella.

Un plan que estrena nomenclatura propia obliga a diseño y al equipo del cliente a
traducir en cada ciclo, y la traducción se pierde el primer mes de carga alta.

**Cómo se inventaría (y cómo NO):**

- 🔴 **Un grep de nombre de archivo NO es un inventario.** Un patrón anclado a la
  convención vieja devuelve **cero** justo para el mes que ya cambió de convención — y
  «cero resultados» se lee como «no hay entregables» cuando el hecho es «no buscaste
  por ese eje». **Barre por carpeta y por extensión**, no por patrón de nombre; y para
  concluir ausencia, **nombra dónde no miraste** (`ANTIPATTERNS.md`).
- ✅ Barre **el ciclo completo** (varios meses), no el mes vigente: la convención se ve
  en la serie, no en un corte.

### Detectar degradación de convención

El inventario no sólo dice *cuál* es la convención: dice **si se está deshaciendo**.
Cuatro señales, y basta una para levantarlo como hallazgo:

| Señal | Qué parece | Qué suele ser |
|---|---|---|
| **Un código de slot desaparece** (`B01`…`B05` → sin código) | detalle de nombrado | se perdió el mapa slot→función; nadie sabe ya cuál es la portada y cuál el cierre |
| **El conteo de piezas por ciclo baja** (5 → 3) | menos trabajo ese mes | alcance encogido sin renegociar, o piezas que no llegaron |
| **Dos o tres convenciones en paralelo el mismo mes** | transición | no hay dueño de la convención; cada quien nombra a su criterio |
| **Unos slots se encogen mientras otros crecen** | rebalanceo | el canal que encoge dejó de tener dueño, aunque el volumen total se vea estable |

⚠️ La cuarta es la más fácil de perder: **el total puede no moverse**. Mira la
distribución por slot, no el agregado.

🔴 **Y un hallazgo de inventario local no es una acusación de proceso.** Una carpeta
vacía o cruzada puede ser **sincronización de almacenamiento**, no incumplimiento de
entrega. **Reverifica con el equipo dueño antes de reportarlo al cliente**; si igual
entra al entregable, entra marcado como *observado, pendiente de confirmar*, con dueño.

### Amarre pieza ↔ sección del brief

Cada pieza del plan **declara de qué sección del brief sale su contenido**. Sin ese
amarre, diseño inventa — y lo que inventa es exactamente lo que nadie verificó.

📏 **Los slots condicionados a un dato no verificado se condicionan igual que sus H2.**
Si un H2 de la pieza pilar está bloqueado esperando una ficha técnica, el carrusel que
sale de ese H2 **está bloqueado también**: no se produce «con lo que haya» ni se
rellena con lógica de oficio. Hereda el bloqueo, el dueño y la fecha.

## El mapa de átomos (artefacto obligatorio por pillar)

Ninguna pieza pilar se cierra sin su mapa de átomos. Plantilla: `templates/repurposing-map.md`.

```
PILLAR: Data study "Estado del AEO en Chile 2026" (blog + PDF)
├─ Newsletter (Glitch): edición dedicada con el hallazgo clave        → greenhouse-email
├─ LinkedIn: carrusel con los 5 datos + post POV                      → social-media-studio
├─ LinkedIn: 3 posts de texto, uno por insight                        → social-media-studio
├─ Instagram/TikTok: Reel con el dato headline                        → motion-design-studio + social
├─ X/Threads: hilo con el resumen                                     → social-media-studio
├─ Clip de video: 60s explicando el gráfico                           → motion-design-studio
├─ Lead magnet: versión gated con metodología completa               → 03 + growth-forms
├─ Slides: para pitch comercial / sales enablement                   → commercial-expert
└─ Guest post / PR: pitch del dato a medios                           → 05 (digital PR)
```

Un data study se convierte en **8–10 activos** con una fracción del esfuerzo de producir 8 piezas originales.

### Implicación de Studio Credits

Atomizar no significa multiplicar créditos por el número de piezas. Un pillar puede alimentar newsletter,
carrusel, deck y posts con **0 nuevas operaciones generativas** si reutiliza el anchor y compone copy/layout de
forma determinística. Sólo devengan las generaciones o transformaciones nuevas realmente ejecutadas —por
ejemplo un hero nuevo, un clip generativo o un outpaint necesario— bajo estimate/reservation aprobados. La
edición, crop, layout, export, QA y distribución siguen siendo capacidad/gobierno. Derechos de música, voz,
creator, stock o likeness permanecen separados.

## Matriz de atomización por tipo de pilar

| Pilar | Átomos de alto rendimiento |
|---|---|
| **Blog long-form** | Newsletter, carrusel, posts de texto (1 por sección), infografía, hilo, clip narrado, Q&A/FAQ |
| **Webinar/evento** | Grabación on-demand, clips (1 por punto), transcript→artículo, Q&A→FAQ, slides→ebook, quotes→social |
| **Podcast** | Audiograma, clips video, transcript→post, show notes, quotes→social, compilado temático |
| **Data study** | Newsletter, carrusel de datos, Reel del headline, infografía, lead magnet gated, pitch PR |
| **Ebook** | Serie de posts (1 por capítulo), newsletter, webinar, carrusel del framework, clips |
| **Case study** | Post de resultado, quote-card, slide de venta, video testimonial, mención en newsletter |

## Átomo, activation asset o cluster node

Atomizar describe el linaje de producción, no el valor estratégico final. Un derivado sigue siendo **activation
asset** cuando sólo resume, anuncia o deriva tráfico. Puede registrarse como **platform-native cluster node** cuando
resuelve un JTBD autónomo, entrega valor completo para su escala, tiene URL/ID estable, relación explícita,
durabilidad razonable y medición propia. El formato social no lo incluye ni lo excluye automáticamente.

Al planificar cada derivado declara `surface`, `platform`, `roles`, `primary_job`, `derived_from`,
`canonical_parent`, `discovery_surfaces`, `progress_event` y `next_best_node`. Los roles pueden coexistir: una pieza
puede ser `search + comprehension + activation` sin crear tres registros.

## Reglas del motor

1. **Nativo por canal.** Cada átomo se re-escribe/re-corta para el canal, no se copia-pega. El craft del átomo textual es de `copywriting`; el corte de video/audio de los studios de asset; la publicación social de `social-media-studio`.
2. **Un insight por átomo.** No metas los 5 datos en un post; haz 5 posts. La atomización también es enfocar.
3. **Secuencia, no ráfaga.** Distribuye los átomos en el tiempo (semanas) para exprimir el pilar, no los quemes todos el día 1 (`05`).
4. **Relación gobernada.** Cada átomo enlaza o apunta al activo ancla cuando el canal lo permite; si no, conserva
   la relación en el registry y ofrece el siguiente paso nativo más claro (descubribilidad con `seo-aeo`).
5. **Etiqueta el linaje.** Todo átomo sabe de qué pillar viene (para medir el rendimiento del **tema**, no solo de la pieza — `06`) **y de qué sección del brief sale su contenido** (arriba).
6. **La convención es del cliente.** Slots, códigos y nombres se derivan de sus entregables reales; el plan se escribe dentro de esa convención y reporta su degradación cuando la detecta (arriba).
7. **No mezcles métricas.** External search, platform search/recommendation y downstream progress se reportan por
   fuente y definición; no sumes sus impresiones como alcance total comparable.

## Refresh de evergreen (la otra cara del motor)

Repurposing no es solo atomizar hacia afuera; es **exprimir el activo en el tiempo**:

- **Actualiza** los pillars evergreen (datos, año, ejemplos) en vez de escribir de cero — más ROI que contenido nuevo. En el Content Factory de Efeonce hay `refresh-plan` / `existing-post-refresh-draft-plan` para esto (overlay Efeonce; ejecución vía `efeonce-public-site-wordpress`).
- **Re-distribuye** el evergreen periódicamente (lo que funcionó hace 6 meses sirve a audiencia nueva).
- **Consolida** clusters relacionados en un pillar más fuerte cuando el tema madura (coordinar con `seo-aeo`).

## Anti-atomización (cuándo NO)

- Contenido **sin insight** no mejora atomizado: multiplicas ruido. Arregla el pilar primero (`01`/`03`).
- Contenido **muy coyuntural** (caduca en días) no amerita el sistema completo.
- No atomices **sin capacidad de distribución** real en el canal destino (un átomo para un canal que no operas es desperdicio).

## Checklist de salida del módulo

- [ ] **Convención del cliente derivada de un inventario real** (por carpeta y extensión, no por patrón de nombre), con sus slots y su degradación reportada si la hay.
- [ ] Cada pillar tiene su **mapa de átomos** (planificado en el brief), con cada pieza **amarrada a la sección del brief** de donde sale su contenido.
- [ ] Los átomos que dependen de un **dato no verificado** heredan el bloqueo, el dueño y la fecha de su H2.
- [ ] Cada átomo es **nativo** del canal (no copia-pega), lleva **un** insight y está clasificado como activation
      asset o cluster node mediante criterios explícitos.
- [ ] Átomos **secuenciados en el tiempo**, con relación al pilar/nodo y linaje etiquetado.
- [ ] Roles, superficie, relación, discovery source y progreso medidos sin agregar impresiones incompatibles.
- [ ] Plan de **refresh** para los pillars evergreen.
- [ ] Hand-offs nombrados (copywriting / studios de asset / social-media-studio / runtime).
- [ ] El mapa distingue reutilización/producción determinística (0 Studio Credits) de nuevas operaciones
      generativas; no multiplica créditos por cantidad de átomos.

## Cross-links

- Formato del pilar → `03`; producir → `02`; distribuir los átomos → `05`; medir por tema → `06`.
- Social → `social-media-studio`; video/audio → studios de asset; email → `greenhouse-email`; refresh runtime → `efeonce-public-site-wordpress`.
- Artefacto → `templates/repurposing-map.md`.
