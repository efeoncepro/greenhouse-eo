> **Tipo de documento:** Manual de uso (operador)
> **Version:** 1.0
> **Creado:** 2026-05-10 por Claude
> **Ultima actualizacion:** 2026-05-10 por Claude
> **Documentacion tecnica:** [CLAUDE.md §Azure Infra Release Gating invariants (TASK-853)](../../../CLAUDE.md), [Spec TASK-853](../../tasks/in-progress/TASK-853-azure-infra-release-gating.md), [Runbook production-release.md §6.1](../../operations/runbooks/production-release.md)

# Azure Infra Release Gating

## Para que sirve

Greenhouse despliega 2 stacks en Azure: **Logic Apps** (Teams notifications, `infra/azure/teams-notifications/`) y **Bot Service** (Greenhouse Teams Bot, `infra/azure/teams-bot/`). Antes de TASK-853, cada release production reaplicaba Bicep aunque no hubiese cambios — riesgo innecesario porque reapply puede ser destructivo (delete-on-deletion semantics, federated credential rotation, App Service config reset).

Con TASK-853, los workflows Azure operan con **gating canónico**: el Bicep apply real solo corre si hay cambios reales en `infra/azure/<sub>/**` o si vos forzás el deploy explícitamente. El **health check** Azure (verificar que WIF + providers + Resource Group siguen vivos) corre **siempre** como preflight.

## Antes de empezar

- Tener capability `platform.release.execute` (EFEONCE_ADMIN o DEVOPS_OPERATOR) si vas a disparar via orchestrator.
- Si vas a usar `force_infra_deploy=true`: estar seguro de que el Bicep template está correcto (corré `az deployment group what-if` local primero).
- Verificar que tenés acceso al tenant Azure `a80bf6c1-7c45-4d70-b043-51389622a0e4` (efeoncepro).

## Como se dispara

### Modo automático (push:main con cambios Bicep)

Pusheás un commit a main que toca `infra/azure/teams-notifications/**` o `infra/azure/teams-bot/**` → el path filter del workflow lo gatilla → deploy automático.

### Modo orchestrator (default cuando promovés release con TASK-851)

Cuando disparás `production-release.yml` con un `target_sha`:

1. El orchestrator invoca los 2 Azure workflows via `workflow_call` en paralelo con los workers Cloud Run.
2. Cada Azure workflow corre los 5 jobs canónicos:
   - `health-check` (siempre): WIF login + provider register + RG ensure
   - `validate`: `az bicep build --file <main.bicep>` lint
   - `diff-detection`: decide `should_deploy` comparando `git diff origin/main~1...target_sha -- 'infra/azure/<sub>/**'`
   - `deploy` (condicional): `az deployment group create`
   - `skip-deploy-summary` (alternativa): annotation explícita `::notice::` + `GITHUB_STEP_SUMMARY`
3. Si no hay diff Y no pasaste `force_infra_deploy=true` → **skip silencioso annotation**: el GitHub workflow summary te dice por qué se skipeó.

### Modo force (operator override)

Cuando el Bicep template necesita reapply incluso sin diff (e.g. parametros cambiaron en el repo de configs externas, o necesitás reaplicar después de manual rollback):

```bash
gh workflow run production-release.yml \
  -f target_sha=<sha> \
  -f force_infra_deploy=true
```

O directo a un workflow Azure individual:

```bash
gh workflow run azure-teams-deploy.yml \
  -f environment=production \
  -f force_infra_deploy=true
```

## Que significa cada estado

| Job result | Significa | Acción |
|---|---|---|
| `health-check` ✓ + `deploy` ✓ | Bicep apply ejecutado, todo verde | Verificar smoke (Teams Bot + Logic Apps respondiendo) |
| `health-check` ✓ + `skip-deploy-summary` ✓ | Bicep skipeado por no-diff (esperado) | Nada — el WIF y providers siguen vivos |
| `health-check` ✗ | WIF roto, provider no registrado, o RG borrado | Investigar antes de re-run; ver §6.2 del runbook para WIF subjects |
| `validate` ✗ | Bicep template tiene error de sintaxis | Fix en repo + re-push |
| `deploy` ✗ | Bicep apply falló | Revisar Azure portal → Resource Group → Deployments para ver el error |

## Que NO hacer

- **NUNCA** correr `az deployment group create` directo a producción sin haber corrido `az deployment group what-if` primero. Reapply de Bicep puede ser destructivo.
- **NUNCA** modificar el flag `force_infra_deploy` para que sea `true` por default. Es opt-in explícito por la razón anterior.
- **NUNCA** disparar el workflow Azure manualmente con `--force_infra_deploy=true` sin haber verificado que el Bicep template + parameters están correctos.
- **NUNCA** rotar federated credentials sin avisar — los workflows fallarán inmediatamente con error de auth.
- **NUNCA** borrar el Resource Group manualmente — `health-check` lo recreará pero perderás los recursos dentro.

## Problemas comunes

| Síntoma | Causa probable | Fix |
|---|---|---|
| `health-check` falla con "AADSTS70021: No matching federated identity record found" | Falta el subject WIF para el contexto actual | Agregar federated credential via `az ad app federated-credential create` (ver §6.2 del runbook) |
| `diff-detection` no detecta cambios obvios | `target_sha` no es descendiente de `origin/main~1` | Verificar git history; si es push:main, el path filter ya filtró |
| Bicep apply falla con "DeploymentFailed" + ProvisioningState=Failed | Recurso conflictivo, naming colision, quota exceeded | `az deployment group show --resource-group <rg> --name <deploy>` para ver el error específico |
| `skip-deploy-summary` se ejecutó pero esperabas que aplicara | Forgot to set `force_infra_deploy=true` o no había diff real | Re-run con `--force_infra_deploy=true` si querés forzar |
| 2 jobs Azure quedan `pending` por minutos | `secrets: inherit` no resuelve AZURE_* en el environment correcto | Verificar que el approval-gate del orchestrator ya pasó (mismo environment production) |

## Referencias técnicas

- Spec: [TASK-853](../../tasks/in-progress/TASK-853-azure-infra-release-gating.md)
- Workflows: [.github/workflows/azure-teams-deploy.yml](../../../.github/workflows/azure-teams-deploy.yml), [.github/workflows/azure-teams-bot-deploy.yml](../../../.github/workflows/azure-teams-bot-deploy.yml)
- Orchestrator wiring: [.github/workflows/production-release.yml](../../../.github/workflows/production-release.yml) (jobs `deploy-azure-*`)
- Bicep templates: [infra/azure/teams-notifications/main.bicep](../../../infra/azure/teams-notifications/main.bicep), [infra/azure/teams-bot/main.bicep](../../../infra/azure/teams-bot/main.bicep)
- CLAUDE.md sección "Azure Infra Release Gating invariants (TASK-853)"
- Runbook production-release: [production-release.md](../../operations/runbooks/production-release.md) §6.1, §6.2, §6.3
- Manual orchestrator: [release-orchestrator.md](release-orchestrator.md)
