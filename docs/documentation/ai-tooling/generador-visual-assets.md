> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-04-07 por Claude (TASK-278)
> **Ultima actualizacion:** 2026-07-06 por Claude (acceso Fal.ai)
> **Documentacion tecnica:** [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md)

# Generador Visual de Assets con IA

## Que es

Un modulo interno que permite al agente AI (Claude) generar imagenes y animaciones para las interfaces del portal durante el desarrollo. No es una funcionalidad para usuarios — es una herramienta de productividad del equipo de desarrollo.

## Que puede generar

### Imagenes (via Imagen 4 de Google)

Imagenes rasterizadas de alta calidad:
- **Banners** para headers de seccion (perfil, detalle de persona, organizacion)
- **Ilustraciones** para empty states (sin datos, sin asignaciones)
- **Fondos decorativos** para cards, dashboards, onboarding
- **Thumbnails** para proyectos, espacios o servicios sin imagen

Las imagenes se guardan en `public/images/generated/` como PNG o WebP.

### Animaciones SVG (via Gemini)

Graficos vectoriales animados con CSS:
- **Loading spinners** personalizados con colores de marca
- **Iconos animados** (check, error, warning, info)
- **Ilustraciones animadas** para empty states
- **Micro-interacciones** (pulse, bounce, fade, draw)

Las animaciones se guardan en `public/animations/generated/` como SVG. Incluyen automaticamente soporte para `prefers-reduced-motion` (accesibilidad).

## Banners de perfil por categoria

Cada colaborador ve un banner personalizado en su perfil segun su rol o departamento:

| Categoria | Quien lo ve | Estetica |
|-----------|------------|----------|
| Leadership | Directores, Admin | Constelacion navy-purple con nodos dorados |
| Operations | Operaciones, Cuentas, PM | Pipeline blue-teal con formas geometricas |
| Creative | Diseno, UX, Contenido | Formas organicas magenta-coral fluidas |
| Technology | Desarrollo, Engineering | Circuit board midnight-cyan |
| Strategy | Estrategia, Media, Analytics | Ondas indigo-purple de datos |
| Support | HR, Finance, Legal | Cristales geometricos teal-green |
| Default | Todos los demas | Mesh network navy-purple universal |

El sistema selecciona automaticamente el banner correcto basandose en los roles y departamento del colaborador. No requiere configuracion manual.

## Como funciona la asignacion de banners

1. El sistema lee los roles activos del colaborador (del endpoint Person 360)
2. Si el rol principal coincide con una categoria → usa ese banner
3. Si no, revisa el nombre del departamento → busca match por categoria
4. Si nada coincide → usa el banner default (que es igualmente atractivo)

## Aspectos tecnicos

- Motor de imagenes: **Imagen 4** de Google (modelo `imagen-4.0-generate-001`)
- Motor de animaciones: **Gemini** de Google (ultimo modelo disponible)
- Los assets son archivos estaticos — no se generan en tiempo real para usuarios
- Se generan durante el desarrollo y se guardan en el repositorio
- Servidos por la CDN de Vercel — latencia minima

## Acceso a Fal.ai (imagen, video y audio por IA) — desde 2026-07-06

Ademas de Imagen/OpenAI (imagen) y Higgsfield (vectores), Greenhouse tiene acceso a **Fal.ai**, un agregador que permite generar **imagen, video y audio** con muchos modelos a traves de una sola API (por ejemplo Seedance, Kling y Veo para video; flux para imagen).

- **Para que sirve:** producir contenido media de mayor variedad (sobre todo **video**) que los motores de imagen actuales no cubren, para piezas de marketing, campanas y exploracion visual.
- **Como se usa:** de forma programatica, con un cliente interno unico. El contenido se genera fuera del portal y se **sube** por el flujo normal de assets — no se genera en tiempo real para los usuarios del producto.
- **Estado actual (2026-07-06):** el acceso esta **listo y la llave quedo guardada** de forma segura (en el gestor de secretos). Se verifico que el sistema la lee bien, pero la cuenta de Fal.ai todavia aparece **sin saldo disponible** (la recarga aun no se refleja), asi que las generaciones reales estan **bloqueadas hasta que la cuenta tenga saldo activo**. La llave es temporal (se rotara mas adelante).
- **Costo:** se paga por segundo de video segun el modelo (ejemplo: un clip corto economico ronda los US$0.36; uno de mayor calidad, varios dolares). Siempre revisar el precio del modelo en `fal.ai/models` antes de generar.

> Detalle tecnico: ver [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) para la API del generador, system prompts, contrato SVG, endpoints internos y la seccion "Fal.ai — agregador de generacion media".
