import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickActionsBar } from './QuickActionsBar'

describe('QuickActionsBar', () => {
  const defaultProps = {
    onSlashCommands: vi.fn(),
    onMcp: vi.fn(),
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

    expect(screen.getByRole('button', { name: /commands/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mcp/i })).toBeInTheDocument()
  })

  it('calls onSlashCommands when Commands button clicked', () => {
    render(<QuickActionsBar {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /commands/i }))

    expect(defaultProps.onSlashCommands).toHaveBeenCalledTimes(1)
  })

  it('calls onMcp when MCP button clicked', () => {
    render(<QuickActionsBar {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /mcp/i }))

    expect(defaultProps.onMcp).toHaveBeenCalledTimes(1)
  })

  it('disables buttons when disabled prop is true', () => {
    render(<QuickActionsBar {...defaultProps} disabled />)

    const commandsButton = screen.getByRole('button', { name: /commands/i })
    const mcpButton = screen.getByRole('button', { name: /mcp/i })

    expect(commandsButton).toBeDisabled()
    expect(mcpButton).toBeDisabled()

    fireEvent.click(commandsButton)
    expect(defaultProps.onSlashCommands).not.toHaveBeenCalled()
  })

  it('debounces rapid taps', () => {
    render(<QuickActionsBar {...defaultProps} />)

    const mcpButton = screen.getByRole('button', { name: /mcp/i })

    vi.setSystemTime(1000)

    fireEvent.click(mcpButton)
    expect(defaultProps.onMcp).toHaveBeenCalledTimes(1)

    vi.setSystemTime(1100)
    fireEvent.click(mcpButton)
    expect(defaultProps.onMcp).toHaveBeenCalledTimes(1)

    vi.setSystemTime(1200)
    fireEvent.click(mcpButton)
    expect(defaultProps.onMcp).toHaveBeenCalledTimes(1)

    vi.setSystemTime(1400)
    fireEvent.click(mcpButton)
    expect(defaultProps.onMcp).toHaveBeenCalledTimes(2)
  })

  it('Commands button is enabled and clickable', () => {
    render(<QuickActionsBar {...defaultProps} />)

    const commandsButton = screen.getByRole('button', { name: /commands/i })
    expect(commandsButton).not.toBeDisabled()
  })
})
