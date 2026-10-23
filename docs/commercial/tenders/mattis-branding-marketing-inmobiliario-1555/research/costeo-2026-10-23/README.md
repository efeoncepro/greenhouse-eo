# Mattis · Simulación local de costo y precio

23/10/2026 · Confidencial Efeonce. No remitir al comprador.

Oferta `creative-managed-service`, unidad `managed_service`, forma `on_demand`: programa delimitado de doce meses, no servicio indefinido. Mercado CO, talento CO hipotético, salida COP, impuesto no resuelto. Sin precio pactado, descuentos ni excepción de política. Costos objetivo de perfiles; no nómina ni precio de otro RFP.

## Demanda y esfuerzo

| Función / perfil | Mes 1, horas productivas estimadas | Mes 2 | Cada ciclo 3–12 |
| --- | ---: | ---: | ---: |
| Estrategia, ECG-035 | 48 | 8 | 4 |
| Dirección de arte, ECG-005 | 32 | 24 | 8 |
| Diseño senior, ECG-002 | 56 | 96 | 37 |
| Redacción, ECG-011 | 32 | 40 | 18 |
| Edición/motion, ECG-018 | — | 16 | 16 |
| Gestión/calidad, ECG-016 | 24 | 24 | 14 |
| **Total** | **192** | **208** | **97** |

Hipótesis del agente a validar con la práctica; no mediciones históricas. Mes 1 cubre investigación documental, brief/mensajes/rutas y coordinación. Mes 2 cubre identidad/manual y ocho aplicaciones, incluyendo dossier/presentación; edición contempla preparación de plantillas sencillas. Los bloques incluyen dos rondas y QA; no se suman otra vez como extras.

Los ciclos se dimensionan por volumen en `cycle.workload.json`: diseño 4×3 h + 2×6 h + 12×0,75 h + 4 h fijas = 37 h; redacción 4×1 h + 2×2 h + 2×2 h + 6 h fijas = 18 h; edición 2×8 h = 16 h. Estrategia, arte y gestión son bloques fijos. En mes 12, orden/transferencia ocupan parte de diseño/gestión; no añaden nuevos activos.

`compose workload` usa capacidad supuesta de 125 h productivas y 180 h contratadas por FTE/mes, redondeando dedicación hacia arriba a 0,01. No es capacidad real acreditada. Los tres inputs y resultados permiten revisar o reemplazar estas estimaciones; toda modificación monetaria se vuelve a calcular.

Herramientas: Notion/M365 cinco asientos planificados M1, seis M2–M12, costo completo conservador sin denominador de cartera supuesto; Adobe un paquete de tres a precio de lista decidido en catálogo, completo durante doce periodos; Frame.io desde M2, referencia histórica a validar. Dos usuarios Adobe en M1 y tres desde M2, paquete completo modelado. No son accesos comprobados ni compras. Asignación `estimated`, usuarios `planned-*`; tareas extras vacías porque se aplican recetas de perfiles. Sin presupuesto generativo, no se eliminan herramientas de la receta para abaratar.

## Fuentes y resultados

`--current`: catálogo `operating-review-2026-10-22-v13`, recursos `operating-review-2026-10-22-v12`, créditos `operator-screenshots-2026-10-09-v1`. El artefacto congela fuentes/digests. La conversión COP y CLP corresponde a política interna, no FX de mercado. Los períodos del motor se anclan a quoteDate por convención de cálculo: **no fijan un inicio contractual en octubre**.

`quote.artifact.json` es la corrida vigente; `quote.summary.json`, su resumen; `quote.assessment.json`, las brechas de revisión. La corrida inicial se conserva aparte; no es otra opción comercial.

- Neto COP 190.150.000: M1 20.600.000; M2 22.550.000; diez ciclos de 14.700.000.
- Costo COP 99.354.271, **ya incluida** reserva COP 6.360.302.
- Margen modelado 47,7495 %. Sin líneas bajo piso; aprobación pendiente.
- Sin impuesto ni total a pagar calculados. Sin terceros incluidos. No equivale a cero costo si luego se solicitan rodaje, pauta o fabricación.
- Dedicaciones/usuarios/asignación/herramientas y estratega estimados; ver evaluación. No resueltos efectos tributarios, bancarios o financieros de la contratación internacional y pago a 30 días.

## Reproducción

Ejecutar desde la raíz del repositorio. Para una nueva corrida usar un destino de artefacto que no exista; el comando no sobreescribe artefactos congelados.

```bash
pnpm --silent pricing:v3 current show
pnpm --silent pricing:v3 resources inspect --current --date 2026-10-23
pnpm --silent pricing:v3 compose workload --input docs/commercial/tenders/mattis-branding-marketing-inmobiliario-1555/research/costeo-2026-10-23/cycle.workload.json
pnpm --silent pricing:v3 compose quote --current --input docs/commercial/tenders/mattis-branding-marketing-inmobiliario-1555/research/costeo-2026-10-23/demand.json --out /tmp/mattis-new-review.artifact.json
pnpm --silent pricing:v3 compose assess --input /tmp/mattis-new-review.artifact.json
```

La demanda se obtuvo con `resources inspect → compose workload → compose scaffold → allocations → compose quote → compose assess`. El master Markdown transcribe exactamente los netos calculados; no ajusta cifras a mano. No se generó cotización PDF: Julio pidió Markdown para diseñar con Claude Design. No hay `quoteId`, aprobación, CRM ni emisión canónica derivados de este cálculo.
