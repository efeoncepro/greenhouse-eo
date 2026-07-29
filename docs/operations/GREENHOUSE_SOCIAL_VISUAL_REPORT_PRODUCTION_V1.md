# Greenhouse Social Visual Report Production V1

## Estado

- Estado: vigente como contrato operativo para exploración y producción de piezas sociales visuales.
- Alcance: posts estáticos y carruseles de Instagram que promocionan reportes, dashboards o evidencia de producto.
- Caso de referencia: Brand Visibility / AI Visibility report de Efeonce y la licitación SKY.
- Dueños: `design-studio` para dirección visual; `social-media-studio` para formato y comportamiento social.
- Runtime de composición: Artifact Composer cuando exista un template compatible; composición determinística para el frame final.
- No sustituye: la decisión de plataforma del Artifact Composer ni el contrato de Creative Studio Credits.

## Tesis

Un reporte social no se promociona como una captura de software puesta dentro de una tarjeta. Se presenta como
evidencia editorial: un foco cuantitativo legible, un crop real del producto y una gramática visual que hace que
la evidencia parezca parte del lienzo.

La pieza debe comunicar en tres segundos qué se está demostrando, sin inventar datos ni convertir la interfaz en
una miniatura ilegible.

## Invariantes

1. **Un solo foco de primer nivel.** Elegir score, hallazgo o gráfico dominante. No poner el dashboard completo
   y varios elementos decorativos al mismo nivel.
2. **La captura es material editorial, no una tarjeta.** No agregar marco, radio, sombra pesada, mockup de
   navegador, pastilla azul ni contenedor externo que duplique la metáfora de pantalla.
3. **Crop nativo por formato.** 1080 × 1350 se diseña como composición vertical; nunca se recorta un slide
   horizontal a ciegas ni se reduce la pantalla completa hasta volverla ilegible.
4. **Datos y UI exactos son determinísticos.** No pasar el reporte final por un modelo generativo. El modelo puede
   producir un clean plate o textura aprobada, pero score, gráficos, texto, logo y UI se componen desde assets reales.
5. **Logo único y estable.** El logo externo se ubica en una zona fija de la retícula, normalmente `x=72`, `y=72`,
   con ancho aproximado de 150–170 px en 1080 px. Si el crop conserva el logo dentro del reporte, no agregar otro.
6. **La textura es subordinada.** La trama topográfica/puntos del sistema Sky puede funcionar como campo de baja
   intensidad, pero no puede competir con la evidencia ni convertirse en wallpaper.
7. **La evidencia conserva contexto suficiente.** Un crop debe mantener score, estado, nombre del diagnóstico o
   señal que pruebe que se trata de un reporte real. Si solo queda una cifra aislada, se pierde credibilidad.
8. **El sistema visual viaja; la lámina no se estira.** Heredar color, textura, ritmo y tipo del Artifact Composer,
   pero recomponer foco, crop y safe zones para cada canal.

## Patrones aprobados

### A. Score dominante / Reporte abierto

El score o gauge ocupa la mayor parte del frame. El título del diagnóstico y una señal secundaria del reporte
acompañan. La captura entra a sangre o casi a sangre; no tiene borde exterior.

Es el patrón por defecto para un post único de Brand Visibility.

### B. Evidencia editorial de tres pruebas

Tres crops del mismo reporte muestran score, diagnóstico y una prueba secundaria. Los recortes comparten una
retícula, no tarjetas independientes. Se recomienda para carruseles o cuando el reporte tiene varias señales
visuales que merecen una secuencia.

### C. Adaptación assertion–evidence

Se conserva la lógica del slide de deck: una afirmación real y evidencia visible. Solo se usa si el brief acepta
copy adicional; no se debe comprimir el slide horizontal dentro de un post vertical.

### D. Carrusel narrativo de producto

Cuando el objetivo sea explicar o promocionar un producto, usar una secuencia de hook → problema → reencuadre →
mecanismo → evidencia → lectura → acción → cierre. La portada no debe resolver la historia.

En la portada de un carrusel, el logo Efeonce va pequeño y centrado en la franja inferior; no va en una esquina
superior. La firma de marca no debe competir con el avatar, nombre de cuenta o controles de la plataforma.

Instagram y LinkedIn se producen como entregables diferentes: Instagram como secuencia nativa de imágenes; LinkedIn
como documento PDF con páginas uniformes, título y descripción. La auditoría y las fuentes viven en
[`docs/audits/social/2026-07-28-carousel-storytelling-platform-research.md`](../audits/social/2026-07-28-carousel-storytelling-platform-research.md).

La conversión se define antes de escribir: guardar, compartir, comentar, conversación comercial o lead. Instagram
prioriza tensión visual → descubrimiento → utilidad → conversación; LinkedIn prioriza patrón → implicación de
negocio → mecanismo → prueba → aplicación → debate. Cada carrusel usa un solo cierre y nunca simula un clic sobre
la imagen.

## Anti-patrones bloqueantes

- Captura dentro de un marco azul.
- Pantalla completa reducida hasta ser ilegible.
- Logo flotante, centrado, duplicado o agregado sin relación con la retícula.
- Topografía, curvas o gradientes inventados que compiten con el reporte.
- Mockup de navegador o laptop cuando el asset ya contiene navegador.
- Score, métricas o copy inventados por IA.
- Varios recortes sin continuidad que repiten la misma franja de métricas.
- Bordes, radios o sombras que convierten evidencia en “dashboard card”.
- Aprobar una pieza porque se ve correcta a tamaño completo sin probar thumbnail de feed.

