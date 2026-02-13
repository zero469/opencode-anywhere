import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickActionsBar } from './QuickActionsBar'

describe('QuickActionsBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders 3 action buttons', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)

    expect(screen.getByRole('button', { name: /compact/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skills/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument()
  })

  it('calls onAction with /compact when Compact button clicked', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} />)

    fireEvent.click(screen.getByRole('button', { name: /compact/i }))

    expect(mockOnAction).toHaveBeenCalledWith('/compact')
    expect(mockOnAction).toHaveBeenCalledTimes(1)
  })

  it('calls onAction with /skills when Skills button clicked', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} />)

    fireEvent.click(screen.getByRole('button', { name: /skills/i }))

    expect(mockOnAction).toHaveBeenCalledWith('/skills')
    expect(mockOnAction).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onAction when More button clicked (placeholder)', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} />)

    fireEvent.click(screen.getByRole('button', { name: /more/i }))

    expect(mockOnAction).not.toHaveBeenCalled()
  })

  it('disables buttons when disabled prop is true', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} disabled />)

    const compactButton = screen.getByRole('button', { name: /compact/i })
    const skillsButton = screen.getByRole('button', { name: /skills/i })
    const moreButton = screen.getByRole('button', { name: /more/i })

    expect(compactButton).toBeDisabled()
    expect(skillsButton).toBeDisabled()
    expect(moreButton).toBeDisabled()

    // Verify clicking disabled button does not call onAction
    fireEvent.click(compactButton)
    expect(mockOnAction).not.toHaveBeenCalled()
  })

  it('debounces rapid taps', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} />)

    const compactButton = screen.getByRole('button', { name: /compact/i })

    // Set initial time
    vi.setSystemTime(1000)

    // First tap should fire
    fireEvent.click(compactButton)
    expect(mockOnAction).toHaveBeenCalledTimes(1)

    // Rapid taps within 300ms should be ignored
    vi.setSystemTime(1100)
    fireEvent.click(compactButton)
    expect(mockOnAction).toHaveBeenCalledTimes(1)

    vi.setSystemTime(1200)
    fireEvent.click(compactButton)
    expect(mockOnAction).toHaveBeenCalledTimes(1)

    // After 300ms debounce period, should fire again
    vi.setSystemTime(1400)
    fireEvent.click(compactButton)
    expect(mockOnAction).toHaveBeenCalledTimes(2)
  })

  it('More button is always disabled', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} />)

    const moreButton = screen.getByRole('button', { name: /more/i })
    expect(moreButton).toBeDisabled()
  })
})
