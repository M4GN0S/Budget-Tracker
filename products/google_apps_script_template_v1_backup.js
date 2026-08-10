/**
 * GOOGLE APPS SCRIPT — Budget Tracker Template Builder
 * 1-Click: Creates a complete 5-tab Aura-styled template
 *
 * BEFORE RUNNING:
 * 1. Extensions → Apps Script
 * 2. Settings (gear icon) → Check "Enable Chrome V8 runtime"
 * 3. Paste this script
 * 4. Save (Ctrl+S)
 * 5. Select "buildTemplate" from the dropdown
 * 6. Click Run → Authorize
 */

function buildTemplate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Insert a temp sheet so we never hit 0 sheets (required by Sheets)
  ss.insertSheet("_tmp");
  var sheets = ss.getSheets();
  for (var i = sheets.length - 1; i >= 0; i--) {
    if (sheets[i].getName() !== "_tmp") {
      ss.deleteSheet(sheets[i]);
    }
  }
  buildDashboardSheet(ss);
  buildYearlySheet(ss);
  buildExpensesSheet(ss);
  buildGoalsSheet(ss);
  buildSetupSheet(ss);
  var all = ss.getSheets();
  for (var j = 0; j < all.length; j++) {
    if (all[j].getName() === "_tmp" || all[j].getName() === "Sheet1") ss.deleteSheet(all[j]);
  }
  var order = ["Dashboard","Yearly","Expenses","Goals","Setup"];
  for (var k = 0; k < order.length; k++) {
    var sh = ss.getSheetByName(order[k]);
    if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(k + 1); }
  }
  SpreadsheetApp.getUi().alert("Template built! 5 tabs ready for Etsy.");
}

function styleHeaderRow(range) {
  range.setFontWeight("bold");
  range.setFontSize(10);
  range.setFontColor("#FFFFFF");
  range.setBackground("#6C9A8B");
  range.setHorizontalAlignment("center");
  range.setVerticalAlignment("middle");
}

