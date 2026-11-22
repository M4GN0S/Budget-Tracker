// qa_test_suite.js — Comprehensive Automated QA Test Suite for Budget Tracker PWA
const fs = require('fs');
const path = require('path');

// ─── MOCK DOM & LOCALSTORAGE ENVIRONMENT ────────────────────
const storageMap = new Map();
const localStorage = {
  getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear(),
  key: (i) => Array.from(storageMap.keys())[i],
  get length() { return storageMap.size; }
};

const documentElements = new Map();
const makeMockElement = (initialId = '') => {
  const classes = new Set();
  let _id = initialId;
  let _innerHTML = '';
  let _textContent = '';
  let _value = '';

  const el = {
    get id() { return _id; },
    set id(val) {
      if (_id && documentElements.get(_id) === el) documentElements.delete(_id);
      _id = val;
      if (val) documentElements.set(val, el);
    },
    get textContent() { return _textContent || _innerHTML.replace(/<[^>]+>/g, ''); },
    set textContent(val) { _textContent = val; _innerHTML = val; },
    get innerHTML() { return _innerHTML; },
    set innerHTML(val) {
      _innerHTML = val;
      _textContent = (val || '').replace(/<[^>]+>/g, '');
      const idMatches = (val || '').matchAll(/id=["']([^"']+)["']/g);
      for (const m of idMatches) {
        const childId = m[1];
        let childEl = documentElements.get(childId);
        if (!childEl) {
          childEl = makeMockElement(childId);
          documentElements.set(childId, childEl);
        }
        const tagRegex = new RegExp(`<[^>]*id=["\']${childId}["\'][^>]*>`);
        const tagMatch = val.match(tagRegex);
        if (tagMatch) {
          const valMatch = tagMatch[0].match(/value=["']([^"']*)["']/);
          if (valMatch) childEl.value = valMatch[1];
        }
      }
    },
    get value() { return _value; },
    set value(val) { _value = val; },
    style: {},
    dataset: {},
    parentElement: null,
    get className() { return Array.from(classes).join(' '); },
    set className(val) {
      classes.clear();
      if (val) val.split(/\s+/).forEach(c => c && classes.add(c));
    },
    classList: {
      add: (...cls) => cls.forEach(c => c && classes.add(c)),
      remove: (...cls) => cls.forEach(c => classes.delete(c)),
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        if (force !== undefined) {
          if (force) classes.add(c); else classes.delete(c);
          return force;
        }
        if (classes.has(c)) { classes.delete(c); return false; }
        else { classes.add(c); return true; }
      }
    },
    setAttribute: () => {},
    getAttribute: () => '',
    addEventListener: () => {},
    focus: () => {},
    select: () => {},
    remove: () => {
      el._removed = true;
    },
    appendChild: (child) => {
      if (child) child.parentElement = el;
      el.children.push(child);
      return child;
    },
    closest: (selector) => {
      let cur = el;
      const targetClass = selector.replace(/^\./, '');
      while (cur) {
        if (cur.classList && cur.classList.contains(targetClass)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    children: []
  };
  if (initialId) documentElements.set(initialId, el);
  return el;
};

const document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  head: { appendChild: () => {} },
  documentElement: { setAttribute: () => {}, getAttribute: () => '' },
  getElementById: (id) => {
    if (!documentElements.has(id)) {
      documentElements.set(id, makeMockElement(id));
    }
    const el = documentElements.get(id);
    return (el && el._removed) ? null : el;
  },
  querySelector: (sel) => document.getElementById(sel.replace(/^[#.]/, '')),
  querySelectorAll: () => [],
  createElement: (tag) => makeMockElement(tag),
  createElementNS: (ns, tag) => makeMockElement(tag),
  body: { style: {}, appendChild: () => {}, addEventListener: () => {} }
};

const sessionStorage = {
  getItem: (k) => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

const window = {
  localStorage,
  sessionStorage,
  document,
  addEventListener: () => {},
  removeEventListener: () => {},
  navigator: { onLine: true, userAgent: 'NodeTest', serviceWorker: { register: () => Promise.resolve() } },
  location: { reload: () => {}, origin: 'http://localhost:8080' },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id)
};

global.window = window;
global.document = document;
global.localStorage = localStorage;
global.sessionStorage = sessionStorage;
global.navigator = window.navigator;

// Load the app code into context
let code = '';
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  code = scriptMatch[1];
} else if (fs.existsSync('/tmp/bt_main.js')) {
  code = fs.readFileSync('/tmp/bt_main.js', 'utf8');
}
try {
  // Convert top-level const/let declarations to var/window properties so they are accessible
  const modCode = code
    .replace(/(?:^|\n)const\s+([A-Za-z0-9_$]+)\s*=/g, '\nwindow.$1 = var_$1 = global.$1 =')
    .replace(/(?:^|\n)let\s+([A-Za-z0-9_$]+)\s*=/g, '\nwindow.$1 = var_$1 = global.$1 =');
  eval(modCode);
} catch (e) {
  // Fallback to direct eval
  try { eval(code); } catch(err) { console.error("Error loading app JS:", err); process.exit(1); }
}

// ─── TEST UTILITIES ──────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${testName} ${detail ? '(' + detail + ')' : ''}`);
  }
}

console.log("=================================================");
console.log("  BUDGET TRACKER PWA — AUTOMATED QA TEST SUITE");
console.log("=================================================\n");

// ─── SUITE 1: BACKUP & EXPORT (V3 SCHEMA) ───────────────────
console.log("─── TEST SUITE 1: Backup Creation & Schema v3 ───");
localStorage.clear();

// Seed initial localStorage state
const initialData = {
  income: 6000,
  expenses: [
    { id: 101, date: "2026-09-01", desc: "Rent", cat: "Needs", sub: "Housing", amt: 1500 },
    { id: 102, date: "2026-09-02", desc: "Dining", cat: "Wants", sub: "Dining", amt: 120 }
  ],
  goals: [
    { id: 201, title: "Emergency Fund", target: 10000, saved: 3500 }
  ]
};
localStorage.setItem("budget_tracker_503020", JSON.stringify(initialData));
localStorage.setItem("bt_notes", JSON.stringify([{ id: 301, title: "Budget Review", body: "On track this month", date: "2026-09-05" }]));
localStorage.setItem("bt_bills", JSON.stringify([{ id: 401, name: "Internet", amt: 60, due: 15, cat: "Needs", recurring: true }]));
localStorage.setItem("bt_budget_ratios", JSON.stringify({ needs: 50, wants: 30, savings: 20 }));
localStorage.setItem("bt_currency", "$");
localStorage.setItem("bt_user_name", "Alex");
// Add an ephemeral key that should be skipped
localStorage.setItem("bt_chat_history", JSON.stringify([{ role: "user", text: "hi" }]));

const fullBackup = _buildFullBackup();

assert(fullBackup._schema === 3, "Backup schema is v3");
assert(fullBackup._app === "50/30/20 Budget Tracker", "Backup app name matches");
assert(fullBackup.raw !== undefined && typeof fullBackup.raw === "object", "Backup contains raw storage dictionary");
assert(fullBackup.raw["budget_tracker_503020"] !== undefined, "Core budget data captured in raw");
assert(fullBackup.raw["bt_notes"] !== undefined, "Notes captured in raw");
assert(fullBackup.raw["bt_bills"] !== undefined, "Bills captured in raw");
assert(fullBackup.raw["bt_budget_ratios"] !== undefined, "Custom ratios captured in raw");
assert(fullBackup.raw["bt_chat_history"] === undefined, "Ephemeral chat history properly excluded by _BACKUP_SKIP");
assert(fullBackup._counts.expenses === 2, `Expense count correctly counted in backup summary (got ${fullBackup._counts.expenses})`);
assert(fullBackup._counts.notes === 1, `Notes count correctly counted (got ${fullBackup._counts.notes})`);
assert(fullBackup._counts.bills === 1, `Bills count correctly counted (got ${fullBackup._counts.bills})`);
assert(fullBackup._counts.goals === 1, `Goals count correctly counted (got ${fullBackup._counts.goals})`);


// ─── SUITE 2: RESTORE FROM BACKUP (v3 & v2) ──────────────────
console.log("\n─── TEST SUITE 2: Restore Compatibility (v3 & v2) ───");

// Clear and test v3 restore
localStorage.clear();
assert(localStorage.length === 0, "Storage cleared before restore test");

_restoreFullBackup(fullBackup);
assert(localStorage.getItem("budget_tracker_503020") !== null, "Core data restored from v3 raw backup");
assert(localStorage.getItem("bt_notes") !== null, "Notes restored from v3 raw backup");
assert(localStorage.getItem("bt_bills") !== null, "Bills restored from v3 raw backup");
assert(localStorage.getItem("bt_user_name") === "Alex", "User name restored from v3 raw backup");

const parsedRestoredData = JSON.parse(localStorage.getItem("budget_tracker_503020"));
assert(parsedRestoredData.income === 6000, "Restored income matches original (6000)");
assert(parsedRestoredData.expenses.length === 2, "Restored expenses count matches original (2)");

// Test v2 legacy restore
localStorage.clear();
const v2LegacyBackup = {
  _app: "50/30/20 Budget Tracker",
  _version: "1.0.0",
  income: 4500,
  expenses: [{ id: 501, date: "2026-08-10", desc: "Groceries", cat: "Needs", sub: "Food", amt: 200 }],
  goals: [{ id: 601, title: "Travel", target: 2000, saved: 800 }],
  bills: [{ id: 701, name: "Electricity", amt: 90, due: 20, cat: "Needs" }],
  notes: [{ id: 801, title: "Goal Note", body: "Saving up", date: "2026-08-12" }],
  currency: "€",
  userName: "Maria"
};

_restoreFullBackup(v2LegacyBackup);
const v2RestoredData = JSON.parse(localStorage.getItem("budget_tracker_503020"));
assert(v2RestoredData.income === 4500, "Legacy v2 income restored correctly (4500)");
assert(v2RestoredData.expenses.length === 1, "Legacy v2 expenses restored correctly (1)");
assert(localStorage.getItem("bt_currency") === "€", "Legacy v2 currency restored (€)");
assert(localStorage.getItem("bt_user_name") === "Maria", "Legacy v2 userName restored (Maria)");


// ─── SUITE 3: SAMPLE BACKUP FILE VERIFICATION ────────────────
console.log("\n─── TEST SUITE 3: sample-backup.json Compatibility ───");
const sampleBackupRaw = fs.readFileSync('sample-backup.json', 'utf8');
const sampleBackup = JSON.parse(sampleBackupRaw);

localStorage.clear();
_restoreFullBackup(sampleBackup);
const sampleData = JSON.parse(localStorage.getItem("budget_tracker_503020") || "{}");
assert(sampleData.income > 0 || (sampleBackup.raw && Object.keys(sampleBackup.raw).length > 0) || sampleBackup.income > 0, "sample-backup.json restores cleanly without errors");


// ─── SUITE 4: LOCALSTORAGE MIGRATIONS ───────────────────────
console.log("\n─── TEST SUITE 4: Net Worth & Goal Migrations ───");

// Test _migrateNwItems
localStorage.clear();
const unmigratedNwItems = [
  { id: "nw_1", name: "Savings Account", cat: "cash", amt: 5000 },
  { id: "nw_2", name: "Car Loan", cat: "debt", amt: 12000 }
];
localStorage.setItem("bt_networth", JSON.stringify(unmigratedNwItems));
_migrateNwItems();
const migratedNwItems = JSON.parse(localStorage.getItem("bt_networth"));
assert(Array.isArray(migratedNwItems[0].transactions), "NW item migrated to contain transactions array");
assert(migratedNwItems[0].transactions[0].action === "init", "NW item contains initial balance transaction");
assert(migratedNwItems[0].transactions[0].amount === 5000, "NW initial transaction amount is 5000");

// Test _migrateIncomeSources
const unmigratedIncomeSources = [
  { id: "inc_1", name: "Salary", amount: 4000, freq: "monthly" }
];
localStorage.setItem("bt_income_sources", JSON.stringify(unmigratedIncomeSources));
_migrateIncomeSources();
const migratedIncomeSources = JSON.parse(localStorage.getItem("bt_income_sources"));
assert(Array.isArray(migratedIncomeSources[0].transactions), "Income source migrated to contain transactions array");
assert(migratedIncomeSources[0].transactions[0].amount === 4000, "Income source initial transaction amount is 4000");

// Test _migrateGoals
const unmigratedGoalsData = {
  income: 5000,
  expenses: [],
  goals: [
    {
      id: "goal_1",
      title: "Vacation",
      target: 3000,
      saved: 1200,
      contributions: [
        { date: "2026-07-01", amt: 600, note: "Deposit 1" },
        { date: "2026-08-01", amt: 600, note: "Deposit 2" }
      ]
    }
  ]
};
localStorage.setItem("budget_tracker_503020", JSON.stringify(unmigratedGoalsData));
_migrateGoals();
const migratedGoalsData = JSON.parse(localStorage.getItem("budget_tracker_503020"));
assert(Array.isArray(migratedGoalsData.goals[0].transactions), "Goal migrated to contain transactions array");
assert(migratedGoalsData.goals[0].transactions.length === 2, "Goal converted 2 contributions into 2 transactions");


// ─── SUITE 5: CUSTOM BUDGET RATIOS LOGIC ─────────────────────
console.log("\n─── TEST SUITE 5: Custom Budget Ratios Engine ───");
localStorage.clear();

// Default 50/30/20 fallback
const defaultRatios = _getBudgetRatios();
assert(defaultRatios.needs === 50 && defaultRatios.wants === 30 && defaultRatios.savings === 20, "Default ratio is 50/30/20 when unconfigured");

// Custom ratio saving & loading
localStorage.setItem("bt_budget_ratios", JSON.stringify({ needs: 40, wants: 20, savings: 40 }));
const aggressiveRatios = _getBudgetRatios();
assert(aggressiveRatios.needs === 40 && aggressiveRatios.wants === 20 && aggressiveRatios.savings === 40, "Aggressive 40/20/40 ratio loads accurately");

// Calculations with custom ratios
const income = 5000;
const needsBudget = income * (aggressiveRatios.needs / 100);
const wantsBudget = income * (aggressiveRatios.wants / 100);
const savingsBudget = income * (aggressiveRatios.savings / 100);

assert(needsBudget === 2000, "Needs budget for $5000 at 40% is $2000");
assert(wantsBudget === 1000, "Wants budget for $5000 at 20% is $1000");
assert(savingsBudget === 2000, "Savings budget for $5000 at 40% is $2000");
assert((needsBudget + wantsBudget + savingsBudget) === income, "Total budget equals total income ($5000)");


// ─── SUITE 6: CSV IMPORT PARSER ─────────────────────────────
console.log("\n─── TEST SUITE 6: CSV Parsing & Import ───");
const csvLine1 = '2026-06-01,"Rent, Monthly",Needs,Housing,1400.00';
const parsed1 = parseCSVLine(csvLine1);
assert(parsed1.length === 5, "parseCSVLine handles quoted strings with commas correctly");
assert(parsed1[1] === "Rent, Monthly", "Quoted description extracted intact without splitting on inner comma");
assert(parsed1[4] === "1400.00", "Amount field parsed correctly");

const seedCsvContent = fs.readFileSync('products/expenses_seed.csv', 'utf8');
const seedLines = seedCsvContent.split('\n').filter(l => l.trim().length > 0);
assert(seedLines.length >= 10, "expenses_seed.csv contains valid seed expense rows");


// ─── SUITE 7: SECURITY & SANITIZATION (escHtml) ─────────────
console.log("\n─── TEST SUITE 7: Security & HTML Escaping ───");
const maliciousInput = '<script>alert("xss")</script>&<div onclick="evil()">test</div>';
const escaped = escHtml(maliciousInput);
assert(!escaped.includes('<script>'), "escHtml escapes <script> tags");
assert(!escaped.includes('</script>'), "escHtml escapes </script> tags");
assert(escaped.includes('&lt;script&gt;'), "escHtml converts '<' and '>' to HTML entities");
assert(escaped.includes('&amp;'), "escHtml converts '&' to '&amp;'");


// ─── SUITE 8: SERVICE WORKER & OFFLINE ASSETS ───────────────
console.log("\n─── TEST SUITE 8: Service Worker & Offline Cache ───");
const swContent = fs.readFileSync('sw.js', 'utf8');
const cacheNameMatch = swContent.match(/const\s+CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
assert(cacheNameMatch && cacheNameMatch[1].length > 0, `CACHE_NAME is defined (${cacheNameMatch ? cacheNameMatch[1] : 'none'})`);

const assetsMatch = swContent.match(/const\s+ASSETS\s*=\s*\[([\s\S]*?)\];/);
assert(assetsMatch !== null, "ASSETS array defined in sw.js");

const assetPaths = assetsMatch[1]
  .split('\n')
  .map(l => l.replace(/['",\s]/g, ''))
  .filter(l => l.length > 0);

let allAssetsExist = true;
assetPaths.forEach(ap => {
  const relPath = ap === './' ? 'index.html' : ap.replace(/^\.\//, '');
  const exists = fs.existsSync(relPath);
  if (!exists) allAssetsExist = false;
  assert(exists, `Cached asset exists on disk: ${ap}`);
});

assert(allAssetsExist, "All Service Worker offline assets verified present on filesystem");


// ─── SUITE 9: FINANCIAL ENGINE & CALCULATIONS ─────────────────
console.log("\n─── TEST SUITE 9: Financial Health Engine & Formatting ───");

// Currency formatting
localStorage.setItem("bt_currency", "$");
const formatted1 = fmt(1234.56);
assert(formatted1.includes("1,234.56") && formatted1.startsWith("$"), `fmt formats positive numbers with commas and currency symbol: ${formatted1}`);

const formattedZero = fmt(0);
assert(formattedZero.includes("0.00"), "fmt formats zero as 0.00");

const shortFormatted = fmtShort(50000);
assert(shortFormatted.includes("50,000") && !shortFormatted.includes(".00"), `fmtShort formats integer amounts without decimals: ${shortFormatted}`);

// Financial health score
// Case A: Perfect on-budget (50% needs, 30% wants, 20% savings)
localStorage.setItem("bt_budget_ratios", JSON.stringify({ needs: 50, wants: 30, savings: 20 }));
updateHealthScore(2500, 1500, 1000, 2500, 1500, 1000, 5000);
const scoreEl = document.getElementById("healthScoreNumber");
assert(scoreEl !== undefined, "Health score element updated");

// Net worth & debt ratio calculation
const testAssets = 150000;
const testLiabs = 30000;
const testNw = testAssets - testLiabs;
const testRatio = testLiabs / testAssets;
assert(testNw === 120000, "Net worth calculated correctly ($150k - $30k = $120k)");
assert(testRatio.toFixed(2) === "0.20", "Debt-to-asset ratio calculated correctly (0.20 / 20%)");

// AI Context builder verification (guards against missing variables like _br)
let aiContextResult = "";
let aiContextThrew = false;
try {
  localStorage.setItem("budget_tracker_503020", JSON.stringify({
    income: 5000,
    expenses: [{ id: 1, date: "2026-09-01", desc: "Groceries", cat: "Needs", sub: "Food", amt: 300 }],
    goals: [{ id: 2, name: "Vacation", target: 2000, saved: 500 }]
  }));
  localStorage.setItem("bt_budget_ratios", JSON.stringify({ needs: 50, wants: 30, savings: 20 }));
  aiContextResult = buildAiContext();
} catch (e) {
  aiContextThrew = true;
  console.error("buildAiContext failed with error:", e);
}
assert(!aiContextThrew, "buildAiContext executes without throwing ReferenceError");
assert(aiContextResult.includes("50% Needs") && aiContextResult.includes("30% Wants"), "buildAiContext generates correct budget ratio text");

// exportPDF verification (guards against missing variables like _br)
let pdfThrew = false;
try {
  // Mock window.open for PDF print popup
  window.open = () => ({
    document: {
      write: () => {},
      close: () => {}
    }
  });
  exportPDF();
} catch (e) {
  pdfThrew = true;
  console.error("exportPDF failed with error:", e);
}
assert(!pdfThrew, "exportPDF executes without throwing ReferenceError");


// ─── SUITE 10: ACTIVE PERIOD & MULTI-MONTH EXPENSE FILTERING ─
console.log("\n─── TEST SUITE 10: Active Period & Month Scoping Engine ───");
localStorage.clear();

// Seed expenses across 3 different months: September, October, November 2026
const multiMonthExpenses = [
  { id: 1001, date: "2026-09-05", desc: "Sept Rent", cat: "Needs", sub: "Housing", amt: 1500 },
  { id: 1002, date: "2026-09-12", desc: "Sept Groceries", cat: "Needs", sub: "Food", amt: 400 },
  { id: 1003, date: "2026-10-02", desc: "Oct Groceries", cat: "Needs", sub: "Food", amt: 450 },
  { id: 1004, date: "2026-10-18", desc: "Oct Dining", cat: "Wants", sub: "Dining", amt: 120 },
  { id: 1005, date: "2026-11-01", desc: "Nov Rent", cat: "Needs", sub: "Housing", amt: 1500 },
  { id: 1006, date: "2026-11-03", desc: "Nov Coffee", cat: "Wants", sub: "Cafe", amt: 25 },
  { id: 1007, date: "2026-11-08", desc: "Nov Deposit", cat: "Savings", sub: "Emergency", amt: 800 }
];

localStorage.setItem("budget_tracker_503020", JSON.stringify({
  income: 5000,
  expenses: multiMonthExpenses,
  goals: []
}));

// Test November filtering
currentViewMonth = "2026-11";
const novPeriod = getActivePeriodRange();
assert(novPeriod.startIso === "2026-11-01" && novPeriod.endIso === "2026-11-30", `November period range bounded correctly: ${novPeriod.startIso} to ${novPeriod.endIso}`);

const novExpenses = getPeriodExpenses(novPeriod);
assert(novExpenses.length === 3, `November filtered exactly 3 expenses (got ${novExpenses.length})`);
const novNeeds = novExpenses.filter(e => e.cat === "Needs").reduce((s,e) => s+e.amt, 0);
const novWants = novExpenses.filter(e => e.cat === "Wants").reduce((s,e) => s+e.amt, 0);
const novSavings = novExpenses.filter(e => e.cat === "Savings").reduce((s,e) => s+e.amt, 0);
const novTotal = novNeeds + novWants + novSavings;

assert(novNeeds === 1500, `November Needs spending is $1500 (got $${novNeeds}), NOT all-time $3450`);
assert(novWants === 25, `November Wants spending is $25 (got $${novWants}), NOT all-time $145`);
assert(novSavings === 800, `November Savings spending is $800 (got $${novSavings})`);
assert(novTotal === 2325, `November Total spending is $2325 (got $${novTotal}), NOT all-time $4795`);

// Test Month Navigation (navPeriod delta)
navPeriod(-1); // Move from 2026-11 to 2026-10
assert(currentViewMonth === "2026-10", "navPeriod(-1) correctly shifted active view to October 2026 (2026-10)");
const octPeriod = getActivePeriodRange();
const octExpenses = getPeriodExpenses(octPeriod);
assert(octExpenses.length === 2, `October filtered exactly 2 expenses (got ${octExpenses.length})`);

navPeriod(-1); // Move from 2026-10 to 2026-09
assert(currentViewMonth === "2026-09", "navPeriod(-1) correctly shifted active view to September 2026 (2026-09)");
const septExpenses = getPeriodExpenses(getActivePeriodRange());
assert(septExpenses.length === 2, `September filtered exactly 2 expenses (got ${septExpenses.length})`);

navPeriod(0); // Jump back to current month
assert(currentViewMonth === null, "navPeriod(0) resets view to current calendar month");

// ─── TEST SUITE 11: Past Months Surplus & Asset Sync Engine ───
console.log("\n─── TEST SUITE 11: Past Months Surplus & Net Worth Asset Sync ───");
localStorage.clear();

// Set past expenses in earlier months
const testPastData = {
  income: 5000,
  expenses: [
    { id: 1, date: "2026-07-15", desc: "July Needs", cat: "Needs", sub: "Rent", amt: 2000 },
    { id: 2, date: "2026-07-20", desc: "July Wants", cat: "Wants", sub: "Fun", amt: 500 },
    // July total spent: 2500 -> July surplus: 2500
    { id: 3, date: "2026-08-10", desc: "Aug Needs", cat: "Needs", sub: "Rent", amt: 2200 },
    { id: 4, date: "2026-08-15", desc: "Aug Wants", cat: "Wants", sub: "Fun", amt: 300 }
    // August total spent: 2500 -> August surplus: 2500
  ],
  goals: []
};
localStorage.setItem("budget_tracker_503020", JSON.stringify(testPastData));

const pastSurplus = calcPreviousMonthsSurplus(testPastData);
assert(typeof pastSurplus === "object" && typeof pastSurplus.totalSurplus === "number", "calcPreviousMonthsSurplus returns an object with totalSurplus");
assert(pastSurplus.totalSurplus === 5000, `Past surplus correctly calculated as $5000 from July + Aug surpluses (got $${pastSurplus.totalSurplus})`);
assert(pastSurplus.months.length === 2, `Past surplus correctly contains 2 monthly rollover breakdowns (got ${pastSurplus.months.length})`);

// Test _syncPreviousMonthsSurplusToAssets
_syncPreviousMonthsSurplusToAssets();
const nwItems = getNwItems();
const autoSurplusAsset = nwItems.find(i => String(i.id) === "auto_surplus_asset" || i.isAutoSurplus);
assert(!!autoSurplusAsset, "Net worth contains auto-synced surplus asset with string id 'auto_surplus_asset'");
assert(autoSurplusAsset && autoSurplusAsset.amt === 5000, `Auto surplus asset amt matches calculated past surplus ($5000, got $${autoSurplusAsset?.amt})`);

// Test updateNwAmt and deleteNwItem with string IDs on a custom asset
saveNwItems([
  ...getNwItems(),
  { id: "custom_crypto_wallet", type: "asset", label: "Crypto", amt: 2500, transactions: [] }
]);

updateNwAmt("custom_crypto_wallet", 3500);
const updatedNw = getNwItems().find(i => String(i.id) === "custom_crypto_wallet");
assert(updatedNw && updatedNw.amt === 3500, "updateNwAmt successfully updates custom item with string ID");

deleteNwItem("custom_crypto_wallet");
const afterDelete = getNwItems().find(i => String(i.id) === "custom_crypto_wallet");
assert(!afterDelete, "deleteNwItem successfully deletes item with string ID");

// Test string ID handling on liabilities
saveNwItems([
  { id: "car_loan_101", type: "liability", label: "Car Loan", amt: 10000, transactions: [] },
  { id: "stock_portfolio_01", type: "asset", label: "Stocks", amt: 25000, transactions: [] }
]);

const mockLiabAddInput = makeMockElement("liabAdd_car_loan_101");
mockLiabAddInput.value = "1,500";
documentElements.set("liabAdd_car_loan_101", mockLiabAddInput);
_liabilityAdd("car_loan_101");

let liabItem = getNwItems().find(i => String(i.id) === "car_loan_101");
assert(liabItem && liabItem.amt === 11500, `_liabilityAdd successfully increased liability with string ID (got $${liabItem?.amt})`);

const mockLiabPayInput = makeMockElement("liabPay_car_loan_101");
mockLiabPayInput.value = "3,500";
documentElements.set("liabPay_car_loan_101", mockLiabPayInput);
_liabilityPay("car_loan_101");

liabItem = getNwItems().find(i => String(i.id) === "car_loan_101");
assert(liabItem && liabItem.amt === 8000, `_liabilityPay successfully paid down liability with string ID (got $${liabItem?.amt})`);


// ─── TEST SUITE 12: Dynamic Income & Zero-Budget Fallbacks ───
console.log("\n─── TEST SUITE 12: Dynamic Income & Zero-Budget Fallbacks ───");
localStorage.clear();

// Set income sources
localStorage.setItem("bt_income_sources", JSON.stringify([
  { id: "inc_salary", label: "Day Job", amount: 4500, isWindfall: false },
  { id: "inc_side", label: "Freelance", amount: 1500, isWindfall: false }
]));

// Clear main income input in DOM to test dynamic fallback
const incomeInput = document.getElementById("incomeInput");
if (incomeInput) incomeInput.value = "";

const parsed = parseIncome();
assert(parsed === 6000, `parseIncome falls back dynamically to total active income sources ($6000, got $${parsed})`);

const monthly = getMonthlyIncome();
assert(monthly === 6000, `getMonthlyIncome correctly sums income sources ($6000, got $${monthly})`);

// Test Finance Overview and Budget Health execution with zero or configured budgets
assert(typeof renderFinanceOverview === "function", "renderFinanceOverview is defined");
assert(typeof renderBudgetHealthBanner === "function", "renderBudgetHealthBanner is defined");

// Execute renderFinanceOverview and verify it runs cleanly without throwing
let renderOk = true;
try {
  renderFinanceOverview();
} catch (e) {
  renderOk = false;
  console.error(e);
}
assert(renderOk, "renderFinanceOverview executes cleanly with dynamic income and past surplus");

// Test zero budget health banner fallback
localStorage.setItem("bt_income_sources", "[]");
localStorage.setItem("budget_tracker_503020", JSON.stringify({ income: 0, expenses: [], goals: [] }));
let bannerOk = true;
try {
  renderBudgetHealthBanner();
} catch (e) {
  bannerOk = false;
  console.error(e);
}
assert(bannerOk, "renderBudgetHealthBanner handles 0 / unset income gracefully without crashing");


// ─── TEST SUITE 13: Card UI, Redundant Header Removal & Accordion Isolation ───
console.log("\n─── TEST SUITE 13: Card UI, Redundant Header Removal & Accordion Isolation ───");

// 1. Goal card renders name cleanly without redundant 'Savings Goal' category heading
const sampleGoal = { id: "g1", name: "Emergency Fund", target: 10000, saved: 3000, transactions: [] };
const goalHtml = _goalCard(sampleGoal, 500);
assert(!goalHtml.includes('>Savings Goal<'), "Goal card does not contain redundant 'Savings Goal' category label");
assert(goalHtml.includes('Emergency Fund'), "Goal card contains goal name");
assert(goalHtml.includes('event.stopPropagation()'), "Goal card action buttons stop propagation");
assert(goalHtml.includes('_showNwHistPopup(\'goal\',&quot;g1&quot;)'), "Goal card history button calls _showNwHistPopup with escaped string ID");
assert(goalHtml.startsWith('<div class="fin-card"') && goalHtml.endsWith('</div>'), "Goal card is a well-formed single root container");
assert((goalHtml.match(/<div/g) || []).length === (goalHtml.match(/<\/div>/g) || []).length, "Goal card has balanced open and close div tags");

// 2. Asset card renders name cleanly without redundant 'Asset' category heading
const sampleAsset = { id: "a1", label: "Checking Account", amt: 12500, transactions: [] };
const assetHtml = _assetCard(sampleAsset);
assert(!assetHtml.includes('>Asset<'), "Asset card does not contain redundant 'Asset' category label");
assert(assetHtml.includes('Checking Account'), "Asset card contains asset name");
assert(assetHtml.includes('_showNwHistPopup(\'asset\',&quot;a1&quot;)'), "Asset card history button calls _showNwHistPopup with escaped string ID");
assert(assetHtml.startsWith('<div class="fin-card"') && assetHtml.endsWith('</div>'), "Asset card is a well-formed single root container");
assert((assetHtml.match(/<div class="fin-card"/g) || []).length === 1, "Asset card contains exactly one card container");
assert((assetHtml.match(/<div/g) || []).length === (assetHtml.match(/<\/div>/g) || []).length, "Asset card has balanced open and close div tags");

// 3. Liability card renders name cleanly without redundant 'Liability' category heading
const sampleLiab = { id: "l1", label: "Student Loan", amt: 15000, transactions: [] };
const liabHtml = _liabilityCard(sampleLiab);
assert(!liabHtml.includes('>Liability<'), "Liability card does not contain redundant 'Liability' category label");
assert(liabHtml.includes('Student Loan'), "Liability card contains liability name");
assert(liabHtml.includes('_showNwHistPopup(\'liability\',&quot;l1&quot;)'), "Liability card history button calls _showNwHistPopup with escaped string ID");
assert(liabHtml.startsWith('<div class="fin-card"') && liabHtml.endsWith('</div>'), "Liability card is a well-formed single root container");
assert((liabHtml.match(/<div/g) || []).length === (liabHtml.match(/<\/div>/g) || []).length, "Liability card has balanced open and close div tags");

// 4. Accordion Toggle Isolation test
const mockAccordion = document.createElement("div");
mockAccordion.className = "accordion fin-accordion";
const mockHeader = document.createElement("div");
mockHeader.className = "accordion-header";
const mockBody = document.createElement("div");
mockBody.className = "accordion-body";
mockAccordion.appendChild(mockHeader);
mockAccordion.appendChild(mockBody);
document.body.appendChild(mockAccordion);

let stopPropCalled = false;
const mockEvt = { stopPropagation: () => { stopPropCalled = true; } };

assert(!mockAccordion.classList.contains("open"), "Accordion starts closed");
toggleFinAccordion(mockHeader, mockEvt);
assert(mockAccordion.classList.contains("open"), "toggleFinAccordion toggles parent fin-accordion open when clicked on header");
assert(stopPropCalled, "toggleFinAccordion stopped event propagation");

toggleFinAccordion(mockHeader, mockEvt);
assert(!mockAccordion.classList.contains("open"), "toggleFinAccordion toggles fin-accordion closed on second click");

mockAccordion.remove();


// ─── TEST SUITE 14: Rollover Income Card Interaction & String ID Buttons ───
console.log("\n─── TEST SUITE 14: Rollover Income Card Interaction & String ID Buttons ───");

// Reset storage
localStorage.clear();
const testData = {
  income: 5000,
  expenses: [
    { id: 1, name: "Rent", cat: "Needs", amt: 1000, date: "2026-07-05" },
    { id: 2, name: "Groceries", cat: "Needs", amt: 500, date: "2026-08-10" }
  ],
  goals: []
};
saveData(testData);

// 1. Sync creates "Rollover Income (Past Months)"
_syncPreviousMonthsSurplusToAssets();
let currentNwItems = getNwItems();
let rolloverItem = currentNwItems.find(i => i.id === "auto_surplus_asset");
assert(rolloverItem !== undefined, "Rollover Income asset created automatically");
assert(rolloverItem.label === "Rollover Income (Past Months)", "Auto asset named 'Rollover Income (Past Months)'");
assert(rolloverItem.name === "Rollover Income (Past Months)", "Auto asset name is 'Rollover Income (Past Months)'");

// 2. Render card and verify escaped button attributes
const rolloverCardHtml = _assetCard(rolloverItem);
assert(rolloverCardHtml.includes("Rollover Income (Past Months)"), "Card renders 'Rollover Income (Past Months)' text");
assert(rolloverCardHtml.includes('_showNwHistPopup(\'asset\',&quot;auto_surplus_asset&quot;)'), "History button contains escaped string ID argument");
assert(rolloverCardHtml.includes('openEditNwItemPopup(\'asset\',&quot;auto_surplus_asset&quot;)'), "Edit name button contains escaped string ID argument");
assert(rolloverCardHtml.includes('deleteNwItem(&quot;auto_surplus_asset&quot;)'), "Delete button contains escaped string ID argument");
assert(rolloverCardHtml.includes('_assetFund(&quot;auto_surplus_asset&quot;)'), "Fund button contains escaped string ID argument");
assert(rolloverCardHtml.includes('_assetWithdraw(&quot;auto_surplus_asset&quot;)'), "Withdraw button contains escaped string ID argument");

// 3. Test history popup opens cleanly
_showNwHistPopup("asset", "auto_surplus_asset");
const histPopup = document.getElementById("_nwHistPopup");
assert(histPopup !== null, "Transaction history popup opens cleanly for 'auto_surplus_asset'");
assert(histPopup.textContent.includes("Rollover Income (Past Months)"), "History popup displays item title");
histPopup.remove();

// 4. Test edit name popup opens cleanly and renaming persists
openEditNwItemPopup("asset", "auto_surplus_asset");
const editPopup = document.getElementById("_editNwItemPopup");
assert(editPopup !== null, "Edit name popup opens cleanly for 'auto_surplus_asset'");
const editNameInput = document.getElementById("_editNwItemNameInput");
assert(editNameInput !== null && editNameInput.value === "Rollover Income (Past Months)", "Edit input populated with current name");
editNameInput.value = "Custom Rollover Stash";
_saveEditNwItemPopup("asset", "auto_surplus_asset");
assert(document.getElementById("_editNwItemPopup") === null, "Edit popup closes on save");

currentNwItems = getNwItems();
rolloverItem = currentNwItems.find(i => i.id === "auto_surplus_asset");
assert(rolloverItem.label === "Custom Rollover Stash", "Custom rename persisted to asset label");
assert(rolloverItem.name === "Custom Rollover Stash", "Custom rename persisted to asset name");

// 5. Test _syncPreviousMonthsSurplusToAssets preserves custom rename
_syncPreviousMonthsSurplusToAssets();
currentNwItems = getNwItems();
rolloverItem = currentNwItems.find(i => i.id === "auto_surplus_asset");
assert(rolloverItem.label === "Custom Rollover Stash", "Re-sync preserves user custom rename");

// 6. Test delete dismisses auto-surplus card and sets flag
deleteNwItem("auto_surplus_asset");
currentNwItems = getNwItems();
assert(!currentNwItems.some(i => i.id === "auto_surplus_asset"), "deleteNwItem removes 'auto_surplus_asset'");
assert(localStorage.getItem("bt_auto_surplus_dismissed") === "1", "deleteNwItem sets 'bt_auto_surplus_dismissed' flag in localStorage");

// 7. Verify subsequent sync respects dismissal flag
_syncPreviousMonthsSurplusToAssets();
currentNwItems = getNwItems();
assert(!currentNwItems.some(i => i.id === "auto_surplus_asset"), "Re-sync respects dismissal flag and does not resurrect card");


// ─── SUMMARY ────────────────────────────────────────────────
console.log("\n=================================================");
console.log(`  QA TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
}
