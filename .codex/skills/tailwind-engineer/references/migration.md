# Referencia — migrar una superficie de CSS propio a Tailwind

Aplica sobre todo al dialecto **Globe** (donde hay 211 KB de CSS-in-TS legacy conviviendo), pero el
método sirve para cualquier superficie.

## Regla de entrada

**NUNCA migres una superficie sin referencia de diff visual previa** (ADR-016 §7). "Se ve igual" no es
una afirmación que se pueda hacer de memoria: la mitad de las regresiones de migración son de 1-2px o
de un peso de fuente, y no se ven salvo A/B.

**NUNCA dejes dos motores activos en la misma superficie** (ADR-016 §8). Una superficie a medias es
peor que una sin migrar: cada cambio futuro tiene que razonar sobre dos sistemas.

## Secuencia

### 1. Captura el antes

En Greenhouse: scenario GVC (`pnpm fe:capture`) + `pnpm fe:capture:diff` al final. En Globe/Astro:
screenshot determinista de la superficie en desktop y 390px, guardado fuera del repo.

Si la superficie tiene estados (hover, loading, vacío, error), captura **cada estado**. Es donde se
esconden las regresiones.

### 2. Inventaria los valores, no las reglas

No traduzcas selector por selector. Extrae la **lista de valores distintos** que la superficie usa:
colores, tamaños, pesos, radios, sombras, duraciones, espaciados.

```bash
grep -oE '#[0-9a-fA-F]{3,8}|[0-9.]+(px|rem|em|ms|s)\b' <archivo.css> | sort -u
```

Cada valor cae en una de tres categorías:

| Categoría | Qué hacer |
|---|---|
| **ya existe en el SSOT** | usar el token |
| **debería existir** (es del sistema, faltaba) | agregarlo al SSOT → regenerar → usar |
| **es un accidente** (un `13px` que nadie decidió) | **decidirlo**: redondear al token más cercano y anotarlo |

La tercera categoría es el valor real de migrar. Si traduces los accidentes tal cual a valores
arbitrarios, moviste el problema de lugar y perdiste la oportunidad.

En Globe hay ayuda: `LEGACY_TOKEN_DRIFT` en `tokens.ts` registra qué declara cada superficie legacy,
justo para que el port lo reemplace **deliberadamente** y no por copia.

### 3. Migra una región, no un archivo

Elige la unidad más chica que se pueda ver entera en una captura (una card, un header, una fila). El
archivo completo es demasiado: si el diff sale distinto, no vas a saber cuál de los 40 cambios fue.

### 4. Saca el CSS viejo en el mismo commit

Si el CSS legacy de esa región sigue vivo, tienes dos motores. Bórralo. Si no puedes borrarlo porque
otra superficie lo comparte, **no era la región correcta para empezar** — sube un nivel o extrae
primero lo compartido.

### 5. Diff visual + gates

```bash
# Globe
cd apps/studio-client && pnpm theme:generate && pnpm test   # 4 gates + gate del theme

# Greenhouse
pnpm design:lint && pnpm local:check:ui
pnpm fe:capture:diff <antes> <después>
```

Un diff distinto es un **hallazgo**, no un fracaso: casi siempre es un accidente que estaba en el CSS
viejo y que ahora tienes que decidir. Anota la decisión.

## Qué NO migrar

- **Superficies que van a morir.** Migrar código que se va a borrar es trabajo perdido dos veces.
- **Superficies con motion complejo** sin leer antes el SSOT de motion
  (`GLOBE_CLIENT_MOTION_CONTRACT_V1.md`, dueña TASK-1523). El motion tiene tres capas
  (identidad/estructura/ambiente) y se pierde fácil al traducir.
- **El composer de Globe sin su referencia de estilo.**
  `docs/ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md` existe precisamente para migrarlo **sin
  reinterpretar**. Migrarlo "a ojo" es reescribirlo.

## Lo que hace que una migración se note

Al terminar, la superficie debería tener **menos decisiones**, no las mismas escritas distinto:

- [ ] Cero valores literales en clases; los arbitrarios que quedan son referencias a token.
- [ ] Los accidentes de la categoría 3 quedaron resueltos y anotados.
- [ ] El CSS legacy de la región **ya no existe**.
- [ ] El diff visual es cero, o cada píxel de diferencia está explicado.
- [ ] Los gates pasan sin rebaseline. Si necesitas rebaseline, va **declarado** (en Greenhouse, en
      `BASELINE_DELTAS.md`).
