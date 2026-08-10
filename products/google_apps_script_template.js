/**
 * GOOGLE APPS SCRIPT — Budget Tracker Template Builder v3
 * Aura-styled + Charts + Interactive + Conditional Formatting
 *
 * BEFORE RUNNING:
 * 1. Extensions → Apps Script
 * 2. Make sure "Enable Chrome V8 runtime" is checked (Settings)
 * 3. Paste this entire script
 * 4. Save (Ctrl+S) → Select "buildTemplate" → Run → Authorize
 */

function buildTemplate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.insertSheet("_tmp");
  var sheets = ss.getSheets();
  for (var i = sheets.length - 1; i >= 0; i--) {
    if (sheets[i].getName() !== "_tmp") ss.deleteSheet(sheets[i]);
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
  SpreadsheetApp.getUi().alert(
    "Template built!\n\n5 tabs + Charts + Sparklines + Data Bars + Conditional Formatting\n\n" +
    "Features:\n" +
    "• Dashboard: Donut chart, ratio dropdown, data bars\n" +
    "• Yearly: Column chart, monthly sparklines\n" +
    "• Goals: Progress bars, color-coded status\n\n" +
    "Ready for Etsy!"
  );
}

function styleHeader(range) {
  range.setFontWeight("bold").setFontSize(10).setFontColor("#FFFFFF")
    .setBackground("#6C9A8B").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBorder(true,true,true,true,true,true,"#4E6F62",SpreadsheetApp.BorderStyle.SOLID);
}

function styleLabel(range) {
  range.setFontWeight("bold").setFontSize(11).setFontColor("#4E6F62");
}

function styleAmount(range) {
  range.setNumberFormat("$#,##0.00").setFontWeight("bold").setFontSize(13)
    .setFontFamily("Consolas").setHorizontalAlignment("right");
}

// ════════════════════════════════════════════════════════════
// TAB 1: DASHBOARD — with Donut Chart + Ratio Dropdown
// ════════════════════════════════════════════════════════════

