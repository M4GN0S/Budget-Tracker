# DEVLOG — L'Atelier de Luz | Budget Tracker PWA

## Current State: v262

| Metric | Value |
|---|---|
| SW cache | `budget-tracker-v262` |
| File | `index.html` + `sw.js` |
| App version | 1.9.9 |
| Panels | 7 (`dashboard`, `expenses`, `history`, `goals`, `notes`, `ai`, `data`) |
| Backend | `backend/google_sheets_backend.js` (Google Apps Script Web App) |
| Products | `products/` (Sheets Template v2, Setup Guide, Seed CSV, Apps Script Template) |

---

## ⚠️ PERMANENT UI GUIDELINES & ANTI-REGRESSION RULES

### Rule 1: No Duplicate Cross/Plus Icons in Buttons (`+ +` Regression Rule)
- **Problem**: When a button template already includes an SVG plus icon (`<svg><line.../></svg>`), passing an `actionLabel` that begins with a literal `+` (e.g., `+ Log Income` or `+ Record Payout`) causes the button to display a double plus / double cross: `+ + Log Income`.
- **Enforcement**:
  1. `_finCard` and all button generator helpers must sanitize `actionLabel` using `(cfg.actionLabel || '').replace(/^\+\s*/, '')` to strip any accidental leading `+` before rendering next to the SVG plus icon.
  2. Call sites (e.g., `renderIncomeSourcesList()`) must supply plain verb phrases like `"Log Income"` and `"Record Payout"`.
  3. Automated QA in `qa_test_suite.js` (Suite 16) explicitly asserts that no card or button renders `+ +` in any state.

### Rule 2: Unified Financial Summary Formatting & Badge Styling
- **Problem**: Inconsistent typography, arbitrary `+` prefixes attached directly to currency signs (e.g. `+₱`), or uncolored text tags in financial summary cards make the UI appear uneven and unfinished.
- **Enforcement**:
  1. All summary row amounts must use standard `fmt(val)` formatting without arbitrary string prepending.
  2. All subtitle status indicators must be rendered as styled badge pills with unified padding, radius, font size, and semantic color pairings (`var(--suc-l)`/`var(--suc)`, `var(--acc-l)`/`var(--acc)`, `var(--pri-l)`/`var(--pri-d)`).
  3. Automated QA in `qa_test_suite.js` (Suite 17) validates row presence, badge styles, and lack of raw `+` prefixes on amounts.

### Rule 3: Uniform Modal Popup Pattern for Financial Card History Across All Tabs
- **Problem**: Inconsistent transaction history interaction across tabs (e.g. Goals, Assets, and Liabilities opening in standard modal dialogs with edit/delete controls while Income Sources opened in an inline expanding accordion below the card) created an uneven UX and visual clutter.
- **Enforcement**:
  1. All financial entity cards (`_goalCard`, `_assetCard`, `_liabilityCard`, `_finCard`) must use the identical top-right action button row: `[ 🕒 count ]` history modal trigger, `[ ⚙️ ]` edit details modal trigger, and `[ ✕ ]` delete trigger.
  2. Transaction history must always open via `_showNwHistPopup(itemType, itemId)` modal overlay, supporting `'goal'`, `'asset'`, `'liability'`, and `'income'`.
  3. Inline expanding accordion tables under cards are deprecated in favor of the clean modal popup experience.
  4. Automated QA in `qa_test_suite.js` (Suite 18) verifies history trigger modal attributes, lack of inline history tables, and modal transaction edit/delete behaviors.

