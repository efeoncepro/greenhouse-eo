# Sistema de Observabilidad de Tests

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-05 por GitHub Copilot (TASK-249)
> **Ultima actualizacion:** 2026-04-05 por GitHub Copilot (TASK-249)
> **Documentacion tecnica:** [12-testing-development.md](../../architecture/12-testing-development.md)

---

## La idea central

Greenhouse ahora tiene una forma simple y repetible de responder cuatro preguntas sobre su suite de tests:

- cuantos tests existen
- donde viven
- si la ultima corrida paso o fallo
- que coverage y warnings relevantes dejo esa corrida

La respuesta ya no depende de contar archivos a mano ni de abrir todo el log de CI. La fuente de verdad vive en artifacts generados automaticamente.

---

## Que genera el sistema

Cada corrida puede dejar estos archivos:

| Archivo | Que contiene |
| ------- | ------------ |
| `artifacts/tests/inventory.json` | mapa estructurado del suite |
| `artifacts/tests/inventory.md` | resumen legible del inventario |
| `artifacts/tests/results.json` | resultado estructurado de Vitest |
| `artifacts/tests/vitest.log` | log textual completo |
| `artifacts/tests/summary.md` | resumen corto para humanos |
| `artifacts/coverage/coverage-summary.json` | coverage agregado |
| `artifacts/coverage/index.html` | reporte navegable de coverage |

En GitHub Actions, esos mismos archivos se suben como artifacts y el resumen corto también aparece en el panel del job.

> **Detalle tecnico:** Los paths y producers estan documentados en [12-testing-development.md](../../architecture/12-testing-development.md).

---

## Como se usa localmente

### 1. Inventario

`pnpm test:inventory`

Sirve para saber como esta distribuido el suite hoy. Clasifica cada test por dominio, tipo y entorno.

Ejemplos de lectura:

- cuantos tests son de `payroll`
- cuantos son `api`
- cuantos corren en `jsdom`

### 2. Resultados de una corrida

`pnpm test:results`

Sirve para ejecutar el suite y guardar el resultado en un formato que luego se puede resumir o procesar sin reparsear la consola manualmente.

### 3. Coverage

`pnpm test:coverage`

Sirve para ver la cobertura global actual del repo y abrir el reporte HTML cuando se necesita inspeccionar archivos concretos.

### 4. Resumen corto

`pnpm test:observability:summary`

Sirve para juntar inventario, resultados, coverage y warnings en un solo archivo corto.

### 5. Corrida completa

`pnpm test:observability`

Corre el flujo entero de punta a punta.

---

## Como se usa en CI

El workflow de calidad del repo ahora hace este recorrido:

1. lint
2. inventario del suite
3. corrida de tests con salida JSON
4. coverage
5. summary de observabilidad
6. upload de artifacts
7. build

Esto permite que una persona revisora vea el estado del suite sin abrir todo el log.

La lectura recomendada en CI es:

1. mirar el summary del job
2. si hace falta detalle, abrir los artifacts
3. solo si sigue habiendo dudas, abrir el log completo

> **Detalle tecnico:** El workflow actual vive en [../../.github/workflows/ci.yml](../../.github/workflows/ci.yml).

---

## Que problema resuelve

Antes, el repo tenia tests pero no una capa clara de observabilidad del suite.

Eso hacia mas dificil:

- detectar drift entre documentacion y estado real
- revisar rapido un PR
- saber si el suite seguia sano sin leer logs largos
- entender coverage como baseline operativa

Ahora el equipo tiene una salida estable para humanos y otra para maquinas.

---

## Que no hace esta capacidad

Esta iteracion no:

- crea una pantalla dentro del portal
- guarda historico en PostgreSQL o BigQuery
- ejecuta tests desde un admin center
- reemplaza futuras politicas mas estrictas de coverage

Es una capa de visibilidad operativa, no una feature runtime del producto.

---

## Como leer una corrida rapidamente

Si solo necesitas el estado general:

- abre `artifacts/tests/summary.md`

Si necesitas saber cuantos tests hay y como se reparten:

- abre `artifacts/tests/inventory.md`
- `artifacts/tests/inventory.json` si quieres procesarlo

Si necesitas saber exactamente que suite o test fallo:

- abre `artifacts/tests/results.json`

Si necesitas investigar mensajes y warnings:

- abre `artifacts/tests/vitest.log`

Si necesitas inspeccionar coverage por archivo:

- abre `artifacts/coverage/index.html`

---

## En resumen

Greenhouse sigue usando Vitest como runner, pero ahora tambien deja una huella operativa clara de cada corrida.

La regla simple es esta:

- el estado del suite se consulta en artifacts
- el resumen humano vive en `summary.md`
- el detalle tecnico vive en `results.json` y coverage
- no hay backend admin en esta iteracion

> **Detalle tecnico:** Ver [12-testing-development.md](../../architecture/12-testing-development.md) para el contrato tecnico completo.