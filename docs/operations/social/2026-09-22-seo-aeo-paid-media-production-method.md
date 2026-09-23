# SEO/AEO Paid Media: dirección, producción y continuidad

**Estado al 22/09/2026:** cuatro conceptos, dieciséis piezas; corrección v07 del lecho y firma, sin pauta ni resultados de
campaña. Este documento reúne decisiones y evidencia de la sesión; los contratos dueños siguen enlazados.
No convierte coordenadas del caso en tokens globales ni una aceptación visual en eficacia comercial.
**Delta 23/09/2026:** §5 y §6 se actualizaron con el gate que certifica el compositor CTA (códigos de salida,
firma, zona segura, concepto y trazo). Ninguna pieza de esta campaña se recompuso: las aprobadas que el canon ahora
reprueba se dejan como están y se corrigen al recomponer (decisión del operador).

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
La regla de dominante ≥3× entrada es necesaria, no suficiente: no es un pase automático. Desde el 23/09
`foto:cta:gate` la bloquea —igual que un dominante que no es la voz mayor— y sólo se exceptúa con excepción
auditada (`jerarquia`) y aprobador del registro.

El CTA admite texto, contorno o relleno a demanda. Naranja, teal u otro acento autorizado se elige según la
escena; lima no es universal. Medir tinta/escena o tinta/relleno según variante, borde/relleno contra foto,
descriptor y controles. CTA/descriptor ≥4,5:1 —el CTA aunque sea grande, y desde el 23/09 con APCA y daltonismo
bloqueantes—, contorno/controles ≥3:1, firma ≥4,5:1. El p98 es diagnóstico: **no equivale al mínimo local ni
rescata un fallo**; el gate mide el 1 % peor del trazo de cada voz, y la firma en su caja (con el trazo del logo
cuando lo dibuja el compositor; la firma externa de estas corridas, en el peor píxel de su caja). Ver el método
completo en Tres voces + acción.

Un único cursor local hacia la acción cuando se use selección; multiplayer sólo si cuenta algo. Usar
intent y renderer AXIS. «Standalone» no significa que exista un modo sin caja en el renderer. Proteger
la envolvente completa: texto, superficie, brackets, punta/cuerpo, placa y descriptor. `withinCanvas`
no comprueba safe zone, aire respecto al sujeto ni contraste. Revisar cada export al 100% y a 390 px.

La firma cierra abajo sobre lecho físico. La v05 la subió al 63% para cumplir geometría y el operador la
rechazó por flotar casi al centro. La v06 siguió la referencia de Claude al 83,3%, pero mantuvo un lecho excesivo. La v07 reduce el lecho y coloca la firma **dentro de su materia desenfocada**, separada de la transición, con ancho 20% del lado corto. Las primeras ubicaciones v07 tocaron o quedaron encima del lecho y también se corrigieron. No imponer el 83,3% ni otro porcentaje por analogía: en la última revisión el centro es 90%. Son coordenadas del caso, no preset global. El titular arranca al 16,5%; texto/CTA/cursor quedan en
la ventana conservadora declarada. La firma queda fuera del guardrail inferior de Reels: registrar posible
solapamiento y revisar el placement real, sin ocultarlo detrás de un PASS editorial. No agregar scrims.

