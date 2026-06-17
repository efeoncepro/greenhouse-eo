---
paths:
  - "migrations/**"
---

# DB migrations — invariantes (auto-load por path)

Toda migration empieza con `-- Up Migration` exacto; DDL (CREATE/ALTER/INDEX/FUNCTION) **solo** en Up; el marker `-- Down Migration` es **solo** para undo (DROP/ALTER…DROP). **NUNCA** poner CREATE bajo Down (bug class ISSUE-068). **SIEMPRE** incluir un DO block anti pre-up-marker que aborte si el objeto esperado no quedó creado. **NUNCA** editar una migration ya aplicada (forward-fix con migration nueva idempotente). Detalle: CLAUDE.md §"Database — Migration markers".
