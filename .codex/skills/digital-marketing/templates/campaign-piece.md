# CMP-### · [Concepto] · [Ratio] · v[n]

Estado: [propuesta/piloto/revisión/aprobado/etc.] · Autor: [ ] · Aprobador y evidencia: [ ].

## Estrategia

Job/trigger: [ ] · Rol primario/segmento: [ ] · Rol secundario: [ ] · Etapa/señal previa: [ ].
Objeción del rol: [ ] · Argumento repetible/reenviable: [ ] · Fila del buying group en BRIEF: [ ].
Tensión: [ ] · Beneficio: [ ] · Prueba y permiso: [ ] · Exclusiones de promesa: [ ].
Hipótesis falsable/control: [ ] · KPI/guardrail/ventana: [ ].

## Copy literal editable

Etiqueta: [ ]
Entrada: [ ]
Dominante: [ ]
Cierre/apoyo: [ ]
CTA dentro de pieza: [ ]
Descriptor: [ ]
Texto de plataforma: [ ]
Headline de plataforma: [ ]
Botón nativo: [elegible por plataforma, verificar]
URL/UTM: [ ]

Campos opcionales pueden ser no aplica; no llenar voces para decorar. Registrar copy JSON fuente.

## Composición por placement

Plataforma/placement/medio: [ ] · Ratio/dimensiones: [ ].
Registro: [ ] · Palanca dominante: [ ] · Sujeto/acción/objeto digital: [ ].
Luz/material/color: [ ] · Fondo/lecho: [ ] · Firma: [ ].
Reservas titulares/apoyo/CTA/cursor/safe area: [referencia y fecha].
CTA estilo/tinta/superficie: [ ] · Cursor local/multiplayer y función: [ ].
Qué cambia respecto del master y por qué: [ ].

## Recursos y derechos

| Recurso | Ruta real | Vista/función | Hash | Permiso por canal | Verificación |
|---|---|---|---|---|---|
| Identidad/prenda/prop/espacio/firma/fuente | | | | | |

Referencias aprobadas comparables: [mínimo exigido por canon]. Restricciones y alternativa sin recurso bloqueado: [ ].

## 🔴 Recipe — tres capas, y sólo una depende del agente

> **El motor varía entre agentes.** Esta sesión produce con la CLI de Greenhouse; otro agente puede tener
> generación de imagen nativa y no necesitarla. **Una recipe que diga «corre este comando» es inservible
> para la mitad de la flota.** Por eso se separa lo que **no** puede cambiar de lo que sí.

### Capa 1 · RECURSOS — invariante, los necesita cualquier agente

| Recurso | Qué es | Dónde |
|---|---|---|
| **Referencia de identidad** | la vista EXACTA del kit, no «el kit» | ruta + `sha256` del `assets.lock.json` |
| **Ficha de escena** | la fuente de verdad del plate | `<pieza>.json` |
| 🎯 **Prompt resuelto** | **el puente portable entre vías** | `<pieza>.prompt.txt` |
| Tokens de color | `axisAdvertising` — nunca hex paralelos | `@efeoncepro/axis-tokens` |
| Fuentes | Bricolage · Poppins · Guttery | — |
| Plan de composición | copy, jerarquía, cursores, firma | `piezas-*.json` |

### 🔴 Cómo LLEGAR a la referencia — nombrarla no basta

Un agente con motor propio **tiene que adjuntar el archivo a su modelo**. Y hay dos trampas:

**1. Las referencias no vienen con un clone.** Los kits pesan ~640 MB y están **fuera de git**
(`.gitignore: /ai-generations/**/*.png`). Clonar el repo **no las trae**.

| Dónde conseguirla | Cuándo |
|---|---|
| **Ruta local del repo** — `ai-generations/<kit>/final/<vista>.png` | si esta máquina tiene el set completo |
| **Kit de recursos de la campaña** — `5. Contenidos/15. Paid Media/01. Recursos/<fecha>_<kit>/` | 🎯 **copias fijadas de la tanda**, pensadas justo para esto |
| OneDrive del kit original | si falta en las dos anteriores |

**2. Tu copia puede no ser la aprobada.** Por eso existe `scripts/foto/assets.lock.json`: sella el **sha256**
de cada referencia declarada y **entra a git** aunque los binarios no.

