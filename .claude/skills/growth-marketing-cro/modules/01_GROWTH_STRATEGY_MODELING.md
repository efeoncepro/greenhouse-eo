# 01 · Growth Strategy & Modeling

> Modelar el crecimiento como un **sistema** antes de optimizar cualquier etapa.
> Aquí decides el loop, la North Star y las palancas — el resto de módulos ejecuta.

## 1. Loops > funnels (pero el funnel diagnostica)

El **funnel AARRR** (Acquisition → Activation → Retention → Referral → Revenue) es
tu instrumento de *diagnóstico*: te dice **dónde está la fuga**. El **growth loop**
es el *motor*: un ciclo cuyo output re-alimenta el input. Empresas que sostienen
crecimiento tienen loops; las que solo tienen funnel compran cada usuario para siempre.

**Cuatro loops canónicos:**

| Loop | Motor | Ejemplo | Métrica clave |
|---|---|---|---|
| **Viral** | usuarios invitan usuarios | Slack, Dropbox, Calendly | k-factor, viral cycle time |
| **Content** | usuarios/producto generan contenido indexable/compartible | UGC, marketplaces, SEO programático | contenido nuevo/período × tráfico/pieza |
| **Paid** | LTV re-invertida en CAC | e-commerce, SaaS con payback corto | LTV:CAC, payback |
| **Sales/expansion** | clientes satisfechos → referidos/expansión | B2B enterprise, PLG+sales | NRR, referidos/cuenta |

**Regla:** identifica tu loop dominante, mide su *velocidad* (cuánto tarda una vuelta)
y su *amplificación* (cuántos nuevos por vuelta). A menudo la velocidad del ciclo
importa más que la magnitud — un loop rápido con K moderado gana a uno lento con K alto.

## 2. North Star Metric (NSM) + input metrics

La NSM es la **única** métrica que mejor captura el valor entregado al cliente. No
es revenue (eso es un *output* lagging); es el proxy de valor que, si sube, el
revenue sigue. Ej.: "mensajes enviados" (Slack), "noches reservadas" (Airbnb),
"reportes entregados" (una plataforma de reporting).

**Criterios de una buena NSM (Reforge):** (1) expresa valor al cliente, (2) predice
revenue de largo plazo, (3) es medible y accionable, (4) refleja el tipo de negocio
(acquisition-driven vs retention-driven vs monetization-driven).

**Lo accionable son los inputs.** La NSM se descompone en *input metrics* que los
equipos sí controlan:

```
NSM  =  f( input₁ , input₂ , input₃ , … )

Ej.  reportes entregados/semana  =  usuarios activos
                                    × % que crea un reporte
                                    × reportes por usuario activo
```

Optimizas los **inputs** (retención de activos, activación a "crea reporte",
frecuencia), nunca el output directo. Esto evita el vanity-metric trap y da a cada
equipo una palanca clara.

## 3. Growth model (la matemática del crecimiento)

Un **growth model** conecta inputs → NSM → revenue en una hoja simulable. Sirve para
responder "¿qué pasa con el ARR si subo la activación 5pp vs si bajo el churn 1pp?".

Estructura mínima (por período):

```
usuarios_nuevos      = Σ canales (paid + organic + viral + content)
activados            = usuarios_nuevos × activation_rate
retenidos            = base × retention_rate  (+ resurrección)
base_activa(t)       = retenidos(t-1) + activados(t)
referidos            = base_activa × k_factor
revenue              = base_activa × ARPU × (1 + expansión − contracción)
```

Con esto priorizas por **sensibilidad**: mueve cada palanca ±X% y mira el efecto en
NSM/ARR a 12–24 meses. Casi siempre, en negocios con base grande, **retención y
activación** tienen más apalancamiento que adquisición pura (por composición).
Plantilla: `templates/growth-model-canvas.md`.

## 4. PMF antes de pisar el acelerador

**Señal dura de PMF:** la curva de retención se **aplana** en una meseta > 0 (una
cohorte estabiliza su % activo), no cae a cero. Si no se aplana, growth amplifica el
churn — arregla producto/retención antes de escalar (→ `06`). Complementos: Sean Ellis
survey ("¿qué tan decepcionado estarías sin el producto?" → >40% "muy decepcionado"),
concentración de uso en un segmento.

## 5. Priorización de iniciativas

- **Volumen de experimentos (semana a semana):** ICE = (Impact × Confidence × Ease)/3.
- **Roadmap plurianual / cross-team:** RICE = (Reach × Impact × Confidence)/Effort.
- **CRO específicamente:** PXL (ver `03`), que reemplaza el "Impact" subjetivo por
  criterios de evidencia.

Ordena por la fuga de mayor `impacto × tráfico`. No por la etapa más vistosa.

## 6. Etapas de negocio → foco de growth

| Etapa | Foco | Trampa típica |
|---|---|---|
| Pre-PMF | retención + activación (¿la gente vuelve?) | escalar ads sin PMF |
| PMF temprano | encontrar 1–2 loops que escalen; channel-market fit | dispersión en 8 canales a la vez |
| Escala | diversificar canales (6–9), defender CAC, expansión/NRR | monocanal frágil (dependencia de un algoritmo) |
| Madurez | eficiencia (payback), nuevos segmentos, moats/loops compuestos | optimizar máximos locales |

## Checklist de salida

- [ ] Loop dominante identificado (tipo + velocidad + amplificación).
- [ ] NSM definida con criterios explícitos + descompuesta en inputs accionables.
- [ ] Growth model con la sensibilidad de cada palanca a 12–24 meses.
- [ ] PMF verificado (curva de retención se aplana) antes de recomendar escalar.
- [ ] 3–5 iniciativas priorizadas por ICE/RICE atacando la fuga mayor.

## Cross-links

- Adquisición y canales → `02_ACQUISITION.md`
- Convertir el tráfico → `03_CRO.md`
- Activación → `05`; Retención → `06`; Medición → `07`
- Errores → `ANTIPATTERNS.md`; artefacto → `templates/growth-model-canvas.md`,
  `templates/north-star-metric-worksheet.md`
