# Pibank 2027 · Capacidad y costeo interno del programa anual

**Uso interno Efeonce. Corte 06-10-2026.** Propuesta de capacidad calculada por trabajo/rol/mes para doce meses. **No representa contratación, roster, tarifa, costo monetario ni fee aprobados.** No enviar al cliente. Este dimensionamiento reemplaza el supuesto de seis meses en la propuesta vigente; no resulta de multiplicar 995,9 h por dos.

El [plan anual](PLAN-TECNICO-EDITORIAL-2027.md) gobierna lotes y condiciones; la [matriz](MATRIZ-ENTREGABLES-2027.csv) permite verificar aceptación. Las horas describen costo del servicio interno: la unidad comercial es un programa gestionado con entregables y responsabilidades, no personas vendidas por hora.

## 1. Capacidad base por rol y mes

Pod compartido, ocho funciones con aportes variables. El total 2.560 h equivale a 213,3 h/mes promedio combinado; con divisor ilustrativo 160 h/mes equivale a 1,33 FTE combinado. **No significa una persona dedicada ni disponibilidad confirmada**; Operations debe validar el aporte de cada especialidad y los otros compromisos antes de reservar fechas.

| Lane | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 | Base h | Reserva h |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Dirección SEO/AEO | 16 | 12 | 16 | 12 | 12 | 16 | 12 | 12 | 16 | 12 | 12 | 20 | 168 | 16 |
| SEO técnico | 40 | 36 | 32 | 28 | 28 | 28 | 24 | 24 | 24 | 28 | 24 | 28 | 344 | 48 |
| Editorial | 32 | 48 | 48 | 48 | 48 | 48 | 44 | 44 | 44 | 48 | 48 | 48 | 548 | 64 |
| Ingeniería CMS | 40 | 40 | 36 | 32 | 32 | 32 | 28 | 28 | 28 | 32 | 32 | 28 | 388 | 72 |
| Analítica y reconciliación | 32 | 28 | 28 | 28 | 24 | 28 | 24 | 24 | 28 | 24 | 24 | 32 | 324 | 48 |
| Panel AEO | 32 | 24 | 28 | 24 | 24 | 28 | 24 | 24 | 28 | 24 | 24 | 28 | 312 | 32 |
| QA | 16 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 236 | 32 |
| Coordinación | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 240 | 24 |
| **Total** | 228 | 228 | 228 | 212 | 208 | 220 | 196 | 196 | 208 | 208 | 204 | 224 | **2.560** | **336** |

**Base anual 2.560 h + reserva 336 h = 2.896 h.** Reserva calculada por lane y riesgos concretos (13,125% de base como consecuencia aritmética, no regla comercial). Distribución temporal se valida con Operations; no sumar 336 h en cada mes ni convertirlas en entregables adicionales.

## 2. Cómo se construyó la capacidad

| Lane | Trabajo detrás de las horas | Borde y riesgo de desvío |
| --- | --- | --- |
| Dirección 168 h | Arquitectura anual, objetivos/teoría de valor, selección y revisiones 3/6/9/12, control de calidad/claims, decisiones mensuales | Cambios de producto/mercado/objetivos requieren revisión; no incluye dirección de todos los canales banco |
| SEO técnico 344 h | Censo 51 FAQ + 8 páginas declaradas, GSC/template/policy, arquitectura/enlaces/schema, briefs técnicos, QA indexación y mantenimiento | Corpus/subdominios extra, logs, migración o templates complejos se reestiman |
| Editorial 548 h | Fuentes/briefs, hasta 56 intervenciones FAQ M2–M12, máximo 8 ampliaciones sustanciales M2–M9, revisiones core/hubs/condiciones | No obliga 56 cambios ni 8 URLs; respuestas correctas cierran conservar; rondas/cambio brief consumen capacidad |
| Ingeniería 388 h | Implementación CMS/template acotada, enlace/event tagging dentro de permisos, staging/rollback; hasta 3 paquetes M2–M6 y 2 M7–M12, ≤ 12 h por paquete | M1 arquitectura/acceso; paquetes se descomponen. Sin permiso: especificación/acomp. No app/core/migración/redesign |
| Analítica 324 h | Diccionario web/registro/app, pruebas de datos/consent/dedupe, tablero, lectura/cohort/fondeo/saldo y revisiones trimestrales | Pipeline core/MMP nuevo y datos sensibles excluidos; banco entrega resultados agregados |
| AEO 312 h | Set 24 preguntas, cuatro superficies/modos core, dos réplicas por mes (192 observaciones), revisión fuentes/exactitud/comparadores; seis consultas centinela AI Mode trimestrales | Tiempo orientativo 3 min/captura ≈ 9,6 h/mes + codificación/análisis ≈ 14,4 h; M1 instalación y trimestres más tiempo. Acceso/UI/proveedor puede alterar costo |
| QA 236 h | Comprobación de hechos contra fuente, móvil/desktop/teclado/schema, staging/verificación final y pruebas de regresión; QA de ejemplo/calculadora si accesible | Auditoría WCAG integral externa/pentest o device farm adicional no incluido |
| Coordinación 240 h | Sesión semanal/comité/gestión de lotes/reviewer/dependencias, informe mensual y cierre/evidencia | Dos rondas consolidadas; múltiples comités/proveedores o 24 × 7 no incluidos |

