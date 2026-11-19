import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8');
function runtime() {
  const rows = [['ID', 'Time', 'Name', 'Attendance', 'Guests', 'Message', 'Email', 'Status']];
  const sheet = {
    getLastRow: () => rows.length,
    appendRow: row => rows.push(row),
    getDataRange: () => ({ getValues: () => rows }),
    getRange: (r, c) => ({
      createTextFinder: id => ({ matchEntireCell: () => ({ findNext: () => rows.slice(1).some(row => row[0] === id) }) }),
      setValue: value => { rows[r - 1][c - 1] = value; },
    }),
  };
  let mailFails = false;
  const messages = [];
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => ({ RSVP_SHARED_SECRET: 'secret', NOTIFICATION_EMAIL: 'test@example.com', SPREADSHEET_ID: 'sheet' })[key] }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet, getUrl: () => 'https://example.com/sheet' }), flush() {} },
    MailApp: { getRemainingDailyQuota: () => 10, sendEmail: message => { if (mailFails) throw new Error('mail unavailable'); messages.push(message); } },
  });
  vm.runInContext(source, context);
  return { context, rows, messages, failMail: value => { mailFails = value; } };
}
const data = { id: '12345678-1234-1234-1234-123456789012', secret: 'secret', name: '=FORMULA()', email: 'guest@example.com', attending: 'Yes, joyfully', guests: 1, note: '+formula' };
const event = value => ({ postData: { contents: JSON.stringify(value) } });
test('authenticates, saves literal text, and deduplicates retries', () => {
  const { context, rows } = runtime();
  assert.equal(context.doPost(event({ ...data, secret: 'wrong' })).ok, false);
  assert.equal(rows.length, 1);
  assert.equal(context.doPost(event(data)).ok, true);
  assert.equal(context.doPost(event(data)).ok, true);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][2], "'=FORMULA()");
  assert.equal(rows[1][5], "'+formula");
  assert.equal(rows[1][6], 'guest@example.com');
});
test('email failure leaves RSVP saved and pending for a later retry', () => {
  const { context, rows, messages, failMail } = runtime();
  context.doPost(event(data));
  failMail(true);
  context.sendPendingNotifications();
  assert.equal(rows[1][7], 'Pending');
  assert.equal(rows[1][8], 'Pending');
  failMail(false);
  context.sendPendingNotifications();
  context.sendPendingNotifications();
  assert.equal(rows[1][7], 'Sent');
  assert.equal(rows[1][8], 'Sent');
  assert.equal(messages.length, 2);
  assert.equal(messages[0].to, 'guest@example.com');
});
