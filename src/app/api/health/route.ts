import { NextResponse } from "next/server";

/**
 * Liveness probe for the Whimlet Engine (Docker HEALTHCHECK, Caddy, uptime
 * monitors). Prerendered at build time — it proves the server process is up
 * and serving, which is all a liveness check should assert — and therefore
 * also present in the static export as `api/health` (harmless on Pages).
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({ ok: true, service: "whimlet", version: process.env.npm_package_version ?? null });
}
