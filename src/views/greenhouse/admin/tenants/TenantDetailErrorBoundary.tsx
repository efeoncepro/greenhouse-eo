'use client'

import { Component, type ReactNode } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

type Props = {
  children: ReactNode
  title?: string
  description?: string
  onRetry?: () => void
}

type State = {
  hasError: boolean
}

class TenantDetailErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch() {}

  handleRetry = () => {
    this.setState({ hasError: false })
    this.props.onRetry?.()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <Card variant='outlined'>
        <CardContent>
          <Stack spacing={2.5} alignItems='flex-start' sx={{ py: 3 }}>
            <Stack spacing={1}>
              <Typography variant='h6'>{this.props.title || 'No pudimos renderizar esta sección'}</Typography>
              <Typography color='text.secondary'>
                {this.props.description || 'Reintenta la carga. Si el problema persiste, revisa la integración o el payload de este tenant.'}
              </Typography>
            </Stack>
            <Button variant='contained' onClick={this.handleRetry}>
              Reintentar
            </Button>
          </Stack>
        </CardContent>
      </Card>
    )
  }
}

export default TenantDetailErrorBoundary
