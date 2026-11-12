import {
  type SortDirection,
  type SortKey,
  compareEntries
} from "@/lib/tree/sort";
import type { EntryKind } from "@/lib/tree/types";
import { matchesFilter } from "@/lib/tree/filter";
import { showMessage } from "@/scripts/message";

interface Row {
  kind: EntryKind;
  mtimeMs: number;
  name: string;
  row: HTMLTableRowElement;
  size: number;
}

interface SortState {
  direction: SortDirection;
  key: SortKey;
}

const sortKeys: readonly string[] = ["mtime", "name", "size"];

function isSortKey(value: string | undefined): value is SortKey {
  return sortKeys.includes(value ?? "");
}

function isEntryKind(value: string | undefined): value is EntryKind {
  return value === "file" || value === "folder" || value === "symlink";
}

// A column starts newest-first and largest-first, and A to Z for names
function defaultDirection(key: SortKey): SortDirection {
  return key === "name" ? "ascending" : "descending";
}

function readRows(table: HTMLTableElement): Row[] {
  const rows: Row[] = [];
  for (const row of table.querySelectorAll<HTMLTableRowElement>(
    "tr[data-entry]"
  )) {
    const { kind, mtime, name, size } = row.dataset;
    if (isEntryKind(kind)) {
      rows.push({
        kind,
        mtimeMs: Number(mtime),
        name: name ?? "",
        row,
        size: Number(size)
      });
    }
  }
  return rows;
}

// Wraps each sortable header's text in a button, so the keyboard can reach it
function makeHeadersButtons(
  table: HTMLTableElement
): Map<SortKey, HTMLTableCellElement> {
  const headers = new Map<SortKey, HTMLTableCellElement>();
  for (const header of table.querySelectorAll<HTMLTableCellElement>(
    "th[data-sort-key]"
  )) {
    const { sortKey } = header.dataset;
    if (isSortKey(sortKey)) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = header.textContent.trim();
      header.replaceChildren(button);
      headers.set(sortKey, header);
    }
  }
  return headers;
}

function bindSorting(
  table: HTMLTableElement,
  rows: Row[],
  noMatchRow: HTMLElement
): void {
  const headers = makeHeadersButtons(table);
  const state: SortState = { direction: "ascending", key: "name" };

  function apply(): void {
    const sorted = [...rows].sort((a, b) =>
      compareEntries(a, b, state.key, state.direction)
    );
    // Moving each row above the no-matches row leaves ../ first and that row last
    for (const { row } of sorted) {
      noMatchRow.before(row);
    }
    for (const [key, header] of headers) {
      header.setAttribute(
        "aria-sort",
        key === state.key ? state.direction : "none"
      );
    }
  }

  for (const [key, header] of headers) {
    header.querySelector("button")?.addEventListener("click", () => {
      if (state.key === key) {
        state.direction =
          state.direction === "ascending" ? "descending" : "ascending";
      } else {
        state.key = key;
        state.direction = defaultDirection(key);
      }
      apply();
    });
  }
}

function bindFilter(
  rows: Row[],
  noMatchRow: HTMLElement,
  input: HTMLInputElement
): void {
  const summary = document.querySelector("[data-summary]");
  const originalSummary = summary?.textContent ?? "";

  input.addEventListener("input", () => {
    const query = input.value;
    for (const { name, row } of rows) {
      row.hidden = !matchesFilter(name, query);
    }
    const shown = rows.filter(({ row }) => !row.hidden).length;
    noMatchRow.hidden = rows.some(({ row }) => !row.hidden);
    const filtering = query.trim() !== "";
    const result = `${shown} of ${rows.length}`;
    if (summary !== null) {
      summary.textContent = filtering ? result : originalSummary;
    }
    // The summary isn't a live region, so the status message announces the result
    showMessage(filtering ? result : "");
  });

  document.addEventListener("keydown", (event) => {
    const { target } = event;
    const typing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement;
    if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      input.focus();
    } else if (event.key === "Escape" && target === input) {
      input.value = "";
      input.dispatchEvent(new Event("input"));
    }
  });
}

// Wires the filter box and the column headers of a listing table
export function bindListing(table: HTMLTableElement): void {
  const rows = readRows(table);
  const noMatchRow = table.querySelector<HTMLElement>("tr[data-no-match]");
  if (noMatchRow === null) {
    return;
  }
  bindSorting(table, rows, noMatchRow);
  const input = document.querySelector<HTMLInputElement>("input[data-filter]");
  if (input !== null) {
    bindFilter(rows, noMatchRow, input);
  }
}
