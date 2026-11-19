import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}


test("server-renders the wedding invitation and RSVP form", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Wedding Invitation<\/title>/i);
  assert.match(html, /Open invitation/);
  assert.match(html, /Tuesday, January 1, 2030/);
  assert.match(html, /Lorem Ipsum Event Center/);
  assert.match(html, /id="rsvp"/);
  assert.match(html, /name="name"/);
  assert.match(html, /name="email"/);
  assert.match(html, /reminders and updates before the event/);
  assert.match(html, /Send RSVP/);
  assert.match(html, /Countdown to wedding/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});