function buildDashboardSheet(ss) {
  var s = ss.insertSheet("Dashboard", 0);
  s.setColumnWidth(1, 220); s.setColumnWidth(2, 120); s.setColumnWidth(3, 120);
  s.setColumnWidth(4, 120); s.setColumnWidth(5, 120); s.setColumnWidth(6, 140);
  s.setColumnWidth(7, 80);  s.setColumnWidth(8, 80);  s.setColumnWidth(9, 80);
  s.setColumnWidth(10, 40); s.setColumnWidth(11, 40); s.setColumnWidth(12, 50); s.setColumnWidth(13, 50);

  // -- TITLE --
  s.getRange("A1").setValue("50/30/20 Budget Tracker")
    .setFontSize(18).setFontWeight("bold").setFontColor("#6C9A8B");
  s.getRange("A1:I1").merge();
  s.getRange("A2").setValue("Sage Green Edition • Auto-Calculating")
    .setFontSize(10).setFontColor("#6F746D");

  // -- RATIO PRESET DROPDOWN --
  s.getRange("A4").setValue("Budget Rule").setFontWeight("bold").setFontSize(11).setFontColor("#4E6F62");
  var ratioRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      "Classic 50/30/20",
      "High Cost of Living 60/20/20",
      "Aggressive Wealth Growth 40/20/40",
      "Debt Elimination 50/20/30",
      "Custom (edit below)"
    ], true).build();
  s.getRange("B4").setDataValidation(ratioRule);
  s.getRange("B4").setValue("Classic 50/30/20").setFontWeight("bold").setFontSize(12);
  s.getRange("B4").setBackground("#EDF5ED");

  // -- MONTH --
  s.getRange("D4").setValue("Month / Year").setFontWeight("bold").setFontSize(9).setFontColor("#6F746D").setHorizontalAlignment("right");
  s.getRange("E4").setFormula("=TEXT(TODAY(),\"mmmm yyyy\")").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("right");

  // -- INCOME --
  s.getRange("A6").setValue("Monthly Take-Home Income");
  styleLabel(s.getRange("A6"));
  s.getRange("B6").setValue(5000); styleAmount(s.getRange("B6"));
  s.getRange("B6").setBackground("#FFFDF8").setBorder(true,true,true,true,true,true,"#4E6F62",SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // -- CASHFLOW --
  s.getRange("A7").setValue("Cashflow Balance");
  s.getRange("A7").setFontWeight("bold").setFontSize(11).setFontColor("#4E6F62");
  s.getRange("B7").setFormula("=B6-D12");
  s.getRange("B7").setNumberFormat("$#,##0.00").setFontWeight("bold").setFontSize(16).setFontColor("#6C9A8B");
  s.getRange("A7:B7").setBackground("#EDF5ED").setBorder(true,true,true,true,true,true,null,SpreadsheetApp.BorderStyle.SOLID);

  // -- 50/30/20 TABLE --
  var hdr = [["Category","%","Budget","Spent","Remaining","Status"]];
  s.getRange("A9:F9").setValues(hdr); styleHeader(s.getRange("A9:F9"));

  // Needs (row 10)
  s.getRange("A10").setValue("Needs").setFontWeight("bold").setBackground("#EDF5ED");
  s.getRange("B10").setValue(0.50).setNumberFormat("0%").setBackground("#EDF5ED");
  s.getRange("C10").setFormula("=B6*B10");  styleAmount(s.getRange("C10"));
  s.getRange("D10").setFormula('=SUMIF(Expenses!C:C,"Needs",Expenses!E:E)'); styleAmount(s.getRange("D10"));
  s.getRange("E10").setFormula("=C10-D10"); styleAmount(s.getRange("E10"));
  s.getRange("F10").setFormula('=IF(D10>C10,"OVER by $"&TEXT(D10-C10,"#,##0"),IF(D10>=C10*0.8,"OK — "&TEXT(ROUND((C10-D10)/C10*100,0),"0")&"% left","Safe — "&TEXT(ROUND((C10-D10)/C10*100,0),"0")&"% left"))');
  s.getRange("F10").setFontWeight("bold").setFontSize(10);
  s.getRange("A10:F10").setBorder(true,true,true,true,true,true,null,SpreadsheetApp.BorderStyle.SOLID);

  // Wants (row 11)
  s.getRange("A11").setValue("Wants").setFontWeight("bold").setBackground("#FDF0E6");
  s.getRange("B11").setValue(0.30).setNumberFormat("0%").setBackground("#FDF0E6");
  s.getRange("C11").setFormula("=B6*B11"); styleAmount(s.getRange("C11"));
  s.getRange("D11").setFormula('=SUMIF(Expenses!C:C,"Wants",Expenses!E:E)'); styleAmount(s.getRange("D11"));
  s.getRange("E11").setFormula("=C11-D11"); styleAmount(s.getRange("E11"));
  s.getRange("F11").setFormula('=IF(D11>C11,"OVER by $"&TEXT(D11-C11,"#,##0"),IF(D11>=C11*0.8,"OK — "&TEXT(ROUND((C11-D11)/C11*100,0),"0")&"% left","Safe — "&TEXT(ROUND((C11-D11)/C11*100,0),"0")&"% left"))');
  s.getRange("F11").setFontWeight("bold").setFontSize(10);
  s.getRange("A11:F11").setBorder(true,true,true,true,true,true,null,SpreadsheetApp.BorderStyle.SOLID);

  // Savings (row 12)
  s.getRange("A12").setValue("Savings").setFontWeight("bold").setBackground("#EDF5ED");
  s.getRange("B12").setValue(0.20).setNumberFormat("0%").setBackground("#EDF5ED");
  s.getRange("C12").setFormula("=B6*B12"); styleAmount(s.getRange("C12"));
  s.getRange("D12").setFormula('=SUMIF(Expenses!C:C,"Savings",Expenses!E:E)'); styleAmount(s.getRange("D12"));
  s.getRange("E12").setFormula("=C12-D12"); styleAmount(s.getRange("E12"));
  s.getRange("F12").setFormula('=IF(D12>C12,"OVER by $"&TEXT(D12-C12,"#,##0"),IF(D12>=C12*0.8,"OK — "&TEXT(ROUND((C12-D12)/C12*100,0),"0")&"% left","Safe — "&TEXT(ROUND((C12-D12)/C12*100,0),"0")&"% left"))');
  s.getRange("F12").setFontWeight("bold").setFontSize(10);
  s.getRange("A12:F12").setBorder(true,true,true,true,true,true,null,SpreadsheetApp.BorderStyle.SOLID);

  // Total row
  s.getRange("A13").setValue("TOTAL").setFontWeight("bold").setBackground("#EDF5ED");
  s.getRange("C13").setFormula("=SUM(C10:C12)").setFontWeight("bold"); styleAmount(s.getRange("C13"));
  s.getRange("D13").setFormula("=SUM(D10:D12)").setFontWeight("bold"); styleAmount(s.getRange("D13"));
  s.getRange("E13").setFormula("=SUM(E10:E12)").setFontWeight("bold"); styleAmount(s.getRange("E13"));
  s.getRange("F13").setFormula('="Total spent: $"&TEXT(D13,"#,##0")&" ("&TEXT(ROUND(D13/B6*100,0),"0")&"%)"');
  s.getRange("A13:F13").setFontWeight("bold").setBorder(true,true,true,true,true,true,null,SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // CONDITIONAL FORMATTING — red for overspent
  var overRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$D10>$C10')
    .setBackground("#FDEAEA").setFontColor("#B86A62")
    .setRanges([s.getRange("A10:F12")])
    .build();
  s.setConditionalFormatRules([overRule]);

  // -- DONUT CHART DATA (hidden at H1:J4) --
  s.getRange("L1").setValue("Category");
  s.getRange("M1").setValue("Amount");
  s.getRange("L2").setValue("Needs");   s.getRange("M2").setFormula("=D10");
  s.getRange("L3").setValue("Wants");   s.getRange("M3").setFormula("=D11");
  s.getRange("L4").setValue("Savings"); s.getRange("M4").setFormula("=D12");
  s.getRange("L1:M4").setFontColor("#6F746D"); // dim the helper data

  // Insert donut chart
  var chartData = s.getRange("L1:M4");
  var chart = s.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(chartData)
    .setPosition(35, 1, 0, 0) // row 8, col 1
    .setOption("title", "Spending Distribution")
    .setOption("titleTextStyle", {color: "#4E6F62", fontSize: 12, bold: true})
    .setOption("pieHole", 0.5)
    .setOption("colors", ["#7E9A8E", "#B9926B", "#6C9A8B"])
    .setOption("legend", {position: "right", textStyle: {fontSize: 10}})
    .setOption("chartArea", {width: "80%", height: "75%"})
    .setOption("height", 240)
    .setOption("width", 320)
    .build();
  s.insertChart(chart);

  // -- CATEGORY BREAKDOWN --
  s.getRange("A15").setValue("Category Breakdown").setFontWeight("bold").setFontSize(13).setFontColor("#20231F");
  var subHdr = [["Description","Type","Budget","Spent","Remaining","% Used","Progress"]];
  s.getRange("A16:G16").setValues(subHdr); styleHeader(s.getRange("A16:G16"));

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
    var rr = 17 + j;
    var bg = items[j][1] === "Wants" ? "#FDF0E6" : "#EDF5ED";
    s.getRange(rr, 1).setValue(items[j][0]).setFontWeight("bold");
    s.getRange(rr, 2).setValue(items[j][1]).setFontSize(10).setFontColor("#6F746D");
    s.getRange(rr, 3).setValue(items[j][2]).setNumberFormat("$#,##0.00");
    s.getRange(rr, 4).setValue(items[j][3]).setNumberFormat("$#,##0.00");
    s.getRange(rr, 5).setFormula("=C" + rr + "-D" + rr).setNumberFormat("$#,##0.00");
    s.getRange(rr, 6).setFormula("=IF(C" + rr + ">0,D" + rr + "/C" + rr + ",0)").setNumberFormat("0%");
    // SPARKLINE data bar
    s.getRange(rr, 7).setFormula('=SPARKLINE(D' + rr + ',{"charttype","bar";"max",C' + rr + ';"color1",IF(D' + rr + '>C' + rr + ',"#B86A62","#6C9A8B")})');
    s.getRange(rr, 1, 1, 7).setBackground(bg);
    s.getRange("G" + rr).setVerticalAlignment("middle");
  }

  var lr = items.length + 16;
  s.getRange("A" + (lr + 1)).setValue("TOTAL").setFontWeight("bold");
  s.getRange("C" + (lr + 1)).setFormula("=SUM(C17:C" + lr + ")").setFontWeight("bold").setNumberFormat("$#,##0.00");
  s.getRange("D" + (lr + 1)).setFormula("=SUM(D17:D" + lr + ")").setFontWeight("bold").setNumberFormat("$#,##0.00");
  s.getRange("A" + (lr + 1) + ":G" + (lr + 1)).setBackground("#EDF5ED");

  s.setFrozenRows(9);
  s.getRange("A" + (lr + 3)).setValue("L'Atelier de Luz  •  Sage Green Edition  •  2026")
    .setFontSize(9).setFontColor("#6F746D").setHorizontalAlignment("center");
  s.getRange("A" + (lr + 3) + ":G" + (lr + 3)).merge();
}

