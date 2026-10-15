# CRM V1 — Frontend Architecture & Quality Standards

**Status:** Technical design specification  
**Priority:** Foundational  
**Applies to:** CRM application, workflow renderer, administrative interfaces, and future products

## 1. Objective

Build a minimal, consistent, highly reusable frontend system where new pages, workflow stages, and business-specific interfaces can be assembled primarily through configuration.

**The primary objective is to establish a small collection of excellent, composable UI primitives that make future development predictable, fast, and visually consistent.**

We prioritize:

1. Minimal code and abstraction overhead.
2. Generic reusable components.
3. Token-driven styling.
4. Consistent naming and predictable APIs.
5. Reusable CSS classes and composition patterns.
6. Configurable content, workflow, and presentation.
7. High-quality responsive design.
8. Centralized styling without duplication.

Avoid one-off components, hardcoded styles, unnecessary wrappers, and page-specific CSS whenever an existing primitive can accomplish the same result.

---

## 2. Architecture Principles

### Composition over specialization

Construct interfaces from reusable components rather than implementing unique page layouts.

A contact card, activity panel, form section, and pipeline workspace should share structural primitives.

Specialized components are justified when they encapsulate meaningful business behavior, not merely a different visual arrangement.

### Configuration over duplication

Variations in terminology, fields, stage actions, layout density, and styling should come from configuration.

Do not duplicate components to support different industries or workflows.

### Tokens over arbitrary values

Colors, spacing, typography, dimensions, borders, and responsive behavior must be derived from centralized design tokens.

Avoid literal styling values inside application components.

### Semantic names at boundaries

Use semantic names for true application features and primary page regions.

Use generic names for shared layout, controls, and visual patterns.

### Minimal abstraction

Create abstractions only when they reduce duplication, enforce consistency, or simplify a meaningful behavior.

Avoid elaborate component factories, excessive configuration layers, and wrapper components that provide no meaningful value.

---

## 3. Component Hierarchy

Use three component levels.

| Level | Examples | Responsibility |
|---|---|---|
| Primitives | Box, Stack, Row, Grid, Text, Button, Input | Basic layout and interaction |
| Patterns | Card, Field, FieldGroup, ActionBar, ActivityList, Avatar | Reusable UI compositions |
| Features | PipelineBar, StageWorkspace, ContactCard, ActivityFeed | CRM-specific functionality |

### Required primitives

**Layout**
- `Box` — Generic container
- `Stack` — Vertical arrangement
- `Row` — Horizontal arrangement
- `Grid` — Responsive grid
- `Divider` — Section separation

**Typography**
- `Text` — Body text and variants
- `Heading` — Hierarchical headings
- `Label` — Form and metadata labels

**Controls**
- `Button`
- `IconButton`
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `Menu`

**Common patterns**
- `Card`
- `Field`
- `FieldGroup`
- `Avatar`
- `Badge`
- `ActionBar`
- `AttachmentGrid`
- `ActivityList`

Each primitive should have a small, predictable API.

Prefer composition over dozens of component-specific styling props.

---

## 4. Design Token System

All visual styling must originate from shared tokens.

```css
:root {
  /* Colors */
  --color-bg: #fff;
  --color-surface: #fff;
  --color-text: #171717;
  --color-muted: #737373;
  --color-border: #e5e5e5;
  --color-accent: #292929;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;

  /* Typography */
  --font-body: Inter, sans-serif;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;

  /* Geometry */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  /* Layout */
  --page-max-width: 1440px;
  --page-padding: 32px;
  --section-gap: 32px;
}
```

These are initial token examples, not final design values.

### Token categories

- Primitive palette
- Semantic colors
- Typography
- Spacing
- Borders and radii
- Shadows and elevation
- Component sizing
- Layout widths
- Responsive breakpoints
- Interaction states

Use semantic tokens in components, not raw palette colors.

For example, prefer `--button-primary-bg` over `--gray-900`.

Business themes and administrative appearance settings should override tokens without requiring component modifications.

---

## 5. CSS Naming Conventions

Use predictable, reusable class names.

### Generic component classes

```css
.card {}
.card__header {}
.card__body {}
.card__footer {}

.field {}
.field__label {}
.field__value {}
.field__control {}

.action-bar {}
.activity-list {}
.avatar {}
```

### Variants and states

```css
.card--compact {}
.card--bordered {}

.button--primary {}
.button--secondary {}

.is-active {}
.is-editing {}
.is-disabled {}
```

### Semantic feature containers

```css
.crm-page {}
.crm-pipeline {}
.crm-workspace {}
.crm-contact {}
.crm-activity {}
```

**Rule:** Semantic classes identify meaningful application regions. Generic classes provide reusable styling.

Avoid classes such as:

```css
.don-lou-card {}
.new-lead-box {}
.roofing-info-row {}
.special-contact-button {}
```

Business terminology must not leak into generic styling.

### Additional CSS rules