Unidades editoriales orientativas para comprobar carga: FAQ con modificación acotada ≈ 3 h de editorial; revisión core ≈ 6–8 h; guía/hub con fuente propia ≈ 12–18 h; brief/estado conservar más corto. QA/SEO/coord tienen sus propias horas; no se cuentan de nuevo como «todo incluido» por unidad. Cada mes se selecciona mezcla que cabe en 548 h anuales y cupos mensuales. La investigación de artículo financiero o calculadora compleja puede exceder una unidad: estimar antes de comprometer.

Capacidad principal cubre servicio integral SEO/AEO web autorizado; no reemplaza la agencia de todos los canales ni al proveedor de app/core. Producción de medios/gráfica/video para contenidos, paid media, PR/outreach enviado y buying de terceros requieren partidas propias y derechos. Preparar ficha/metadatos de app no equivale a publicar release.

## 3. Reserva razonada, sin compromisos ocultos

| Lane | Reserva | Uso candidato |
| --- | ---: | --- |
| Dirección |16 h| Repriorización por cambios de oferta/decisión trimestral |
| SEO técnico |48 h| Drift de templates/indexación, conflicto grafo o consolidación delicada |
| Editorial |64 h| Cambios oficiales de condiciones/fechas y repetición de claims |
| Ingeniería |72 h| Adaptación a stack/staging, deployment/retrabajo de paquete acotado |
| Analítica |48 h| Reconciliar definiciones/dedupe, datos incompletos o mapping consent |
| AEO |32 h| Accesos/modos cambiantes, réplica de discrepancia y documentación |
| QA |32 h| Regression/revisión financiera adicional de cambio sensible |
| Coordinación |24 h| Procurement/reviews y ajuste de dependencia |
| **Total** |**336 h**| No licencias ni horas ilimitadas; no cubre replatforming |

Reservar de manera real y costeada; cambios extraordinarios a otro producto/mercado o app se cotizan. No tratar tiempo sin implementación por falta de permiso como beneficio/margen adicional: acordar slots alternativos, reprogramación y alcance con sponsor.

## 4. Alternativa de menor capacidad, con tradeoffs

Si el presupuesto/capacidad disponible no acompaña el programa principal, **mantener doce meses** y redimensionar el ritmo con Commercial/Operations. Alternativa candidata «Foco producto y activación» construida por lane (no descuento automático): Dirección 144 h, SEO 252 h, Editorial 348 h, Ingeniería 220 h, Analítica 252 h, AEO 216 h, QA 180 h, Coordinación 216 h = **1.828 h base**; reserva por riesgos reducidos candidata 216 h; **2.044 h total**. El desglose mensual siguiente se valida con Operations y se costea antes de cotizar; no está aprobada.


Desglose candidato de la opción de foco (horas internas; disponibilidad sin confirmar):

| Lane | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 | Base h | Reserva h |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Dirección | 16 | 10 | 12 | 10 | 10 | 12 | 10 | 10 | 12 | 10 | 10 | 22 | 144 | 12 |
| SEO | 32 | 28 | 24 | 20 | 20 | 20 | 16 | 16 | 16 | 20 | 16 | 24 | 252 | 32 |
| Editorial | 24 | 32 | 32 | 28 | 28 | 28 | 28 | 28 | 28 | 32 | 28 | 32 | 348 | 40 |
| Ingeniería | 28 | 24 | 20 | 16 | 16 | 16 | 16 | 16 | 16 | 20 | 16 | 16 | 220 | 48 |
| Analítica | 28 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 24 | 252 | 32 |
| AEO | 24 | 16 | 20 | 16 | 16 | 20 | 16 | 16 | 20 | 16 | 16 | 20 | 216 | 20 |
| QA | 16 | 16 | 16 | 14 | 14 | 16 | 14 | 14 | 16 | 14 | 14 | 16 | 180 | 16 |
| Coordinación | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 216 | 16 |
| **Total** | 186 | 164 | 162 | 142 | 142 | 150 | 138 | 138 | 146 | 150 | 138 | 172 | **1.828** | **216** |

