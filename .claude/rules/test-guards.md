---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "services/**/*.test.ts"
  - "scripts/**/*.test.ts"
---

# Guardas de test: afirmar una FORMA no es verificar un COMPORTAMIENTO (auto-load por path)

Antes de escribir una aserción sobre el **texto del código** —el string de un `ORDER BY`, un conteo
de ocurrencias en un YAML, una línea de `deploy.sh`, cualquier `readFileSync` de un archivo fuente—
carga **`docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` § 7** («Detector a la altura del
defecto», tercera pregunta).

**Una guarda textual no verifica: afirma. Y falla en las dos direcciones, las dos en silencio.**
Los dos casos del 2026-08-29 son opuestos y del mismo defecto:

- **Verde con el defecto puesto** (`cf8729771`): comparar el string del `ORDER BY` del reader contra
  una constante consagró un modelo de **tres** llaves cuando el comparador canónico tenía **cuatro**
  —la cuarta no es columna, así que el SQL no podía reproducirla ni en principio—. Producción sirvió
  54 de 55 items de banda 2 fuera de su rank persistido, con el test verde.
- **Rojo con la mejora puesta** (`380a20fa3`): `toHaveLength(3)` sobre las ocurrencias de una ruta en
  un workflow se puso rojo cuando la cobertura pasó a declararse de forma gruesa respaldada por un
  gate real (`pnpm worker:deploy-path-gate`) — **la cobertura había mejorado**.

**Regla: la guarda textual SEÑALA al verificador real, no lo reemplaza.** Exige el contrato vigente,
nombra los anti-patrones como regresiones prohibidas y **cita en el propio test el mecanismo** que
sostiene el invariante. **NUNCA** aceptes «mirar el string es la única forma de comprobarlo» como
cierre: si de verdad lo es, el instrumento está mal elegido — mueve la autoridad a un lugar
ejercitable. **NUNCA** dejes que la guarda codifique un modelo del comportamiento (las N llaves, las
N apariciones); ajustar la constante cuando se pone roja borra la pregunta en vez de responderla.

Para `*.live.test.ts` aplica además
**`docs/architecture/agent-invariants/LIVE_TESTS_AGENT_INVARIANTS.md`** (base compartida, `skipped`
que se ve igual que verde, fixtures por scope).