**Delta 23/09 — la firma en el gate.** Los planes v03–v07 declaran su firma externa (`firma: { modo: "externa",
razon }` en 60 piezas, commit `dc95887ec`, con paquetes de origen y reproducciones intactos; los 9:16 de v05–v07 ya
la declaraban con `signatureY`) y el gate les aplica el contrato de la firma: ≥4,5:1, 20 % del lado corto, fuera del sujeto y dentro de la
zona de AXIS estrechada por `signatureSafeArea`. Las tres stories de v07 que hoy componen quedan fuera de esa zona
(centro en 0,90; AXIS termina en 0,87): aprobarlas como excepción `zona-segura` con el nombre del operador o subir la
firma al recomponer es **decisión pendiente**. También está pendiente el tamaño en 16:9: al 20 % del lado corto la
firma quedaría en ≈ 44 px en un teléfono, contra 78 px en 4:5 (opción recomendada, sin aprobar: 25 % en
horizontales); detalle en [Tres voces + acción](../EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md#cobertura-de-formatos-para-paid-media).
Y «no agregar scrims» no lo hace cumplir el gate: si una voz pasa sólo gracias al velo, hoy avisa y no bloquea.

## 6. Comandos actuales y reproducción histórica

Para producción **nueva**, desde el repositorio:

```sh
pnpm foto:componer:cta <directorio-exclusivo/piezas.json>                # compone; QA por plan (out/qa-<plan>.json) con huellas
pnpm foto:cta:gate <directorio-exclusivo/piezas.json>                    # certifica: sólo la salida 0 es certificado
pnpm foto:cta:gate <directorio-exclusivo/piezas.json> --reproducir       # certifica recomponiendo con el comando vigente
```

El compositor canónico incorporó colores por pieza, variantes CTA y `logo.y`/`logo.variant` y, desde el 23/09, un
QA por plan atado por huellas (plan, plate, PNG, layout y comando), la zona segura de AXIS, el contrato de la firma y
del concepto, y el contraste medido sobre el trazo. Su auditoría, límites y decisiones pendientes están en el
[contrato técnico](../EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md) (§7 y §18). No copiar otro compositor de corrida.
Separar planes en directorios distintos: dos composiciones en la misma carpeta no se mezclan (la segunda se rechaza
por el bloqueo de `out/`), y si otro plan de la carpeta ya registró un id que vas a componer, el compositor avisa
antes de componer, porque ese PNG deja de ser el que certificó el otro plan.

El gate responde con un código: `0` certificado · `1` falla · `2` uso · **`3` no certificable, que no es un pase**
(QA del formato anterior, otra versión del comando o máscara de una caché ajena: recomponer o `--reproducir`; una
pieza con gesto manuscrito o tarjeta no se certifica). Aun con 0, el gate no reemplaza el QA visual —identidad,
manos, pantallas, cierre de la firma— ni el preview del placement.

**Reproducir exactamente v06 es otro modo:** ejecutar `recomponer.cjs` desde `02. Editables` de su paquete
OneDrive, con dependencias verificadas y plates archivados. Sus scripts son evidencia congelada, no base
para nuevas campañas. No migrar a ciegas. El comando ya lee `centerX` (desde la noche del 22/09; aborta un bloque
centrado a más de 0,15 del centro) y, desde el 23/09, `signatureY` y `firma: { modo: "externa" }` —reserva la caja
de la firma externa con `y` como centro vertical—, y usa `safeArea`, `signatureSafeArea` y `editorialReserve` como
guardas; pero `logo.y` numérico sigue siendo el borde superior de la firma, no su centro.

La prueba de migración del 22/09 con cuatro piezas reprodujo tres variantes CTA; «Sé la referencia»
(03-referencia-916) se desplazó al centro y falló contraste (CTA 1,5:1; descriptor 1,7:1) porque el comando de
entonces ignoraba `centerX`. Hoy lo lee, y esa pieza aborta hasta alinearla a la izquierda (contrato §14). Los
finales v06 **no fueron reemplazados** por esa prueba. Una migración debe mantener el mismo render y pasar QA antes
de sustituir la receta archivada.

## 7. Archivo, embudo y continuidad entre Claude/Codex

Usar la raíz local OneDrive `Alineación/5. Contenidos/15. Paid Media`:

- `01. Recursos`: reglas y referencias compartidas con vínculo al canon vivo.
- `02. Pilotos`: variantes, descartes, revisiones y versiones retiradas, con motivo.
- `03. Finales`: sólo exports de la versión aceptada, con su paquete de continuidad. No mezclar campañas
  ni sobrescribir el trabajo del otro agente. La autorización de esta sesión permite promover las correcciones.

Cada paquete incluye export limpio; plate; copy y parámetros editables; SVG/capas; ficha y prompts exactos;
referencias y hashes; cadena de ediciones; motor; comandos/versiones/dependencias; concepto, palanca, audiencia,
fase principal/secundaria, hipótesis, CTA/destino, KPI/UTMs; evidencia de contraste/espaciado/safe areas —en
piezas con CTA, el QA del plan (`out/qa-<plan>.json`), el código de salida del gate y el texto alternativo
(`out/<id>.alt.txt`)—; contactos y previews; aprobación, limitaciones y checksum. Un SVG de letras trazadas se modifica desde el
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

## 9. Campaña registrada y extensión MOFU/BOFU

El pensamiento de campaña se consolida en OneDrive `Alineación/2. Campañas/CMP-001_la-ia-dice-de-ti/BRIEF.md`;
los archivos de esta corrida continúan en Paid Media. [Continuidad CMP-001](2026-09-22-cmp-001-campaign-brief-handoff.md)
y [contrato reusable](../EFEONCE_CAMPAIGN_REGISTRY_V1.md) gobiernan brief, templates, ASSETS, decisiones y medición.
Las etiquetas de fase de §2 describen la corrida histórica, no restringen el journey: el operador sitúa el lote
de diagnóstico como entrada TOFU. MOFU demuestra método/evidencia; BOFU define alcance y conversación. Content
Marketing se conecta a SEO/AEO por cobertura, conocimiento propio y decisión del comprador. No producir más
piezas por defecto ni prometer citas/ventas; el brief distingue hipótesis y evidencia.

La última corrección de lecho exige elevarlo ligeramente para alojar firma al pie dentro de material y safe
zone, no bajar la firma fuera de ella ni llevarla al centro. No se han regenerado finales por documentarlo.
