/**
 * ============================================================
 *  GOOGLE APPS SCRIPT — Budget Tracker Backend
 *  Newsletter + Contact Form + Telemetry
 * ============================================================
 *
 *  Receives data from your Budget Tracker PWA and saves it
 *  to a Google Sheet. FREE. No server needed.
 *
 *  WHAT IT HANDLES:
 *  - Newsletter signups (with client ID + user name)
 *  - Contact/feedback messages (with client ID + user name)
 *  - Telemetry events (reactions, comments, save-to-journal)
 *
 *  SETUP (5 minutes):
 *
 *  1. Go to https://sheets.google.com → create a NEW blank sheet
 *  2. Name it "Budget Tracker Backend"
 *  3. Go to Extensions → Apps Script
 *  4. Delete any existing code
 *  5. Paste this ENTIRE script
 *  6. Click "Deploy" → "New deployment"
 *  7. Settings:
 *     - Type: "Web app"
 *     - Execute as: "Me"
 *     - Who has access: "Anyone"
 *  8. Click "Deploy" → Authorize when prompted
 *  9. Copy the Web App URL
 *     (looks like: https://script.google.com/macros/s/XXXX/exec)
 *  10. Paste that URL into your index.html for ALL THREE:
 *      const NEWSLETTER_URL = "https://script.google.com/...";
 *      const CONTACT_URL    = "https://script.google.com/...";
 *      const TELEMETRY_URL  = "https://script.google.com/...";
 *      (All three can be the SAME URL — routing is automatic)
 *
 *  The script auto-creates 5 tabs in your sheet:
 *  - Newsletter (subscribers)
 *  - Contacts (feedback/bugs)
 *  - Telemetry (reactions, comments, journal saves)
 *  - Comments (article comment text)
 *  - Users (client profiles with name history)
 *
 *  DONE! All data flows into your Google Sheet automatically.
 *
 * ============================================================
 */

// ─── REQUEST ROUTER ────────────────────────────────────────

// SECRET - Match API_SECRET in index.html
var APP_SECRET = "8XAlI2W_m6TXAc6tNrxr3xwBKUhUBdxP";

function doPost(e) {
  // Validate shared secret token
  if (e.parameter.secret !== APP_SECRET) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "denied", message: "Invalid secret" })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === "newsletter") {
      handleNewsletter(ss, data);
    } else if (data.type === "contact") {
      handleContact(ss, data);
    } else if (data.type === "telemetry") {
      handleTelemetry(ss, data);
    } else if (data.type === "user_profile") {
      handleUserProfile(ss, data);
    } else if (data.type === "export_data") {
      return handleExportData(data);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ status: "ok" })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "ok",
      message: "Budget Tracker Backend is running!",
      version: "2.0",
      tabs: ["Newsletter", "Contacts", "Telemetry", "Comments", "Users", "PWA Export"],
      timestamp: new Date().toISOString()
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ─── NEWSLETTER ────────────────────────────────────────────

function handleNewsletter(ss, data) {
  var sheet = ss.getSheetByName("Newsletter");
  if (!sheet) {
    sheet = ss.insertSheet("Newsletter");
    sheet.getRange("A1:E1").setValues([["Timestamp", "Email", "Source", "Client ID", "User Name"]]);
    sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#6C9A8B").setFontColor("#FFFFFF");
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 250);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 280);
    sheet.setColumnWidth(5, 120);
    sheet.setFrozenRows(1);
  }
  var emails = sheet.getRange("B:B").getValues().flat().map(function(e) { return String(e).toLowerCase(); });
  if (emails.includes(data.email.toLowerCase())) return;
  sheet.appendRow([
    new Date().toLocaleString(),
    data.email,
    data.source || "PWA App",
    data.clientId || "",
    data.userName || ""
  ]);
  updateUserEmail(ss, data.clientId, data.email);
}

// ─── CONTACTS ──────────────────────────────────────────────

