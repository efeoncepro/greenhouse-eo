# Expediente de Evaluación — notas de candidatura y borrador asistido por IA

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-16 por Claude (TASK-1735)
> **Ultima actualizacion:** 2026-08-16 por Claude
> **Documentacion tecnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md) (Delta 2026-08-16)

## Qué es

Cada postulación tiene ahora un **expediente**: un registro permanente de las notas de
evaluación que el equipo produce durante el proceso — análisis del CV contra el test,
notas de entrevista, observaciones generales. Las notas no se editan ni se borran: si algo
cambia, se agrega una nota nueva que referencia la anterior. Así la decisión final siempre
puede reconstruirse.

## Las dos formas de crear una nota

1. **Manual**: un operador autorizado escribe la nota directamente (por API hoy; la
   pantalla en Application 360 llega en una task posterior).
2. **Asistida por IA (borrador + confirmación humana)**: el sistema lee el CV (versión
   redactada, sin datos de contacto), los resultados del test y el recorrido de la
   candidatura, y redacta un borrador de análisis con evidencia citada y una sección
   explícita de "no verificable". **El borrador no vale nada hasta que un humano lo revisa,
   lo edita si quiere y lo confirma** — recién ahí se convierte en nota del expediente,
   marcada como hecha por agente y con trazabilidad completa (qué modelo, qué versión de
   prompt, qué datos vio).

## Reglas que protegen el proceso

- El candidato **jamás** ve el expediente: ni en el portal, ni por email, ni por las
  herramientas de agentes (MCP).
- La IA **nunca** recibe nombre, contacto, identidad legal ni datos demográficos del
  candidato — solo el texto del CV redactado, las respuestas del test y las etapas.
- Las notas son narrativa: **no cambian puntajes** ni mueven etapas ni deciden nada.
- Solo el tier de gobernanza de Hiring (admin, HR manager, operations) puede escribir o
  confirmar; cualquiera con acceso de lectura de Hiring puede leer.
- La generación por IA está apagada por defecto (flag) hasta completar el smoke en staging.

> Detalle técnico: primitives en `src/lib/hiring/application-notes.ts` y
> `src/lib/hiring/dossier-ai/`; API `GET/POST /api/hiring/applications/[id]/notes` y `/dossier`.
