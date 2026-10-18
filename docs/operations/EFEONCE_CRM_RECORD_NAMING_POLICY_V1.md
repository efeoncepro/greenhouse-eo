# Convención de nombres de negocios y leads Efeonce

## Decisión aceptada — 2026-10-15

- **Status:** Accepted; Julio Reyes aprobó documentar y adoptar la propuesta en esta conversación.
- **Owner:** Commercial / Julio Reyes; HubSpot conserva identidad, asociaciones y estado comercial.
- **Scope:** nombres de Deal (`dealname`) y Lead nativo (`hs_lead_name`) del portal Efeonce `48713323`, por UI, CLI, MCP o preparación de agentes.
- **Reversibility:** cambio de texto reversible por ID y valor anterior; sin migración de schema.
- **Confidence / Validated as of:** decisión confirmada el 15/10/2026; primera aplicación en Gana con readback live.

### Contexto y alternativas

Los nombres libres mezclaban marca, holding, servicio y proceso en distinto orden, dificultando la búsqueda.
Se adopta marca/cuenta primero para agrupar visualmente sus iniciativas. Se descartan prefijos de etapa,
owner, fuente o monto: cambian durante la venta y ya tienen propiedades propias. Un nombre compuesto
sólo por el contacto tampoco permite reconocer rápidamente la cuenta y la necesidad.

### Contrato vigente

| Objeto | Propiedad | Formato |
| --- | --- | --- |
| Negocio | `dealname` | `Marca o cuenta ∣ País ∣ Iniciativa ∣ Referencia` |
| Lead nativo | `hs_lead_name` | `Marca o cuenta ∣ País ∣ Necesidad ∣ Nombre Apellido` |

En las tablas se representa el separador como `∣` sólo para no romper Markdown. El valor real usa
siempre barra vertical ASCII y un espacio a cada lado: ` | `. Sin prefijos `Deal`, `Lead` o `Negocio`.

```text
Gana | CO | Programática omnicanal | GRD-1541
Empresa Alfa | CL | Implementación HubSpot | 2026-10
Empresa Alfa | CL | Renovación SEO y AEO | 2027
Empresa Alfa | CL | Implementación HubSpot | Ana Pérez
```

Sólo Gana corresponde a un registro real de esta adopción; los demás son ejemplos ficticios.

## Composición de los campos

1. **Marca o cuenta:** nombre comercial reconocible y escritura consistente con su identidad comprobada.
   Cuando la necesidad sea de Gana, usar Gana; usar Grupo Réditos sólo para un alcance del grupo confirmado.
   La Company legal canónica se conserva asociada: nombrar una marca no crea otra Company ni cambia Primary.
   Si la marca no está confirmada, usar la cuenta verificada sin inferirla del dominio o del holding.
2. **País:** mercado del alcance comercial, no nacionalidad de la persona ni sede del holding. Usar códigos
   de dos letras en mayúsculas: CL, CO, MX, PE. Usar LATAM sólo con alcance regional confirmado. Si falta
   evidencia, escribir `País por confirmar` y registrar la brecha; no adivinarlo para cumplir el formato.
3. **Iniciativa o necesidad:** expresión breve, concreta y sustentada, usando la misma escritura para el
   mismo servicio. Ejemplos: `Programática omnicanal`, `Implementación HubSpot`, `Operación HubSpot`,
   `SEO y AEO`, `Social Care`. El catálogo comercial vigente gobierna los nombres de oferta; esta lista
   no crea productos, enums ni servicios contratados. En Lead sin necesidad definida, usar
   `Exploración comercial`; no atribuir interés por mero fit o investigación.
4. **Referencia del negocio:** código oficial completo en licitación/RFP, por ejemplo GRD-1541. En venta
   directa sin código, mes real de apertura `AAAA-MM`, estable y distinto de la fecha de cierre estimada.
   En renovación sin código oficial, usar período contractual confirmado, por ejemplo 2027; si todavía
   no se conoce, conservar el mes de apertura. El código oficial prevalece cuando existe.