function buildDashboardSheet(ss) {
  var s = ss.insertSheet("Dashboard", 0);
  s.setColumnWidth(1, 210);
  s.setColumnWidth(2, 110);
  s.setColumnWidth(3, 110);
  s.setColumnWidth(4, 110);
  s.setColumnWidth(5, 110);
  s.setColumnWidth(6, 130);

  s.getRange("A1").setValue("Budget Tracker");
  s.getRange("A1").setFontSize(16).setFontWeight("bold").setFontColor("#6C9A8B");
  s.getRange("A1:F1").merge();

  s.getRange("A3").setValue("Monthly Income");
  s.getRange("A3").setFontWeight("bold").setFontSize(11).setFontColor("#4E6F62");
  s.getRange("B3").setValue(5000);
  s.getRange("B3").setNumberFormat("$#,##0.00").setFontWeight("bold").setFontSize(13);

  s.getRange("A5").setValue("Cashflow Balance");
  s.getRange("A5").setFontWeight("bold").setFontSize(11).setFontColor("#4E6F62");
  s.getRange("B5").setFormula("=B3-D11");
  s.getRange("B5").setNumberFormat("$#,##0.00").setFontWeight("bold").setFontSize(14);
  s.getRange("A5:B5").setBackground("#EDF5ED");

  var hdr = [["Category","% of Income","Budget","Spent","Remaining","Status"]];
  s.getRange("A7:F7").setValues(hdr);
  styleHeaderRow(s.getRange("A7:F7"));

  // Row 8: Needs
  s.getRange("A8").setValue("Needs").setFontWeight("bold");
  s.getRange("B8").setValue(0.50).setNumberFormat("0%");
  s.getRange("C8").setFormula("=B3*B8");
  s.getRange("D8").setFormula('=SUMIF(Expenses!C:C,"Needs",Expenses!E:E)');
  s.getRange("E8").setFormula("=C8-D8");
  s.getRange("F8").setFormula('=IF(D8>C8,"Over",IF(D8>=C8*0.8,"At Limit","On Track"))');
  s.getRange("C8:E8").setNumberFormat("$#,##0.00");
  s.getRange("A8:F8").setBackground("#EDF5ED");

  // Row 9: Wants
  s.getRange("A9").setValue("Wants").setFontWeight("bold");
  s.getRange("B9").setValue(0.30).setNumberFormat("0%");
  s.getRange("C9").setFormula("=B3*B9");
  s.getRange("D9").setFormula('=SUMIF(Expenses!C:C,"Wants",Expenses!E:E)');
  s.getRange("E9").setFormula("=C9-D9");
  s.getRange("F9").setFormula('=IF(D9>C9,"Over",IF(D9>=C9*0.8,"At Limit","On Track"))');
  s.getRange("C9:E9").setNumberFormat("$#,##0.00");
  s.getRange("A9:F9").setBackground("#FDF0E6");

  // Row 10: Savings
  s.getRange("A10").setValue("Savings").setFontWeight("bold");
  s.getRange("B10").setValue(0.20).setNumberFormat("0%");
  s.getRange("C10").setFormula("=B3*B10");
  s.getRange("D10").setFormula('=SUMIF(Expenses!C:C,"Savings",Expenses!E:E)');
  s.getRange("E10").setFormula("=C10-D10");
  s.getRange("F10").setFormula('=IF(D10>C10,"Over",IF(D10>=C10*0.8,"At Limit","On Track"))');
  s.getRange("C10:E10").setNumberFormat("$#,##0.00");
  s.getRange("A10:F10").setBackground("#EDF5ED");

  // Row 11: Total
  s.getRange("A11").setValue("TOTAL").setFontWeight("bold");
  s.getRange("C11").setFormula("=SUM(C8:C10)").setFontWeight("bold");
  s.getRange("D11").setFormula("=SUM(D8:D10)").setFontWeight("bold");
  s.getRange("E11").setFormula("=SUM(E8:E10)").setFontWeight("bold");
  s.getRange("F11").setFormula('=D11/B3&" used"').setFontWeight("bold");
  s.getRange("C11:E11").setNumberFormat("$#,##0.00");
  s.getRange("A11:F11").setFontWeight("bold").setBackground("#EDF5ED");

  // Category breakdown header
  s.getRange("A13").setValue("Category Breakdown").setFontWeight("bold").setFontSize(13);

  var subHdr = [["Description","Type","Budget","Spent","Remaining","% Used"]];
  s.getRange("A14:F14").setValues(subHdr);
  styleHeaderRow(s.getRange("A14:F14"));

  // Sample categories
  var items = [
    ["Rent / Mortgage","Needs",1400,1400],
    ["Groceries","Needs",500,400],
    ["Transportation","Needs",300,110],
    ["Utilities & Phone","Needs",200,95],
    ["Insurance","Needs",100,0],
    ["Dining & Takeout","Wants",400,127],
    ["Entertainment","Wants",200,35],
    ["Shopping","Wants",300,120],
    ["Subscriptions","Wants",200,28],
    ["Hobbies & Fun","Wants",400,0],
    ["Emergency Fund","Savings",500,500],
    ["Investments","Savings",300,400],
    ["Savings Goal","Savings",200,100]
  ];

  for (var j = 0; j < items.length; j++) {
    var rr = 15 + j;
    var bg = items[j][1] === "Wants" ? "#FDF0E6" : "#EDF5ED";
    s.getRange(rr, 1).setValue(items[j][0]).setFontWeight("bold");
    s.getRange(rr, 2).setValue(items[j][1]);
    s.getRange(rr, 3).setValue(items[j][2]).setNumberFormat("$#,##0.00");
    s.getRange(rr, 4).setValue(items[j][3]).setNumberFormat("$#,##0.00");
    s.getRange(rr, 5).setFormula("=C" + rr + "-D" + rr).setNumberFormat("$#,##0.00");
    s.getRange(rr, 6).setFormula("=IF(C" + rr + ">0,D" + rr + "/C" + rr + ",0)").setNumberFormat("0%");
    s.getRange(rr, 1, 1, 6).setBackground(bg);
  }

  var lr = items.length + 14;
  s.getRange("A" + (lr + 1)).setValue("TOTAL").setFontWeight("bold");
  s.getRange("C" + (lr + 1)).setFormula("=SUM(C15:C" + lr + ")").setFontWeight("bold").setNumberFormat("$#,##0.00");
  s.getRange("D" + (lr + 1)).setFormula("=SUM(D15:D" + lr + ")").setFontWeight("bold").setNumberFormat("$#,##0.00");
  s.getRange("A" + (lr + 1) + ":F" + (lr + 1)).setBackground("#EDF5ED");

  s.setFrozenRows(7);

  s.getRange("A" + (lr + 3)).setValue("Made with love by L'Atelier de Luz  ·  Sage Green Edition  ·  2026");
  s.getRange("A" + (lr + 3) + ":F" + (lr + 3)).merge();
  s.getRange("A" + (lr + 3)).setFontSize(9).setFontColor("#6F746D").setHorizontalAlignment("center");
}

