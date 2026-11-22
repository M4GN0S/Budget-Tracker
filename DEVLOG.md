# DEVLOG — L'Atelier de Luz | Budget Tracker PWA

## Current State: v250

| Metric | Value |
|---|---|
| SW cache | `budget-tracker-v250` |
| File | `index.html` (15,335 lines) + `sw.js` |
| App version | 1.9.0 |
| Panels | 7 (`dashboard`, `expenses`, `history`, `goals`, `notes`, `ai`, `data`) |
| Backend | `backend/google_sheets_backend.js` (Google Apps Script Web App) |
| Products | `products/` (Sheets Template v2, Setup Guide, Seed CSV, Apps Script Template) |

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
