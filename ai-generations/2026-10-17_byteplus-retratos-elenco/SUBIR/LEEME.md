# Paquete para la biblioteca de retratos virtuales de BytePlus — 2026-10-17

12 imágenes = 12 assets en 6 grupos (uno por personaje). Cupo: 50 assets / 50 grupos (plan Entry gratuito).
Reglas, orden y registro: `docs/operations/creative-production/BYTEPLUS_VIRTUAL_PORTRAIT_LEDGER_V1.md`.

**Cuenta obligatoria:** Google SSO `jreyes@efeoncepro.com`, Account ID **`3004839361`**, root `jreyes`, proyecto
`default`. Verificar Account antes de subir. Las cargas anteriores y sus IDs pertenecen a **`3003660328`**:
son históricas y no sirven para la API de producción. Julio prohibió volver a usar esa cuenta. KYC de la correcta
aprobado el 2026-10-17 16:57:32 UTC; Entry gratuito activo desde 17:37 UTC, carta aceptada tras la orden
posterior «Firmala» y código entregado por Julio. **Lote completo: 12 assets Active en 6 grupos de esta cuenta**,
con referencia y primer cuadro de Antonio exitosos. IDs y evidencias en el ledger. No volver a subir el lote.
No comprar ni cambiar plan.

| Grupo (nombre en consola) | Archivos | Origen |
|---|---|---|
| Antonio — elenco Efeonce | antonio-1-rostro.png, antonio-2-cuerpo.png | Edición GPT Image 2.5 Sunburst desde `_identidad-elenco/antonio/` (rostro desde `antonio-elegida.png`, v3a) |
| Nexa — Efeonce | nexa-1-rostro.png, nexa-2-cuerpo.png | `_identidad-nexa/5-expresiones-frente/nexa-expr-06-neutra-reposo.png` y `1-anclas/nexa-ancla-5-cuerpo-frontal.png` |
| Hum — elenco Efeonce | hum-1-rostro.png, hum-2-cuerpo.png | Edición desde `_identidad-elenco/hum/` |
| Isabella — elenco Efeonce | isabella-1-rostro.png, isabella-2-cuerpo.png | Edición desde `_identidad-elenco/isabella/` |
| Karo — elenco Efeonce | karo-1-rostro.png, karo-2-cuerpo.png | Edición desde `_identidad-elenco/karo/` |
| Sophia — elenco Efeonce | sophia-1-rostro.png, sophia-2-cuerpo.png | Edición desde `_identidad-elenco/sophia/` |

Todas cumplen: PNG, 300–6000 px, proporción 0,4–2,5, < 30 MB. QA hecho: cara al 100 % (Antonio rehecho por la
textura craquelada; Hum conserva su piercing, Isabella sus pecas) y proporción de cuerpo medida con Vision
(Antonio 7,29 · Hum 7,27 · Isabella 7,82 · Karo 7,61 · Sophia 7,45 cabezas; piso 7,2). Checksums en `SHA256SUMS`.

## Orden autorizado y ejecutado (no repetir)
1. **Antonio primero, solo.** Esperar `Active`, anotar su fila en el ledger y probar un borrador 480p:
   `pnpm ai:byteplus --model seedance25 --draft --references --image asset://<asset-id-rostro> --image asset://<asset-id-cuerpo> --prompt-file <toma.txt> --duration 4 --out borrador.mp4 --yes`
   (en el prompt: «Image 1» / «Image 2», nunca el id). Probar también primer cuadro (sin `--references` y sólo rostro),
   validado en este lote como prueba técnica. Confirmar en la consola que el contador bajó 2 assets y 1 grupo.
2. **Sólo si funciona la prueba como referencia (3a)**, subir Nexa y luego Hum, Isabella, Karo y Sophia, anotando
   cada fila. Guardar el resultado de ambas pruebas aunque fallen. La activación de Entry por sí sola no autoriza
   dar por exitosa la inferencia. Si la UI sólo muestra `warehoused`, no registrarlo como `Active`.

## Firma y autorización por cuenta
- La carta histórica se firmó al activar el plan **en `3003660328`**, con un código por correo
  (2026-10-17 07:53 UTC). Julio entregó el código y Codex lo ingresó con su autorización. Esa firma no habilita
  la cuenta correcta y no autoriza volver a operar la incorrecta.
- En **`3004839361`** se cumplió la condición inicial: detenerse ante la carta y avisar a Julio. Después Julio
  ordenó expresamente **«Firmala»** y entregó el código. Carta y verificación completadas el 2026-10-17
  **17:37 UTC**; Entry activo **Free**, inicialmente **0/50 assets y 0/50 grupos utilizados** (antes de las cargas).
- Esa autorización corresponde a la carta ya aceptada. **Si aparece otra carta, detenerse y avisar a Julio**;
  no deducir autorización permanente ni ampliar el permiso a compras o cambios de plan.

## Cierre verificado — 2026-10-17
Julio habilitó `Allow access to file URLs` en Chrome; la carga por selector funcionó. Se completó Antonio primero,
se comprobó `Active` en sus dos assets y se ejecutaron las dos pruebas a 480p/4 s: ambas `succeeded`.
Después se cargaron Nexa, Hum, Isabella, Karo y Sophia en ese orden. **Sólo estos 12 PNG, 6 grupos, todos Active**
en `3004839361`, proyecto `default`; disponibles **38 assets y 44 grupos**. La UI muestra `warehoused`, pero
el estado `Active` fue verificado en respuestas `ListAssets`, sin conservar secretos ni URLs firmadas.
Videos y evidencia fuera del repo: `/Users/jreye/Documents/BytePlus-Asset-Service-2026-10-17/`.

## Evidencia (carta de compromiso)
Proceso y fuentes: `../prompts/` (prompts de esta edición), `../*/*.log` (registros de generación con modelo y uso),
`../*/` (intermedias y descartes), `ai-generations/_identidad-elenco/` y `_identidad-nexa/` (sets aprobados con sus
LEEME), `ai-generations/2026-10-02_elenco-efeonce/` (casting y realismo v3) y el canon `gs://efeonce-creative-canon`.
