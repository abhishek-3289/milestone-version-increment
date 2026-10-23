# Semver Milestone Increment ➕

[![My Skills](https://skillicons.dev/icons?i=githubactions,github&perline=3)](https://skillicons.dev)

## Use 📄

### Example ⌨️

```yaml
    permissions:
      contents: read
      issues: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v7

      - name: Update version
        id: milestone
        uses: abhishek-3289/milestone-version-increment@v1.4.0
        with:
          increment-type: minor
          prefix: v
          increment: 2
          due-day-increment: 3

      - name: Output milestone details
        run: |
          echo "${{ steps.milestone.outputs.title }}"
          echo "${{ steps.milestone.outputs.version }}"
          echo "${{ steps.milestone.outputs.number }}"
```

### Description 🔖
A GitHub Action which fetches the highest _normal_ semantic version (semver) from the tags in
a git repository. It will increment the version as directed (by default: +1 to the patch digit) and
then create a milestone titled with the given prefix plus semver, with description and due date, in open state.
If a milestone with the same title already exists, it is returned instead of failing.

Only tags of the form `MAJOR.MINOR.PATCH` or `vMAJOR.MINOR.PATCH` are considered; pre-release and
other tags are ignored. If no such tag exists, `v0.0.0` is used. Tags are fetched from the remote by
the action itself, so the default shallow `actions/checkout` works.

### Inputs 📥

| name                | description                                                                                              | required  | default         |
|:--------------------|:---------------------------------------------------------------------------------------------------------|:----------|:----------------|
| increment-type      | The digit to increment, either `major`, `minor` or `patch`.                                              | No        | `patch`         |
| increment           | The positive integer to add to `increment-type`.                                                         | No        | `1`             |
| prefix              | The prefix for milestone title eg: `v<semver>`                                                           | No        | ❌              |
| due-date            | This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ` | No        | ❌              |
| due-day-increment   | The number of days to add to the current day for due date. Takes precedence over `due-date`.             | No        | ❌              |
| description         | The description for the milestone.                                                                       | No        | ❌              |
| github-token        | Token used to create the milestone. Needs `issues: write`.                                               | No        | `github.token`  |

Setting `GITHUB_TOKEN` in `env` (as in earlier versions) still works and takes precedence over `github-token`.

### Outputs 📤

1. **title** :- The title of created milestone formed using prefix and semver.
2. **version** :- The semver used for milestone title.
3. **number** :- The number of created milestone.

## Examples 🧪

Ready-to-copy workflows live in [`examples/`](examples):

- [`next-milestone-on-release.yml`](examples/next-milestone-on-release.yml) creates the next minor milestone, due in 14 days, whenever a release is published.
- [`manual-milestone.yml`](examples/manual-milestone.yml) creates a milestone on demand, choosing the increment type, due date and description when you run it.

Copy one into `.github/workflows/` of your repository.

## Development 🛠️

```bash
npm test
```

The action is plain Node 24 with no dependencies, so there is nothing to install. The tests create throwaway git repositories, so they need only `git` and Node.

| Workflow | Trigger | What it does |
|:---------|:--------|:-------------|
| [CI](.github/workflows/ci.yml) | push to `main`, pull requests | Syntax check, actionlint, unit tests on Ubuntu and macOS, and an integration run of the action that creates and then deletes a temporary milestone. |
| [Release](.github/workflows/release.yml) | manual (`patch` / `minor` / `major`) | Runs CI, calculates the next version, publishes a GitHub release with generated notes, and moves the `vMAJOR` tag. |
