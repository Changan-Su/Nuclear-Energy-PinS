# Function Review: Reference Citation System

**Version**: 0.4  
**Date**: 2026-02-09  
**Status**: Production-ready

## Feature Name

Reference Citation System - Academic-style reference management with inline citation insertion and navigation

## Purpose

Enables content authors to:
1. Maintain a structured list of academic/web references in the footer
2. Easily cite references within content using an '@' mention interface
3. Allow readers to navigate from citations to full references with one click
4. Automatically manage reference numbering when adding/deleting references

This feature is essential for educational content that requires proper source attribution and academic credibility.

## Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interactions                        │
├─────────────────────────────────────────────────────────────┤
│  Add Ref   │   Delete Ref   │   Type '@'   │  Click Citation│
└─────┬──────┴────────┬────────┴──────┬───────┴───────┬────────┘
      │               │               │               │
      ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js (EditorSystem)              │
├─────────────────────────────────────────────────────────────┤
│  • enableReferenceEditing()    • setupAtMentionSystem()     │
│  • handleAddReference()        • handleAtKeyup()            │
│  • handleDeleteReference()     • showMentionDropdown()      │
│  • updateCitationsInDocument() • insertCitation()           │
│                                • handleCitationClick()       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                js/templates.js (footerTemplate)             │
├─────────────────────────────────────────────────────────────┤
│  • Renders reference items array                            │
│  • Migration logic for old format                           │
│  • Add/delete buttons (edit-mode-only)                      │
│  • data-material attributes for editing                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           js/section-renderer.js (SectionRenderer)          │
├─────────────────────────────────────────────────────────────┤
│  • reinitializeComponents()                                 │
│  • Calls setupCitationClickHandlers()                       │
│  • Ensures citations work in all modes                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    material.json (Data)                     │
├─────────────────────────────────────────────────────────────┤
│  footer: {                                                  │
│    reference: {                                             │
│      title: "Reference",                                    │
│      items: [                                               │
│        { id: 1, text: "Reference text here" }               │
│      ]                                                      │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

### Data Structure

**Material JSON**:
```json
{
  "index": {
    "footer": {
      "reference": {
        "title": "Reference",
        "items": [
          { "id": 1, "text": "Smith, J. (2024). Nuclear Energy Fundamentals. Academic Press." },
          { "id": 2, "text": "IAEA Safety Standards. https://www.iaea.org/safety" }
        ]
      }
    }
  }
}
```

**Content with Citations** (stored as HTML in material):
```html
Nuclear energy operates at full power more than 93% of the time<sup class="ref-cite" data-ref-id="2">[2]</sup>, making it the most reliable energy source.
```

**DOM Structure in Footer**:
```html
<div id="reference-list">
  <div id="ref-1" class="ref-item" data-ref-id="1">
    <span>[1]</span>
    <p data-material="footer.reference.items.0.text" data-ref-content="true">
      Smith, J. (2024). Nuclear Energy...
    </p>
    <button class="ref-delete-btn edit-mode-only" data-ref-delete="1">×</button>
  </div>
  
  <button id="add-reference-btn" class="edit-mode-only">
    + Add Reference
  </button>
</div>
```

### Code Structure

**Key Functions in `js/editor.js`**:

#### Reference Management
```javascript
enableReferenceEditing()
  └─> Binds add/delete button handlers

handleAddReference()
  └─> Creates new item in material.index.footer.reference.items
  └─> Assigns next available ID
  └─> Triggers re-render
  └─> Auto-focuses new reference for editing

handleDeleteReference()
  └─> Removes item from array
  └─> Renumbers remaining items (1, 2, 3...)
  └─> Calls updateCitationsInDocument()
  └─> Triggers re-render

updateCitationsInDocument()
  └─> Finds all .ref-cite elements
  └─> Updates data-ref-id attributes
  └─> Updates [n] text content
  └─> Removes orphaned citations
```

#### '@' Mention System
```javascript
setupAtMentionSystem()
  └─> Binds keyup listener to all [data-material] elements
  └─> Stores listeners for cleanup

handleAtKeyup(event, element)
  └─> Detects '@' character near cursor
  └─> Calls showMentionDropdown() if '@' found
  └─> Handles keyboard navigation (arrows, Enter, Escape)
  └─> Closes dropdown if '@' not present

showMentionDropdown(range, element)
  └─> Creates dropdown div at caret position
  └─> Populates with reference items
  └─> Binds click and keyboard handlers
  └─> Positions using Range.getBoundingClientRect()

insertCitation(refId, element)
  └─> Removes '@' character from text
  └─> Creates <sup class="ref-cite"> element
  └─> Inserts at cursor position
  └─> Maintains cursor position
  └─> Triggers save via blur event
```

#### Citation Navigation
```javascript
setupCitationClickHandlers()
  └─> Single delegated listener on document
  └─> Works in both view and edit modes

handleCitationClick(event)
  └─> Finds target reference by ID (#ref-n)
  └─> Smooth scroll to reference
  └─> Adds .ref-highlight animation class
  └─> Removes class after 2 seconds
```

### CSS Implementation

**`css/input.css` additions**:

```css
/* Edit mode visibility */
.edit-mode-only { display: none; }
body.edit-mode .edit-mode-only { display: flex; }

/* Citation styling */
.ref-cite {
  @apply text-accent-blue cursor-pointer;
  font-size: 0.75em;
  vertical-align: super;
  transition: color 0.2s;
}
.ref-cite:hover {
  @apply text-blue-400;
  text-decoration: underline;
}

/* Highlight animation */
@keyframes highlight-pulse {
  0% {
    background-color: rgba(34, 211, 238, 0.3);
    border-color: rgba(34, 211, 238, 0.8);
  }
  100% {
    background-color: transparent;
    border-color: transparent;
  }
}
.ref-highlight {
  animation: highlight-pulse 2s ease-out;
}

/* Mention dropdown */
.ref-dropdown {
  position: absolute;
  z-index: 1000;
  background: rgba(17, 17, 17, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  /* ... */
}
```

## Usage

### For Content Authors (Edit Mode)

#### Adding a Reference

1. **Enter Edit Mode**:
   - Click pencil icon in top navbar
   - Verify "Edit Mode" status appears

2. **Navigate to References**:
   - Scroll to page footer
   - Locate "Reference" section

3. **Add New Reference**:
   - Click "+ Add Reference" button (dashed border)
   - New entry appears with placeholder text
   - Reference is auto-focused and selected

4. **Edit Reference Text**:
   - Type reference content directly
   - Format: Author, Year, Title, Source
   - Example: `Smith, J. (2024). Title. Publisher.`
   - Content auto-saves on blur (clicking away)

#### Citing a Reference in Content

1. **Navigate to Content Field**:
   - Click into any editable text area
   - Examples: hero subtitle, feature description, section body

2. **Trigger Citation Menu**:
   - Position cursor where citation should appear
   - Type '@' character
   - Dropdown menu appears showing all references

3. **Select Reference**:
   - **Keyboard**: Arrow Up/Down to navigate, Enter to select
   - **Mouse**: Click desired reference
   - Dropdown shows: `[1] First 60 chars of reference...`

4. **Verify Citation**:
   - Blue superscript appears (e.g., `[2]`)
   - Citation is clickable
   - Content auto-saves with embedded HTML

#### Deleting a Reference

1. **Find Reference to Delete**:
   - In Edit mode, scroll to footer references
   - Hover over target reference

2. **Click Delete Button**:
   - Red "×" button appears on right side
   - Click to delete
   - Confirmation dialog appears

3. **Confirm Deletion**:
   - Click "OK" in dialog
   - Reference is removed
   - All remaining references renumber automatically
   - Any citations in content update to new numbers
   - Orphaned citations (to deleted ref) are removed

### For Readers (View Mode)

#### Following a Citation

1. **Locate Citation**:
   - Find blue superscript number in content
   - Example: "...93% of the time[2]..."

2. **Click Citation**:
   - Click the blue `[2]` superscript
   - Page smoothly scrolls to footer

3. **View Reference**:
   - Target reference highlights with cyan glow
   - Reference is centered in viewport
   - Highlight fades after 2 seconds

## API/Interface

### Public APIs (Exported from `js/editor.js`)

```javascript
window.EditorSystem = {
  enable: () => void,
  disable: () => void,
  refresh: () => void,
  setupCitationClickHandlers: () => void,
  removeCitationClickHandlers: () => void
}
```

### Data Attributes

**Content Fields**:
```html
<!-- Regular text (uses textContent) -->
<p data-material="hero.subtitle">Text here</p>

<!-- Content with citations (uses innerHTML) -->
<p data-material="features.description" data-ref-content="true">
  Text with citation<sup class="ref-cite" data-ref-id="1">[1]</sup>
</p>
```

**Reference Items**:
```html
<div id="ref-1" class="ref-item" data-ref-id="1">
  <span>[1]</span>
  <p data-material="footer.reference.items.0.text" data-ref-content="true">
    Reference text
  </p>
  <button data-ref-delete="1">×</button>
</div>
```

**Citation Elements**:
```html
<sup class="ref-cite" data-ref-id="2">[2]</sup>
```

### Material Paths

```
footer.reference.title          → "Reference" (section heading)
footer.reference.items          → Array of reference objects
footer.reference.items.0.text   → First reference text
footer.reference.items.1.text   → Second reference text
```

## Configuration

### CSS Classes

**Required for functionality**:
- `.edit-mode` - Body class that shows edit-mode-only elements
- `.ref-cite` - Citation superscript styling
- `.ref-item` - Reference row container
- `.ref-highlight` - Animation class for scroll target
- `.ref-dropdown` - '@' mention dropdown container
- `.edit-mode-only` - Hide/show based on edit mode

### Keyboard Shortcuts

**While '@' dropdown is open**:
- `Arrow Down` - Next reference option
- `Arrow Up` - Previous reference option
- `Enter` - Insert selected reference
- `Escape` - Close dropdown without inserting

## Integration

### With Template System (`js/templates.js`)

- Footer template renders reference items array
- Automatic migration from old `body` format to `items` array
- Each item gets unique `id` attribute for scroll targeting
- Edit buttons only rendered when marked with `edit-mode-only` class

### With Mode Manager (`js/mode-manager.js`)

- `body.edit-mode` class controlled by mode manager
- Material updates persist via existing `updateMaterialInMemory()` API
- Online mode syncs reference changes to MySQL
- Offline mode saves to localStorage draft
- Undo/redo stack captures reference add/delete operations

### With Section Renderer (`js/section-renderer.js`)

- `reinitializeComponents()` calls `setupCitationClickHandlers()`
- Citation clicks work immediately after page render
- No duplicate handlers (event delegation pattern)
- Compatible with dynamic section add/remove

### With Import/Export System

- Citations stored as HTML in material JSON
- Export preserves `<sup>` tags in reference text
- Import validates and accepts both old (body) and new (items) format
- HTML content is trusted (no XSS risk from admin-authored content)

## References

### External Dependencies
- None (uses vanilla JavaScript)

### Browser APIs Used
- `window.getSelection()` - Cursor position detection
- `Range.getBoundingClientRect()` - Dropdown positioning
- `Element.scrollIntoView()` - Smooth scroll navigation
- `contentEditable` - Inline text editing
- `localStorage` - Offline draft persistence

### Related Documentation
- [CMS Mode System](./FunctionReview_v0.3_CMS_Mode_System.md) - Edit mode lifecycle
- [Template System](./FunctionReview_v0.3_Template_System.md) - Footer rendering
- [Inline Editor](./FunctionReview_v0.3_Inline_Editor.md) - ContentEditable handling
- [Material Format](../Log/v0.3_cms_system.md) - Data structure

### Design Patterns Used
- **Event Delegation** - Citation clicks handled at document level
- **Observer Pattern** - Keyup listeners for '@' trigger detection
- **Factory Pattern** - Citation element creation
- **Command Pattern** - Add/delete reference with undo support

## Best Practices

### For Content Authors

**Writing Good References**:
```
✓ Good: Smith, J. (2024). Nuclear Safety Standards. IAEA Press.
✓ Good: https://www.iaea.org/safety (accessed Feb 9, 2026)
✗ Bad: some website
✗ Bad: [1] John's paper
```

**Citation Placement**:
```
✓ Good: "...93% of the time.[2]"
✓ Good: "According to Smith et al.[1], nuclear..."
✗ Bad: "[2] ...93% of the time."
```

**Managing Many References**:
- Add references in order of first citation
- Use clear, descriptive reference text
- Delete unused references to keep list clean
- Export material.json for backup before major changes

### For Developers

**Adding Citation Support to New Templates**:
```javascript
// In template function:
`<p data-material="section.text" data-ref-content="true">
  ${data.text || ''}
</p>`
```

**Handling HTML Content**:
```javascript
// Use innerHTML for citation-containing fields
const hasRefs = element.hasAttribute('data-ref-content');
const value = hasRefs ? element.innerHTML : element.textContent;
```

**Performance Optimization**:
- Event delegation prevents memory leaks
- Single scroll animation per citation click
- Dropdown created once, repositioned on show
- Keyboard navigation uses index tracking (no DOM queries)

## Troubleshooting

### Issue: '@' dropdown doesn't appear
**Causes**:
- Not in edit mode (check for pencil icon)
- Cursor not in contentEditable element
- No references exist yet (add at least one)
- Typing too fast (wait for keyup event)

**Solutions**:
- Enable edit mode
- Click into a `[data-material]` field
- Add a reference first
- Type '@' and wait briefly

### Issue: Citations don't scroll to references
**Causes**:
- JavaScript error preventing handler setup
- Reference ID mismatch
- Footer not rendered

**Solutions**:
- Check browser console for errors
- Verify `id="ref-n"` matches `data-ref-id="n"`
- Reload page to re-initialize handlers

### Issue: Deleted reference leaves broken citations
**Expected behavior**: Citations auto-update or remove

**If not working**:
- Check `updateCitationsInDocument()` was called
- Verify material update triggered re-render
- Manually delete orphaned `<sup>` tags in edit mode

### Issue: Reference numbering wrong after deletion
**Expected**: Automatic renumbering (1, 2, 3...)

**If not working**:
- Check `items.forEach((item, index) => item.id = index + 1)`
- Verify material was updated before re-render
- Export material to inspect actual IDs

## Examples

### Example 1: Simple Text Citation

**Material Data**:
```json
{
  "hero": {
    "subtitle": "Powering the future with zero emissions.<sup class=\"ref-cite\" data-ref-id=\"1\">[1]</sup>"
  },
  "footer": {
    "reference": {
      "items": [
        { "id": 1, "text": "IAEA Climate Report 2024" }
      ]
    }
  }
}
```

**Rendered Output**:
> Powering the future with zero emissions.[1]

### Example 2: Multiple Citations

**Material Data**:
```json
{
  "features": {
    "cards": [
      {
        "description": "Nuclear plants operate at 93% capacity<sup class=\"ref-cite\" data-ref-id=\"2\">[2]</sup> and produce zero emissions<sup class=\"ref-cite\" data-ref-id=\"1\">[1]</sup>."
      }
    ]
  }
}
```

**Rendered Output**:
> Nuclear plants operate at 93% capacity[2] and produce zero emissions[1].

### Example 3: Citation in Reference Text (Meta-Citation)

**Material Data**:
```json
{
  "footer": {
    "reference": {
      "items": [
        { "id": 1, "text": "IAEA Climate Report 2024" },
        { "id": 2, "text": "World Nuclear Association. Based on data from<sup class=\"ref-cite\" data-ref-id=\"1\">[1]</sup>." }
      ]
    }
  }
}
```

**Rendered Output**:
> [2] World Nuclear Association. Based on data from[1].

(Clicking [1] within reference [2] navigates to reference [1])

## Version History

**v0.4 (2026-02-09)**:
- Initial implementation
- Dynamic reference list with add/delete
- '@' mention citation insertion
- Click-to-jump navigation with highlight
- Automatic renumbering on deletion
- Edit-mode-only UI controls
- HTML preservation for citations
- View mode support for navigation

## Future Enhancements

**Potential additions** (not implemented):
- Citation style formats (APA, MLA, IEEE, Chicago)
- Reference tooltips on citation hover
- Bulk import from BibTeX/RIS files
- Automatic alphabetical sorting
- Duplicate reference detection
- In-text author-year citations
- Footnotes vs endnotes option
- Cross-reference linking
- Citation count statistics
- Bibliography export format

---

**Last Updated**: 2026-02-09  
**Tested On**: Chrome 120+, Firefox 121+, Edge 120+  
**Compatibility**: Requires ES6+ browser support
