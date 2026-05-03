'use client'

// TASK-743 — DEPRECATED.
//
// `BonusInput` was the ad-hoc input+slider primitive for payroll bonus cells.
// It is replaced by `<InlineNumericEditor>` (canonical primitive that respects
// the table density contract and lives at
// `src/components/greenhouse/primitives/InlineNumericEditor.tsx`).
//
// This file is kept as a thin re-export to preserve backward compatibility for
// any consumer outside the migration path. New code MUST import
// `InlineNumericEditor` directly. The lint rule
// `greenhouse/no-raw-table-without-shell` does NOT block this re-export, but
// any new usage of `BonusInput` should be flagged in code review.
//
// Spec: docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md

import InlineNumericEditor, {
  type InlineNumericEditorProps
} from '@/components/greenhouse/primitives/InlineNumericEditor'

export type BonusInputProps = InlineNumericEditorProps

const BonusInput = InlineNumericEditor

export default BonusInput
