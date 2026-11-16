// Paths and names that the scripts, the build and the tests must agree on
export const project = {
  // Astro's build output, which the staged tree is copied into
  distDir: "dist",
  // A small sample tree, for building and testing without staging
  fixtureDir: "tests/fixtures/repo",
  // The environment variable that names another tree to publish
  repoDirVariable: "REPO_DIR",
  stageCommand: "pnpm stage:repo",
  // Where the stage command writes the tree, and the build reads it by default
  stagingDir: "staging"
} as const;
