# Bug Review: Grid Card Display Issue

## Bug Information

- **Version**: v0.6 - Interactive Enhancements
- **Severity**: High (major UI component not visible)
- **Date Reported**: 2026-02-13
- **Date Resolved**: 2026-02-13
- **Reporter**: User
- **Resolver**: AI Assistant

---

## Description

The three feature cards in the Benefits section (Features/card-grid template) were not displaying on the webpage despite being present in the DOM structure.

**Chinese**: Features/Benefits 部分的三个特性卡片尽管存在于 DOM 结构中,但在网页上不可见。

---

## Steps to Reproduce

1. Open `index.html` in a web browser
2. Scroll down to the "Better by every measure" section (Benefits/Features)
3. Observe that the three cards ("High Energy Density", "Zero Emissions", "24/7 Reliability") are not visible
4. Using browser DevTools, inspect the DOM and confirm the cards exist but have `opacity: 0`

---

## Expected Behavior

- Three cards should be visible in a 3-column grid layout (on screens ≥768px)
- Cards should animate into view when scrolling to the section (fade-in-up effect)
- Each card should display:
  - Top section: 320px height image placeholder
  - Bottom section: Title and description text

---

## Actual Behavior

- Cards are present in DOM but invisible
- Intersection Observer not triggering the `.visible` class addition
- Cards remain at `opacity: 0` indefinitely
- Section appears empty to users

---

## Environment

- **Browser**: Chrome, Safari, Firefox (all affected)
- **OS**: macOS
- **Screen Size**: All sizes affected
- **Mode**: Both view and edit modes

---

## Root Cause Analysis

### Technical Analysis

The issue stemmed from incorrect height allocation in the card grid template's DOM structure:

**Problem Structure** (before fix):
```html
<div class="fade-in-up" style="transition-delay: 0.1s;">
  <div class="flip-card h-[560px] rounded-[24px]">
    <!-- Card content -->
  </div>
</div>
```

**Issues**:
1. **Outer container without explicit height**: The `fade-in-up` div had no height specification, causing it to potentially collapse
2. **CSS Initial State**: `.fade-in-up` class sets `opacity: 0` and `transform: translateY(20px)` by default
3. **Intersection Observer failure**: Without explicit height, the Intersection Observer couldn't reliably detect when elements entered the viewport
4. **Animation never triggered**: The `.visible` class was never added, so cards remained invisible

### Why This Happened

In CSS, when you have:
- Parent: no height specified, contains animated child
- Child: fixed height (h-[560px])
- Animation: depends on visibility detection

The parent's collapsed height (potentially 0px) can prevent proper Intersection Observer calculations, especially when the child uses absolute positioning or 3D transforms (as flip-card does).

### Technical Details

```css
/* Before Fix - Problematic */
.fade-in-up {
  opacity: 0;                    /* Invisible by default */
  transform: translateY(20px);   /* Offset downward */
  transition: opacity 0.8s ease-out, transform 0.8s ease-out;
}

.fade-in-up.visible {
  opacity: 1;                    /* Visible when detected */
  transform: translateY(0);
}
```

**Intersection Observer Logic**:
```javascript
observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');  // Never triggered
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
```

The observer checks if 10% of the element is visible in the viewport. If the element has collapsed height, this threshold is never met.

---

## Solution

### Code Changes

**File**: `js/templates.js`
**Function**: `cardGridTemplate()`
**Lines**: ~290-308

**Change**:
```javascript
// BEFORE
return `
  <div class="fade-in-up" style="transition-delay: ${delay}s;">
    ${renderFlipWrapper({
      // ...
      wrapperClass: 'h-[560px] rounded-[24px]',
      // ...
    })}
  </div>
`;

// AFTER
return `
  <div class="fade-in-up h-[560px]" style="transition-delay: ${delay}s;">
    ${renderFlipWrapper({
      // ...
      wrapperClass: 'h-full rounded-[24px]',
      // ...
    })}
  </div>
`;
```

**Additional Change**:
Removed redundant `transition-delay` from `frontHtml` inner div, as it was already applied to outer container.

### Fix Summary

1. **Moved height to outer container**: `h-[560px]` moved from flip-card wrapper to fade-in-up container
2. **Used height inheritance**: Inner flip-card wrapper changed to `h-full` to inherit parent's height
3. **Simplified delay logic**: Removed duplicate transition-delay from inner content

---

## Verification Steps

1. Refresh the page in browser (hard refresh: Cmd+Shift+R)
2. Scroll to Benefits section
3. Verify three cards are visible and properly laid out
4. Test scroll animation: scroll up/down to ensure fade-in-up effect works
5. Test responsiveness: resize browser to check grid behavior (1 column on mobile, 3 columns on desktop)
6. Check in both view and edit modes

---

## Impact Assessment

### Before Fix
- **User Impact**: High - major content section completely invisible
- **SEO Impact**: Medium - content present in DOM but not visible (may affect user metrics)
- **Accessibility**: High - screen readers would see content but visual users would not

### After Fix
- All cards display correctly
- Animations work as designed
- No visual or layout regressions
- Grid responsive behavior intact

---

## Lessons Learned

### For Future Development

1. **Container Heights with Animations**: Always give explicit heights to containers that use visibility-based animations
2. **Intersection Observer**: Test with various container sizes - collapsed containers can break detection
3. **CSS Inheritance**: When using `h-full`, ensure parent has explicit height
4. **Animation Testing**: Test fade-in animations by scrolling up and reloading, not just on initial load
5. **3D Transforms**: Elements with `transform-style: preserve-3d` may have special rendering contexts that affect parent sizing

### Best Practices

```javascript
// GOOD: Animation container with explicit height
<div class="fade-in-up h-[560px]">
  <div class="flip-card h-full">
    <!-- Content -->
  </div>
</div>

// BAD: Animation container without height
<div class="fade-in-up">
  <div class="flip-card h-[560px]">
    <!-- Content -->
  </div>
</div>
```

---

## Related Issues

- None at this time

---

## References

### Code Files
- `js/templates.js` - Card grid template implementation
- `js/section-renderer.js` - Intersection Observer initialization
- `js/scroll-animations.js` - Scroll animation system
- `css/input.css` - fade-in-up animation styles

### External Resources
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Tailwind CSS Height Utilities](https://tailwindcss.com/docs/height)
- [CSS 3D Transforms](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/perspective)
- [CSS Animation Timing](https://cubic-bezier.com/)

---

## Additional Notes

This bug was introduced in v0.6 during the implementation of flip card animations. The flip-card wrapper's 3D transform context may have contributed to the layout collapse. The fix ensures proper height propagation through the component hierarchy while maintaining the intended animation effects.

**Chinese**: 此 Bug 在 v0.6 版本实现翻转卡片动画时引入。flip-card 包装器的 3D 变换上下文可能加剧了布局崩塌问题。修复方案确保了组件层次结构中的正确高度传递,同时保持了预期的动画效果。
