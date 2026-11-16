import {
  type Drop,
  Repository,
  type SetupBlock,
  type StageContext
} from "@/lib/repository/repository";

// A repository kind that only records what the base class asks of it
export class FakeRepository extends Repository {
  readonly events: string[] = [];
  protected readonly manager = "fake";
  readonly #drops: Drop[];

  constructor(folder: string, drops: Drop[] = []) {
    super({ description: "", folder, install: ["pkg"] });
    this.#drops = drops;
  }

  protected drops(): Drop[] {
    return this.#drops;
  }

  protected index(directory: string, context: StageContext): Promise<void> {
    this.events.push(`index ${directory} ${context.now.toISOString()}`);
    return Promise.resolve();
  }

  protected setupBlocks(url: string): SetupBlock[] {
    return [{ caption: "add", code: `fake add ${url} ${this.install[0]}` }];
  }
}
