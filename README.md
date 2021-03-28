# Five Server

Development Server with **Live Reload** Capability.  
(Maintained **F**ork of **Live-Server**)

- Rewritten in TypeScript
- Up-to-date dependencies

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

Similar to [Live-Server](https://www.npmjs.com/package/live-server).

## Documentation

_Will be available soon._

## Config File

**A simple example of a config file:**

Your browser will open the about page of your portfolio project at `http://localhost:8085/about.html`.

```json
// .fiveserverrc
{
  "port": 8085,
  "root": "src/portfolio",
  "open": "about.html"
}
```

**Another example:**

Firefox (if available) will open `https://127.0.0.1:8086/about.html` and `https://127.0.0.1:8086/contact.html`.

```js
// fiveserver.config.js
module.exports = {
  port: 8086,
  root: 'src/portfolio',
  open: ['about.html', 'contact.html'],
  host: '0.0.0.0',
  browser: 'firefox',
  https: true
}
```

(_The **https certificate** is self-signed. Means, the first time you open your browser, you have to confirm that you want to continue._)

**Watch & Ignore:**

Watch only for file changes in `/src`. But exclude all `.sass` and `.scss` files from watching.

```js
// fiveserver.config.js
module.exports = {
  // ...
  watch: 'src',
  ignore: /\.s[ac]ss$/i

  // can also be an array:
  // ignore: [/\.s[ac]ss$/i, /\.tsx?$/i]
}
```

## VSCode Extension

Download it from [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=yandeu.five-server).

## Logo

<img alt="fiveserver logo" src="https://raw.githubusercontent.com/yandeu/five-server/main/img/logo.png" width="128" height="96">

## Changes since fork

### All notable changes since the fork.

---

You can now use a config file in your home directory\* or the root directory of your project.

Allowed file names are `.fiveserverrc` and `.fiveserverrc.json` written in JSON.

_\*`C:\\Users\\USER` on Windows and `/home/USER` on Linux and Mac_

---

`htpasswd` does not work yet.

---

## License

[MIT](https://github.com/yandeu/five-server/blob/main/LICENSE)
