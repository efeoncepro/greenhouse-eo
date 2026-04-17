# Nexa Insights — Bloque en Agency, Home y 360

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-17 por Claude
> **Ultima actualizacion:** 2026-04-17 por Claude
> **Documentacion tecnica:** [GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md](../../architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md), [Greenhouse_ICO_Engine_v1.md](../../architecture/Greenhouse_ICO_Engine_v1.md)

# Nexa Insights — Bloque en Agency, Home y 360

El bloque Nexa Insights es la superficie donde Nexa entrega sus lecturas analiticas dentro del portal. Aparece en la vista Agency (tab ICO), en Home, y en los 360 de Space y Persona.

Mientras el [digest semanal](nexa-insights-digest-semanal.md) empuja los hallazgos al email del liderazgo, el bloque vive adentro del portal para consulta directa.

---

## Que muestra

Cada bloque combina:

- Dos KPIs arriba: cantidad de senales analizadas este periodo y cuantas traen accion sugerida
- Una lista de senales recientes con explicacion, causa raiz y accion propuesta
- Menciones clickeables a Spaces, miembros y proyectos — se integran al texto como chips y navegan al 360 correspondiente

---

## Dos modos de visualizacion

El bloque tiene un toggle arriba a la derecha del contenido:

- **Recientes** (default) — las senales del periodo actual (mes operativo en curso). Es la vista canonica desde que existe el bloque
- **Historial** — las ultimas 20 senales succeeded del sistema ordenadas cronologicamente y agrupadas por dia. Responde la pregunta "cuantas senales tuvo Nexa esta semana comparado con la pasada" sin salir del bloque

Ambos modos muestran el mismo detalle por senal: severidad, metrica, explicacion, causa raiz (colapsable), accion sugerida.

---

## Por que existe el modo Historial

La vista Recientes esta limitada al mes en curso. Si el operador ve 2 senales este lunes, necesitaba salir de la UI para confirmar si 2 es baseline normal o un hueco en el pipeline.

El modo Historial convierte esa consulta en un click: la linea de tiempo por dia deja visible la cadencia real ("ayer 9 senales", "hoy 2", "hace tres dias 5") y el operador decide si investigar o seguir.

---

## Cada tarjeta de senal

El contenido por senal es el mismo en ambos modos:

- Chip de severidad + nombre de la metrica (ej. FTR%, OTD%, Net Margin)
- Explicacion en una o dos lineas — que paso y por que importa operativamente
- Link "Ver causa raiz" — al abrirlo, muestra la narrativa causal generada por el modelo explicando que evidencia sostiene la observacion. La preferencia de expansion se persiste localmente por operador
- Accion sugerida — destacada con una barra lateral naranja, describe el siguiente paso concreto

Las menciones dentro del texto son clickeables:

- `@[Nombre](space:...)` abre el Space 360
- `@[Nombre](member:...)` abre el perfil del miembro
- `@[Nombre](project:...)` queda como texto hasta que exista una ruta de proyecto unificada

---

## Donde se ve

| Superficie                   | Modo Historial disponible |
|------------------------------|---------------------------|
| Agency > tab ICO             | Si                        |
| Home                         | Opt-in (proximamente)     |
| Space 360                    | Opt-in (proximamente)     |
| Persona 360                  | Opt-in (proximamente)     |
| Finance Dashboard            | Opt-in (proximamente)     |

El default es Recientes en todas las superficies — sin regresion para operadores que ya conocen el bloque.

---

## Limites importantes

- El bloque es advisory-only e internal-only. No ejecuta acciones por si mismo.
- La lista no re-calcula metricas: consume enrichments ya materializados por el lane advisory de Nexa sobre el serving del ICO Engine.
- El contenido generado por el modelo viene con un disclaimer "Generado por Nexa con IA. Verifica la informacion antes de actuar."
- Los enrichments antiguos pueden no tener causa raiz poblada: cuando falta, el bloque simplemente no muestra la seccion (sin error).

---

## Relacionado

- **Digest semanal por email:** [nexa-insights-digest-semanal.md](nexa-insights-digest-semanal.md)
- **Motor ICO:** [motor-ico-metricas-operativas.md](motor-ico-metricas-operativas.md)
- **Contrato tecnico completo:** [GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md](../../architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md)
