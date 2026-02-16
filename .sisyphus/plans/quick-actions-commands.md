# Quick Actions Bar: Commands & Layout Enhancement

## TL;DR

> **Quick Summary**: Add slash commands functionality to the "More" button and move the QuickActionsBar to be inline with the ModelAgentSelector on the right side.
> 
> **Deliverables**:
> - Commands API integration (`getCommands()`)
> - CommandsModal component for displaying available slash commands
> - Updated layout with QuickActionsBar on same row as agent selector
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - sequential
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4

---

## Context

### Original Request
用户请求：
1. "展示可用的 slash command 吧" - More 按钮应该显示可用的 slash commands
2. "把这三个按钮整体移到右边和 agent 放在一行" - 调整布局

### Research Findings
- OpenCode 有 `GET /command` API 返回可用的 commands
- Command.Info 结构: `{ name, description?, hints[] }`
- 已有 SkillsModal 组件可作为 CommandsModal 的参考模板

---

## Work Objectives

### Core Objective
实现 More 按钮显示 slash commands 列表，并将 QuickActionsBar 移到与 ModelAgentSelector 同一行

### Concrete Deliverables
- `src/lib/opencode.ts` - 添加 `getCommands()` 函数和 `CommandInfo` 类型
- `src/app/api/opencode/commands/route.ts` - Commands API 代理
- `src/components/CommandsModal.tsx` - Commands 选择弹窗
- `src/store/index.ts` - 添加 commands 状态和 fetchCommands action
- `src/components/MessageInput.tsx` - 调整布局，将按钮移到右侧
- `src/components/QuickActionsBar.tsx` - 启用 More 按钮

### Must Have
- More 按钮点击后显示可用的 slash commands
- 选择 command 后填充 `/{command} ` 到输入框（与 skills 行为一致）
- 三个按钮与 agent selector 在同一行
- Commands 包含 `init`, `review` 等内置命令以及 MCP prompts

### Must NOT Have (Guardrails)
- 不要自动执行 command
- 不要显示复杂的 command 参数编辑界面（hints 仅供参考）
- 不要修改 OpenCode 源码

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (简单功能)
- **Framework**: bun test / vitest

### Agent-Executed QA Scenarios (MANDATORY)

```
Scenario: More button shows commands modal
  Tool: Playwright (playwright skill)
  Preconditions: Dev server running, user in a session
  Steps:
    1. Navigate to session view
    2. Click the More button (three dots icon)
    3. Wait for modal to appear
    4. Assert: Modal title "Available Commands" is visible
    5. Assert: At least "init" and "review" commands are listed
  Expected Result: Commands modal displays with available commands

Scenario: Selecting command fills input
  Tool: Playwright (playwright skill)
  Steps:
    1. Open commands modal
    2. Click on "init" command
    3. Assert: Modal closes
    4. Assert: Input field contains "/init "
    5. Assert: Input is focused
  Expected Result: Command is filled into input with trailing space

Scenario: QuickActionsBar is inline with agent selector
  Tool: Playwright (playwright skill)
  Steps:
    1. Navigate to session view
    2. Take screenshot of input area
    3. Assert: Compact, Skills, More buttons are on same row as agent selector
  Expected Result: Layout is horizontal, not stacked
  Evidence: .sisyphus/evidence/task-4-layout.png
```

---

## TODOs

- [x] 1. Add Commands API to opencode.ts

  **What to do**:
  - Add `CommandInfo` interface: `{ name: string; description?: string; hints: string[] }`
  - Add `getCommands()` function that calls `GET /command` API
  - Add proxy path mapping in `getApiUrl()` for `/command` → `/api/opencode/commands`

  **References**:
  - `src/lib/opencode.ts:713-725` - SkillInfo and getSkills() as pattern
  - OpenCode `GET /command` endpoint returns `Command.Info[]`

  **Acceptance Criteria**:
  - [ ] `CommandInfo` interface exported
  - [ ] `getCommands()` function works for both native and web
  - [ ] Returns empty array on error

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 2, 3

  **Commit**: YES (groups with 2)

---

