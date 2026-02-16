# Fix Skills YAML Frontmatter

## TL;DR

> **Quick Summary**: Add required YAML frontmatter to skill files so OpenCode can discover them.
> 
> **Deliverables**: 
> - 4 skill files with proper frontmatter
> 
> **Estimated Effort**: Quick (5 minutes)
> **Parallel Execution**: NO - sequential
> **Critical Path**: Task 1 (single task)

---

## Context

### Original Request
User reported: "你之前帮我写的skill我在opencode里找不到呀" (Can't find the skills in OpenCode)

### Root Cause Analysis
1. Skills were created at `.opencode/skills/*.md` instead of `.opencode/skills/{name}/SKILL.md` ✅ (Fixed by restructuring)
2. Skill files are missing YAML frontmatter with `name` and `description` fields ❌ (Needs fix)

OpenCode's skill discovery requires this format:
```markdown
---
name: skill-name
description: Brief description
---
```

Reference: `/Users/liuyao/Code/opencode-source/packages/opencode/src/skill/skill.ts` lines 17-21, 60-61

---

## Work Objectives

### Core Objective
Add YAML frontmatter to all 4 skill files so OpenCode can discover and load them.

### Concrete Deliverables
- `.opencode/skills/ios-testflight/SKILL.md` - with frontmatter
- `.opencode/skills/capacitor-ios/SKILL.md` - with frontmatter
- `.opencode/skills/github-actions-ci/SKILL.md` - with frontmatter
- `.opencode/skills/azure-webapp-deploy/SKILL.md` - with frontmatter

### Definition of Done
- [ ] All 4 skill files have valid YAML frontmatter
- [ ] OpenCode can list the skills (verify in OpenCode TUI)

---

## Verification Strategy

### Agent-Executed QA Scenarios (MANDATORY)

After adding frontmatter, verify by checking OpenCode skill loading.

---

## TODOs

- [x] 1. Add YAML frontmatter to all skill files

  **What to do**:
  
  Add this frontmatter block at the TOP of each file (before existing content):
  
  **File: `.opencode/skills/ios-testflight/SKILL.md`**
  ```markdown
  ---
  name: ios-testflight
  description: Build, sign, and upload iOS app to TestFlight for beta testing
  ---
  
  # iOS TestFlight 发布
  ...rest of existing content...
  ```
  
  **File: `.opencode/skills/capacitor-ios/SKILL.md`**
  ```markdown
  ---
  name: capacitor-ios
  description: Next.js + Capacitor hybrid iOS app development workflow
  ---
  
  # Capacitor iOS 开发
  ...rest of existing content...
  ```
  
  **File: `.opencode/skills/github-actions-ci/SKILL.md`**
  ```markdown
  ---
  name: github-actions-ci
  description: GitHub Actions CI/CD automation for testing, building, and releasing
  ---
  
  # GitHub Actions CI
  ...rest of existing content...
  ```
  
  **File: `.opencode/skills/azure-webapp-deploy/SKILL.md`**
  ```markdown
  ---
  name: azure-webapp-deploy
  description: Deploy Go services to Azure Web App using Docker containers
  ---
  
  # Azure Web App 部署
  ...rest of existing content...
  ```

  **Must NOT do**:
  - Change any existing content in the files
  - Delete the `# Title` headers

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (no special skills needed)

  **References**:
  - Pattern: `/Users/liuyao/Code/opencode-source/.opencode/skill/test-skill/SKILL.md` - example frontmatter format
  - Code: `/Users/liuyao/Code/opencode-source/packages/opencode/src/skill/skill.ts:17-21` - Info schema requiring name, description

  **Acceptance Criteria**:
  - [ ] Each file starts with `---` followed by YAML with `name` and `description`
  - [ ] YAML frontmatter ends with `---` before the markdown content
  - [ ] Skill names match directory names (ios-testflight, capacitor-ios, etc.)

  **Agent-Executed QA Scenarios**:
  
  ```
  Scenario: Verify frontmatter syntax in all skill files
    Tool: Bash (grep/head)
    Steps:
      1. head -5 .opencode/skills/*/SKILL.md
      2. Assert: Each file shows "---" on line 1
      3. Assert: Each file shows "name:" on line 2
      4. Assert: Each file shows "description:" on line 3
      5. Assert: Each file shows "---" on line 4 or 5
    Expected Result: All 4 files have valid frontmatter structure
  ```

  **Commit**: YES
  - Message: `fix(skills): add YAML frontmatter for OpenCode discovery`
  - Files: `.opencode/skills/*/SKILL.md`

---

## Success Criteria

### Verification Commands
```bash
# Check frontmatter exists in all skill files
head -5 .opencode/skills/*/SKILL.md

# Expected: Each file starts with ---/name:/description:/---
```

### Final Checklist
- [ ] All 4 skill files have frontmatter
- [ ] name field matches directory name
- [ ] description is meaningful English text
- [ ] No existing content was deleted
