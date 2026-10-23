# Milestone Version Increment ➕

[![My Skills](https://skillicons.dev/icons?i=githubactions,github&perline=3)](https://skillicons.dev)

## Use 📄

### Example ⌨️

```yaml
    permissions:
      contents: read
      issues: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

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