- [x] 2. Create Commands API proxy route

  **What to do**:
  - Create `/api/opencode/commands/route.ts`
  - Proxy GET requests to OpenCode `/command` endpoint
  - Follow same pattern as `/api/opencode/skills/route.ts`

  **References**:
  - `src/app/api/opencode/skills/route.ts` - Exact same pattern

  **Acceptance Criteria**:
  - [ ] File created at `src/app/api/opencode/commands/route.ts`
  - [ ] GET handler proxies to `/command`
  - [ ] Returns JSON array of commands

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3)
  - **Blocked By**: Task 1

  **Commit**: YES (groups with 1)
  - Message: `feat(api): add commands API integration`
  - Files: `src/lib/opencode.ts`, `src/app/api/opencode/commands/route.ts`

---

- [x] 3. Create CommandsModal component

  **What to do**:
  - Create `CommandsModal.tsx` based on `SkillsModal.tsx`
  - Display command name and description
  - Use terminal/console icon instead of lightning bolt
  - Call `onSelectCommand(name)` when user selects a command

  **References**:
  - `src/components/SkillsModal.tsx` - Copy and adapt this component

  **Acceptance Criteria**:
  - [ ] Component renders list of commands
  - [ ] Shows "Available Commands" as title
  - [ ] Each command shows name and optional description
  - [ ] Click on command triggers `onSelectCommand` callback
  - [ ] Close button and Cancel button work

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Blocked By**: Task 1

  **Commit**: NO (groups with 4)

---

- [x] 4. Update store with commands state

  **What to do**:
  - Add `commands: CommandInfo[]` state
  - Add `fetchCommands()` action that calls `opencode.getCommands()`

  **References**:
  - `src/store/index.ts` - See `skills` and `fetchSkills()` pattern around line 60-70

  **Acceptance Criteria**:
  - [ ] `commands` state initialized as empty array
  - [ ] `fetchCommands()` action fetches and stores commands
  - [ ] Import `CommandInfo` from opencode.ts

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 1

  **Commit**: NO (groups with 5)

---

- [x] 5. Update MessageInput layout and integrate commands

  **What to do**:
  - Move QuickActionsBar to same row as ModelAgentSelector
  - Add state for `showCommandsModal`
  - Connect `handleMore` to fetch commands and show modal
  - Add `handleSelectCommand` similar to `handleSelectSkill`
  - Render CommandsModal

  **Layout change**:
  ```tsx
  // BEFORE:
  <div className="px-4 pt-2">
    <ModelAgentSelector />
  </div>
  <div className="px-4 pt-1">
    <QuickActionsBar ... />
  </div>

  // AFTER:
  <div className="px-4 pt-2 flex items-center justify-between gap-2">
    <ModelAgentSelector />
    <QuickActionsBar ... />
  </div>
  ```

  **References**:
  - `src/components/MessageInput.tsx:102-115` - Current layout
  - `src/components/MessageInput.tsx:73-92` - handleSkills and handleSelectSkill patterns

  **Acceptance Criteria**:
  - [ ] QuickActionsBar is on same row as ModelAgentSelector (right side)
  - [ ] More button opens CommandsModal
  - [ ] Selecting command fills `/{command} ` into input
  - [ ] CommandsModal is rendered and functional

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 3, 4

  **Commit**: NO (groups with 6)

---

- [x] 6. Enable More button in QuickActionsBar

  **What to do**:
  - Remove `disabled: true` from the More action in the actions array

  **References**:
  - `src/components/QuickActionsBar.tsx:113` - Current line: `{ id: "more", label: "More", icon: MoreIcon, onClick: onMore, disabled: true }`

  **Acceptance Criteria**:
  - [ ] More button is clickable (not disabled)
  - [ ] Clicking More button triggers `onMore` callback

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 5

  **Commit**: YES
  - Message: `feat(ui): add commands modal and update QuickActionsBar layout`
  - Files: `src/components/CommandsModal.tsx`, `src/components/MessageInput.tsx`, `src/components/QuickActionsBar.tsx`, `src/store/index.ts`

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|-------|
| 2 | `feat(api): add commands API integration` | opencode.ts, commands/route.ts |
| 6 | `feat(ui): add commands modal and update QuickActionsBar layout` | CommandsModal.tsx, MessageInput.tsx, QuickActionsBar.tsx, store/index.ts |

---

## Success Criteria

### Verification Commands
```bash
npm run build  # Should pass
npm test       # Should pass
```

### Final Checklist
- [ ] More button shows available commands
- [ ] Selecting command fills `/{command} ` into input
- [ ] QuickActionsBar is inline with ModelAgentSelector (right side)
- [ ] All existing tests pass
- [ ] Build succeeds
