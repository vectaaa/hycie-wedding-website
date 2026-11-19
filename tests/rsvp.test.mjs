import assert from 'node:assert/strict';
import test from 'node:test';
import { handleRsvp } from '../app/api/rsvp/handler.ts';

const config = { RSVP_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec', RSVP_SHARED_SECRET: 'test-secret' };
const data = { id: '12345678-1234-1234-1234-123456789012', name: 'Guest', email: 'guest@example.com', attending: 'Yes, joyfully', guests: 2, note: '' };
const request = (body = data, origin = 'https://invite.example') => new Request('https://invite.example/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(body) });
test('requires configuration and rejects invalid input before sending', async () => {
  assert.equal((await handleRsvp(request(), {})).status, 503);
  assert.equal((await handleRsvp(request({ ...data, guests: 8 }), config)).status, 400);
  assert.equal((await handleRsvp(request(null), config)).status, 400);
  assert.equal((await handleRsvp(request(data, 'https://other.example'), config)).status, 403);
});
test('forwards the secret only upstream and records zero guests for declines', async () => {
  const response = await handleRsvp(request({ ...data, attending: 'Sadly, no' }), config, async (_, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.secret, 'test-secret');
    assert.equal(body.guests, 0);
    assert.equal(body.id, data.id);
    assert.equal(body.email, data.email);
    return Response.json({ ok: true });
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});
test('does not claim success when Google rejects or returns an authorization page', async () => {
  for (const send of [async () => Response.json({ ok: false }), async () => new Response('<html>Sign in</html>'), async () => { throw new Error('timeout'); }]) {
    assert.equal((await handleRsvp(request(), config, send)).status, 502);
  }
});
