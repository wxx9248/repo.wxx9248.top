import { type Entry, isEntryKind } from "@/lib/tree/types";
import {
  compareEntries,
  defaultDirection,
  isSortKey,
  sortEntries
} from "@/lib/tree/sort";
import { describe, expect, it } from "vitest";

function entry(overrides: Partial<Entry> & Pick<Entry, "name">): Entry {
  return { kind: "file", mtimeMs: 0, size: 0, ...overrides };
}

function names(entries: Entry[]): string[] {
  return entries.map((item) => item.name);
}

describe("sortEntries", () => {
  const mixed = [
    entry({ name: "b.pkg" }),
    entry({ kind: "folder", name: "z" }),
    entry({ kind: "symlink", name: "a.link" }),
    entry({ kind: "folder", name: "y" })
  ];

  it("defaults to name ascending", () => {
    expect(names(sortEntries(mixed))).toEqual(["y", "z", "a.link", "b.pkg"]);
  });

  it("puts folders before files and symlinks in both directions", () => {
    expect(names(sortEntries(mixed, "name", "ascending"))).toEqual([
      "y",
      "z",
      "a.link",
      "b.pkg"
    ]);
    expect(names(sortEntries(mixed, "name", "descending"))).toEqual([
      "z",
      "y",
      "b.pkg",
      "a.link"
    ]);
  });

  it("keeps folders first when sorting by size or mtime", () => {
    const items = [
      entry({ mtimeMs: 9, name: "file", size: 9 }),
      entry({ kind: "folder", mtimeMs: 1, name: "dir" })
    ];
    for (const key of ["size", "mtime"] as const) {
      for (const direction of ["ascending", "descending"] as const) {
        expect(names(sortEntries(items, key, direction))).toEqual([
          "dir",
          "file"
        ]);
      }
    }
  });

  it("compares names by code point", () => {
    const items = ["b", "B", "a"].map((name) => entry({ name }));
    expect(names(sortEntries(items))).toEqual(["B", "a", "b"]);
  });

  it("sorts by size ascending and descending", () => {
    const items = [
      entry({ name: "mid", size: 20 }),
      entry({ name: "big", size: 30 }),
      entry({ name: "small", size: 10 })
    ];
    expect(names(sortEntries(items, "size", "ascending"))).toEqual([
      "small",
      "mid",
      "big"
    ]);
    expect(names(sortEntries(items, "size", "descending"))).toEqual([
      "big",
      "mid",
      "small"
    ]);
  });

  it("sorts by mtime ascending and descending", () => {
    const items = [
      entry({ mtimeMs: 200, name: "mid" }),
      entry({ mtimeMs: 300, name: "new" }),
      entry({ mtimeMs: 100, name: "old" })
    ];
    expect(names(sortEntries(items, "mtime", "ascending"))).toEqual([
      "old",
      "mid",
      "new"
    ]);
    expect(names(sortEntries(items, "mtime", "descending"))).toEqual([
      "new",
      "mid",
      "old"
    ]);
  });

  it("falls back to name ascending on ties, in both directions", () => {
    const sizes = [
      entry({ name: "b", size: 5 }),
      entry({ name: "a", size: 5 }),
      entry({ name: "c", size: 1 })
    ];
    expect(names(sortEntries(sizes, "size", "ascending"))).toEqual([
      "c",
      "a",
      "b"
    ]);
    expect(names(sortEntries(sizes, "size", "descending"))).toEqual([
      "a",
      "b",
      "c"
    ]);

    const times = [
      entry({ mtimeMs: 7, name: "y" }),
      entry({ mtimeMs: 7, name: "x" })
    ];
    expect(names(sortEntries(times, "mtime", "descending"))).toEqual([
      "x",
      "y"
    ]);
  });

  it("does not mutate its input", () => {
    const input = [entry({ name: "b" }), entry({ name: "a" })];
    const sorted = sortEntries(input);
    expect(names(input)).toEqual(["b", "a"]);
    expect(sorted).not.toBe(input);
  });
});

describe("compareEntries", () => {
  it("returns zero for identical entries", () => {
    const item = entry({ name: "same" });
    expect(compareEntries(item, item, "name", "ascending")).toBe(0);
  });
});

describe("isSortKey and isEntryKind", () => {
  it("accept the known names only", () => {
    expect(["mtime", "name", "size"].every(isSortKey)).toBe(true);
    expect(isSortKey("kind")).toBe(false);
    expect(["file", "folder", "symlink"].every(isEntryKind)).toBe(true);
    expect(isEntryKind("dir")).toBe(false);
  });
});

describe("defaultDirection", () => {
  it("starts names A to Z, and sizes and times largest and newest first", () => {
    expect(defaultDirection("name")).toBe("ascending");
    expect(defaultDirection("size")).toBe("descending");
    expect(defaultDirection("mtime")).toBe("descending");
  });
});
