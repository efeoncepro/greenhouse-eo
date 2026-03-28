# CODEX TASK — HRIS Fase 1A: Document Vault (Bóveda de Documentos)

## Delta 2026-03-27 — Alineación arquitectónica

- **TASK-026 es soft dependency**: el Document Vault puede avanzar sin contract type consolidation, pero las reglas de elegibilidad por `contract_type` no funcionarán hasta que TASK-026 agregue el campo canónico en `greenhouse_core.members`.
- **GCS pattern**: reutilizar el patrón de signed URLs de `src/lib/storage/greenhouse-media.ts` (ya operativo para logos/avatars). No duplicar el client de `@google-cloud/storage`.
- **Outbox events obligatorios**: registrar en `src/lib/sync/event-catalog.ts`:
  - Aggregate type: `memberDocument`
  - Eventos: `hr.document.uploaded`, `hr.document.verified`, `hr.document.expired`
  - Estos eventos alimentan audit trail y pueden triggerear `notification_dispatch` para alertas de expiración.

## Resumen

Implementar el **módulo de bóveda de documentos** del HRIS en Greenhouse. Permite a HR gestionar documentos del equipo (contratos, NDAs, certificados, licencias médicas) y a cada colaborador ver y subir sus propios documentos desde su portal self-service.

**El problema hoy:** No hay dónde almacenar ni gestionar documentos de colaboradores. Los contratos viven en Google Drive sin estructura. Los certificados vencen sin aviso. HR no tiene visibilidad centralizada de qué documentos tiene cada persona ni cuáles faltan.

**La solución:** Un módulo con dos superficies:
1. **`/my/documents`** — Vista self-service donde el colaborador ve sus documentos, sube nuevos (licencia médica, certificados) y ve el estado de verificación
2. **`/hr/documents`** — Vista admin donde HR ve documentos de todo el equipo, verifica documentos, detecta vencimientos próximos y documentos faltantes

**Storage:** Archivos en Google Cloud Storage (bucket `greenhouse-documents` en proyecto `efeonce-group`). PostgreSQL almacena solo metadatos y URL.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/hris-document-vault`
- **Documento rector:** `Greenhouse_HRIS_Architecture_v1.md` §4.1
- **Schema:** `greenhouse_hr` (ya existe)
- **Prerequisito:** `CODEX_TASK_HRIS_Contract_Type_Consolidation.md` (Fase 0.5)

### Documentos normativos

| Documento | Qué aporta |
|-----------|------------|
| `Greenhouse_HRIS_Architecture_v1.md` | Schema DDL §4.1, navegación §6, elegibilidad §5 |
| `GREENHOUSE_IDENTITY_ACCESS_V2.md` | Route groups `my` y `hr`, roles |
| `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` | GCP project, regions |
| `Greenhouse_Nomenclatura_Portal_v3.md` | Colores, labels, microcopy |
| `CODEX_TASK_HR_Core_Module.md` | Patrón de vistas HR, ficha del colaborador |

---

## Dependencias

| Dependencia | Estado | Impacto si no está |
|---|---|---|
| Fase 0.5 (contract types) | Prerequisito | Elegibilidad por contract_type no funciona sin este campo |
| `greenhouse_hr` schema en PostgreSQL | Existe | Tabla `member_documents` va aquí |
| GCS bucket `greenhouse-documents` | **Crear** | Blocker para upload |
| Route group `my` implementado | Existe | Self-service views |
| Route group `hr` implementado | Existe | Admin views |
| People 360 `/people/[memberId]` | Existe | Tab "Documentos" se agrega aquí |

---

## PARTE A: Infraestructura

### A1. GCS Bucket

```bash
gsutil mb -p efeonce-group -l us-central1 -c STANDARD gs://greenhouse-documents
gsutil uniformbucketlevelaccess set on gs://greenhouse-documents
gsutil lifecycle set lifecycle.json gs://greenhouse-documents
```

Lifecycle policy: mover a Nearline después de 365 días, eliminar después de 7 años (retención legal).

Service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` necesita rol `Storage Object Admin` en el bucket.

### A2. PostgreSQL Table

Según `Greenhouse_HRIS_Architecture_v1.md` §4.1 — tabla `greenhouse_hr.member_documents`. DDL ya definido en el documento de arquitectura. Crear tal cual.

### A3. Signed URL API

Para upload y download, usar **signed URLs** de GCS (no exponer el bucket directamente):
- Upload: `POST /api/hr/documents/upload-url` genera signed URL de escritura (expira en 15 min)
- Download: `GET /api/hr/documents/[documentId]/download` genera signed URL de lectura (expira en 1 hora)

---

## PARTE B: API Routes

### B1. `POST /api/hr/documents/upload-url`

Genera signed URL para upload directo a GCS desde el browser.

