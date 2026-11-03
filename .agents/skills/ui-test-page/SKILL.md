---
name: ui-test-page
description: Guidelines and procedure for creating, designing, and managing visual UI sandbox test pages (/test-menu, test-page-*) with standardized components, mock data isolation, and light/dark theme parity.
---

# UI Sandbox & Test Pages Development Guidelines

Use this skill whenever:
- Designing a new visual style or aesthetic variant for KandidFlow.
- Adding a new numbered test page (e.g. `test-page-3`, `test-page-4`).
- Referencing existing test pages (`test-page-1`, `test-page-2`) to evaluate design decisions or port styled components into the main application.
- Triggered explicitly via `@ui-test-page`.

---

## 1. Core Principles of the UI Sandbox

1. **Dedicated Testing Environment:**
   The UI sandbox allows experimenting with styling, contrast, border treatments, button outlines, and card layouts without modifying the main application views or impacting business logic.

2. **Access & Navigation:**
   - **Top Navigation Bar:** Accessible directly via the **„Testy UI”** button (with `Palette` icon) in the header.
   - **URL Route:** Accessible directly via `/test-menu` (initialized upon page load in `frontend/src/App.tsx`).
   - **Hub & Subpages:**
     - `TestMenu` (`/test-menu`) is the central navigation hub with cards and buttons to open each test page.
     - Each test page (`test-page-1`, `test-page-2`, `test-page-X`) must provide a back button (`← Wróć do menu testowego`) and a quick-switcher bar to hop between test pages.

3. **Strict Data Mocking & Zero DB Dependencies:**
   - **NEVER** fetch live data from the backend or database for test pages.
   - All offers and events must be imported from `frontend/src/components/test-views/mockData.ts`.
   - Mock data must strictly conform to the `JobOfferRead` TypeScript interface (`frontend/src/types/api.ts`).

4. **Bilingual Rule:**
   - Code, identifiers, component names, and developer comments must be in **English**.
   - User-facing UI labels, descriptions, and job details must be in **Polish** (e.g. *"Menu testowe stylów UI"*, *"Generuj CV"*, *"Szczegóły"*, *"Do przetworzenia"*).

5. **Theme Parity (Light & Dark Mode):**
   - Every single component, border, badge, and input must be tested and fully readable in both Light and Dark mode using Tailwind's `dark:` classes.

---

## 2. Standardized Component Checklist (1:1 Parity)

To enable objective, side-by-side comparison between different visual styles, **every test page MUST present the exact same 6 core component sections**:

### Section 1: Style Description & Meta Header
- Numbered badge: `test-page-X`.
- Title of the style (e.g. *Styl Płaski z Żywymi Akcentami*, *Styl Neumorficzny*, *Styl Brutalistyczny*).
- Detailed technical description of the style (explaining shadows, border radius, border thickness, color saturation, and typography).
- Quick switcher buttons between available test pages.

### Section 2: Buttons & Actions Showcase
- **Solid Actions:** Primary action button, success/CV generation action, secondary action.
- **Button Outlines:** High-contrast outline buttons with vibrant hover fills/effects.
- **Ghost & Neutral Buttons:** Transparent buttons with subtle hover borders.
- **Sizes & States:** Small (`sm`), Medium (`md`), Large (`lg`), loading spinner state, and disabled state.

### Section 3: Toggles, Checkboxes & Form Controls
- **Interactive Toggle Switch:** Stateful boolean switch styled to match the page's aesthetic (e.g. flat track vs soft pill track).
- **Checkboxes:** Standard form checkboxes in active and inactive states.
- **Search Input:** Text input field with search icon and style-specific focus ring/border.
- **Select Dropdown:** Styled dropdown selector.

### Section 4: Recruitment Status Badges & Tech Tags
- **Pipeline Status Badges:** Standard KandidFlow statuses using `STATUS_LABELS` (`inbox`, `ready`, `applied`, `interview`, `offer`, `rejected`).
- **Tech Stack Tags:** Saturated technology chips (e.g. `#Python`, `#React`, `#Docker`, `#Kubernetes`).

### Section 5: Hardcoded Offer Rows (Min. 3 Rows)
- Render realistic rows using `MOCK_JOB_OFFERS` from `mockData.ts`.
- Must showcase:
  - Source portal badge (`justjoin`, `nofluffjobs`, `pracuj`).
  - Role title and company name.
  - Work model badge (Zdalnie / Hybryda / Biuro) and location.
  - Salary pill with clear currency formatting.
  - Action buttons (e.g. "CV", "Szczegóły").
  - Clickable row selection triggering the details preview.

### Section 6: Offer Details Card Preview
- Rich card preview showing:
  - Company & position header with salary tag.
  - AI Role Summary block.
  - Must-have requirements checklist.
  - Action footer ("Edytuj ofertę", "Generuj dedykowane CV").

---

## 3. Step-by-Step: Adding a New Test Page (e.g. `test-page-3`)

Follow this exact procedure when asked to create a new visual style:

### Step 3.1: Create the Test Page Component
Create `frontend/src/components/test-views/TestPageThree.tsx`:
- Implement the 6 required component sections following the user's requested aesthetic.
- Accept standard props:
  ```tsx
  interface TestPageThreeProps {
    onBackToMenu: () => void;
    onSwitchPage: (pageId: TestSubPage) => void;
  }
  ```

### Step 3.2: Update Container Subpage Types & Routing
In `frontend/src/components/test-views/TestViewsContainer.tsx`:
1. Expand the `TestSubPage` union type:
   ```tsx
   export type TestSubPage = "menu" | "test-page-1" | "test-page-2" | "test-page-3";
   ```
2. Add conditional rendering for `currentSubPage === "test-page-3"`:
   ```tsx
   if (currentSubPage === "test-page-3") {
     return (
       <TestPageThree
         onBackToMenu={() => setCurrentSubPage("menu")}
         onSwitchPage={(pageId) => setCurrentSubPage(pageId)}
       />
     );
   }
   ```

### Step 3.3: Register in the Test Menu Hub
In `frontend/src/components/test-views/TestMenu.tsx`:
1. Add a new card in the grid for `test-page-3`.
2. Include the style title, Polish description, key aesthetic tags, and an action button:
   ```tsx
   <button
     type="button"
     onClick={() => onSelectPage("test-page-3")}
     className="..."
   >
     <span>Otwórz test-page-3 (Nazwa Stylu)</span>
     <ArrowRight className="h-4 w-4" />
   </button>
   ```

### Step 3.4: Update Quick Switchers in Existing Pages
Ensure that the top quick switcher bar across all test pages includes the new `test-page-3` button so the user can seamlessly switch between all styles.

### Step 3.5: Verify Build Inside Docker
Run the frontend build check strictly inside the Docker container:
```bash
docker compose exec frontend npm run build
```
Ensure 0 TypeScript errors and clean build output before presenting to the user.

---

## 4. Porting a Chosen Test Style to the Main App

When the user decides to adopt a test style (e.g. *"Zastosuj styl z test-page-1 do całej aplikacji"*):
1. Identify the specific UI primitives corresponding to the approved style:
   - Button variants in `frontend/src/components/ui/Button.tsx`.
   - Card container styles in `frontend/src/components/ui/Card.tsx`.
   - Badge styles in `frontend/src/components/ui/Badge.tsx`.
   - Table / row styling in `frontend/src/components/jobs/JobListView.tsx`.
2. Propose an implementation plan artifact updating these base components systematically.
3. Test both Light and Dark modes across all main tabs (`list`, `kanban`, `archive`, `analytics`).
