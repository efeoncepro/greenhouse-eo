# CODEX TASK — Fix: Sección de Equipo en Dashboard Cliente (Pulse)

## Problema central

La sección "Capacidad del equipo" en el dashboard Pulse está conceptualmente mal. Se implementó como Vista 2 (carga operativa con barras de utilización) cuando lo que debe estar en el dashboard es la **Vista 1 (equipo asignado — dossier relacional)**. Son dos cosas distintas:

| | Vista 1: Tu equipo asignado | Vista 2: Capacidad operativa |
|---|---|---|
| **Propósito** | Quién trabaja para mí, qué hacen, cómo los contacto | Cuánta carga tienen, quién está saturado |
| **Ubicación** | Dashboard (Pulse) — la ve el cliente siempre | Puede vivir como expandible dentro de Vista 1, o como sección en un futuro módulo de capacity planning |
| **Data** | Semi-estática: nombre, cargo, foto, FTE, canal de contacto | Dinámica: tareas activas por persona, distribución por proyecto |
| **Tono** | Relacional: "este es tu equipo" | Operativo: "así está la carga" |
| **Upselling** | Ghost slot: "Ampliar equipo" — invitación visual permanente | CTA condicional: "tu equipo está al X%" — solo cuando hay saturación |

**Lo que hay que hacer:** Reemplazar la implementación actual con la Vista 1 (dossier relacional). La Vista 2 (capacidad operativa) puede mostrarse como detalle expandible de la Vista 1, o implementarse después en otra ubicación.

---

## Leer obligatorio antes de ejecutar

1. `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` — secciones 8.1 (naming del equipo), 13.1 (constantes TypeScript), 14 (design tokens y colores)
2. `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` — secciones D1 (spec de Vista 1), C1 (API /api/team/members)
3. `docs/tasks/complete/CODEX_TASK_Client_Dashboard_Visual_Diagnosis.md` — sección M4 (microcopy de equipo)

---

## Lo que debe mostrar la sección de equipo en Pulse

### Título y subtítulo

```
Tu equipo asignado
Las personas asignadas a tu operación creativa
```

Fuente: `GH_TEAM.section_title` y variante para Pulse. NO "Capacidad del equipo" — ese título es para la Vista 2 operativa.

### Layout: Grid de personas + sidebar de resumen

**Zona izquierda (70% del ancho) — Lista de personas:**

Cada persona en una card compacta horizontal:

```
┌─────────────────────────────────────────────────────────────┐
│ [Avatar]  Daniela Ferreira                    Dedicación    │
│           Creative Operations Lead            1.0 FTE       │
│           ✉ Microsoft Teams · #acme-efeonce   160h/mes      │
└─────────────────────────────────────────────────────────────┘
```

**Datos por persona:**
- Avatar: foto si existe (`avatar_url`), fallback a iniciales con fondo `GH_COLORS.role[category].bg` y texto `GH_COLORS.role[category].text`
- Nombre completo: DM Sans 500 14px, `GH_COLORS.neutral.textPrimary`
- Cargo: DM Sans 400 13px, color `GH_COLORS.role[category].text` (NO todo en Sunset Orange — cada rol tiene su color)
- Canal de contacto: ícono + nombre del canal + handle. DM Sans 400 12px, `GH_COLORS.neutral.textSecondary`
- Dedicación: alineada a la derecha. "1.0 FTE" en DM Sans 500 14px + "160h/mes" debajo en DM Sans 400 12px `textSecondary`

**Lo que NO muestra cada persona:**
- Sin barra de utilización individual
- Sin porcentaje de utilización
- Sin nombre repetido como subtexto (el actual muestra "Daniela Ferreira" dos veces)

**Ghost slot (último elemento):**

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│         [+]  Ampliar equipo                                 │
│              Agrega capacidad creativa, de medios            │
│              o tecnología.                                   │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

- Borde dashed, fondo `GH_COLORS.neutral.bgSurface`
- Ícono "+" centrado verticalmente
- Texto: `GH_TEAM.expand_title` + `GH_TEAM.expand_subtitle`
- Click abre modal de solicitud de expansión
- Solo visible si hay ≥1 persona asignada
- Mismo alto que las cards de persona para mantener el grid limpio

**Zona derecha (30% del ancho) — Resumen de capacidad contratada:**

Card sticky con:

