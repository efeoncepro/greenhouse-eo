# Borrar la auditoría de recuperación de acceso de un candidato

> **Tipo de documento:** Manual de uso (paso a paso operativo)
> **Version:** 1.0
> **Creado:** 2026-08-26 por Claude (Opus 5)
> **Ultima actualizacion:** 2026-08-26 por Claude (Opus 5)
> **Documentacion tecnica:** [`GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)

## Para qué sirve

Cada vez que le recuperas el acceso a un candidato —por correo o por enlace seguro— queda un rastro de
auditoría: quién lo pidió, cuándo, por qué canal. Es correcto que exista, y es correcto que no viva para
siempre.

Ese rastro se borra en dos situaciones, y sólo en esas dos:

| Motivo | Cuándo aplica |
|---|---|
| `consent_withdrawn` | El candidato **retiró su consentimiento**. Es un derecho suyo: se ejerce cuando lo pide, no cuando vence un plazo |
| `retention_expired` | Pasaron los **12 meses** de retención sobre un proceso ya cerrado sin selección |

## Antes de empezar

- Necesitas acceso de operador a la base (`greenhouse_ops`). **El portal no puede hacer esto**: la función
  está deliberadamente revocada al usuario con el que corre la aplicación, porque es un acto humano.
- El borrado es **irreversible**. Lo que queda después es una fila de auditoría con el id de la postulación
  **hasheado** — o sea que ni siquiera el rastro del borrado dice de quién era.

## Paso a paso

**1. Mira qué se borraría, sin borrar nada.**

```bash
pnpm hiring:assessment:purge-access-recovery
```

Lista las postulaciones elegibles separadas por motivo, con cuántas filas tiene cada una y cuándo vence su
retención. No escribe nada.

**2. Emite la lista para revisarla a mano.**

```bash
pnpm hiring:assessment:purge-access-recovery --emit-allowlist ./task-1746.access-recovery-purge-allowlist.json
```

El archivo es local y está gitignoreado: contiene ids de postulación y **nunca se commitea**.

**3. Revísalo línea por línea y borra lo que no corresponda.**

Este paso es el punto del procedimiento, no un trámite. Lo que quede en el archivo se borra.

**4. Aplica sólo lo que quedó, con tu identidad.**

```bash
pnpm hiring:assessment:purge-access-recovery --apply \
  --allowlist ./task-1746.access-recovery-purge-allowlist.json \
  --actor <tu-user-id>
```

## Qué significan las señales

| Señal | Qué significa |
|---|---|
| `✓ <postulación>  filas=N` | Se borraron N filas de esa postulación |
| `✗ ... workforce retention` | La persona pasó a ser colaboradora: su rastro obedece la retención **laboral**, que es más larga. El sistema se niega, y hace bien |
| `✗ ... candidate consent no está withdrawn` | Pediste `consent_withdrawn` para alguien que no retiró nada. Revisa el motivo |
| `✗ ... retención todavía vigente` | Todavía no se cumplen los 12 meses, o quedan filas de otra clase sin vencer |
| `0 postulación(es)` en el plan | No hay nada que borrar. Es el estado normal |

## Qué no hacer

- **NUNCA** aplicar sin allowlist. El comando lo rechaza, pero la razón importa: sin lista explícita
  "ninguna" es la respuesta correcta, nunca "todas".
- **NUNCA** commitear el archivo de allowlist.
- **NUNCA** forzar un rechazo. Cuando la función se niega, está protegiendo un dato que debe conservarse —
  típicamente el de alguien que ya es parte del equipo.
- **NUNCA** usar esto para "limpiar" datos de prueba. Para eso está `pnpm hiring:data:purge-synthetic`.

## Problemas comunes

**El plan devuelve 0 y esperabas resultados.** Lo más probable es que la postulación siga abierta: la
retención sólo corre sobre procesos cerrados sin selección. Un proceso en curso conserva su rastro.

**Un candidato pidió que borren sus datos y no aparece en el plan.** Verifica que su consentimiento esté
efectivamente marcado como retirado en su ficha. El comando no infiere el retiro: lo lee.

## Referencias técnicas

- Primitive: `src/lib/hiring/assessment/access-recovery-retention.ts`
- Función de base: `greenhouse_hiring.purge_assessment_access_recovery` (migración de `TASK-1746`)
- Recuperación de acceso: [`recuperar-acceso-a-test-de-candidato.md`](recuperar-acceso-a-test-de-candidato.md)
