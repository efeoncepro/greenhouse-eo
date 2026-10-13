# Depuración de Leads y etapas del ciclo de vida — HubSpot 48713323

Estado al 2026-10-12: **preparado, no aplicado**. El operador aprobó los tres lotes; la sesión del agente no
pudo escribir en el portal (su control de permisos bloquea escrituras a sistemas externos), así que los lotes
quedan listos para que los ejecute el operador. Ningún registro se modificó: el único intento fue un piloto de
un Lead, bloqueado antes de ejecutarse.

Contexto, conteos y criterio: [manual de operación](../../../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md)
y [decisión CRM](../../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).

## Lotes

| Lote | Registros | Cambio | Criterio de selección |
| --- | --- | --- | --- |
| `leads` | 1.935 Leads | «New» → «Disqualified», con nota de depuración | Creados por la automatización, en «New», contadores de actividad en cero, sin negocio y sin fecha de última actividad |
| `empresas` | 1.741 empresas | `Sales Qualified Lead` → `Lead` | En esa etapa, sin negocio asociado y sin contacto registrado |
| `contactos` | 79 contactos | `Sales Qualified Lead` → `Lead` | En esa etapa, sin negocio, respuesta de correo, formulario ni contacto registrado |

Fuera de los lotes: 275 Leads con fecha de última actividad pese a contadores en cero
(`leads-retenidos-por-revisar.csv`), 23 Leads creados por agentes, 875 contactos y 37 empresas con algún
indicio de actividad. Los archivos sólo contienen IDs de registro y valores de etapa.

La selección de Leads se leyó a las 08:20 del 2026-10-12; la de empresas y contactos, unos veinte minutos
antes. Si pasan días antes de aplicar, conviene regenerarla.

## Cómo aplicar

```bash
bash docs/audits/commercial/hubspot-lifecycle-cleanup-2026-10-12/aplicar-lote.sh leads
```

El script cambia primero un solo registro, lo relee, y pregunta antes de seguir con el resto. Repetir con
`empresas` y `contactos`. Cada corrida deja un `resultado-*.jsonl` con el estado por registro.

## Lo que el piloto todavía no ha comprobado

- Que el pipeline de Leads acepte pasar a «Disqualified» sin motivo. Ninguno de los ocho motivos del portal
  describe «creado por automatización», por eso el lote escribe sólo la nota y deja el motivo vacío. Si el
  piloto falla por eso, hay que elegir un motivo o crear una opción nueva, que es un cambio de esquema.
- Que vaciar la etapa del ciclo de vida y volver a escribirla funcione por esta vía. La etapa no retrocede
  si no se vacía antes; por eso empresas y contactos van en dos pasos.
- Antes de `contactos` y `empresas`, confirmar que la automatización «Crea un lead» sigue apagada: si
  estuviera activa, cada contacto que entre a `Lead` generaría un Lead nuevo.

## Cómo revertir

```bash
bash docs/audits/commercial/hubspot-lifecycle-cleanup-2026-10-12/aplicar-lote.sh revertir-leads
```

También `revertir-empresas` y `revertir-contactos`. La reversión devuelve etapa y nota; las fechas de
entrada a cada etapa que HubSpot calcula no vuelven a su valor anterior.