- Use one consistent naming convention, based on BEM-style component classes and explicit state modifiers.
- Avoid selectors dependent on deeply nested DOM structures.
- Avoid styling elements through their incidental parent hierarchy.
- Avoid `!important` except for explicitly documented overrides.
- Do not use CSS IDs for styling.
- Prefer component-owned classes over large collections of one-off utilities.
- Do not create new class names when existing classes or variants already express the intended behavior.
- Maintain CSS specificity deliberately; use cascade layers rather than specificity escalation.

---

## 6. CSS Organization

Organize styles by responsibility rather than individual screens.

```text
src/
  styles/
    tokens/
      colors.css
      typography.css
      spacing.css
      geometry.css
      themes.css

    base/
      reset.css
      global.css

    primitives/
      layout.css
      text.css
      controls.css

    patterns/
      card.css
      field.css
      activity.css
      gallery.css

    features/
      pipeline.css
      contact.css

    index.css
```

Use CSS cascade layers:

```css
@layer reset, tokens, base, primitives,
       patterns, features, utilities;
```

Rules:

- A component's styling belongs in one canonical location.
- Shared styles must not be recreated in feature-specific stylesheets.
- Prefer one small CSS module per meaningful pattern or feature.
- Avoid large global stylesheets containing unrelated selectors.
- Avoid arbitrary inline styles; allow CSS variables for intentional runtime token overrides.
- Avoid introducing CSS-in-JS or another styling framework unless it provides a demonstrated advantage.
- Do not create files solely to satisfy a directory convention. Small related definitions may be grouped.

---

## 7. Layout Standards

Layout must use a consistent small vocabulary of primitives.

Example:

```tsx
<Stack gap="lg">
  <PipelineBar />

  <Grid columns="workspace">
    <Stack gap="lg">
      <StageWorkspace />
      <ActivityFeed />
    </Stack>

    <ContactCard />
  </Grid>
</Stack>
```

### Layout requirements

- Standardized horizontal and vertical spacing.
- Responsive containers rather than fixed pixel positioning.
- Consistent card padding and section separation.
- Shared alignment rules for labels, values, and controls.
- No unnecessary nested containers.
- No per-page reinvention of grids or flexbox patterns.
- Use layout tokens and named variants rather than arbitrary widths.

The CRM's primary workspace layout should be reusable by every stage, regardless of business terminology.

---

## 8. Schema-Driven Component Rendering

The workflow configuration determines which components and fields appear.

```ts
type FieldConfig = {
  id: string;
  label: string;
  type: FieldType;
  binding: string;
  editable: boolean;
  options?: FieldOption[];
  variant?: string;
};

type StageConfig = {
  id: string;
  label: string;
  fields: FieldConfig[];
  actions: ActionConfig[];
  resources: ResourceRef[];
};
```

A `StageWorkspace` renders approved controls from this definition.

Example:

```tsx
<StageWorkspace
  config={stageConfig}
  record={opportunity}
/>
```

**Important separation:**

- Schema defines content, fields, and available actions.
- Components define behavior and structure.
- Tokens define appearance.
- Backend services enforce permissions and data integrity.

Never allow configuration to inject arbitrary executable code or bypass application validation.

---

## 9. Component API Standards

Component APIs should be small and consistent.

Prefer:

```tsx
<Card variant="outlined" padding="lg">
  <Field label="Salesperson">
    <MemberSelect value={ownerId} />
  </Field>
</Card>
```

Avoid excessive specialized props:

```tsx
<ContactSalesOwnerCard
  isBrown
  showBorder
  useLargeGap
  enablePencil
  compactHeader
  ...
/>
```

### General rules

- Use standardized props such as `variant`, `size`, `density`, and `disabled`.
- Prefer children and composition for content arrangement.
- Controlled inputs should follow a consistent `value` / `onChange` contract.
- Separate controlled state from purely presentational components.
- Use stable identifiers rather than labels for business logic.
- Avoid passing entire application records when a component only needs a few fields.
- Do not create abstractions around one-line expressions without a clear reuse or consistency benefit.

---

## 10. Activity and Workflow Consistency

Every workflow stage uses the same activity and input patterns.

Shared components should support:

- Structured activity entry
- Optional notes
- Timestamped history
- Field editing
- Attachments
- Stage-specific actions

The six roofing stages should not require six separate page implementations.

Each stage is a configured composition of the same primitives and patterns.

The Activity component must display records consistently across all stages and in the Full Record view.

Current stage summaries and historical events remain separate concepts, even when shown together.

---

## 11. Interaction Quality

All interactions should follow consistent behavior.

### Editing

- Click or activate an editable value to edit.
- Use the correct control for the data type.
- Provide visible focus and editing states.
- Save explicitly or on blur according to a consistent documented rule.
- Provide validation and failure feedback.
- Preserve unsaved input when recoverable errors occur.

### Feedback

