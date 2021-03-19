# Five Server

Development Server with **Live Reload** Capability.  
(Maintained **F**ork of **Live-Server**)

- Rewritten in TypeScript
- Up-to-date dependencies

Not only are the dependencies of **Five-Server** up-to-date, but the repository also contains [maintainted forks](https://github.com/yandeu/five-server/tree/main/src/dependencies) of **connect**, **send** and **serve-index**.

_Someday, I guess it makes sense merging these 3 dependencies back to the origin. (Not sure if the maintainers are interested)_

---

[![NPM version](https://img.shields.io/npm/v/five-server.svg?style=flat-square)](https://www.npmjs.com/package/five-server)
[![Github Workflow](https://img.shields.io/github/workflow/status/yandeu/five-server/CI/main?label=build&logo=github&style=flat-square)](https://github.com/yandeu/five-server/actions?query=workflow%3ACI)
[![Github Workflow](https://img.shields.io/github/workflow/status/yandeu/five-server/CodeQL/main?label=CodeQL&logo=github&style=flat-square)](https://github.com/yandeu/five-server/actions?query=workflow%3ACodeQL)
[![Downloads](https://img.shields.io/npm/dm/five-server.svg?style=flat-square)](https://www.npmjs.com/package/five-server)
![Node version](https://img.shields.io/node/v/five-server.svg?style=flat-square)
[![Codecov](https://img.shields.io/codecov/c/github/yandeu/five-server?logo=codecov&style=flat-square)](https://codecov.io/gh/yandeu/five-server)

---

## Get Started

```bash
# Remove live-server (if you have it)
$ npm -g rm live-server

# Install five-server
$ npm -g i five-server

# Run it
$ five-server

# Update five-server (from time to time)
$ npm -g i five-server@latest
```

## Usage

Same as for [Live-Server](https://www.npmjs.com/package/live-server).

## Logo

![logo](https://raw.githubusercontent.com/yandeu/five-server/main/img/logo.png)

_Inspired by [vscode-live-server](https://github.com/ritwickdey/vscode-live-server/blob/master/images/icon.png)_

## Changes since fork

### All notable changes since the fork.

---

You can now use a config file in your home directory\* or the root directory of your project.

Allowed file names are `.fiveserverrc` and `.fiveserverrc.json` written in JSON.

_\*`C:\\Users\\USER` on Windows and `/home/USER` on Linux and Mac_

---

## License

[MIT](https://github.com/yandeu/five-server/blob/main/LICENSE)
