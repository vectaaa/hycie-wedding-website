/// <reference types="vinext/types" />

declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
  }
}

declare namespace Cloudflare {
  interface Env {
    RSVP_SCRIPT_URL?: string;
    RSVP_SHARED_SECRET?: string;
  }
}
