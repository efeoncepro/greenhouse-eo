# Expediente de Evaluación — notas de candidatura y borrador asistido por IA

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-08-16 por Claude (TASK-1735)
> **Ultima actualizacion:** 2026-08-17 por Claude (cierre del programa — chip "Version superada" + limite 20.000 sin recorte silencioso)
> **Documentacion tecnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md) (Delta 2026-08-16)

## Qué es

Cada postulación tiene ahora un **expediente**: un registro permanente de las notas de
evaluación que el equipo produce durante el proceso — análisis del CV contra el test,
notas de entrevista, observaciones generales. Las notas no se editan ni se borran: si algo
cambia, se agrega una nota nueva que referencia la anterior. Así la decisión final siempre
puede reconstruirse.

## Las dos formas de crear una nota

1. **Manual**: un operador autorizado escribe la nota directamente desde la pantalla
   (tab **Expediente** de la ficha de la postulación) o por API.
2. **Asistida por IA (borrador + confirmación humana)**: el sistema lee el CV (versión
   redactada, sin datos de contacto), los resultados del test y el recorrido de la
   candidatura, y redacta un borrador de análisis con evidencia citada y una sección
   explícita de "no verificable". **El borrador no vale nada hasta que un humano lo revisa,
   lo edita si quiere y lo confirma** — recién ahí se convierte en nota del expediente,
   marcada como hecha por agente y con trazabilidad completa (qué modelo, qué versión de
   prompt, qué datos vio).

## Dónde se ve (delta 2026-08-16, TASK-1737)

El expediente ya no vive solo en la API: tiene pantalla.

- **Dónde está:** ficha de la postulación (`Hiring → postulación`), tab **Expediente**. Es el
  mismo tab que antes se llamaba "Actividad"; los enlaces guardados a `?tab=activity` siguen
  funcionando y abren el Expediente.
- **Qué se ve:** una línea de tiempo, de lo más reciente a lo más antiguo, que mezcla las
  **notas del expediente** con los **eventos de etapa** del proceso. Cada nota muestra su
  tipo (Análisis de CV, Revisión de test, Nota de entrevista, General), quién la escribió,
  cuándo, y si la hizo una persona o el agente. Las notas del agente muestran además su
  **procedencia**: qué modelo la generó, con qué versión de prompt y quién la confirmó.
- **Qué se puede hacer:** escribir una nota nueva (campo abajo del todo, con selector de
  tipo), y —si la generación por IA está encendida— pedir **Generar análisis**, revisar el
  borrador con su evidencia citada, editarlo y confirmarlo o rechazarlo.
- **Nada se edita ni se borra.** Si una nota quedó mal, se escribe una nota nueva. La pantalla
  no ofrece botón de editar ni de eliminar, a propósito.

## Cuando una nota queda reemplazada: el chip "Versión superada"

Como nada se borra, corregir una nota significa **agregar otra**. Para que nadie confunda la
vieja con la vigente, la pantalla marca la reemplazada con un chip **"Versión superada"** y la
muestra atenuada: sigue ahí como historia, pero se lee de inmediato que ya no es la versión
buena. La nota nueva es la que manda.

Esto no es teórico: pasó de verdad. El primer análisis confirmado por una persona se había
guardado **cortado a mitad de frase** (ver abajo), y hubo que registrar la versión completa como
nota nueva. Sin el chip, alguien podía leer la versión mutilada creyendo que era el análisis
final.

## Por qué el análisis ya no se corta

Al principio el cuerpo de una nota admitía hasta 8.000 caracteres y el sistema **recortaba en
silencio** lo que sobrara. El primer análisis real medía 8.240 y se guardó cortado. Peor: la
pantalla no lo delataba, porque muestra el borrador y no el texto guardado — el recorte solo
aparecía para quien leyera la nota por otra vía (API, exportación, agentes).

Ahora:

- el límite es **20.000 caracteres**, holgado para un análisis con evidencia citada;
- si aun así un texto no cabe, **el sistema avisa con un error explícito** y no guarda nada
  cortado. Recortar sin decirlo era exactamente el problema.

## Por qué a veces ves menos notas que un compañero

Para no contaminar tu criterio, el expediente **te esconde el juicio de los demás mientras tu
propia evaluación siga abierta**.

En concreto: si tienes un **scorecard de entrevista asignado en esa postulación y todavía no
lo enviaste**, el Expediente te oculta las notas de evaluación escritas por otras personas
(análisis de CV, revisiones de test, notas de entrevista de terceros) y **todo** lo que
escribió el agente de IA, incluido el borrador pendiente. Verás un aviso con cuántas notas
quedarán visibles y un botón para ir a tu scorecard.

Lo que **sí** sigues viendo siempre:

- tus propias notas, incluidas las de evaluación;
- las notas de tipo **General** de cualquiera;
- los eventos de etapa del proceso;
- el campo para escribir tus propias notas — el bloqueo nunca te impide registrar tu trabajo.

En cuanto envías tu scorecard, el expediente se abre completo, sin que nadie tenga que hacer
nada.

Dos aclaraciones importantes:

- **Si no tienes scorecard asignado en esa postulación, no te aplica.** Un reclutador o
  People Ops ve el expediente completo desde el primer momento.
- **El ocultamiento lo decide el servidor, no la pantalla.** El contenido oculto ni siquiera
  se envía al navegador: no está "escondido con CSS", no llegó. La misma regla aplica a
  cualquier otro consumidor futuro (Nexa, herramientas de agentes), porque vive en el lector
  de datos y no en la vista.

## Reglas que protegen el proceso

- El candidato **jamás** ve el expediente: ni en el portal, ni por email, ni por las
  herramientas de agentes (MCP).
- La IA **nunca** recibe campos de identidad estructurados (contacto, documento legal,
  self-ID demográfico) — el sistema ni siquiera los consulta. El texto del CV y las
  respuestas pasan por un redactor que elimina emails, teléfonos y RUT **por patrón**;
  el nombre puede aparecer en la prosa libre del CV (límite declarado de la redacción
  actual — el expediente completo es internal-only en todo caso).
- Las notas del expediente **no deben capturar atributos demográficos** del candidato
  (edad, género, origen, religión, etc.) — regla de fairness del proceso (TASK-1365).
- Las notas son narrativa: **no cambian puntajes** ni mueven etapas ni deciden nada.
- Solo el tier de gobernanza de Hiring (admin, HR manager, operations) puede escribir o
  confirmar; cualquiera con acceso de lectura de Hiring puede leer.
- La generación por IA está encendida **solo en staging** (desde el 2026-08-16, con autorización
  del CEO) y sigue **apagada en producción** hasta revisar el primer expediente real.
  Con el flag apagado el tab Expediente funciona igual para notas manuales y avisa, sin
  inventar, que el análisis asistido no está disponible.

> Detalle técnico: primitives en `src/lib/hiring/application-notes.ts` y
> `src/lib/hiring/dossier-ai/`; API `GET/POST /api/hiring/applications/[id]/notes` y `/dossier`.
> Pantalla: `src/views/greenhouse/hiring/ApplicationDossierPanel.tsx` (TASK-1737). El filtro
> anti-anclaje vive en `listHiringApplicationNotes` + `isViewerBlindForApplicationEvaluation`
> (`src/lib/hiring/assessment/instances.ts`), el MISMO predicado que usa el anti-anclaje de
> ratings de scorecards.
