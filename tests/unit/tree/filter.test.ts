import { describe, expect, it } from "vitest";
import { matchesFilter } from "@/lib/tree/filter";

describe("matchesFilter", () => {
  it("matches case-insensitively", () => {
    expect(matchesFilter("linux-headers.pkg", "HEADERS")).toBe(true);
  });

  it("treats the query as a plain substring, not a pattern", () => {
    expect(matchesFilter("foo-1:2.0+r1", "1:2.0+")).toBe(true);
    expect(matchesFilter("linux", "l.nux")).toBe(false);
  });

  it("matches everything for an empty query", () => {
    expect(matchesFilter("anything", "")).toBe(true);
  });

  it("trims the query before matching", () => {
    expect(matchesFilter("x", "  ")).toBe(true);
    expect(matchesFilter("linux", "  inu ")).toBe(true);
  });

  it("rejects names without the substring", () => {
    expect(matchesFilter("linux", "zzz")).toBe(false);
  });
});
