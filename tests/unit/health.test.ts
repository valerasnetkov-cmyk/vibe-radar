import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/live/route";

describe("liveness", () => {
  it("returns process health only", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
