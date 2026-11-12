import type { Run } from "@/lib/stage/run";

export interface RecordedCall {
  args: string[];
  command: string;
  cwd: string | undefined;
}

export interface FakeRun {
  calls: RecordedCall[];
  run: Run;
}

// Records every call and answers with the canned stdout for the command,
// Or rejects when the command's canned answer is an Error
export function fakeRun(answers: Record<string, Error | string> = {}): FakeRun {
  const calls: RecordedCall[] = [];
  const run: Run = (command, args, options) => {
    calls.push({ args, command, cwd: options?.cwd });
    const answer = answers[command] ?? "";
    return answer instanceof Error
      ? Promise.reject(answer)
      : Promise.resolve(answer);
  };
  return { calls, run };
}

export function missingCommand(command: string): Error {
  return Object.assign(new Error(`spawn ${command} ENOENT`), {
    code: "ENOENT"
  });
}
