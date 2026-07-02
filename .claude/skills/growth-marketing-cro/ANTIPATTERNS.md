# Antipatrones de Growth + CRO — qué NO hacer

> Contrasta toda táctica agresiva contra esta lista **antes** de recomendarla.
> Growth de Efeonce = honesto, medible, sostenible. Un "hack" que quema confianza,
> viola privacidad o miente estadísticamente no es growth: es deuda.

## Estrategia y modelado

- **Vanity metrics.** Optimizar registros, pageviews, "usuarios totales", MQLs
  inflados o followers en vez de la North Star y sus inputs accionables. Regla:
  si el número puede subir sin que suba el valor entregado al cliente, es vanidad.
- **Escalar adquisición sobre un balde con fuga.** Invertir en CAC cuando la
  retención está rota. Cuanto más echas, más desperdicias. Arregla retención primero.
- **Growth hacks sin loop.** Tácticas one-off que dan un pico y no re-alimentan la
  entrada. Sin loop propio, dependes de comprar cada usuario para siempre.
- **Copiar el canal del competidor** sin validar channel-market fit. Lo que escala
  a un player con marca/PLG maduro puede ser ruinoso para uno pre-PMF.
- **Optimizar máximos locales.** Pulir una etapa suelta ignorando el sistema. Un
  +30% en signup que empeora la calidad del lead puede bajar revenue.

## CRO / conversión / sitio web

- **"Color de botón" antes que mensaje.** Micro-ajustes cosméticos cuando el
  problema es propuesta de valor, relevancia o confianza (LIFT/MECLABS). El 80% del
  lift está en el mensaje, no en el matiz del CTA.
- **Testear sin tráfico.** Correr A/B en páginas sin volumen para significancia en
  ≤4 semanas. Resultado: "ganadores" que son ruido. Usa research cualitativo,
  heurísticas o CUPED.
- **Scarcity y urgencia falsas.** "Solo 2 disponibles" / contadores que se reinician
  / "12 personas viendo" inventado. Sube conversión a corto plazo y quema confianza
  y marca; sancionable (FTC, y en Chile Ley del Consumidor). La escasez real convierte;
  la falsa es un dark pattern.
- **Dark patterns de formulario/opt-in.** Casillas pre-marcadas, opt-out escondido,
  "confirmshaming", roach motel (fácil entrar, imposible salir). Ilegal en varios
  marcos y letal para deliverability.
- **Pedir todo en el primer formulario.** Cada campo extra cuesta conversión
  (4→3 campos ≈ +50%). No pidas teléfono/empresa si no lo vas a usar hoy.
- **Ignorar velocidad y mobile.** Tratar Core Web Vitals como "tema de SEO" y no de
  conversión. +100ms ≈ −1% conversión; el 62% del tráfico e-commerce es mobile.
- **Social proof falso o genérico.** Testimonios inventados (ilegal), o pared de
  logos sin nombres/contexto. Prueba verificable, con nombre y específica > volumen
  y perfección. Rating "perfecto 5.0" convierte peor que 4.2–4.5 (parece fake).

## Experimentación / estadística

- **Peeking / parar el test cuando "ya va ganando".** Mirar resultados y detener al
  cruzar 95% infla el falso-positivo brutalmente. Usa sample size fijo **o** un
  método secuencial diseñado para monitoreo (confidence sequences), nunca fixed-test
  detenido a ojo.
- **Ausencia de MDE y sample size.** Correr un test sin definir el efecto mínimo
  detectable ni cuánta muestra necesitas = no sabes si un "sin diferencia" es real o
  falta de poder.
- **HARKing / p-hacking.** Inventar la hipótesis después de ver los datos; cortar por
  segmentos hasta hallar un p<0.05. Multiplica falsos positivos. Hipótesis y métrica
  primaria se declaran antes.
- **Sin guardrail metrics.** Celebrar un lift en la métrica primaria mientras se
  degrada silenciosamente una métrica de salud (churn, latencia, márgenes, calidad
  del lead). Todo experimento lleva guardrails.
- **Confundir significancia con impacto de negocio.** p<0.05 en una métrica que no
  mueve la NSM no es una victoria. Y significancia ≠ tamaño de efecto.
- **Métricas dentro del tool ≠ métricas del negocio.** Dos fuentes de verdad. Prefiere
  warehouse-native o reconcilia explícitamente.

## Adquisición / lifecycle / medición

- **Atribución last-click ingenua** como única verdad. MTA cubre 30–60% (post-cookie).
  Úsala como capa táctica; para asignación cross-canal usa MMM + incrementality.
- **Quemar el dominio de email.** Comprar listas, enviar sin SPF/DKIM/DMARC, sin
  one-click unsubscribe, sin controlar spam rate. En 2026 Gmail/Yahoo bloquean sobre
  0.30% de spam rate (apunta a <0.10%). Un dominio quemado tarda meses en recuperarse.
- **Onboarding genérico que no lleva al aha moment.** Tour de features en vez de
  llevar al usuario a su primer valor real. 40–60% de free users nunca se activan.
- **Trackear todo sin taxonomía.** Eventos ad-hoc, nombres inconsistentes, sin
  tracking plan. El dato nace sucio y no se puede confiar en el funnel.
- **Tratar la privacidad como fricción a evadir.** Consent mode mal implementado,
  captura de PII sin base legal. Además de ilegal (GDPR, Ley 21.719 en Chile), rompe
  la medición cuando la plataforma penaliza.

## Meta-antipatrón

- **Prescribir sin diagnosticar.** La lista de "mejores prácticas" genérica sin
  intake es el antipatrón raíz del que salen todos los demás. Diagnostica el caso,
  halla la fuga, modela el loop — después optimiza.
