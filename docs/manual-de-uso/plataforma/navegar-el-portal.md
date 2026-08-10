# Navegar el portal — sidebar, menú del avatar y buscador ⌘K

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-08-10 por Claude (TASK-1388 + TASK-1686)
> **Ultima actualizacion:** 2026-08-10 por Claude
> **Documentacion tecnica:** [TASK-1388](../../tasks/complete/TASK-1388-vertical-menu-restructure.md) · [TASK-1686](../../tasks/complete/TASK-1686-pure-collaborator-navigation.md) · [Sistema de identidad, roles y acceso](../../documentation/identity/sistema-identidad-roles-acceso.md)

## Para qué sirve

Greenhouse reparte la navegación en **tres superficies**, cada una con un trabajo distinto. Este manual explica cuál usar para cada cosa. Lo que ves depende de tu rol; las tres superficies muestran siempre el mismo conjunto de destinos que tienes permitido.

## Las tres superficies

### 1. El sidebar (menú lateral) — tu trabajo

Para usuarios internos, el sidebar tiene **Home** arriba y tres zonas:

- **OPERACIÓN** — los dominios del día a día: **Agencia** (Resumen · Equipo y talento · Operaciones), **Comercial** (pipeline, cotizaciones, contratos, Sample Sprints, productos y la sección **Growth**), **Finanzas** (Flujo operativo · Tesorería · Documentos · Inteligencia) y **Personas** (directorio, nómina, supervisión, organización, desarrollo).
- **ADMINISTRACIÓN** — el **Admin Center** (identidad y acceso, equipo y operaciones, plataforma). El ítem de tenants se llama **"Spaces (admin)"** para no confundirlo con los Spaces de Agencia.
- **RECURSOS** — Knowledge y Design System.

Los dominios se abren **de a uno** (acordeón): al abrir Finanzas, Comercial se cierra solo. El dominio de la pantalla donde estás queda siempre expandido.

Si tu único rol es **Colaborador**, tu sidebar es distinto: **Mi Greenhouse** + la sección **Mi Ficha** con tus páginas personales (asignaciones, desempeño, nómina, permisos, etc.) + los recursos que tengas concedidos. No verás dominios operativos ni enlaces del portal cliente.

### 2. El menú del avatar (esquina superior derecha) — tu cuenta

Haz clic en tu foto o iniciales:

- **Usuarios internos**: aquí vive todo lo personal — el encabezado con tu nombre lleva a **Mi Perfil**, y debajo están tus páginas `Mi Greenhouse`, `Mis Asignaciones`, `Mi Nómina`, `Mi Cuenta de Pago`, `Mis Permisos`, etc. (Ya no están en el sidebar: el sidebar es para operar; el avatar, para lo tuyo.)
- **Colaborador puro**: identidad + **Mi Perfil** + **Salir** (tus páginas personales ya están en tu sidebar).
- **Clientes**: accesos a su portal, como siempre.

El menú se abre también con teclado (Enter o Espacio sobre el avatar) y se cierra con **Esc**, devolviendo el foco al avatar.

### 3. El buscador ⌘K — la cola larga

Presiona **Cmd+K** (Mac) o **Ctrl+K** (Windows), o haz clic en el botón **Buscar** de la barra superior. Escribe el nombre de cualquier pantalla y salta directo. El buscador:

- muestra **solo lo que tu rol puede ver**, agrupado por sección;
- recuerda tus **destinos recientes**;
- incluye la acción **Salir del Greenhouse**;
- se navega con ↑/↓, se abre con Enter y se cierra con Esc.

Úsalo cuando no recuerdes en qué dominio vive una pantalla: es más rápido que expandir el árbol.

## Qué significan los estados

- **Un dominio abierto a la vez** en el sidebar es el comportamiento normal (acordeón), no un error.
- Si una pantalla **no aparece** en ninguna superficie, tu rol no la tiene concedida — no está "escondida" en otro menú.
- En pantallas angostas el sidebar vive en un **drawer**: se abre con el botón de menú (☰) y se cierra tocando fuera.

## Qué no hacer

- No busques lo personal (`Mi Nómina`, `Mis Permisos`…) en el sidebar interno: vive en el menú del avatar.
- No reportes como bug que otro dominio "se cerró solo" al abrir uno: es el acordeón.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| "No encuentro Mi Nómina" (interno) | Buscabas en el sidebar | Ábrela desde el menú del avatar, o escribe "nómina" en ⌘K |
| Una pantalla no sale en ⌘K | Tu rol no la tiene concedida | Pídela a quien administra accesos (Admin Center → Usuarios/Roles) |
| El sidebar "perdió" secciones | Cambio de rol o de organización | Verifica tu rol con el administrador |

## Referencias técnicas

- Árbol del sidebar: `src/components/layout/vertical/VerticalMenu.tsx` (SoT de copy: `GH_INTERNAL_NAV` en `src/config/greenhouse-nomenclature.ts`).
- Menú del avatar: `src/components/layout/shared/UserDropdown.tsx` + builder `src/lib/navigation/my-nav-items.ts`.
- Buscador: `src/components/layout/shared/GlobalCommandPalette.tsx` sobre `src/components/greenhouse/CommandPalette/`.
