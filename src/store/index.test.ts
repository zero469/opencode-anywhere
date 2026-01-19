import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppStore } from './index'
import * as opencode from '@/lib/opencode'
import type { SSEEvent, Session, MessageInfo, MessagePart, PermissionRequest } from '@/types'

vi.mock('@/lib/opencode', () => ({
  initClient: vi.fn(),
  checkConnection: vi.fn(),
  getSessions: vi.fn(),
  getSessionMessages: vi.fn(),
  sendMessageAsync: vi.fn(),
  createSession: vi.fn(),
  respondToPermission: vi.fn(),
  abortSession: vi.fn(),
  getProviders: vi.fn(),
  getAgents: vi.fn(),
}))

const mockOpencode = opencode as {
  initClient: ReturnType<typeof vi.fn>
  checkConnection: ReturnType<typeof vi.fn>
  getSessions: ReturnType<typeof vi.fn>
  getSessionMessages: ReturnType<typeof vi.fn>
  sendMessageAsync: ReturnType<typeof vi.fn>
  createSession: ReturnType<typeof vi.fn>
  respondToPermission: ReturnType<typeof vi.fn>
  abortSession: ReturnType<typeof vi.fn>
  getProviders: ReturnType<typeof vi.fn>
  getAgents: ReturnType<typeof vi.fn>
}

