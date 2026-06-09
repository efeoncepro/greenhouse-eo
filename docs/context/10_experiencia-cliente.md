# 10 · Experiencia de Cliente (Greenhouse como sistema de experiencia)

> Greenhouse no es solo un portal de métricas: es **el sistema de experiencia de cliente de Efeonce**. Este archivo define qué debe *vivir* el cliente en cada fase y qué módulo del portal lo soporta. Es la guía para que las features sirvan a la experiencia, no solo a la función.

## La metáfora (y por qué importa para producto)

Un *greenhouse* es un espacio de condiciones controladas para que algo crezca. Afuera el mercado es hostil: fragmentación, cajas negras, métricas que no conectan con revenue, relaciones que empiezan de cero cada trimestre. **Adentro, todo funciona distinto: ves todo, entiendes todo, y cada mes es mejor que el anterior.**

| Elemento del greenhouse | Equivalente Efeonce | Qué experimenta el cliente |
|---|---|---|
| Temperatura controlada | ICO (operaciones inteligentes) | Todo llega a tiempo, sin caos, con métricas |
| Luz diseñada | Estrategia (Efeonce Digital) | Dirección clara, decisiones por datos |
| Nutrientes | Datos y analytics | Insights que no tenía con otros proveedores |
| Ciclos de cultivo | Loop Marketing | Cada mes mejor que el anterior |
| Jardinero | Equipo de cuenta + owner | Alguien que monitorea y optimiza siempre |
| **Paredes de cristal** | **Transparencia (portal, Notion, Frame.io)** | **Ve todo, sin cajas negras** |

> Principio central: *la experiencia de marca no es lo que decimos que somos; es lo que el cliente vive cuando trabaja con nosotros.* Greenhouse convierte lo que hoy es accidental (buena operación) en sistema reproducible **sin depender del instinto del founder**. Cada feature que sistematiza un "momento de marca" reduce esa dependencia.

---

## El journey: 8 fases + 2 transversales, mapeadas a módulos

Esta es la tabla más importante para un agente de producto: conecta cada momento de la relación con el módulo de Greenhouse que lo soporta.

| # | Fase | Momento de marca | Soporte en Greenhouse | Módulo |
|---|---|---|---|---|
| 1 | **Onboarding** | **Ecosystem Tour**: el cliente ve su stack funcionando como sistema | Demo en vivo del portal con su login. Primer "wow" = ver sus métricas ICO por primera vez. | Dashboard ICO + Proyectos |
| 2 | **Primera entrega con impacto** | **Primer Feedback Review** con benchmarks y métricas ICO | Se ejecuta dentro del portal, no como presentación offline. Los datos ya están ahí. | Dashboard ICO + Pulse |
| 3 | **Ritmo operativo estable** | Updates de innovación + retrospectivas | El cliente ve la evolución de sus métricas mes a mes. Retrospectivas usan tendencia OTD y RpA. | Dashboard (tendencias) + Sprints (velocidad) |
| 4 | **Momento de tensión** | Protocolo de transparencia con datos | En fricción, el portal muestra los datos exactos (Stuck Assets, Cycle Time elevado, OTD% caído). La conversación parte de hechos. | ICO Engine (Stuck Assets, alertas) |
| 5 | **Expansión** | Cross-sell por evidencia, no por propuesta | Pulse detecta señales (alta cadencia sin distribución, contenido sin tracking). Inteligencia Financiera muestra ROI por línea. | Pulse + Inteligencia Financiera + Account 360 |
| 6 | **Renovación** | **"Tu año con Efeonce"**: narrativa de valor compartible | Reporte generado desde datos históricos del portal. No es manual — es un artefacto generado por el sistema. | Account 360 + ICO historial + Person 360 |
| 7 | **Referral y evangelismo** | Captura de testimonios en momentos de impacto | Human-driven. El portal no interviene directamente. | — |
| 8 | **Offboarding** | Cierre profesional con respeto | Se desactiva acceso. Se genera reporte final con datos históricos como entregable de cierre. | Admin (desactivar tenant) + Export |
| T1 | **Stakeholder invisible** | Artefactos ejecutivos compartibles | Generados desde el portal con datos reales, legibles sin contexto adicional (un CFO/CEO los evalúa directo). | Inteligencia Financiera |
| T2 | **Comunidad de clientes** | Newsletter + sesión anual | Human-driven hoy. Futuro (2027): benchmarks anónimos cross-tenant en el portal. | — (roadmap) |