5. **Persona del Lead:** nombre y apellido del Contact asociado y elegible, según identidad verificada.
   No inferir persona de un correo compartido ni crear contactos para llenar el nombre. Un Lead histórico
   Company-only o ambiguo queda pendiente de reconciliación; no inventar responsable para normalizarlo.

Usar mayúsculas de marca y siglas oficiales, acentos y espacios simples. Evitar títulos en mayúsculas,
emoji, correos y frases como `Nuevo negocio`, `Propuesta comercial`, `V2` o `Final`. Resumir la iniciativa
sin perder identidad, mercado ni código. Los valores internos de los campos no deben contener ` | `.

## Identidad, estabilidad y admisión

- Nombre legible no es llave única. Dedupe por ID CRM, Company/Contact e iniciativa; en licitaciones,
  también ID oficial y llave de idempotencia. No fusionar por coincidencia textual de nombres.
- Dos oportunidades reales de la misma cuenta/mes se distinguen por alcance o proyecto comprobado,
  por ejemplo Implementación HubSpot frente a Operación HubSpot. Versiones de una propuesta comparten Deal.
  Si aún parecen iguales, reconciliar su identidad antes de crear o renombrar; no agregar numeración arbitraria.
- Etapa, temperatura, owner, monto, moneda, pipeline, canal y próximo paso se guardan en sus propiedades.
  La renovación se menciona en iniciativa para distinguir el compromiso, sin reemplazar `dealtype`.
- Mantener el nombre estable al avanzar de etapa. Corregir sólo identidad/alcance confirmado o error,
  registrando valor anterior y evidencia. No reescribir los snapshots fechados para ocultar nombres previos.
- El formato no autoriza altas: Contact conserva su nombre personal; Lead nativo requiere interacción
  real y contacto elegible según el [manual de captura](../manual-de-uso/hubspot/llenar-propiedades-comerciales.md).
  Añadir contactos no crea un Lead por persona ni un Deal por defecto.
- El nombre no acredita calificación, GO, compra, relación de cliente ni avance de etapa.

## Procedimiento y adopción

1. Verificar portal, objeto, identidad/mercado y posibles duplicados; resolver datos con fuente.
2. En creación autorizada, preparar el nombre con esta convención junto al changeset del objeto.
   En renombrado, mostrar ID, antes y después; reutilizar el mandato vigente, sin ampliar el lote.
3. Cambiar sólo el campo aprobado. Leer de nuevo el mismo ID y repetir tras automatización cuando aplique.
4. Actualizar dossier y registro operativo con el nombre vigente. Conservar evidencia histórica y
   dejar por separado el valor anterior, nuevo, fecha y resultado del readback.

Adopción obligatoria para nuevas altas autorizadas desde 15/10/2026 y cambios de nombre expresamente
incluidos en el mandato. Primera aplicación: Deal Gana `66065702426`. El resto del histórico, incluidos
los negocios abiertos, queda pendiente de un lote concreto con identidad/dedupe revisados; no se ejecuta
una migración masiva ni se renombra al editar otro campo. Priorizar abiertos en la futura normalización.
No se instalaron workflows, validadores, cambios de permisos ni enforcement de API por esta adopción.

### Consecuencias y revisión

Las skills y manuales enlazan esta única regla; no mantienen catálogos paralelos. Revisar la decisión si
cambia el modelo de marcas/mercados o se implementa generación/validación automática con su propio gate.
Esta política Efeonce no se impone a portales de clientes ni a registros de partner con contrato diferente.

## Evidencia de aplicación

[Caso Gana](../commercial/tenders/gana-programatica-colombia-1541-2026/README.md) y
[recibo de renombrado](../commercial/tenders/gana-programatica-colombia-1541-2026/research/CRM-NAMING-2026-10-15.json).
