import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import { ErrorBoundary } from './ErrorBoundary'

function ThrowingComponent(): never {
  throw new Error('Test render failure')
}

describe('ErrorBoundary', () => {
  afterEach(async () => {
    cleanup()
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('renders a translated fallback when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      </I18nextProvider>,
    )

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Something went wrong')
    expect(alert.textContent).toContain(
      'The application hit an unexpected error.',
    )
    expect(
      screen.getByRole('button', { name: 'Reload the application' }),
    ).toBeDefined()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined()
  })

  it('renders the fallback in Polish', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await i18n.changeLanguage('pl')
    render(
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      </I18nextProvider>,
    )

    expect(screen.getByRole('alert').textContent).toContain(
      'Coś poszło nie tak',
    )
  })

  it('retries rendering the children after a failure', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let shouldThrow = true

    function MaybeThrowingComponent() {
      if (shouldThrow) {
        throw new Error('Test render failure')
      }

      return <p>Recovered content</p>
    }

    render(
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <MaybeThrowingComponent />
        </ErrorBoundary>
      </I18nextProvider>,
    )

    expect(screen.getByRole('alert')).toBeDefined()

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('Recovered content')).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
