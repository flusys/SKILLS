---
name: ui-design
description: "@flusys/ng-ui component catalog + Tailwind v4 design guide — design tokens, every component's selector and when to use it, and the styling conventions layered on top of generated CRUD screens. Load when choosing an Angular UI component, writing template markup, or making any Tailwind styling decision."
---

# `@flusys/ng-ui` + Tailwind Design Guide

Reference for building any screen on top of `@flusys/ng-ui` (v6). Native Angular 22, signal-based,
standalone, zoneless-compatible, no PrimeNG dependency. Tailwind v4 is the layout/spacing layer.
Neither replaces the other: **ng-ui owns component chrome** (borders, focus rings, severity
colors, sizing variants); **Tailwind owns layout** (flex/grid, gap, spacing, one-off text/color
utilities).

`ng-ui` depends only on `ng-core` — not `ng-shared` — and has no PRD trigger; it is never optional
and is always registered by `/bootstrap`:

```typescript
// app.config.ts — registered once by /bootstrap
import { provideNgUI, buildBootstrapPreset, MessageService, ConfirmationService } from '@flusys/ng-ui';

providers: [
  provideNgUI({
    theme: { preset: buildBootstrapPreset(), options: { darkModeSelector: '.app-dark' } },
  }),
  MessageService,
  ConfirmationService,
]
```

```html
<!-- app shell — once, near the root -->
<f-toast />
<f-confirmdialog />
```

`/bootstrap` wires the rest of the standard setup — don't re-derive it, verify it matches:

- `src/tailwind.css` (or equivalent) — `@import "tailwindcss";` then the ng-ui theme file, plus `@source` globs covering both `src/**/*.{html,ts}` and the `@flusys/**` dist output (library-emitted classes need to be scanned too, or they get purged).
- Dark mode toggles the `.app-dark` class on `<html>` — the theme's `@custom-variant dark (&:where(.app-dark, .app-dark *));` scopes `dark:` to that selector, not OS `prefers-color-scheme`. Never rely on bare `dark:` without confirming this variant is in scope.

For the exact generated list-page and form-dialog markup, see
[api-design/references/crud-generation.md](../api-design/references/crud-generation.md) — this
guide covers the component catalog and design-token/Tailwind conventions that generation follows;
it doesn't restate the templates themselves.

---

## 1. Design tokens — use these, not raw Tailwind colors

The theme exposes CSS custom properties that Tailwind's `@theme inline` maps to real utility
classes. Prefer these over `slate-500`, `#3b82f6`, inline `style`, etc. — they repaint
automatically when the preset/palette/dark-mode changes; a hardcoded color does not.

| Utility class | Token | Use for |
| --- | --- | --- |
| `bg-primary`, `text-primary` | `--color-primary` | Brand accents, active states |
| `bg-primary-{50..950}` | primary ramp | Tints/shades of the accent |
| `text-primary-contrast` | `--f-primary-contrast-color` | Text on a solid primary background |
| `bg-surface-0…950` | surface ramp | Neutral backgrounds, borders, muted UI |
| `surface-card` (or `bg-surface-card`) | `--f-content-background` | Card/panel backgrounds — respects dark mode |
| `surface-ground` | `--f-surface-100` / shell background | Page background |
| `bg-emphasis` | `--surface-hover` | Hover backgrounds |
| `border-surface` | `--f-content-border-color` | Default borders — always this, never `border-gray-200` |
| `text-color` | `--text-color` | Default body text |
| `text-muted-color` | `--f-text-muted-color` | Secondary/helper text |
| `ring-focus` | preset-driven focus ring | Custom focusable elements — matches the active preset's ring style automatically |
| `rounded-sm/md/lg/xl/2xl` | preset-driven radius scale | Radius — Aura is soft, Lara is squared, Nora is sharp; don't hardcode `rounded-[6px]` |
| `shadow-sm/md/lg/xl/2xl` | preset-driven shadow scale | Elevation |

Status colors (`--f-red-*`, `--f-orange-*`, `--f-yellow-*`, `--f-green-*`, `--f-blue-*`,
`--f-indigo-*`) are static, not palette-driven — used internally by severity props. Reach for a
component's `severity` input (`success | info | warn | danger`) before reaching for `text-red-500`
directly. The one accepted exception: a small, one-off inline hint (a required-field asterisk, a
validation `<small>`) that isn't really a "component" — that can use a raw status color directly,
as the generated form templates do.

Only four raw Tailwind colors have any place in ng-ui-adjacent code at all: red, orange/amber,
green, blue — as thin accents for things `severity` doesn't cover. Anything structural (card
backgrounds, borders, page chrome) goes through the tokens above.

