# 03 · E-E-A-T + Entidad / Knowledge Graph + YMYL

> Carga este módulo para: confianza y autoridad de marca/autor, construcción de
> entidad y Knowledge Graph, y el listón elevado de verticales YMYL
> (finanzas/salud/legal). Sello: as-of 2026-06.

## E-E-A-T: qué es y qué NO es

**E-E-A-T** = **E**xperience · **E**xpertise · **A**uthoritativeness ·
**T**rust. Viene de las *Search Quality Rater Guidelines* de Google.

- **No es un factor de ranking directo** que puedas "subir" con un dial. Es un
  *marco conceptual* que describe qué señales aproximan calidad. Los
  evaluadores humanos lo usan para calibrar los sistemas; los sistemas
  aproximan E-E-A-T con señales medibles (enlaces, menciones, reseñas, autoría,
  consistencia de entidad).
- **Trust es el centro.** Experience, Expertise y Authoritativeness alimentan a
  Trust. Un contenido experto pero no confiable no sirve.
- **Experience** (añadida 2022) = experiencia de primera mano. ¿El autor
  *realmente usó* el producto, *vivió* la situación? Crítico para reviews y
  contenido práctico. Es lo más difícil de falsificar y por eso valioso.

### Señales que aproximan E-E-A-T (lo accionable)
- **Autoría real y verificable:** byline con nombre, bio, credenciales, foto,
  perfil de autor con historial. Schema `Person` + `author` en `Article`.
- **Página "Sobre nosotros" y contacto** robustas, con dirección, equipo,
  historia, datos verificables.
- **Estándares editoriales** publicados (proceso de revisión, fact-checking,
  política de correcciones) — especialmente YMYL.
- **Citas a fuentes autoritativas** + ser citado por otros.
- **Reseñas y reputación** fuera del sitio (Google, Trustpilot, G2, prensa).
- **Consistencia de entidad** (ver Knowledge Graph abajo).
- **HTTPS, sin malware, transparencia de propiedad/financiamiento.**

## Entidad de marca + Knowledge Graph (el multiplicador 2026)

En 2026 los motores —clásicos **e IA**— razonan por **entidades**, no por
cadenas de texto. Una "entidad" es una cosa del mundo (tu marca, una persona, un
producto) con identidad propia en el Knowledge Graph de Google y en el
"conocimiento" de los LLMs. **Construir tu entidad es el trabajo de fondo que
multiplica SEO y AEO a la vez.**

Por qué importa para IA: los LLMs responden mejor (y te citan) sobre entidades
que *reconocen* y de las que tienen información consistente. Las **menciones de
marca correlacionan ~3× más con visibilidad IA que los backlinks** (data 2026).

### Cómo se construye una entidad (receta)
1. **Define la entidad canónicamente** — nombre, qué es, categoría, atributos.
   Una sola descripción consistente repetida en todas partes.
2. **Schema `Organization` + `sameAs`** — enlaza tu entidad a sus perfiles
   autoritativos (LinkedIn, Crunchbase, Wikipedia/Wikidata si aplica, redes,
   GBP). `sameAs` es la pista explícita de "estas referencias son la misma
   entidad". Ver `templates/jsonld/organization.json`.
3. **Wikidata / Wikipedia** — Wikidata es editable y es fuente directa del
   Knowledge Graph; una entrada Wikidata bien construida (con fuentes) es
   alcanzable para marcas medianas. Wikipedia exige *notability* real (cobertura
   independiente) — no se fuerza; se gana con prensa. ⚠️ No hagas edición
   promocional (se revierte y daña reputación).
4. **Consistencia NAP + descripción** en todos los perfiles (nombre, dirección,
   teléfono idénticos) — ver `06_LOCAL_INTERNATIONAL.md`.
5. **Menciones co-ocurrentes** — que tu marca aparezca *junto a* las entidades de
   tu categoría y temas (prensa, podcasts, Reddit, listicles). Esto enseña a los
   modelos "esta marca pertenece a este espacio". Ver `05_OFFPAGE_AUTHORITY.md`.
6. **Knowledge Panel** — el objetivo visible: que Google muestre un panel de tu
   marca. Se gana con entidad sólida + notability + datos estructurados, no se
   solicita directamente (puedes *reclamar* uno existente).

### Entidad de autor (personal branding para E-E-A-T)
Para verticales de expertise, los **autores** también son entidades. Construye:
bio consistente, `sameAs` del autor, presencia en su campo (charlas, papers,
prensa), schema `Person` con `jobTitle`/`knowsAbout`/`alumniOf`. Un autor
reconocido eleva el E-E-A-T de todo lo que firma.

## YMYL — el listón alto (finanzas, salud, legal, seguridad)

**YMYL** = *Your Money or Your Life*: contenido que puede impactar salud,
finanzas, seguridad o bienestar. Google aplica un estándar de calidad mucho más
estricto porque el daño de un mal contenido es real.

**Relevante para Efeonce:** clientes en **banca/seguros** (Globe) → su contenido
es YMYL. El listón:
- **Expertise formal demostrable** — autores con credenciales reales del campo
  (no "content writers" genéricos). Médico para salud, profesional financiero
  certificado para finanzas.
- **Fuentes autoritativas** y citadas (organismos oficiales, papers, reguladores).
- **Exactitud y actualización** — info desactualizada en YMYL es daño. Refresh
  frecuente y fecha visible.
- **Transparencia** — quién escribe, quién revisa, conflictos de interés,
  disclaimers apropiados.
- **Reputación fuera del sitio impecable.**
- En AEO esto es aún más crítico: los motores IA son *conservadores* citando
  YMYL y penalizan fuertes señales de baja confianza. La exactitud factual de lo
  que el LLM dice sobre la marca es parte del juego (`07_MEASUREMENT.md` →
  monitoreo de exactitud/alucinación).

## Cómo auditar E-E-A-T / entidad (rápido)
1. Busca la marca en Google: ¿hay Knowledge Panel? ¿qué dice la SERP de marca?
2. Pregunta a ChatGPT/Perplexity/Gemini "¿qué es {marca}?": ¿responden? ¿es
   correcto? ¿qué fuentes citan? (esto es oro: te dice qué "sabe" la IA de ti).
3. Revisa `sameAs` y consistencia de perfiles.
4. Revisa autoría: ¿hay byline real con credenciales? ¿schema `Person`?
5. Revisa reputación off-site (reseñas, prensa, menciones).
6. ¿Wikidata existe y es correcta?

> **Cross-refs:** schema `Organization`/`Person` → `01_SEO_TECHNICAL.md` +
> `templates/jsonld/`. Menciones/PR para entidad → `05_OFFPAGE_AUTHORITY.md`.
> Citabilidad IA → `04_AEO_GEO.md`. Medir qué sabe la IA de la marca →
> `07_MEASUREMENT.md`. NAP/consistencia local → `06_LOCAL_INTERNATIONAL.md`.
