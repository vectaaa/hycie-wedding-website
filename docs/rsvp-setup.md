# Connect Google Sheets and email

The website is wired up, but collection stays unavailable until you complete this setup.
No Google password or credentials belong in the browser code.

## 1. Create the sheet and script

1. Create a private Google Sheet called **Jane Doe & John Doe RSVPs**.
2. In the sheet, choose **Extensions → Apps Script**.
3. Replace the contents of `Code.gs` with `google-apps-script/Code.gs` from this project and save.
4. Select `setup` in the function dropdown and click **Run**. Authorize spreadsheet, mail, and trigger access in your Google account. Only authorize your own script. This creates the RSVPs tab, generates a secret, and installs the five-minute email queue trigger; it sends no test email.
5. Open **Project Settings → Script Properties**. Add `NOTIFICATION_EMAIL` with your email address. Keep the generated `SPREADSHEET_ID` and `RSVP_SHARED_SECRET`. Copy the secret privately for step 3.

The RSVP sheet stores an optional guest email in an `Email` column. If you already created the sheet with an older version of this script, paste in the updated `Code.gs`, run `setup` once, and it will add the column before `Email status` while preserving existing responses.

## 2. Deploy the script

Choose **Deploy → New deployment → Web app**:

- Execute as: **Me**.
- Who has access: **Anyone** (guests must not need Google login).

Deploy, authorize if prompted, and copy the URL ending in `/exec`. Keep the spreadsheet itself private. If your organization disallows anonymous web apps, this setup needs a Google account that permits them.

After later code edits, use **Deploy → Manage deployments → Edit → New version → Deploy**. Saving code alone does not update a versioned deployment.

After updating this script, create and deploy a new version before testing the website. The website uses the email address only when a guest chooses to provide it; it is collected for event reminders and updates.

## 3. Configure this website

Copy `.dev.vars.example` to `.dev.vars` in the project root and enter:

```dotenv
RSVP_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
RSVP_SHARED_SECRET="the-generated-secret-from-script-properties"
```

Restart `npm run dev`. `.dev.vars` is ignored by Git. Do not use `VITE_` or `NEXT_PUBLIC_` prefixes for these settings.

For a hosted Cloudflare deployment, set these two values as Worker secrets using the hosting dashboard. Local `.dev.vars` is not deployed. This requires the server/Worker deployment, not static-only hosting.

## 4. Verify

Submit an RSVP with an identifiable test name. Confirm:

- The form says it was saved.
- A row appears in the **RSVPs** tab.
- An email arrives, normally within five minutes, and Email status becomes **Sent**.

You can run `sendPendingNotifications` in Apps Script to process the queue immediately. Google mail quotas apply; pending messages remain queued when quota runs out. Check Apps Script **Executions** if mail fails and check the recipient/spam folder. The sheet is the source of truth.

Retrying the same response without reloading the page reuses its ID and does not create another row. Reloading or changing fields creates a new response. Do not sort/delete rows while a notification run is processing. An interruption after email delivery but before marking Sent can cause a duplicate email, but not a duplicate RSVP row.

The endpoint validates fields, checks browser origin, uses a hidden spam field, and authenticates server-to-script requests. This is not full bot protection; add hosting rate limits or a challenge if the public form is abused.

## Reference

- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/reference/mail/mail-app
- https://developers.google.com/apps-script/guides/services/quotas
