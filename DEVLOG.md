# DEVLOG — L'Atelier de Luz | 50/30/20 Budget Tracker PWA

## Current State: v144

| Metric | Value |
|---|---|
| SW cache | `budget-tracker-v144` |
| File | `webapp/index.html` (13,288 lines) + `webapp/sw.js` |
| JS | 436,420 chars, 9,462 lines |
| Panels | 8 (dashboard, expenses, history, goals, networth, notes, ai, data) |
| Duplicate functions | None |

---

## v144 Changelog (from v139)

### New: Dedicated Net Worth Tab
- Net Worth moved from an accordion inside the Budget tab to its own **dedicated tab page**
- New `tab-networth` panel with:
  - **Header card** — large NW number, sub-label (assets vs liabilities), trend vs last snapshot
  - **Tip banner** — explains what net worth tracking does
  - **Assets accordion** — icon, item count label, total in header, expandable list + Add Asset button
  - **Liabilities accordion** — icon, item count label, total in header, tip box, expandable list + Add Liability button
- Dashboard NW card and "View details" button now link to the new Net Worth tab
- `renderNetWorth()` updated to dynamically populate accordion header totals/labels (`nwAssetsTotal`, `nwLiabTotal`, `nwAssetsAccLabel`, `nwLiabAccLabel`)
- `showTab()` updated: goals tab no longer calls `renderNetWorth()`; networth tab does

### CSS Fix: Numbered Lists
- Added `.note-modal-body .nb-numbered { list-style: decimal }` to override the generic `.nb-list { list-style: none }` rule
- Numbered lists in journal notes now show proper decimal numbering

### SW Cache
- Bumped from `budget-tracker-v139` to `budget-tracker-v144`

---

## v139 State (Baseline)

### Tab Structure

| Tab | Label | Purpose |
|---|---|---|
| `dashboard` | Home | Greeting, stat cards, donut, progress bars |
| `expenses` | Add | Quick Add, Bill Tracker, Recent |
| `notes` | Journal | Note list, compose modal |
| `goals` | Budget | 50/30/20 overview, Income Sources, Savings Goals |
| `networth` | Net Worth | NW header + Assets accordion + Liabilities accordion |
| `history` | History | Expense history, chart, recurring |
| `ai` | AI | AI chat advisor |
| `data` | Settings | Export, import, backup, appearance |

### Critical Architecture
- **2** `<script>` **blocks** — always extract both for validation
- **Panel IDs:** `id="tab-{name}"` (NOT `id="panel-{name}"`)
- **Portal divs at body level:** `#feedBellDropdown` + `#insightsDropdown` — these cause data panel to show `-3` div balance, which is **expected and safe**
- **STORAGE_KEY:** `budget_tracker_503020` (main data: income/expenses/goals)
- **Backup system:** `_buildFullBackup()` is self-discovering — scans all `bt_*` keys automatically
- **SW:** network-first for HTML, cache-first for assets, auto-skip-waiting on update

### Key Rules (Never Break These)
1. **Backup before large edits:** `cp index.html index_vNNN_backup.html`
2. **Validate after every change:** `node --check /tmp/bt_script.js`
3. **Check panel div balance** after any HTML edit
4. **No duplicate functions**
5. **Bump SW:** `sed -i 's/budget-tracker-vNNN/budget-tracker-vMMM/' sw.js`
6. **No emoji in UI** — SVG icons only
7. **No CDN** — fully offline
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
panels={n:html.find(f'id=\"tab-{n}\"') for n in ['dashboard','expenses','history','goals','networth','notes','ai','data']}
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
```

---

## Deployment

GitHub Pages — push `webapp/index.html` + `webapp/sw.js`

## Brand

L'Atelier de Luz — subtle, not in header
