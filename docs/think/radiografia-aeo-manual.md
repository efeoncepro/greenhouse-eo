# Radiografía AEO — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Versión:** 1.0
> **Creado:** 2026-07-14 por Claude (TASK-1410)
> **Última actualización:** 2026-07-14
> **Documentación técnica:** [Radiografía AEO — Arquitectura](radiografia-aeo-architecture.md)
> **Repo del runtime:** `efeonce-think` (**NO** `greenhouse-eo`)

---

## Para qué sirve

Es una **muestra de trabajo** que se le entrega a un cliente o a un comité de licitación **por enlace**, y de la que se saca una **captura para una lámina** del deck.

Muestra, en cuatro pantallas: **el hueco** que encontramos en su espacio de búsqueda, **el artículo** que lo tapa, **la capa técnica** que lo hace citable por motores de respuesta con IA, y **dónde más vive** esa pieza (video, social, imágenes).

**La usan:** el equipo comercial (envía el enlace, presenta en vivo) y el equipo que arma el deck (toma las capturas).

**No es** un lead magnet: no captura, no pide email, no tiene formulario.

---

## El caso vivo hoy

**SKY — licitación de blog (Wherex, 2026):**

```
https://think.efeoncepro.com/muestras/sky-carretera-austral-861c18cc0e37
```

Cuatro pantallas: `/` (el hueco) · `/articulo` · `/radiografia` · `/atomizacion`.

---

## Antes de empezar

- Repo: `~/Documents/efeonce-think` (proyecto Vercel propio, **distinto** de `greenhouse-eo`).
- `pnpm install` (necesita `sharp` para optimizar las imágenes; ya está en `devDependencies`).
- Acceso a Semrush (para elegir el artículo con dato, no con intuición).

---

## Cómo se crea la muestra de un cliente nuevo

**El cliente es un payload, no código.** No se toca ni un componente.

### 1. Encontrar el hueco (Semrush)

**No elijas el artículo por intuición.** Si el artículo no salió de un dato, el panel de evidencia es decorativo y la pieza **miente sobre su propio método**.

Busca el cruce de **tres** condiciones (no una):

1. una pregunta **con volumen** (base `cl` para Chile);
2. que el cliente **hoy no posee** (no rankea, o rankea mal);
3. sobre la que el cliente tenga un **ángulo legítimamente propio** — algo que sabe *porque es quien es*, y que un competidor de contenido solo puede copiar.

> ⚠️ **Buscar solo volumen produce un *commodity*.** Una guía genérica que cualquiera escribe — y por eso las citas se las llevan terceros.

> ⚠️ **Semrush mide Google, no el espacio de prompts de los LLM.** Las preguntas tipo *"requisitos para viajar a X"* tienen volumen casi nulo en Google y son **exactamente** lo que la gente le pregunta a ChatGPT. Por eso el artículo se **ancla** en el término con volumen (verificable por el comité) y se **estructura** para el *fan-out* (donde el motor realmente cita). **Son dos capas, no una.**

Deja la evidencia en `docs/commercial/research/<cliente>-<tema>-<fecha>.md`.

🔴 **Gate humano: el operador elige el ángulo.** El agente no elige el artículo.

### 2. Generar el token

```bash
openssl rand -hex 6
```

🔴 **Se declara en el payload, JAMÁS se genera en el build.** Un token aleatorio por build cambiaría la URL en cada deploy — **y esa URL va a una lámina y a una propuesta**.

### 3. Escribir el payload

```
src/content/aeo-xray/<cliente>-<slug>.json
```

Copia `sky-carretera-austral.json` como referencia. Contiene: el flow, el hueco (SERP), el artículo, la capa de máquina, la evidencia, los átomos y el copy de la interfaz.

**El artículo se escribe contra un checklist medido, no "bonito":**

| Requisito | Por qué |
|---|---|
| **Cápsula de respuesta de 40–60 palabras** bajo cada H2 | Patrón presente en el **72,4%** de las páginas que ChatGPT cita |
| **Cada H2 = una sub-pregunta del fan-out**, autocontenida | El motor recupera **pasajes, no páginas**: el pasaje viaja solo (nada de *"como vimos arriba"*) |
| **≥1 tabla y ≥1 lista numerada** | ≈ **2,3×** más citas |
| **Datos con unidad y fuente** | *Statistics Addition*: **+32%** |
| **Fuentes autoritativas enlazadas** | *Cite Sources*: **+30%** |

### 4. Las imágenes

```
src/assets/muestras/<cliente>-<slug>/
```

🔴 **NUNCA en `public/`** — salta el pipeline de Astro y la pieza reprueba su propio PageSpeed.

- **Recorta la fuente al formato que se muestra**: hero **21:9**, inline **16:9**. *Optimizar no arregla una fuente mal recortada.*
- **Cero imágenes generadas con IA.** Licencia verificable + crédito visible.
- El `alt` **es contenido** de la muestra (se exhibe): descríbelo de verdad. *"Paisaje"* no sirve; *"las agujas de roca del Cerro Castillo nevadas sobre un lago"* sí.