// ════════════════════════════════════════════════════════════
// TAB 2: YEARLY — Column Chart + Sparklines
// ════════════════════════════════════════════════════════════

function buildYearlySheet(ss) {
  var s = ss.insertSheet("Yearly", 1);
  s.setColumnWidth(1, 120); s.setColumnWidth(2, 100); s.setColumnWidth(3, 100);
  s.setColumnWidth(4, 100); s.setColumnWidth(5, 100); s.setColumnWidth(6, 110);
  s.setColumnWidth(7, 110); s.setColumnWidth(8, 90); s.setColumnWidth(9, 200);

  var hdr = [["Month","Income","Needs","Wants","Savings","Total Spent","Remaining","Savings Rate","Trend"]];
  s.getRange("A1:I1").setValues(hdr); styleHeader(s.getRange("A1:I1"));
  s.setRowHeight(1, 32);

  var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  for (var i = 0; i < 12; i++) {
    var r = i + 2;
    var m = i + 1;
    s.getRange(r, 1).setValue(months[i]).setFontWeight("bold");
    s.getRange(r, 1).setBackground(i%2===0?"#FFFDF8":"#F7F4EE");
    s.getRange(r, 2).setFormula("=Dashboard!B6").setNumberFormat("$#,##0.00");
    s.getRange(r, 3).setFormula('=SUMIFS(Expenses!E:E,Expenses!C:C,"Needs",Expenses!A:A,">="&DATE(2026,'+m+',1),Expenses!A:A,"<="&EOMONTH(DATE(2026,'+m+',1),0))').setNumberFormat("$#,##0.00");
    s.getRange(r, 4).setFormula('=SUMIFS(Expenses!E:E,Expenses!C:C,"Wants",Expenses!A:A,">="&DATE(2026,'+m+',1),Expenses!A:A,"<="&EOMONTH(DATE(2026,'+m+',1),0))').setNumberFormat("$#,##0.00");
    s.getRange(r, 5).setFormula('=SUMIFS(Expenses!E:E,Expenses!C:C,"Savings",Expenses!A:A,">="&DATE(2026,'+m+',1),Expenses!A:A,"<="&EOMONTH(DATE(2026,'+m+',1),0))').setNumberFormat("$#,##0.00");
    s.getRange(r, 6).setFormula("=SUM(C"+r+":E"+r+")").setNumberFormat("$#,##0.00");
    s.getRange(r, 7).setFormula("=B"+r+"-F"+r).setNumberFormat("$#,##0.00").setFontWeight("bold");
    s.getRange(r, 8).setFormula("=IF(B"+r+">0,G"+r+"/B"+r+",0)").setNumberFormat("0%");
    // Sparkline trend
    s.getRange(r, 9).setFormula('=SPARKLINE(C'+r+':E'+r+',{"charttype","bar";"color1","#7E9A8E";"color2","#B9926B";"color3","#6C9A8B";"max",B'+r+'})');
  }

  // Year total row
  s.getRange("A14").setValue("TOTAL").setFontWeight("bold");
  s.getRange("A14:I14").setFontWeight("bold").setBackground("#EDF5ED");
  var cols = ["B","C","D","E","F","G","H"];
  var fmts = ["$#,##0.00","$#,##0.00","$#,##0.00","$#,##0.00","$#,##0.00","$#,##0.00","0%"];
  for (var k = 0; k < cols.length; k++) {
    s.getRange(cols[k] + "14").setFormula("=SUM(" + cols[k] + "2:" + cols[k] + "13)").setNumberFormat(fmts[k]);
  }

  // -- COLUMN CHART: Monthly spending --
  var chartData = s.getRange("A1:F13");
  var chart = s.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(chartData)
    .setPosition(16, 1, 0, 0)
    .setOption("title", "Monthly Spending Breakdown")
    .setOption("titleTextStyle", {color: "#4E6F62", fontSize: 13, bold: true})
    .setOption("colors", ["#7E9A8E", "#B9926B", "#6C9A8B"])
    .setOption("isStacked", true)
    .setOption("legend", {position: "bottom", textStyle: {fontSize: 10}})
    .setOption("height", 320)
    .setOption("width", 680)
    .setOption("chartArea", {width: "85%", height: "70%"})
    .build();
  s.insertChart(chart);

  s.setFrozenRows(1);
}

