import { describe, expect, it } from "vitest";
import { formatSize } from "@/lib/format/size";

describe("formatSize", () => {
  it.each([
    [0, "0 B"],
    [1023, "1023 B"],
    [1024, "1.0 KiB"],
    [1946, "1.9 KiB"],
    [10239, "10 KiB"],
    [421888, "412 KiB"],
    [1048575, "1.0 MiB"],
    [168820736, "161 MiB"],
    [5 * 1024 ** 4, "5.0 TiB"]
  ])("formats %d bytes as %s", (bytes, expected) => {
    expect(formatSize(bytes)).toBe(expected);
  });
});