```
┌─────────────────────────────────┐
│ Capacidad contratada            │
│ 3.0 FTE de 3.0 FTE contratados │
│                                 │
│ Horas este mes                  │
│ 480 horas mensuales             │
│                                 │
│ Línea de servicio               │
│ [Globe]  badge                  │
│                                 │
│ Modalidad                       │
│ On-Going                        │
└─────────────────────────────────┘
```

- FTE total: `SUM(fte_allocation)` de los miembros asignados al cliente
- Horas: FTE × 160
- Línea de servicio: badge con color de `GH_COLORS.service[line]`
- Modalidad: texto (On-Going / On-Demand)
- **Sin barra de utilización** — la Vista 1 no muestra utilización
- **Sin CTA de upselling** — el ghost slot ya cumple esa función

---

## Data source

### Si las tablas BigQuery de team existen:

Usar `GET /api/team/members` (spec en `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md`, C1).

Query:
```sql
SELECT
  m.member_id, m.display_name, m.email, m.avatar_url,
  m.role_category,
  COALESCE(a.role_title_override, m.role_title) AS role_title,
  COALESCE(a.contact_channel_override, m.contact_channel) AS contact_channel,
  COALESCE(a.contact_handle_override, m.contact_handle) AS contact_handle,
  a.fte_allocation
FROM `greenhouse.client_team_assignments` a
JOIN `greenhouse.team_members` m ON a.member_id = m.member_id
WHERE a.client_id = @client_id AND a.active = TRUE AND m.active = TRUE
ORDER BY CASE m.role_category 
  WHEN 'account' THEN 1 WHEN 'operations' THEN 2 
  WHEN 'strategy' THEN 3 WHEN 'design' THEN 4 
  WHEN 'development' THEN 5 WHEN 'media' THEN 6 ELSE 7 END
```

### Si las tablas BigQuery de team NO existen aún:

Usar la data que ya tiene el space. El componente actual ya obtiene personas de alguna fuente (probablemente la config del space/tenant). Mantener esa fuente pero corregir la presentación:

- Mostrar: nombre, cargo, foto, FTE
- Agregar: canal de contacto (puede ser hardcoded por ahora como "Microsoft Teams")
- Agregar: color por role_category (mapear los cargos actuales a categorías)
- Eliminar: barras de utilización, porcentaje de utilización, nombre duplicado
- Agregar: ghost slot

**Mapeo de cargos actuales a role_category:**

| Cargo actual en el space | role_category | Color (`GH_COLORS.role`) |
|---|---|---|
| Creative Operations Lead | operations | Royal Blue #024c8f |
| Senior Visual Designer | design | Crimson Magenta #bb1954 |
| Efeonce Leadership | account | Deep Azure #023c70 |
| Efeonce Team | — (cargo genérico, no válido) | Usar `operations` como default |

**Nota sobre "Efeonce Team" y "Efeonce Leadership":** Estos no son cargos reales — son placeholders. En la config del space, reemplazar con cargos reales:
- Valentina → "Account Manager" (account)
- Humberly → "Content Strategist" (strategy)
- Luis → cargo real (verificar)
- Julio → no debería aparecer en vista cliente — es internal leadership

---

## Qué eliminar de la implementación actual

1. **Eliminar TODAS las progress bars de utilización individual** — son data falsa (100% para todos) y no corresponden a esta vista
2. **Eliminar el nombre duplicado** debajo de cada persona (actualmente aparece "Daniela Ferreira" como nombre y luego "Daniela Ferreira" como subtexto)
3. **Eliminar la barra de utilización general** de la zona derecha — la Vista 1 no muestra utilización
4. **Eliminar el CTA rojo/magenta** "Tu equipo está al 100% de capacidad" — el ghost slot reemplaza esta función de upselling de forma más sutil
5. **Eliminar el texto "Estimación de uso basada en la carga operativa actual del equipo"** — no aplica a la Vista 1
6. **Cambiar el título** de "Capacidad del equipo" a "Tu equipo asignado"
7. **Cambiar el subtítulo** de "Carga operativa basada en proyectos y tareas activas" a "Las personas asignadas a tu operación creativa"

---

## Qué agregar

1. **Ghost slot** al final de la lista de personas
2. **Color diferenciado por cargo** usando `GH_COLORS.role[category].text`
3. **Canal de contacto** por persona (Teams/Slack/email + handle)
4. **Línea de servicio** como badge en la zona derecha
5. **Modalidad** (On-Going / On-Demand) en la zona derecha
6. **Empty state** si no hay personas: `GH_TEAM.empty_team`

