# Dots — otras superficies de OpenAI y el dot del operador · 2026-10-22

Complemento de `../LEEME.md`, que extrajo el motor `orbit-character` de `/Applications/ChatGPT.app` 26.1016 y
renderizó sus 108 presets. Aquí se revisó **todo lo demás** de OpenAI en esta Mac y en la web pública, buscando
dots que no estén entre esos 108 y el dot propio del operador. Sólo lectura; no se copiaron credenciales, tokens,
cookies ni URLs firmadas.

## Qué se revisó

| Superficie | Resultado |
|---|---|
| `/Applications` | Sólo `ChatGPT.app` (bundle `com.openai.codex` 26.1016), ya extraída. No hay Atlas, Sora ni otra app de OpenAI. |
| Actualización descargada por Sparkle (`~/Library/Caches/com.openai.codex/…/ChatGPT.app`) | Es **más vieja** (26.1007, build 20398). Trae el mismo motor (`orbit-character`, `aeon-appearance-picker`). No aporta dots nuevos. |
| `~/.codex/.codex-global-state.json` (estado de la app ChatGPT/Codex) | **Aquí está el dot del operador** (ver abajo). `cloud-pet-artwork-cache` está vacío y `~/.codex/pets/` también. |
| Cachés HTTP de Codex (`~/Library/Caches/Codex`, `~/Library/Application Support/Codex`, particiones) | Sólo llamadas a `backend-api/ps/orbit/<thread>/slack` (mensajería del dot), sin arte. El render del dot (`sediment://file_…0530820e…`) **no está en caché**. |
| `~/Library/Caches/com.openai.chat`, `WebKit/com.openai.chat`, `Group Containers/group.com.openai.chat`, `Containers/com.openai.chat.Widgets` | Restos de la app nativa anterior de ChatGPT. Sin `orbit`, `aeon` ni dots. |
| Extensiones de editor | `openai.chatgpt-26.1007` y `openai.codex-audio-26.1007` en `~/.vscode/extensions`; nada en Cursor ni Windsurf. Anteriores al motor de dots. |
| Web pública | `openai.com/index/introducing-dots` responde 403 a herramientas automáticas (sus medios ya están en `../fuente/openai-com/`). No hay repositorio público `orbit-character`. Ninguna fuente pública anuncia presets nuevos después del 29-09-2026. |

**Conclusión: no aparecieron dots fuera de los 108 presets del motor.** Si el operador ve más dots en la app, lo más
probable es que sean **combinaciones armadas por otras personas** (formas × colores × ojos × lentes × accesorios) o
presets que OpenAI publique en una versión posterior a 26.1016.

## El dot del operador: «Friday»

`dot-del-operador.json` guarda sólo la apariencia, leída del caché `cloud-aeon-sidebar-cache-v1` de la app
(6 conversaciones, **un único dot**):

| Campo | Valor |
|---|---|
| Nombre | **Friday** |
| Base | personaje «Here» **Alfred** (`hereCharacter: alfred`) |
| Forma · color | `rounded_triangle` · `yellow` |
| Ojos · lentes | `sleepy_lids` · `tall_oval_frames` |
| Accesorio | `bow` (corbatín), color por defecto |
| Profundidad | 0,5 |
| Creado | 2026-10-01 |

**Verificado con el motor sin modificar:** al armar esa apariencia, los bytes ORBAST1 resultantes son **idénticos**
a `presetAppearance('alfred')` (`render.json` → `igualAlPresetAlfred: true`). Es decir, **Friday es Alfred con otro
nombre**: visualmente es el preset `002-alfred` que ya está en la serie.

- `dot-del-operador/friday-frente-neutro-1600.png` — render oficial `captureNeutral` a 1600 px, fondo transparente.
- `dot-del-operador/friday-estado-orbast1.b64` — el estado del motor, para volver a cargarlo.
- `hoja-de-contacto.png` — Friday junto al preset Alfred.

## Huecos

- **Tres cuartos:** la reacción «firma» se aceptó (`reaccion: 0`) pero los 16 cuadros capturados salieron sin giro
  visible (apartados en `descartado-firma-sin-giro/`). Para un giro real, usar los cuadros `alfred-firma-*` de
  `../fuente/app-chatgpt/orbit-movimiento/` o el trabajo de giros del motor que otra corrida está haciendo en `../motor/`.
- El snapshot de 512 px que la app guarda en los servidores de OpenAI no se descargó: su URL está firmada y expiró.

Script: `brief/render-dot-operador.mjs` (usa `../brief/motor-harness.mjs`).
