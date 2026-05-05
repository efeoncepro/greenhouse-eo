import { describe, expect, it } from 'vitest'

import {
  mapOrderArtifactRow,
  mapOrderLineRow,
  mapOrderRow,
  type OrderArtifactRow,
  type OrderLineRow,
  type OrderRow
} from './row-mapper'

describe('payment-orders row-mapper', () => {
  describe('mapOrderRow', () => {
    it('maps numeric strings to numbers', () => {
      const row: OrderRow = {
        order_id: 'por-1',
        space_id: null,
        batch_kind: 'payroll',
        period_id: null,
        title: 'Test',
        description: null,
        processor_slug: null,
        payment_method: null,
        source_account_id: null,
        total_amount: '12345.67',
        currency: 'CLP',
        fx_rate_snapshot: null,
        fx_locked_at: null,
        scheduled_for: null,
        due_date: null,
        submitted_at: null,
        paid_at: null,
        state: 'draft',
        require_approval: true,
        created_by: 'user-1',
        approved_by: null,
        approved_at: null,
        cancelled_by: null,
        cancelled_reason: null,
        cancelled_at: null,
        superseded_by: null,
        external_reference: null,
        external_status: null,
        failure_reason: null,
        metadata_json: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z'
      }

      const result = mapOrderRow(row)

      expect(result.totalAmount).toBe(12345.67)
      expect(result.metadataJson).toEqual({})
    })

    it('normalizes postgres Date timestamps to ISO strings', () => {
      const paidAt = new Date('2026-05-05T15:39:44.321Z')

      const row: OrderRow = {
        order_id: 'por-1',
        space_id: null,
        batch_kind: 'payroll',
        period_id: null,
        title: 'Test',
        description: null,
        processor_slug: null,
        payment_method: null,
        source_account_id: 'santander-clp',
        total_amount: 12345.67,
        currency: 'CLP',
        fx_rate_snapshot: null,
        fx_locked_at: null,
        scheduled_for: null,
        due_date: null,
        submitted_at: null,
        paid_at: paidAt,
        state: 'paid',
        require_approval: true,
        created_by: 'user-1',
        approved_by: null,
        approved_at: null,
        cancelled_by: null,
        cancelled_reason: null,
        cancelled_at: null,
        superseded_by: null,
        external_reference: null,
        external_status: null,
        failure_reason: null,
        metadata_json: null,
        created_at: paidAt,
        updated_at: paidAt
      }

      const result = mapOrderRow(row)

      expect(result.paidAt).toBe('2026-05-05T15:39:44.321Z')
      expect(result.createdAt).toBe('2026-05-05T15:39:44.321Z')
      expect(result.updatedAt).toBe('2026-05-05T15:39:44.321Z')
    })
  })

  describe('mapOrderLineRow', () => {
    it('preserves currency type', () => {
      const row: OrderLineRow = {
        line_id: 'pol-1',
        order_id: 'por-1',
        obligation_id: 'pob-1',
        beneficiary_type: 'member',
        beneficiary_id: 'mem-1',
        beneficiary_name: 'Melkin',
        obligation_kind: 'employee_net_pay',
        amount: 758.75,
        currency: 'USD',
        is_partial: false,
        state: 'pending',
        failure_reason: null,
        metadata_json: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z'
      }

      const result = mapOrderLineRow(row)

      expect(result.currency).toBe('USD')
      expect(result.amount).toBe(758.75)
      expect(result.beneficiaryName).toBe('Melkin')
    })
  })

  describe('mapOrderArtifactRow', () => {
    it('defaults download log to empty array when not array', () => {
      const row: OrderArtifactRow = {
        artifact_id: 'poa-1',
        order_id: 'por-1',
        artifact_kind: 'batch_csv',
        asset_id: null,
        content_hash: 'abc',
        content_hash_algorithm: 'sha256',
        file_name: 'batch.csv',
        mime_type: 'text/csv',
        byte_size: 1024,
        download_log_json: null,
        generated_by: 'user-1',
        generated_at: '2026-05-01T00:00:00Z',
        metadata_json: null
      }

      const result = mapOrderArtifactRow(row)

      expect(result.downloadLogJson).toEqual([])
      expect(result.byteSize).toBe(1024)
    })
  })
})