describe('useAppStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      config: null,
      status: { connected: false },
      sessions: [],
      currentSessionId: null,
      messages: [],
      pendingPermissions: [],
      isLoading: false,
      isSending: false,
      providers: null,
      agents: [],
      selectedModel: null,
      selectedAgent: null,
    })
  })

  describe('setConfig', () => {
    it('sets config and checks connection', async () => {
      mockOpencode.checkConnection.mockResolvedValue({ connected: true, serverVersion: '1.0.0' })
      mockOpencode.getSessions.mockResolvedValue([])
      mockOpencode.getProviders.mockResolvedValue(null)
      mockOpencode.getAgents.mockResolvedValue([])

      const config = { baseUrl: 'http://localhost:4096' }
      await useAppStore.getState().setConfig(config)

      expect(mockOpencode.initClient).toHaveBeenCalledWith(config)
      expect(mockOpencode.checkConnection).toHaveBeenCalled()
      expect(useAppStore.getState().config).toEqual(config)
      expect(useAppStore.getState().status).toEqual({ connected: true, serverVersion: '1.0.0' })
    })

    it('fetches sessions and providers when connected', async () => {
      mockOpencode.checkConnection.mockResolvedValue({ connected: true })
      mockOpencode.getSessions.mockResolvedValue([{ id: 'session-1' }])
      mockOpencode.getProviders.mockResolvedValue(null)
      mockOpencode.getAgents.mockResolvedValue([])

      await useAppStore.getState().setConfig({ baseUrl: 'http://localhost:4096' })

      expect(mockOpencode.getSessions).toHaveBeenCalled()
      expect(mockOpencode.getProviders).toHaveBeenCalled()
      expect(mockOpencode.getAgents).toHaveBeenCalled()
    })

    it('does not fetch sessions when not connected', async () => {
      mockOpencode.checkConnection.mockResolvedValue({ connected: false, error: 'Failed' })

      await useAppStore.getState().setConfig({ baseUrl: 'http://localhost:4096' })

      expect(mockOpencode.getSessions).not.toHaveBeenCalled()
    })
  })

  describe('disconnect', () => {
    it('resets all state', () => {
      useAppStore.setState({
        config: { baseUrl: 'http://test' },
        status: { connected: true },
        sessions: [{ id: '1', title: 'Test' } as Session],
        currentSessionId: '1',
        messages: [{ info: { id: 'm1', sessionID: '1', role: 'user' }, parts: [] }],
        selectedModel: { providerID: 'p', modelID: 'm' },
        selectedAgent: 'build',
      })

      useAppStore.getState().disconnect()

      const state = useAppStore.getState()
      expect(state.config).toBeNull()
      expect(state.status).toEqual({ connected: false })
      expect(state.sessions).toEqual([])
      expect(state.currentSessionId).toBeNull()
      expect(state.messages).toEqual([])
      expect(state.selectedModel).toBeNull()
      expect(state.selectedAgent).toBeNull()
    })
  })

  describe('refreshSessions', () => {
    it('fetches and sorts sessions by time', async () => {
      const sessions: Session[] = [
        { id: '1', title: 'Old', time: { created: 1000, updated: 1000 } },
        { id: '2', title: 'New', time: { created: 2000, updated: 3000 } },
      ]
      mockOpencode.getSessions.mockResolvedValue(sessions)

      await useAppStore.getState().refreshSessions()

      const state = useAppStore.getState()
      expect(state.sessions[0].id).toBe('2')
      expect(state.sessions[1].id).toBe('1')
    })
  })

  describe('selectSession', () => {
    it('sets current session and fetches messages', async () => {
      const messages = [{ info: { id: 'm1', sessionID: 's1', role: 'user' as const }, parts: [] }]
      mockOpencode.getSessionMessages.mockResolvedValue({ messages, hasMore: false, total: 1 })

      await useAppStore.getState().selectSession('s1')

      expect(useAppStore.getState().currentSessionId).toBe('s1')
      expect(useAppStore.getState().messages).toEqual(messages)
      expect(useAppStore.getState().isLoading).toBe(false)
    })
  })

  describe('sendMessage', () => {
    it('sends message with selected model and agent', async () => {
      useAppStore.setState({
        currentSessionId: 's1',
        selectedModel: { providerID: 'anthropic', modelID: 'claude-3' },
        selectedAgent: 'build',
      })
      mockOpencode.sendMessageAsync.mockResolvedValue(true)

      await useAppStore.getState().sendMessage('Hello')

      expect(mockOpencode.sendMessageAsync).toHaveBeenCalledWith('s1', 'Hello', {
        model: { providerID: 'anthropic', modelID: 'claude-3' },
        agent: 'build',
      })
    })

    it('does nothing if no current session', async () => {
      useAppStore.setState({ currentSessionId: null })

      await useAppStore.getState().sendMessage('Hello')

      expect(mockOpencode.sendMessageAsync).not.toHaveBeenCalled()
    })

    it('does nothing if text is empty', async () => {
      useAppStore.setState({ currentSessionId: 's1' })

      await useAppStore.getState().sendMessage('   ')

      expect(mockOpencode.sendMessageAsync).not.toHaveBeenCalled()
    })
  })

  describe('createSession', () => {
    it('creates session and selects it', async () => {
      mockOpencode.createSession.mockResolvedValue({ id: 'new-session', title: 'Test' })
      mockOpencode.getSessions.mockResolvedValue([{ id: 'new-session', title: 'Test' }])
      mockOpencode.getSessionMessages.mockResolvedValue({ messages: [], hasMore: false, total: 0 })

      await useAppStore.getState().createSession('Test')

      expect(mockOpencode.createSession).toHaveBeenCalledWith('Test')
      expect(useAppStore.getState().currentSessionId).toBe('new-session')
    })
  })

  describe('refreshCurrentSession', () => {
    it('fetches messages and updates state', async () => {
      const messages = [
        { info: { id: 'm1', sessionID: 's1', role: 'user' as const, time: { created: 1000 } }, parts: [] },
        { info: { id: 'm2', sessionID: 's1', role: 'assistant' as const, finish: true, time: { created: 2000 } }, parts: [] },
      ]
      mockOpencode.getSessionMessages.mockResolvedValue({ messages, hasMore: false })
      useAppStore.setState({ currentSessionId: 's1', messages: [] })

      await useAppStore.getState().refreshCurrentSession()

      expect(mockOpencode.getSessionMessages).toHaveBeenCalledWith('s1', { limit: 30 })
      expect(useAppStore.getState().messages).toEqual(messages)
    })

    it('clears sendingSessionId when assistant finishes', async () => {
      const messages = [
        { info: { id: 'm1', sessionID: 's1', role: 'user' as const, time: { created: 1000 } }, parts: [] },
        { info: { id: 'm2', sessionID: 's1', role: 'assistant' as const, finish: true, time: { created: 2000 } }, parts: [] },
      ]
      mockOpencode.getSessionMessages.mockResolvedValue({ messages, hasMore: false })
      useAppStore.setState({ currentSessionId: 's1', sendingSessionId: 's1', messages: [] })

      await useAppStore.getState().refreshCurrentSession()

      expect(useAppStore.getState().sendingSessionId).toBeNull()
    })

    it('does not clear sendingSessionId when assistant not finished', async () => {
      const messages = [
        { info: { id: 'm1', sessionID: 's1', role: 'user' as const, time: { created: 1000 } }, parts: [] },
        { info: { id: 'm2', sessionID: 's1', role: 'assistant' as const, time: { created: 2000 } }, parts: [] },
      ]
      mockOpencode.getSessionMessages.mockResolvedValue({ messages, hasMore: false })
      useAppStore.setState({ currentSessionId: 's1', sendingSessionId: 's1', messages: [] })

      await useAppStore.getState().refreshCurrentSession()

      expect(useAppStore.getState().sendingSessionId).toBe('s1')
    })

    it('does nothing when no current session', async () => {
      useAppStore.setState({ currentSessionId: null })

      await useAppStore.getState().refreshCurrentSession()

      expect(mockOpencode.getSessionMessages).not.toHaveBeenCalled()
    })

    it('discards result if session changed during fetch', async () => {
      const messages = [{ info: { id: 'm1', sessionID: 's1', role: 'user' as const }, parts: [] }]
      mockOpencode.getSessionMessages.mockImplementation(async () => {
        useAppStore.setState({ currentSessionId: 's2' })
        return { messages, hasMore: false }
      })
      useAppStore.setState({ currentSessionId: 's1', messages: [] })

      await useAppStore.getState().refreshCurrentSession()

      expect(useAppStore.getState().messages).toEqual([])
    })

    it('merges new messages with existing and sorts by time', async () => {
      const existingMessages = [
        { info: { id: 'm1', sessionID: 's1', role: 'user' as const, time: { created: 1000 } }, parts: [] },
        { info: { id: 'm2', sessionID: 's1', role: 'assistant' as const, time: { created: 2000 } }, parts: [] },
      ]
      const apiMessages = [
        { info: { id: 'm3', sessionID: 's1', role: 'user' as const, time: { created: 3000 } }, parts: [] },
        { info: { id: 'm4', sessionID: 's1', role: 'assistant' as const, finish: true, time: { created: 4000 } }, parts: [] },
      ]
      mockOpencode.getSessionMessages.mockResolvedValue({ messages: apiMessages, hasMore: false })
      useAppStore.setState({ currentSessionId: 's1', messages: existingMessages })

      await useAppStore.getState().refreshCurrentSession()

      const result = useAppStore.getState().messages
      expect(result).toHaveLength(4)
      expect(result[0].info.id).toBe('m1')
      expect(result[1].info.id).toBe('m2')
      expect(result[2].info.id).toBe('m3')
      expect(result[3].info.id).toBe('m4')
    })

    it('removes temp messages when real messages arrive', async () => {
      const existingMessages = [
        { info: { id: 'm1', sessionID: 's1', role: 'user' as const, time: { created: 1000 } }, parts: [{ type: 'text' as const, text: 'old' }] },
        { info: { id: 'temp_123', sessionID: 's1', role: 'user' as const, time: { created: 3000 } }, parts: [{ type: 'text' as const, text: 'my message' }] },
      ]
      const apiMessages = [
        { info: { id: 'm1', sessionID: 's1', role: 'user' as const, time: { created: 1000 } }, parts: [{ type: 'text' as const, text: 'updated' }] },
        { info: { id: 'm2', sessionID: 's1', role: 'user' as const, time: { created: 3000 } }, parts: [{ type: 'text' as const, text: 'my message' }] },
        { info: { id: 'm3', sessionID: 's1', role: 'assistant' as const, finish: true, time: { created: 4000 } }, parts: [{ type: 'text' as const, text: 'response' }] },
      ]
      mockOpencode.getSessionMessages.mockResolvedValue({ messages: apiMessages, hasMore: false })
      useAppStore.setState({ currentSessionId: 's1', messages: existingMessages })

      await useAppStore.getState().refreshCurrentSession()

      const result = useAppStore.getState().messages
      expect(result).toHaveLength(3)
      expect(result[0].info.id).toBe('m1')
      expect(result[0].parts[0].text).toBe('updated')
      expect(result[1].info.id).toBe('m2')
      expect(result[2].info.id).toBe('m3')
      expect(result.find(m => m.info.id.startsWith('temp_'))).toBeUndefined()
    })
  })

  describe('respondPermission', () => {
    it('responds and removes permission from pending', async () => {
      const permission: PermissionRequest = {
        id: 'perm-1',
        sessionID: 's1',
        toolName: 'bash',
        arguments: {},
      }
      useAppStore.setState({
        currentSessionId: 's1',
        pendingPermissions: [permission],
      })
      mockOpencode.respondToPermission.mockResolvedValue(true)

      await useAppStore.getState().respondPermission('perm-1', true)

      expect(mockOpencode.respondToPermission).toHaveBeenCalledWith('s1', 'perm-1', true)
      expect(useAppStore.getState().pendingPermissions).toEqual([])
    })
  })

  describe('abortSession', () => {
    it('aborts current session', async () => {
      useAppStore.setState({ currentSessionId: 's1' })
      mockOpencode.abortSession.mockResolvedValue(true)

      await useAppStore.getState().abortSession()

      expect(mockOpencode.abortSession).toHaveBeenCalledWith('s1')
    })

    it('does nothing if no current session', async () => {
      useAppStore.setState({ currentSessionId: null })

      await useAppStore.getState().abortSession()

      expect(mockOpencode.abortSession).not.toHaveBeenCalled()
    })
  })

  describe('fetchProvidersAndAgents', () => {
    it('sets default model from connected provider', async () => {
      mockOpencode.getProviders.mockResolvedValue({
        all: [{ id: 'anthropic', models: { 'claude-3': { id: 'claude-3' } } }],
        connected: ['anthropic'],
        default: { anthropic: 'claude-3' },
      })
      mockOpencode.getAgents.mockResolvedValue([
        { name: 'build', mode: 'primary', hidden: false },
      ])

      await useAppStore.getState().fetchProvidersAndAgents()

      expect(useAppStore.getState().selectedModel).toEqual({
        providerID: 'anthropic',
        modelID: 'claude-3',
      })
      expect(useAppStore.getState().selectedAgent).toBe('build')
    })

    it('filters hidden agents', async () => {
      mockOpencode.getProviders.mockResolvedValue(null)
      mockOpencode.getAgents.mockResolvedValue([
        { name: 'build', mode: 'primary', hidden: false },
        { name: 'hidden-agent', mode: 'primary', hidden: true },
        { name: 'subagent', mode: 'subagent', hidden: false },
      ])

      await useAppStore.getState().fetchProvidersAndAgents()

      expect(useAppStore.getState().agents).toHaveLength(1)
      expect(useAppStore.getState().agents[0].name).toBe('build')
    })
  })

  describe('handleSSEEvent', () => {
    beforeEach(() => {
      useAppStore.setState({ currentSessionId: 's1', messages: [], sessions: [] })
    })

    describe('message.created', () => {
      it('adds new message to current session', () => {
        const event: SSEEvent = {
          type: 'message.created',
          properties: {
            info: { id: 'm1', sessionID: 's1', role: 'assistant' } as MessageInfo,
          },
        }

        useAppStore.getState().handleSSEEvent(event)

        expect(useAppStore.getState().messages).toHaveLength(1)
        expect(useAppStore.getState().messages[0].info.id).toBe('m1')
      })

      it('ignores messages for other sessions', () => {
        const event: SSEEvent = {
          type: 'message.created',
          properties: {
            info: { id: 'm1', sessionID: 'other-session', role: 'assistant' } as MessageInfo,
          },
        }

        useAppStore.getState().handleSSEEvent(event)

        expect(useAppStore.getState().messages).toHaveLength(0)
      })
    })

    describe('message.updated', () => {
      it('updates existing message info', () => {
        useAppStore.setState({
          currentSessionId: 's1',
          messages: [{ info: { id: 'm1', sessionID: 's1', role: 'assistant' }, parts: [{ id: 'p1' }] }],
        })

        const event: SSEEvent = {
          type: 'message.updated',
          properties: {
            info: { id: 'm1', sessionID: 's1', role: 'assistant', finish: 'end_turn' } as MessageInfo,
          },
        }

        useAppStore.getState().handleSSEEvent(event)

        const msg = useAppStore.getState().messages[0]
        expect(msg.info.finish).toBe('end_turn')
        expect(msg.parts).toHaveLength(1)
      })
    })

    describe('message.part.updated', () => {
      it('adds new part to existing message', () => {
        useAppStore.setState({
          currentSessionId: 's1',
          messages: [{ info: { id: 'm1', sessionID: 's1', role: 'assistant' }, parts: [] }],
        })

        const event: SSEEvent = {
          type: 'message.part.updated',
          properties: {
            part: { id: 'p1', sessionID: 's1', messageID: 'm1', type: 'text', text: 'Hello' } as MessagePart,
          },
        }

        useAppStore.getState().handleSSEEvent(event)

        expect(useAppStore.getState().messages[0].parts).toHaveLength(1)
        expect((useAppStore.getState().messages[0].parts[0] as any).text).toBe('Hello')
      })

      it('updates existing part', () => {
        useAppStore.setState({
          currentSessionId: 's1',
          messages: [{
            info: { id: 'm1', sessionID: 's1', role: 'assistant' },
            parts: [{ id: 'p1', sessionID: 's1', messageID: 'm1', type: 'text', text: 'Hi' }],
          }],
        })

        const event: SSEEvent = {
          type: 'message.part.updated',
          properties: {
            part: { id: 'p1', sessionID: 's1', messageID: 'm1', type: 'text', text: 'Hello World' } as MessagePart,
          },
        }

        useAppStore.getState().handleSSEEvent(event)

        expect((useAppStore.getState().messages[0].parts[0] as any).text).toBe('Hello World')
      })

      it('creates message if not exists', () => {
        useAppStore.setState({ currentSessionId: 's1', messages: [] })

        const event: SSEEvent = {
          type: 'message.part.updated',
          properties: {
            part: { id: 'p1', sessionID: 's1', messageID: 'm1', type: 'text', text: 'Hello' } as MessagePart,
          },
        }

        useAppStore.getState().handleSSEEvent(event)

        expect(useAppStore.getState().messages).toHaveLength(1)
        expect(useAppStore.getState().messages[0].info.id).toBe('m1')
      })
    })

    describe('permission.asked', () => {
      it('adds permission to pending list', () => {
        const event: SSEEvent = {
          type: 'permission.asked',
          properties: {
            id: 'perm-1',
            sessionID: 's1',
            toolName: 'bash',
            arguments: { command: 'ls' },
          },
        }

        useAppStore.getState().handleSSEEvent(event)

        expect(useAppStore.getState().pendingPermissions).toHaveLength(1)
        expect(useAppStore.getState().pendingPermissions[0].toolName).toBe('bash')
      })

      it('ignores permissions for other sessions', () => {
        const event: SSEEvent = {
          type: 'permission.asked',
          properties: {
            id: 'perm-1',
            sessionID: 'other-session',
            toolName: 'bash',
            arguments: {},
          },
        }

        useAppStore.getState().handleSSEEvent(event)

        expect(useAppStore.getState().pendingPermissions).toHaveLength(0)
      })
    })

    describe('session.updated', () => {
      it('updates existing session', () => {
        useAppStore.setState({
          sessions: [{ id: 's1', title: 'Old Title' } as Session],
        })

        const event: SSEEvent = {
          type: 'session.updated',
          properties: {
            info: { id: 's1', title: 'New Title' } as Session,
          },
        }

        useAppStore.getState().handleSSEEvent(event)

        expect(useAppStore.getState().sessions[0].title).toBe('New Title')
      })
    })

    describe('session.created', () => {
      it('adds new session to list', () => {
        useAppStore.setState({ sessions: [] })

        const event: SSEEvent = {
          type: 'session.created',
          properties: {
            info: { id: 's2', title: 'New Session' } as Session,
          },
        }

        useAppStore.getState().handleSSEEvent(event)

        expect(useAppStore.getState().sessions).toHaveLength(1)
        expect(useAppStore.getState().sessions[0].title).toBe('New Session')
      })

      it('does not add duplicate session', () => {
        useAppStore.setState({ sessions: [{ id: 's1', title: 'Existing' } as Session] })

        const event: SSEEvent = {
          type: 'session.created',
          properties: {
            info: { id: 's1', title: 'Duplicate' } as Session,
          },
        }

        useAppStore.getState().handleSSEEvent(event)

        expect(useAppStore.getState().sessions).toHaveLength(1)
        expect(useAppStore.getState().sessions[0].title).toBe('Existing')
      })
    })
  })

  describe('setSelectedModel / setSelectedAgent', () => {
    it('sets selected model', () => {
      useAppStore.getState().setSelectedModel({ providerID: 'openai', modelID: 'gpt-4' })
      expect(useAppStore.getState().selectedModel).toEqual({ providerID: 'openai', modelID: 'gpt-4' })
    })

    it('sets selected agent', () => {
      useAppStore.getState().setSelectedAgent('oracle')
      expect(useAppStore.getState().selectedAgent).toBe('oracle')
    })
  })
})
