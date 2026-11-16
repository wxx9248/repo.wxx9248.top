# repo.wxx9248.top

Package repositories for things wxx9248 builds.

## Requirements

- Node.js — the version in [`.node-version`](.node-version)
- pnpm — the version in `packageManager` in [`package.json`](package.json)
- Docker and `dpkg-scanpackages` (from `dpkg-dev`), for `pnpm stage:repo` only

## Commands

| Command           | What it does                                                                       |
| ----------------- | ---------------------------------------------------------------------------------- |
| `pnpm install`    | Install dependencies                                                               |
| `pnpm dev`        | Start the dev server                                                               |
| `pnpm stage:repo` | Download the latest release assets and build the package databases into `staging/` |
| `pnpm build`      | Lint, type check, build and assemble `dist/`. Fails if any step fails              |
| `pnpm preview`    | Serve `dist/`                                                                      |
| `pnpm test`       | Unit tests (Vitest), then browser tests (Playwright, which need Chromium)          |
| `pnpm lint:fix`   | Fix what ESLint can fix                                                            |
| `pnpm format`     | Format everything with Prettier                                                    |

Set `REPO_DIR=tests/fixtures/repo` to build and test against the sample repository, without running `pnpm stage:repo`. Install the browser once with `pnpm exec playwright install chromium`.

`astro preview` can't serve the extensionless apt index files (`Release`, `Packages`). To test apt locally, serve `dist/` with any plain static server, for example `python3 -m http.server -d dist`.

## Adding a package source

Each repository is an entry in
[`src/config/repos.ts`](src/config/repos.ts), and its packages come from the
GitHub releases it lists. Add a source to the repository's
`architectures.<arch>` list (pacman) or its `sources` list (apt):

```ts
{ asset: /<pattern>/u, github: "<owner>/<repo>" }
```

`asset` matches the names of the release assets to take, and `github` is the
release's owner and repository.

The source repository's release workflow must also send a `repository_dispatch`
to this repository, so that [`publish.yml`](.github/workflows/publish.yml) runs
when a release is published.

## Adding a repository kind

A package format is a subclass of `Repository` in
[`src/lib/repository/`](src/lib/repository/repository.ts). The subclass names
its download folders (`drops`), builds the index (`index`) and writes the
setup snippets (`setupBlocks`). Staging and the setup panel call only the base
class, so a new format needs the subclass and an entry in `repos.ts`, and
nothing else.
