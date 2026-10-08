# Revisar licitaciones públicas de LicitaLAB con la CLI

> **Tipo de documento:** Manual de uso
> **Versión:** 1.1
> **Creado:** 2026-09-17 por Claude (con Julio Reyes)
> **Última actualización:** 2026-10-08 por Codex
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

El agente clasifica por alcance real y fit: CRM y relacionados, diseño y servicios creativos, diseño web, SEO/AEO y licencias Claude/OpenAI cuando están dentro del pedido. Las licencias requieren revisar canal, condiciones de suministro, costo y margen; no se excluyen automáticamente. Un cierre próximo genera urgencia, no descarte automático.

Si pediste revisión amplia, cubre todas las categorías autorizadas y presenta las candidatas encontradas, sin reducir la investigación a cinco ni a las recomendadas. Declara filas, búsquedas, paginación, IDs únicos y documentos realmente leídos. `--max` limita la captura; no acredita cobertura nacional completa.

### 3. Elegir qué analizar

Puedes elegir códigos concretos. Si ya pediste analizar a fondo todas las oportunidades pertinentes, esa instrucción autoriza la investigación y no requiere una segunda selección para continuar.

### 4. Análisis de cada candidata

El agente corre, por candidata:

```bash
pnpm licitalab opportunity 1386073-21-LE26 --no-login
pnpm licitalab documents 1386073-21-LE26 --no-login
pnpm licitalab ask-docs 1386073-21-LE26 "requisitos de experiencia y equipo exigido" --no-login
pnpm licitalab ask-docs 1386073-21-LE26 "garantías de seriedad y fiel cumplimiento" --no-login
pnpm licitalab ask-docs 1386073-21-LE26 "criterios de evaluación y ponderación" --no-login
```

Y, si sirve, el historial del comprador o de un competidor:

```bash
pnpm licitalab provider 77.357.182-1 --period sc_last_year --include lost_items_pricing --no-login
```

### 5. Revisar la matriz y decidir

Recibes, por oportunidad: cada requisito como **cumple / no cumple / falta evidencia** con archivo y página,
riesgos, fechas clave y una recomendación GO / HOLD / NO-GO. Una señal se registra como lead hasta calificación; tener fit o urgencia no basta para crear un Deal calificado. Para escrituras CRM se requiere autorización del alcance concreto; si ya fue concedida, se ejecuta sin pedirla nuevamente. Reutilizar empresa/contacto, propiedades y segmentos activos, y verificar por lectura posterior. Los Deals existentes que el operador pidió conservar no se reclasifican por esta regla.

## Originales, expediente y presentación

`documents` y `ask-docs` ayudan a investigar, pero no prueban que los originales estén descargados ni reemplazan su lectura. Desde la ficha autenticada, guardar cada original sin modificar y verificar apertura, tipo, tamaño y hash. Compra Ágil usa `/search/agile/<código>`; una página vacía bajo `/search/details/` no prueba ausencia de documentos. Compra Ágil conserva su modalidad aunque una herramienta la agrupe junto a trato directo.

Archivar en `Licitaciones/<Empresa o institución>/<N>. <Nombre de la licitación>`, con originales, revisión, anexos completados y versiones separadas. Reutilizar la [ficha corporativa](../../commercial/EFEONCE_DATOS_PARA_LICITACIONES.md) y seguir el [manual de construcción](construir-una-licitacion.md) para declaraciones, firma autorizada y QA.

En Wherex, Mercado Público y las oportunidades descubiertas mediante LicitaLAB, la preparación no exige contacto previo del comprador. Usar el canal de consultas si existe; si no, documentar limitación y supuestos acordados y continuar. La postulación se realiza por la plataforma del proceso y requiere autorización específica; descargar o firmar anexos no equivale a presentar.

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
