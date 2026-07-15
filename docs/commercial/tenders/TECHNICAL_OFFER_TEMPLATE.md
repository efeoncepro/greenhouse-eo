<!--
════════════════════════════════════════════════════════════════════════════════
  PLANTILLA CANÓNICA — OFERTA TÉCNICA (licitación pública/privada · RFP)
  Copiá este archivo a docs/commercial/tenders/<caso>/oferta-tecnica.md y llenalo.
  Destilada del caso SKY (Wherex 2026), que es el ejemplo bueno ya validado.

  REGLA RAÍZ — híbrido guía + contrato:
    • Las SECCIONES son GUÍA. Cada RFP es distinto; usá las que apliquen, en el
      orden que puntúe mejor contra los criterios de ESA licitación. No todas las
      15 aplican siempre. Borrá las que no; agregá las que el pliego exija.
    • La EVIDENCIA es CONTRATO. Toda cifra/afirmación verificable vive primero en
      el «Ledger de evidencia» (Zona 0) con su fuente googleable + as-of. La
      narrativa NUNCA introduce una cifra que no esté en el ledger. Esto mapea 1:1
      a `proposal_evidence` y es lo mismo que el composer ya exige en el deck
      (`missing_evidence_ref` rompe el build) — pero atrapado ACÁ, antes.

  ESTO ES UNA DE TRES. La oferta técnica es un sobre; los otros dos tienen su
  propio carril (NO se llenan acá):
    • Económica → skill `greenhouse-public-private-tenders` → `pricing-garantias-finance.md`
      + el generador de Excel (`scripts/commercial/build-*-economica-xlsx.mjs`).
    • Administrativa → `compliance-riesgo-integridad.md` (anexos + declaraciones juradas).

  REGISTRO: client-facing = trato formal de USTED / institucional (el cliente en
  3ª persona). Es un documento contractual que evalúa un comité, NUNCA un blog.
  NUNCA voseo. Craft de la prosa → skill `copywriting` (+ `seo-aeo` si es rubro
  búsqueda/contenido). El `.md` es la FUENTE; el PDF/deck se re-emite desde acá.
════════════════════════════════════════════════════════════════════════════════
-->

# Oferta Técnica — <Servicio> · <Cliente>

> **Licitación:** <ID / portal / Wherex-Mercado Público> · **Cierre:** <fecha> ·
> **Origen:** <public_tender | private_rfp | direct_sales> · **Idioma:** <es-CL | en-US>
> **Estado:** <borrador | en revisión | lista para presentar> ·
> **Proposal:** <proposal_id si ya existe en el Studio> · **Owner:** <nombre>

---

## Zona 0 — Ledger de evidencia (CONTRATO — llenar ANTES de la narrativa)

> Toda cifra, dato, comparación o claim verificable que aparezca en la oferta (y
> en el deck) se declara acá primero. Sin fuente googleable + as-of, **no entra**.
> Auditoría 2026-07-14 (caso SKY): de 6 cifras exhibidas, 3 no resistían una
> verificación y una citaba un estudio inexistente — en una licitación el evaluador
> **va a buscar la fuente**; si no la encuentra, se cae todo lo demás.
> `audience`: `internal` (nunca cruza al cliente) vs `client_facing` (va en la oferta).

| ref | claim / cifra | valor | fuente (URL o documento exacto) | as-of | audience |
|---|---|---|---|---|---|
| `E1` | <qué afirma> | <número> | <https://… o «Bases §X» o «run EO-GRUN-000NN»> | <YYYY-MM> | client_facing |
| `E2` | … | | | | |

> **Prohibido:** confundir una *prevalencia* con un *lift*; convertir un dato de
> mercado en prueba del producto; citar un estudio sin poder linkearlo. Una cifra
> propia (ej. un run del AI Visibility Grader) ES fuente válida si es reproducible.

---

## Zona 1 — Narrativa (GUÍA — cada sección apunta a un criterio que puntúa)

