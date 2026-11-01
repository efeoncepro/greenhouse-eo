# Caso SKY · Insumos para el kickoff del 02-11-2026

Preparado el 31-10-2026 para la sesión que arma la presentación del kickoff (lunes 02-11, 10:00). Las cifras salen
de [HECHOS.md](HECHOS.md); lo que cambió después del 23-10 está verificado abajo con fecha.

## 1. Estado real al 31-10

**Correo de entrega**
- Salió el 23-10 a Pilar y Natalia, con copia a Valentina Hoyos y Daniela Ferreira, con el PDF adjunto.
- **Nicolá no iba en el correo.** Conviene que el kickoff le presente el diagnóstico desde el inicio.

**Respuesta de Pilar (27-10)**
- Escribió: «Clarísimo el documento». Quiere revisarlo en detalle en el kickoff.
- **Leyó la meta como «volver a los indicadores de Enero 2025».** Ver §2.

**Accesos (hilo del 27 y 28-10)**
- **WordPress:** administrador para Julio, Valentina y `mkt@efeoncepro.com`.
- **Search Console de `www.skyairline.com`:** acceso para Julio y `mkt@`. El de Valentina falló; Julio respondió que con
  `mkt@` basta.
- **Contactos de TI** para la copia en Azure y para evaluar `skyairline.com/blog`: Giovanna Rojas y Luis Muñoz. Pilar
  pidió estar en copia junto con Natalia.
- 🔴 **Las contraseñas viajaron en texto plano por correo.** Recomendar cambiarlas tras el primer ingreso. Nunca van
  al deck, a este repo ni a Notion.

**Comprobado en el sitio el 31-10**

| Punto de la auditoría | Estado |
| --- | --- |
| Los 9 artículos de Perú despublicados | Restaurados: 8 responden 200; `viajar-a-peru` redirige con 301 a `/viajar-a-peru-2/` |
| Configuración SEO (descripción, datos estructurados, autor) | Sigue ausente |
| Copia pública en Azure | Sigue respondiendo 200 |
| `robots.txt` | Sigue en 404 |
| Mapa del sitio | `/sitemap.xml` redirige a `/wp-sitemap.xml`, el mapa nativo de WordPress. No comprobado si existía el 23-10 ni si ya se envió a Search Console |

**Lote editorial**
- 40 piezas cargadas en el Content Hub de Notion, todas con «Trabajo SEO» y las 25 que trabajan sobre una URL con
  «Enlace». Ver [LOTE_INICIAL_PARA_APROBACION.md](LOTE_INICIAL_PARA_APROBACION.md).
- Natalia todavía no lo ha aprobado.
- Ayacucho y Cusco ya volvieron a estar en línea: les queda la reescritura, ya no la restauración.

## 2. 🔴 Corregir la expectativa antes que nada

Pilar entendió «volver a enero de 2025». No es la meta.

| Referencia | Sesiones orgánicas |
| --- | --- |
| Ene-2025 | 208.099 |
| Ene-2026 (el año anterior al próximo enero) | 67.940 |
| Meta del escenario base para ene-2027 | ≈ 65.000 |
| Sin intervenir, ene-2027 | ≈ 44.000 |

- La meta es el nivel del **mismo mes del año anterior**, no el de enero de 2025.
- 2025 tenía otra realidad: todavía no existían las respuestas de IA en español ni la migración.
- El correo enviado dice «hacia febrero». El informe y [HECHOS.md](HECHOS.md) dicen «≈ 65 mil en enero, escenario
  base». El deck debe usar la tabla de escenarios, mostrar los tres escenarios y el «sin intervenir», y llamarlos
  estimación, no compromiso.

**Propuesta de lámina temprana:** «Qué significa recuperar». Muestra la línea 2024 → 2026, la meta contra el mismo
mes del año anterior y por qué enero de 2025 no es comparable.

## 3. Arco sugerido para el deck

