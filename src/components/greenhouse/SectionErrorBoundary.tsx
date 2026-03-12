'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

import Button from '@mui/material/Button'

import EmptyState from './EmptyState'

type SectionErrorBoundaryProps = {
  sectionName: string
  title?: string
  description?: string
  icon?: string
  children: ReactNode
}

type SectionErrorBoundaryState = {
  hasError: boolean
}

class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  state: SectionErrorBoundaryState = {
    hasError: false
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`SectionErrorBoundary(${this.props.sectionName})`, error, errorInfo)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <EmptyState
          icon={this.props.icon || 'tabler-alert-circle'}
          title={this.props.title || 'No pudimos cargar esta sección'}
          description={this.props.description || 'Intenta de nuevo en unos segundos.'}
          action={
            <Button variant='outlined' onClick={this.handleRetry}>
              Reintentar
            </Button>
          }
        />
      )
    }

    return this.props.children
  }
}

export default SectionErrorBoundary
