# Operar el Expediente de Evaluación (pantalla + API)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.2
> **Creado:** 2026-08-16 por Claude (TASK-1735)
> **Ultima actualizacion:** 2026-08-17 por Claude (cierre del programa — chip "Version superada", limite 20.000, flag ON en staging)
> **Documentacion funcional:** [expediente-de-evaluacion.md](../../documentation/hr/expediente-de-evaluacion.md)

## Para qué sirve

Registrar y leer notas de evaluación de una postulación, y generar/confirmar el borrador
asistido por IA — desde el tab **Expediente** de la ficha de la postulación (uso diario) o
por API (agentes, automatización, diagnóstico).

## Antes de empezar

- Rol con capability `hiring.application.annotate` (admin / HR manager / operations) para
  escribir; `hiring.application.read` basta para leer.
- El `applicationId` (formato `happ-…`, visible en la URL de Application 360).
- Para el borrador IA: flag `HIRING_EVALUATION_DOSSIER_AI_ENABLED=true` en el ambiente
  (hoy OFF por defecto) y que el CV del candidato tenga proyección lista (TASK-1718).

## Desde la pantalla (uso diario)

**Dónde:** `Hiring → postulación → tab Expediente`
(`/agency/hiring/applications/<happ-id>?tab=expediente`). El enlace antiguo
`?tab=activity` sigue funcionando y abre el mismo tab.

### 1. Abrir el tab

Entra a la ficha de la postulación y elige **Expediente**. Vas a ver la línea de tiempo con
las notas ya registradas y los eventos de etapa, de lo más reciente a lo más antiguo. Si
todavía no hay notas, verás el estado vacío con el campo para escribir la primera.

### 2. Generar el análisis (opcional, requiere IA encendida)

Pulsa **Generar análisis**. El botón solo aparece si tienes capability para anotar **y** la
generación por IA está encendida en el ambiente.

- Si no aparece y esperabas verlo: la IA está apagada en ese ambiente (la pantalla lo dice
  bajo el encabezado). Las notas manuales funcionan igual.
- Si al pulsar sale un aviso de que el CV no está listo: la proyección del CV todavía no
  terminó. Reintenta más tarde; no es un error tuyo.
- Si pulsas dos veces sin querer, no pasa nada: pedir el análisis con las mismas fuentes
  devuelve el mismo borrador, sin costo extra.

### 3. Revisar el borrador

El borrador aparece en un bloque destacado, arriba de la línea de tiempo. Léelo completo,
incluida la sección **"No verificable con las fuentes"** — ahí el agente declara qué NO pudo
comprobar. Cada afirmación viene con su evidencia citada debajo.

Si el borrador quedó viejo (cambió el test o el CV después de generarlo), la pantalla te
avisa y puedes pedir uno nuevo.

### 4. Editar

Pulsa **Editar** para abrir el texto en modo edición, precargado con el borrador. Corrige lo
que quieras: **lo que quede escrito es lo que se guarda como nota**, no el original del
agente. Puedes cancelar sin perder el borrador.

### 5. Confirmar o rechazar

- **Confirmar y agregar** convierte el borrador en una nota del expediente, marcada como
  hecha por agente y con su procedencia (modelo, versión de prompt, quién confirmó).
- **Rechazar** abre un diálogo donde escribes el motivo y cierra la propuesta.

Las dos decisiones son **finales**: no se puede re-confirmar ni deshacer. Si después
encuentras un error, escribes una nota nueva — el expediente es append-only por diseño.

### 6. Escribir una nota manual

Abajo del todo: elige el tipo (Análisis de CV, Revisión de test, Nota de entrevista,
General), escribe el cuerpo y pulsa **Agregar nota**. Hay un contador de caracteres (máximo
**20.000**). La nota aparece en la línea de tiempo recién cuando el servidor confirma que quedó
guardada — si algo falla, verás el error, nunca una nota fantasma.

Si un texto excede el límite, el servidor **responde con un error explícito**
(`400 hiring_dossier_body_too_long`, con el largo real) y **no guarda nada**. Antes recortaba
en silencio: el primer análisis confirmado de verdad quedó cortado a mitad de frase, y la
pantalla no lo delataba porque muestra el borrador, no el texto guardado. Si ves ese error,
acorta el texto o divídelo en dos notas — nunca asumas que "se guardó igual".

### 7. Leer una nota marcada como "Versión superada"

Como nada se edita ni se borra, corregir una nota es **agregar otra**. La reemplazada queda en
la línea de tiempo con el chip **"Versión superada"** y tratamiento atenuado.

Qué significa para ti: **esa no es la versión vigente.** Está ahí como historia (el registro es
append-only por diseño), pero la buena es la nota nueva. No cites una nota con ese chip en una
decisión de contratación.

