# Tender Deck Composer — Cómo se arma el deck de una propuesta

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-12 por Claude (con Julio Reyes)
> **Ultima actualizacion:** 2026-07-12 por Claude
> **Documentacion tecnica:** [GREENHOUSE_TENDER_DECK_COMPOSER_V1.md](../../architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md) · ADR: [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md §5-ter](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md)
> **Manual de uso:** [comercial/componer-deck-de-licitacion.md](../../manual-de-uso/comercial/componer-deck-de-licitacion.md)

## Qué es

Cuando Efeonce se presenta a una licitación, entrega un **deck**: el documento con el que un comité
decide si adjudica o no. El Deck Composer es la pieza que **arma ese deck**.

La idea central es simple: **el deck no se dibuja, se compone.**

Hay un catálogo cerrado de **25 plantillas** (portada, agenda, diagnóstico, método, cronograma,
equipo, caso acreditado, matriz de cumplimiento, oferta económica, contraportada…). Cada una sabe
qué contenido acepta. Uno escribe el **contenido**, y el composer elige la plantilla correcta, la
llena y produce el PDF.

Nadie inventa una lámina nueva a mano. Si el contenido no calza en ninguna plantilla, eso **no**
significa "improvisá un layout": significa que **falta una plantilla en el catálogo**.

## Por qué funciona así

Una propuesta va a un comité **que compara**. La coherencia visual se lee como rigor; un deck que
cambia de estilo cada tres láminas se lee como un collage —y resta puntos.

Componer desde plantillas garantiza tres cosas:

1. **Todas las láminas se ven como la misma empresa.**
2. **El mismo contenido siempre produce el mismo deck** (es auditable: se puede reconstruir).
3. **El sistema se niega a mentir.** Ver abajo.

## Las tres cosas que el composer NO deja pasar

Esto es lo más importante de entender, porque no son limitaciones: **son protecciones.**

### 1. Una cifra sin fuente no entra

Si una lámina afirma "aumentamos el tráfico 180%", el composer exige que ese número venga con su
**evidencia** (de dónde salió). Si no la trae, **el deck no se arma**.

Es el principio del método: los datos son reales del proceso, o son **ilustrativos y están marcados
como tales**. Nunca inventados.

### 2. El texto que no cabe NO se recorta

Si un párrafo excede el espacio de la lámina, el composer **rechaza** la lámina y pide que se
reescriba más corto. **No lo trunca.**

Puede sonar molesto, pero la alternativa es peor: una frase cortada a la mitad en una oferta
contractual, que el evaluador lee mutilada y de la que nadie se entera.

### 3. Los gráficos se dibujan con los datos reales

Si una lámina muestra un "antes y después", las barras se calculan **desde los números reales**. No
se puede cambiar el número y dejar la barra del ejemplo.

Esto importa más de lo que parece: una barra que exagera una mejora que no ocurrió no es un error de
diseño, es **fabricación gráfica** frente a un comité evaluador.

## Qué produce

- **Un PDF** de N páginas, en 16:9 — el entregable.
- **Las láminas sueltas en PNG** — para revisar antes de entregar.
- **El "plan del deck"** (un archivo de datos) — el registro de qué decía cada lámina. Es lo que
  permite reconstruir el deck idéntico más adelante, o auditar qué se afirmó.

El composer también **avisa si el PDF pesa demasiado**. No es un capricho de rendimiento: los
portales de licitación (Mercado Público, Wherex) rechazan archivos sobre cierto tamaño, y **una
oferta que no sube queda fuera del proceso**.

## Las fotos del equipo

Cuando el deck presenta al equipo, van **fotos reales de las personas**. **Nunca** caras generadas
por inteligencia artificial.

No es una preferencia estética. El evaluador **cruza el CV contra la persona**: presentar una cara
fabricada como parte del squad es tergiversación en un proceso formal. Si falta la foto de alguien,
se pide la foto.

## Quién hace qué

| Quién | Qué hace |
|---|---|
| **La persona** | Decide el contenido: qué se dice, con qué datos, en qué orden. Revisa el deck y **firma**. |
| **El composer** | Elige la plantilla, valida que el contenido cumpla las reglas, arma el PDF. |
| **La IA** (cuando se active) | Propone un borrador del contenido. **Nunca** envía ni firma nada. |

Regla del dominio: **la oferta la sube un humano.** El sistema prepara; la persona decide.

## Dónde se usa hoy (y dónde todavía no)

**Todavía NO hay una pantalla en el portal.** El composer se opera desde la **línea de comandos**
(`pnpm deck:compose`), y el PDF queda en una carpeta local. No hay botón, no hay vista, no hay
"componer deck" dentro de Greenhouse.

Eso es **intencional y temporal**: primero se construyó el motor (que es lo difícil y lo que garantiza
que el deck no mienta), y la pantalla vendrá después. Cuando llegue, **consumirá este mismo motor** — no
va a existir una segunda forma de armar decks escondida dentro de una vista.

El paso siguiente ya está diseñado (**TASK-1391**): mover el render a un worker dedicado, con cola,
y guardar los PDFs como artefactos versionados en vez de archivos sueltos. Está en espera de una
decisión de plataforma mayor.

## Si algo no cabe, el composer se detiene

Vale la pena entender por qué, porque es contraintuitivo: **el composer prefiere fallar antes que
entregar un deck que se ve bien pero miente.**

Pasó de verdad. Una lámina salió con una frase cortada a media palabra —"…se vuelve *sosteni*"— y el
sistema la dio por buena, porque el texto cumplía el límite de caracteres. Lo que fallaba era la
**geometría** de la plantilla: el texto se salía del borde y el recorte lo escondía.

Hoy el composer **mide** cada bloque de texto contra el espacio real de la lámina antes de imprimir. Si
algo quedaría cortado, **no emite el PDF** y dice exactamente qué frase, en qué lámina y por cuántos
píxeles. Un PDF con una palabra guillotinada **parece terminado**, y por eso nadie lo revisa dos veces:
es peor que un error visible.

> **Detalle técnico:** el motor vive en `src/lib/commercial/tenders/deck/` y se opera con
> `pnpm deck:compose`. La topología (qué es determinista y qué usa IA) está decidida en el ADR
> §5-ter del spec del Studio. Los invariantes del dominio (anti-fabricación, fail-closed,
> human-in-control) viven en
> [`agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md).
