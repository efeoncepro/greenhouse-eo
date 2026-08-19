# Procedencia de Datos de Hiring

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-18 por Claude (TASK-1739)
> **Ultima actualizacion:** 2026-08-18 por Claude
> **Documentacion tecnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)

## Qué problema resuelve

Greenhouse usa **una sola base de datos** para desarrollo, staging y producción. Cada vez que alguien
corría una prueba automática del módulo de contratación, esa prueba creaba vacantes y candidatos que
quedaban guardados **junto a los reales**, sin ninguna marca que los distinguiera.

La única forma de separarlos era adivinar por el nombre, y esa adivinanza falla en las dos direcciones:

- **Borra cosas reales.** Una respuesta verdadera de un candidato decía *"propondría pequeñas pruebas
  o pilotos"*. Un barrido que buscara la palabra "prueba" la habría marcado como basura.
- **Deja pasar lo falso.** Los scripts de prueba usaban cinco convenciones distintas de nombre y
  ninguna compartida, así que cualquier búsqueda que las cubriera todas era tan amplia que arrasaba
  con candidatos reales.

## Qué cambió

Ahora **cada dato dice si representa algo del mundo real** en el momento en que nace.

| Valor | Qué significa |
|---|---|
| `real` | Una persona o un cargo del mundo real. Es el valor por defecto. |
| `synthetic_seed` | Un dato de apoyo permanente para desarrollo. |
| `smoke_test` | Un dato de una verificación puntual. No debería sobrevivir a su corrida. |
| `demo` | Un dato para mostrar la plataforma. Puede tener que sobrevivir. |

**Si nadie declara nada, el dato queda como real.** Es deliberado: dejar visible un dato de prueba es
molesto pero evidente; ocultar un candidato verdadero sería grave y nadie se daría cuenta.

## Las tres reglas que sostienen el sistema

**1. La procedencia se declara en dos lugares: la persona y la vacante.** Una postulación no la declara
— la hereda de ambas, y si cualquiera de las dos no es real, la postulación tampoco lo es. Una
postulación verdadera a una vacante inventada no es evidencia de nada.

**2. Una vacante que no es real no se puede publicar.** Antes, ocho vacantes creadas por una prueba
llegaron a estar publicadas en el sitio de empleos real. Que ningún candidato externo postulara a ellas
fue suerte. Ahora el sistema lo impide.

**3. La inteligencia artificial no se calibra con datos inventados.** El conjunto de respuestas que se
usa para medir la calidad del scoring automático excluye los datos sintéticos **siempre**, sin
posibilidad de desactivarlo. No es una preferencia: al revisar la base ya existía una respuesta
inventada calificada a mano, lista para entrar a esa muestra.

## Qué se ve distinto

Con el filtro activado, el escritorio de contratación deja de contar vacantes y candidatos que no
existen. En la revisión del 18 de agosto de 2026 eso significó pasar de **24 vacantes a 2** — las dos
reales que están vivas — y de 79 postulaciones a 47.

Ese salto es grande y esperable: casi todo lo que había de más eran restos de pruebas acumulados
durante meses. **No se perdió nada**: los datos siguen ahí, marcados y archivados, y el filtro se puede
desactivar en minutos.

## Qué NO hace

- **No borra nada por su cuenta.** Marcar y purgar son acciones que una persona autoriza explícitamente,
  con motivo registrado.
- **No decide por el nombre.** Ninguna regla del sistema mira el nombre de una persona para clasificarla.
- **No toca a nadie con vida laboral.** Si una persona es colaborador, tiene contrato, finiquito o
  relación legal, el sistema se niega a marcarla como sintética.
- **No cambia obligaciones legales.** La retención de documentos de candidatos ignora por completo la
  procedencia: la ley no depende de que un dato parezca de prueba.

> Detalle técnico: contrato en [`src/lib/hiring/data-origin/`](../../../src/lib/hiring/data-origin/);
> spec en [`TASK-1739`](../../tasks/complete/TASK-1739-hiring-synthetic-data-provenance.md).
