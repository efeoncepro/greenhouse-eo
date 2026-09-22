# SEO/AEO Paid Media: dirección, producción y continuidad

**Estado al 22/09/2026:** cuatro conceptos, dieciséis piezas; corrección v07 del lecho y firma, sin pauta ni resultados de
campaña. Este documento reúne decisiones y evidencia de la sesión; los contratos dueños siguen enlazados.
No convierte coordenadas del caso en tokens globales ni una aceptación visual en eficacia comercial.

## 1. Mapa de autoridad

| Decisión | Fuente dueña |
|---|---|
| Atención, territorios, control y experimento | [Playbook paid visual](../../../.codex/skills/efeonce-advertising-creative/references/paid-visual-attention-playbook.md) |
| Registro A/B/C, materia, luz, identidad y color | [Lenguaje fotográfico](../brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) y su [índice](../brand-photography/README.md) |
| Copy, jerarquía, CTA, cursores, contraste y formatos | [Tres voces + acción](../EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md) |
| Implementación de CTA, campos y limitaciones verificadas | [Compositor canónico](../EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md) |
| Tokens y semántica de selección | [Ownership AXIS](../../architecture/EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md) |
| Fuentes exactas, planes, export y procedencia de la campaña | [Corrida v06](../../../ai-generations/2026-09-22_aeo-final-safe-v06/LEEME.md) |

Advertising orquesta; Design dirige la foto; Brand gobierna identidad/kits; Image produce el medio;
Social define placement; Growth/CRO define hipótesis, destino y medición; SEO/AEO conserva la precisión de
la promesa. Las skills de derechos se aplican al uso previsto. No se redefine arquitectura ni contrato AXIS.

## 2. Dirección creativa: una idea que se reconoce y conduce a una acción

El objetivo deseado expresado por el operador es **ser la fuente preferida en la respuesta de IA**.
La analogía con posición 1 comunica aspiración; no promete ranking, citación, exclusividad ni elección.
La campaña combina aspiración y riesgo: ausencia o representación incorrecta frente a reconocimiento y
preferencia. El miedo debe partir de una situación plausible, sin inventar un diagnóstico de la marca.

| Concepto | Lo que muestra | Función principal / secundaria |
|---|---|---|
| ¿Sales tú? | Una respuesta con fuentes y el problema de no estar presente; Codex encarna el sistema | TOFU: reconocer ausencia / MOFU: comprobar visibilidad |
| ¿Te reconoces? | Discrepancia entre el negocio en la tablet y su representación en pantalla; Nexa compara | TOFU: reconocer riesgo / MOFU: revisar fidelidad |
| Sé la referencia | La fuente destacada adquiere escala mediante proyección; Nexa recibe la respuesta | MOFU: considerar solución / TOFU: aspiración |
| Que te elijan | El instante de selección de una fuente en pantalla, gesto y reflejo legibles | MOFU: intención de diagnóstico / BOFU cálido como hipótesis |

La fase describe estado de entrada y progreso esperado, no determina el estilo del botón. El beneficio es
específico del concepto cuando se usa; no repetir CTA como remate y descriptor. Una sola acción:
**Pide el diagnóstico · SEO + AEO**. URL exacta pendiente de tráfico; no inventar gratuidad ni garantías.
La matriz completa incluye audiencia, hipótesis, métricas y UTMs en `CONCEPTOS-Y-EMBUDO.json` de v06.

El impacto no se obtiene acumulando objetos, cursores o adjetivos de prompt. Elegir una palanca dominante
que haga reconocible la tensión a tamaño de feed. La metáfora analógica debe integrarse al objeto digital
del oficio: respuesta, fuente, búsqueda o elección. Si al retirar ese objeto queda la misma idea genérica,
falta atribución a SEO/AEO. El primer golpe abre curiosidad; el CTA explica el siguiente paso concreto.

## 3. Registro y recursos de Efeonce

- **A, documental:** el oficio es el mensaje. **B, puesta en escena:** composición al servicio de una idea.
  **C, la respuesta a la vista:** protagonizan la respuesta y quien la encarna; Nexa puede recibirla,
  observarla o compararla. No convertir una foto de equipo en explicación del problema del cliente.
- El registro C conserva identidad, colorimetría, realismo, materia, firma y reservas del maestro. Una
  palanca publicitaria no es automáticamente un enum aceptado por `foto:prompt`; consultar el compilador.
- Abrir referencias canónicas **antes** de producir: Nexa por ángulo, expresión, vestuario y accesorios;
  Codex/Clawd/Gigi desde sus kits; espacios y objetos desde el catálogo vigente. No basta nombrarlos en el prompt.
