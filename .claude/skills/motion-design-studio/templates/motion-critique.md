# Motion Critique — [Nombre del proyecto] · iteración [n]

> **Qué es esto.** Una crítica estructurada de motion, dimensión por dimensión. Regla dura: **feedback
> accionable, no "no me gusta"** — cada nota dice qué está mal, por qué y qué cambiar. Se usa en cada
> revisión (animatic, rough cut, master). Doctrina transversal: `modules/01-08` + `ANTIPATTERNS.md`.

## Encuadre

| Campo | Valor |
|---|---|
| Pieza revisada | [nombre · versión/timecode] |
| Etapa | [animatic · rough cut · fine cut · master] |
| Revisor | [persona] · **Fecha** [YYYY-MM-DD] |
| Contra qué se juzga | [motion-brief.md — objetivo, mensaje, tono] |

## Crítica por dimensión

Para cada una: **✅ qué funciona · ⚠️ qué no · 🔧 acción concreta**.

### 1. Concepto / narrativa
- ✅ [ ] · ⚠️ [ ] · 🔧 [el arco no llega al clímax → recortar desarrollo 2s, adelantar el giro]

### 2. Timing / ritmo
- ✅ [ ] · ⚠️ [ ] · 🔧 [cortes uniformes matan tensión → alargar el clímax, acelerar el gancho — `modules/02`]

### 3. Cámara / composición
- ✅ [ ] · ⚠️ [ ] · 🔧 [movimiento de cámara sin motivo en plano 3 → dejar estático o motivar con la acción]

### 4. Animación / principios
- ✅ [ ] · ⚠️ [ ] · 🔧 [movimiento lineal sin ease/arco → agregar slow-in/out y anticipación — `modules/01`]

### 5. Edición / pacing
- ✅ [ ] · ⚠️ [ ] · 🔧 [jump-cut involuntario en corte 4 → cubrir con match-on-action o transición]

### 6. Sonido
- ✅ [ ] · ⚠️ [ ] · 🔧 [cortes no caen con la música → alinear al downbeat; VO tapada → ducking — `modules/07`]

### 7. Color / finish
- ✅ [ ] · ⚠️ [ ] · 🔧 [grade inconsistente entre tomas 2 y 3 → igualar en DaVinci; falta grano final — `modules/08`]

### 8. Consistencia IA
- ✅ [ ] · ⚠️ [ ] · 🔧 [rostro deriva entre chunks en toma 3 → reforzar Soul ID / refs, re-render — `modules/09`]

## Prioridad de cambios

| Prioridad | Cambio | Dimensión | Bloquea entrega |
|---|---|---|---|
| P0 (bloqueante) | [ ] | [ ] | [sí] |
| P1 (importante) | [ ] | [ ] | [no] |
| P2 (nice-to-have) | [ ] | [ ] | [no] |

## Veredicto y siguiente iteración

- **Veredicto.** [aprobado · aprobado con cambios menores · re-trabajo requerido]
- **Contra el brief.** [¿cumple objetivo, mensaje y tono? · qué falta para lograrlo]
- **Siguiente iteración = ** [lista corta de lo que se ataca primero · quién · para cuándo]

## Reglas de la crítica

- [ ] Cada nota tiene acción concreta, no juicio de gusto ("no me gusta" está prohibido)
- [ ] Se separó lo bloqueante (P0) de lo opcional (P2)
- [ ] Se juzgó contra el brief, no contra preferencia personal
- [ ] Se reconoció lo que SÍ funciona (no solo lo malo — evita re-trabajo destructivo)
- [ ] Las notas citan la dimensión/módulo para que la corrección sea rastreable
