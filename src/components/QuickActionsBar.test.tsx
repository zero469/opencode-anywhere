import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickActionsBar } from './QuickActionsBar'

describe('QuickActionsBar', () => {
  const defaultProps = {
    onCompact: vi.fn(),
    onSkills: vi.fn(),
    onMore: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders 3 action buttons', () => {
    render(<QuickActionsBar {...defaultProps} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)

    expect(screen.getByRole('button', { name: /compact/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skills/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument()
  })

  it('calls onCompact when Compact button clicked', () => {
    render(<QuickActionsBar {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /compact/i }))

    expect(defaultProps.onCompact).toHaveBeenCalledTimes(1)
  })

  it('calls onSkills when Skills button clicked', () => {
    render(<QuickActionsBar {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /skills/i }))

    expect(defaultProps.onSkills).toHaveBeenCalledTimes(1)
  })

  it('calls onMore when More button clicked', () => {
    render(<QuickActionsBar {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /more/i }))

    expect(defaultProps.onMore).toHaveBeenCalledTimes(1)
  })

  it('disables buttons when disabled prop is true', () => {
    render(<QuickActionsBar {...defaultProps} disabled />)

    const compactButton = screen.getByRole('button', { name: /compact/i })
    const skillsButton = screen.getByRole('button', { name: /skills/i })
    const moreButton = screen.getByRole('button', { name: /more/i })

    expect(compactButton).toBeDisabled()
    expect(skillsButton).toBeDisabled()
    expect(moreButton).toBeDisabled()

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

  it('More button is enabled and clickable', () => {
    render(<QuickActionsBar {...defaultProps} />)

    const moreButton = screen.getByRole('button', { name: /more/i })
    expect(moreButton).not.toBeDisabled()
  })

  it('shows spinner and disables Compact button when isCompacting is true', () => {
    render(<QuickActionsBar {...defaultProps} isCompacting />)

    const compactButton = screen.getByRole('button', { name: /compact/i })
    expect(compactButton).toBeDisabled()
    
    const spinner = compactButton.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})
