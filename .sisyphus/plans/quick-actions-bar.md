# Quick Actions Bar for OpenCode Anywhere

## TL;DR

> **Quick Summary**: Add a horizontal Quick Actions Bar to the mobile chat interface, providing one-tap access to common slash commands (Undo, Redo) and a placeholder for future Command Palette expansion.
> 
> **Deliverables**:
> - `QuickActionsBar.tsx` component with 4 action buttons
> - Integration into MessageInput.tsx
> - iOS Safe Area and keyboard handling
> 
> **Estimated Effort**: Small-Medium (1-2 hours)
> **Parallel Execution**: NO - sequential (component → integration → test)
> **Critical Path**: Task 1 → Task 2 → Task 3

---

## Context

### Original Request
User wants mobile-friendly access to OpenCode's slash commands and skills without typing. Phase 1 focuses on Quick Actions Bar with most common commands.

### Interview Summary
**Key Discussions**:
- OpenCode TUI has many slash commands hard to type on mobile
- Hybrid approach chosen: Quick Actions Bar (always visible) + Command Palette (future)
- User chose to implement Quick Actions Bar first

**Research Findings**:
- `MessageInput.tsx`: Current input component with textarea + send button
- `ModelAgentSelector.tsx`: Dropdown selector positioned above input
- `store.sendMessage()`: Can send slash commands as messages
- Commands available: /undo, /redo, /compact, /share, /copy, /export, etc.

### Metis Review
**Identified Gaps** (addressed):
- Need to verify icon library exists in codebase → Use inline SVG icons
- sendMessage API validation → Confirmed: `sendMessage("/undo")` pattern works
- "More" button functionality → Explicitly a placeholder, no implementation
- Accessibility concerns → Include accessibilityLabel on all buttons
- Touch target size → Minimum 44pt per iOS HIG
- Keyboard handling → Test bar stays visible when keyboard appears

---

## Work Objectives

### Core Objective
Create a horizontal Quick Actions Bar component that provides one-tap access to common slash commands, positioned between ModelAgentSelector and the message textarea.

### Concrete Deliverables
1. `src/components/QuickActionsBar.tsx` - Standalone presentational component
2. Updated `src/components/MessageInput.tsx` - Integration with QuickActionsBar
3. Verified keyboard behavior on iOS

### Definition of Done
- [ ] QuickActionsBar renders 4 buttons: Undo, Redo, Attach, More
- [ ] Tapping Undo/Redo/Attach sends corresponding slash command
- [ ] "More" button shows placeholder (no-op for now)
- [ ] Bar remains visible when iOS keyboard appears
- [ ] Touch targets are minimum 44x44pt
- [ ] Dark mode styling matches existing app theme

### Must Have
- Horizontal scrollable bar (for future extension with more buttons)
- Inline SVG icons for Undo, Redo, Attach, Menu/More
- Consistent styling with existing zinc/blue theme
- iOS Safe Area inset handling
- Debounced tap handling (prevent double-sends)

### Must NOT Have (Guardrails)
- ❌ Command Palette implementation (Phase 2)
- ❌ "More" button functionality (placeholder only)
- ❌ Command customization or reordering
- ❌ Command state tracking (in-progress indicators)
- ❌ Animations beyond basic CSS transitions
- ❌ Analytics or tracking
- ❌ Gesture controls (swipe, long-press)
- ❌ Command history or suggestions
- ❌ Modifications to existing TUI command implementations

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> Every criterion MUST be verifiable by running a command or using a tool.

### Test Decision
- **Infrastructure exists**: YES (React project with bun)
- **Automated tests**: Tests-after (verify component renders and calls handlers)
- **Framework**: bun test / vitest

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Component rendering** | Playwright | Navigate to app, assert DOM elements exist |
| **Tap handlers** | Playwright | Click button, verify sendMessage called |
| **Keyboard behavior** | Playwright | Simulate keyboard, verify bar position |
| **Dark mode** | Playwright | Toggle theme, screenshot comparison |

---

## Execution Strategy

### Sequential Execution (No Parallelization)