- Vestuario corporativo: usar el kit de la prenda y la referencia de identidad por separado. La marca exacta
  no se reconstruye de memoria. Si se integra sobre materia, seguir el flujo de elementos sensibles;
  la firma editorial siempre se compone desde SVG oficial después de generar la foto.
- Elegir portadores reales del azul y del acento según el registro; verificar que existan en los píxeles.
  No añadir utilería por rellenar la paleta. Con Gigi respetar su regla cromática específica y el uso autorizado.
- Una tableta en uso se orienta hacia quien la consulta. Para mostrar su pantalla al espectador, resolver
  ángulo compartido o mirada sobre el hombro. No voltear el aparato hacia cámara mientras el personaje
  pretende leerlo por detrás. La mano que señala debe alcanzar el plano correcto; revisar dedos, agarre,
  articulaciones, oclusión, reflejo y punto de contacto. Corregir mediante edición de la referencia aprobada.
- El aparato y su pantalla deben cumplir función narrativa; no UI flotante ni panel decorativo. No presentar
  texto generado o una fuente ficticia como captura real o resultado medido.

## 4. Del concepto al plate

1. Definir concepto, tensión, audiencia/etapa, objeto digital, registro, palanca, copy y ratios antes del prompt.
2. Inspeccionar imágenes aprobadas comparables y la versión corregida de identidad/manos/props que se reutilizará.
3. Completar ficha por ratio con referencias, formato, identidad/vista, objetos, materia del lecho, tono de
   reservas, una palanca fotográfica admitida, luz/atmósfera y límites de sujetos.
4. Ejecutar `pnpm foto:doctor`; compilar con `pnpm foto:prompt <ficha.json> --batch <batch.json>`.
   Guardar ficha, prompt **completo** emitido, referencias y hashes. No concatenar bloques manualmente.
5. Generar o editar mediante el motor disponible y registrar su identidad real. Un archivo de prompt no
   demuestra que se ejecutó. Archivar cada salida, intento y corrección con su referencia efectiva.
6. Revisar el plate sin textos: identidad, anatomía, pantalla, color, material, lecho y reservas. Ejecutar
   `pnpm foto:validar <plate.png> --zona-texto` cuando corresponda. Registrar fallos y alcance del arnés;
   un PASS de una composición específica no promueve todo el catálogo de reservas.
7. Adaptar nativamente cada ratio. No estirar, inventar bandas ni recortar manos/personajes como atajo.
   Cambiar ángulo requiere editar la identidad aprobada; cambiar tamaño no demuestra recomposición.

## 5. Composición determinista y QA visual

La matriz interna es **concepto × 4:5 / 1:1 / 9:16 / 16:9**, salvo exclusiones expresas del brief.
No todas las redes admiten cada ratio como el mismo medio. LinkedIn video 9:16 no convierte un PNG en video;
16:9 no se renombra como 1.91:1. Declarar plataforma, placement y medio además de dimensiones.

Bricolage instala la idea, Poppins estructura y CTA, Guttery aporta un gesto opcional. Diferenciar roles
por escala, peso, tinta y espacio; tres voces no exige tres fuentes ni llenar todas las casillas. Resolver
valores desde AXIS y conservar archivo/ejes reales. Medir caja de tinta, cortes, leading y tracking.
La regla de dominante ≥3× entrada es una guía interna con excepción explícita por formato, no un pase automático.

El CTA admite texto, contorno o relleno a demanda. Naranja, teal u otro acento autorizado se elige según la
escena; lima no es universal. Medir tinta/escena o tinta/relleno según variante, borde/relleno contra foto,
descriptor y controles. CTA/descriptor ≥4,5:1, contorno/controles ≥3:1, firma ≥4,5:1. El p98 es diagnóstico:
**no equivale al mínimo local ni rescata un fallo**. Ver el método completo en Tres voces + acción.

Un único cursor local hacia la acción cuando se use selección; multiplayer sólo si cuenta algo. Usar
intent y renderer AXIS. «Standalone» no significa que exista un modo sin caja en el renderer. Proteger
la envolvente completa: texto, superficie, brackets, punta/cuerpo, placa y descriptor. `withinCanvas`
no comprueba safe zone, aire respecto al sujeto ni contraste. Revisar cada export al 100% y a 390 px.