- Show loading and pending states.
- Avoid unnecessary confirmation dialogs.
- Confirm destructive or consequential operations.
- Do not report success before persistence succeeds.
- Use consistent empty, error, and unavailable states.

### Accessibility

- Keyboard-operable controls.
- Visible focus indicators.
- Semantic headings, labels, and buttons.
- Accessible names for icon-only controls.
- Sufficient contrast.
- Support for zoom, narrow screens, and reduced motion.

Accessibility is part of component quality, not an optional later pass.

---

## 12. Responsive Design

Responsive behavior should be defined primarily at the pattern level.

For example:

| Pattern | Desktop | Mobile |
|---|---|---|
| Workspace layout | Main column + ContactCard | Stacked sections |
| Pipeline | Six visible segments | Horizontal scrolling or compact stages |
| FieldGroup | Responsive grid | Single column |
| ActionBar | Horizontal | Wrap or compact |
| Gallery | Thumbnail grid | Responsive thumbnail grid |

Avoid writing separate mobile versions of entire business components.

Prefer fluid layout, container queries where useful, and a small, documented set of breakpoints.

---

## 13. Frontend Code Organization

```text
src/
  components/
    primitives/
    patterns/

  features/
    crm/
      components/
      config/
      hooks/
      views/

  styles/
    tokens/
    base/
    primitives/
    patterns/
    features/

  lib/
    api/
    utils/
```

### Ownership rules

- Primitives contain no CRM business logic.
- Patterns are domain-agnostic whenever practical.
- Feature components may understand CRM concepts.
- API requests and mutations belong in dedicated data-access hooks/services.
- Avoid copying server records into unnecessary parallel client state.
- Configuration is validated and normalized before rendering.
- Shared components should not import from feature directories.

---

## 14. Quality Gates

Every new UI feature must satisfy these requirements.

### Reuse

- Existing primitives and patterns were considered first.
- No unnecessary duplicate component was introduced.
- No repeated styling definitions were added.

### Visual consistency

- All styles use tokens.
- Layout follows established spacing and alignment patterns.
- Typography and controls match the design system.
- Responsive behavior is verified.

### Engineering quality

- Components have clear responsibilities.
- State ownership is explicit.
- API and configuration types are validated.
- Accessibility and keyboard interaction work.
- No unnecessary dependencies or abstractions.
- No unrelated CSS overrides.

### Testing

Prioritize tests for:

- Primitive interactions and accessibility.
- Shared input validation and editing.
- Schema-driven field rendering.
- Activity recording.
- Pipeline navigation and stage updates.
- Responsive layouts.
- Visual regression of shared components.

A visual change to a primitive should be checked across every major feature that uses it.

---

## 15. Anti-Patterns to Avoid

**Do not:**

- Build a unique component for every workflow stage.
- Create multiple nearly identical cards, forms, or field rows.
- Scatter hardcoded colors and spacing values.
- Create deeply nested wrappers for simple layout.
- Use business labels as programmatic identifiers.
- Duplicate contact information in multiple page regions.
- Build a visual page builder before the primitives are stable.
- Introduce abstraction layers that make simple changes difficult.
- Add libraries where native CSS or existing primitives suffice.
- Expand the design system with speculative components that have no immediate use.

A reusable component is valuable when it eliminates duplication, enforces consistent behavior, or provides a stable composition pattern—not merely because it has been extracted into its own file.

---

## 16. Implementation Priorities

**Phase 1 — Foundation**

Establish tokens, typography, layout primitives, controls, and naming conventions.

**Phase 2 — Reusable patterns**

Build Card, Field, FieldGroup, ActionBar, Avatar, ActivityList, and AttachmentGrid.

**Phase 3 — CRM composition**

Build AppHeader, PipelineBar, StageWorkspace, ContactCard, and ActivityFeed using the shared patterns.

**Phase 4 — Schema rendering**

Connect the workflow schema to stage-specific field definitions, actions, labels, and component variants.

**Phase 5 — Quality validation**

Test all six roofing stages, inline editing, workflow changes, activity logging, responsive layouts, accessibility, and visual consistency.

---

## 17. Definition of Done

The frontend foundation is successful when:

1. All six roofing stages render using the same `StageWorkspace`.
2. Administrators can modify workflow vocabulary, field definitions, and input options without changing UI source code.
3. Shared design tokens control the site's visual identity.
4. New pages can be composed primarily from existing primitives and patterns.
5. Styling changes to shared components propagate consistently.
6. Existing functionality remains intact when stage labels or field order changes.
7. The application works cleanly on desktop and mobile.
8. Component behavior, naming, and interaction patterns remain predictable.

## Final Engineering Principle

**Build the smallest possible collection of excellent primitives, then compose everything else.**

The objective is not minimum lines of code at any cost. It is minimum duplication, minimum conceptual overhead, and maximum design flexibility.

A new workflow stage should mostly require configuration. A new page should mostly require composition. A new theme should mostly require token changes.

That is the standard for the CRM frontend.
