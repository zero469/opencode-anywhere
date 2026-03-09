import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickActionsBar } from './QuickActionsBar'

describe('QuickActionsBar', () => {
  const defaultProps = {
    onCompact: vi.fn(),
    onSlashCommands: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders 2 action buttons', () => {
    render(<QuickActionsBar {...defaultProps} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)

    expect(screen.getByRole('button', { name: /compact/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /commands/i })).toBeInTheDocument()
  })

  it('calls onCompact when Compact button clicked', () => {
    render(<QuickActionsBar {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /compact/i }))

    expect(defaultProps.onCompact).toHaveBeenCalledTimes(1)
  })

  it('calls onSlashCommands when Commands button clicked', () => {
    render(<QuickActionsBar {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /commands/i }))

    expect(defaultProps.onSlashCommands).toHaveBeenCalledTimes(1)
  })

  it('disables buttons when disabled prop is true', () => {
    render(<QuickActionsBar {...defaultProps} disabled />)

    const compactButton = screen.getByRole('button', { name: /compact/i })
    const commandsButton = screen.getByRole('button', { name: /commands/i })

    expect(compactButton).toBeDisabled()
    expect(commandsButton).toBeDisabled()

    fireEvent.click(compactButton)
    expect(defaultProps.onCompact).not.toHaveBeenCalled()
  })

  it('debounces rapid taps', () => {
    render(<QuickActionsBar {...defaultProps} />)

    const compactButton = screen.getByRole('button', { name: /compact/i })

    vi.setSystemTime(1000)

    fireEvent.click(compactButton)
    expect(defaultProps.onCompact).toHaveBeenCalledTimes(1)

    vi.setSystemTime(1100)
    fireEvent.click(compactButton)
    expect(defaultProps.onCompact).toHaveBeenCalledTimes(1)

    vi.setSystemTime(1200)
    fireEvent.click(compactButton)
    expect(defaultProps.onCompact).toHaveBeenCalledTimes(1)

    vi.setSystemTime(1400)
    fireEvent.click(compactButton)
    expect(defaultProps.onCompact).toHaveBeenCalledTimes(2)
  })

  it('Commands button is enabled and clickable', () => {
    render(<QuickActionsBar {...defaultProps} />)

    const commandsButton = screen.getByRole('button', { name: /commands/i })
    expect(commandsButton).not.toBeDisabled()
  })

  it('shows spinner and disables Compact button when isCompacting is true', () => {
    render(<QuickActionsBar {...defaultProps} isCompacting />)

    const compactButton = screen.getByRole('button', { name: /compact/i })
    expect(compactButton).toBeDisabled()
    
    const spinner = compactButton.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})