La firma cierra abajo sobre lecho físico. La v05 la subió al 63% para cumplir geometría y el operador la
rechazó por flotar casi al centro. La v06 siguió la referencia de Claude al 83,3%, pero mantuvo un lecho excesivo. La v07 reduce el lecho y coloca la firma **dentro de su materia desenfocada**, separada de la transición, con ancho 20% del lado corto. Las primeras ubicaciones v07 tocaron o quedaron encima del lecho y también se corrigieron. No imponer el 83,3% ni otro porcentaje por analogía: en la última revisión el centro es 90%. Son coordenadas del caso, no preset global. El titular arranca al 16,5%; texto/CTA/cursor quedan en
la ventana conservadora declarada. La firma queda fuera del guardrail inferior de Reels: registrar posible
solapamiento y revisar el placement real, sin ocultarlo detrás de un PASS editorial. No agregar scrims.

## 6. Comandos actuales y reproducción histórica

Para producción **nueva**, desde el repositorio:

```sh
pnpm foto:componer:cta <directorio-exclusivo/piezas.json>
pnpm foto:cta:gate <directorio-exclusivo/piezas.json>
```

El compositor canónico incorporó colores por pieza, variantes CTA y `logo.y`/`logo.variant`. Su auditoría
actual y los límites de cobertura, contraste y migración están en el [contrato técnico](../EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md).
No copiar otro compositor de corrida. Separar planes en directorios distintos; generar QA y verificar
IDs/cantidad/claves antes de interpretar la salida del gate. El gate CTA no reemplaza QA visual, firma,
controles, contraste mínimo ni preview del placement.

**Reproducir exactamente v06 es otro modo:** ejecutar `recomponer.cjs` desde `02. Editables` de su paquete
OneDrive, con dependencias verificadas y plates archivados. Sus scripts son evidencia congelada, no base
para nuevas campañas. No migrar a ciegas: `centerX` no está implementado por el comando canónico auditado;
`signatureY` es centro en v06, pero `logo.y` es borde superior en el canónico. El compositor no consume
los validadores externos `safeArea`, `signatureSafeArea` o `editorialReserve` del caso.

La prueba de migración con cuatro piezas reprodujo tres variantes CTA; «Sé la referencia» se desplazó al
centro y falló contraste (CTA 1,5:1; descriptor 1,7:1). Los finales v06 **no fueron reemplazados** por esa
prueba. Una migración debe mantener el mismo render y pasar QA antes de sustituir la receta archivada.

## 7. Archivo, embudo y continuidad entre Claude/Codex

Usar la raíz local OneDrive `Alineación/5. Contenidos/15. Paid Media`:

- `01. Recursos`: reglas y referencias compartidas con vínculo al canon vivo.
- `02. Pilotos`: variantes, descartes, revisiones y versiones retiradas, con motivo.
- `03. Finales`: sólo exports de la versión aceptada, con su paquete de continuidad. No mezclar campañas
  ni sobrescribir el trabajo del otro agente. La autorización de esta sesión permite promover las correcciones.

Cada paquete incluye export limpio; plate; copy y parámetros editables; SVG/capas; ficha y prompts exactos;
referencias y hashes; cadena de ediciones; motor; comandos/versiones/dependencias; concepto, palanca, audiencia,
fase principal/secundaria, hipótesis, CTA/destino, KPI/UTMs; evidencia de contraste/espaciado/safe areas;
contactos y previews; aprobación, limitaciones y checksum. Un SVG de letras trazadas se modifica desde el
copy JSON y se regenera; no basta entregar un PNG o un texto de prompt resumido.

La v06 archivó 16 exports reconstruidos byte por byte. La v07 conserva doce PNG sin cambios y reemplaza los cuatro verticales tras corregir el lecho; su matriz registra la verificación propia.
Las versiones v05/v06 retiradas permanecen en Pilotos; v07 corrige el tamaño del lecho y vuelve a medir texto/firma. Final creativo, preview de plataforma, autorización de pauta,
publicación y resultados son estados distintos. La URL y el tracking se resuelven antes de tráfico.

## 8. Qué se mide después

KPI principal: solicitudes calificadas de diagnóstico y costo por solicitud calificada. Diagnóstico:
CTR saliente, visitas efectivas, envíos de formulario y aceptación comercial. Conservar fórmula,
población, periodo, placement y denominador. Hook temporal de video no aplica a estáticos. Atención,
atribución a Efeonce, intención y conversión son preguntas diferentes; no inferir una desde otra.
Comparar estilos de CTA manteniendo concepto, oferta, foto y condiciones de medios; no atribuir lift al
color ni declarar ganador sin muestra y calidad comparables.