```
Task 1: Create QuickActionsBar component
    ↓
Task 2: Integrate into MessageInput
    ↓
Task 3: Add tests and verify on iOS
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 3 | None |
| 3 | 1, 2 | None | None |

---

## TODOs

- [x] 1. Create QuickActionsBar Component

  **What to do**:
  - Create `src/components/QuickActionsBar.tsx`
  - Define action configuration array with id, icon, label, command
  - Render horizontal scrollable container with buttons
  - Each button: icon + optional label, tap handler
  - Use Tailwind CSS matching existing zinc/blue theme
  - Add debounce to prevent rapid double-taps (300ms)
  - Include accessibility labels on all buttons

  **Action Configuration**:
  ```typescript
  const QUICK_ACTIONS = [
    { id: 'undo', icon: UndoIcon, label: 'Undo', command: '/undo' },
    { id: 'redo', icon: RedoIcon, label: 'Redo', command: '/redo' },
    { id: 'attach', icon: AttachIcon, label: 'Attach', command: '/attach' },
    { id: 'more', icon: MoreIcon, label: 'More', command: null }, // Placeholder
  ] as const;
  ```

  **Component Interface**:
  ```typescript
  interface QuickActionsBarProps {
    onAction: (command: string) => void;
    disabled?: boolean;
  }
  ```

  **Must NOT do**:
  - Do NOT implement Command Palette
  - Do NOT add command state tracking
  - Do NOT couple to Zustand store directly (use prop callback)
  - Do NOT add persistence or customization

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component creation with styling and layout
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Component design patterns and accessibility

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2, Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `src/components/ModelAgentSelector.tsx` - Button styling and dropdown pattern
  - `src/components/MessageInput.tsx:70-111` - Input area layout and button styling

  **Style References**:
  - Existing buttons use `bg-zinc-800`, `hover:bg-zinc-700`, `rounded-xl`
  - Primary actions use `bg-blue-600`, `hover:bg-blue-700`
  - Text colors: `text-white`, `text-zinc-400`, `text-zinc-500`

  **Acceptance Criteria**:

  **Unit Tests (bun test)**:
  - [ ] QuickActionsBar renders without crashing
  - [ ] 4 buttons present in DOM
  - [ ] onAction called with correct command on button tap
  - [ ] "More" button does not call onAction

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Component renders all buttons
    Tool: Bash (bun test)
    Preconditions: Test file created
    Steps:
      1. Run: bun test src/components/QuickActionsBar.test.tsx
      2. Assert: All tests pass
    Expected Result: 0 failures
    Evidence: Terminal output captured

  Scenario: Buttons have correct accessibility labels
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Navigate to http://localhost:3000
      2. Select a device and session
      3. Wait for QuickActionsBar to render
      4. Query: button[aria-label="Undo"]
      5. Assert: Element exists and is visible
      6. Query: button[aria-label="Redo"]
      7. Assert: Element exists and is visible
      8. Query: button[aria-label="Attach"]
      9. Assert: Element exists and is visible
      10. Query: button[aria-label="More"]
      11. Assert: Element exists and is visible
    Expected Result: All 4 buttons have aria-labels
    Evidence: Screenshot .sisyphus/evidence/task-1-accessibility.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add QuickActionsBar component`
  - Files: `src/components/QuickActionsBar.tsx`

---

- [x] 2. Integrate QuickActionsBar into MessageInput

  **What to do**:
  - Import QuickActionsBar in MessageInput.tsx
  - Position between ModelAgentSelector and textarea
  - Connect onAction to store.sendMessage()
  - Handle disabled state when session is busy
  - Ensure iOS Safe Area handling is preserved

  **Integration Point**:
  ```tsx
  // In MessageInput.tsx
  <div className="border-t border-zinc-800">
    <div className="px-4 pt-2">
      <ModelAgentSelector />
    </div>
    {/* NEW: Quick Actions Bar */}
    <QuickActionsBar 
      onAction={(cmd) => sendMessage(cmd)}
      disabled={isSessionBusy}
    />
    <form onSubmit={handleSubmit} className="p-4 pt-2">
      {/* existing textarea and buttons */}
    </form>
  </div>
  ```

  **Must NOT do**:
  - Do NOT change textarea behavior
  - Do NOT modify send button
  - Do NOT break existing keyboard handling
  - Do NOT add new store actions

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Component integration with existing UI
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Layout and component composition

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/components/MessageInput.tsx` - Full file, integration target
  - `src/store/index.ts:741-803` - sendMessage implementation

  **API References**:
  - `useAppStore.sendMessage(text: string)` - Sends message to current session

  **Acceptance Criteria**:

  **Visual Verification**:
  - [ ] QuickActionsBar visible between ModelAgentSelector and textarea
  - [ ] Bar matches existing styling
  - [ ] Bar disabled when session is busy (gray out)

  **Functional Verification**:
  - [ ] Tap Undo → sendMessage("/undo") called
  - [ ] Tap Redo → sendMessage("/redo") called
  - [ ] Tap Attach → sendMessage("/attach") called
  - [ ] Tap More → no action (placeholder)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Undo button sends /undo command
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, connected to test device, session selected
    Steps:
      1. Navigate to http://localhost:3000
      2. Complete auth flow (or mock)
      3. Select/create a session
      4. Wait for QuickActionsBar visible
      5. Click button[aria-label="Undo"]
      6. Wait 500ms for message to appear
      7. Assert: Last message in MessageList contains "/undo" OR store.sendMessage was called
    Expected Result: /undo command sent
    Evidence: Screenshot .sisyphus/evidence/task-2-undo.png

  Scenario: Buttons disabled when session busy
    Tool: Playwright (playwright skill)
    Preconditions: Session is processing a request
    Steps:
      1. Send a message that triggers processing
      2. While session is busy (spinner visible)
      3. Query: button[aria-label="Undo"]
      4. Assert: button has disabled attribute or opacity reduced
    Expected Result: Buttons appear disabled
    Evidence: Screenshot .sisyphus/evidence/task-2-disabled.png

  Scenario: Bar stays visible when keyboard opens
    Tool: Playwright (playwright skill)
    Preconditions: Running on iOS simulator or device
    Steps:
      1. Navigate to chat view
      2. Take initial screenshot (bar visible)
      3. Tap textarea to open keyboard
      4. Wait 500ms for keyboard animation
      5. Assert: QuickActionsBar still visible above textarea
      6. Take screenshot
    Expected Result: Bar visible with keyboard open
    Evidence: Screenshot .sisyphus/evidence/task-2-keyboard.png
  ```

  **Commit**: YES
  - Message: `feat(ui): integrate QuickActionsBar into MessageInput`
  - Files: `src/components/MessageInput.tsx`

