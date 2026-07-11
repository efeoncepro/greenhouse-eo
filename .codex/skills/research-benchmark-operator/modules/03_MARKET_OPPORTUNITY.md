# 03 · Market & Opportunity Research

Dimensionar un mercado, leer tendencias y evaluar una oportunidad. Para Efeonce: ¿entramos a un servicio/mercado nuevo? ¿hay demanda para esto? ¿qué tan grande es el premio?

## Market sizing: TAM / SAM / SOM

- **TAM (Total Addressable Market):** el mercado total si tuvieras el 100%. El techo teórico.
- **SAM (Serviceable Addressable Market):** la parte del TAM que tu oferta y geografía realmente pueden servir.
- **SOM (Serviceable Obtainable Market):** lo que realistamente puedes capturar en un horizonte dado (share alcanzable).

**Dos métodos, úsalos ambos y cruza (triangulación):**

- **Top-down:** parte de una cifra grande publicada (mercado total) y la acota por segmentos (geografía, tamaño de empresa, vertical). Rápido, pero hereda el sesgo de la fuente.
- **Bottom-up:** parte de unidades reales (# de clientes potenciales × precio × frecuencia). Más creíble y defendible; obliga a supuestos explícitos.

```
BOTTOM-UP (ejemplo AEO en México):
  empresas objetivo (ICP) en MX .......... N
  × % con dolor/necesidad de AEO ......... %
  × ticket anual promedio ................ $
  = SAM
  × share alcanzable a 2 años ............ %
  = SOM
```

Regla: **si top-down y bottom-up difieren 10×, tienes un supuesto malo** — encuéntralo antes de presentar. Reporta el rango y los supuestos, no un número falso-preciso.

## Tendencias: separa señal de ruido

- **Distingue moda de tendencia estructural.** Una moda pasa; una tendencia estructural cambia el comportamiento de forma sostenida (ej. el paso de search a motores de respuesta IA). El paso 2026 obligatorio (WebSearch con `as-of`) es clave aquí — las tendencias son lo que más envejece.
- **Cuantifica la tendencia** cuando puedas (tasa de adopción, crecimiento) en vez de afirmarla ("la IA está en todo" no es research).
- **Fuentes de tendencia:** reportes de industria (con fecha), datos de búsqueda/demanda (Semrush, Google Trends), señales de comunidades (Reddit/foros = tendencias antes que los analistas), inversión/funding, señales de contratación (job posts revelan estrategia).

## PESTEL (marco de contexto macro)

Para evaluar un mercado/geografía nuevo, barre los 6 factores:

- **Político** · **Económico** · **Social** · **Tecnológico** · **Ecológico/ambiental** · **Legal** (privacidad, publicidad → `legal-privacy-ip-operator`).

No todos pesan igual — prioriza los 2–3 que realmente mueven la decisión. PESTEL es un checklist para no olvidar un factor que te vuele la oportunidad (ej. una regulación que prohíbe tu modelo).

## Technology scouting

Para research de tecnología/capacidad emergente: qué existe, madurez (hype vs producción), players, y si aplica a Efeonce. Cruza con `arch-architect` si es tecnología a adoptar en el producto.

## Evaluar la oportunidad (no solo dimensionarla)

Un mercado grande no es una buena oportunidad si no puedes ganar. Evalúa:

- **Tamaño + crecimiento** (SOM, tendencia).
- **Fit con Efeonce** (¿lo sabemos hacer? ¿calza con la oferta/ICP? → `efeonce-agency`).
- **Competencia** (¿saturado? ¿hay ángulo diferencial? → `04`).
- **Barreras y economía** (CAC, ciclo, margen → `commercial-expert`).
- **Timing** (¿por qué ahora?).

## Señales de demanda (antes de invertir)

Barato validar demanda antes de construir: volumen de búsqueda del problema (`seo-aeo`/Semrush), consultas entrantes (HubSpot), menciones en comunidades, competidores creciendo en el espacio, señales en el AI Visibility Index. Demanda observable > demanda supuesta.

## Checklist de salida

- [ ] TAM/SAM/SOM con **top-down + bottom-up** cruzados; supuestos explícitos.
- [ ] Tendencias **cuantificadas** y **fechadas** (paso 2026 corrido).
- [ ] PESTEL barrido; 2–3 factores decisivos priorizados.
- [ ] Oportunidad evaluada (no solo dimensionada): tamaño × fit × competencia × economía × timing.
- [ ] Señales de demanda observables, no supuestas.

## Cross-links

- Fuentes → `02`; competencia → `04`; síntesis → `05`; si es comparación → `06`.
- Fit/ICP/negocio → `efeonce-agency`; economía/GTM → `commercial-expert`; demanda de búsqueda → `seo-aeo`; legal del mercado → `legal-privacy-ip-operator`.
