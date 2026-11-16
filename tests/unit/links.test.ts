import { describe, expect, it } from "vitest";
import { entryHref, folderUrl } from "@/lib/links";

describe("entryHref", () => {
  it.each([
    [
      "file",
      "linux-7.2.15.arch1-1-x86_64.pkg.tar.zst",
      "./linux-7.2.15.arch1-1-x86_64.pkg.tar.zst"
    ],
    [
      "file",
      "foo-1:2.0+r1-1-x86_64.pkg.tar.zst",
      "./foo-1:2.0+r1-1-x86_64.pkg.tar.zst"
    ],
    ["file", "a b.txt", "./a%20b.txt"],
    ["file", "ü.txt", "./%C3%BC.txt"],
    ["file", "100%#1?.txt", "./100%25%231%3F.txt"],
    ["file", "a/b", "./a%2Fb"],
    ["file", ":x@y!$&'()*,;=.txt", "./:x@y!$&'()*,;=.txt"],
    ["folder", "x86_64", "./x86_64/"],
    ["symlink", "wxx9248.db", "./wxx9248.db"]
  ] as const)("links %s %s to %s", (kind, name, expected) => {
    expect(entryHref({ kind, name })).toBe(expected);
  });
});

describe("folderUrl", () => {
  it("links the root to a bare slash", () => {
    expect(folderUrl([])).toBe("/");
  });

  it("joins nested segments with trailing slashes", () => {
    expect(folderUrl(["archlinux", "x86_64"])).toBe("/archlinux/x86_64/");
  });

  it("encodes each segment", () => {
    expect(folderUrl(["a b"])).toBe("/a%20b/");
  });

  it("keeps the characters a path segment may hold", () => {
    expect(folderUrl(["x:1+2"])).toBe("/x:1+2/");
  });
});