---

- [x] 3. Add Tests and Verify on iOS

  **What to do**:
  - Create unit test file for QuickActionsBar
  - Create integration test for MessageInput with QuickActionsBar
  - Build and run on iOS Simulator
  - Verify touch targets, dark mode, keyboard behavior

  **Test Structure**:
  ```typescript
  // src/components/QuickActionsBar.test.tsx
  describe('QuickActionsBar', () => {
    it('renders 4 action buttons', () => {});
    it('calls onAction with /undo when Undo tapped', () => {});
    it('calls onAction with /redo when Redo tapped', () => {});
    it('calls onAction with /attach when Attach tapped', () => {});
    it('does not call onAction when More tapped', () => {});
    it('disables buttons when disabled prop is true', () => {});
    it('debounces rapid taps', () => {});
  });
  ```

  **Must NOT do**:
  - Do NOT test Command Palette (doesn't exist)
  - Do NOT add E2E tests requiring real device
  - Do NOT add visual regression tests (manual step)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Test file creation and verification
  - **Skills**: []
    - No special skills needed for basic test writing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Task 2)
  - **Blocks**: None
  - **Blocked By**: Task 1, Task 2

  **References**:

  **Test Pattern References**:
  - Look for existing test files in `src/` or `__tests__/` directory
  - Follow vitest or jest patterns from project

  **Build References**:
  - `package.json` - scripts section for test and build commands
  - `capacitor.config.ts` - iOS build configuration

  **Acceptance Criteria**:

  **Test Execution**:
  - [ ] `bun test` passes with all tests green
  - [ ] No TypeScript errors (`bun tsc --noEmit`)
  - [ ] iOS build succeeds (`npx cap build ios`)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Unit tests pass
    Tool: Bash
    Preconditions: Test file created
    Steps:
      1. Run: bun test
      2. Assert: Exit code 0
      3. Assert: Output contains "Tests: X passed"
    Expected Result: All tests pass
    Evidence: Terminal output captured

  Scenario: TypeScript compiles without errors
    Tool: Bash
    Preconditions: All source files updated
    Steps:
      1. Run: bun tsc --noEmit
      2. Assert: Exit code 0
      3. Assert: No error output
    Expected Result: Clean compilation
    Evidence: Terminal output captured

  Scenario: iOS build succeeds
    Tool: Bash
    Preconditions: Code changes committed, Xcode available
    Steps:
      1. Run: bun run build
      2. Run: npx cap sync ios
      3. Assert: No errors in output
    Expected Result: iOS app synced successfully
    Evidence: Terminal output captured

  Scenario: Dark mode styling correct
    Tool: Playwright (playwright skill)
    Preconditions: App running in dark mode
    Steps:
      1. Navigate to http://localhost:3000
      2. Verify dark mode active (body has dark class or media query)
      3. Screenshot QuickActionsBar
      4. Assert: Buttons use zinc-800 background
      5. Assert: Icons are visible (not same color as background)
    Expected Result: Proper dark mode contrast
    Evidence: Screenshot .sisyphus/evidence/task-3-darkmode.png
  ```

  **Commit**: YES
  - Message: `test(ui): add QuickActionsBar tests`
  - Files: `src/components/QuickActionsBar.test.tsx`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(ui): add QuickActionsBar component` | QuickActionsBar.tsx | Component renders |
| 2 | `feat(ui): integrate QuickActionsBar into MessageInput` | MessageInput.tsx | Bar visible in app |
| 3 | `test(ui): add QuickActionsBar tests` | QuickActionsBar.test.tsx | bun test passes |

---

## Success Criteria

### Verification Commands
```bash
bun test                    # Expected: All tests pass
bun tsc --noEmit            # Expected: No errors
bun run build               # Expected: Successful build
npx cap sync ios            # Expected: iOS synced
```

### Final Checklist
- [ ] QuickActionsBar renders with 4 buttons (Undo, Redo, Attach, More)
- [ ] Tapping Undo/Redo/Attach sends corresponding slash command
- [ ] "More" button is placeholder (no functionality)
- [ ] Bar visible between ModelAgentSelector and textarea
- [ ] Bar stays visible when keyboard opens
- [ ] Touch targets are minimum 44x44pt
- [ ] Dark mode styling matches app theme
- [ ] No TypeScript errors
- [ ] All tests pass
- [ ] iOS build succeeds
