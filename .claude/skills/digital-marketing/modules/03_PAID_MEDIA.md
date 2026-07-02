# 03 · Paid Media / Performance Advertising ⭐

> El módulo operativo más profundo. En 2026 la IA se comió la operativa de pauta: el trabajo
> humano se corre a **audiencias (first-party), calidad de señal y creatividad**. La
> *economía del canal (CAC/payback)* y el *channel-market fit* estratégico son de
> `growth-marketing-cro`; aquí decides **cómo ejecutar el canal**.

## 1. El cambio estructural de 2026

- **PMax (~91% adopción a escala) y Advantage+ (~88%)** concentran el gasto; ~80% de los
  dólares digitales van por Google + Meta. La subasta y el targeting se automatizaron.
- **El keyword/targeting manual cede a "señales":** audiencias first-party, contexto de
  landing y comportamiento de conversión. Las plataformas favorecen **first-party uploads**
  sobre pujas por query.
- **La falla #1 de las campañas IA es la señal de conversión** rota/duplicada/incompleta:
  la IA optimiza hacia el outcome equivocado. **Basura entra, basura sale.**
- **Datos-ancla (reverificar):** tROAS +38% vs manual CPC; PMax +35% conversiones a −20% CPA;
  62% cita la complejidad de setup como barrera. Son promedios de plataforma, no garantía.

## 2. Estructura de cuenta (el esqueleto)

- **Separa por objetivo y por señal, no por vanidad.** Brand search / non-brand / prospecting /
  retargeting deben estar separados para no mezclar señales ni robarse crédito.
- **PMax:** organiza por **asset groups** temáticos + **audience signals** que guían a la IA;
  usa **feeds limpios** (e-commerce) y **exclusiones** (brand, marcas, placements basura) para
  que no canibalice search de marca. PMax automatizado **no es autónomo** — necesita guardrails.
- **Presupuesto y pacing:** evita cambios bruscos (resetean el aprendizaje del algoritmo);
  cambia ≤20–30% por vez y da ventana de aprendizaje. Concentra presupuesto donde hay señal.

## 3. Bidding (deja que la IA optimice, pero aliméntala bien)

- **Smart Bidding por objetivo:** tCPA (leads), tROAS (revenue), Max conversions/value. Elige
  el que matchea tu objetivo real y tu dato de conversión.
- **Calidad de señal = combustible:** conversiones bien definidas, valores correctos, sin
  duplicados, idealmente **server-side + Enhanced Conversions / CAPI** para resistir signal
  loss. Sin esto, ningún bidding funciona. (La *arquitectura* de tracking/conversion es de
  `growth-marketing-cro` 07; coordínala.)
- **Modeled conversions:** post-cookie, parte de las conversiones son modeladas; entiéndelo al
  leer resultados (no todo es determinístico).

## 4. Signal loss post-cookie (los tres pilares)

Para 2026, el éxito se apoya en:
1. **Audience data (first-party):** listas propias y consentidas subidas a las plataformas
   (Customer Match, Advantage+ audiences). El activo más valioso.
2. **Landing page context:** relevancia del destino (message match) — coordina con CRO
   (`growth-marketing-cro` 03) porque afecta calidad de conversión.
3. **Conversion behavior:** señal limpia server-side. Ver §3.

Complementa con **consent management** (Consent Mode v2) y **modeled/aggregated** measurement.

## 5. Canales principales (fit por objetivo)

| Canal | Fuerte para | Notas 2026 |
|---|---|---|
| **Google Search / PMax** | demand capture (intención) + full-funnel | PMax domina; cuida exclusiones + señal |
| **Meta (Advantage+)** | demand creation + prospecting + retargeting B2C/DTC | creativo es la palanca; UGC gana |
| **LinkedIn Ads** | B2B, ABM, targeting por cargo/empresa | caro; usar con contenido de valor + ABM (`07`) |
| **TikTok Ads** | awareness/alcance, audiencias jóvenes, video nativo | creative-first; estética nativa |
| **YouTube / CTV** | awareness con video, storytelling | reach + frequency de brand |
| **Programmatic / display** | awareness, retargeting, alcance barato | cuidado con placements/brand safety |
| **Retail media / otros** | según vertical | evaluar por audiencia + economía |

## 6. Creatividad = la palanca de performance (ver `05`)

Con delivery automatizado, **el creativo es el nuevo targeting**. La diferencia entre campañas
la hace el **volumen y velocidad de variantes**, no el ajuste manual de audiencias:
- **Variant factory (ej. 3×2×2):** 3 hooks × 2 duraciones × 2 CTAs = 12 variantes; lanza,
  aprende rápido, escala ganadores. Repón creativos antes de la fatiga.
- **UGC/creator-style** gana en confianza y rinde nativo en feed (`05`).
- La IA acelera la producción de variantes (`09`); úsala para volumen, con brand safety.

## 7. Retargeting (con cap y respeto)

- Segmenta por profundidad de intención (visitó / agregó al carrito / abandonó form). Mensaje
  distinto por segmento.
- **Frequency cap** obligatorio: perseguir sin límite daña marca y desperdicia gasto.
- No confundir "retargeting funciona" con incrementalidad: mucho retargeting captura gente que
  iba a convertir igual → valida con incrementality (`growth-marketing-cro` 07).

## 8. Medición del paid (por canal; atribución cedida)

- **KPIs de canal:** CPM, CPC, CTR, CPA/CPL, ROAS de plataforma, frequency. Útiles para
  optimizar *dentro* del canal.
- **No sobre-atribuyas:** el ROAS de plataforma sobre-cuenta (cada plataforma reclama la
  conversión). La **asignación cross-canal real es MMM + incrementality → `growth-marketing-cro`**.
- **UTM consistentes** en todo destino (`templates/utm-campaign-naming-convention.md`).

## Checklist de salida

- [ ] Objetivo y señal de conversión definidos y limpios (server-side si es posible).
- [ ] Estructura de cuenta separada por objetivo/señal; exclusiones en PMax.
- [ ] First-party audiences cargadas; Consent Mode configurado.
- [ ] Bidding acorde al objetivo, alimentado con señal correcta.
- [ ] Plan de creativos (variant factory), no un solo anuncio.
- [ ] Retargeting segmentado con frequency cap.
- [ ] UTM consistentes; atribución cross-canal cedida a growth.

## Cross-links

- Creatividad que alimenta el paid → `05`; presupuesto/canal-mix → `SKILL.md §4`, `07`
- Señal/tracking/atribución/incrementality → `growth-marketing-cro` (07); CRO de la landing → (03)
- Economía del canal (CAC/payback) + channel-market fit → `growth-marketing-cro` (02)
- IA en pauta → `09`; errores (set-and-forget, señal rota) → `ANTIPATTERNS.md`
- Artefacto → `templates/paid-media-plan.md`
