// True for a Node system error with the given code, such as "ENOENT"
export function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}
