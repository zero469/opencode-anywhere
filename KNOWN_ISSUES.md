# Known Issues

## SlashCommandModal Hover State Bug

**Version**: 1.4.2
**Severity**: Low (cosmetic)

**Description**: When opening the Slash Commands modal, occasionally a random item appears with hover background styling even though the user hasn't hovered over it.

**Reproduction**:
1. Open Slash Commands modal
2. Hover over an item in Skills tab
3. Switch to Commands tab
4. Sometimes an item appears pre-highlighted

**Root Cause**: Suspected React state/DOM reconciliation issue where hover state persists across filter changes despite explicit state reset in useEffect.

**Attempted Fixes**:
- Switched from direct DOM style manipulation to React state management
- Added useEffect to reset hover state when modal opens
- Clear hover state on tab switch

**Status**: Open - needs further investigation