function handleContact(ss, data) {
  var sheet = ss.getSheetByName("Contacts");
  if (!sheet) {
    sheet = ss.insertSheet("Contacts");
    sheet.getRange("A1:H1").setValues([["Timestamp", "Name", "Email", "Type", "Message", "Status", "Client ID", "User Name"]]);
    sheet.getRange("A1:H1").setFontWeight("bold").setBackground("#6C9A8B").setFontColor("#FFFFFF");
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 140);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 100);
    sheet.setColumnWidth(5, 400);
    sheet.setColumnWidth(6, 80);
    sheet.setColumnWidth(7, 280);
    sheet.setColumnWidth(8, 120);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    new Date().toLocaleString(),
    data.name || "(anonymous)",
    data.email || "(no email)",
    data.msgType || "other",
    data.message || "",
    "New",
    data.clientId || "",
    data.userName || ""
  ]);
  var lastRow = sheet.getLastRow();
  var colors = { feedback: "#E8F0ED", bug: "#FDEAEA", question: "#FDF0E6", testimonial: "#EAF7EA", other: "#F8F9FA" };
  sheet.getRange(lastRow, 1, 1, 8).setBackground(colors[data.msgType] || "#F8F9FA");
}

// ─── TELEMETRY ─────────────────────────────────────────────

function handleTelemetry(ss, data) {
  var sheet = ss.getSheetByName("Telemetry");
  if (!sheet) {
    sheet = ss.insertSheet("Telemetry");
    sheet.getRange("A1:G1").setValues([["Timestamp", "Client ID", "User Name", "Event", "Article", "Detail", "Raw Data"]]);
    sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#5B8FB9").setFontColor("#FFFFFF");
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 280);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 130);
    sheet.setColumnWidth(5, 250);
    sheet.setColumnWidth(6, 200);
    sheet.setColumnWidth(7, 350);
    sheet.setFrozenRows(1);
  }

  var eventData = data.data || {};
  var detail = "";

  if (data.event === "reaction") {
    detail = eventData.reaction || "removed";
  } else if (data.event === "comment") {
    detail = "Length: " + (eventData.commentLength || 0) + (eventData.isEdit ? " (edited)" : "");
    saveCommentToSheet(ss, data, eventData);
  } else if (data.event === "save_to_journal") {
    detail = "Type: " + (eventData.articleType || "");
  } else {
    detail = JSON.stringify(eventData).substring(0, 200);
  }

  sheet.appendRow([
    new Date().toLocaleString(),
    data.clientId || "",
    data.userName || "",
    data.event || "",
    eventData.articleTitle || "",
    detail,
    JSON.stringify(eventData)
  ]);

  var lastRow = sheet.getLastRow();
  var colors = { reaction: "#E8F0ED", comment: "#FDF0E6", save_to_journal: "#EAF7EA" };
  sheet.getRange(lastRow, 1, 1, 7).setBackground(colors[data.event] || "#F8F9FA");
}

// ─── COMMENTS ──────────────────────────────────────────────

function saveCommentToSheet(ss, data, eventData) {
  var sheet = ss.getSheetByName("Comments");
  if (!sheet) {
    sheet = ss.insertSheet("Comments");
    sheet.getRange("A1:F1").setValues([["Timestamp", "Client ID", "User Name", "Article", "Comment", "Status"]]);
    sheet.getRange("A1:F1").setFontWeight("bold").setBackground("#D4A0A0").setFontColor("#FFFFFF");
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 280);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 250);
    sheet.setColumnWidth(5, 450);
    sheet.setColumnWidth(6, 80);
    sheet.setFrozenRows(1);
  }
  var clientId = data.clientId || "";
  var articleTitle = eventData.articleTitle || "";
  var commentText = eventData.commentText || "";
  var isEdit = eventData.isEdit || false;
  if (isEdit && clientId) {
    var allData = sheet.getDataRange().getValues();
    for (var i = 1; i < allData.length; i++) {
      if (String(allData[i][1]) === clientId && String(allData[i][3]) === articleTitle) {
        var row = i + 1;
        sheet.getRange(row, 1).setValue(new Date().toLocaleString());
        sheet.getRange(row, 3).setValue(data.userName || "");
        sheet.getRange(row, 5).setValue(commentText);
        sheet.getRange(row, 6).setValue("Edited");
        return;
      }
    }
  }
  sheet.appendRow([new Date().toLocaleString(), clientId, data.userName || "", articleTitle, commentText, "New"]);
}

// ─── USER PROFILE ──────────────────────────────────────────

