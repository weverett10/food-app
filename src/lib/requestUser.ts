import type { NextRequest } from "next/server";

export function getUserId(request: NextRequest): string | null {
  return request.headers.get("x-user-id");
}
