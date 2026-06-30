import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import i18n from '../i18n/i18n'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error(`[ErrorBoundary] ${this.props.name || 'unknown'}`, error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const { name = i18n.t('common:error_boundary.component'), fallback } = this.props

      if (fallback) {
        return typeof fallback === 'function'
          ? fallback({ error: this.state.error, retry: this.handleRetry })
          : fallback
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <AlertTriangle size={32} className="error-boundary__icon" />
            <h3 className="error-boundary__title">
              {i18n.t('common:error_boundary.title', { name })}
            </h3>
            <p className="error-boundary__message">
              {this.state.error?.message || i18n.t('common:error_boundary.unknown')}
            </p>
            <button
              className="btn btn-primary error-boundary__btn"
              onClick={this.handleRetry}
            >
              <RotateCcw size={14} />
              {i18n.t('common:error_boundary.retry')}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