- Conserva baseline 51 FAQ, producto/entidad/condiciones, clusters costo/apertura/transferencias, medición autorizada y revisiones 3/6/9/12.
- Editorial hasta cuatro FAQ/mes operativo y cuatro ampliaciones sustanciales/año; más actualizaciones de confianza/app quedan detrás de prioridades de producto y activación.
- Ingeniería un paquete ≤ 12 h/mes operativo; el proveedor absorbe implementación fuera de ese borde con costo/owner explícitos. Mayor tiempo hasta resolver backlog; no prometemos mismo alcance/plazo con menor inversión.
- Panel AEO 12 preguntas × 4 superficies × 2 réplicas = 96 observaciones/mes; seis consultas centinela AI Mode trimestrales. Menor cobertura por intención y mayor incertidumbre, sin score que finja equivalencia al panel 24.
- Earned sólo diagnóstico/ficha inicial; ASO sólo revisión de coherencia y especificación, sin ciclo de optimización dedicado. QA/claims no se eliminan para sostener cantidad.

Elegir una alternativa exige revisar el plan/matriz/modelo anual juntos y aprobación humana; no ofrecer automáticamente ambas como dos servicios solapados de una cuenta. El principal es la base del modelo hasta elección explícita. Tampoco cambiar a seis meses para «ahorrar» ocultando maduración necesaria.

## 5. Costeo monetario y quote pendientes

| Input | Valor vigente de este caso | Fuente/owner |
| --- | --- | --- |
| Costo fully loaded hora por lane | **ND** | Finance/Operations con nómina/contractor/overhead y método real; no divulgar datos personales |
| Roster/disponibilidad mensual | **ND** | Operations contra compromisos existentes |
| Herramientas/API/ranktracker/AEO/almacenamiento | **ND** | Owner herramientas: plan, cupo, límites, precio/consumo vigente y presupuesto |
| Proveedor web/app/deploy y terceros | **ND** | Cliente/proveedor y Commercial; alcance real/pass-through explícito |
| Procurement/seguridad/onboarding | **ND** | Banco + Commercial/Legal/Operations |
| Moneda, impuestos/retenciones, FX y entidad que factura | **ND** | Finance/Legal según operación Perú/internacional |
| Margen, forma de pago/cobro, reserva y descuento | **ND para esta oferta** | Canon de pricing/quote engine + aprobaciones Finance/Commercial |
| Fee/inversión cliente anual | **ND** | Cotización aprobada; no monto histórico del deal ni fees de otra cuenta |

```text
Costo base humano = Σ(base_horas_lane × costo_real_hora_lane)
Costo reserva = Σ(reserva_horas_lane × costo_real_hora_lane)
Costo total = humano + reserva costeada + herramientas/proveedores
              + onboarding/gobierno + externos explícitos
Fee compatible = costos sujetos al margen / (1 − margen autorizado)
                  + pass-through según tratamiento acordado
```

Evitar doble overhead y separar rubros que están/no están sujetos al margen. Validar el piso bruto vigente de la práctica (canon consultado 45%) y cualquier excepción en el carril de pricing real; ese piso no aprueba precio ni implica margen esperado. No derivar fee de 2.896 h sin costos comprobados. Inversión cliente y costo interno no son la misma cifra. Capacidad no se convierte en ROI hasta que Finance apruebe inversión, valor y horizonte comparables.

## 6. Para comprometer el programa

Commercial confirma unidad anual y límites; Operations valida aporte/capacidad por rol y contingencia; Finance carga costos/herramientas/impuestos/FX/cash/margen; banco asigna reviewers/accesos/datos/calendario; quote engine genera precio y se aprueba por carril vigente. Sólo entonces emitir alcance/inversión cliente. Esta hoja deja controlables el trabajo y su economía, con todas las aprobaciones aún pendientes.
