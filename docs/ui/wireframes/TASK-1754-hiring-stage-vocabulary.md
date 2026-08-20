# TASK-1754 — Mapa de etapas visible del pipeline de Hiring

> **Tipo:** contrato de vocabulario, no layout. El pipeline ya existe y no cambia de forma; lo que
> cambia es **qué estados existen y cómo se nombran** en cada superficie.

## El problema que resuelve

Hoy el dominio tiene más etapas que la interfaz, y tres de ellas comparten nombre visible:

```
DOMINIO (12)                    UI (6)              CORREO AL CANDIDATO
─────────────────────────────────────────────────────────────────────
sourced ─────────────────────→  Sourced             (sin correo)
screening ───────────────────→  Screening           (sin correo)
qualified ───────┐
shortlisted ─────┼───────────→  Evaluación          "Preselección"  ← nombre distinto
client_review ───┘
interview ───────────────────→  Entrevista          "Entrevista"
decision_pending ────────────→  Decisión            (sin correo)
selected ────────┐
backup ──────────┤
rejected ────────┼───────────→  Cerrado             (según decisión)
withdrawn ───────┤
handoff_ready ───┤
closed ──────────┘
```

Tres consecuencias medidas:

1. **La automatización es inalcanzable.** La política de assessment sólo acepta `shortlisted` o
   `interview` como disparador, y `shortlisted` no se puede elegir desde el menú. Al elegir
   "Evaluación" la postulación cae en `qualified`. Dos candidatas reales pasaron por ahí sin recibir
   su test.
2. **El operador no puede trazar.** Dos postulaciones en "Evaluación" pueden estar en estados
   distintos y comportarse distinto, sin nada que lo explique en pantalla.
3. **La misma etapa tiene dos nombres según quién mira.** El operador ve "Evaluación"; la persona
   candidata recibe un correo que dice "Preselección".

## Estado objetivo

El dominio expone **exactamente las seis etapas de la interfaz**. Un operador elige entre seis cosas
con seis nombres, y cada una significa una sola cosa.

| Etapa | Nombre visible | Qué significa | ¿Dispara assessment? |
|---|---|---|---|
| `sourced` | Sourced | Entró al pipeline, sin revisar | no |
| `screening` | Screening | En revisión inicial | no |
| `evaluation` | Evaluación | Se evalúa con evidencia (test, prueba) | **sí** |
| `interview` | Entrevista | En conversación con el equipo | opcional |
| `decision_pending` | Decisión | Evaluada, esperando desenlace | no |
| `closed` | Cerrado | Terminó — el desenlace lo dice `decision` | no |

## Las dos naturalezas del colapso

Esta distinción es la decisión de diseño de la task y hay que tomarla a propósito:

**"Cerrado" colapsa SIN pérdida.** Absorbe `selected`, `backup`, `rejected`, `withdrawn` y
`handoff_ready`, pero `hiring_application.decision` es un campo aparte que sobrevive. La etapa dice
*terminó*; la decisión dice *cómo terminó*. Nada se pierde y la superficie puede mostrar ambas.

**"Evaluación" colapsa CON pérdida.** Absorbe `qualified`, `shortlisted` y `client_review`, y **no
existe ningún campo que recupere cuál era**. Se acepta la pérdida porque esas tres nunca fueron
elegibles desde la interfaz: ningún operador las distinguió jamás, así que no hay intención humana
que preservar. Pero es una pérdida real y se declara como tal, no se descubre después.

## Correo al candidato

El nombre que ve la persona candidata debe coincidir con el que ve el operador. Hoy la allowlist de
correos de progreso dice `shortlisted`="Preselección"; si la etapa pasa a llamarse "Evaluación" en la
interfaz y el correo sigue diciendo "Preselección", se cambia un colapso por una contradicción.

Decisión pendiente para el implementador: si el candidato debe leer **"Evaluación"** (coherencia con
el operador) o si "Preselección" es deliberadamente más suave hacia afuera. Si se opta por lo segundo,
que quede documentado que son dos vocabularios a propósito, con su razón.

## Accesibilidad y copy

- Los seis nombres van en `src/lib/copy/dictionaries/*/hiringDesk.ts` (es-CL y en-US), nunca literales
  en JSX.
- La columna del pipeline anuncia su nombre y su conteo a lectores de pantalla.
- Donde una etapa dispare automatización, la interfaz lo declara en el punto de decisión — el operador
  debe poder anticipar el efecto de mover una tarjeta, no descubrirlo después.

## Verificación

GVC del pipeline en desktop y 390 px, antes y después, mostrando las seis columnas con nombres
distintos. Y una postulación movida a "Evaluación" que recibe su test — la prueba de que el
disparador dejó de apuntar al vacío.

## Referencias

- `src/lib/copy/dictionaries/es-CL/hiringDesk.ts:97` — el mapa actual
- `src/types/hiring.ts:109` — `HIRING_APPLICATION_STAGES`
- `src/types/hiring-assessment-policy.ts:42` — `OPENING_ASSESSMENT_TRIGGER_STAGES`
- `GREENHOUSE_CANONICAL_PATTERNS_V1.md` §9 — el patrón que este trabajo aplica a sí mismo