---

## Colores — tabla de referencia rápida

Todos salen de `GH_COLORS` en `greenhouse-nomenclature.ts`. Cero hex en componentes.

| Uso | Constante | Hex resultante |
|---|---|---|
| Avatar fondo — account | `GH_COLORS.role.account.bg` | #eaeff3 |
| Avatar texto — account | `GH_COLORS.role.account.text` | #023c70 |
| Cargo texto — operations | `GH_COLORS.role.operations.text` | #024c8f |
| Cargo texto — design | `GH_COLORS.role.design.text` | #bb1954 |
| Cargo texto — strategy | `GH_COLORS.role.strategy.text` | #633f93 |
| Cargo texto — media | `GH_COLORS.role.media.text` | #ff6500 |
| Cargo texto — development | `GH_COLORS.role.development.text` | #0375db |
| Badge Globe | `GH_COLORS.service.globe` | bg: #f9ecf1, text: #bb1954 |
| Ghost slot fondo | `GH_COLORS.neutral.bgSurface` | #f7f7f5 |
| Ghost slot borde | `GH_COLORS.neutral.border` | #dbdbdb (dashed) |
| Texto primario | `GH_COLORS.neutral.textPrimary` | #022a4e |
| Texto secundario | `GH_COLORS.neutral.textSecondary` | #848484 |

---

## Vistas faltantes (después de este fix)

Una vez que la Vista 1 esté correcta en Pulse, las siguientes vistas se implementan por separado:

| Vista | Ubicación | Qué muestra | Prioridad |
|---|---|---|---|
| Vista 1 expandida: Dossier completo | Mi Greenhouse (/settings) | Cards grandes con bloque de relevancia personalizada + todos los canales de contacto | P1 |
| Vista 2: Capacidad operativa | Expandible dentro de Vista 1 en Pulse, o sección separada | Carga real por persona con barras segmentadas por proyecto. Requiere campo Responsable en BQ | P2 |
| Vista 3: Equipo en proyecto | /proyectos/[id] | Avatares apilados + tabla expandible con métricas por persona en el proyecto | P2 |
| Vista 4: Velocity por persona | /sprints/[id] | Completados/total por persona en el sprint + progress bar | P2 |

---

## Criterios de aceptación

### Contenido visible:
- [ ] Título: "Tu equipo asignado" (NO "Capacidad del equipo")
- [ ] Subtítulo: "Las personas asignadas a tu operación creativa"
- [ ] Cada persona muestra: avatar, nombre, cargo (con color por role_category), canal de contacto, FTE
- [ ] Ghost slot como último elemento con "Ampliar equipo" + subtítulo
- [ ] Zona derecha: FTE total, horas mensuales, línea de servicio (badge), modalidad

### Contenido eliminado:
- [ ] Sin barras de utilización individual (ni naranjas ni de ningún color)
- [ ] Sin porcentaje de utilización por persona
- [ ] Sin nombre duplicado por persona
- [ ] Sin barra de utilización general en zona derecha
- [ ] Sin CTA rojo/magenta de "Tu equipo está al 100%"
- [ ] Sin texto de "Estimación de uso basada en carga operativa"
- [ ] Sin error "No pudimos cargar la capacidad del equipo" — la Vista 1 usa data estática, no queries de carga

### Colores y tipografía:
- [ ] Color de cargo diferenciado por role_category usando `GH_COLORS.role[category].text`
- [ ] Avatar sin foto usa iniciales con fondo `GH_COLORS.role[category].bg`
- [ ] Badge de línea de servicio usa `GH_COLORS.service[line]`
- [ ] Nombres en DM Sans 500 14px, cargos en DM Sans 400 13px, datos secundarios en DM Sans 400 12px
- [ ] Cero hex hardcodeados en componentes

### Funcional:
- [ ] Ghost slot clickeable abre modal de solicitud de expansión
- [ ] Lista filtrada por client_id del usuario autenticado (no todo el equipo Efeonce)
- [ ] Si no hay personas asignadas, mostrar empty state: `GH_TEAM.empty_team`
- [ ] La sección NO depende de queries de carga operativa (no debería fallar por falta de data de tareas)

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