| Bloque | Mensaje | Fuente |
| --- | --- | --- |
| 1. Lo que nos pidieron | Pilar: por qué cayó, cuánto tarda y cuánto vale en Ads. Natalia: Perú, alrededores del aeropuerto, refresh | [README.md](README.md) §Qué pidió SKY |
| 2. Qué encontramos | Sin penalización. Tres etapas: respuestas de IA desde marzo de 2025, migración en septiembre de 2025 y caída de 2026. Configuración SEO perdida. Subdominio sin la autoridad de skyairline.com (262 vs 7.316 dominios de referencia). Copia en Azure | HECHOS §Tráfico, §Técnico |
| 3. Perú | Perdió posiciones, no contenido: de 387 a 98 búsquedas en top 3. 241 artículos | HECHOS §Semrush, §Perú |
| 4. Cuánto vale | US$ 6–16 mil/mes hoy vs 28–45 mil antes de migrar; siempre como rango | HECHOS §Valor publicitario |
| 5. Qué ya pasó desde el 23-10 | Accesos entregados, 9 artículos restaurados | §1 de este documento |
| 6. Plan de 90 días | Primero lo que mejora todo el blog: configuración SEO, Azure, mapa del sitio, redirecciones. Después consolidación, Perú y temporada | Informe PDF, páginas del plan |
| 7. Lote editorial | 15 nuevos + 25 optimizaciones, ya en el Content Hub, priorizados por intención de búsqueda | [LOTE_INICIAL_PARA_APROBACION.md](LOTE_INICIAL_PARA_APROBACION.md) |
| 8. Cómo vamos a medir | Contra el mismo mes del año anterior, nunca contra septiembre; tres escenarios | HECHOS §Escenarios + §2 |
| 9. Decisiones del kickoff | Ver §4 | — |

## 4. Decisiones y pedidos para cerrar en la reunión

1. Validar los escenarios nov–ene y la regla de medición. Queda registrado en Notion.
2. **Quién instala la configuración SEO:** Efeonce con el acceso de administrador ya entregado. Confirmar ventana y
   respaldo previo.
3. **TI (Giovanna Rojas, Luis Muñoz):** apagar o poner `noindex` a la copia en Azure, y abrir la conversación sobre
   `skyairline.com/blog`.
4. **Flujo de aprobación editorial:** quién aprueba títulos, cadencia semanal y plazo de respuesta, para que las
   piezas de temporada salgan antes del 10-11.
5. **Cancún:** confirmar si la ruta se opera antes de publicar las dos piezas que tiene el equipo.
6. **Regla de despublicación:** nada se retira sin redirección. Preguntar quién retiró los 9 artículos.
7. **Search Console antiguo:** exportar la historia de `www.skyairline.com` antes de que venza, entre noviembre y
   enero. El acceso ya existe.

## 5. Qué no decir

- «Penalización» (no la hay), ni prometer posiciones o fechas fijas.
- Comparar contra septiembre, o contra enero de 2025 como meta.
- Una cifra única de valor en Ads: es un rango, y la cobertura medida (13 %) va como nota de método.
- Datos del lote como si estuvieran redactados: son propuestas para aprobar.

## 6. Material reutilizable

- **PDF entregado:** `outputs/sky-blog-seo-audit-2026-10-23/informe/Efeonce - Auditoria SEO Blog SKY (23-10-2026).pdf`
  (23 páginas). SKY ya lo tiene; el deck puede citar sus páginas.
- **Plan y generador del informe:** `outputs/.../informe/sky-blog-audit.plan.json` y
  `scripts/seo/sky-blog-audit-report.ts`. Ahí están las series de tendencia, etapas y escenarios ya armadas.
- **Tablas:** `outputs/sky-blog-seo-audit-2026-10-23/` (clasificación de los 1.697 posts, canibalización, cobertura de
  rutas).
- **Logo:** el SVG oficial de SKY está en `ai-generations/2026-09-23_cmp003-sky-hangar/refs/sky-official.svg`. El logo
  de la organización en Greenhouse es una imagen generada por IA y no debe usarse.
- **Plantilla corporativa de SKY en PowerPoint:** la envió la agencia Match el 26-10 en el hilo «Minuta Proyecto
  Brandlift». Se usa solo si el kickoff debe ir en formato SKY. Si no, el deck va con la línea Efeonce y `deck-studio`.