---

## Artefactos de producto con peso de marca (priorízalos)

Cuatro momentos del journey **son features de Greenhouse**, no actividades offline. Construirlos bien es construir la experiencia de marca:

1. **Ecosystem Tour** — el primer login guiado. El "wow" es ver las propias métricas ICO por primera vez. Define la narrativa interna del cliente sobre toda la relación. Es la fase 1 y el KPI "login activo" depende de ella.
2. **Feedback Review en vivo** — revisar métricas juntos *dentro* del portal, no en un PPT. Requiere que los datos estén presentables y confiables en tiempo real.
3. **"Tu año con Efeonce"** — reporte de renovación autogenerado desde Account 360 + ICO historial + Person 360. Artefacto de máximo switching cost: hace visible el valor acumulado.
4. **Protocolo de transparencia con datos** — en momentos de tensión, el portal muestra Stuck Assets / Cycle Time / OTD% caído. La feature convierte una conversación incómoda en una basada en hechos.

---

## Métricas de adopción del portal (las mueve el equipo de producto)

| Métrica | Qué mide | Meta |
|---|---|---|
| Ecosystem Tour completion rate | % de clientes nuevos que pasan por el Tour | 100% |
| **Login activo post-onboarding** | % que accede al portal ≥1x en las primeras 4 semanas | 100% |
| Feedback Review desde portal | % de reviews ejecutadas con datos del portal en vivo | 100% a partir de Q3 |
| Cross-sell detectado por Pulse | Oportunidades de expansión identificadas por Pulse | 1/cuenta/trimestre |
| NPS post-onboarding | Satisfacción en primeras 4 semanas | 8+/10 |

> Estas métricas conectan directo con los KPIs comerciales de `08`. "Login activo 0%→100%" es el objetivo de producto más concreto del 2026.

---

## Cómo se le vende la experiencia al prospect (referencia de tono)

El pitch de la experiencia parte del dolor reconocible —"no sabes el estado de tus proyectos hasta que preguntas; revisas por email; recibes reportes que no conectan con tu negocio; cada trimestre empieza de cero"— y contrasta:

| Dimensión | Agencia tradicional | Greenhouse |
|---|---|---|
| Visibilidad | Status semanal por email | Portal con login propio + Notion 24/7 |
| Métricas | Reporte mensual genérico | Indicadores ICO en tiempo real + benchmark |
| Revisión creativa | PDFs por email | Frame.io con feedback visual preciso |
| Problemas | Te enteras tarde, respuesta reactiva | Contacto proactivo con datos y solución |
| Evolución | Cada trimestre desde cero | Cada mes mejor; el sistema acumula inteligencia |
| Valor acumulado | Sin registro claro | "Tu año con Efeonce" compartible |
| Switching cost | Bajo, relacional | Alto: datos + proceso + IA + historial en el portal |

> ⚠️ Naming: los documentos de experiencia originales usan **"Greenhouse EO"** y **"Reviews per Asset"**. En producto y copy de cliente: **"Greenhouse"** y **"Rounds per Asset"** (ver `06`). El doc Prospect aún rotula "RpA (Reviews per Asset)" — es exactamente el string a corregir en UI.

---

*Fuente: Efeonce Greenhouse Sistema de Experiencia v1 + Addendum (integración con capacidades reales) + Bienvenida Cliente v2 + Prospect v2. Relación con métricas: `06` y `07`. Relación con expansión comercial: `08`.*
