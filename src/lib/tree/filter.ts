// Case-insensitive substring match; the query is plain text, not a pattern.
export function matchesFilter(name: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return name.toLowerCase().includes(needle);
}