function buildYearlySheet(ss) {
  var s = ss.insertSheet("Yearly", 1);
  s.setColumnWidth(1, 120);
  s.setColumnWidth(2, 100);
  s.setColumnWidth(3, 100);
  s.setColumnWidth(4, 100);
  s.setColumnWidth(5, 100);
  s.setColumnWidth(6, 110);
  s.setColumnWidth(7, 110);
  s.setColumnWidth(8, 110);

  var hdr = [["Month","Income","Needs","Wants","Savings","Total Spent","Remaining","Savings Rate"]];
  s.getRange("A1:H1").setValues(hdr);
  styleHeaderRow(s.getRange("A1:H1"));

  var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  for (var i = 0; i < 12; i++) {
    var r = i + 2;
    var m = i + 1;
    s.getRange(r, 1).setValue(months[i]).setFontWeight("bold");
    s.getRange(r, 2).setFormula("=Dashboard!B3").setNumberFormat("$#,##0.00");
    s.getRange(r, 3).setFormula('=SUMIFS(Expenses!E:E,Expenses!C:C,"Needs",Expenses!A:A,">="&DATE(2026,' + m + ',1),Expenses!A:A,"<="&EOMONTH(DATE(2026,' + m + ',1),0))').setNumberFormat("$#,##0.00");
    s.getRange(r, 4).setFormula('=SUMIFS(Expenses!E:E,Expenses!C:C,"Wants",Expenses!A:A,">="&DATE(2026,' + m + ',1),Expenses!A:A,"<="&EOMONTH(DATE(2026,' + m + ',1),0))').setNumberFormat("$#,##0.00");
    s.getRange(r, 5).setFormula('=SUMIFS(Expenses!E:E,Expenses!C:C,"Savings",Expenses!A:A,">="&DATE(2026,' + m + ',1),Expenses!A:A,"<="&EOMONTH(DATE(2026,' + m + ',1),0))').setNumberFormat("$#,##0.00");
    s.getRange(r, 6).setFormula("=SUM(C" + r + ":E" + r + ")").setNumberFormat("$#,##0.00");
    s.getRange(r, 7).setFormula("=B" + r + "-F" + r).setNumberFormat("$#,##0.00");
    s.getRange(r, 8).setFormula("=IF(B" + r + ">0,G" + r + "/B" + r + ",0)").setNumberFormat("0%");
  }

  s.getRange("A14").setValue("TOTAL").setFontWeight("bold");
  s.getRange("A14:H14").setFontWeight("bold").setBackground("#EDF5ED");
  var cols = ["B","C","D","E","F","G","H"];
  for (var j = 0; j < cols.length; j++) {
    var cl = cols[j];
    var fmt = cl === "H" ? "0%" : "$#,##0.00";
    s.getRange(cl + "14").setFormula("=SUM(" + cl + "2:" + cl + "13)").setNumberFormat(fmt);
  }
  s.setFrozenRows(1);
}