### Si ves menos notas de las que esperabas

Cuando tienes un **scorecard de entrevista asignado en esa postulación y aún no lo enviaste**,
el expediente te oculta el juicio ajeno para no anclar tu evaluación: notas de evaluación de
otras personas y todo lo escrito por el agente, incluido el borrador. La pantalla te lo dice
explícitamente, con cuántas notas quedarán visibles y un botón **Ir a mi scorecard**.

Esto **no es un error ni un problema de permisos**. Envía tu scorecard y el expediente se
abre completo. Mientras tanto sigues viendo tus propias notas, las notas de tipo General de
cualquiera y los eventos de etapa, y sigues pudiendo escribir.

Si no tienes scorecard asignado en esa postulación (caso típico de reclutador o People Ops),
esto no te aplica: ves todo desde el principio.

> El ocultamiento lo resuelve el servidor. El contenido bloqueado no viaja al navegador — no
> se puede "ver igual" abriendo el inspector.

## Paso a paso por API (staging vía carril canónico)

```bash
# Leer el expediente
pnpm staging:request /api/hiring/applications/<happ-id>/notes

# Registrar una nota manual
pnpm staging:request POST /api/hiring/applications/<happ-id>/notes '{"kind":"interview_note","bodyMd":"..."}'

# Generar borrador IA (requiere flag ON)
pnpm staging:request POST /api/hiring/applications/<happ-id>/dossier '{"action":"propose"}'

# Ver la propuesta vigente
pnpm staging:request /api/hiring/applications/<happ-id>/dossier

# Confirmar (con edición opcional) o rechazar
pnpm staging:request POST /api/hiring/applications/<happ-id>/dossier '{"action":"confirm","proposalId":"hdsp-...","editedBodyMd":"..."}'
pnpm staging:request POST /api/hiring/applications/<happ-id>/dossier '{"action":"reject","proposalId":"hdsp-...","decisionNote":"..."}'
```

## Estados y señales

- `409 hiring_dossier_ai_disabled`: el flag está OFF — las notas manuales siguen operando.
  Hoy `HIRING_EVALUATION_DOSSIER_AI_ENABLED` está **ON en staging** (desde 2026-08-16) y **OFF en
  producción**: en producción esta respuesta es la esperada, no una falla.
- `400 hiring_dossier_body_too_long`: el cuerpo excede los 20.000 caracteres. El servidor no
  guarda nada cortado — acorta o divide en dos notas.
- `409 hiring_dossier_cv_not_ready`: la proyección del CV no está lista; reintenta cuando
  el review packet esté `ready`.
- Propose repetido con las mismas fuentes devuelve la MISMA propuesta (idempotente, sin
  costo LLM extra); si cambió el test/CV, genera una nueva.
- Confirmar materializa la nota (`source: agent`) y cierra la propuesta — es terminal: no
  se puede re-confirmar ni revertir (la corrección es una nota nueva).

## Qué no hacer

- No escribir atributos demográficos del candidato (edad, género, origen, religión) en
  ninguna nota — regla de fairness del proceso de selección.

- No pedir el borrador "por fuera" (chat) y pegarlo a mano: se pierde el provenance.
- No intentar editar/borrar notas por SQL — el trigger y los grants lo bloquean a propósito.
- No leer ni citar una nota con chip **"Versión superada"** como si fuera la vigente: por
  definición existe una nota posterior que la reemplaza.
- No exponer contenido del expediente al candidato por ningún canal.

## Problemas comunes

- 403: te falta la capability `annotate` (pídela al tier de gobernanza) o usas una persona
  agente sin el rol correcto.
- La nota no aparece en la lista: verifica que usaste el `applicationId` correcto — las
  notas son por postulación, no por persona.
- **En la pantalla no aparece el campo para escribir:** no tienes capability `annotate`. La
  lectura sigue operando; pide el permiso al tier de gobernanza.
- **En la pantalla no aparece "Generar análisis":** o te falta `annotate`, o la generación
  por IA está apagada en ese ambiente (flag `HIRING_EVALUATION_DOSSIER_AI_ENABLED`).
- **"Reintentar" no aparece en un error:** es a propósito. Cuando la causa es estructural
  (permiso revocado, IA apagada, CV no listo) reintentar no arregla nada; la pantalla te
  muestra la acción real en vez de un botón inútil.
- **El tab dice que no pudo cargar el expediente:** el lector falló. Eso NO significa
  "expediente vacío" — la pantalla distingue los dos casos a propósito. Revisa Sentry
  (dominio `hiring`, tag `hiring:application-360-expediente-notes`).