**Request:** `{ member_id: string, file_name: string, mime_type: string }`
**Response:** `{ upload_url: string, file_path: string }` (file_path = GCS object key)
**Auth:** `collaborator` (solo para sí mismo) o `hr_manager` / `efeonce_admin` (para cualquiera)

### B2. `POST /api/hr/documents`

Registra el documento en PostgreSQL después de que el upload a GCS se completó.

**Request:**
```typescript
{
  member_id: string
  document_type: DocumentType
  file_name: string
  file_url: string          // GCS path from upload-url response
  file_size_bytes?: number
  mime_type: string
  description?: string
  expires_at?: string       // ISO date
  is_confidential: boolean
}
```
**Auth:** `collaborator` (solo para sí mismo, tipos limitados) o `hr_manager` / `efeonce_admin` (cualquier tipo)

Tipos que un colaborador puede subir por sí mismo: `licencia_medica`, `certificado`, `titulo`, `otro`.
Tipos que solo HR puede subir: `contrato`, `anexo_contrato`, `nda`, `cedula_identidad`.

### B3. `GET /api/hr/documents`

Lista documentos. Filtros: `member_id`, `document_type`, `is_expired`, `is_verified`.
**Auth:** `collaborator` (solo `?member_id=me`) o `hr_manager` / `efeonce_admin` (cualquier filtro)

### B4. `GET /api/hr/documents/[documentId]`

Detalle de un documento.
**Auth:** Owner o `hr` / `admin`.

### B5. `GET /api/hr/documents/[documentId]/download`

Genera signed URL de lectura.
**Auth:** Owner (si no es confidential) o `hr` / `admin` (siempre).

### B6. `PATCH /api/hr/documents/[documentId]/verify`

HR marca un documento como verificado.
**Request:** `{ verified: boolean }`
**Auth:** `hr_manager` / `efeonce_admin` only.

### B7. `DELETE /api/hr/documents/[documentId]`

Soft delete (marca inactive, no borra de GCS).
**Auth:** Owner (solo si no verificado) o `hr` / `admin`.

### B8. `GET /api/hr/documents/expiring`

Documentos que vencen en los próximos N días.
**Request:** `?days=30` (default)
**Auth:** `hr_manager` / `efeonce_admin`.

---

## PARTE C: Vistas UI

### C1. `/my/documents` — Mis documentos (self-service)

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Mis documentos" + botón "Subir documento"       │
├──────────────────────────────────────────────────────────┤
│  Filtros: [Tipo ▾] [Estado ▾]                              │
├──────────────────────────────────────────────────────────┤
│  Tabla:                                                    │
│  | Nombre archivo | Tipo | Subido | Vence | Estado |       │
│  | contrato_2024  | Contrato | 15/01/24 | — | ✓ Verificado│
│  | licencia_mar   | Lic. médica | 05/03/26 | — | Pendiente│
│  | cert_figma     | Certificado | 10/02/26 | 10/02/27 | ✓│
└──────────────────────────────────────────────────────────┘
```

**Empty state:** "No tienes documentos registrados aún. Cuando HR suba tu contrato o necesites adjuntar un certificado, aparecerán aquí."

**Upload flow:** Botón → Drawer con selector de tipo (solo tipos permitidos para collaborator), input de archivo, fecha de vencimiento (opcional), descripción (opcional). Al guardar: genera signed URL → upload a GCS → registra en PostgreSQL.

### C2. `/hr/documents` — Documentos del equipo (admin)

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Documentos del equipo"                          │
├──────────────────────────────────────────────────────────┤
│  Alert cards:                                              │
│  [🔴 3 documentos vencidos] [🟡 5 vencen este mes]        │
│  [📋 2 pendientes de verificación]                        │
├──────────────────────────────────────────────────────────┤
│  Filtros: [Persona ▾] [Tipo ▾] [Estado ▾] [Vencimiento ▾]│
├──────────────────────────────────────────────────────────┤
│  Tabla:                                                    │
│  | Colaborador | Archivo | Tipo | Subido | Vence | Estado │
│  | Melkin H.   | contrato | Contrato | 15/01 | — | ✓     │
│  | Andrés C.   | cert_gcp | Certificado | 10/02 | 10/02/27│
└──────────────────────────────────────────────────────────┘
```

**Acciones masivas:** Verificar múltiples documentos, exportar lista de documentos faltantes.

### C3. People 360 — Tab "Documentos"

Agregar tab "Documentos" en `/people/[memberId]` que muestra los documentos de esa persona con las mismas columnas que C2 pero filtrado por member. Incluye botón "Subir documento" (solo si el viewer tiene rol `hr` o `admin`).

---

## PARTE D: TypeScript Types