<!--
  Marcadores por sección (borralos al entregar; son para vos):
    [admisibilidad: sí|no]  → ¿es requisito excluyente del pliego? si sí, NO la borres.
    [criterio: <nombre> <peso%>]  → contra qué ítem ponderado juega (ver chile-publico-operativo.md).
    [deck → <contentType>]  → qué lámina del deck proyecta esta sección (ver Zona 2).
  Toda cifra referencia el ledger: «… creció 23 % (`E4`)».
-->

### 1. Resumen ejecutivo
`[criterio: primera impresión]` `[deck → cover, highlight]`
La promesa en un párrafo: qué problema del comprador resuelve Efeonce y por qué es
seguro adjudicárselo. Sin relleno. Si el evaluador solo lee esto, tiene que quedar
convencido del *qué* y del *quién responde*.

### 2. Comprensión del requerimiento
`[admisibilidad: revisar]` `[criterio: comprensión]` `[deck → statement, bullet-list]`
Demostrar que entendiste el problema real del comprador — **no** que copiaste las
Bases. Reformulá el requerimiento en tus palabras + el subtexto que las Bases no
dicen pero el comité sí siente.

### 3. Diagnóstico de partida
`[criterio: valor diferencial]` `[deck → several-kpis, comparison, maturity-ladder]`
El hallazgo propio que nadie más trae (evidencia dura del ledger). Es lo que separa
una oferta genérica de una que ya hizo el trabajo. Cada sub-hallazgo con su `ref`.

### 4. Nuestro enfoque
`[criterio: metodología/enfoque <peso%>]` `[deck → four-pillars, process-sequential]`
Cómo lo hará Efeonce, por capas/fases con lógica verificable — concreto, no
genérico. Cierra con la convicción que ordena todo (el *por qué* detrás del *cómo*).

### 5. Qué compra el valor mensual
`[criterio: alcance del servicio]` `[deck → capabilities-grid, dual-list]`
Desagregar el servicio real detrás del entregable visible (ej.: no "8 artículos",
sino estrategia + 9 controles por pieza + trabajo sobre el blog completo + medición
+ gobernanza). Es donde se defiende el precio sin mostrar precio.

### 6. Metodología de trabajo (ciclo)
`[criterio: plan de trabajo]` `[deck → process-sequential, timeline]`
El ciclo operativo repetible + la puesta en marcha (primeros N días). Hitos,
entregables, dependencias, holgura. Coherente con el plazo pedido.

### 7. Plan de trabajo y cronograma
`[admisibilidad: revisar]` `[criterio: cronograma <peso%>]` `[deck → timeline]`
Hitos y entregables sobre el eje temporal real del contrato. El compiler del deck
deriva la grilla del `timeUnit` — no dibujes porcentajes a mano.

### 8. Modelo de producción / líneas de servicio
`[criterio: alcance]` `[deck → dual-text, bullet-list]`
Cómo se produce (roles, flujo, controles de calidad) y las líneas/categorías del
trabajo. Muestra sistema, no improvisación.

### 9. Diferencial técnico del rubro
`[criterio: valor diferencial <peso%>]` `[deck → artifact-showcase, one-metric]`
El piso que exige el pliego, garantizado en cada pieza, **+** el diferencial sobre
ese piso — con instrumentos propios. Si tenés una muestra viva (Radiografía AEO,
informe del Grader), va **por enlace**, no descrita: se muestra, no se cuenta.

### 10. Recursos y presencia
`[deck → capabilities-grid]`
Capacidades de apoyo (visual, multicanal, herramientas). Solo lo que suma al criterio.

### 11. Reportería y métricas
`[criterio: control/SLA]` `[deck → several-kpis]`
Qué se mide, cada cuánto, con qué instrumento. Por encima del mínimo del pliego si
tenés con qué. Distingue el informe formal del acceso continuo si lo ofrecés.

### 12. Equipo asignado y gobernanza
`[admisibilidad: revisar — el evaluador cruza CV con requisito]` `[criterio: equipo <peso%>]` `[deck → team-gallery]`
Perfiles con rol, dedicación %, respaldos. **Fotos reales del squad, NUNCA IA.**
Armado de CVs/competencias → skill `greenhouse-talent-people-operator`. El
blueprint con loaded cost es **INTERNO**, jamás entra acá.

