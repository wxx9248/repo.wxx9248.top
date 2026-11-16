import { describe, expect, it } from "vitest";
import type { Entry } from "@/lib/tree/types";
import { summarize } from "@/lib/tree/summary";

const KIB = 1024;

function file(name: string, size = KIB): Entry {
  return { kind: "file", mtimeMs: 0, name, size };
}

function folder(name: string): Entry {
  return { kind: "folder", mtimeMs: 0, name, size: 0 };
}

describe("summarize", () => {
  it("says empty for no entries", () => {
    expect(summarize([])).toBe("empty");
  });

  it("counts folders with singular and plural", () => {
    expect(summarize([folder("a")])).toBe("1 folder");
    expect(summarize([folder("a"), folder("b")])).toBe("2 folders");
  });

  it("counts files and sums their sizes", () => {
    expect(summarize([file("a"), file("b"), file("c")])).toBe(
      "3 files · 3.0 KiB"
    );
  });

  it("counts symlinks as files without adding their size", () => {
    const link: Entry = {
      kind: "symlink",
      mtimeMs: 0,
      name: "link",
      size: KIB,
      target: "a"
    };
    expect(summarize([file("a"), file("b"), link])).toBe("3 files · 2.0 KiB");
  });

  it("lists folders before files", () => {
    expect(summarize([folder("d"), file("f")])).toBe(
      "1 folder, 1 file · 1.0 KiB"
    );
  });
});
