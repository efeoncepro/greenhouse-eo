# TASK-1628 — revisión final de Globe Producer Credit Capacity Self-View

## Veredicto

`PASS` local. Producer permanece read-only, presenta capacidad efectiva como cifra primaria y separa período,
funding, ledger y daily fence sin convertir unknown/partial en cero. El rollout y smoke autenticado siguen
pendientes, por lo que la task permanece `in-progress`.

## Evidencia

- Scenario: `scripts/frontend/scenarios/globe-producer-credit-capacity-self-view.scenario.ts`.
- Captura: `.captures/2026-08-01T21-45-11_globe-producer-credit-capacity-self-view`.
- Cobertura: desktop 1440×1000, mobile 390×844, 14 frames, teclado, Escape/click-away, focus restore, reduced
  motion, accesibilidad, overflow y runtime.
- La inspección visual confirmó cifra mobile visible, período UTC correcto, close target estable, contraste AA y
  detalle de cap/funding/fence/ledger sin CTA administrativo.

## Scorecard enterprise

| Dimensión | Nota / 5 | Evidencia |
| --- | ---: | --- |
| Jerarquía | 4.8 | capacidad efectiva domina; dimensiones contables quedan subordinadas |
| Economía de superficies | 4.7 | extiende el popover existente; no crea otra pantalla |
| Impacto visual | 4.6 | estado y cifra permanecen reconocibles en desktop y mobile |
| Fidelidad al sistema | 4.8 | tokens Tailwind v4, copy local y patrones del Producer |
| Resistencia a template | 4.6 | composición específica de capacidad, no dashboard genérico |

Promedio: `4.7/5`; floor: `4.6/5`. UI review y enterprise review: `PASS`, sin `BLOCK`.