// ════════════════════════════════════════════════════════════
// TAB 3: EXPENSES — Import-friendly with subtotal groups
// ════════════════════════════════════════════════════════════

function buildExpensesSheet(ss) {
  var s = ss.insertSheet("Expenses", 2);
  s.setColumnWidth(1, 110); s.setColumnWidth(2, 210); s.setColumnWidth(3, 90);
  s.setColumnWidth(4, 140); s.setColumnWidth(5, 100);

  var hdr = [["Date","Description","Category","Sub-Category","Amount"]];
  s.getRange("A1:E1").setValues(hdr); styleHeader(s.getRange("A1:E1"));

  var data = [
    ["2026-06-01","Rent / Mortgage","Needs","Housing",1400],
    ["2026-06-03","Grocery Store","Needs","Groceries",400],
    ["2026-06-05","Gas Station","Needs","Transportation",110],
    ["2026-06-07","Electric Bill","Needs","Utilities",95],
    ["2026-06-10","Weekend Dining","Wants","Dining & Takeout",127],
    ["2026-06-12","Netflix + Spotify","Wants","Subscriptions",28],
    ["2026-06-14","New Shoes","Wants","Shopping",120],
    ["2026-06-16","Movie Night","Wants","Entertainment",35],
    ["2026-06-20","Emergency Fund Deposit","Savings","Emergency Fund",500],
    ["2026-06-22","Index Fund Purchase","Savings","Investments",400],
    ["2026-06-25","Vacation Fund","Savings","Savings Goal",100]
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

  // Data validation for category
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Needs","Wants","Savings"],true).build();
  s.getRange("C2:C2000").setDataValidation(rule);

  // Data validation for date
  var dateRule = SpreadsheetApp.newDataValidation()
    .requireDate().build();
  s.getRange("A2:A2000").setDataValidation(dateRule);
}

// ════════════════════════════════════════════════════════════
// TAB 4: GOALS — Progress Bars + Color Status
// ════════════════════════════════════════════════════════════

function buildGoalsSheet(ss) {
  var s = ss.insertSheet("Goals", 3);
  s.setColumnWidth(1, 200); s.setColumnWidth(2, 110); s.setColumnWidth(3, 110);
  s.setColumnWidth(4, 110); s.setColumnWidth(5, 100); s.setColumnWidth(6, 140);
  s.setColumnWidth(7, 200);

  var hdr = [["Goal","Target","Saved","Remaining","Progress %","Est. Complete","Progress Bar"]];
  s.getRange("A1:G1").setValues(hdr); styleHeader(s.getRange("A1:G1"));
  s.setRowHeight(1, 32);

  var goals = [
    ["Emergency Fund",15000,8400],
    ["Vacation Trip",5000,2300],
    ["New Car",20000,5000]
  ];

  for (var i = 0; i < goals.length; i++) {
    var r = i + 2;
    s.getRange(r, 1).setValue(goals[i][0]).setFontWeight("bold").setFontSize(12);
    s.getRange(r, 2).setValue(goals[i][1]).setNumberFormat("$#,##0.00");
    s.getRange(r, 3).setValue(goals[i][2]).setNumberFormat("$#,##0.00");
    s.getRange(r, 4).setFormula("=B" + r + "-C" + r).setNumberFormat("$#,##0.00").setFontWeight("bold");
    s.getRange(r, 5).setFormula("=IF(B" + r + ">0,C" + r + "/B" + r + ",0)").setNumberFormat("0%").setFontWeight("bold");
    s.getRange(r, 6).setFormula('=IF(AND(C'+r+'>0,B'+r+'>C'+r+'),TEXT(TODAY()+ROUNDUP((D'+r+'/500)*30,0),"mmm yyyy"),"Complete!")');
    // SPARKLINE progress bar
    s.getRange(r, 7).setFormula('=SPARKLINE(E'+r+',{"charttype","bar";"max",1;"color1",IF(E'+r+'>=1,"#6C9A8B",IF(E'+r+'>=0.5,"#B9926B","#7E9A8E"))})');
    s.getRange(r, 1, 1, 7).setBackground(i%2===0?"#FFFDF8":"#F7F4EE");
    s.setRowHeight(r, 42);
  }

  s.setFrozenRows(1);

  // Conditional formatting: green when complete
  var completeRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$E2>=1')
    .setBackground("#EDF5ED").setFontColor("#4E6F62").setBold(true)
    .setRanges([s.getRange("A2:G4")])
    .build();
  var sRules = s.getConditionalFormatRules();
  sRules.push(completeRule);
  s.setConditionalFormatRules(sRules);
}

// ════════════════════════════════════════════════════════════
// TAB 5: SETUP GUIDE — Interactive ratio selector
// ════════════════════════════════════════════════════════════

function buildSetupSheet(ss) {
  var s = ss.insertSheet("Setup", 4);
  s.setColumnWidth(1, 340); s.setColumnWidth(2, 200);
  s.setColumnWidth(3, 200); s.setColumnWidth(4, 200);

  s.getRange("A1").setValue("Setup Guide — Budget Tracker Template")
    .setFontWeight("bold").setFontSize(15).setFontColor("#6C9A8B");
  s.setRowHeight(1, 36);

  // Getting Started
  styleLabel(s.getRange("A3"));
  var steps = [
    "1. Enter your Monthly Income on Dashboard cell B6",
    "2. Choose a Budget Rule from the dropdown (B4) or edit the % cells (B10-B12)",
    "3. Add expenses on the Expenses tab or Import from the PWA app",
    "4. Everything auto-calculates — budgets, charts, status, progress bars",
    "5. Set savings goals on the Goals tab — progress bars track automatically",
    "6. Use Yearly tab for month-over-month trends with the column chart"
  ];
  for (var i = 0; i < steps.length; i++) {
    s.getRange(5 + i, 1).setValue(steps[i]).setFontSize(11);
  }

  // Import from PWA
  styleLabel(s.getRange("A13"));
  var imp = [
    "1. Open Budget Tracker PWA → Settings tab → Export CSV",
    "2. Open the downloaded .csv file → Select All (Ctrl+A) → Copy (Ctrl+C)",
    "3. Go to the Expenses tab → Click cell A2 → Paste (Ctrl+V)",
    "4. Dashboard donut chart + Yearly column chart + Goals progress bars update instantly!"
  ];
  for (var j = 0; j < imp.length; j++) {
    s.getRange(15 + j, 1).setValue(imp[j]).setFontSize(11);
  }

  // Ratio presets table
  styleLabel(s.getRange("A21")); s.getRange("A21").setValue("Budget Rule Presets");
  var phdr = [["Preset","Needs","Wants","Savings","Best For"]];
  s.getRange("A23:E23").setValues(phdr);
  s.getRange("A23:E23").setFontWeight("bold").setBackground("#6C9A8B").setFontColor("#FFFFFF").setFontSize(10);
  var presets = [
    ["Classic 50/30/20","50%","30%","20%","Balanced budgeting — works for most people"],
    ["High Cost of Living (60/20/20)","60%","20%","20%","Rent/mortgage takes a bigger share"],
    ["Aggressive Wealth Growth (40/20/40)","40%","20%","40%","FIRE enthusiasts & high earners"],
    ["Debt Elimination Focus (50/20/30)","50%","20%","30%","Paying down debt aggressively"],
    ["Custom (edit cells)","any %","any %","any %","Must total 100%"]
  ];
  for (var k = 0; k < presets.length; k++) {
    s.getRange(24 + k, 1, 1, 5).setValues([presets[k]]).setFontSize(10);
    s.getRange(24 + k, 1, 1, 5).setBackground(k === 0 ? "#EDF5ED" : "#FFFDF8");
  }
  s.getRange("A30").setValue("Change percentages on Dashboard cells B10-B12. Must total 100%.")
    .setFontSize(10).setFontColor("#6F746D").setFontStyle("italic");

  // Features table
  styleLabel(s.getRange("A33")); s.getRange("A33").setValue("Interactive Features");
  var fhdr = [["Feature","Tab","How It Works"]];
  s.getRange("A35:C35").setValues(fhdr);
  s.getRange("A35:C35").setFontWeight("bold").setBackground("#6C9A8B").setFontColor("#FFFFFF").setFontSize(10);
  var features = [
    ["Donut Chart","Dashboard","Auto-updates from your spending — pie hole style"],
    ["Ratio Dropdown","Dashboard","Switch between 4 presets instantly"],
    ["Data Bars","Dashboard","Each category row has a visual progress bar"],
    ["Column Chart","Yearly","Stacked monthly breakdown with color-coded categories"],
    ["Sparklines","Yearly","Mini bar charts for each month's distribution"],
    ["Progress Bars","Goals","Visual bar + percentage + estimated completion date"],
    ["Conditional Formatting","Dashboard","Rows turn red when over budget"],
    ["Data Validation","Expenses","Dropdowns for Categories — no typos"],
    ["PWA Import","Setup","Export from the free PWA → paste here → auto-updates"]
  ];
  for (var f = 0; f < features.length; f++) {
    s.getRange(36 + f, 1, 1, 3).setValues([features[f]]).setFontSize(10);
    s.getRange(36 + f, 1, 1, 3).setBackground(f%2===0?"#FFFDF8":"#F7F4EE");
  }

  // Color palette
  styleLabel(s.getRange("A47")); s.getRange("A47").setValue("Sage Green Color Palette");
  var chdr = [["Element","Hex Code","Preview"]];
  s.getRange("A49:C49").setValues(chdr);
  s.getRange("A49:C49").setFontWeight("bold").setBackground("#6C9A8B").setFontColor("#FFFFFF").setFontSize(10);
  var colors = [
    ["Background","#F7F4EE","#F7F4EE"],["Sheet","#FFFDF8","#FFFDF8"],
    ["Header","#6C9A8B","#6C9A8B"],["Text Dark","#4E6F62","#4E6F62"],
    ["Needs","#7E9A8E","#7E9A8E"],["Wants","#B9926B","#B9926B"],
    ["Savings","#6C9A8B","#6C9A8B"],["Green Tint","#EDF5ED","#EDF5ED"],
    ["Amber Tint","#FDF0E6","#FDF0E6"],["Red Alert","#FDEAEA","#FDEAEA"]
  ];
  for (var c = 0; c < colors.length; c++) {
    s.getRange(50 + c, 1).setValue(colors[c][0]).setFontSize(10);
    s.getRange(50 + c, 2).setValue(colors[c][1]).setFontSize(10).setFontFamily("Consolas");
    s.getRange(50 + c, 3).setBackground(colors[c][2]);
  }

  s.getRange("A62").setValue("L'Atelier de Luz  ·  Budget Tracker Template  ·  Sage Green Edition  ·  2026")
    .setFontSize(9).setFontColor("#6F746D").setHorizontalAlignment("center");
}

// ════════════════════════════════════════════════════════════
// MENU + HELPER
// ════════════════════════════════════════════════════════════

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Budget Tracker")
    .addItem("Build Full Template", "buildTemplate")
    .addItem("Reset to Sample Data", "buildTemplate")
    .addSeparator()
    .addItem("About This Template", "showAbout")
    .addToUi();
}

function showAbout() {
  SpreadsheetApp.getUi().alert(
    "50/30/20 Budget Tracker — Sage Green Edition v3\n\n" +
    "L'Atelier de Luz  ·  Etsy Listing  ·  $6.99\n\n" +
    "Features:\n" +
    "• Donut Chart — spending distribution\n" +
    "• Column Chart — monthly stacked breakdown\n" +
    "• Ratio Dropdown — switch presets instantly\n" +
    "• SPARKLINE Data Bars — visual progress per category\n" +
    "• Conditional Formatting — red for overspent\n" +
    "• Data Validation — dropdowns for categories\n" +
    "• PWA Import — export from free app, paste here\n\n" +
    "100% Google Sheets — no plugins, no add-ons, no macros needed.\n" +
    "Works with Google Sheets and Microsoft Excel."
  );
}

function styleLabel(range) {
  return range.setFontWeight("bold").setFontSize(12).setFontColor("#4E6F62");
}
