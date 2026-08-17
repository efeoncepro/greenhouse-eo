# Identidad de Candidatos en el Intake — Evidencia, Display y Corrección Segura

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-08-16 por Claude (TASK-1736 Slice 4)
> **Ultima actualizacion:** 2026-08-17 por Claude (cierre del programa — remediacion ejecutada + flag ON en staging)
> **Documentacion tecnica:** [GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1](../../architecture/GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md) · [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)

## Qué problema resuelve

Cuando una persona postulaba escribiendo su nombre "todo en minúsculas" (por ejemplo
`valentina villa`), ese texto quedaba pegado tal cual en todo Greenhouse: los correos salían
"valentina, tu postulación…" y las pantallas internas mostraban el nombre sin dignidad. Peor aún:
si la persona volvía a postular con su nombre bien escrito, el sistema conservaba el primero.

Greenhouse ahora separa el nombre del candidato en **tres capas**:

| Capa | Qué es | ¿Se puede cambiar? |
|---|---|---|
| **Evidencia** | Lo que la persona escribió, letra por letra, guardado por cada postulación | No, nunca. Es el registro histórico |
| **Display** | El nombre "presentable" que ven correos y pantallas | Sí — automáticamente en casos evidentes, o por un operador autorizado |
| **Clave de búsqueda** | Una versión interna para comparar nombres (sin tildes ni mayúsculas) | Se regenera sola; nadie la ve |

## La evidencia queda intacta, siempre

Cada postulación guarda el nombre exactamente como la persona lo escribió. Ninguna corrección,
automática o humana, toca ese registro. Si algún día hay que reconstruir qué pasó, la evidencia
original está completa, con fecha y versión de las reglas que se aplicaron.

## Qué se corrige solo (y qué jamás)

El sistema solo "arregla" el caso evidente: un nombre **completamente en minúsculas o
completamente en mayúsculas** en alfabeto latino (`valentina villa` → `Valentina Villa`), cuidando
partículas culturales ("María de los Ángeles", "van der Meer", "McDonald", "O'Neill").

Todo lo demás — mayúsculas mixtas intencionales (`LaTonya`), alfabetos no latinos, nombres de una
letra, o un nombre nuevo que difiere de verdad del que ya existía — **queda para que decida un
humano** (estado `needs_review`). El sistema nunca adivina, nunca reordena nombre y apellido, y
nunca reescribe el mensaje libre del candidato.

## Quién corrige y cómo

- **Corrección manual**: requiere el permiso fino `hiring.candidate.correct_display`
  (roles EFEONCE_ADMIN, HR_MANAGER y EFEONCE_OPERATIONS). Toda corrección exige el valor anterior
  exacto, el actor y un motivo, y queda registrada en una bitácora que no se puede editar ni borrar.
- **Una corrección humana siempre gana**: después de que un operador corrige un nombre, ninguna
  postulación posterior ni proceso automático lo pisa.

## Remediación de los casos históricos (con allowlist)

Los nombres degenerados que ya existían se reparan con un proceso gobernado, nunca con un cambio
masivo directo:

1. **Dry-run**: un reporte de solo lectura lista los casos detectados y qué se propondría.
2. **Allowlist humana**: un operador revisa el reporte línea a línea y aprueba (o poda) cada caso.
   En la revisión real de 2026-08-16 el operador aprobó a las personas reales y **podó los perfiles
   de prueba QA** de la lista.
3. **Apply**: se aplica de a un registro por vez, verificando que el nombre no haya cambiado desde
   el dry-run; cualquier sorpresa detiene el proceso sin tocar nada.
4. **Reversible**: cada cambio guarda el valor anterior; se puede revertir registro por registro.

**Este proceso ya se ejecutó.** El 2026-08-16, con autorización del CEO, se corrigieron **3 personas
reales** — Valentina Villa, Stana Medina y Aldo Romano, que aparecían en minúsculas por el intake
público — y se dejaron fuera **2 perfiles de prueba QA**. Cada corrección quedó registrada con quién
la hizo y por qué; el nombre anterior se conserva. Ninguna de esas personas volverá a recibir un
correo que la salude en minúsculas.

Este proceso es independiente del interruptor (flag) del sistema nuevo: prender el flag no autoriza
la remediación, y la remediación exige siempre la lista aprobada por un humano.

## Estado operativo

El escritor nuevo (evidencia + corrección automática del caso evidente) está **encendido en staging**
(desde el 2026-08-16, con autorización del CEO) y **apagado en producción**
(`HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED`). Con el flag apagado, el intake se comporta
exactamente como antes. El encendido sigue el runbook de rollout (staging → canary → producción) y
dos señales en `/admin/operations` vigilan que nada quede pendiente ni silencioso.

> Detalle técnico: primitives en `src/lib/hiring/candidate-intake/**` (normalización, evidencia,
> reconcile CAS, corrección humana, detector y remediación) · migración
> `migrations/20260816203411170_task-1736-candidate-identity-evidence.sql` · runbook
> `docs/operations/runbooks/candidate-identity-rollout.md` · manual
> `docs/manual-de-uso/hr/operar-remediacion-nombres-candidatos.md`.
