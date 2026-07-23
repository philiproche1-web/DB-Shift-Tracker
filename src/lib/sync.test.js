import { describe, it, expect } from "vitest";
import { pickWinner } from "./sync.js";

describe("pickWinner", () => {
  it("picks remote when there is no local timestamp", () => {
    expect(pickWinner(null, "2026-07-23T10:00:00Z")).toBe("remote");
  });

  it("picks local when there is no remote timestamp", () => {
    expect(pickWinner("2026-07-23T10:00:00Z", null)).toBe("local");
  });

  it("picks whichever timestamp is newer", () => {
    expect(pickWinner("2026-07-23T10:00:00Z", "2026-07-23T09:00:00Z")).toBe("local");
    expect(pickWinner("2026-07-23T09:00:00Z", "2026-07-23T10:00:00Z")).toBe("remote");
  });

  it("picks local on an exact tie", () => {
    expect(pickWinner("2026-07-23T10:00:00Z", "2026-07-23T10:00:00Z")).toBe("local");
  });
});