---

## 2. Component catalog

Every ng-ui component, grouped by purpose. Selector column is what you write in a template.
`f-*` = component, `[fX]` = attribute directive applied to a native element, `ui-icon` = the icon
renderer. Import components individually (tree-shakes); `UiModule` exists only for bulk-import
convenience in non-standalone contexts or quick prototyping — don't use it in new feature code.

### Buttons & actions

| Component | Selector | When to use |
| --- | --- | --- |
| `ButtonComponent` | `f-button` | Every clickable action. Always set `severity`; default (`primary`) only for the single main action on a screen. |
| `FButtonDirective` | `[fButton]` | Styling a native `<a>` as a button (router-linked "button" that should stay a real anchor for right-click/open-in-new-tab) |
| `SplitButtonComponent` | `f-splitbutton` | One primary action + secondary variants (e.g. "Export" ▾ CSV/PDF) |
| `ButtonGroupComponent` | `f-buttongroup` | Segmented action clusters (view toggles, bulk-action bars) |
| `SpeedDialComponent` | `f-speeddial` | Floating multi-action FAB — rare in dense admin UIs, reserve for mobile-style flows |

### Form inputs

| Component/Directive | Selector | When to use |
| --- | --- | --- |
| `InputTextDirective` | `[fInputText]` | Every plain text `<input>` |
| `InputPasswordDirective` | `[fInputPassword]` | Password fields without strength UI |
| `PasswordComponent` | `f-password` | Password fields needing a strength meter + reveal toggle (registration, change-password) |
| `TextareaDirective` | `[fTextarea]` | Multi-line text |
| `SelectComponent` | `f-select` | Single choice from a **known, small, already-loaded** list |
| `MultiSelectComponent` | `f-multiselect` | Multiple choices from a known list |
| `LazySelectComponent` / `LazyMultiSelectComponent` (`@flusys/ng-shared`, not ng-ui) | `lib-lazy-select` / `lib-lazy-multi-select` | Choice from a **paginated backend list** (categories, products, any FK lookup) — full API in [api-design/references/ng-components.md](../api-design/references/ng-components.md) |
| `CheckboxComponent` | `f-checkbox` | Binary flags, "select row" checkboxes |
| `ToggleSwitchComponent` | `f-toggleswitch` | Settings on/off (reads better than a checkbox for "Active" flags) |
| `ToggleButtonComponent` | `f-togglebutton` | Two-state toggle with distinct labels ("Public"/"Private") |
| `SelectButtonComponent` | `f-selectbutton` | Segmented single/multi choice, ≤ 4-5 visible options (view mode, status filter) |
| `InputNumberComponent` | `f-inputnumber` | Any numeric field — quantities, prices, percentages. Never a plain `<input type="number">` with `fInputText` |
| `RadioButtonComponent` | `f-radiobutton` | Mutually exclusive choice, 2-4 options, all visible at once |
| `RatingComponent` | `f-rating` | Star ratings |
| `DatePickerComponent` | `f-datepicker` | Every date/date-range/datetime field |
| `FileUploadComponent` | `f-fileupload` | One-off, form-scoped upload with no need to browse existing storage |
| `AutoCompleteComponent` | `f-autocomplete` | Free-text-with-suggestions (tags, search-as-you-type over a small set) |
| `ColorPickerComponent` | `f-colorpicker` | Brand-color / label-color pickers |
| `ListboxComponent` | `f-listbox` | Always-visible option list (no dropdown), optionally filterable |
| `InputMaskDirective` | `[fInputMask]` | Fixed-format text (phone, formatted codes) |
| `InputOtpComponent` | `f-inputotp` | OTP/verification code entry |
| `SliderComponent` | `f-slider` | Numeric range selection, especially dual-handle min/max filters |
| `KnobComponent` | `f-knob` | Rare — dial-style numeric input for a dashboard-y feel |
| `CascadeSelectComponent` | `f-cascadeselect` | Dependent option chains (country → state → city) |
| `KeyFilterDirective` | `[fKeyFilter]` | Restrict keystrokes on a plain input when `f-inputnumber` doesn't fit |
| `TreeSelectComponent` | `f-treeselect` | Picking from a hierarchical structure (org units, nested categories) |
| `IconFieldComponent` / `InputIconComponent` | `f-iconfield` / `f-inputicon` | Search boxes, any input needing a leading/trailing icon |
| `FloatLabelComponent` | `f-floatlabel` | Compact forms where the label should float instead of sitting above the field |
| `IftaLabelComponent` | `f-iftalabel` | Persistent inline label paired with the input (dense filter bars) |
| `InputGroupComponent`/`InputGroupAddonComponent` | `f-inputgroup`/`f-inputgroupaddon` | Prefix/suffix addons — currency symbols, unit labels |
| `FluidComponent` | `f-fluid` | Wrap a form section to make every descendant control full-width, instead of adding `w-full` to each one |