function buildExpensesSheet(ss) {
  var s = ss.insertSheet("Expenses", 2);
  s.setColumnWidth(1, 110);
  s.setColumnWidth(2, 200);
  s.setColumnWidth(3, 90);
  s.setColumnWidth(4, 130);
  s.setColumnWidth(5, 100);

  var hdr = [["Date","Description","Category","Sub-Category","Amount"]];
  s.getRange("A1:E1").setValues(hdr);
  styleHeaderRow(s.getRange("A1:E1"));

  var data = [
    ["2026-06-01","Rent / Mortgage","Needs","Housing",1400],
    ["2026-06-03","Grocery Store","Needs","Groceries",400],
    ["2026-06-05","Gas Station","Needs","Transportation",110],
    ["2026-06-07","Electric Bill","Needs","Utilities",95],
    ["2026-06-10","Weekend Dining","Wants","Dining",127],
    ["2026-06-12","Netflix / Spotify","Wants","Subscriptions",28],
    ["2026-06-14","New Shoes","Wants","Shopping",120],
    ["2026-06-16","Movie Night","Wants","Entertainment",35],
    ["2026-06-20","Emergency Fund","Savings","Emergency",500],
    ["2026-06-22","Index Fund Buy","Savings","Investments",400],
    ["2026-06-25","Vacation Fund","Savings","Goal",100]
  ];

  for (var i = 0; i < data.length; i++) {
    var r = i + 2;
    var bg = data[i][2] === "Wants" ? "#FDF0E6" : "#EDF5ED";
    s.getRange(r, 1).setValue(data[i][0]);
    s.getRange(r, 2).setValue(data[i][1]);
    s.getRange(r, 3).setValue(data[i][2]);
    s.getRange(r, 4).setValue(data[i][3]);
    s.getRange(r, 5).setValue(data[i][4]).setNumberFormat("$#,##0.00");
    s.getRange(r, 1, 1, 5).setBackground(bg);
  }

  s.setFrozenRows(1);
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(["Needs","Wants","Savings"],true).build();
  s.getRange("C2:C1000").setDataValidation(rule);
}

function buildGoalsSheet(ss) {
  var s = ss.insertSheet("Goals", 3);
  s.setColumnWidth(1, 200);
  s.setColumnWidth(2, 110);
  s.setColumnWidth(3, 110);
  s.setColumnWidth(4, 110);
  s.setColumnWidth(5, 90);
  s.setColumnWidth(6, 130);

  var hdr = [["Goal","Target","Saved","Remaining","Progress","Est. Complete"]];
  s.getRange("A1:F1").setValues(hdr);
  styleHeaderRow(s.getRange("A1:F1"));

  var goals = [
    ["Emergency Fund",15000,8400],
    ["Vacation Trip",5000,2300],
    ["New Car",20000,5000]
  ];

  for (var i = 0; i < goals.length; i++) {
    var r = i + 2;
    s.getRange(r, 1).setValue(goals[i][0]).setFontWeight("bold");
    s.getRange(r, 2).setValue(goals[i][1]).setNumberFormat("$#,##0.00");
    s.getRange(r, 3).setValue(goals[i][2]).setNumberFormat("$#,##0.00");
    s.getRange(r, 4).setFormula("=B" + r + "-C" + r).setNumberFormat("$#,##0.00");
    s.getRange(r, 5).setFormula("=IF(B" + r + ">0,C" + r + "/B" + r + ",0)").setNumberFormat("0%");
    s.getRange(r, 6).setFormula('=IF(AND(C' + r + '>0,B' + r + '>C' + r + '),TODAY()+ROUNDUP((D' + r + '/500)*30,0),"Complete!")');
    s.getRange(r, 1, 1, 6).setBackground("#EDF5ED");
  }

  s.setFrozenRows(1);
}