```typescript
// src/types/hr-documents.ts

export type DocumentType =
  | 'contrato'
  | 'anexo_contrato'
  | 'nda'
  | 'licencia_medica'
  | 'certificado'
  | 'cedula_identidad'
  | 'titulo'
  | 'otro'

export const COLLABORATOR_UPLOADABLE_TYPES: DocumentType[] = [
  'licencia_medica', 'certificado', 'titulo', 'otro'
]

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  contrato: 'Contrato',
  anexo_contrato: 'Anexo de contrato',
  nda: 'NDA',
  licencia_medica: 'Licencia médica',
  certificado: 'Certificado',
  cedula_identidad: 'Cédula de identidad',
  titulo: 'Título profesional',
  otro: 'Otro',
}

export interface MemberDocument {
  document_id: string
  member_id: string
  member_name?: string
  document_type: DocumentType
  file_name: string
  file_url: string
  file_size_bytes: number | null
  mime_type: string | null
  description: string | null
  expires_at: string | null
  is_expired: boolean            // Computed: expires_at < today
  is_confidential: boolean
  uploaded_by: string
  uploaded_by_name?: string
  verified_by: string | null
  verified_at: string | null
  is_verified: boolean           // Computed: verified_by IS NOT NULL
  created_at: string
}
```

---

## PARTE E: File structure

```
src/
├── app/
│   └── [lang]/
│       └── (dashboard)/
│           ├── my/
│           │   └── documents/
│           │       └── page.tsx
│           └── hr/
│               └── documents/
│                   └── page.tsx
├── app/
│   └── api/
│       └── hr/
│           └── documents/
│               ├── route.ts                     # GET (list), POST (register)
│               ├── upload-url/
│               │   └── route.ts                 # POST (signed URL)
│               ├── expiring/
│               │   └── route.ts                 # GET (expiring soon)
│               └── [documentId]/
│                   ├── route.ts                 # GET (detail), DELETE (soft)
│                   ├── download/
│                   │   └── route.ts             # GET (signed download URL)
│                   └── verify/
│                       └── route.ts             # PATCH (verify)
├── views/
│   └── greenhouse/
│       └── hr-documents/
│           ├── MyDocumentsView.tsx
│           ├── TeamDocumentsView.tsx
│           ├── DocumentUploadDrawer.tsx
│           ├── DocumentTable.tsx
│           ├── DocumentExpiryAlerts.tsx
│           └── PersonDocumentsTab.tsx           # For People 360
├── lib/
│   └── hr-documents/
│       ├── queries.ts                           # PostgreSQL queries
│       ├── gcs-signed-urls.ts                   # Signed URL generation
│       └── document-eligibility.ts              # Who can upload what types
└── types/
    └── hr-documents.ts
```

---

## PARTE F: Orden de ejecución

### Fase 1: Infraestructura
1. Crear GCS bucket `greenhouse-documents`
2. Crear tabla `greenhouse_hr.member_documents`
3. Crear TypeScript types
4. Crear `gcs-signed-urls.ts` utility

### Fase 2: APIs
5. `POST /api/hr/documents/upload-url`
6. `POST /api/hr/documents` (register)
7. `GET /api/hr/documents` (list with filters)
8. `GET /api/hr/documents/[documentId]` (detail)
9. `GET /api/hr/documents/[documentId]/download`
10. `PATCH /api/hr/documents/[documentId]/verify`
11. `DELETE /api/hr/documents/[documentId]`
12. `GET /api/hr/documents/expiring`

### Fase 3: UI
13. `MyDocumentsView.tsx` + `DocumentTable.tsx` + `DocumentUploadDrawer.tsx`
14. `TeamDocumentsView.tsx` + `DocumentExpiryAlerts.tsx`
15. `PersonDocumentsTab.tsx` (People 360 tab)

---

## Criterios de aceptación

- [ ] GCS bucket `greenhouse-documents` creado con lifecycle policy
- [ ] Tabla `greenhouse_hr.member_documents` creada en PostgreSQL
- [ ] Upload funciona: signed URL → GCS → registro en PG
- [ ] Download funciona: signed URL de lectura con expiración
- [ ] Colaborador solo puede subir tipos permitidos (`licencia_medica`, `certificado`, `titulo`, `otro`)
- [ ] HR puede subir cualquier tipo para cualquier persona
- [ ] Documentos confidenciales solo visibles para HR/admin, no para el propio colaborador
- [ ] Alerta de vencimientos próximos funciona en vista admin
- [ ] Tab "Documentos" aparece en People 360
- [ ] Soft delete no borra archivo de GCS

## Lo que NO incluye

- OCR de documentos
- Firma electrónica
- Templates de contratos
- Integración con DocuSign o similar
- Versionamiento de documentos (si se sube una versión nueva, es un documento nuevo)

## Notas para el agente

- **Signed URLs son obligatorias.** Nunca expongas el bucket directamente ni pases archivos por la API de Next.js. El browser sube directo a GCS via signed URL.
- **`is_confidential` controla visibilidad**, no acceso. Un documento confidencial no aparece en la vista self-service del colaborador — solo HR/admin lo ve.
- **Branch naming:** `feature/hris-document-vault`.

---

*Efeonce Greenhouse™ · Efeonce Group · Marzo 2026*