### 13. Niveles de servicio (SLA) y penalidades
`[admisibilidad: revisar]` `[criterio: SLA]` `[deck → requirements-table, statement]`
Compromisos medibles + el régimen de penalidades como afirmación de seguridad, no
como letra chica defensiva.

### 14. Por qué es seguro adjudicar a Efeonce
`[criterio: riesgo/experiencia]` `[deck → four-pillars, comparison]`
Los riesgos que el comité teme, cada uno con su cobertura concreta. En público la
experiencia se **acredita** (certificados, OCs previas), no se afirma.

### 15. Cierre — por qué Efeonce
`[deck → statement, back-cover]`
El remate. Una frase que el evaluador recuerde en la reunión de adjudicación.

### Anexo — Matriz de cumplimiento
`[admisibilidad: SÍ — item por item]` `[deck → requirements-table]`
Tabla explícita requisito-del-pliego ↔ dónde se cumple en esta oferta. Es la
herramienta que evita el descarte por forma. Vive como anexo, no abre el documento.

---

## Zona 2 — Costura al deck (el deck es una PROYECCIÓN de esto, no una re-autoría)

> El deck **no auto-deriva** de este Markdown. La fuente de verdad del deck son los
> **slots del `deck-plan.json`** (mismos slots → mismo PDF; un humano firma). Este
> Markdown es la **fuente narrativa + evidencia**; el `deck-plan.json` es la **fuente
> de composición**. Comparten el ledger de evidencia, pero son archivos
> independientes y revisables por separado. El autor (o el agente, vía
> propose→confirm) construye el `deck-plan.json` **desde** esta oferta, eligiendo qué
> secciones se vuelven lámina y con qué `contentType` (declara INTENCIÓN, NUNCA
> `template` — el selector del catálogo resuelve).

**Flujo canónico:**

```
investigación (diagnostico/benchmark INTERNO)
        │
        ▼
oferta-tecnica.md   ── Zona 0: ledger de evidencia (→ proposal_evidence)
   (ESTE archivo)   ── Zona 1: narrativa (guía)
        │           ── Zona 2: mapa sección → contentType
        │  el humano/agente autora el plan DESDE la oferta (propose→confirm)
        ▼
deck-plan.json  (slots, SSOT del deck)
        │  pnpm deck:compose <deck-plan.json>
        ▼
PDF de N páginas  (Artifact Composer; catálogo cerrado de plantillas)
```

**Content-types del catálogo `deck-axis` disponibles** (elegí por intención, no por
estética): `cover` · `agenda` · `statement` · `highlight` · `one-metric` ·
`several-kpis` · `bullet-list` · `dual-list` · `dual-text` · `four-pillars` ·
`capabilities-grid` · `process-sequential` · `timeline` · `maturity-ladder` ·
`comparison` · `requirements-table` · `team-gallery` · `artifact-showcase` ·
`narrative` · `pricing` · `back-cover`. (Inventario vigente en la skill
`greenhouse-public-private-tenders` → `deck-visual-system.md` + el `registry.json`
del catálogo.)

---

## Reglas duras (para el que llene esta plantilla)

- **NUNCA** una cifra en la narrativa (o en el deck) que no esté en el ledger de
  evidencia con fuente googleable + as-of. Una prevalencia no es un lift.
- **NUNCA** trato informal en client-facing: usted/institucional, el cliente en 3ª
  persona. Formal ≠ frío. NUNCA voseo.
- **NUNCA** mezclar lo INTERNO (loaded cost, piso de negociación, blueprint del
  squad, benchmark de competencia) en este documento — va a carpetas `*-INTERNO.md`
  que jamás se entregan.
- **NUNCA** describir una muestra viva (Radiografía AEO / informe del Grader): va por
  enlace, se defiende sola.
- **NUNCA** fabricar la geometría del deck a mano: el número o la barra salen del
  ledger, o no salen.
- **SIEMPRE** ordenar las secciones hacia los criterios ponderados de ESA licitación
  (leé la tabla de ponderaciones antes de escribir).
- **SIEMPRE** llenar el anexo de matriz de cumplimiento item por item — es lo que
  evita el descarte por forma.
- **SIEMPRE** el `.md` es la fuente; el deck-plan y el PDF se re-emiten desde acá.
