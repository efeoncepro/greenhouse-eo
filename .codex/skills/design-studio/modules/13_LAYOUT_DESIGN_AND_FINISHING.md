# 13 · Layout Design & Finishing — control compositivo con acabado generativo

> **Cárgalo cuando** una campaña estática necesita piezas premium en varios formatos, control exacto de
> composición, copy y marca, y aun así conviene usar Seedream 5 Pro o GPT Image 2 para elevar el plate.
> Canon operativo: `docs/operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md`.

## Tesis

El layout no garantiza acabado premium por sí solo. El método completo es:

```text
anchor aprobado → layout contract → clean ratio plate → finish acotado → composición determinística → mastering → QA
```

La autoridad cambia por etapa:

- el **director de arte** decide tesis, jerarquía, grilla y hook;
- el **modelo generativo** eleva únicamente el raster limpio;
- el **compositor determinístico** gobierna copy, tipo, logo, CTA, legal y export;
- una **persona** aprueba el craft y el release.

Nunca devolver el anuncio final con texto y marca a un modelo para “pulirlo”: vuelve probabilístico lo que ya
era exacto.

## Contrato de capas

| Capa               | Contenido                                | Autoridad                                          |
| ------------------ | ---------------------------------------- | -------------------------------------------------- |
| `clean_plate`      | sujeto, ambiente, material, luz          | modelo + anchor gate                               |
| `optical_underlay` | scrim, halo o gradiente para integración | compositor                                         |
| `campaign_hook`    | rail, trazo, módulo o gesto repetible    | compositor, salvo que sea parte orgánica del mundo |
| `type`             | headline/support/CTA                     | compositor + SoT tipográfico                       |
| `brand`            | logo, firma, URL, legal                  | activos oficiales + compositor                     |
| `channel`          | crop, safe zone, peso, color, bleed/trim | compositor/prepress                                |

Una “capa” de Seedream es una región semántica de un raster plano; no sustituye este contrato ni entrega
PSD/SVG editable.

## Layout contract antes de generar

Completar `templates/layout-design-contract.yaml` y fijar:

- `anchor_id` y locks visuales;
- formatos y grilla nativa por ratio;
- ubicación, escala y dirección del sujeto;
- `copy_field`, márgenes y peor crop;
- hook gráfico repetible;
- orden de capas y compositor autoritativo;
- delta de finish, executor y stop condition;
- gates de craft, contraste, thumbnail y destino.

No usar un master universal para recortar. Cada ratio tiene composición nativa:

- **16:9:** dirección lateral, copy field amplio y tensión horizontal;
- **4:5:** jerarquía editorial compacta y balance vertical;
- **9:16:** lectura secuencial, safe zones de plataforma y sujeto fuera de overlays.

## Router de finish después del layout

Elegir según el **delta restante**, no por preferencia de proveedor:

| Delta restante                                                          | Mano preferida                           |
| ----------------------------------------------------------------------- | ---------------------------------------- |
| material, microtextura, color, luz, atmósfera, integración orgánica     | Seedream 5 Pro Edit                      |
| geometría, escala, crop, espacio negativo, identidad o región protegida | GPT Image 2 Edit; máscara si corresponde |
| copy, logo, rail, grilla, CTA, legal, localización, resize y sharpening | composición determinística               |

Pro recibe sólo el `clean_plate`, sin copy/logo final. El prompt declara una transformación principal y locks
explícitos. GPT recibe la misma disciplina. Si un pase no mejora el scorecard o el delta siguiente es exacto,
detener la generación.

## Protocolo de finishing

1. Aprobar el layout en miniatura y tamaño real antes del finish.
2. Exportar un clean plate por ratio; no enviar overlays finales al modelo.
3. Aplicar un solo delta generativo: por ejemplo, cohesión material y profundidad atmosférica.
4. Comparar contra el plate anterior: identidad, bordes, safe zone, croma y artefactos.
5. Aceptar el finish sólo si mejora el craft sin degradar locks.
6. Componer determinísticamente underlay, hook, tipo y marca.
7. Masterizar por destino: color, contraste, tamaño, compresión, naming y package.
8. Ejecutar QA técnico y revisión humana del set completo.

## Gates

- **Anchor:** tesis, sujeto, anatomía/producto, paleta y hook aprobados.
- **Layout:** jerarquía, grilla, copy field, márgenes y ratio nativo.
- **Finish:** el delta pedido domina y los locks sobreviven.
- **Craft:** integración visual, bordes, microdetalle, luz, contraste y ausencia de look “pegado encima”.
- **Format:** thumbnail, crop real, overlays de plataforma y lectura a distancia si aplica.
- **Technical:** dimensiones, perfil, peso, hash, naming y lineage.
- **Release:** copy, marca, claims, derechos y aprobación humana.

## Benchmark observado, no SLA

Piloto `high-frequency-layout-design`, 2026-07-18:

- anchor Seedream/GPT existente → tres plates de ratio → tres finishes Seedream 5 Pro → composición Sharp/fontkit;
- formatos `16:9`, `4:5` y `9:16`; 3/3 pasaron QA; scorecard `47/50`;
- costo generativo incremental estimado: `USD 0,27`;
- texto/logo nunca entraron al modelo;
- contraste P95 blanco `17,15–18,30:1`, mint `12,84–13,69:1`;
- MAE de finish `0,0209–0,0308`; la caída de croma en 4:5 se aceptó por cohesión tonal, no por la métrica sola.

Evidencia: `ai-generations/2026-07-18_high-frequency-campaign-e2e/brief/layout-design-pilot.md` y
`qa/layout-design-pilot-scorecard.md`.

## Anti-patrones

- diseñar el layout dentro de un prompt y esperar precisión de producción;
- pedir “más premium” sin delta verificable;
- hornear copy/logo/legal en el raster generativo;
- devolver el anuncio compuesto al modelo;
- repetir el mismo layout por crop mecánico;
- usar Seedream Pro por ritual cuando el problema es geometría;
- usar GPT por ritual cuando el problema es materialidad;
- encadenar finishes sin volver al plate aprobado;
- aceptar métricas mejores con una dirección visual peor;
- llamar “capas” a objetos semánticos sin separar archivos y autoridad real.

## Cierre mínimo

- [ ] Existe layout contract por set y grilla por ratio.
- [ ] El finish recibe clean plates sin copy ni marca final.
- [ ] Cada pase registra un delta, locks, modelo/endpoint, parent, costo y aceptación.
- [ ] El compositor autoritativo y los activos oficiales están declarados.
- [ ] Copy, logo, CTA, legal y locale son determinísticos.
- [ ] El set pasa thumbnail, tamaño real, contraste, crop/destino y QA técnico.
- [ ] La aprobación humana distingue `creative release` de activación en medios.