function handleUserProfile(ss, data) {
  var sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.getRange("A1:G1").setValues([["Client ID", "Current Name", "Email", "First Seen", "Last Active", "Name History", "Notes"]]);
    sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#9B89B3").setFontColor("#FFFFFF");
    sheet.setColumnWidth(1, 280);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 160);
    sheet.setColumnWidth(5, 160);
    sheet.setColumnWidth(6, 350);
    sheet.setColumnWidth(7, 300);
    sheet.setFrozenRows(1);
  }
  var clientId = data.clientId || "";
  var newName = data.userName || "";
  var oldName = data.oldName || "";
  var now = new Date().toLocaleString();
  var dateShort = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  var clientIds = sheet.getRange("A:A").getValues().flat();
  var rowIndex = -1;
  for (var i = 1; i < clientIds.length; i++) {
    if (String(clientIds[i]) === clientId) { rowIndex = i + 1; break; }
  }
  if (rowIndex > 0) {
    var currentRow = sheet.getRange(rowIndex, 1, 1, 7).getValues()[0];
    var prevName = currentRow[1] || "";
    var nameHistory = currentRow[5] || "";
    sheet.getRange(rowIndex, 2).setValue(newName);
    sheet.getRange(rowIndex, 5).setValue(now);
    if (oldName && oldName !== newName) {
      var changeEntry = "Changed from \"" + oldName + "\" to \"" + newName + "\" (" + dateShort + ")";
      nameHistory = nameHistory ? nameHistory + " | " + changeEntry : changeEntry;
      sheet.getRange(rowIndex, 6).setValue(nameHistory);
    }
  } else {
    var nameHistory = newName ? "Set name: \"" + newName + "\" (" + dateShort + ")" : "";
    sheet.appendRow([clientId, newName, "", now, now, nameHistory, ""]);
  }
}

function updateUserEmail(ss, clientId, email) {
  if (!clientId) return;
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return;
  var clientIds = sheet.getRange("A:A").getValues().flat();
  for (var i = 1; i < clientIds.length; i++) {
    if (String(clientIds[i]) === clientId) {
      var row = i + 1;
      var currentEmail = sheet.getRange(row, 3).getValue();
      if (!currentEmail) sheet.getRange(row, 3).setValue(email);
      sheet.getRange(row, 5).setValue(new Date().toLocaleString());
      break;
    }
  }
}

// ─── PWA EXPORT DATA ─────────────────────────────────────
// Creates a dedicated "PWA Export" tab with the user's full budget data

