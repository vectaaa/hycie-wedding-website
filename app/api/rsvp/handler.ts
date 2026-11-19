type Config = { RSVP_SCRIPT_URL?: string; RSVP_SHARED_SECRET?: string };

export async function handleRsvp(request: Request, config: Config, send: typeof fetch = fetch) {
  const reply = (body: object, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) {
    return reply({ error: "Please submit from the invitation website." }, 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) return reply({ error: "Expected JSON." }, 415);
  const raw = await request.text();
  if (raw.length > 8000) return reply({ error: "Your response is too long." }, 413);
  let data;
  try { data = JSON.parse(raw); } catch { return reply({ error: "Invalid response." }, 400); }
  if (!data || typeof data !== "object") return reply({ error: "Invalid response." }, 400);
  const { id, name, email, attending, guests, note, website } = data;
  if (website) return reply({ error: "Unable to submit this response." }, 400);
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) ||
      typeof name !== "string" || !name.trim() || name.length > 120 ||
      typeof email !== "string" || email.length > 254 ||
      (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      !["Yes, joyfully", "Sadly, no"].includes(attending) ||
      !Number.isInteger(guests) || guests < 0 || guests > 4 ||
      (attending === "Yes, joyfully" && guests < 1) ||
      typeof note !== "string" || note.length > 2000) {
    return reply({ error: "Please check your name, attendance, guest count, and message." }, 400);
  }
  if (!config.RSVP_SHARED_SECRET || !config.RSVP_SCRIPT_URL ||
      !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.RSVP_SCRIPT_URL)) {
    return reply({ error: "RSVP collection is not ready yet. Please try again later." }, 503);
  }
  try {
    const response = await send(config.RSVP_SCRIPT_URL, {
      method: "POST", redirect: "follow", signal: AbortSignal.timeout(25000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: name.trim(), email: email.trim(), attending, guests: attending === "Sadly, no" ? 0 : guests, note: note.trim(), secret: config.RSVP_SHARED_SECRET }),
    });
    const result = await response.json() as { ok?: boolean };
    if (!response.ok || result.ok !== true) throw new Error("Storage rejected response");
    return reply({ ok: true }, 200);
  } catch {
    return reply({ error: "We could not confirm your RSVP. Please retry; your response will not be saved twice." }, 502);
  }
}
