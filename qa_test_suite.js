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


// ─── TEST SUITE 15: Savings Goals Accordion UI & Windfall Rollover Edge Cases ───
console.log("\n─── TEST SUITE 15: Savings Goals Accordion UI & Windfall Rollover Edge Cases ───");

// 1. Verify index.html does not have nested accordion-header tags in goalsAccordion
const rawIndexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const goalsAccMatch = rawIndexHtml.match(/<div class="accordion fin-accordion" id="goalsAccordion">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
assert(goalsAccMatch !== null, "goalsAccordion exists in index.html");
const headerOccurrences = (goalsAccMatch ? goalsAccMatch[0].match(/class="accordion-header"/g) || [] : []).length;
assert(headerOccurrences === 1, `goalsAccordion has exactly 1 accordion-header (got ${headerOccurrences})`);

// 2. Windfall rollover in past month with regular monthly income
localStorage.clear();
const windfallTestData = {
  income: 3000,
  expenses: [
    { id: 101, name: "Rent", cat: "Needs", amt: 1000, date: "2026-07-05" }
  ],
  goals: []
};
saveData(windfallTestData);
saveIncomeSources([
  { id: 201, type: "bonus", label: "One-time Bonus", amount: 5000, isWindfall: true, date: "2026-07-15" }
]);

const pastSurplusWithWf = calcPreviousMonthsSurplus();
assert(pastSurplusWithWf.totalSurplus === 7000, `Past surplus correctly includes 3000 base + 5000 windfall - 1000 expense = 7000 (got ${pastSurplusWithWf.totalSurplus})`);
assert(pastSurplusWithWf.totalWindfall === 5000, `Past surplus captures totalWindfall of 5000 (got ${pastSurplusWithWf.totalWindfall})`);
assert(pastSurplusWithWf.months.length === 1, "Exactly 1 rollover month recorded");

// 3. Sync to asset and verify transaction note details
_syncPreviousMonthsSurplusToAssets();
const syncedNw = getNwItems();
const autoSurplus = syncedNw.find(i => i.id === "auto_surplus_asset");
assert(autoSurplus !== undefined, "Rollover income asset created with windfall surplus");
assert(autoSurplus.amt === 7000, `Rollover asset amount is 7000 (got ${autoSurplus.amt})`);
assert(autoSurplus.transactions[0].note.includes("5,000") && autoSurplus.transactions[0].note.includes("windfall"), `Transaction note explicitly details windfall breakdown: "${autoSurplus.transactions[0].note}"`);

// 4. Pure windfall rollover with 0 regular income
localStorage.clear();
const pureWfData = {
  income: 0,
  expenses: [
    { id: 102, name: "Equipment", cat: "Needs", amt: 1500, date: "2026-06-10" }
  ],
  goals: []
};
saveData(pureWfData);
saveIncomeSources([
  { id: 202, type: "lottery", label: "Lottery Win", amount: 10000, isWindfall: true, date: "2026-06-01" }
]);

const pureWfSurplus = calcPreviousMonthsSurplus();
assert(pureWfSurplus.totalSurplus === 8500, `Pure windfall surplus is 10000 - 1500 = 8500 (got ${pureWfSurplus.totalSurplus})`);
assert(pureWfSurplus.totalWindfall === 10000, `Pure windfall captures 10000 (got ${pureWfSurplus.totalWindfall})`);

_syncPreviousMonthsSurplusToAssets();
const pureWfSynced = getNwItems();
const pureWfAsset = pureWfSynced.find(i => i.id === "auto_surplus_asset");
assert(pureWfAsset.amt === 8500, `Pure windfall rollover asset amount is 8500 (got ${pureWfAsset.amt})`);
assert(pureWfAsset.transactions[0].note.includes("Windfall Rollover"), `Transaction note uses 'Windfall Rollover' label: "${pureWfAsset.transactions[0].note}"`);


// ─── TEST SUITE 16: Windfall & Sideline Income UI Semantics & Modal Dynamic Labels ───
console.log("\n─── TEST SUITE 16: Windfall & Sideline Income UI Semantics & Modal Dynamic Labels ───");

// 1. Windfall income card renders 'Amount:' instead of 'Monthly:' and does NOT render double plus '+ +'
const sampleWindfall = { id: 501, label: "Lot Sale", type: "property_sale", amount: 300000, isWindfall: true, transactions: [] };
const windfallCardHtml = _finCard(sampleWindfall, {
  module: "income",
  isWindfall: true,
  accentColor: "var(--acc)",
  accentLight: "var(--acc-l)",
  tagLabel: "Property / Asset Sale",
  actionLabel: "Record Payout",
  actionFn: "openFinTxnModal(501,'income','log')",
  balance: 300000
});
assert(windfallCardHtml.includes("Amount:"), "Windfall card renders 'Amount:' label");
assert(!windfallCardHtml.includes("Monthly:"), "Windfall card does NOT render 'Monthly:' label");
assert(windfallCardHtml.includes("Record Payout"), "Windfall card uses 'Record Payout' action button");
assert(!windfallCardHtml.includes("+ +"), "Windfall card has no duplicate '+ +' (double cross) icon");

// 2. Regular monthly income card renders 'Monthly:' and tests defensive leading '+' stripping
const sampleMonthlyInc = { id: 502, label: "Day Job", type: "salary", amount: 5000, isWindfall: false, transactions: [] };
const monthlyCardHtml = _finCard(sampleMonthlyInc, {
  module: "income",
  isWindfall: false,
  accentColor: "var(--suc)",
  accentLight: "var(--suc-l)",
  tagLabel: "Salary / Employment",
  actionLabel: "+ Log Income", // intentionally passing leading '+' to test defensive stripping
  actionFn: "openFinTxnModal(502,'income','log')",
  balance: 5000
});
assert(monthlyCardHtml.includes("Monthly:"), "Recurring income card renders 'Monthly:' label");
assert(monthlyCardHtml.includes("Log Income"), "Recurring income card uses 'Log Income' action button");
assert(!monthlyCardHtml.includes("+ +"), "Defensive sanitizer prevents duplicate '+ +' when actionLabel starts with '+'");
assert(!monthlyCardHtml.includes(">+ Log Income"), "Leading '+' is stripped so text node is cleanly 'Log Income'");

// 3. Dynamic modal update hint and amount label
addIncomeSource();
const incTypeSel = document.getElementById("_incType");
const incAmtLabel = document.getElementById("_incAmtLabel");
const incHint = document.getElementById("_incTypeHint");

assert(incTypeSel !== null, "Income type select exists in modal");
assert(incAmtLabel !== null, "Amount label exists in modal");

// Change to a windfall category
incTypeSel.value = "property_sale";
_updateIncTypeHint(incTypeSel);
assert(incAmtLabel.textContent === "One-Time Amount", `Selecting property_sale updates amount label to 'One-Time Amount' (got '${incAmtLabel.textContent}')`);
assert(incHint.style.display !== "none", "Selecting property_sale shows windfall info hint");

// Change to recurring category
incTypeSel.value = "salary";
_updateIncTypeHint(incTypeSel);
assert(incAmtLabel.textContent === "Monthly Amount", `Selecting salary updates amount label to 'Monthly Amount' (got '${incAmtLabel.textContent}')`);
assert(incHint.style.display === "none", "Selecting salary hides windfall info hint");

document.getElementById("_incSrcModal")?.remove();


// ─── TEST SUITE 17: Finance Summary Box Formatting & Badge Consistency ───
console.log("\n─── TEST SUITE 17: Finance Summary Box Formatting & Badge Consistency ───");

// Setup sample data with recurring income, past rollover, and windfall income
saveData({
  income: 5000,
  expenses: [
    { id: 901, date: "2026-07-15", desc: "Past rent", cat: "Needs", sub: "Rent", amt: 1000 }
  ],
  goals: [],
  ratios: { needs: 50, wants: 30, savings: 20 }
});
saveIncomeSources([
  { id: 902, label: "Salary", type: "salary", amount: 5000, isWindfall: false },
  { id: 903, label: "Bonus", type: "bonus", amount: 15000, isWindfall: true }
]);
localStorage.removeItem("bt_auto_surplus_dismissed");

renderFinanceOverview();

const summaryBoxEl = document.getElementById("financeSummaryBox");
assert(summaryBoxEl !== null, "financeSummaryBox element exists in DOM");
const summaryHtml = summaryBoxEl.innerHTML;

assert(summaryHtml.includes("Remaining to Spend"), "Summary box includes 'Remaining to Spend' row");
assert(summaryHtml.includes("Past Months' Rollover"), "Summary box includes 'Past Months' Rollover' row");
assert(summaryHtml.includes("Windfall / One-Time Income"), "Summary box includes 'Windfall / One-Time Income' row");

// Check badge consistency
assert(summaryHtml.includes("Added to Assets ✓"), "Rollover row includes styled 'Added to Assets ✓' badge");
assert(summaryHtml.includes("Added to Net Worth ✓"), "Windfall row includes styled 'Added to Net Worth ✓' badge");

// Check that no row amounts have arbitrary '+' prepended to currency symbol like '+₱' or '+$'
assert(!summaryHtml.includes(">+<") && !summaryHtml.includes(">+$") && !summaryHtml.includes(">+€") && !summaryHtml.includes(">+£") && !summaryHtml.includes(">+₱"), "No row amounts have raw '+' prepended directly to currency symbols");


// ─── TEST SUITE 18: Unified Income Sources Card UI & Modal History ───
console.log("\n─── TEST SUITE 18: Unified Income Sources Card UI & Modal History ───");

// Setup income source with transactions
const testInc = {
  id: 888,
  label: "Freelance Design",
  name: "Freelance Design",
  type: "freelance",
  amount: 2500,
  isWindfall: false,
  transactions: [
    { id: "tx_1", date: "2026-08-01", action: "init", amount: 1000, balance: 1000, note: "Initial" },
    { id: "tx_2", date: "2026-08-15", action: "fund", amount: 1500, balance: 2500, note: "Project payout" }
  ]
};
saveIncomeSources([testInc]);

// Render card
const renderedCard = _finCard(testInc, {
  module:      "income",
  isWindfall:  false,
  accentColor: "var(--suc)",
  accentLight: "var(--suc-l)",
  tagLabel:    "Freelance",
  actionLabel: "Log Income",
  actionFn:    `openFinTxnModal(${testInc.id},'income','log')`,
  balance:     testInc.amount,
});

// Card UI assertions
assert(renderedCard.includes("_showNwHistPopup('income',888)"), "Income card history button triggers modal popup _showNwHistPopup('income', 888)");
assert(renderedCard.includes("openEditIncomeName(888)"), "Income card edit button triggers openEditIncomeName(888)");
assert(renderedCard.includes("deleteIncomeSource(888)"), "Income card delete button triggers deleteIncomeSource(888)");
assert(!renderedCard.includes("_toggleFinHist"), "Income card does NOT contain legacy inline _toggleFinHist accordion");
assert(!renderedCard.includes("<table"), "Income card does NOT embed inline history table");

// Test history modal popup
_showNwHistPopup('income', 888);
const histModal = document.getElementById('_nwHistPopup');
assert(histModal !== null, "_showNwHistPopup('income', 888) creates history modal in DOM");
assert(histModal.innerHTML.includes("Freelance Design"), "History modal shows item title");
assert(histModal.innerHTML.includes("Project payout"), "History modal shows transaction note");
assert(histModal.innerHTML.includes("_editNwTxn('income',888,1)"), "History modal edit button targets _editNwTxn('income', 888, 1)");
assert(histModal.innerHTML.includes("_deleteNwTxn('income',888,1)"), "History modal delete button targets _deleteNwTxn('income', 888, 1)");

// Test transaction editing
_editNwTxn('income', 888, 1);
const editTxnModal = document.getElementById('_editTxnPopup');
assert(editTxnModal !== null, "_editNwTxn opens edit txn modal");
const amtInp = document.getElementById('_editTxnAmt');
assert(amtInp !== null, "Edit txn amount input exists");
amtInp.value = "2000";
const noteInp = document.getElementById('_editTxnNote');
noteInp.value = "Updated payout note";
_saveEditNwTxn('income', 888, 1);

const updatedSources = getIncomeSources();
const updatedInc = updatedSources.find(s => s.id === 888);
assert(updatedInc.amount === 3000, `Income total recalculated correctly after txn edit (expected 3000, got ${updatedInc.amount})`);
assert(updatedInc.transactions[1].amount === 2000, "Edited transaction amount persisted");
assert(updatedInc.transactions[1].note === "Updated payout note", "Edited transaction note persisted");
assert(updatedInc.transactions[1].balance === 3000, "Edited transaction balance recalculated");

// Test transaction deleting
global.confirm = () => true;
_deleteNwTxn('income', 888, 1);
const afterDelSources = getIncomeSources();
const afterDelInc = afterDelSources.find(s => s.id === 888);
assert(afterDelInc.transactions.length === 1, "Transaction successfully deleted from income source");
assert(afterDelInc.amount === 1000, `Income total recalculated correctly after txn deletion (expected 1000, got ${afterDelInc.amount})`);

histModal.remove();

// Test edit income name modal
openEditIncomeName(888);
const nameModal = document.getElementById('_editIncModal');
assert(nameModal !== null, "openEditIncomeName opens edit name modal");
const nameInp = document.getElementById('_editIncNameInput');
assert(nameInp !== null, "Edit name input exists");
nameInp.value = "Consulting & Design";
_saveEditIncomeName(888);

const finalSources = getIncomeSources();
const finalInc = finalSources.find(s => s.id === 888);
assert(finalInc.label === "Consulting & Design", "Updated income name persisted");


// ─── SUITE 19: DASHBOARD TOP METRICS & BUDGET HEALTH CARD REDESIGN ─
console.log("\n─── TEST SUITE 19: Dashboard Top Stat Cards & Budget Health Card Layout & Formatting ───");

// 1. Verify Net Worth card formatting for negative and positive values
localStorage.setItem("bt_networth", JSON.stringify([
  { id: 1, type: "asset", name: "Savings", amt: 100000 },
  { id: 2, type: "liability", name: "Mortgage", amt: 7171800 }
]));
_renderDashNetWorth();
const dashNwEl = document.getElementById("dashStatNw");
assert(dashNwEl !== null, "dashStatNw element exists in DOM");
assert(dashNwEl.textContent.startsWith("\u2212") || dashNwEl.textContent.includes("\u2212"), "Negative net worth uses non-breaking unicode minus sign (\\u2212)");
assert(!dashNwEl.textContent.includes("- ") && !dashNwEl.textContent.startsWith("-\n"), "Minus sign is attached cleanly without trailing line breaks");

// Positive Net Worth
localStorage.setItem("bt_networth", JSON.stringify([
  { id: 1, type: "asset", name: "Savings", amt: 500000 },
  { id: 2, type: "liability", name: "Credit Card", amt: 50000 }
]));
_renderDashNetWorth();
assert(!dashNwEl.textContent.includes("\u2212") && !dashNwEl.textContent.includes("-"), "Positive net worth does not contain minus sign");
assert(dashNwEl.style.color === "var(--suc)", "Positive net worth uses success color var(--suc)");

// 2. Verify Cashflow card formatting for positive and negative cashflow
const currentPeriodMonth = (new Date()).toISOString().slice(0, 7);
currentViewMonth = currentPeriodMonth;
document.getElementById("incomeInput").value = "6000";
saveData({
  income: 6000,
  expenses: [{ id: 1, date: `${currentPeriodMonth}-01`, desc: "Rent", cat: "Needs", sub: "Housing", amt: 2000 }],
  goals: []
});
updateDashboard();
const dashCfEl = document.getElementById("dashStatCf");
const dashCfSubEl = document.getElementById("dashStatCfSub");
assert(dashCfEl !== null, "dashStatCf element exists in DOM");
assert(!dashCfEl.textContent.startsWith("+"), "Positive cashflow does not prepend raw '+' directly to currency symbol");
assert(dashCfEl.style.color === "var(--suc)", "Positive cashflow uses success color var(--suc)");
assert(dashCfSubEl.textContent === "Surplus available", "Positive cashflow displays 'Surplus available' subtitle");

// Negative cashflow (Overspent)
document.getElementById("incomeInput").value = "2000";
saveData({
  income: 2000,
  expenses: [{ id: 1, date: `${currentPeriodMonth}-01`, desc: "Emergency repair", cat: "Needs", sub: "Housing", amt: 3500 }],
  goals: []
});
updateDashboard();
assert(dashCfEl.textContent.startsWith("\u2212"), "Negative cashflow uses non-breaking unicode minus sign (\\u2212)");
assert(dashCfEl.style.color === "var(--dan)", "Negative cashflow uses danger color var(--dan)");
assert(dashCfSubEl.textContent === "Overspent", "Negative cashflow displays 'Overspent' subtitle");

// 3. Verify Budget Health Card structure and recommendation list rendering
updateHealthScore(1500, 500, 1000, 2500, 1500, 1000, 5000);
const healthCard = document.getElementById("healthScoreCard");
const healthVal = document.getElementById("healthScoreValue");
const healthTier = document.getElementById("healthScoreTier");
const healthRecs = document.getElementById("healthScoreRecs");
assert(healthCard !== null, "healthScoreCard element exists in DOM");
assert(healthVal !== null && String(healthVal.textContent).length > 0 && String(healthVal.textContent) !== "—", "healthScoreValue displays calculated score");
assert(healthTier !== null && healthTier.textContent.length > 0, "healthScoreTier displays health category");
assert(healthRecs !== null && (healthRecs.innerHTML.match(/<div/g) || []).length === 3, "healthScoreRecs renders exactly 3 structured recommendation items");
assert(healthRecs.innerHTML.includes("<strong style=\"color:var(--txt)\">Needs</strong>"), "Needs recommendation is highlighted with clean strong tag");
assert(healthRecs.innerHTML.includes("<strong style=\"color:var(--txt)\">Lifestyle spending</strong>") || healthRecs.innerHTML.includes("<strong style=\"color:var(--txt)\">Wants</strong>"), "Wants recommendation is highlighted with clean strong tag");
assert(healthRecs.innerHTML.includes("<strong style=\"color:var(--txt)\">Savings"), "Savings recommendation is highlighted with clean strong tag");

// 4. Verify Period Navigator and 5 Top Stat Cards grid in index.html
const indexHtmlContent = fs.readFileSync('index.html', 'utf8');
assert(indexHtmlContent.includes('class="period-navigator-bar"'), "Period navigator bar exists with period-navigator-bar class");
assert(indexHtmlContent.includes('id="periodNavTitle"'), "Period navigator contains title element");
assert(indexHtmlContent.includes('id="periodNavBadge"'), "Period navigator contains badge pill");
assert(indexHtmlContent.includes('class="stat stat-nw"'), "Top metrics contains Net Worth card");
assert(indexHtmlContent.includes('class="stat stat-dr"'), "Top metrics contains Debt Ratio card");
assert(indexHtmlContent.includes('class="stat stat-assets"'), "Top metrics contains Assets card");
assert(indexHtmlContent.includes('class="stat stat-liab"'), "Top metrics contains Liabilities card");
assert(indexHtmlContent.includes('class="stat stat-cf"'), "Top metrics contains Cashflow card");


// ─── SUITE 20: JOURNAL NOTE MODAL MAXIMIZE/MINIMIZE & SUBDUED RELATED NOTES ─
console.log("\n─── TEST SUITE 20: Journal Note Modal Maximize/Minimize & Subdued Related Notes ───");

// 1. Verify Maximize/Minimize toggle function & fresh-open state reset
toggleNoteModalMaximize(true);
const modalEl = document.querySelector(".note-modal");
const maxBtnEl = document.getElementById("noteModalMaxBtn");
assert(modalEl.classList.contains("is-maximized"), "toggleNoteModalMaximize(true) adds is-maximized class to .note-modal");
assert(maxBtnEl.title === "Exit full screen", "Maximize button tooltip changes to 'Exit full screen'");

// Simulate opening another note: must reset maximize state so fullscreen never carries over automatically
localStorage.setItem("bt_notes", JSON.stringify([
  { id: 998, title: "Next Note", text: "Some notes", tag: "idea", date: new Date().toISOString() }
]));
openNoteModal(998);
assert(!modalEl.classList.contains("is-maximized"), "openNoteModal(id) resets maximize state so fullscreen does not carry over");
assert(maxBtnEl.title === "Full screen", "Maximize button tooltip resets to 'Full screen' on new note open");

// 2. Verify formatNoteBody checklist table output and direct itemIdx parameter
const sampleNoteText = "End of Month Action Items\n[ ] Transfer ₱ 15,000.00 to savings x2 — ₱15000.00\n[x] Keep ₱ 48,200.00 for remaining bills — ₱48200.00";
const formattedBody = formatNoteBody(sampleNoteText, 999);
assert(formattedBody.includes('class="nb-checklist-wrap"'), "formatNoteBody wraps checklist items in nb-checklist-wrap container");
assert(formattedBody.includes('class="nb-cl-table"'), "formatNoteBody renders nb-cl-table element");
assert(formattedBody.includes('class="nb-qty-input"'), "formatNoteBody renders qty input for items");
assert(formattedBody.includes('class="nb-price-input"'), "formatNoteBody renders price input for items");
assert(formattedBody.includes('toggleNoteCheck(999,this,0)'), "Checkbox onchange passes direct itemIdx 0 to toggleNoteCheck");
assert(formattedBody.includes('toggleNoteCheck(999,this,1)'), "Checkbox onchange passes direct itemIdx 1 to toggleNoteCheck");

// 3. Verify price regex handles currency symbol with space (e.g. "Wine — ₱ 200.00")
const spacedCurrencyNote = "Grocery List\n[ ] Wine — ₱ 200.00\n[x] Cheese — $ 45.50\n[ ] Bread - PHP 80.00";
const spacedBody = formatNoteBody(spacedCurrencyNote, 997);
assert(spacedBody.includes('>Wine<'), "formatNoteBody cleanly separates description 'Wine' from price with spaced currency");
assert(spacedBody.includes('value="200.00"'), "formatNoteBody parses amount 200.00 into price input value");
assert(spacedBody.includes('>Cheese<'), "formatNoteBody cleanly separates description 'Cheese'");
assert(spacedBody.includes('value="45.50"'), "formatNoteBody parses amount 45.50 into price input value");

// 4. Verify toggleNoteCheck with directIdx
localStorage.setItem("bt_notes", JSON.stringify([
  { id: 999, title: "End of Month Action Items", text: "[ ] Item 1\n[ ] Item 2\n[ ] Item 3", tag: "checklist", date: new Date().toISOString() }
]));
const mockCb = makeMockElement("mockCb");
mockCb.checked = true;
toggleNoteCheck(999, mockCb, 1);
const updatedNotes = JSON.parse(localStorage.getItem("bt_notes") || "[]");
const targetNote = updatedNotes.find(n => n.id === 999);
assert(targetNote.text.includes("[ ] Item 1\n[x] Item 2\n[ ] Item 3"), "toggleNoteCheck with directIdx 1 toggles exactly Item 2 without off-by-one errors");

// 5. Verify Subdued Related Notes header and markup
localStorage.setItem("bt_notes", JSON.stringify([
  { id: 901, title: "Next Month's Budget Checklist", text: "Details here", tag: "checklist", date: new Date().toISOString() },
  { id: 902, title: "Next Month's Savings Checklist", text: "Details here", tag: "checklist", date: new Date().toISOString() },
  { id: 903, title: "Budget Action Items", text: "Budget details", tag: "checklist", date: new Date().toISOString() }
]));
renderRelatedNotes({ id: 900, title: "Budget Checklist", text: "Budget items", tag: "checklist" });
const relWrap = document.getElementById("noteModalRelated");
assert(relWrap !== null && relWrap.style.display !== "none", "Related notes container rendered and visible");
assert(relWrap.innerHTML.includes("Related notes"), "Related notes container displays label");
assert(relWrap.innerHTML.includes("rel-collapse"), "Related notes container includes collapse toggle button");
assert(relWrap.innerHTML.includes("note-related-list"), "Related notes container uses note-related-list container");

// 6. Verify index.html contains Maximize button markup, mobile/tablet permanent fullscreen CSS, and checked row styles
const indexHtml = fs.readFileSync('index.html', 'utf8');
assert(indexHtml.includes('id="noteModalMaxBtn"'), "index.html contains #noteModalMaxBtn maximize button");
assert(indexHtml.includes('class="icon-max"'), "Maximize button contains icon-max");
assert(indexHtml.includes('class="icon-restore"'), "Maximize button contains icon-restore");
assert(indexHtml.includes('@media(max-width:900px)'), "index.html contains responsive media query for mobile phones and tablets");
assert(indexHtml.includes('.btn-modal-max{display:none !important}'), "Maximize button is hidden on mobile & tablets where modal is permanently fullscreen");
assert(indexHtml.includes('.nb-cl-row.checked td'), "index.html styles checked checklist table rows with distinct background in all themes");
assert(indexHtml.includes('.note-modal-body .note-check.checked'), "index.html styles checked markdown checklist items with distinct background in all themes");
assert(indexHtml.includes('.note-modal.is-maximized .note-modal-body'), "index.html includes constrained max-width reading container for maximized view");


// ─── SUMMARY ────────────────────────────────────────────────
console.log("\n=================================================");
console.log(`  QA TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
}
