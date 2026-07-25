# ISSUE-125 — La evidencia GVC del Producer se produjo contra un DOM de Globe que nunca se commiteó

- **Estado:** `open`
- **Detectado:** 2026-07-25 por Claude, durante `TASK-1560` Slice 1 (inventario de contratos cross-repo)
- **Ambiente:** evidencia GVC en `greenhouse-eo`; superficie en `efeonce-globe`
- **Severidad:** media — no rompe runtime, **invalida evidencia** y produce diagnósticos falsos
- **Relacionado:** `TASK-1560` · `docs/operations/creative-studio/GLOBE_PORT_SURVIVAL_INVENTORY_V1.md`

## Síntoma

El escenario `scripts/frontend/scenarios/globe-creative-producer.scenario.ts` declara dos atributos que
**no existen en ningún Globe**:

- `data-producer-candidate-kind` — en `readiness.selectors`, en una assertion `visible`, y como base de
  un click (`[data-producer-candidate-kind="hero"] button[aria-label="Ver candidato"]`).
- `data-producer-feed-status` — en `readiness.selectors`.

Un `git log -S` sobre **toda** la historia de `efeonce-globe` no devuelve ninguna ocurrencia de ninguno
de los dos, ni en kebab-case ni en el camelCase de `dataset`. Nunca existieron en un commit.

## Causa raíz

La captura que produjo la evidencia (`.captures/2026-07-22T23-03-58_globe-creative-producer/`) registra
`env: local` y las **assertions en `passed`**, incluida la del atributo inexistente.

El gate no está roto — se verificó su implementación:

- `runReadiness` **sí** incluye el array `selectors` además del `selector` singular
  (`scripts/frontend/lib/scenario.ts:586`).
- `visible` falla cuando el selector no está visible (`:682`).
- `isVisible` captura la excepción y devuelve `false` (`:569-575`), o sea que un timeout **no** pasa.

Entonces la única explicación consistente es la correcta: **el árbol local de Globe emitía esos
atributos el 2026-07-22, y ese código nunca se commiteó.** La evidencia es real; el DOM que la produjo
no está en ninguna parte.

Es la clase de bug que este repo ya documentó al revés (`TASK-943`: código commiteado que depende de un
archivo sin commitear). Acá lo que depende de trabajo huérfano es la **evidencia**.

## Impacto

1. **La evidencia registrada describe una superficie que ningún Globe desplegado sirvió.** El dossier,
   el `surfaceId` `globe.creative-producer-surface` y su baseline documentan un estado irreproducible.
2. **Diagnóstico falso garantizado en el próximo port.** `TASK-1552` porta el composer y `TASK-1559` el
   feed. Quien corra este escenario después va a ver **fallar la readiness** —que se lee como "la página
   no cargó"— y la conclusión natural, *"lo rompió el port"*, sería **falsa**. Se perdería tiempo
   buscando una regresión que no existe.
3. **La baseline visual no sirve como referencia** de before/after para esos ports.

## Solución propuesta

Decidir **cuál de las dos cosas es verdad**, que es justamente lo que no se puede asumir:

- **(a) El escenario se adelantó al código.** Los atributos eran parte de un diseño que no se
  implementó ⇒ corregir el escenario a lo que Globe realmente emite, y **descartar la baseline**
  (documenta un estado inexistente, no un estado bueno anterior).
- **(b) Globe debía emitirlos y se perdieron.** El trabajo local del 2026-07-22 era legítimo y quedó
  huérfano ⇒ implementarlos en Globe, con test, y **recapturar** contra un deployment real.

**No se puede elegir sin revisar el diseño del Producer.** Si el `candidate-kind` es una distinción real
del modelo (una pieza "hero" vs. otras), (b) es lo correcto y falta código. Si era vocabulario de
wireframe, es (a).

## Prevención — la regla que falta

**NUNCA producir evidencia GVC canónica de una superficie de otro repo contra `env: local`.** El árbol
local puede tener trabajo sin commitear, y la evidencia sobrevive al trabajo: queda un dossier que
describe algo que nadie puede reproducir.

Defensa mecánica posible (a evaluar): que la captura registre el **SHA del repo objetivo** además de
`env`, y que una captura marcada como baseline canónica exija `env != local` o un árbol limpio. Sin
eso, la única defensa es la disciplina — y la disciplina ya falló una vez acá.

## Verificación al cerrar

- [ ] Decidido (a) o (b), con la razón escrita.
- [ ] Si (a): el escenario sólo referencia atributos que Globe emite, verificado con `grep` sobre `main`.
- [ ] Si (b): los atributos existen en Globe con test, y la evidencia se recapturó contra un deployment
      real (`env != local`).
- [ ] La baseline de `globe.creative-producer-surface` quedó descartada o regenerada — nunca conservada
      como si fuera válida.
- [ ] El inventario `GLOBE_PORT_SURVIVAL_INVENTORY_V1.md` refleja la decisión.
