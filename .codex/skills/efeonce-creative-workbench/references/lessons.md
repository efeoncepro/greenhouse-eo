# Aprendizajes y errores que no deben repetirse

## Aplicación vigente — 2026-10-01

El [corte actual](state-continuity.md) prevalece sobre estados históricos de esta tabla.
La comparación independiente de 126/126 está completa; las propuestas OAuth propias se
retiraron en favor de Efeonce ID diferido. Git identity ya tiene configuración/hook por persona,
pero presupuesto/broker y acceso de todo el equipo no se cierran por un merge de componentes.

Aprendizajes nuevos: conservar identidades visuales por ejecución; reconstruir el árbol completo
con dependencias antes de copy/foto; inferencia por hex no prueba binding; un snapshot editado
con SHA recalculado no se auto-admite; extracción con fondo/Multiply requiere contexto. El
PNG de un icono no cambia su fuente vectorial. Ver [autónomos](autonomous-components.md).

Registro de causas verificadas durante el onboarding SKY, con cortes hasta 2026-10-01. Aplicar a la variante/
contrato que respalda cada caso, sin transformar un ejemplo en excepción general de marca.

| Síntoma o afirmación | Causa / evidencia útil | Acción correcta |
| --- | --- | --- |
| “Está en carpeta SKY, por tanto es SKY” | Folder no valida procedencia de dependencia | Resolver cliente, pack exacto y cada ID/SHA; rechazar cruces |
| Root instala AXIS aunque cliente es SKY | Herencia de identidad en dependencias raíz | Runtime neutral y biblioteca propia; no sync total antiguo |
| “El productor está en el JSON” | Campo local es atribución falsificable | Identidad GitHub viva y autoridad del ingreso |
| “Ya descargamos ZIP, tenemos todo Figma” | ZIP de exportaciones no conserva todas las escenas/campos | Inventario FIG nativo por nodo, 126 templates y coverage |
| CTA vacío en metadata pero visible en PNG | TEXT_DATA recuperable desde textDataValue; contornos históricos dibujan letras | Reader correcto, admisión revisada y copy completo declarado |
| Inter parece disponible y Metric falta | Estilos auxiliares experimentales y fuente local incompleta | Metric confirmada por operador; no fallback ni permiso desde manifest |
| “Ver rutas” descentrado pese a caja centrada | Baseline/ink de la fuente distinta | Centrar tinta visible horizontal y vertical, QA y PNG reales |
| SKY se ve “S > I Y” o Y recortada | Paths escalados, offsets/clip de master sin escalar | Pins nativos de escala en logo.mjs, paths oficiales intactos |
| Línea blanca en unión de flecha | Fills independientes con antialias | Un contorno exterior continuo, no ampliar/retocar PNG |
| Flecha blanca detectada como color incorrecto | Cuatro paints blancos legítimos de fuente | Conservar variante nativa; test sobre fondo contrastante |
| Fondo de sticker redondo deforme, borde circular correcto | FRAME plenamente redondeado aproximado con curvas Q en vez de su `fillGeometry` | Preservar trazado/winding/transformación; baseline 126 por fuente; referencias con `--native-previews`, corridas viejas se recomponen en run nuevo |
| Premio recortado / sticker rectangular | Precedencia de tamaño de instancia y OUTLINE mask | Contenedor/máscara source-specific, no modificar artwork |
| Legal pierde énfasis / cuotas uniformes | Mixed styles olvidados durante shapeado | Regular/Semibold y Black/Medium exactos, case nativo |
| Cielo correcto aislado pero texto ilegible | Reserva no proyectada al FILL/crop o nubes bajo texto blanco | Medir pieza final; foto/variante apropiada, sin scrim que esconda fallo |
| “Sí, la imagen sigue el criterio” | Confirmación humana de fotografía | No extenderla a KV, contraste, precio, derechos o publicación |
| 126 renders coinciden con source propio | Regresión interna no basta como referencia independiente | Usar los 126 controles REST sellados y comparación por nodo; PR14 cerró esa revisión y PR15 conserva PNG/SVG exactos |
| 4,495581 se presenta como 4,5 aprobado | Redondeo oculta fallo del umbral | Registrar valor real y límite del método |
| “Vercel está bloqueado” | Sesión/scope equivocada no es build roto | Verificar identidad y project exactos, no mezclar cuentas |
| Vercel CI genérico verde | Otro proyecto/alias que visor SKY separado | Readback del deployment y superficie SKY concretos |
| Figma API 403 se atribuye a cuota | PAT Greenhouse expirado; /me 401 expired-token | Distinguir autenticación de límite de requests; no repetir indefinidamente |
| Usuario autoriza crear token, pero tool no puede completar | Frontera humana de la tool/formulario | Conservar preparación; explicar bloqueo, no bypass/clipboard indiscriminado |
| Respuesta IA perdida | Pago puede haber ocurrido antes de archivo/receipt | Mismo UUID, receipt/ledger; no nueva intención/retry |
| Instalar paquetes prueba acceso de todos | Se probó sesión propia del maintainer | Onboarding/readback de cada persona, Google y GitHub separados |
| Tarea corta, pero OpenAI rechaza prompt completo | Skill/recursos/identidad agregan longitud fuera del límite de la tarea | Único compileBrandImagePrompt, 32.000 unidades UTF-16 antes de presupuesto/UUID, adapter usa mismo cuerpo |
| Usage ausente se informa como cero | Metadata opcional o inconsistente no es consumo medido | Guardar null; cero sólo reportado y válido; separar usage posterior de quote previa |
| Binding cambia durante un await | Se retenía un objeto mutable del caller | Capturar ID/login antes de esperar y copiar token/scope/expiración antes de consultas; verificar identidad exacta |
| Regex rechaza credencial de instalación actual | Token opaco actual puede contener segmentos con puntos | Admitir formato acotado actual; minter establece tipo/scope, nunca confiar en decode JWT ni usar PAT fallback |
| Dos rutas llaman 2.1.0 a órdenes distintos | Importador insertaba travel en índice 7 y preparador al final; grupos podían invertir origin/travel | Contrato compartido 2.1.1/v2 conserva 19 definiciones y añade travel; rechazar solicitud v1 y no cambiar dibujo |
| Main falla una prueba de push permitida | Fixture usó checkout main; guard bloqueó correctamente | Git fixture aislado codex/safe; conservar guard y evidenciar fallo original y corrección |
| Lector App probado se presenta como identidad admitida | Minter/puente/wiring preparados no registran App ni admiten binding real | Policies draft fallan cerrado; demostrar ambas cuentas y endpoint antes del merge CLI |
| Snapshot de inputs autoriza pese a retirada canónica | Workspace conservaba policy/pack antiguos durante await | Verificar canon vivo y SHA inicial antes/después de proof workspace; reresolver recursos/version |
| Assert válido revive después de retroceso del reloj | Sólo comparar issuedAt no detecta retroceso entre observaciones válidas | startedAt/lastObservedAt privados, sin now externo; denegación elimina proof definitivamente |
| Resultado pagado desaparece al revocar durante complete | Delivery y persistencia se confundieron | Complete durable antes de reauth de entrega; negar lectura preserva receipt/ZIP/UUID |
| Ticket consumido antes del adapter y otra vez en OpenAI | Kernel y adapter llamaban el mismo guard de uso único | Sólo adapter real invoca una vez tras secreto/body; kernel rechaza guard ausente, denegado o repetido |
| Ticket vigente antes de auth, vencido al terminar await | Ledger durable se comprobaba antes de esperar identidad viva | assertAtProvider síncrono después de reauth: exacto WeakSet privado, uso único, dueño/hash/período/quote; sin nuevo pago |
| Revisión READY/tagged se informa como rollout completo | 00009-cep tiene 0% tráfico y producción sigue en 00008-tv6 al 100% | Verificar revisión/tráfico y endpoint; separar build, deploy candidato y promoción |
| Identity400 se atribuye a token App o vínculo Google | Filtro rechaza antes de ambos lectores | No afirmar primer token/scopes o binding positivo; corregir transporte y volver a medir |
| Cloud Run recibe token IAM pero aplicativo no obtiene JWT íntegro | Dos controles consumen el transporte firmado | Header aplicativo propio X-Workbench-Identity + X-Serverless-Authorization IAM, sin fallback Authorization; exigir readback tras corrección |
| Aprobación del operador se usa para aceptar audiencia compartida | Comentario PR7 identifica riesgo MEDIO sin aceptación específica | Reusar Efeonce ID mediante TASK-1952 y demostrar admisión individual; no crear OIDC propio ni inferir aceptación del riesgo |
| Miembros GitHub/correos se presentan como productores habilitados | API de equipo no certifica binding Google ni IAM | Evidencia por persona y cuenta; correos sólo referencia, no grant |
| Perfil legacy malformed se interpreta como firma eliminada | Rechazo Cloud Run400 no describe transformación exacta de bytes | Registrar conducta medida y header propio íntegro; no inferir mecanismo no observado |
| Primer token válido se extiende a todos los miembros | Canary9/9 probó sólo al operador, scope de un repo y revocación de cuatro tokens | Separar mint/token/identidad positiva del operador y admisión individual del resto |
| Canary sin pago se presenta como readiness para gastar | IA OFF y quotes0 no prueban quote/budget o ruta pagada | Autoridad definitiva conforme Efeonce ID, presupuesto/cotizaciones admitidos y autorización del pago antes del canary de costo |
| Fusionar nueva CLI para probar endpoint aún ausente | Cliente requiere contrato que runtime no admite | PR draft, backend admitido/readback IA OFF antes de merge; sin broad-token fallback |

