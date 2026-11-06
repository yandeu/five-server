# Five Server

Development Server with **Live Reload** Capability.  
(Maintained **F**ork of **Live Server**)

- Rewritten in TypeScript
- Up-to-date dependencies
- Better than ever!

---

[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/yandeu.five-server?logo=Visual%20Studio%20Code&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yandeu.five-server)
[![Sponsors](https://img.shields.io/github/sponsors/yandeu?style=flat-square)](https://github.com/sponsors/yandeu)
[![NPM version](https://img.shields.io/npm/v/five-server.svg?style=flat-square)](https://www.npmjs.com/package/five-server)
[![Github Workflow](https://img.shields.io/github/actions/workflow/status/yandeu/five-server/main.yml?branch=main&label=build&logo=github&style=flat-square)](https://github.com/yandeu/five-server/actions?query=workflow%3ACI)
[![Github Workflow](https://img.shields.io/github/actions/workflow/status/yandeu/five-server/codeql-analysis.yml?branch=main&label=CodeQL&logo=github&style=flat-square)](https://github.com/yandeu/five-server/actions?query=workflow%3ACodeQL)
[![Downloads](https://img.shields.io/npm/dm/five-server.svg?style=flat-square)](https://www.npmjs.com/package/five-server)
![Node version](https://img.shields.io/node/v/five-server.svg?style=flat-square)
[![Codecov](https://img.shields.io/codecov/c/github/yandeu/five-server?logo=codecov&style=flat-square)](https://codecov.io/gh/yandeu/five-server)

---

## Top Features

- 🚀 **Remote Logs**  
   Displays the logs of your browser in your terminal!  
   _Useful for debugging on your smart phone for example._

- 🚀 **PHP Server**  
  Serves not only your **.html** files but also **.php**.  
  _See docs below_

- 🚀 **Server Side Rendered App**  
  Works with any Server Side Rendered content like **Express.js**!  
  _See docs below_

- 🚀 **Instant Updates**  
  Updates your html page while typing!  
  (_[VSCode Extension only](https://marketplace.visualstudio.com/items?itemName=yandeu.five-server)_)

- 🚀 **Highlights**  
  Highlights the code you are working on in your browser!  
   (_[VSCode Extension only](https://marketplace.visualstudio.com/items?itemName=yandeu.five-server)_)

- 🚀 **Auto Navigation**  
  Navigates your browser automatically to the current editing .html file!  
  (_[VSCode Extension only](https://marketplace.visualstudio.com/items?itemName=yandeu.five-server)_)

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

_Five Server is written in TypeScript. Since it is nearly impossible to have a clean import for all module resolvers without restricting/adding explicit access to submodules via the exports property in package.json (which I don't want), I just list some very simple import examples._

_Once everyone uses Modules in Node.js, I'm happy to make adjustments._

```ts
// TypeScript
import FiveServer from 'five-server'
new FiveServer().start({ open: false })

// Node.js Module
import FiveServer from 'five-server/esm.mjs'
new FiveServer().start({ open: false })

// Node.js Module (alternative)
import pkg from 'five-server'
const { default: FiveServer } = pkg
new FiveServer().start({ open: false })

// CommonJS
const FiveServer = require('five-server').default
new FiveServer().start({ open: false })
```

## Documentation

_Will be available soon._

## Config File

### Local only or network access (`host`)

By default, Five Server binds to `127.0.0.1`, so only your own computer can connect. The browser opens `http://localhost:<port>` if your system resolves `localhost` to `127.0.0.1`, and `http://127.0.0.1:<port>` otherwise.

| `host` | Who can connect | Browser opens |
| --- | --- | --- |
| not set (default) | this computer only | `http://localhost:<port>` or `http://127.0.0.1:<port>` |
| `'0.0.0.0'` | any device on your network | `http://localhost:<port>` or `http://127.0.0.1:<port>` |
| any other value, e.g. `'192.168.1.20'` | that address only | that address |

**To test on a mobile phone on the same network,** set `host: '0.0.0.0'` (or start with `--host=0.0.0.0`). Five Server then prints a **Network** URL in the terminal. Open that URL on your phone.

```js
// fiveserver.config.js
module.exports = {
  host: '0.0.0.0',
  remoteLogs: 'magenta' // optional: show phone logs in your terminal (true | false | Color)
}
```

_`0.0.0.0` makes your project files reachable by every device on the network. Use it only on networks you trust._

### Reference:

You will find all available options for your Config File in [`/src/types.ts`](https://github.com/yandeu/five-server/blob/main/src/types.ts).

### A simple example of a config file:

Your browser will open the about page of your portfolio project at `http://localhost:8085/about.html`.

```json
// .fiveserverrc
{
  "port": 8085,
  "root": "src/portfolio",
  "open": "about.html"
}
```

### Another example:

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

### Watch & Ignore:

Watch only for file changes in `/src`. But exclude all `.sass` and `.scss` files from watching.

```js
// fiveserver.config.js
module.exports = {
  // ...
  watch: 'src',
  ignore: /\.s[ac]ss$/i

  // can also be an array:
  // watch: ['src', 'public'],
  // ignore: [/\.s[ac]ss$/i, /\.tsx?$/i]
}
```

To prevent a single page from automatically reloading, add `data-server-no-reload` to the `<body>` tag:

```html
<!doctype html>
<html lang="en">
<head>
    ...
</head>
<body data-server-no-reload>
  ...
</body>
</html>
```

This will omit the usually injected Javascript from being instantiated on that given page.

### Browser of your choice

The option browser can be a `string` or an `string[]`.  
_If you provide an array, the first browser found will be opened._

Following options are all valid:

```bash
'chrome'
['firefox', 'chrome --incognito']
['C:\\Program Files\\Firefox Developer Edition\\firefox.exe --private-window']

# if 'chrome' does not work, try 'google chrome' or 'google-chrome'
```

### PHP Server

Serve and auto-reload PHP file in your browser!

Simply add the path to your PHP executable.

```js
module.exports = {
  php: '/usr/bin/php', // Linux/macOS (example)
  php: 'C:\\xampp\\php\\php.exe' // Windows (example)
}
```

### Cache

The cache feature (the `/.cache` route and the `cache` attribute) has been removed in version 0.6.0 and above.

### Server Side Rendering (like express.js)

You can enable live reload for any server side generated content.  

Check out the express.js example at [/examples/express](https://github.com/yandeu/five-server/tree/main/examples/express).

Simply start Five Server and add the script below to you files:

```html
<script async data-id="five-server" src="http://localhost:8080/fiveserver.js"></script>
```

Add this config file:

```js
// fiveserver.config.js
module.exports = {
  https: false,
  host: 'localhost',
  port: 8080,
  open: false // or open your express.js app (http://localhost:3000/ for example)
}
```

## VSCode Extension

Download it from [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=yandeu.five-server).

## Logo

<img alt="fiveserver logo" src="https://raw.githubusercontent.com/yandeu/five-server/main/img/logo.png" width="128" height="96">

## License

See [LICENSE](https://github.com/yandeu/five-server/blob/main/LICENSE)
