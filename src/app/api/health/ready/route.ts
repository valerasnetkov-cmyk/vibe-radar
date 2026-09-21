import { checkDatabaseReadiness } from "@/server/db/client";

export async function GET() {
  const database = await checkDatabaseReadiness();
  return Response.json(
    { status: database ? "ok" : "unavailable", checks: { database } },
    { status: database ? 200 : 503 },
  );
}
