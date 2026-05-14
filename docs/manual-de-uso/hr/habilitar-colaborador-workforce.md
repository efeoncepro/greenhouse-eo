# Habilitar colaborador en Workforce Activation

> **Módulo:** Personas y HR
> **Ruta:** `/hr/workforce/activation`
> **Permiso:** `workforce.member.activation_readiness.read`

Usa Workforce Activation cuando una persona aparece con ficha laboral pendiente o en revisión. La pantalla centraliza readiness y te indica qué resolver antes de completar la ficha.

## Flujo recomendado

1. Entra a **Personas y HR → Workforce Activation**.
2. Selecciona una persona en la cola priorizada.
3. Revisa el panel derecho: readiness %, blocker principal y lanes críticas.
4. Usa **Ruta de desbloqueo** para ir a la faceta dueña del dato: People, Legal Profile, Payment Profiles, compensación o relación laboral.
5. Cuando no queden blockers críticos, el botón **Completar ficha** queda habilitado.
6. Completa la ficha desde el drawer. El sistema registra actor, estado anterior, snapshot de readiness y hash.

## Qué no hacer

- No uses el override como camino normal.
- No dupliques datos de salario, cargo, legal profile o pago dentro de Workforce Activation.
- No completes fichas bloqueadas sin resolver primero la fuente dueña del dato.

## Estados

- **Listo:** la lane no bloquea.
- **Bloqueado:** impide completar ficha.
- **Revisar:** permite avanzar solo si no hay blockers, pero recomienda acción.
- **No aplica:** la lane no corresponde a ese tipo de relación.

## Troubleshooting

- Si una persona debería aparecer y no aparece, revisa que tenga `workforce_intake_status != 'completed'` y `active=true`.
- Si el botón no habilita, revisa el primer blocker del inspector.
- Si hay pago por Deel, el perfil de pago interno no bloquea; aparece como warning.
- Si necesitas override, debe hacerlo un admin con razón de negocio explícita.