## Propuestas rechazadas o retiradas

- Prompt canary genérico de SKY: sirvió para probar infraestructura, luego retirado al admitir la
  skill fotográfica. No seguir generando con ese recurso antiguo ni adoptar su quality low como
  ajuste del piloto fotográfico medium.
- Primera implementación de texto mixto: legal URL Regular y headings sin UPPER. Rechazada;
  nuevas corridas v2, no sobrescritura de v1 ni etiqueta de aprobación retroactiva.
- Parche de seam por expandir piezas separadas o retocar imagen final: resuelve una escala,
  no la topología compartida. Biblioteca continua verificable con los 105 pins efectivos (74 iniciales, 25 ampliaciones y seis unions); no una regla libre para fuentes nuevas.
- Reconstruir logo con letras, redibujar icono o copiar uno distinto por adaptación: pierde fuente
  oficial y repite errores de escala. Reparar instancia admitida, no cambiar artwork.
- Prompt+ancla correctos como certificación visual: faltan inspección del PNG/encuadre y mediciones
  específicas. Hue/focal/porcentajes escritos no son magnitudes demostradas.

## Diagnóstico antes de otro intento

Identificar capa: **fuente** (datos/fonts/template), **admisión** (pack/receta), **autoridad**,
**transporte/runtime**, **render** o **contenido visual/comercial**. Un fallo de una capa no se
resuelve cambiando silenciosamente otra. Conservar error redactado, identidad del recurso/run y
evidencia suficiente sin secretos; corregir causa en dueño canónico y volver a verificar el paso
afectado. No repetir todos los tests ni llamadas pagadas si no aportan evidencia nueva.
