import { apiGet } from "@/services/api";

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("services/api error shape", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("retains HTTP status/data instead of rewriting to status 0", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ message: "Not found" }, 404));

    const assertion = apiGet("/admin/broadcasts");
    await expect(assertion).rejects.toMatchObject({ status: 404 });

    fetch.mockResolvedValueOnce(jsonResponse({ message: "Conflict" }, 409));
    try {
      await apiGet("/admin/broadcasts");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error.status).toBe(409);
      expect(error.data).toMatchObject({ message: "Conflict" });
      expect(error.status).not.toBe(0);
    }
  });

  it("keeps network failures distinct with status 0", async () => {
    fetch.mockRejectedValueOnce(new Error("Network down"));

    try {
      await apiGet("/admin/broadcasts");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error.status).toBe(0);
      expect(error.message).toMatch(/Network down/);
    }
  });
});