function buildSetupSheet(ss) {
  var s = ss.insertSheet("Setup", 4);
  s.setColumnWidth(1, 320);
  s.setColumnWidth(2, 200);
  s.setColumnWidth(3, 200);
  s.setColumnWidth(4, 200);

  s.getRange("A1").setValue("Setup Guide — Budget Tracker Template").setFontWeight("bold").setFontSize(14).setFontColor("#6C9A8B");

  s.getRange("A3").setValue("Getting Started").setFontWeight("bold").setFontSize(12).setFontColor("#4E6F62");
  var steps = [
    "1. Enter your Monthly Income on the Dashboard tab (cell B3)",
    "2. Add expenses on the Expenses tab or import from the PWA app",
    "3. Dashboard auto-calculates everything — budgets, spent, remaining, status",
    "4. Set savings goals on the Goals tab",
    "5. Use the Yearly tab to track month-over-month progress"
  ];
  for (var i = 0; i < steps.length; i++) {
    s.getRange(5 + i, 1).setValue(steps[i]).setFontSize(11);
  }

  s.getRange("A12").setValue("Import from the PWA App").setFontWeight("bold").setFontSize(12).setFontColor("#4E6F62");
  var imp = [
    "1. Open Budget Tracker PWA → Settings → Export CSV",
    "2. Open the downloaded file → Select all (Ctrl+A) → Copy (Ctrl+C)",
    "3. Go to the Expenses tab → Click cell A2 → Paste (Ctrl+V)",
    "4. Dashboard + Yearly tabs update automatically!"
  ];
  for (var j = 0; j < imp.length; j++) {
    s.getRange(14 + j, 1).setValue(imp[j]).setFontSize(11);
  }

  s.getRange("A20").setValue("Custom Ratio Support").setFontWeight("bold").setFontSize(12).setFontColor("#4E6F62");
  var phdr = [["Preset","Needs","Wants","Savings"]];
  s.getRange("A22:D22").setValues(phdr);
  s.getRange("A22:D22").setFontWeight("bold").setBackground("#6C9A8B").setFontColor("#FFFFFF");
  var presets = [
    ["Classic 50/30/20","50%","30%","20%"],
    ["High Cost of Living (60/20/20)","60%","20%","20%"],
    ["Aggressive Wealth Growth (40/20/40)","40%","20%","40%"],
    ["Debt Elimination Focus (50/20/30)","50%","20%","30%"],
    ["Custom","any %","any %","any %"]
  ];
  for (var k = 0; k < presets.length; k++) {
    s.getRange(23 + k, 1, 1, 4).setValues([presets[k]]).setFontSize(11);
    s.getRange(23 + k, 1, 1, 4).setBackground(k === 0 ? "#EDF5ED" : "#FFFDF8");
  }
  s.getRange("A29").setValue("To switch: change Dashboard cells B8-B10. Must total 100%.").setFontSize(10).setFontColor("#6F746D");

  s.getRange("A32").setValue("Color Palette").setFontWeight("bold").setFontSize(12).setFontColor("#4E6F62");
  var chdr = [["Color","Hex Code"]];
  s.getRange("A34:B34").setValues(chdr);
  s.getRange("A34:B34").setFontWeight("bold").setBackground("#6C9A8B").setFontColor("#FFFFFF");
  var colors = [
    ["Background","#F7F4EE"],["Card / Sheet","#FFFDF8"],
    ["Headers","#6C9A8B"],["Text Dark","#4E6F62"],
    ["Green Tint","#EDF5ED"],["Amber Tint","#FDF0E6"],["Red Tint","#FDEAEA"]
  ];
  for (var c = 0; c < colors.length; c++) {
    s.getRange(35 + c, 1).setValue(colors[c][0]).setFontSize(11);
    s.getRange(35 + c, 2).setValue(colors[c][1]).setFontSize(11);
  }
  s.getRange("A44").setValue("L'Atelier de Luz  ·  Budget Tracker  ·  Sage Green Edition  ·  2026").setFontSize(9).setFontColor("#6F746D");
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Budget Tracker")
    .addItem("Build Full Template", "buildTemplate")
    .addItem("About", "showAbout")
    .addToUi();
}

function showAbout() {
  SpreadsheetApp.getUi().alert("Budget Tracker Template v2.0 — L'Atelier de Luz\n5 tabs · Auto-calculating · Custom-ratio ready");
}