## Contrato de superficies y overlays

El formato del archivo no equivale a la superficie donde se consume. Instagram, LinkedIn y YouTube
rodean, recortan o rejerarquizan una imagen de forma distinta; no existe una safe zone universal publicada
por las plataformas. La auditoría fechada y sus fuentes viven en
[`docs/audits/social/2026-07-28-social-platform-surface-audit.md`](../audits/social/2026-07-28-social-platform-surface-audit.md).

### Familia mínima de derivados

| Uso | Salida mínima |
| --- | ---: |
| Instagram feed / LinkedIn imagen nativa | 1080 × 1350 |
| Instagram perfil prioritario | 1080 × 1440 opcional |
| LinkedIn preview de enlace | derivado horizontal 1.91:1 |
| YouTube Community | 1080 × 1080 |
| YouTube thumbnail | 16:9, idealmente 1920 × 1080 o superior |
| YouTube Shorts / video vertical | 1080 × 1920 |

### Reglas de supervivencia

- En 1080 × 1350, protege aproximadamente los 944 px centrales; los 68 px laterales son margen no crítico
  prudencial, no una especificación oficial.
- Mantén logo, score, headline y dato load-bearing en la zona central. Evita esquinas y tercio inferior.
- Prueba Instagram en feed, vista individual y perfil; LinkedIn en móvil, desktop y preview de enlace;
  YouTube en Home, Subscriptions, Watch, Community expandido y Shorts cuando aplique.
- Haz autónoma la primera lámina de un carrusel o secuencia. Nunca dependas del caption para explicar la evidencia.
- No reutilices el 4:5 como thumbnail de YouTube ni como preview horizontal de enlace de LinkedIn.

## Contrato de producción

1. Normalizar brief: canal, objetivo, formato, evidencia, audiencia y restricción de copy.
2. Reunir fuente primaria: baseline del Composer, asset real del reporte, logo oficial y brand pack.
3. Revisar 3–5 referencias externas de social/data editorial. Usarlas para patrones, no para copiar skins.
4. Proponer 2–3 direcciones visuales materialmente distintas.
5. Seleccionar una dirección y declarar locks, zonas seguras, foco y anti-patrones.
6. Componer determinísticamente el frame; no enviar el compuesto final a un modelo.
7. Auditar: thumbnail, tamaño real, crop, legibilidad, logo único, ausencia de clipping y continuidad del sistema.
8. Auditar las superficies de cada canal con la matriz de overlays antes de aprobar.
9. Derivar carrusel/variantes desde la dirección aprobada, no desde el último archivo disponible.
10. Registrar fuente, prompts si hubo generación, assets, dimensiones, superficies probadas, versión y veredicto humano.

## Gate de salida para Instagram 1080 × 1350

- [ ] Se entiende el foco en tres segundos sin leer el caption.
- [ ] Una sola cosa sobrevive al test de entrecerrar los ojos.
- [ ] El score/hallazgo principal es legible en thumbnail.
- [ ] La captura no está dentro de una tarjeta o marco inventado.
- [ ] El logo aparece una sola vez y está alineado a la retícula.
- [ ] No hay clipping de texto, gráfico, score ni marca.
- [ ] El reporte conserva contexto suficiente para funcionar como prueba.
- [ ] La textura del sistema está subordinada.
- [ ] La composición es nativa 4:5, no un slide horizontal reducido.
- [ ] El contenido crítico sobrevive al recorte operacional 4:5 → 3:4 y al preview de perfil.
- [ ] Se revisaron feed, vista individual y perfil, no solo el lienzo aislado.
- [ ] El frame final no pasó por generación después de estampar datos/logo/UI.

## Gate adicional para carruseles

- [ ] La portada tiene hook autónomo, logo pequeño centrado abajo y no depende del caption.
- [ ] Cada lámina tiene una sola idea y abre o cierra una pregunta narrativa.
- [ ] El cierre usa una instrucción de post/caption, no un botón falso dentro de una imagen orgánica.
- [ ] Instagram conserva el orden y la orientación en todas las láminas.
- [ ] LinkedIn se entrega como PDF con páginas uniformes, título, descripción y accesibilidad revisada.

## Evidencia y referencias

- Referencia primaria local: `scripts/frontend/baselines/artifact-composer/sky/08-informe.png`.
- Asset de producto: `src/lib/artifact-composer/catalogs/deck-axis/assets/product/informe-grader-sky.png`.
- Sistema de composición: `src/lib/artifact-composer/catalogs/deck-axis/`.
- Patrones de data carousel: [Behance Social Media Carousel Design](https://www.behance.net/gallery/171637449/Social-Media-Carousel-Design).
- Patrones de SaaS social: [Pinterest SaaS Ads Design](https://www.pinterest.com/ideas/saas-ads-design/955672486041/) y
  [Dribbble Social Media Post Dashboard](https://dribbble.com/search/social-media-post-dashboard).
- Formato feed: [Figma Instagram Photo Size](https://www.figma.com/resource-library/instagram-photo-size/).
