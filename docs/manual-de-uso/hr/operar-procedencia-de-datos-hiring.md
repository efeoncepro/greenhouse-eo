# Operar la procedencia de datos de Hiring

> **Tipo de documento:** Manual de uso (operador)
> **Version:** 1.0
> **Creado:** 2026-08-18 por Claude (TASK-1739)
> **Documentacion funcional:** [procedencia-de-datos-hiring.md](../../documentation/hr/procedencia-de-datos-hiring.md)

## Para qué sirve

Marcar qué datos del módulo de contratación son de prueba, sacarlos de las vistas operativas y —cuando
corresponda— archivarlos. Todo con registro de quién lo hizo y por qué.

## Antes de empezar

- Necesitas acceso a la base vía `pnpm pg:connect` (el proxy debe estar arriba).
- Ten claro el `user-id` con el que vas a firmar la acción: queda guardado en el registro de auditoría.
- **Lee el plan completo antes de aplicar nada.** El sistema propone; tú decides.

## Paso a paso

### 1. Ver qué propondría el sistema (no cambia nada)

```bash
pnpm hiring:data:mark-synthetic
```

Imprime cada candidato con **la señal que lo disparó y su confianza**. Las señales fuertes son el autor
del registro (para vacantes y demandas) y el dominio del correo (para personas). El nombre **no se usa
como señal**, a propósito.

### 2. Emitir la lista para revisarla

```bash
pnpm hiring:data:mark-synthetic --emit-allowlist ./task-1739.synthetic-origin-allowlist.json
```

El archivo está ignorado por git. **Revísalo línea por línea y borra lo que no corresponda.** Este paso
es el corazón del protocolo, no un trámite.

### 3. Aplicar sólo lo aprobado

```bash
pnpm hiring:data:mark-synthetic --apply \
  --allowlist ./task-1739.synthetic-origin-allowlist.json \
  --actor <tu-user-id> --reason "<motivo de al menos 10 caracteres>"
```

Va de a un registro por vez. Si algo cambió desde que generaste el plan, esa fila **se salta y te lo
dice** en vez de pisarla.

### 4. Deshacer un registro puntual

```bash
pnpm hiring:data:mark-synthetic --rollback <auditId> --actor <tu-user-id> --reason "<motivo>"
```

### 5. Archivar lo marcado

```bash
pnpm hiring:data:purge-synthetic                      # ver el plan
pnpm hiring:data:purge-synthetic --archive --actor <tu-user-id> --reason "<motivo>"
```

## Qué significan los estados

| Resultado | Qué pasó |
|---|---|
| `applied` | Se marcó y quedó registrado. |
| `skipped (already_marked)` | Ya estaba marcado. Repetir es seguro. |
| `needs_review (cas_mismatch)` | La fila cambió desde el plan. **Regenera el plan**, no reintentes a ciegas. |
| `needs_review (work_life_blocker)` | La persona tiene vida laboral. El sistema se niega. |
| `needs_review (proposed_is_real)` | Quisiste marcar algo como real. Para deshacer usa el rollback. |

## Qué NO hacer

- **No apliques sin podar la lista.** El plan propone con evidencia; no es un veredicto.
- **No uses el borrado para "limpiar rápido".** Archivar cubre casi todo, es reversible y preserva la
  auditoría. El borrado es irreversible y sólo acepta registros sin ningún rastro.
- **No pegues la salida en chat, issues ni logs compartidos.** Trae identificadores de personas.
- **No edites la procedencia con SQL a mano.** La única puerta es el comando, que deja auditoría.
- **No uses la procedencia para decidir si contactar a alguien.** Eso lo decide el consentimiento.

## Problemas comunes

- **`ECONNREFUSED 127.0.0.1:15432`** → el proxy se cayó. Levántalo con `pnpm pg:connect`.
- **El plan trae más candidatos de los esperados** → suelen ser restos de pruebas cuyo teardown falló.
  Revisa el autor antes de aplicar.
- **Una vacante de prueba no se deja publicar** → es correcto y deliberado. Si necesitas publicarla,
  el problema es que está marcada como no real, no la guarda.
- **El escritorio muestra muchas menos vacantes tras activar el filtro** → es el efecto buscado.
  Verifica el conteo contra lo que marcaste; si no cuadra, apaga el flag y revisa.

## Referencias técnicas

- Contrato: `src/lib/hiring/data-origin/`
- Señal de salud: `hiring.data_quality.data_origin_derivation_drift` en `/admin/operations`
- Gate preventivo: `pnpm hiring:data-origin-gate`
- Spec: `docs/tasks/in-progress/TASK-1739-hiring-synthetic-data-provenance.md`
