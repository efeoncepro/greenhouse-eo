# Compositor de CTA — comando canónico

> **Estado:** `Accepted` · **2026-09-22** · consolidación autorizada por el operador.
> Implementa el paso que [Tres voces + acción](EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md) dejaba abierto:
> *«los campos `cta` del JSON piloto son locales de corrida: el comando canónico no se anuncia como compatible
> hasta una implementación y verificación explícitas»*. Esta es esa implementación y esa verificación.

## 1. Qué problema cierra

El compositor vivía **duplicado en cinco carpetas de corrida**, todas untracked y ya divergentes:

| Copia | Líneas | Qué tenía de propio |
|---|---|---|
| `_cta-p1` | 742 | la primera |
| `_cta-p1-v02`, `_cta-p2` | 746 | idénticas entre sí |
| `_aeo-cta-v03` | 750 | **`surfaceToken`/`inkToken`** (color por pieza), `align: center`, `-controls.svg` |
| `_registro-c-respuesta` | 750 | **`logo.y`** (firma fuera de la safe zone) |

🔴 **Arreglar una dejaba cuatro mintiendo.** Y dos mejoras reales vivían en copias distintas, así que ninguna
corrida las tenía juntas.

**Canónico:** `scripts/foto/componer-cta.mjs` — base v03 **+** `logo.y`/`logo.variant` **+** las dos
mediciones que faltaban. Expuesto como **`pnpm foto:componer:cta`**.

## 2. 🔴 El hueco de accesibilidad, y por qué era invisible

La regla dice **«sin excepción de aprobación visual para un CTA que falle estos mínimos»**. Pero en variante
`solid` el compositor marcaba `skipContrast` y **la clave `contraste.cta` nunca se escribía**.

> **El QA salía limpio porque el dato NO EXISTÍA, no porque hubiera pasado.**
> Una pieza sólida **no podía fallar el gate, porque nunca se medía.**

⚠️ **`skipContrast` estaba bien puesto:** bajo un relleno opaco, medir la tinta contra la *escena* da un
número sin sentido. El error fue **saltar el bloque entero**, y eso se llevó por delante la medición que sí
hacía falta y que nadie hacía: **el relleno contra la escena** — la que decide si el botón se despega del
plate, y justo la que falla al elegir `solid` sobre un plate claro.

✅ **Ahora `solid` declara las dos:**

| Clave | Qué mide | Cómo | Mínimo |
|---|---|---|---|
| `contraste.cta` | tinta contra relleno | teórico desde los tokens *(basta: el relleno es plano)* | **4,5:1** |
| `contraste.cta_superficie_vs_escena` | **relleno contra la foto** | sobre el píxel, mínimo local | **3:1** |

`contraste.cta` se emite **siempre**, sea cual sea la variante, con el mismo nombre — el QA no necesita saber
qué variante era.

## 3. El gate: `pnpm foto:cta:gate <plan.json>`

```bash
pnpm foto:componer:cta <plan.json>   # compone y emite out/qa.json
pnpm foto:cta:gate     <plan.json>   # verifica los mínimos
```

🎯 **Lo que lo hace distinto de un gate normal: EXIGE la clave.** Si `contraste.cta` falta, **falla**. Un gate
que sólo valida las claves presentes no puede detectar una ausencia — y la ausencia era exactamente el bug.

⚠️ **Los dos comandos van en pareja y en ese orden.** Todos los planes de una misma carpeta escriben el mismo
`out/qa.json`: si compones el plan A y luego corres el gate del plan B, el gate lee el QA de A y reporta
**0 piezas** en vez de fallar. **Componer y verificar el mismo plan, seguido.**

## 4. Retrocompatibilidad

Un plan sin `surfaceToken`/`inkToken` usa el par por defecto de la familia aprobada: relleno = superficie de
acento con tinta oscura; texto y contorno = tinta de acento. **Los planes de las corridas anteriores siguen
corriendo sin cambios.** `surfaceToken`/`inkToken` permiten variar el color por pieza, que es lo que la regla
habilita al decir «lima no obligatorio».

## 5. Las copias de corrida quedan obsoletas

Las cinco copias siguen en sus carpetas y **no se borran**: son el registro de corridas ya entregadas y
pertenecen a las sesiones que las produjeron. Pero **ninguna corrida nueva las invoca**.

🔴 **Para cualquier agente: usar `pnpm foto:componer:cta`.** Copiar el script a una carpeta de corrida
reintroduce el problema que este documento cierra — y la próxima corrección volverá a dejar copias mintiendo.

## 6. Extensiones sobre v03

- **`logo.y`** *(fracción del alto, opcional)* — ubica la firma. Sin el campo, al pie, como siempre.
  🔴 En **9:16 de pauta la firma al pie cae dentro de la UI**: receta completa en la skill.
- **`logo.variant`** — forzar `negative`. En `auto` el compositor puede elegir navy sobre banda oscura y el
  contraste se desploma a **1,2:1** donde el blanco da 19,9.