### Data display & tables

| Component | Selector | When to use |
| --- | --- | --- |
| `TableComponent` | `f-table` | **The** list-page component. Always `[lazy]="true"` bound to a backend-paginated service — never load everything client-side for lists that can grow |
| `SortIconComponent`/`SortableColumnDirective` | `f-sorticon` / `[fSortableColumn]` | Inside `f-table` headers for server-side sortable columns |
| `PaginatorComponent` | `f-paginator` | Standalone pagination outside a table/dataview context |
| `TreeTableComponent` | `f-treetable` | Tabular data with parent/child rows (BOM, org chart with columns) |
| `TreeComponent` | `f-tree` | Pure hierarchy browsing/selection (category tree, folder tree) |
| `DataViewComponent` | `f-dataview` | Card/grid list with a list↔grid toggle (product catalogs, galleries) |
| `OrganizationChartComponent` | `f-organizationchart` | Org charts specifically — don't repurpose for generic trees |
| `PickListComponent` | `f-picklist` | Assign items from an available pool to a selected pool (permissions, role assignment) |
| `OrderListComponent` | `f-orderlist` | User-defined ordering of a single list (step order, priority order) |
| `ScrollerComponent` | `f-scroller` | Virtualize very large flat lists (thousands of rows) rendered outside `f-table` |
| `TimelineComponent` | `f-timeline` | Audit trails, activity feeds, order status history |
| `ChartComponent` | `f-chart` | Any Chart.js-backed chart |
| `MeterGroupComponent` | `f-metergroup` | Proportional breakdown (storage used, budget allocation) |

### Overlays & dialogs

| Component | Selector | When to use |
| --- | --- | --- |
| `DialogComponent` | `f-dialog` | Modal forms/details — the standard CRUD create/edit pattern |
| `DrawerComponent` | `f-drawer` | Filter panels, secondary detail panes that shouldn't fully block the page |
| `PopoverComponent` | `f-popover` | Small anchored content (info tooltip-with-actions, quick preview) |
| `ConfirmDialog` | `f-confirmdialog` | Destructive-action confirmation. One instance in the page/shell, driven by `ConfirmationService.confirm()` — never build a custom "are you sure" dialog |
| `ConfirmPopupComponent` | `f-confirmpopup` | Same as above but anchored/non-modal, for inline row actions |
| `DynamicDialogComponent`/`DynamicDialogService` | `f-dynamicdialog` | Opening an arbitrary component in a dialog imperatively (wizard steps, shared "pick a thing" dialogs reused across modules) |
| `BlockUiComponent` | `f-blockui` | Blocking a specific form/section during save — prefer this over disabling every control by hand |
| `ToastComponent` | `f-toast` | Success/error notifications, driven by `MessageService.add()`. One per page (or one globally) |

### Navigation & menus

| Component | Selector | When to use |
| --- | --- | --- |
| `MenuComponent` | `f-menu` | Row/card kebab menus, popup action lists |
| `MenubarComponent` | `f-menubar` | Top-level horizontal nav with nested items |
| `TieredMenuComponent` | `f-tieredmenu` | Deep multi-level flyouts |
| `ContextMenuComponent` | `f-contextmenu` | Right-click menus on table rows/cards |
| `MegaMenuComponent` | `f-megamenu` | Wide multi-column nav — rarely needed in an admin dashboard |
| `PanelMenuComponent` | `f-panelmenu` | Accordion-style sidebar nav sections |
| `BreadcrumbComponent` | `f-breadcrumb` | Page location trail on nested/detail pages |
| `DockComponent` | `f-dock` | Decorative app launcher — not a typical admin-UI need |
| `StepsComponent` | `f-steps` | Linear wizards (multi-step onboarding, checkout-style flows) |
| Tabs family | `f-tabs`/`f-tablist`/`f-tab`/`f-tabpanels`/`f-tabpanel` | Splitting one entity's detail view into sections (General / Security / Activity) |

### Media

| Component | Selector | When to use |
| --- | --- | --- |
| `ImageComponent` | `f-image` | Any image needing a click-to-preview overlay |
| `GalleriaComponent` | `f-galleria` | Multi-image galleries with thumbnails |
| `CarouselComponent` | `f-carousel` | Banners, sliding promos |
| `ImageCompareComponent` | `f-imagecompare` | Before/after comparisons |
| `AvatarComponent`/`AvatarGroupComponent` | `f-avatar`/`f-avatar-group` | User representation — image, initials via `label`, or icon fallback. `shape="circle"` for people, `square` for non-person entities (companies, files) |