function handleExportData(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabName = "PWA Export " + new Date().toLocaleDateString();
  
  // Remove old export tab if it exists (keep only latest)
  var old = ss.getSheetByName(tabName);
  if (old) ss.deleteSheet(old);
  
  var sheet = ss.insertSheet(tabName);
  var pd = data.payload || {};
  var br = pd.budgetRatios || {needs:50,wants:30,savings:20};
  var income = pd.income || 0;
  var needsB = income * br.needs / 100;
  var wantsB = income * br.wants / 100;
  var savingsB = income * br.savings / 100;
  var needsS = (pd.expenses||[]).filter(function(e){return e.cat==="Needs";}).reduce(function(s,e){return s+e.amt;},0);
  var wantsS = (pd.expenses||[]).filter(function(e){return e.cat==="Wants";}).reduce(function(s,e){return s+e.amt;},0);
  var savingsS = (pd.expenses||[]).filter(function(e){return e.cat==="Savings";}).reduce(function(s,e){return s+e.amt;},0);
  var totalS = needsS + wantsS + savingsS;
  
  // Column widths
  sheet.setColumnWidth(1, 220); sheet.setColumnWidth(2, 120); sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 120); sheet.setColumnWidth(5, 120); sheet.setColumnWidth(6, 150);
  
  // Header
  sheet.getRange("A1").setValue("Budget Tracker - PWA Export").setFontWeight("bold").setFontSize(14).setFontColor("#6C9A8B");
  sheet.getRange("A2").setValue("Date: " + new Date().toLocaleDateString()).setFontSize(10).setFontColor("#6F746D");
  sheet.getRange("A3").setValue("---");
  
  // Income
  sheet.getRange("A5").setValue("Monthly Income").setFontWeight("bold");
  sheet.getRange("B5").setValue(income).setNumberFormat("$#,##0.00");
  
  // Budget Summary
  sheet.getRange("A7").setValue("Budget Summary");
  sheet.getRange("A7").setFontWeight("bold").setFontSize(12).setFontColor("#4E6F62");
  var hdr = [["Category","Budget","Spent","Remaining","% Used","Status"]];
  sheet.getRange("A8:F8").setValues(hdr);
  sheet.getRange("A8:F8").setFontWeight("bold").setBackground("#6C9A8B").setFontColor("#FFFFFF");
  
  var rows = [
    ["Needs ("+br.needs+"%)", needsB, needsS, needsB-needsS, needsB>0?Math.round(needsS/needsB*100)+"%":"0%", needsS>needsB?"Over":"On Track"],
    ["Wants ("+br.wants+"%)", wantsB, wantsS, wantsB-wantsS, wantsB>0?Math.round(wantsS/wantsB*100)+"%":"0%", wantsS>wantsB?"Over":"On Track"],
    ["Savings ("+br.savings+"%)", savingsB, savingsS, savingsB-savingsS, savingsB>0?Math.round(savingsS/savingsB*100)+"%":"0%", savingsS>savingsB?"Over":"On Track"],
    ["TOTAL", income, totalS, income-totalS, income>0?Math.round(totalS/income*100)+"% used":"",""]
  ];
  for (var r=0;r<rows.length;r++) {
    sheet.getRange(9+r,1,1,6).setValues([rows[r]]);
    sheet.getRange(9+r,2,1,4).setNumberFormat("$#,##0.00");
  }
  
  // Expenses
  var expHdr = [["Date","Description","Category","Sub-Category","Amount"]];
  sheet.getRange("A14:E14").setValues(expHdr);
  sheet.getRange("A14:E14").setFontWeight("bold").setBackground("#6C9A8B").setFontColor("#FFFFFF");
  (pd.expenses||[]).forEach(function(e, i){
    sheet.getRange(15+i,1).setValue(e.date);
    sheet.getRange(15+i,2).setValue(e.desc);
    sheet.getRange(15+i,3).setValue(e.cat);
    sheet.getRange(15+i,4).setValue(e.sub||"");
    sheet.getRange(15+i,5).setValue(e.amt).setNumberFormat("$#,##0.00");
  });
  
  // Goals section (if any exist)
  var goals = pd.goals || [];
  if (goals.length > 0) {
    var gStart = 16 + (pd.expenses||[]).length;
    sheet.getRange("A"+gStart+":A"+gStart).setValue("Savings Goals");
    sheet.getRange("A"+gStart).setFontWeight("bold").setFontSize(12).setFontColor("#4E6F62");
    var gHdr = [["Goal","Target","Saved","Remaining","Progress"]];
    sheet.getRange("A"+(gStart+1)+":E"+(gStart+1)).setValues(gHdr);
    sheet.getRange("A"+(gStart+1)+":E"+(gStart+1)).setFontWeight("bold").setBackground("#6C9A8B").setFontColor("#FFFFFF");
    goals.forEach(function(g, i){
      sheet.getRange(gStart+2+i,1).setValue(g.name);
      sheet.getRange(gStart+2+i,2).setValue(g.target).setNumberFormat("$#,##0.00");
      sheet.getRange(gStart+2+i,3).setValue(g.saved||0).setNumberFormat("$#,##0.00");
      sheet.getRange(gStart+2+i,4).setValue((g.target||0)-(g.saved||0)).setNumberFormat("$#,##0.00");
      sheet.getRange(gStart+2+i,5).setValue(Math.round((g.saved||0)/(g.target||1)*100)+"%");
    });
  }
  
  return ContentService.createTextOutput(
    JSON.stringify({status:"ok",tab:tabName,expenses:(pd.expenses||[]).length,goals:goals.length})
  ).setMimeType(ContentService.MimeType.JSON);
}

// ─── TEST FUNCTION ─────────────────────────────────────────

function testScript() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  handleNewsletter(ss, { email: "test@example.com", source: "Test", clientId: "bt_test-uuid-1234", userName: "Test User" });
  handleContact(ss, { name: "Test User", email: "test@example.com", msgType: "feedback", message: "Testing!", clientId: "bt_test-uuid-1234", userName: "Test User" });
  handleTelemetry(ss, { clientId: "bt_test-uuid-1234", userName: "Test User", event: "reaction", data: { articleId: 1, articleTitle: "Test", reaction: "helpful" } });
  handleTelemetry(ss, { clientId: "bt_test-uuid-1234", userName: "Test User", event: "comment", data: { articleId: 1, articleTitle: "Test", commentLength: 42, isEdit: false, commentText: "Test comment" } });
  handleUserProfile(ss, { clientId: "bt_test-uuid-1234", userName: "Mat", oldName: "" });
  handleUserProfile(ss, { clientId: "bt_test-uuid-1234", userName: "Mathew", oldName: "Mat" });
  SpreadsheetApp.getUi().alert("All 5 tabs tested OK");
}
