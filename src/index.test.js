import { afterEach, expect, spyOn, test } from "bun:test";
import worker from "./index";

afterEach(() => {
  fetchSpy?.mockRestore();
});

let fetchSpy;

test("returns a readable CORS response when upstream fetch fails", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  const response = await worker.fetch(new Request("https://proxy.test/github.com/user/repo.git"));
  expect(response.status).toBe(502);
  expect(response.headers.get("access-control-allow-origin")).toBe("*");
  expect(await response.text()).toBe("Upstream request failed");
});

test("permits protocol-v2 and custom headers requested by browser Git clients", async () => {
  const response = await worker.fetch(
    new Request("https://proxy.test/github.com/user/repo.git", {
      method: "OPTIONS",
      headers: { "access-control-request-headers": "git-protocol, x-git-client" },
    }),
  );
  expect(response.status).toBe(204);
  expect(response.headers.get("access-control-allow-headers")).toBe("git-protocol, x-git-client");
});
