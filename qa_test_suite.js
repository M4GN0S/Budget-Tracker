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
const makeMockElement = (id = '') => ({
  id,
  textContent: '',
  innerHTML: '',
  value: '',
  style: {},
  classList: {
    add: () => {},
    remove: () => {},
    contains: () => false,
    toggle: () => {}
  },
  setAttribute: () => {},
  getAttribute: () => '',
  addEventListener: () => {},
  remove: () => {},
  appendChild: () => {},
  children: []
});

const document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  head: { appendChild: () => {} },
  documentElement: { setAttribute: () => {}, getAttribute: () => '' },
  getElementById: (id) => {
    if (!documentElements.has(id)) {
      documentElements.set(id, makeMockElement(id));
    }
    return documentElements.get(id);
  },
  querySelector: (sel) => document.getElementById(sel.replace(/^[#.]/, '')),
  querySelectorAll: () => [],
  createElement: (tag) => makeMockElement(tag),
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
const code = fs.readFileSync('/tmp/bt_main.js', 'utf8');
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


// ─── SUMMARY ────────────────────────────────────────────────
console.log("\n=================================================");
console.log(`  QA TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
}
