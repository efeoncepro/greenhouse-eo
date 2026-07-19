# TASK-1485 — Globe Pattern Lifecycle Flow

1. Product task busca registry y decide `reuse | extend | new`.
2. Si `new/extend`, crea proposal con use case, owner, anatomy, states, a11y, responsive y motion.
3. Registry crea versión `candidate`; Pattern Lab publica fixtures y consumers pilot.
4. GVC/a11y/conformance validan source, behavior y evidence.
5. Owner promueve a `trial` o `stable`; decisión y consumers quedan versionados.
6. Breaking change crea versión/migration; deprecation precede retirement.

Greenhouse ejecuta gobierno/gates; Globe implementa y decide su lenguaje dentro de esos gates. Ningún paso
copia un pattern Greenhouse como default.
