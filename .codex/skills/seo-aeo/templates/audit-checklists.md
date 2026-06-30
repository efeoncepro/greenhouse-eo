# Plantilla — Checklists de auditoría (ejecutables)

> Checklists rápidas por capa. Detalle conceptual en los módulos. Marca cada
> ítem y anota hallazgo + RICE. No entregues la checklist cruda: entrégala
> priorizada (SKILL.md §4).

## A. Técnico (`01`)
- [ ] Indexación sana (GSC Pages: sin "crawled not indexed" masivo)
- [ ] Contenido crítico en HTML inicial (no depende de JS client-side)
- [ ] CWV de campo OK (CrUX): LCP ≤2.5s · INP ≤200ms · CLS ≤0.1
- [ ] robots.txt no bloquea recursos críticos; permite retrieval bots IA
- [ ] Canonicals correctos (sin cadenas, sin apuntar a noindex)
- [ ] Sitemap XML limpio (solo 200 indexables) y enviado a GSC
- [ ] HTTPS sin mixed content; mobile parity
- [ ] JSON-LD Organization + Article/Person válido (Rich Results Test)
- [ ] Internal linking a páginas dinero (≤3 clicks del home)
- [ ] (Sitio grande) logs sin desperdicio de rastreo

## B. Contenido (`02`)
- [ ] Contenido alineado a la intención que premia la SERP
- [ ] Topical authority: cluster completo, no páginas sueltas
- [ ] Answer capsules (40–60 palabras) en páginas clave
- [ ] Tablas + listas donde aplica (citabilidad)
- [ ] Sin canibalización (una intención = una URL)
- [ ] Frescura: páginas dinero actualizadas <2–3 meses
- [ ] Sin thin/scaled content (riesgo penalización)

## C. E-E-A-T / Entidad (`03`)
- [ ] Autoría real con credenciales + schema Person
- [ ] Página About/Contacto robusta
- [ ] Knowledge Panel presente (o plan para construirlo)
- [ ] sameAs consistente; Wikidata correcta (si aplica)
- [ ] "¿Qué dice la IA de la marca?" verificado y correcto
- [ ] (YMYL) revisión experta + transparencia + exactitud

## D. AEO / GEO (`04`)
- [ ] Cobertura del Query Fan-Out mapeada (matriz)
- [ ] Chunks autocontenidos (cada H2 se entiende solo)
- [ ] Tácticas GEO: stats + citas + fuentes + fluidez
- [ ] Presencia verificada por motor (ChatGPT/Perplexity/AIO/Gemini)
- [ ] Frescura visible (dateModified honesto)
- [ ] (Opcional, ROI marginal) llms.txt presente y sincronizado

## E. Off-page (`05`)
- [ ] Perfil de backlinks sano (Semrush; sin toxicidad)
- [ ] Digital PR / data propia en marcha
- [ ] Menciones de marca monitoreadas (pesan ~3× backlinks para IA)
- [ ] Brand SERP controlada
- [ ] Presencia genuina en Reddit/comunidades + YouTube

## F. Local / Internacional (`06`)
- [ ] GBP completo y verificado; reseñas gestionadas
- [ ] NAP consistente en todos los perfiles
- [ ] (Intl) estructura correcta (subdir/ccTLD) + hreflang bidireccional válido
- [ ] (Intl) localización real, no traducción automática

## G. Medición (`07`)
- [ ] GSC + GA4 + (BigQuery export) configurados
- [ ] Conversiones de negocio trackeadas (no solo tráfico)
- [ ] Baseline de Share of Voice IA (panel de prompts versionado)
- [ ] Segmento de tráfico IA referido en GA4
- [ ] Monitoreo de exactitud/alucinación de marca
