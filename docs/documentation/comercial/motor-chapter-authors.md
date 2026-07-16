# Motor de Chapter-Authors — Autoría Agéntica de Láminas de Propuesta

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-07-16 por Claude (TASK-1415)
> **Última actualización:** 2026-07-16 por Claude
> **Documentación técnica:** [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md §5-ter](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md) (Delta 2026-07-16) · [COMMERCIAL_TENDERS_AGENT_INVARIANTS.md](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md) (§Chapter-author engine)

## Qué es

El motor de chapter-authors es la pieza del Tender Proposal Studio que permite que **un agente
de IA redacte el contenido de una lámina de propuesta** — algo que hasta ahora se escribía a
mano en el `deck-plan.json`. El agente propone el texto; **una persona lo confirma**; el
composer lo renderiza. El agente nunca decide solo.

Es **servicio-agnóstico**: el mismo motor sirve para redactar la lámina de diagnóstico
(SEO/AEO), una de credenciales, y en el futuro las de creativo, social media, web/CRM,
contenido, económica o equipo. Cada servicio "enchufa" su propia fuente de datos; la máquina
que propone, valida y confirma es una sola.

## La garantía central: los números no se inventan

La regla que gobierna todo el motor es la separación entre **dato** y **redacción**:

| Quién | Qué hace | Qué NO puede hacer |
|---|---|---|
| El **mapper** (código puro, determinista) | Deriva los hechos desde la fuente real (p. ej. el run del AI Visibility Grader), cada uno con su fuente verificable (`evidenceRef`) | No interpreta ni redacta |
| El **LLM** (agente) | Redacta títulos, narrativa y cuerpos **enmarcando esos hechos** | No puede introducir una cifra ni un link que no esté en los hechos — si lo hace, la propuesta completa se rechaza |
| El **humano** | Revisa y confirma la propuesta | Es el único que puede confirmar (un agente jamás) |
| El **ensamble** (código puro) | Arma los slots de la lámina inyectando las cifras y fuentes **desde los hechos**, no desde el texto del modelo | — |

En la práctica: es **imposible que una lámina salga con un número fabricado**, porque los
números nunca pasan por el modelo — viajan del dato medido directo a la lámina. Los datos
externos (p. ej. tráfico de Semrush) los aporta el operador con su fuente, y viajan tal cual.

> Detalle técnico: `src/lib/commercial/tenders/proposals/authoring/chapter-author.ts`
> (guards `assertQuantifiedClaimsAreEvidenced` y `assertLinksAreEvidenced`).

## Qué existe hoy

- **Diagnóstico (SEO/AEO)** — la primera implementación completa: lee el reporte del AI
  Visibility Grader y produce las dos láminas del capítulo de diagnóstico (`diagnostico` +
  `escalera`, las mismas del deck de SKY). Los 5 peldaños de la escalera salen del mapeo
  canónico del informe (Be Found … Be Intrinsic); verificado contra el run real de SKY
  reproduce exactamente los scores que un humano autoró a mano (40/70/37/8/76).
- **Credenciales** — un segundo author mínimo, de otro servicio, que existe para probar que el
  motor no está "fiteado" a SEO/AEO.
- **El eval como candado**: cada author tiene un set de pruebas con un "golden" (las láminas
  reales de SKY). Nadie puede cambiar el prompt o el esquema del agente sin que ese eval siga
  verde. Corre en CI, sin llamar al LLM (es determinista).

## Qué NO existe todavía

- El **orquestador** (que decide qué capítulos lleva un deck) y el **verifier** (revisión
  agéntica de integridad) — son los otros dos nodos del diseño, tasks futuras.
- Los **authors productivos** de los demás servicios (creativo, social, económica, squad…).
- La **superficie para usarlo desde Nexa o el portal** — hoy se opera por script (ver el
  manual). La governed action de Nexa es un follow-up declarado.

## Estados y señales

- **Flag `TENDER_CHAPTER_AUTHOR_ENABLED`** — default OFF en todos los ambientes. Con el flag
  apagado, el propose rechaza con un mensaje claro y el flujo manual del `deck-plan` sigue
  disponible. El flag solo gatea la llamada al LLM; todo lo demás (validación, ensamble) es
  código puro.
- **Una propuesta rechazada no es un error del sistema**: es el diseño funcionando. Si el
  agente escribió una cifra sin respaldo o se pasó del largo permitido, el motor la rechaza
  completa y reintenta (máximo 2 reintentos con el motivo del rechazo). Si agota los
  reintentos, no se propone nada — nunca se degrada a contenido inventado.

## Cómo se relaciona con el resto del Studio

- El output del confirm es un **plan canónico del composer**: el author declara la intención
  (`contentType` + contenido) y el **catálogo elige la plantilla** — el agente no puede
  escoger diseño.
- La confirmación humana y la idempotencia siguen el mismo molde que el intake agent y el
  render agent del Studio (`propose → confirm → execute`).

> Detalle técnico: [proposal-studio-aggregate.md](proposal-studio-aggregate.md) (el aggregate
> y sus gates) · [tender-deck-composer.md](tender-deck-composer.md) (el composer y el catálogo).
