# Sistema de Email Templates

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-06 por Claude (asistido por Julio Reyes)
> **Ultima actualizacion:** 2026-04-06 por Claude
> **Documentacion tecnica:** `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` (seccion email delivery)

## Que es

Greenhouse usa un sistema de emails transaccionales construido con **react-email** (componentes React que generan HTML compatible con clientes de correo) y **Resend** como servicio de entrega. Todos los templates comparten un layout y design system unificado.

## Inventario de templates

| Template | Archivo | Proposito | Tests |
|----------|---------|-----------|-------|
| Invitacion / Onboarding | `src/emails/InvitationEmail.tsx` | Email de bienvenida cuando un admin invita a un usuario nuevo | No |
| Reset de contrasena | `src/emails/PasswordResetEmail.tsx` | Link para restablecer contrasena | No |
| Verificacion de email | `src/emails/VerifyEmail.tsx` | Confirmacion de direccion de correo | No |
| Recibo de nomina | `src/emails/PayrollReceiptEmail.tsx` | Liquidacion de sueldo del colaborador | Si |
| Exportacion de nomina lista | `src/emails/PayrollExportReadyEmail.tsx` | Notificacion de que el export de nomina esta listo | Si |
| Notificacion generica | `src/emails/NotificationEmail.tsx` | Template generico para notificaciones del sistema | No |

## Componentes compartidos

### EmailLayout (`src/emails/components/EmailLayout.tsx`)

Wrapper de pagina completa que aplica a todos los emails:

