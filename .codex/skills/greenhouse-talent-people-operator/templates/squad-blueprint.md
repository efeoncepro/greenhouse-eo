# Squad Blueprint — <Cliente / Engagement>

> Artefacto de `references/client-squad-design.md`. Diseña el pod que se asigna al cliente: roles, seniority, % dedicación, jerarquía, RACI y sinergias. Los números de costo/precio se derivan aparte (finance/commercial); acá va la **forma de la capacidad**.

## 0. Encabezado

- **Cliente / engagement:** <nombre>
- **Modelo de entrega:** Managed Squad · / · Staff Augmentation *(Studio Access no usa este blueprint salvo que tenga una lane humana separada)*
- **Forma de engagement:** On-Going · / · On-Demand · / · Sample Sprint
- **Lane dentro de un híbrido (si aplica):** <lane + accountability; no escribir solo “híbrido”>
- **Modo operativo del Studio (solo si aplica):** efeonce-managed · / · co-operated · / · client-operated *(no reemplaza el modelo de entrega)*
- **Alcance que dimensiona el squad:** <entregables clave por período — ej. "8 artículos/mes + SEO/AEO + multimedia + reportería">
- **Total FTE dedicado:** <~X,X FTE>
- **Account Lead (interlocutor único):** <rol + seniority>

## 1. Composición del squad

| Rol | Lane | Seniority | Responsabilidad principal | % dedic. | Reporta a | Rol real en nómina |
|---|---|---|---|---|---|---|
| Account Lead | Cuenta | Senior/Lead | Interlocutor único, accountable global | | — | |
| <Delivery Lead A> | Estrategia/SEO | Senior/Lead | Owner de la línea de contenido/SEO | | Account Lead | |
| <Especialista> | SEO/AEO | Senior/Mid | On-page, citabilidad IA, medición | | Delivery Lead A | |
| <Editor> | Contenido | Senior | Redacción + QA editorial | | Delivery Lead A | |
| <Redactor> | Contenido | Mid | Producción de contenido | | Delivery Lead A | |
| <Delivery Lead B> | Diseño | Senior/Lead | Owner de la línea visual/QA marca | | Account Lead | |
| <Diseñador> | Diseño | Senior | Imágenes / gráfica | | Delivery Lead B | |
| <AV> | Audiovisual | Senior/Mid | Video simple | | Delivery Lead B | |
| <Social> | Social | Senior/Mid | Adaptación social (no gestiona cuentas) | | Delivery Lead B | |
| <Analista> | Datos | Senior/Mid | Reportería GA4/GSC + visibilidad IA | | Delivery Lead A | |
| **Total** | | | | **~XXX% ≈ X,X FTE** | | |

> `[EST]` marca roles aún no asignados a una persona real (costeados por estimación hasta staffear). Reconciliar % dedicación contra capacity real (ICO/skills-matrix) antes de comprometer.

## 2. Jerarquía (organigrama del pod)

```
Account Lead
├─ Delivery Lead A (Estrategia/SEO)
│   ├─ Especialista SEO/AEO
│   ├─ Editor / Redactor
│   └─ Analista de datos
└─ Delivery Lead B (Creativo/Visual)
    ├─ Diseñador
    ├─ Productor AV
    └─ Social
```

## 3. RACI por workstream

| Workstream | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Planificación | | | cliente | squad |
| Producción de contenido | | | | |
| SEO/AEO | | | | |
| Visual + multimedia | | | | |
| Adaptación social | | | | |
| Reportería | | | | cliente |
| Relación con el cliente | Account Lead | Account Lead | delivery leads | squad |

## 4. Sinergias (por qué es un sistema, no una lista)

- **Datos → Estrategia:** <la reportería alimenta la grilla del mes siguiente>
- **Estrategia → Ejecución:** <un solo mapa de keywords/intención briefea a editor y SEO>
- **Contenido → Visual → Social:** <un artículo genera imagen, video y átomo social en un flujo>
- **Account Lead** sostiene el contexto del cliente para que ninguna lane lo pierda.

## 5. Hand-offs

- Loaded cost (%dedic × costo/rol) → `greenhouse-finance-accounting-operator`.
- Margen / precio → `commercial-expert`.
- Sección de equipo del bid → `greenhouse-public-private-tenders`.
- Reconciliación de capacity → `greenhouse-ico` + `engagement-wellbeing.md`.
- Demanda runtime → `TalentDemand` (stakeholder=client).
