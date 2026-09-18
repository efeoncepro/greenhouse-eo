# Revisar licitaciones públicas de LicitaLAB con la CLI

> **Tipo de documento:** Manual de uso
> **Versión:** 1.0
> **Creado:** 2026-09-17 por Claude (con Julio Reyes)
> **Última actualización:** 2026-09-17 por Claude
> **Documentación técnica:** skill `greenhouse-public-private-tenders` → `licitalab-mcp.md` (receta 0 y §API key + CLI) · cliente `src/lib/commercial/tenders/licitalab/client.ts` · CLI `scripts/commercial/licitalab.ts`

## Para qué sirve

Encontrar licitaciones públicas en LicitaLAB, filtrar las que calzan con Efeonce y leer sus bases con evidencia
(archivo y página) antes de decidir si postular. El trabajo pesado lo hace un agente (Claude o Codex) con el
comando `pnpm licitalab`; tú eliges qué analizar y decides GO / HOLD / NO-GO.

LicitaLAB cubre **solo compras públicas** (Mercado Público y otros portales estatales). Los RFP privados se revisan
por su propio canal (por ejemplo, Wherex).

## Antes de empezar

Se configura una sola vez:

1. **Credencial de LicitaLAB** (cuenta `@efeoncepro.com`). En tu terminal:
   ```bash
   pnpm licitalab:radar:setup
   ```
   Pide correo y clave; la clave no se ve al escribirla y queda en `.auth/` con permisos solo para tu usuario.
2. **API key**: ya está en Secret Manager (`greenhouse-licitalab-api-key`) y en `.env.local`
   (`LICITALAB_API_KEY_SECRET_REF`). No requiere acción.
3. Comprueba el estado:
   ```bash
   pnpm licitalab session
   ```

Hay tres credenciales y cada una cubre algo distinto:

| Credencial | Qué habilita | Dura |
|---|---|---|
| API key (Secret Manager) | `documents`, `ask-docs`, `support`, `tools` | No vence |
| Sesión OAuth (`pnpm licitalab login`) | `opportunity`, `provider`, `search --enrich` | 7 días |
| Sesión web del radar (se abre con `search`) | `search` | La que defina LicitaLAB |

## Paso a paso

### 1. Pedir la búsqueda al agente

Ejemplos de pedido:

- «Busca oportunidades de marketing y comunicación en LicitaLAB y dame las 5 mejores candidatas.»
- «Revisa mis recomendadas de LicitaLAB y descarta lo que no sea servicio de Efeonce.»

El agente ejecuta, por ejemplo:

```bash
pnpm licitalab search --view all --max 200 --match "marketing" --enrich --no-login
```

- `--view recommended` usa tus recomendadas; `--view all`, el listado completo.
- `--match` filtra lo que se recolectó (sin tildes ni mayúsculas). **No busca dentro de LicitaLAB**: si algo no
  está entre las primeras `--max` filas, no aparece.
- `--enrich` agrega a cada resultado su ficha (estado, monto, cierre) y cuántos documentos se pueden leer.

### 2. Recibir la lista corta

El agente descarta lo que no es de Efeonce (licencias de software, equipos, bienes) y lo que cierra demasiado
pronto, y te muestra 3 a 5 candidatas con código, comprador, monto, cierre y una línea de por qué.

### 3. Elegir qué analizar

Responde con los códigos que quieres revisar a fondo. El agente no analiza en masa sin tu elección.

### 4. Análisis de cada candidata

El agente corre, por candidata:

```bash
pnpm licitalab opportunity 1386073-21-LE26
pnpm licitalab documents 1386073-21-LE26
pnpm licitalab ask-docs 1386073-21-LE26 "requisitos de experiencia y equipo exigido"
pnpm licitalab ask-docs 1386073-21-LE26 "garantías de seriedad y fiel cumplimiento"
pnpm licitalab ask-docs 1386073-21-LE26 "criterios de evaluación y ponderación"
```

Y, si sirve, el historial del comprador o de un competidor:

```bash
pnpm licitalab provider 77.357.182-1 --period sc_last_year --include lost_items_pricing
```

### 5. Revisar la matriz y decidir

Recibes, por oportunidad: cada requisito como **cumple / no cumple / falta evidencia** con archivo y página,
riesgos, fechas clave y una recomendación GO / HOLD / NO-GO. Tú decides. Solo con tu confirmación se crea la
oportunidad en Greenhouse o el deal en HubSpot.

## Qué significan las señales

| Señal | Significado |
|---|---|
| `[82%]` en la búsqueda | Score de LicitaLAB. Ordena la lista; **no es un GO**. |
| `✓` / `✗` en documentos | `✓` se puede consultar con `ask-docs`; `✗` (p. ej. Excel) no: hay que abrirlo a mano. |
| `status=ok` / `partial` | Hay texto; `partial` avisa que faltan documentos por indexar. |
| `status=indexing` | LicitaLAB recién empezó a leer las bases. Reintenta en 30–60 s. |
| `status=empty` / `unsupported` | No hay texto legible o ese tipo/país no se puede leer. |
| «Hay varias oportunidades con ese código» | Mismo código en más de un organismo: repite con `--type` o `--buyer`. |
| Exit `3` + «no hay sesión» | Venció la sesión: ver problemas comunes. |

## Qué no hacer

- No tomes el score de LicitaLAB ni un resumen del agente como decisión: el GO exige leer bases, admisibilidad y
  margen sobre el costo real.
- No interpretes «ask-docs no lo encontró» como «las bases no lo exigen»: es **falta de evidencia**.
- No pegues la contraseña de LicitaLAB en el chat ni en archivos: se guarda solo con `pnpm licitalab:radar:setup`.
- No uses LicitaLAB para licitaciones privadas.
- No pidas al agente postular, ofertar ni escribir en HubSpot sin tu confirmación explícita.

## Problemas comunes

| Problema | Qué hacer |
|---|---|
| «La sesión web de LicitaLAB no está vigente» | En tu terminal: `pnpm licitalab search --headed`. Entra solo con la credencial guardada. |
| «No hay sesión OAuth vigente» | En tu terminal: `pnpm licitalab login`. |
| El agente pide que ejecutes un login | Es esperado: el agente nunca ingresa la contraseña. Corre el comando y avísale. |
| `zsh: parse error` o «no such file» | Reemplaza los marcadores `<código>`/`<RUT>` por valores reales, sin `<` ni `>`. |
| El botón Run del chat dice que la terminal no estaba lista | Escribe el comando directamente en la pestaña de Terminal. |
| `--match` no encuentra algo que sabes que existe | Sube `--max` (hasta 500) o usa `--view all`. |
| «LicitaLAB no está configurado» | Falta `LICITALAB_API_KEY_SECRET_REF` en `.env.local` o permiso sobre el secret. |
| macOS pide permisos de privacidad al abrir Chrome | Ajustes del Sistema → Privacidad y seguridad (Red local / Automatización) → permitir Chrome y la terminal. |

## Referencias técnicas

- Receta del agente y límites: `.claude/skills/greenhouse-public-private-tenders/licitalab-mcp.md` (receta 0).
- Radar web: `.claude/skills/greenhouse-public-private-tenders/licitalab-radar-playwright.md`.
- Cliente: `src/lib/commercial/tenders/licitalab/client.ts` · CLI: `scripts/commercial/licitalab.ts`
  (`licitalab-oauth.ts`, `licitalab-search.ts`, `licitalab-format.ts`).
- Decisión GO / NO-GO: skill `greenhouse-public-private-tenders` → `bid-lifecycle-go-no-go.md`.
