# 02 · Acquisition

> Traer usuarios/leads de forma **eficiente y diversificada**. En 2026 el CAC sube
> estructuralmente; la ventaja no es un canal mágico sino portafolio + loops propios.

## 1. La realidad del CAC en 2026 (contexto, reverificar cifras)

- CAC **+40–60% desde 2023** (+222% en 8 años). Drivers: competencia, privacy,
  costo de ads, ciclos B2B más largos (~134 días), AI Overviews interceptando tráfico
  orgánico, cookie deprecation inflando el CAC reportado 25–45%.
- Los de **menor blended CAC** no tienen un canal mágico: **6–9 canales**, cada uno
  5–20% de la adquisición. **La diversificación es el mayor driver no-creativo de CAC
  eficiente.**
- Referidos son el canal más eficiente por costo; orgánico/content es caro por pieza
  pero compone; paid es rápido pero se erosiona.

**Implicación:** no apuestes todo a un canal (riesgo de plataforma). Busca 2–3 loops
propios (content/referral) + paid como acelerador medible, no como muleta permanente.

## 2. Elegir canal: channel-market fit

No todo canal sirve a todo negocio. Filtra por:

- **Dónde está la atención de tu ICP** (no dónde está de moda el canal).
- **Economía:** ¿el CAC del canal permite payback < 12 meses al ARPU/margen real?
- **Ciclo:** B2B enterprise (ciclo largo, comité) ≠ B2C impulso. El canal debe
  encajar con el motion.
- **Escalabilidad y saturación:** ¿cuánto volumen antes de que el CAC se dispare?

Empieza estrecho (1–2 canales hasta dominarlos) y diversifica al escalar. La
dispersión temprana en 8 canales mata a los pre-PMF.

## 3. PLG vs SLG vs híbrido

| | PLG (Product-Led) | SLG (Sales-Led) | Híbrido |
|---|---|---|---|
| Motor | producto (free trial/freemium/self-serve) | equipo de ventas | PLG + sales sobre PQLs |
| ICP | self-serve, bottoms-up, ticket bajo-medio | enterprise, ticket alto, comité | multi-segmento |
| Métrica de tope | activation, PQL velocity | MQL/SQL, pipeline | PQL → SQL |
| CAC | bajo por usuario, escala con producto | alto, escala con headcount | mixto |
| Cuello 2026 | **activación** (40–60% nunca activa) | ciclo largo + costo por touch | handoff PQL→sales |

Contexto 2026: ~58% de B2B SaaS usa PLG y 91% planea aumentar, pero solo ~34% trackea
activación — la ventaja está en tratar PLG como sistema medible (activation → PQL →
expansión). El pipeline calificado y su cierre son de **`commercial-expert`**; growth
entrega el PQL/MQL bien instrumentado.

## 4. Loops de adquisición (motor propio, no gasto perpetuo)

### Referral / viral loop
- **k-factor** = invitaciones por usuario × tasa de conversión de la invitación.
  K>1 = viralidad genuina (raro; Hotmail/Zoom-early). B2C bueno 0.15–0.4; B2B típico
  0.2–0.8. **Casi ningún B2B es viral puro** — no prometas K>1.
- **Efecto en economía:** K=0.5 → multiplicador viral 2× → blended CAC = mitad del
  paid CAC. K se compone con el paid, no lo reemplaza.
- **Viral cycle time** importa tanto como K: un loop rápido con K moderado supera a
  uno lento con K alto. Optimiza *ambos*: más invitaciones (prompt en el aha moment),
  mejor conversión de invitación (landing del invitado clara), ciclo más corto.
- **Tipos:** invitación explícita (Slack), colaboración/output compartible (Figma,
  reportes con marca), incentivo doble-cara (Dropbox +espacio). AI-native tiende a ser
  3× más propenso a viralidad (outputs compartibles embebidos en el workflow).

### Content loop
Producto o usuarios generan artefactos indexables/compartibles que atraen nuevos
usuarios (UGC, páginas programáticas, reportes públicos). La táctica SEO/AEO para que
ese contenido sea *hallado y citado* es de **`seo-aeo`**; aquí decides el *loop* (qué
se genera, cómo re-alimenta el input, cómo se mide tráfico/pieza).

## 5. Métricas de adquisición (guardrails)

```
CAC (canal)      = gasto del canal / clientes del canal
Blended CAC      = gasto total / clientes totales
CAC payback      = CAC / (ARPU mensual × margen bruto)          → objetivo < 12 meses
LTV:CAC          = LTV / CAC                                      → ref. 3:1 (validar)
Magic number     = ΔARR nuevo / gasto S&M del período anterior   → SaaS
```

**Guardrail de calidad, no solo volumen:** un canal barato que trae leads que no
activan/retienen es caro de verdad. Mide CAC **por cohorte retenida/activada**, no por
signup. Ata siempre adquisición al funnel completo (→ `05`, `06`).

## 6. Dark social y demanda no atribuible

Mucha demanda B2B nace en canales no rastreables (Slack, WhatsApp, DMs, podcasts,
comunidades). No la verás en last-click. Captúrala con: **"¿cómo nos conociste?"**
self-reported en el signup, MMM/incrementality (→ `07`), y no recortes canales de
"branding" solo porque MTA no los ve.

## 7. La web agéntica como canal emergente

Agentes IA empiezan a *descubrir y recomendar* productos, comprimiendo el funnel.
Prepararse: datos estructurados/feeds, schema, ser citable/recuperable (→ `seo-aeo` +
overlay agentic-readiness), y APIs limpias para que un agente pueda *actuar*. Todavía
emergente (reverificar tamaño/velocidad), pero el trabajo de "ser hallado por IA" ya
es adquisición, no solo SEO.

## Checklist de salida

- [ ] 2–3 canales con channel-market fit validado (atención del ICP + economía).
- [ ] Al menos un loop propio (referral/content) en marcha o en diseño.
- [ ] CAC/payback por canal **y por cohorte activada** (no solo por signup).
- [ ] Captura de dark social (self-reported) + plan MMM/incrementality si hay escala.
- [ ] Nada de monocanal frágil ni dispersión pre-PMF.

## Cross-links

- Modelo y loops → `01`; convertir el tráfico que traes → `03`
- Activar lo que adquieres → `05`; medir atribución → `07`
- Táctica SEO/AEO del content loop → skill `seo-aeo`
- Cierre de pipeline / pricing → skill `commercial-expert`
- Errores (copiar canal, vanity, escalar sobre fuga) → `ANTIPATTERNS.md`
