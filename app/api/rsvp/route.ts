import { env } from "cloudflare:workers";
import { handleRsvp } from "./handler";

export async function POST(request: Request) {
  return handleRsvp(request, env);
}
