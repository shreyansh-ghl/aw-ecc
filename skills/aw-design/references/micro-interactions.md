# Micro-interactions

Static-looking designs feel unfinished. Every prototype must include these CSS-only interactions.

## Transitions (global)

```css
* { transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease; }
```

## Buttons

```
:hover         → background shifts one shade darker, no shadow change
:focus-visible → 4px primary-soft ring (#D1E0FF in light, rgba(132,173,255,0.2) in dark)
:active        → transform: scale(0.97)
transition: all 0.15s ease
```

## Cards / List rows

```
:hover → background: #f9fafb (or #1a1a1a in dark), 0.2s ease
cursor: pointer if clickable
```

## Inputs

```
:focus-visible     → border #0040C1 + 4px #D1E0FF ring, 0.15s ease
:invalid (on blur) → border #f04438 + inline error message fade-in 0.2s
```

## Sidebar nav

```
:hover  → background: #f9fafb, 0.15s
Active  → #EFF4FF background + #155EEF text + 2px left border (slide-in on mount)
```

## Loading choreography

```
Skeleton shimmer: @keyframes pulse with background: linear-gradient(-90deg, #f2f4f7 0%, #e5e7eb 50%, #f2f4f7 100%), 1.5s infinite
Skeleton-to-content crossfade: 0.3s ease when data arrives
```

## Toast notifications

```
Slide in from top-right: translateX(100%) → 0, 0.25s ease-out
Auto-dismiss: fade out 0.2s after 4s
```

## Modal

```
Backdrop: opacity 0 → 0.4, 0.2s ease
Dialog:   translateY(8px) scale(0.98) opacity 0 → translateY(0) scale(1) opacity 1, 0.2s ease-out
Close:    reverse in 0.15s
```

## Page entrance (light touch)

Stagger reveal of top-level sections: each gets `animation: fadeUp 0.3s ease-out backwards` with `animation-delay: calc(var(--i) * 50ms)`. Max 5 staggered items.

## Accessibility fallback (mandatory)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
