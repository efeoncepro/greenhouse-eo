> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-06-15 por Claude (TASK-1124 follow-up)
> **Ultima actualizacion:** 2026-06-15 por Claude
> **Documentacion tecnica:** [docs/architecture/nexa-intelligence/README.md](../../architecture/nexa-intelligence/README.md)

# Nexa Intelligence — las capas, en simple

Nexa es la inteligencia conversacional de Greenhouse: la persona le pregunta algo y recibe una
respuesta clara, confiable y con sus fuentes. Por dentro, esa inteligencia está organizada en
**capas**, cada una con una responsabilidad. Esta es la versión simple; la técnica vive en
[la carpeta Nexa Intelligence](../../architecture/nexa-intelligence/README.md).

## Qué hace cada capa

| Capa | En una frase |
|---|---|
| **System prompt (versionado)** | Las instrucciones base de Nexa son un "documento con versión": se pueden mejorar y revertir sin romper nada. |
| **System prompt (vigente)** | Qué dicen hoy esas instrucciones: quién es Nexa, qué herramientas usa, cómo cita, cómo escala temas sensibles. |
| **Comportamiento + routing** | Qué hace en cada pregunta: ¿busca en la base de conocimiento, mira un dato en vivo, o responde directo? Y qué modelo usa (decisión interna). |
| **Voz, tono, estilo y personalidad** | Cómo suena: directa, cálida, te trata de "tú", datos primero, sin relleno ni emojis de más. |
| **Do's & Don'ts** | Las reglas duras: qué siempre hace y qué nunca hace. |
| **Evidencia + citas** | Cómo respalda lo que dice: marcadores `[1]` en el texto y las fuentes en un panel aparte. |
| **Knowledge + calidad de respuesta** | Cómo busca en la base de conocimiento y arma una respuesta propia (no copia un pedazo). |

## Las dos cosas que más importan para entenderla

1. **Cuando responde de la base de conocimiento, sintetiza** — cruza los documentos y arma una
   respuesta propia, no te pega un fragmento. Las fuentes que la respaldan están en el desplegable
   de "Fuentes", no en el texto.
2. **Es honesta** — si no hay una guía publicada, te lo dice y no inventa. Si una fuente está
   desactualizada, lo avisa. En temas sensibles (nómina, finanzas, legal) te recomienda validar con
   la persona responsable.

## Si Nexa responde algo que se ve mal

- **¿Salió un `##` o símbolos raros?** Eso es formato crudo de un documento. Está corregido para que
  el preview de fuentes se vea como prosa.
- **¿Dijo un dato incorrecto pero con su cita?** Casi seguro la **fuente** (el documento) tiene el
  error — no es que Nexa "alucine". Se corrige el documento y se vuelve a cargar al corpus.

> Detalle técnico: las 7 capas + la documentación técnica (modelos LLM, cómo funciona el RAG,
> técnicas, contratos) viven en [docs/architecture/nexa-intelligence/](../../architecture/nexa-intelligence/README.md).
> Para operarla/mantenerla paso a paso: [manual de uso](../../manual-de-uso/plataforma/nexa-intelligence-mantener.md).