```bash
pnpm foto:assets:check     # ¿mi copia local coincide con la aprobada?
```
🔴 **Si el hash difiere, la referencia cambió y generar con ella produce una identidad distinta de la que el
equipo aprobó — y se ve perfectamente plausible.** Ése es el modo de falla: no revienta, miente.
**Verificar ANTES de generar, no después de dudar.**

`foto:assets:check` tolera ausentes para CI y sólo lee las rutas de catálogo. Además, verificar disponibilidad/lectura del archivo adjunto real y comparar su SHA-256 con la entrada del lock, especialmente si se usa una copia OneDrive. Registrar ruta de catálogo, ruta adjunta, hash esperado y observado. Un exit 0 no valida copias externas ni demuestra que una referencia ausente esté disponible.

⚠️ **En la ficha se anota la referencia con `sha256`, no sólo la ruta.** Una ruta dice dónde buscar; **el
hash dice si encontraste lo correcto.**

🎯 **Por qué el prompt resuelto es lo más importante de esta lista:** `foto:prompt` no «arma un texto» —
**inyecta el bloque anti-IA, el de impacto, la palanca con sus marcadores, la reserva del formato y el aviso
de derechos del partner**. Ese contenido **preserva las instrucciones de dirección**, y **es portable**: cualquier
motor puede consumirlo. 🔴 **Un agente con motor propio NO reescribe el prompt a mano: usa el resuelto.**

### Capa 2 · CONTRATO DE RESULTADO — invariante, se mide sobre la imagen

Se verifica sobre el **archivo**, no sobre la vía. **Da igual cómo se produjo.**

| Debe cumplir | Cómo se comprueba |
|---|---|
| Reservas del formato | `pnpm foto:validar <plate>` |
| Identidad **copiada**, no redibujada | comparación contra la referencia del kit |
| Ni una letra ni un número en utilería | inspección |
| Dominante **≥3×** la entrada | reportado al componer |
| CTA ≥4,5:1 · superficie ≥3:1 | `pnpm foto:cta:gate <plan>` |
| Safe zones del placement | ver canon de formatos |

### Capa 3 · VÍA DE PRODUCCIÓN — **ésta sí varía. Declarar cuál se usó**

- [ ] **Vía A · CLI Greenhouse** — `pnpm foto:prompt` → `pnpm ai:image` → `pnpm foto:validar`
- [ ] **Vía B · generación nativa del agente** — mismas referencias, **mismo prompt resuelto**, mismos gates
- [ ] **Vía C · otra** — declarar cuál y por qué

**Registrar siempre:** motor y versión · coste real o «no ejecutado» · si se desvió del prompt resuelto, **qué
se cambió y por qué**.

⚠️ **La equivalencia entre vías no se asume: se demuestra con los gates.** Dos vías que usan las mismas
referencias y el mismo prompt y pasan el mismo contrato **cumplen requisitos comunes; su fidelidad y equivalencia visual todavía requieren revisión**. Si una vía no
puede pasar un gate, **eso es un hallazgo que se documenta**, no un gate que se omite.

## Ejecución reproducible

Ficha compilador: [ruta] · Prompt íntegro emitido: [ruta] · Motor/modelo real: [ ].
Comando exacto y versión: [ ] · Cadena de ediciones/referencias: [ ].
Plate: [ ] · Copy/layout JSON: [ ] · SVG/capas: [ ] · Script/dependencias: [ ].
Exports/checksum: [ ] · Costo real o no ejecutado: [ ].
No guardar credenciales ni URLs temporales con secretos.

## QA y decisión

| Chequeo | Evidencia/medición | Estado | Corrección/owner |
|---|---|---|---|
| Copy/claims/destino | | pendiente | |
| Identidad/manos/pantallas | | pendiente | |
| Jerarquía/aire a 390 px y 100% | | pendiente | |
| Contraste mínimo local por elemento | | pendiente | |
| Firma dentro del lecho + zona segura | | pendiente | |
| Preview placement con interfaz | | pendiente | |
| Derechos/aprobación/medios | | pendiente | |
| Reproducción/cantidad/versión | | pendiente | |

Aprobación creativa [persona/fecha/evidencia], autorización paid [separada], publicación [ID o no publicada].
Decisión final, reparos y siguiente paso: [ ].
