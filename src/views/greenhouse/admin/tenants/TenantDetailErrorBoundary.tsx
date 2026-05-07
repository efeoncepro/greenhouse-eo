'use client'

import { Component, type ReactNode } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_INTERNAL_MESSAGES } from '@/lib/copy/admin'

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
              <Typography variant='h6'>{this.props.title || GH_INTERNAL_MESSAGES.admin_tenant_error_title}</Typography>
              <Typography color='text.secondary'>
                {this.props.description || GH_INTERNAL_MESSAGES.admin_tenant_error_description}
              </Typography>
            </Stack>
            <Button variant='contained' onClick={this.handleRetry}>
              {GH_INTERNAL_MESSAGES.admin_tenant_error_retry}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    )
  }
}

export default TenantDetailErrorBoundary
