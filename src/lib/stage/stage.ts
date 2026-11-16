import type { Repository, StageContext } from "@/lib/repository/repository";
import { mkdir, rm } from "node:fs/promises";

// Rebuilds the staging tree at root from scratch, one repository at a time
export async function stage(
  root: string,
  repositories: readonly Repository[],
  context: StageContext
): Promise<void> {
  await rm(root, { force: true, recursive: true });
  await mkdir(root, { recursive: true });
  for (const repository of repositories) {
    await repository.stage(root, context);
  }
}
