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

  it('renders 4 action buttons', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)

    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /attach/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument()
  })

  it('calls onAction with /undo when Undo button clicked', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} />)

    fireEvent.click(screen.getByRole('button', { name: /undo/i }))

    expect(mockOnAction).toHaveBeenCalledWith('/undo')
    expect(mockOnAction).toHaveBeenCalledTimes(1)
  })

  it('calls onAction with /redo when Redo button clicked', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} />)

    fireEvent.click(screen.getByRole('button', { name: /redo/i }))

    expect(mockOnAction).toHaveBeenCalledWith('/redo')
    expect(mockOnAction).toHaveBeenCalledTimes(1)
  })

  it('calls onAction with /attach when Attach button clicked', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} />)

    fireEvent.click(screen.getByRole('button', { name: /attach/i }))

    expect(mockOnAction).toHaveBeenCalledWith('/attach')
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

    const undoButton = screen.getByRole('button', { name: /undo/i })
    const redoButton = screen.getByRole('button', { name: /redo/i })
    const attachButton = screen.getByRole('button', { name: /attach/i })
    const moreButton = screen.getByRole('button', { name: /more/i })

    expect(undoButton).toBeDisabled()
    expect(redoButton).toBeDisabled()
    expect(attachButton).toBeDisabled()
    expect(moreButton).toBeDisabled()

    // Verify clicking disabled button does not call onAction
    fireEvent.click(undoButton)
    expect(mockOnAction).not.toHaveBeenCalled()
  })

  it('debounces rapid taps', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} />)

    const undoButton = screen.getByRole('button', { name: /undo/i })

    // Set initial time
    vi.setSystemTime(1000)

    // First tap should fire
    fireEvent.click(undoButton)
    expect(mockOnAction).toHaveBeenCalledTimes(1)

    // Rapid taps within 300ms should be ignored
    vi.setSystemTime(1100)
    fireEvent.click(undoButton)
    expect(mockOnAction).toHaveBeenCalledTimes(1)

    vi.setSystemTime(1200)
    fireEvent.click(undoButton)
    expect(mockOnAction).toHaveBeenCalledTimes(1)

    // After 300ms debounce period, should fire again
    vi.setSystemTime(1400)
    fireEvent.click(undoButton)
    expect(mockOnAction).toHaveBeenCalledTimes(2)
  })

  it('More button is always disabled', () => {
    const mockOnAction = vi.fn()
    render(<QuickActionsBar onAction={mockOnAction} />)

    const moreButton = screen.getByRole('button', { name: /more/i })
    expect(moreButton).toBeDisabled()
  })
})
