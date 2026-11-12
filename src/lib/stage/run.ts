import { spawn } from "node:child_process";

const success = 0;

export type Run = (
  command: string,
  args: string[],
  options?: { cwd?: string }
) => Promise<string>;

// Spawn rejects with the system error (code "ENOENT") when the command is
// Missing, and otherwise with the exit code and stderr
export const run: Run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === success) {
        resolve(Buffer.concat(stdout).toString("utf8"));
        return;
      }
      reject(
        new Error(
          `${command} exited with code ${code}: ${Buffer.concat(stderr).toString("utf8").trim()}`
        )
      );
    });
  });

export function isMissingCommand(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
