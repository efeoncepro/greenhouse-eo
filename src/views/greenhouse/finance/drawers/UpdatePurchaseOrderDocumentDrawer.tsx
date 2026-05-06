'use client'

import { useEffect, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'

const GREENHOUSE_COPY = getMicrocopy()

type PurchaseOrderDocumentTarget = {
  poId: string
  poNumber: string
  clientId: string
  spaceId: string | null
  attachmentAssetId: string | null
  attachmentUrl: string | null
}

type Props = {
  open: boolean
  purchaseOrder: PurchaseOrderDocumentTarget | null
  onClose: () => void
  onSuccess: () => void
}

const UpdatePurchaseOrderDocumentDrawer = ({ open, purchaseOrder, onClose, onSuccess }: Props) => {
  const [attachmentAsset, setAttachmentAsset] = useState<UploadedFileValue | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setAttachmentAsset(null)
      setSaving(false)
      setError(null)
    }
  }, [open])

  const handleClose = () => {
    if (saving) {
      return
    }

    setAttachmentAsset(null)
    setError(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (!purchaseOrder || !attachmentAsset?.assetId) {
      setError('Sube un documento antes de guardar el respaldo de la OC.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/finance/purchase-orders/${encodeURIComponent(purchaseOrder.poId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachmentAssetId: attachmentAsset.assetId,
          clientId: purchaseOrder.clientId,
          spaceId: purchaseOrder.spaceId
        })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))

        throw new Error(payload.error || 'No fue posible actualizar el respaldo de la OC.')
      }

      toast.success(
        purchaseOrder.attachmentUrl
          ? `Respaldo actualizado para la OC ${purchaseOrder.poNumber}`
          : `Respaldo cargado para la OC ${purchaseOrder.poNumber}`
      )
      setAttachmentAsset(null)
      onClose()
      onSuccess()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No fue posible actualizar el respaldo de la OC.')
    } finally {
      setSaving(false)
    }
  }

  const hasCurrentDocument = Boolean(purchaseOrder?.attachmentUrl)

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 420 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>
            {hasCurrentDocument ? 'Reemplazar respaldo de OC' : 'Cargar respaldo de OC'}
          </Typography>
          {purchaseOrder ? (
            <Typography variant='body2' color='text.secondary'>
              OC #{purchaseOrder.poNumber}
            </Typography>
          ) : null}
        </Box>
        <IconButton onClick={handleClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error ? <Alert severity='error' onClose={() => setError(null)}>{error}</Alert> : null}

        {purchaseOrder ? (
          hasCurrentDocument ? (
            <Alert severity='info'>
              Esta OC ya tiene un respaldo cargado. Si subes uno nuevo, las HES vinculadas heredarán el documento actualizado.{' '}
              <Link href={purchaseOrder.attachmentUrl!} target='_blank' rel='noreferrer'>
                Abrir respaldo actual
              </Link>
            </Alert>
          ) : (
            <Alert severity='warning'>
              Esta OC todavía no tiene respaldo cargado. Súbelo aquí para que las HES vinculadas puedan heredarlo.
            </Alert>
          )
        ) : null}

        <GreenhouseFileUploader
          contextType='purchase_order_draft'
          title='Documento de respaldo'
          helperText='El respaldo pertenece a la OC. La HES vinculada reutiliza este documento y no guarda un PDF propio.'
          emptyTitle='Arrastra el respaldo aquí'
          emptyDescription='Acepta PDF, JPG, PNG y WEBP hasta 10 MB.'
          browseCta={hasCurrentDocument ? 'Seleccionar nuevo documento' : 'Seleccionar documento'}
          replaceCta='Reemplazar documento'
          value={attachmentAsset}
          onChange={setAttachmentAsset}
          ownerClientId={purchaseOrder?.clientId}
          ownerSpaceId={purchaseOrder?.spaceId}
          metadataLabel={purchaseOrder?.poNumber || 'purchase-order'}
          disabled={saving || !purchaseOrder}
        />
      </Stack>

      <Divider />

      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button
          variant='contained'
          color='primary'
          onClick={handleSubmit}
          disabled={saving || !attachmentAsset}
          fullWidth
          startIcon={<i className='tabler-check' />}
        >
          {saving ? 'Guardando...' : hasCurrentDocument ? 'Reemplazar respaldo' : 'Guardar respaldo'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default UpdatePurchaseOrderDocumentDrawer
