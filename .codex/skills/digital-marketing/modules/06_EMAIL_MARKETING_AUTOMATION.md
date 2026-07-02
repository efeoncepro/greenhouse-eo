# 06 · Email Marketing & Automation (como canal)

> Email es el canal owned de más alto ROI. Esta skill posee el **craft de canal**: newsletters,
> campañas, nurture/drip, segmentación, MAP. El **lifecycle/behavioral trigger y la lógica de
> retención** son de `growth-marketing-cro` (06); las **plantillas y la entrega runtime** son de
> `greenhouse-email` + `src/lib/email/**`; la **deliverability técnica** vive en growth 06.

## 1. Frontera con lifecycle (para no duplicar)

| Tipo | Qué es | Dueño |
|---|---|---|
| **Broadcast / campaña** | envío a un segmento (newsletter, promo, anuncio) | **esta skill** |
| **Nurture / drip** | secuencia educativa/comercial hacia un objetivo | **esta skill** (craft) |
| **Lifecycle / behavioral** | disparado por comportamiento (activación, churn, win-back) | `growth-marketing-cro` (06) |
| **Transaccional** | disparado por sistema (reset, confirmación) | `greenhouse-email` / `src/lib/email` |

Regla: el *arte del canal* (segmentar, escribir, cadenciar, medir) es tuyo; la *lógica de
cuándo dispara por comportamiento* y la *retención* son de growth.

## 2. Segmentación (la palanca #1 del canal)

- **Campañas segmentadas rinden múltiplos** vs blast (dato-ancla: ~+760% revenue; reverificar).
  Micro-segmentos (500–2.000 contactos) superan a segmentos amplios en conversión.
- **Combina señales:** comportamiento (aperturas/clics/uso) + atributos (rol/industria/etapa) +
  intención predicha por IA.
- **Nunca blast a toda la lista:** pierde revenue y quema deliverability.

## 3. Newsletter (audiencia propia = activo)

- Es contenido owned recurrente que construye relación y demanda (converge con `02`). Trátala
  como producto: promesa clara, cadencia consistente, valor por sobre promo.
- **Crece la lista con valor** (lead magnets, contenido), nunca comprando listas.

## 4. Automation / MAP

- **Nurture/drip** hacia un objetivo (educar → consideración → demo/compra). Diseña la secuencia
  por etapa y disparador (comportamiento > calendario).
- **Automation rinde más que broadcast:** dato-ancla open ~30.6% / CTR ~7.39% vs ~20.7% / 2.27%
  (reverificar). El 82% de marketers usa automation.
- **MAP:** HubSpot/Marketo/Customer.io. En Efeonce, la entrega runtime es `src/lib/email/**` +
  `greenhouse-email`; HubSpot es CRM in-repo (ver `efeonce/EMAIL_CHANNEL.md`).

## 5. Craft del email (lo que mueve la aguja)

- **Subject line + preheader:** deciden la apertura. IA en subject lines: +26% open (reverificar);
  send-time optimization: +14% adicional. Testea.
- **Un objetivo por email**, CTA claro (converge con CRO, `growth-marketing-cro` 03).
- **Personalización** más allá del nombre: contenido dinámico por segmento/comportamiento.
- **Mobile-first** (mayoría abre en móvil): diseño y CTA thumb-friendly.

## 6. Deliverability (pre-requisito; detalle en growth 06)

- **Autenticación:** SPF + DKIM + **DMARC**. **One-click unsubscribe (RFC 8058)** en marketing.
- **Spam rate <0.10%** (bloqueo Gmail/Yahoo ≥0.30%). Higiene de lista: sunset de inactivos, sin
  compra de listas. El detalle completo de deliverability 2026 está en `growth-marketing-cro` 06;
  en el repo hay `deliverability-monitor` (`efeonce/EMAIL_CHANNEL.md`).

## 7. Medir email

- **Por email/campaña:** open (con cautela por privacy/MPP), CTR, CTOR, conversión, unsubscribe,
  spam rate, revenue/segmento.
- **Deliverability como métrica de salud** (inbox placement, bounces, quejas).
- Atribución al pipeline → `growth-marketing-cro`.

## Checklist de salida

- [ ] Tipo correcto (broadcast/nurture vs lifecycle→growth vs transaccional→greenhouse-email).
- [ ] Segmentación real (no blast); micro-segmentos donde aplique.
- [ ] Subject/preheader testeados; un objetivo + CTA claro; mobile-first.
- [ ] Deliverability OK (SPF/DKIM/DMARC, one-click unsubscribe, spam <0.10%, higiene).
- [ ] Métricas de canal + salud; atribución cedida a growth.

## Cross-links

- Contenido/newsletter → `02`; campaña integrada → `07`; martech/MAP → `08`
- Lifecycle/behavioral + deliverability detallada + atribución → `growth-marketing-cro` (06/07)
- Plantillas/entrega runtime → `greenhouse-email` + `efeonce/EMAIL_CHANNEL.md`
- Artefacto → `templates/campaign-brief.md`; errores → `ANTIPATTERNS.md`
