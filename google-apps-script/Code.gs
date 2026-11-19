// Paste into a script bound to your Google Sheet. See docs/rsvp-setup.md.
function setup() {
  const properties = PropertiesService.getScriptProperties();
  const book = SpreadsheetApp.getActiveSpreadsheet();
  properties.setProperty('SPREADSHEET_ID', book.getId());
  if (!properties.getProperty('RSVP_SHARED_SECRET')) {
    properties.setProperty('RSVP_SHARED_SECRET', Utilities.getUuid() + Utilities.getUuid());
  }
  let sheet = book.getSheetByName('RSVPs');
  if (!sheet) sheet = book.insertSheet('RSVPs');
  if (!sheet.getLastRow()) {
    sheet.appendRow(['Response ID', 'Received at', 'Full name', 'Attendance', 'Guests', 'Message', 'Email', 'Email status', 'Guest email status']);
    sheet.setFrozenRows(1);
  } else {
    let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!headers.includes('Email')) {
      const statusIndex = headers.indexOf('Email status');
      if (statusIndex >= 0) {
        sheet.insertColumnBefore(statusIndex + 1);
        sheet.getRange(1, statusIndex + 1).setValue('Email');
      } else {
        const emailColumn = sheet.getLastColumn() + 1;
        sheet.getRange(1, emailColumn).setValue('Email');
        sheet.getRange(1, emailColumn + 1).setValue('Email status');
      }
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    }
    if (!headers.includes('Guest email status')) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue('Guest email status');
    }
  }
  // Authorize mail without sending a test message.
  MailApp.getRemainingDailyQuota();
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'sendPendingNotifications')) {
    ScriptApp.newTrigger('sendPendingNotifications').timeBased().everyMinutes(5).create();
  }
}

function doPost(e) {
  const json = value => ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
  const properties = PropertiesService.getScriptProperties();
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (_) { return json({ ok: false }); }
  const secret = properties.getProperty('RSVP_SHARED_SECRET');
  if (!secret || !data || data.secret !== secret) return json({ ok: false });
  if (typeof data.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(data.id) ||
      typeof data.name !== 'string' || !data.name.trim() || data.name.length > 120 ||
      typeof data.email !== 'string' || data.email.length > 254 ||
      (data.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) ||
      !['Yes, joyfully', 'Sadly, no'].includes(data.attending) ||
      !Number.isInteger(data.guests) || data.guests < 0 || data.guests > 4 ||
      (data.attending === 'Yes, joyfully' && data.guests < 1) ||
      typeof data.note !== 'string' || data.note.length > 2000) return json({ ok: false });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json({ ok: false });
  try {
    const sheet = SpreadsheetApp.openById(properties.getProperty('SPREADSHEET_ID')).getSheetByName('RSVPs');
    const count = sheet.getLastRow();
    if (count > 1 && sheet.getRange(2, 1, count - 1, 1).createTextFinder(data.id).matchEntireCell(true).findNext()) {
      return json({ ok: true });
    }
    // Prefix formula-like input to keep guest text from executing as a formula.
    const text = value => /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
    sheet.appendRow([data.id, new Date(), text(data.name.trim()), data.attending,
      data.attending === 'Sadly, no' ? 0 : data.guests, text(data.note.trim()), text(data.email.trim()), 'Pending',
      data.email.trim() ? 'Pending' : 'Not provided']);
    SpreadsheetApp.flush();
    return json({ ok: true });
  } catch (_) {
    return json({ ok: false });
  } finally {
    lock.releaseLock();
  }
}

// A separate queue keeps a mail outage/quota limit from losing an RSVP.
function sendPendingNotifications() {
  const properties = PropertiesService.getScriptProperties();
  const recipient = properties.getProperty('NOTIFICATION_EMAIL');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const book = SpreadsheetApp.openById(properties.getProperty('SPREADSHEET_ID'));
    const sheet = book.getSheetByName('RSVPs');
    const rows = sheet.getDataRange().getValues();
    let quota = MailApp.getRemainingDailyQuota();
    let sent = 0;
    for (let i = 1; i < rows.length && quota > 0 && sent < 20; i++) {
      const row = rows[i];
      // Send the guest confirmation first so it is prioritized if the daily quota is low.
      if (row[8] === 'Pending' && row[6] && quota > 0 && sent < 20) {
        try {
          const greeting = row[2] ? 'Dear ' + row[2] + ',' : 'Hello,';
          const attendanceNote = row[3] === 'Yes, joyfully'
            ? 'We are delighted you will celebrate with us. The church ceremony begins at 11:00 AM at St. Dominic Catholic Church, Yaba. The reception follows at 2:00 PM at The SIG Lagos, 7/9 Molade Okoya Thomas Street, Victoria Island, Lagos.'
            : 'Thank you for letting us know. We will miss celebrating with you, and we appreciate you sending your RSVP.';
          MailApp.sendEmail({
            to: row[6],
            subject: 'We received your wedding RSVP — Chidinma & Ugochukwu',
            body: greeting + '\n\nThank you for your RSVP. ' + attendanceNote +
              '\n\nWith love,\nChidinma & Ugochukwu\n#UCLoveStory',
          });
          sheet.getRange(i + 1, 9).setValue('Sent');
          SpreadsheetApp.flush();
          quota--; sent++;
        } catch (_) { /* Keep this guest email pending and try again on the next run. */ }
      }
      if (row[7] === 'Pending' && recipient && quota > 0 && sent < 20) {
        try {
          MailApp.sendEmail({
            to: recipient,
            subject: 'New wedding RSVP — Chidinma & Ugochukwu',
            body: 'Name: ' + row[2] + '\nEmail: ' + (row[6] || 'Not provided') + '\nAttendance: ' + row[3] + '\nGuests: ' + row[4] +
              '\nMessage: ' + row[5] + '\n\nView all responses: ' + book.getUrl(),
          });
          sheet.getRange(i + 1, 8).setValue('Sent');
          SpreadsheetApp.flush();
          quota--; sent++;
        } catch (_) { /* Keep this notification pending and try again on the next run. */ }
      }
    }
  } finally { lock.releaseLock(); }
}
