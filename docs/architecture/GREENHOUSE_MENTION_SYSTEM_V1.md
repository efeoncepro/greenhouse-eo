# Greenhouse — Sistema de Menciones (@mentions)

> **Version:** 1.0
> **Creado:** 2026-04-05 (TASK-240)
> **Audience:** Agentes, desarrolladores, diseñadores de features que consuman o extiendan menciones

---

## 1. Qué es

Un sistema de menciones inline que permite referenciar entidades de Greenhouse (miembros, Spaces, proyectos) dentro de texto generado por LLM o input de usuario. Las menciones se renderizan como chips clickeables que navegan al perfil de la entidad.

## 2. Formato estándar

```
@[Nombre Visible](tipo:ID)
```

### Tipos soportados

| Tipo | Formato | Ejemplo | Navegación |
|------|---------|---------|------------|
| `member` | `@[Nombre](member:MEMBER_ID)` | `@[Andrés Carlosama](member:EO-MBR-a1b2c3d4)` | `/people/[memberId]` |
| `space` | `@[Nombre](space:SPACE_ID)` | `@[Sky Airlines](space:spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9)` | `/agency/spaces/[id]` |
| `project` | `@[Nombre](project:PROJECT_ID)` | `@[Campaña Q1](project:31239c2f-efe7)` | No clickeable (ruta no definida) |

### Regex de parsing

```typescript
/@\[([^\]]+)\]\((member|space|project):([^)]+)\)/g
```

Captura: `[1]` = nombre, `[2]` = tipo, `[3]` = ID.

## 3. Componente: NexaMentionText

**Archivo:** `src/components/greenhouse/NexaMentionText.tsx`

### Props

```typescript
interface NexaMentionTextProps {
  text: string | null    // Texto con posibles marcas @[...](...) 
  variant?: TypographyProps['variant']  // default: 'body2'
  sx?: TypographyProps['sx']            // Estilos del contenedor
}
```

### Uso

```tsx
import NexaMentionText from '@/components/greenhouse/NexaMentionText'

// Texto con menciones → chips clickeables
<NexaMentionText text={narrative} variant='body2' />

// Texto sin menciones → Typography normal (fallback transparente)
<NexaMentionText text="Texto plano sin menciones" />

// Null → no renderiza nada
<NexaMentionText text={null} />
```

### Renderizado

```
Input:  "El FTR% de @[Sky Airlines](space:spc-123) cayó. @[Andrés](member:EO-MBR-456) contribuye."
Output: "El FTR% de [Sky Airlines ▸] cayó. [👤 Andrés ▸] contribuye."
                    ^^^^^^^^^^^^                ^^^^^^^^^^^
                    Chip clickeable             Chip clickeable
                    → /agency/spaces/spc-123    → /people/EO-MBR-456
```

### Comportamiento

| Caso | Resultado |
|------|-----------|
| Texto con marcas válidas | Chips clickeables intercalados con texto |
| Texto sin marcas | Typography normal (sin overhead) |
| Marca malformada (`@[Nombre](bad)`) | Se muestra como texto plano |
| `text` es null | No renderiza nada |
| Tipo `project` | Chip visible pero no clickeable |

## 4. Instrucción al LLM

En el prompt template (`src/lib/ico-engine/ai/llm-types.ts`), se instruye al LLM:

```
Formato de menciones (obligatorio cuando refieras a entidades con ID):
- Miembro del equipo: @[Nombre Completo](member:MEMBER_ID)
- Space o cliente: @[Nombre del Space](space:SPACE_ID)
- Proyecto: @[Nombre del Proyecto](project:PROJECT_ID)
- Siempre incluye el nombre legible dentro de los corchetes y el ID entre paréntesis.
- Si no tienes el ID de una entidad, menciona solo el nombre sin formato de mención.
```

El LLM recibe los IDs y nombres vía `enrichSignalPayload()` (TASK-239):
- `spaceName` + `spaceId`
- `memberName` + `memberId` 
- `projectName` + `projectId`

## 5. Dónde se usa hoy

| Surface | Componente | Campos con menciones |
|---------|-----------|---------------------|
| Nexa Insights (Agency ICO) | `NexaInsightsBlock.tsx` > `InsightCard` | `explanation`, `recommendedAction` |

## 6. Dónde se puede usar (extensiones futuras)

| Surface | Componente candidato | Cómo integrar |
|---------|---------------------|---------------|
| Nexa Chat (`/home`) | `NexaThread.tsx` | Reemplazar Typography de respuestas con `<NexaMentionText>` |
| Notificaciones | `NotificationCard` | Usar `NexaMentionText` para el body |
| Organization 360 insights | Cualquier view que muestre enrichments | Mismo patrón |
| Email digests | Renderer de email | Convertir marcas a `<a href>` en HTML (no chips) |
| Slack alerts | Formatter de Slack | Convertir marcas a `<URL|Nombre>` format de Slack |

## 7. Cómo agregar un nuevo tipo de mención

1. **Agregar tipo al regex** — en `NexaMentionText.tsx`, agregar el nuevo tipo a `MentionType` y `MENTION_CONFIG`:

```typescript
type MentionType = 'member' | 'space' | 'project' | 'campaign'  // nuevo

const MENTION_CONFIG: Record<MentionType, { icon: string; href: (id: string) => string | null }> = {
  // ... existentes ...
  campaign: {
    icon: 'tabler-speakerphone',
    href: (id: string) => `/proyectos/${id}`  // o la ruta que corresponda
  }
}
```

2. **Instruir al LLM** — agregar línea al prompt en `llm-types.ts`:

```
- Campaña: @[Nombre de la Campaña](campaign:CAMPAIGN_ID)
```

3. **Proveer contexto** — en `enrichSignalPayload()` agregar `campaignName` + `campaignId` al JSON de la señal.

## 8. Limitaciones conocidas

- **Proyectos no son clickeables** — la ruta `/proyectos/[id]` requiere contexto de cliente que no está en el enrichment
- **No hay autocompletado** — el sistema es output-only (LLM genera marcas). Para input de usuario (arrobar en chat), se necesita un componente de autocompletado separado
- **Role colors no implementados** — los chips de miembros usan estilo neutral. Follow-up: usar `GH_COLORS.role.*` según el rol del miembro
- **El LLM puede no usar el formato** — si la evidencia es ambigua o el modelo "se olvida", el nombre aparece como texto plano (fallback seguro)
