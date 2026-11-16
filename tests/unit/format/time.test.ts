import { describe, expect, it } from "vitest";
import { formatTime } from "@/lib/format/time";

describe("formatTime", () => {
  it("formats a timestamp in UTC", () => {
    expect(formatTime(Date.UTC(2026, 10, 11, 7, 31, 45))).toStrictEqual({
      iso: "2026-11-11T07:31:45.000Z",
      text: "2026-11-11 07:31"
    });
  });
});