- **Header**: gradiente diagonal navy (#022a4e) a azul (#0375db) con logo Efeonce blanco centrado (160x37px)
- **Body card**: contenedor blanco de 560px max-width, border radius 12px, sombra sutil, padding 40px/36px
- **Footer**: marca "Efeonce Greenhouse(TM) . Empower your Growth" + aviso de correo automatico
- Fonts: Google Fonts (Poppins para headings, DM Sans para body)
- Color scheme: solo light mode

### EmailButton (`src/emails/components/EmailButton.tsx`)

Boton CTA reutilizable:

- Fondo azul (#0375db), texto blanco, Poppins SemiBold 15px
- Padding 14px vertical, 36px horizontal
- Border radius 8px, borde 1px (#025bb0)

## Design tokens

| Token | Valor | Uso |
|-------|-------|-----|
| `background` | #F2F4F7 | Fondo general del email |
| `containerBg` | #FFFFFF | Fondo de la tarjeta principal |
| `headerBg` | #022a4e | Gradiente header inicio (Midnight Navy) |
| `headerAccent` | #0375db | Gradiente header fin (Core Blue) |
| `primary` | #0375db | Botones CTA, enlaces |
| `primaryHover` | #025bb0 | Borde de boton / hover |
| `text` | #1A1A2E | Color de headings |
| `secondary` | #344054 | Texto de cuerpo |
| `muted` | #667085 | Disclaimers, pie de pagina |
| `border` | #E4E7EC | Lineas divisoras |
| `success` | #12B76A | Estados exitosos |
| `footerBg` | #F9FAFB | Fondo del footer |

Definidos en `src/emails/constants.ts`.

## Tipografia

| Contexto | Font | Pesos |
|----------|------|-------|
| Headings, botones CTA | Poppins | 500, 600, 700 |
| Texto de cuerpo, disclaimers | DM Sans | 400, 500 |

## Assets de marca

| Asset | Ruta | Uso |
|-------|------|-----|
| Logo blanco (email header) | `public/branding/logo-white-email.png` | Header de todos los emails |
| Logo SVG negativo (blanco) | `public/branding/logo-negative.svg` | Version vector del logo blanco |
| Logo SVG full (azul) | `public/branding/logo-full.svg` | Uso general sobre fondos claros |
| Logo PNG full (azul) | `public/branding/logo-full.png` | Version raster del logo azul |
| Todos los assets | `public/branding/` y `public/branding/SVG/` | Isotipos, variantes, wave, reach, globe |

URL publica del logo email: `https://greenhouse.efeoncepro.com/branding/logo-white-email.png`

## Workflow de diseno: Figma ↔ Codigo

### Exportar a Figma (para revision y ajuste visual)

Los templates se pueden exportar a Figma usando la integracion MCP de Figma para que el equipo los revise y ajuste visualmente antes de implementar cambios.

- **Archivo Figma activo**: [Greenhouse — Email de Invitacion / Onboarding](https://www.figma.com/design/18hfZt9f8DeKMWx5JorFhz)
- **Plan Figma**: Efeonce (pro)

| Template | Estado en Figma |
|----------|----------------|
| InvitationEmail | Exportado |
| PasswordResetEmail | Pendiente |
| VerifyEmail | Pendiente |
| PayrollReceiptEmail | Pendiente |
| PayrollExportReadyEmail | Pendiente |
| NotificationEmail | Pendiente |

### Incorporar cambios de Figma al codigo

1. Leer el diseno actualizado desde Figma (screenshot o design context)
2. Comparar con el componente react-email actual en `src/emails/`
3. Actualizar el componente para reflejar los cambios de diseno
4. Ejecutar tests existentes (`pnpm test`) para PayrollReceiptEmail y PayrollExportReadyEmail
5. Verificar con `pnpm build` y `pnpm lint`

## Servicio de entrega

- **Proveedor**: Resend
- **Integracion**: via SDK de Resend en el backend
- **Patron**: los endpoints API llaman a Resend con el template renderizado como HTML

## Herramientas Figma MCP disponibles

La integracion con Figma se realiza via MCP (Model Context Protocol). Cuenta autenticada: `jreyes@efeoncepro.com`. Plan: **Efeonce** (pro, Full seat, key: `team::1542509061254045561`).

### Lectura (Figma → Codigo)

| Herramienta | Que hace |
|-------------|----------|
| `get_design_context` | Herramienta principal para design-to-code. Retorna codigo de referencia + screenshot + metadata contextual |
| `get_screenshot` | Captura screenshot de un nodo especifico |
| `get_metadata` | Estructura XML del archivo (IDs, tipos, nombres, posiciones) |
| `get_variable_defs` | Tokens de diseno (colores, spacing, fonts) |

### Escritura (Codigo → Figma)

| Herramienta | Que hace |
|-------------|----------|
| `create_new_file` | Crea archivo nuevo de diseno o FigJam |
| `use_figma` | Ejecuta JavaScript via Figma Plugin API (crear, editar, inspeccionar cualquier objeto) |
| `generate_diagram` | Crea diagramas Mermaid (flowchart, sequence, gantt, state) en FigJam |

### Code Connect (vincular Figma ↔ componentes React)

| Herramienta | Que hace |
|-------------|----------|
| `add_code_connect_map` | Mapea nodo Figma → componente React del codebase |
| `get_code_connect_map` | Lee mapeos existentes |
| `get_code_connect_suggestions` | Sugerencias AI de mapeo automatico |
| `get_context_for_code_connect` | Metadata de componente (props, variants, descendientes) |

### Design System

| Herramienta | Que hace |
|-------------|----------|
| `search_design_system` | Busca componentes, variables y estilos en design libraries |
| `create_design_system_rules` | Genera reglas de design system para el repo |

### Gotchas aprendidas

1. `layoutSizingHorizontal = "FILL"` solo se puede setear despues de append a un auto-layout parent
2. `createImageAsync` no existe en el Plugin API via MCP — usar `fetch()` + `figma.createImage(new Uint8Array(buffer))`
3. Para SVGs: `figma.createNodeFromSvg(svgString)` funciona directamente
4. Fonts Inter: "Semi Bold" (con espacio). Poppins: "SemiBold" (sin espacio)
5. `figma.currentPage = page` no funciona — usar `await figma.setCurrentPageAsync(page)`
6. `get_screenshot` y `get_metadata` requieren `nodeId` obligatorio

### Skills de Figma instaladas (7)

Instaladas globalmente en `~/.claude/skills/` desde [github.com/figma/mcp-server-guide](https://github.com/figma/mcp-server-guide). Cada skill tiene un `SKILL.md` con instrucciones detalladas y carpeta `references/` con documentación de la Plugin API.

| Skill | Proposito |
|-------|-----------|
| `figma-use` | Prerequisito obligatorio antes de cada escritura a Figma. Plugin API patterns y gotchas |
| `figma-generate-design` | Traducir paginas/vistas de la app a diseños en Figma |
| `figma-implement-design` | Traducir diseños de Figma a codigo production-ready (React/TypeScript) |
| `figma-generate-library` | Construir design system library completa desde codebase (tokens, componentes, docs) |
| `figma-code-connect` | Mapear componentes Figma ↔ componentes React del codebase |
| `figma-create-design-system-rules` | Generar reglas de design system especificas del proyecto |
| `figma-create-new-file` | Crear archivos Figma nuevos (design o FigJam) |

> Detalle tecnico: ver `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` (seccion email delivery) y `src/emails/constants.ts` para la configuracion completa del design system de emails.