### Rule 4: Top Stat Cards Typography, Non-Breaking Unicode Signs, & Unbroken Numbers
- **Problem**: In top metrics cards (Net Worth, Debt Ratio, Assets, Liabilities, Cashflow), wide negative currency figures (e.g. `₱ 7,071,800.00`) previously broke across lines, detaching the `-` sign onto its own line (`-` on line 1, `₱ 7,071,800.00` on line 2), while Cashflow concatenated raw `+` onto currency symbols (e.g. `+₱`). In addition, hardcoded dark green and brown container cards (#1F2E24, #342E2A) broke dashboard theme cohesion.
- **Enforcement**:
  1. Negative figures must use non-breaking unicode minus sign `\u2212` (`−`) and `.stat .amt` must enforce `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`, and font clamping `clamp(14px, 1.35vw, 18px)` to prevent ugly line breaks.
  2. Positive cashflow figures must not prepend raw `+` signs to formatted currency; instead, clean semantic color (`var(--suc)`) and subtitle status badges indicate surplus or overspent state.
  3. All 5 top metrics cards must share the standard theme background (`var(--card)`), rounded corners (`12px`), borders (`1.5px solid var(--brd)`), and hover lift (`translateY(-2px)`).
  4. Automated QA in `qa_test_suite.js` (Suite 19) asserts unicode minus sign usage, unbroken typography, badge indicators, and consistent markup.

---

## v262 Changelog (from v261) — Dashboard Top Stat Cards & Budget Health Card Redesign & Polish

### 1. Fixed Net Worth & Cashflow Card Sign Wrapping & Formatting
- Replaced ASCII hyphen with non-breaking unicode minus sign `\u2212` (`−`) across Net Worth (`_renderDashNetWorth`) and Cashflow (`updateDashboard`).
- Enforced `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`, and dynamic font clamping (`clamp(14px, 1.35vw, 18px)`) on `.stat .amt` and `.stat .sub` to prevent figures from breaking across multiple lines.
- Cleaned up Cashflow card amount formatting by removing raw `+` concatenation (`+₱`) and relying on semantic color and clear status subtitles (`Surplus available` / `Overspent`).

### 2. Unified 5 Top Stat Cards Grid Design
- Modernized the 5-column metric grid (`.stat.stat-nw`, `.stat.stat-dr`, `.stat.stat-assets`, `.stat.stat-liab`, `.stat.stat-cf`) with uniform heights (`min-height: 92px`), 12px rounded corners, 1.5px borders (`var(--brd)`), and smooth hover elevation (`translateY(-2px)` with `var(--shd-md)`).
- Harmonized card backgrounds to `var(--card)` with crisp tinted icon badges (`var(--pri-l)`, `var(--acc-l)`, `var(--suc-l)`, `var(--dan-l)`).
- Standardized corner action buttons (`.stat-corner-add`) for Assets (`openNwQuickAdd()`), Liabilities (`openNwQuickAdd()`), and Net Worth (`showTab('goals')`).

### 3. Budget Health Card Redesign & Visual Hierarchy
- Upgraded the circular score gauge with a crisp 76px SVG ring with 6.5px stroke width, high-contrast centered score value (`22px` SF Mono bold), and uppercase `"SCORE"` subtitle.
- Baseline-aligned header title and dynamic status tier pill badge (`Mastery`, `Great`, `Steady`, `Starter`).
- Structured recommendation items with glowing semantic dot indicators (`var(--suc)`, `var(--acc)`, `var(--dan)`), bold category keywords (`Needs`, `Lifestyle spending`, `Savings`), and balanced line height (`1.45`).

### 4. Period Navigator Bar Alignment
- Centered calendar icon pill, active month title (`13.5px` weight 800), and `"Current"` status badge with consistent 12px padding and theme borders.

### 5. Automated QA Test Suite
- Added **Test Suite 19** verifying:
  - Net Worth unicode minus sign formatting and unbroken layout.
  - Cashflow positive and negative sign formatting and subtitle badges.
  - Budget Health score value calculation and recommendation row structure.
  - Presence and consistency of all 5 stat cards and Period Navigator.
- All 214 automated QA tests passing (214/214).

---

## v261 Changelog (from v260) — Unified Income Sources Card UI & Modal History Popup

### 1. Standardized Income Sources Card Action Buttons
- Updated `_finCard` to match `_goalCard`, `_assetCard`, and `_liabilityCard` with top-right action buttons:
  - `[ 🕒 count ]`: Opens the unified `_showNwHistPopup('income', id)` modal popup.
  - `[ ⚙️ ]`: Opens the `openEditIncomeName(id)` rename modal prompt.
  - `[ ✕ ]`: Calls `deleteIncomeSource(id)` with prompt/confirmation.
- Removed deprecated inline expanding transaction history accordion table below the card, keeping cards clean, compact, and aligned.

### 2. Unified Modal History Engine for Income Sources
- Extended `_showNwHistPopup`, `_editNwTxn`, `_saveEditNwTxn`, and `_deleteNwTxn` to fully handle `itemType === 'income'`.
- Editing or deleting an income transaction recalculates running balances, updates total income amount, syncs monthly budget and dashboard, and re-renders the open modal and income sources list seamlessly.

### 3. Automated QA Test Suite
- Added **Test Suite 18** covering:
  - Income card UI structure and action button callbacks.
  - Verification of no embedded inline history tables.
  - Opening `_showNwHistPopup('income', id)` and verifying transaction row rendering.
  - Editing transactions and verifying balance recalculation.
  - Deleting transactions and verifying balance recalculation.
  - Renaming income sources via `openEditIncomeName`.
- All 187 automated QA tests passing (187/187).

---

## v260 Changelog (from v259) — Financial Summary Box Uniform Formatting & Badge Polish

### 1. Consistent Formatting Across Summary Rows
- Removed uneven `+` prefix in Past Rollover amount (now consistently rendered with `fmt(pastSurplus.totalSurplus)`).
- Styled all row sub-labels as semantic badge pills (`Added to Assets ✓`, `Added to Net Worth ✓`, period name) with matching background and text colors.
- Made primary row titles clearly prominent with `font-weight: 700` and `color: var(--txt)`.

### 2. Automated QA Test Suite
- Added **Test Suite 17** verifying summary box row consistency, badge rendering, and clean numerical formatting (166/166 tests passing).

---

## v259 Changelog (from v258) — Double Plus / Double Cross Fix & Permanent Prevention

### 1. Fixed Double Plus Icon on Income & Windfall Cards
- Removed redundant leading `+` in `renderIncomeSourcesList()` action button configurations.
- Added regex sanitizer `replace(/^\+\s*/, '')` in `_finCard` to defensively strip leading `+` characters so `_finCard` will never render duplicate plus signs regardless of input string.

### 2. Automated Regression Tests
- Added QA assertions in Suite 16 testing both standard labels and strings with leading `+` to verify that duplicate crosses `+ +` never appear in the DOM.

---

## v258 Changelog (from v257) — Windfall & Sideline Income UI Redesign & Dynamic Terminology

### 1. Dynamic UI Terminology for One-Time / Windfall Income
- **Card Header Labels**: Updated `_finCard` to conditionally render `Amount:` instead of inappropriate `Monthly:` for windfall/one-time income entries (e.g. lot sale, bonus, windfall).
- **Dynamic Amount Input in Modal**: In `addIncomeSource()` modal, the amount input label dynamically switches between `Monthly Amount` (for recurring streams) and `One-Time Amount` (for windfalls & project payouts) based on category selection.
- **Categorization Grouping**: Added explicit `optgroup` headers (`Recurring Monthly Streams` vs `One-Time / Project / Windfall`) with clear distinctions.
- **Action Button Semantics**: Windfall cards now display `+ Record Payout` instead of `+ Log Income`, and unified transaction modal uses "Record Payout" with relevant placeholders.
- **Rename & Edit Modals**: Updated modal titles to reflect "Edit One-Time / Windfall Income" and field label "Description / Title" for non-recurring sources.

### 2. Sideline & Side Hustle Income Distinctions
- Added `side_hustle` ("Side Hustle / Sideline (Monthly)") under recurring streams for consistent monthly side gigs.
- Added `side_income` ("Sideline / Project Payout") under one-time/windfall streams for project/freelance lump-sum payouts.

### 3. Automated QA Test Suite
- Added **Test Suite 16** covering windfall card UI labels, dynamic modal labels on category change, and button action semantics (156/156 tests passing).

---

## v257 Changelog (from v256) — Savings Goals Accordion Layout Fix & Past Windfall Rollover Integration

### 1. Savings Goals Accordion UI Layout Fix
- **Duplicate Header Removal**: Removed redundant nested `<div class="accordion-header">` within `#goalsAccordion` that caused the accordion header to render as a horizontal flex sibling with the `.accordion-body` (cards content pushed to the right side).
- **Proper Hierarchy**: Verified that `#goalsAccordion` uses clean top-level header and full-width collapsible body container.

### 2. Comprehensive Windfall Rollover Edge Cases
- **Past Months' Windfall Inclusion**: Updated `calcPreviousMonthsSurplus()` to aggregate past months from both `data.expenses` AND `sources.filter(s => s.isWindfall)`.
- **Windfall Surplus Calculation**: Accurately computes monthly income as `baseIncome + windfallInMonth` for previous calendar months.
- **Pure Windfall Support**: Correctly rolls over past windfall amounts even if regular recurring income is unset/zero ($0 base income).
- **Detailed Ledger Notes**: Formats auto-surplus transaction entries with clear breakdowns (`"${m.label} Unspent Income ($X base + $Y windfall - $Z spent)"` or `"${m.label} Windfall Rollover ($Y windfall - $Z spent)"`).
- **Overview Summary**: Enhanced the Finance tab summary box to display past windfall details in the rollover badge.

### 3. Automated QA Test Suite Expansion
- Added Test Suite 15 to `qa_test_suite.js` covering accordion header DOM uniqueness, windfall rollover calculations, and pure windfall edge cases (145/145 tests passing).

---

## v256 Changelog (from v255) — Rollover Income Renaming, Card Action Button Quotes Escaping & Dismissal Persistence

### 1. Rollover Savings Renamed to "Rollover Income (Past Months)"
- **Accurate Semantics**: Renamed the automated monthly surplus asset from `"Rollover Savings (Past Months)"` to `"Rollover Income (Past Months)"` across auto-sync logic, net worth item defaults, and user-facing cards.
- **Custom Renames Preserved**: Synchronizer checks whether an item was renamed by the user and preserves custom user titles upon monthly re-calculation.

### 2. Comprehensive HTML Attribute Quote Escaping for String IDs
- **Attribute Parsing Fix**: Fixed issue where string IDs (such as `"auto_surplus_asset"`) interpolated directly into double-quoted HTML attributes like `onclick="_showNwHistPopup('asset', ...)"` caused HTML parsing syntax breakage.
- **Safe Escaping**: Applied `.replace(/"/g, '&quot;')` across `_assetCard`, `_liabilityCard`, `_goalCard`, `_finCard`, `openEditGoalPopup`, `openEditNwItemPopup`, `_showNwHistPopup`, `_editNwTxn`, `openFinTxnModal`, and `_nwRow`.
- **All Interactive Buttons Operational**: Transaction history, edit name modal, delete, fund, and withdraw buttons now execute cleanly without syntax errors on all item cards.

### 3. Rollover Card Dismissal Persistence
- **Delete Support**: Deleting the auto-surplus card flags `bt_auto_surplus_dismissed = "1"` in `localStorage`, preventing the asset from being immediately re-generated on subsequent renders while allowing full user control.

### 4. QA Test Suite Expansion
- Added Test Suite 14 to `qa_test_suite.js` covering "Rollover Income (Past Months)" creation, HTML attribute escaping, history popup launching, name editing, custom rename preservation, deletion, and dismissal persistence (133/133 tests passing).

---

## v255 Changelog (from v254) — Card Container Structural Fix & Complete HTML Nesting Integrity

### 1. Fixed Asset Card HTML Structure & Floating Delete Icon
- **Orphan Tag Removal**: Removed duplicate closing tags and stray `<svg>` delete element from `_assetCard` that had caused the `.fin-card` border to close prematurely and left the `Current Value` and `Add Funds` / `Withdraw` inputs floating outside the card box.
- **Card Integrity Guaranteed**: Verified that all asset, liability, and goal cards generate a single, properly closed `.fin-card` root containing title, action buttons, balance indicators, action inputs, and ledger history.

### 2. Streamlined Goal Cards Rendering
- Refactored `renderGoals()` to directly map into `_goalCard()` without redundant temporary innerHTML string wrappers.

### 3. Automated QA Suite Expansion
- Added strict root-container validation and balanced HTML opening/closing tag verification for `_assetCard`, `_liabilityCard`, and `_goalCard` in Test Suite 13 (all **113/113 tests passing**).

---

## v254 Changelog (from v253) — Financial Card Header Cleanup, High-Contrast Action Buttons & Accordion Event Isolation

### 1. Card Redundancy Cleanup Across Asset, Liability & Savings Goal Cards
- **Removed Redundant Header Category Labels**: Eliminated the redundant uppercase category labels (`"Asset"`, `"Liability"`, `"Savings Goal"`) at the top of individual cards within the Assets, Liabilities, and Savings Goals sections, as the section accordions and tabs already establish the context.
- **Enhanced Primary Card Titles**: Emphasized item titles (with tooltip fallback on truncated text) with improved font hierarchy and aligned icon badging.

### 2. High-Contrast Action Buttons & Visible Non-Clipping Delete ('x') Buttons
- **Clean Action Button Toolbar**: Replaced low-opacity and unbordered card action buttons with modern 24×24px bordered pill and icon buttons (`var(--bg)`, `var(--brd)`, rounded corners).
- **Transaction History Chip**: Added an intuitive clock icon (`<circle>` + `<polyline>`) with transaction count badge and high-contrast hover feedback.
- **Delete / Close ('x') Button Visibility**: Styled delete buttons with explicit dimensions, centered stroke lines, high-contrast hover states (`var(--dan-l)` background and `var(--dan)` border/stroke), and zero clipping across desktop, tablet, and mobile viewport sizes.
- **Modal Close Buttons**: Modernized modal close buttons in transaction history and item edit popups with dedicated 28×28px rounded bordered buttons.

### 3. Accordion Event Isolation & Event Propagation Fix
- **Header-Scoped Accordion Toggling**: Relocated `onclick="toggleFinAccordion(this, event)"` strictly to the `.accordion-header` elements across all compact accordions (`#billAccordion`, `#nwAssetsAccordion`, `#nwLiabilitiesAccordion`, `#incomeSrcAnchor`, and `#goalsAccordion`).
- **Bubbling & History Modal Isolation**: Updated `toggleFinAccordion` with `event.stopPropagation()` and `.closest(".fin-accordion")` parent resolution so that clicking history buttons, edit buttons, inputs, quick fund/pay buttons, or card backgrounds never inadvertently collapses or toggles the parent Assets or Liabilities accordions.

### 4. Automated QA Test Suite Expansion
- Added Test Suite 13 in `qa_test_suite.js` covering redundant category heading removal, card title preservation, history button invocation, high-contrast action styling, and accordion click isolation.

---

## v253 Changelog (from v252) — Previous Months' Surplus Rollover, Dynamic Income & String-Safe Net Worth

### 1. Previous Months' Surplus Rollover Engine
- **Accurate Historical Surplus Calculation (`calcPreviousMonthsSurplus`)**: Automatically computes unspent income (`income - period expenses`) for all calendar months strictly prior to the current active month, accounting for monthly variations and rollovers.
- **Auto-Sync to Net Worth Assets (`_syncPreviousMonthsSurplusToAssets`)**: Creates or updates a dedicated `Rollover Savings (Past Months)` asset in Net Worth with full historical month-by-month transaction logs (`surplus_YYYY-MM`), making accumulated past surpluses visible in Net Worth and dashboard asset tallies.
- **Finance Overview Rollover Summary**: Added an interactive past rollover summary row in the Finance/Budget Overview card with clickable month breakdown pills.

### 2. Header UI Polish & Add Expense Button Duplicate Fix
- **Button Duplicate Removed**: Fixed duplicate `+` icon rendering in desktop and tablet headers where `+ Add Expense` was shown alongside the `<svg>` plus icon.

### 3. Dynamic Multi-Source Income Parsing & Zero-Budget Handling
- **Dynamic Fallbacks (`parseIncome`, `getMonthlyIncome`)**: `parseIncome()` and `getMonthlyIncome()` now dynamically fall back to configured income streams (`bt_income_sources`) and stored profile data when DOM input is zero or empty.
- **Zero-Budget Resilience**: `renderFinanceOverview()`, `renderBudgetHealthBanner()`, and `renderSpendingBreakdown()` handle zero or unconfigured income gracefully without displaying `NaN%`, division by zero errors, or crashing.

### 4. Robust String-Safe Item ID Architecture
- **Net Worth & Liabilities String-Safe ID Handling**: Updated `_liabilityCard`, `_liabilityAdd`, `_liabilityPay`, `_assetCard`, `_assetFund`, `_assetWithdraw`, `deleteNwItem`, `updateNwAmt`, `openFinTxnModal`, `saveFinTxn`, `_showNwHistPopup`, `_editNwTxn`, `_saveEditNwTxn`, and `_deleteNwTxn` to safely support string-based and hyphenated IDs (e.g. `auto_surplus_asset`, `liab_car_loan_101`).
- **DOM Selector Escaping & Sanitation**: Elements dynamically generate alphanumeric safe IDs (`idStr`) to prevent DOM query errors on special characters.

### 5. Automated QA Test Suite Expansion
- Added Test Suite 11 (Past Months Surplus & Net Worth Asset Sync) and Test Suite 12 (Dynamic Income & Zero-Budget Fallbacks).
- Expanded automated QA coverage from 77 to 92 passing tests (0 failures).
- Bumped SW cache to `budget-tracker-v253` and app version to `1.9.3`.

---

## v252 Changelog (from v251) — Active Period Scoping & Month Navigator (Option 3)

### Unified Period Filter Engine (`getActivePeriodRange`, `getPeriodExpenses`)
- **Resolved Multi-Month Expense Contamination:** Budget calculations, progress bars, Cashflow stat card, and AI Advisor now strictly scope spending to the active period (current calendar month by default, or active pay period cycle when enabled) instead of accumulating all historical expenses across all time.
- **Month / Period Navigator Bar:** Added interactive month switcher on the Dashboard (`[ ‹ ] Month YYYY [ › ]`) with `Today` jump-back button and real-time days-remaining badge.
- **Pay Period Mode Compatibility:** Fully integrated with custom pay period settings (weekly, bi-weekly, semi-monthly, monthly custom anchor date) via `getCurrentPayPeriod()`.
- **Integrated Components:**
  - Dashboard Allocation Breakdown progress bars & subcategory tags (`updateProgress`)
  - Dashboard Donut Chart & Spending Distribution (`updateDonut`, `updateDashboard`)
  - Budget tab "Budget Overview" & "Where is my money going?" (`renderFinanceOverview`, `renderSpendingBreakdown`)
  - Financial Health Score engine & Dynamic Health Banners (`updateHealthScore`, `renderBudgetHealthBanner`)
  - AI Advisor context prompt generator (`buildAiContext`)
  - PDF & CSV/Excel export generators (`exportPDF`, `exportCSV`, `exportExcel`)
- **Automated QA Suite (`qa_test_suite.js`):** Added Test Suite 10 validating multi-month filtering, date bounds, and month navigation (77 / 77 passing tests).
- Bumped SW cache to `budget-tracker-v252` and app version to `1.9.2`.

---

## v251 Changelog (from v250) — Bug Fix: AI Context & PDF Export _br Reference

### Fixes
- **AI Context Builder (`buildAiContext`)**: Added `const _br = _getBudgetRatios();` declaration to prevent `ReferenceError: _br is not defined` when assembling financial context for AI chat responses.
- **PDF Export (`exportPDF`)**: Added `const _br = _getBudgetRatios();` declaration and updated dynamic budget calculation targets (`income * _br.needs / 100`, etc.) instead of hardcoded 50/30/20 multiplier fractions.
- **Automated QA Test Suite (`qa_test_suite.js`)**: Added explicit unit and integration tests validating `buildAiContext()` and `exportPDF()` runtime execution.
- Bumped SW cache to `budget-tracker-v251` and app version to `1.9.1`.

---

## v250 Changelog (from v195) — Custom Ratios, Google Sheets Backend & Product Suite

### Google Sheets Backend & Telemetry
- Unified Google Apps Script Web App backend (`backend/google_sheets_backend.js`) handling:
  - Newsletter signups (email, source, clientId, userName)
  - Contact / feedback / bug messages
  - Telemetry events (reactions, article comments, save-to-journal)
  - Full PWA data export backup to Google Sheets
- Configured via `SHEETS_API` endpoint and `API_SECRET` token authentication
- Environment variable template `.env.example` provided

### Custom Budget Ratios System
- Dynamic budget split supporting configurable Needs/Wants/Savings percentages:
  - Preset options: Classic 50/30/20, High COL 60/20/20, Aggressive 40/20/40, Debt Focus 50/20/30, and Custom entry
  - Dynamic allocation calculation via `_getBudgetRatios()`, `loadSettingsRatios()`, `saveSettingsRatios()`, `selectRatioPreset()`
  - AI Advisor system prompt updated to adapt advice to user-selected budget ratios
  - Budget progress bars, summaries, and health evaluations dynamically scale to custom ratios

### Dashboard & Goal UI Polish
- Top metrics grid with 5 stat cards: Net Worth, Debt Ratio, Total Assets, Total Liabilities, Cashflow
- Compact Net Worth & Assets/Liabilities management integrated seamlessly into Budget / Goals tab
- Financial health score calculation with `updateHealthScore()`
- Bill Tracker modal workflow (`openBillModal()`) and dashboard widgets (`renderDashGoals()`, `renderDashRecent()`)
- Fixed dropdown layering and portal styles (`#insightsDropdown`, `#feedBellDropdown`)

### Commercial Product Suite (`products/`)
- Complete Google Sheets Budget Tracker Template v2 matching PWA design and schema
- `SETUP_GUIDE.txt` step-by-step setup walkthrough
- Seed CSV data (`expenses_seed.csv`) for testing and instant template population
- Apps Script standalone template (`google_apps_script_template.js`)

---

## v195 Changelog (from v194) — Dashboard Beautification

### Top Metrics (4-col grid)
- Consolidated top metrics into a responsive grid: **Net Worth, Debt Ratio, Assets, Liabilities** (2 cols ≤1100px, 1 col ≤700px)
- **Assets card**: `#1F2E24` container + mint green glow; **Liabilities card**: `#342E2A` container + red glow, `#FFEDED` bright text for contrast
- Softened neon green `#6E9B72` → muted mint `#8CCDA0` (root + sage theme)
- Net Worth card shows trend vs last snapshot; Debt Ratio card shows ratio + status; card "+" buttons open the Add Asset/Add Liability modal directly

### Typography & Progress Bars
- Split: Inter/sans-serif for labels, SF Mono monospace for numbers
- Progress bars thickened with rounded radius and inner shadow

---

## Architecture & State

### Tab Structure

| Tab | Label | Purpose |
|---|---|---|
| `dashboard` | Home | Greeting, 5 top stat cards, donut chart, progress bars, recent items |
| `expenses` | Add | Quick Add, Bill Tracker, Frequently Added chips, Recent |
| `history` | History | Expense history, category filtering, chart, recurring items |
| `goals` | Budget | Budget overview, Net Worth & Assets/Liabilities accordions, Income Sources, Savings Goals |
| `notes` | Journal | Note list, rich compose modal |
| `ai` | AI | AI chat advisor with failover and ratio awareness |
| `data` | Settings | Budget ratio customizer, export/import/backup, Sheets integration, theme |

### Critical Architecture
- **2** `<script>` **blocks** in `index.html` — always extract both for validation
- **Panel IDs:** `id="tab-{name}"` (NOT `id="panel-{name}"`)
- **Portal divs at body level:** `#feedBellDropdown` + `#insightsDropdown` — these cause data panel to show `-3` div balance, which is **expected and safe**
- **STORAGE_KEY:** `budget_tracker_503020` (main data: income/expenses/goals)
- **Backup system:** `_buildFullBackup()` is self-discovering — scans all `bt_*` keys automatically
- **SW:** network-first for HTML, cache-first for assets, auto-skip-waiting on update

### Key Rules (Never Break These)
1. **Backup before large edits:** `cp index.html backups/index_vNNN_backup.html`
2. **Validate after every change:** `node --check /tmp/bt_script.js`
3. **Check panel div balance** after any HTML edit
4. **No duplicate functions**
5. **Bump SW:** update `CACHE_NAME` in `sw.js` when modifying assets/code
6. **No emoji in UI** — SVG icons only
7. **No CDN** — fully offline capable
8. **Use** `callWithFailover()` for all AI calls
9. `escHtml()` on all user content in templates
10. **Never use** `re.S` **regex on large HTML blocks** — use exact string replacement

---

## Validation Suite

```bash
cd /home/user/Budget-Tracker

# 1. Extract JS and check syntax
python3 -c "
import re; html=open('index.html').read()
scripts=re.findall(r'<script[^>]*>(.*?)</script>',html,re.S)
js='\n'.join(s for s in scripts if s.strip())
open('/tmp/bt_script.js','w').write(js)
print(f'JS: {len(js)} chars, lines: {js.count(chr(10))}')
"
node --check /tmp/bt_script.js

# 2. Check panel div balance + duplicates
python3 -c "
import re; from collections import Counter
html=open('index.html').read()
panels={n:html.find(f'id=\"tab-{n}\"') for n in ['dashboard','expenses','history','goals','notes','ai','data']}
for name,start in sorted(panels.items(),key=lambda x:x[1]):
    if start==-1: print(f'{name}: MISSING'); continue
    after=sorted([v for v in panels.values() if v>start and v!=-1])
    end=after[0] if after else start+50000
    c=html[start:end]; o,cl=c.count('<div'),c.count('</div>')
    print(f'{name}: {\"OK\" if o==cl else \"BROKEN \"+str(o-cl)}')
decls=re.findall(r'^function\s+([A-Za-z_\$][A-Za-z0-9_\$]*)\s*\(',html,re.MULTILINE)
dups={k:v for k,v in Counter(decls).items() if v>1}
print('DUPS:', dups if dups else 'None')
"

# 3. Check SW cache version
grep "CACHE_NAME" sw.js | head -1

# 4. Run automated E2E & unit test suite (localStorage, migrations, SW, ratios, health engine)
node qa_test_suite.js
```

---

## Deployment

GitHub Pages — push `webapp/index.html` + `webapp/sw.js`

## Brand

L'Atelier de Luz — subtle, not in header
