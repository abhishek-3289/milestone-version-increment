# Milestone Version Increment ➕

[![My Skills](https://skillicons.dev/icons?i=githubactions,github&perline=3)](https://skillicons.dev)

## Use 📄

### Example ⌨️

```yaml
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Update version
        id: milestone
        uses: abhishek-3289/milestone-version-increment@v1
        with:
          increment-type: minor
          prefix: v
          increment: 2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN  }}
          
      - name: Output milestone details
        run: \
          echo ${{ steps.milestone.outputs.title }}
          echo ${{ steps.milestone.outputs.version }}
          echo ${{ steps.milestone.outputs.number }}
```


### Description 🔖
A GitHub Action which can fetch the current latest _normal_ semantic version (semver) from the tags in
a git repository.  It will increment the version as directed (by default: +1 to the patch digit) and 
then can create a milestone with given prefix plus semver, description and due date in open state.

### Inputs 📥

| name           | description                                                                                               | required | default |
|:---------------|:----------------------------------------------------------------------------------------------------------| :---     |:--------|
| increment-type | The digit to increment, either `major`, `minor` or `patch`.                                               | No       | `patch` |
| increment      | The value to add into `increment-type`                                                                    | No       | `1`     |
| prefix         | The prifix for milestone title eg: `v<semver>`                                                            | No       | ❌       |
| due-date       | This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`. | No       | ❌       |
| description    | The description for the milestone.                                                                        | No       | ❌       |

### Outputs 

1. **title** :- The title of created milestone formed using prefix and semver.
2. **version** :- The semver used for milestone title.
3. **number** :- The number of created milestone.