# Pyodide Updates

This document describes what is needed to update [Pyodide](https://pyodide.org/en/stable/project/changelog.html) to its latest version.

### Requirements

* a terminal compatible with *Bash* commands.
* *Node.js* (stable or latest) to run `npm` commands.
* a *Python* environment.
* an [npm account](https://www.npmjs.com/) to publish the updated package. This account must belong to a maintainer or developer who is allowed to publish the package on *npm*.
* a network connection to fetch data from various sources.

The *minimal Python environment* can be created via the following commands:

```sh
python3 -m venv env
source env/bin/activate
pip3 install --upgrade pip
pip3 install --ignore-requires-python python-minifier
pip3 install setuptools
```

## How to build

  * checkout a new branch via `git checkout -b pyodide-X.Y.Z` where `X.Y.Z` is the version that should be updated
  * create the *Python* environment which is needed to create and optimize both JS and Python files
  * run `npm ci` to be sure all `package-lock.json` dependencies are present/installed
  * run `npm run update:pyodide` to:
    * write the latest published version into `versions/pyodide`
    * update dependent files and source maps to reflect such version
    * build the latest `dist/` version of the package
    * run all tests (you might also need to run `playwright install chromium` if tests don't run)
  * once all tests are green, be sure you also run `npm run build:graph`, which:
    * fetches the list of versions from the *Pyodide* documentation page
    * adds versions not already known in `rollup/pyodide_graph.json`
    * updates compatible modules to their own latest version too

The graph is then used, after this module is published, via https://packages.pyscript.net/, so it's important that this file is updated too whenever a new version of Pyodide is published.

At this point, feel free to commit with a meaningful message:

```sh
# add all changed files
git add .
# create a meaningful commit
git commit -m 'Updated Pyodide to version X.Y.Z'
# push the branch and follow the instructions to create the MR
git push
```

Usually in the *MR* it's convenient to point to the Pyodide changelog, as a *Pyodide*-only release means nothing else changed in *PyScript* itself.

Once the *MR* is approved and merged into `main`, run `git checkout main` and `git pull --rebase origin main` to update the local `main` branch with the latest changes.

## How to publish on npm

Because the only change here would be *Pyodide*, and unless such an update requires changes elsewhere, the *semver* convention is to increase the **patch** number.

```sh
npm version patch
```

This command increases the patch by one, modifying `package.json` automatically, and it creates a tag.

To be sure everything is fine, `npm run build` should not create different artifacts. If it does, it means that some artifact was missing from the previous branch, and that's OK, but we need all artifacts to land on *npm*.

The same is true for `npm run build:graph` but again, if some new artifact is created, please add it.

At this point both the changes and the tag need to be pushed to the remote:

```sh
git add .
git commit -m 'updated package version'
git push
# push the tag too
git push --tags
# publish to npm - it asks for 2FA / OTP directly
# replace 42 with your one-time password (OTP)
npm publish --otp=42
```

Once the new version of `polyscript` lands on *npm*, it is possible to move forward with a new [PyScript Maintenance Release](https://github.com/pyscript/pyscript/blob/main/MAINTAINERS.md).
