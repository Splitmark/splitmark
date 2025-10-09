# Known Issues

This document tracks known limitations and issues in Splitmark that are documented but not yet resolved.

## Text Selection on Wrapped Lines

**Status**: Known Limitation
**Severity**: Minor (visual only)
**Affects**: Text selection when lines wrap due to narrow terminal width

### Description

When editing long lines that wrap to multiple visual lines, text selection behavior appears inconsistent. The selection highlighting may not align correctly with the visual line breaks.

### Root Cause

- Text wrapping is **visual only** - one logical line splits into multiple display lines
- Selection state tracks **logical positions** (line number + column in unwrapped text)
- Rendering maps logical selection to visual lines, but doesn't account for wrap positions

### Example

```
Logical line: "This is a very long line that wraps to multiple visual lines in the terminal"
Visual lines:
  Line 1: "This is a very long line"
  Line 2: "that wraps to multiple"
  Line 3: "visual lines in the terminal"

Selection from char 20-40 spans visual lines 1-2 but selection rendering assumes single line.
```

### Reproduction

1. Make terminal narrow (e.g., 80 columns)
2. Type a long line (100+ characters)
3. Use Shift+Arrow to select across the wrap point
4. Selection highlighting doesn't align with visual line breaks

### Impact

**Low Impact** because:

- Selection **functionally works** (correct text is selected/deleted)
- Only affects **visual highlighting** appearance
- Rare in typical use (most Markdown lines are < 80 chars)
- Workaround: Widen terminal or add manual line breaks

### Workaround

**For users:**

1. Use wider terminal window to avoid wrapping
2. Add manual line breaks in Markdown (recommended Markdown style anyway)
3. Selection still works correctly even if highlighting looks off

**For developers:**
None currently - this is architectural limitation.

### Proper Fix (Future)

A complete fix would require:

1. **Logical-to-Visual mapping**

   ```javascript
   // Map logical position to visual position
   function logicalToVisual(line, col, wrapWidth) {
     const wrapped = wrapTextLine(line, wrapWidth);
     let currentPos = 0;
     for (let i = 0; i < wrapped.length; i++) {
       if (col <= currentPos + wrapped[i].length) {
         return {
           visualLine: i,
           visualCol: col - currentPos,
         };
       }
       currentPos += wrapped[i].length;
     }
   }
   ```

2. **Selection rendering per visual line**

   - Calculate selection start/end for each wrapped line segment
   - Apply highlighting only to the relevant portion of each visual line

3. **Cursor position tracking**
   - Track both logical position (for editing) and visual position (for display)
   - Update visual position when wrapping changes

### Complexity

**High complexity** (~40 hours of work):

- Requires refactoring TextBuffer rendering logic
- Need comprehensive test coverage for edge cases
- Must handle dynamic wrapping (terminal resize)
- Risk of introducing new bugs in core editing

### Priority

**Low Priority** because:

- ✅ Functionality is not affected (correct text is selected)
- ✅ Rare edge case (most lines don't wrap)
- ✅ Easy workaround available (widen terminal)
- ✅ No data loss or corruption risk

### Related Code

- `src/components/TextBuffer.jsx` - `renderLineWithCursorAndSelection()`
- `src/components/TextBuffer.jsx` - `wrapTextLine()`
- Selection state management in TextBuffer component

### Testing

Current tests do not cover wrapped line selection because it's a visual-only issue:

- Unit tests pass (selection logic is correct)
- Integration tests pass (text operations work correctly)
- Visual regression would require screenshot tests

---

## Other Known Issues

### None Currently

All other known issues have been resolved.

---

## Reporting New Issues

If you discover a new issue:

1. Check if it's already listed here
2. Try to reproduce it reliably
3. Open an issue on GitHub with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment (OS, terminal, Node.js version)
   - Screenshots if visual issue

**GitHub Issues**: https://github.com/splitmark/splitmark/issues