Fuente recomendada: Wikimedia Commons (API con licencia y autor verificables).

### 5. Construir y verificar

```bash
pnpm build
XRAY_SAMPLE=<cliente>-<slug> pnpm verify:aeo-xray
```

**36 asserts.** Si el payload está incompleto, **el build falla** — no publica una muestra a medias.

### 6. Mirar el frame

⚠️ **Un verify verde con una captura ilegible NO es un cierre válido.**

Las capturas quedan en `.captures/aeo-xray/`. Los frames para la lámina:

- **`slide-oficio.png`** — la cápsula de respuesta ↔ el 72,4%
- **`slide-competencia.png`** — el H2 ↔ quién ocupa hoy ese espacio

### 7. Desplegar

```bash
git push origin HEAD:main   # el deploy de Vercel es automático
```

Después **verificar contra la URL de producción** (no contra el build local):

```bash
curl -s -L "https://think.efeoncepro.com/muestras/<cliente>-<slug>-<token>" | grep -c 'application/ld+json'   # → 0
```

---

## Qué significan las señales de la pantalla

| Lo que ves | Qué significa |
|---|---|
| **Punto en el borde derecho** de un bloque del artículo | Ese bloque **se conecta con algo** en el panel |
| **Chip `→ 3 datos`** al pasar el cursor | Ese bloque produce **3 datos** en la capa de máquina. Mira a la derecha |
| **Marca `←`** en un nodo del panel | *"Yo vengo de ese bloque de allá"* |
| **Lo demás atenuado** | Hay un acoplamiento activo. Lo encendido es lo que produce el bloque que estás tocando |
| **`ARREGLA 8/100`** en un nodo | Ese elemento técnico **mueve ese número** del diagnóstico del cliente |
| **Nivel 3** (nodos callados) | Prueba de **completitud**, no argumento (`og:title`, canónica) |
| **Bloque amarillo** ⚠️ | **Honestidad**: algo que la muestra NO puede fingir, y lo dice |

**En móvil**: tocas un bloque y el instrumento **sube como hoja inferior** con lo que ese bloque produce.

---

## Qué NO hacer

🔴 **NUNCA emitir el JSON-LD del artículo como marcado activo.** Se muestra como **texto**. Publicarlo declararía, en *nuestro* dominio, que Efeonce publicó un artículo del cliente: un **dato estructurado falso** — justo en la pieza cuya tesis es el rigor técnico. El daño es **silencioso**.

🔴 **NUNCA prometer el rich snippet de FAQ de Google.** Lo restringió en 2023 a gobierno y salud. Se marca por la **capa de máquina**, nunca por *"la cajita en Google"*.

🔴 **NUNCA reclamar una táctica que no aplicaste.** Nos pasó: le atribuimos el **+41%** (*Quotation Addition* = citar **fuentes**) a una cita destacada nuestra. En la pieza cuyo valor entero es **no exagerar**, ése es el error más caro — y el primero que un evaluador técnico caza.

🔴 **NUNCA inventar datos para tapar un hueco.** Si al cliente le falta algo (un autor con credencial, un video producido), **la muestra lo declara**. Decir lo que falta **suma**; simularlo **la destruye**.

🔴 **NUNCA hardcodear un cliente en un componente.** Si escribes `if (cliente === '...')`, la frontera se rompió y el motor dejó de ser reutilizable.

⚠️ **Si le haces una muestra a un competidor directo de un cliente vigente**, recuerda que el token es lo único que impide que uno adivine la URL del otro. **No compartas el patrón de URL sin el token.**

---

## Problemas comunes

| Síntoma | Causa · Solución |
|---|---|
| **El build falla con un error de Zod** | Le falta un campo obligatorio al payload: `alt`, `credit`, `source`, `asOf`, `why` o `tier`. **Es el gate funcionando** — completa el dato |
| **Las imágenes no se optimizan** (`MissingSharp`) | `pnpm add -D sharp` |
| **El navegador muestra la versión vieja** | Caché. `Cmd+Shift+R` o ventana privada |
| **Una ruta nueva da 404 recién desplegada** | Carrera con el CDN. Espera un minuto y reverifica — **la ruta nueva se cachea como 404 antes de existir** |
| **El verify pasa pero la captura se ve mal** | **El verify no mira.** Abre el PNG |
| **La página pesa mucho en móvil** | Las imágenes están en `public/` (salta el pipeline) o la fuente está mal recortada |

---

## Referencias

- [Arquitectura](radiografia-aeo-architecture.md) — los 10 invariantes, el flow, el gate
- [`TASK-1410`](../tasks/complete/TASK-1410-aeo-article-xray.md) — la historia completa, con los seis deltas de diseño y los bugs que cazó el gate
- [Investigación Semrush del blog de SKY](../commercial/research/sky-blog-aeo-gap-2026-07.md) — ejemplo de cómo se elige el artículo
- Skills a cargar al tocar esto: **`seo-aeo`** (el oficio · el schema tiene que ser defendible ante un comité que lo puede verificar), **`astro`** + su `efeonce-overlay.md` (el repo), `copywriting`, `modern-ui`, `typography-design`, `a11y-architect`