### Feedback & status

| Component | Selector | When to use |
| --- | --- | --- |
| `TagComponent` | `f-tag` | Status labels inside table cells/cards (Active/Inactive/Pending) — map domain status → `severity` consistently across the app |
| `BadgeComponent` | `f-badge` | Standalone counts |
| `OverlayBadgeComponent` | `f-overlaybadge` | Count badge pinned to an icon (notification bell) |
| `MessageComponent` | `f-message` | Inline contextual banners (form-level warnings, empty-state hints) |
| `ProgressbarComponent` | `f-progressbar` | Determinate progress (upload %, multi-step completion) |
| `ProgressSpinnerComponent` | `f-progressspinner` | Indeterminate loading — prefer `[loading]` on the specific component (`f-button`, `f-table`) over a standalone spinner when one exists |
| `SkeletonComponent` | `f-skeleton` | Loading placeholders for cards/lists before data arrives — smoother than a spinner for list pages |
| `ChipComponent` | `f-chip` | Removable tag-like items (selected filters, multi-value inputs rendered outside a select) |

### Layout

| Component | Selector | When to use |
| --- | --- | --- |
| `CardComponent` | `f-card` | One-off content grouping with a header. Generated list pages use a plain `<div class="card p-4">` instead — see crud-generation.md; stay consistent with whichever convention a module already uses |
| `PanelComponent` | `f-panel` | Collapsible titled section within a page (advanced filters, optional details) |
| `FieldsetComponent` | `f-fieldset` | Bordered legend-labeled grouping inside a form (address block, contact block) |
| Accordion family | `f-accordion`/`f-accordion-panel`/`f-accordion-header`/`f-accordion-content` | Multiple independently collapsible sections (FAQ-style, settings groups) |
| `SplitterComponent`/`SplitterPanelComponent` | `f-splitter`/`f-splitter-panel` | Resizable multi-pane layouts (master-detail with a draggable divider) |
| `ToolbarComponent` | `f-toolbar` | Action bar with start/end slots when plain flex utilities aren't enough |
| `DividerComponent` | `f-divider` | Section separators, "or" splits between alternative actions |
| `ScrollPanelComponent` | `f-scrollpanel` | Custom-scrollbar-styled scroll containers |
| `ScrollTopComponent` | `f-scrolltop` | Long single-page views (reports, long forms) |
| `InplaceComponent` | `f-inplace` | Click-to-edit-in-place fields (rename-on-click patterns) |

### Directives & utilities

| Directive/Component | Selector | When to use |
| --- | --- | --- |
| `TooltipDirective` | `[fTooltip]` | Icon-only buttons **always** need this for accessibility |
| `StyleClassDirective` | `[fStyleClass]` | Toggling classes with enter/leave transitions without writing component state for it |
| `AnimateOnScrollDirective` | `[fAnimateOnScroll]` | Marketing-style scroll reveals — rare in admin screens |
| `AutoFocusDirective` | `[fAutoFocus]` | Focus the first field of a dialog/form on open |
| `RippleDirective` | `[fRipple]` | Optional; combine with `fButton` for Material-style click feedback if the preset calls for it |
| `FTemplateDirective` | `ng-template[fTemplate]` | Named slots for table header/body/emptymessage, toolbar start/end, dialog footer, etc. |
| `UiIconComponent` | `ui-icon` | Icon rendering wherever you need an icon **not** attached to a component's `icon` input (e.g. inside `f-iconfield`, custom badges) |
| `EditorComponent` | `f-editor` | Rich text (HTML) fields |
| `TerminalComponent` | `f-terminal` | CLI-style output — niche, not a typical admin-UI need |

`MenuItem[]` drives every menu-family component; `TreeNode[]` drives tree-family components — build
these once as a computed signal, don't reconstruct them inline in the template.

---

## 3. Design rules layered on top of the generated templates

`api-design/references/crud-generation.md` defines the exact markup `/develop-feature` emits.
These are the *why* behind it — apply the same reasoning anywhere a screen isn't strict CRUD:

- **Icon-only buttons always pair with `fTooltip`.** The icon alone isn't an accessible label — `<f-button icon="pencil" [text]="true" severity="secondary" fTooltip="Edit" />`.
- **Row-action buttons are `[text]="true"`, never filled.** A row of filled icon buttons reads as noise; `text` keeps the row scannable.
- **`gap` over margin hacks.** Every layout uses `flex ... gap-*` between siblings, never `mr-2` on all-but-the-last child. Tight icon clusters → `gap-1`; form fields → `gap-4`.
- **Field-block rhythm**: `flex flex-col gap-1` per field (label → control → error), `flex flex-col gap-4` for the whole form body. Reuse this shape everywhere instead of inventing margin-based spacing per field.
- **Dialog footer order is fixed**: Cancel (`text`, `secondary`) on the left, primary action (filled, `[loading]` bound to the save-in-flight signal) on the right. Never reverse it.
- **`[closable]="!isSaving()"` on every save dialog** — never let a user dismiss a dialog mid-save.
- **Empty-state and helper text use `text-surface-400`/`text-muted-color`, not `text-gray-400`** — stays correct across dark mode and preset changes.
- **Status → severity mapping must be consistent app-wide.** If "Active" is `success` and "Pending" is `warn` in one module, don't let another module map the same statuses to different severities.
- **A table with more than a page or two of rows is always `[lazy]="true"` + `[loading]` + `[paginator]="true"`**, bound to a backend-paginated service — never loaded whole and paginated client-side.

---

## 4. Tailwind v4 conventions

The setup is Tailwind v4 (`@theme`, `@custom-variant`, `@utility`, `@source` — not a
`tailwind.config.js`).

1. **No `tailwind.config.js`.** Configuration lives in the project's Tailwind entry CSS via `@theme`/`@source`. A new source directory that needs scanning gets another `@source` glob there, not a JS config file.
2. **Semantic tokens over raw palette utilities** — `surface-card`, `border-surface`, `text-muted-color`, `bg-primary-*` (§1) instead of `bg-white`, `border-gray-200`, `text-gray-500`. Raw grays/whites break the moment dark mode or a different preset/palette is applied; the semantic set doesn't.
3. **Stick to the default spacing/radius/shadow scale.** `rounded-sm/md/lg/xl/2xl` and `shadow-sm/md/lg/xl/2xl` are preset-driven (§1) — an arbitrary value like `rounded-[10px]` silently disagrees with whichever preset (Aura/Lara/Nora) is active. Reserve arbitrary values (`w-[420px]`) for one-off numeric layout constraints that no ng-ui input covers — e.g. a dialog's `style="width: 600px"`, since `f-dialog` has no `width` input.
4. **Dark mode via `.app-dark`, always test both.** Any raw Tailwind color utility that is genuinely needed (validation red, a chart accent) should be checked against `.app-dark` on `<html>` — the semantic tokens handle this for you; ad-hoc colors don't.
5. **Utility class order: layout → spacing → typography → color → state** — e.g. `flex items-center justify-between gap-2 text-sm font-medium text-color hover:bg-emphasis`. Not linter-enforced, but keeping it consistent speeds up diffs and reviews.
6. **No component-scoped `.scss` for things Tailwind already does.** Reserve component stylesheets for genuinely component-specific concerns (`:host` selectors, animations); reach for utility classes first.
7. **`@source` must see every file that uses a class.** If a class is ever built from a runtime variable (`text-${color}-500`), Tailwind's scanner can't resolve it — keep both branches as complete, static class strings (e.g. `severity() === 'danger' ? 'text-red-500' : 'text-green-500'`), never string-interpolate a class name.
8. **Responsive prefixes for admin density, not marketing breakpoints.** The usual concern is table/sidebar density at `md`/`lg` — `hidden md:table-cell` to drop secondary columns on narrow screens, `flex-col md:flex-row` for filter bars. Don't build a full `sm/md/lg/xl/2xl` ladder where two breakpoints solve the actual problem.

---

## 5. Anti-patterns

- Building a custom "are you sure?" modal instead of `ConfirmationService.confirm()` + `f-confirmdialog`.
- Hand-rolled loading spinners/overlays instead of `[loading]` on `f-button`/`f-table` or `f-blockui`.
- `<input type="number">` styled with `fInputText` instead of `f-inputnumber` — loses min/max/step/grouping for free.
- Icon-only buttons with no `fTooltip`.
- Raw color utilities (`bg-white`, `text-gray-700`, `border-gray-200`) for structural chrome instead of the semantic surface/text tokens in §1.
- Margin-chain spacing (`mr-2` on every child but the last) instead of `flex gap-*`.
- Mixing `f-card` and the plain `card p-4` div wrapper across sibling list pages in the same module.
- A local `items`/`isLoading` signal duplicating what `ApiResourceService` already exposes — see [api-design/references/crud-generation.md](../api-design/references/crud-generation.md)'s `ApiResourceService` reference.
