# Lifecycle Email Map

> Dispara por comportamiento, no por calendario. Email sano = deliverability + conversión.
> Ver `06`.

## Higiene técnica (pre-requisito, verificar)
- [ ] SPF + DKIM + **DMARC** publicados (p=none → progresar a quarantine/reject)
- [ ] One-click unsubscribe (RFC 8058) en marketing/promocional
- [ ] Spam rate < 0.10% (bloqueo Gmail/Yahoo ≥ 0.30%)
- [ ] Higiene de lista: sin compra de listas, sunset de inactivos, doble opt-in donde aplique

## Mapa por etapa
| Etapa | Disparador (comportamiento) | Objetivo | Mensaje / CTA | Métrica |
|---|---|---|---|---|
| Bienvenida / onboarding | signup_completed | llevar al aha (TTV) | camino al primer valor | activation rate |
| Activación | no alcanzó aha en N días | desbloquear valor | tip contextual / ayuda | % que activa |
| Adopción | activó, uso creciente | reforzar hábito (loop) | próximo paso de valor | engagement / retención M3 |
| Invitación / referral | justo post-aha | alimentar viral loop | invita / comparte output | k-factor |
| Expansión | uso alto / límite de plan | upsell por valor | upgrade / seats | NRR |
| Renovación | pre-renovación | asegurar valor percibido | resumen de valor + CTA | GRR |
| Win-back | caída de uso / churn | recuperar | oferta / novedad relevante | reactivación |
| Dunning (involuntario) | pago fallido | recuperar pago | actualizar tarjeta | % recuperado |

## Reglas
- Segmenta por engagement; no envíes a inactivos crónicos (protege el dominio).
- Relevancia > frecuencia. Cada envío justifica su interrupción con valor.
- Nada de dark patterns (opt-out escondido, confirmshaming).
