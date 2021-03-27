# FiveServer

[five-server](https://github.com/yandeu/five-server) can be used to quickly develop an application.

This page describes the options that affect the behavior of FiveServer.

## `fiveServer`

`object`

The config file is picked up by [five-server](https://github.com/yandeu/five-server) and can be used to change its behavior in various ways.

FiveServer supports the following configuration files:

- A `.fiveserverrc` file written in JSON.
- A `.fiveserverrc.json` file.
- A `.fiveserverrc.js`, `.fiveserverrc.cjs`, `fiveserver.config.js`, or `fiveserver.config.cjs` file that exports an object using `module.exports`.

Here's a simple example that serves everything from our `src/` directory on port 9000 in the project root:

**.prettierrc**

```json
{
  "root": "src",
  "port": 9000
}
```

When the server is started, there will be a message prior to the list of resolved modules:

```bash
Serving at http://localhost:9000
```

that will give some background on where the server is located and what it's serving.

### Usage via CLI

You can invoke five-server via CLI by:

```bash
npx five-server
```

A list of CLI options for `five-server` is available [here](./cli-options.md)

## `fiveServer.host`

`string = 'localhost'`

Specify a host to use. If you want your server to be accessible externally, specify it like this:

**.prettierrc**

```json
{
  "host": "0.0.0.0"
}
```

Usage via the CLI

```bash
npx five-server --host="0.0.0.0"
```

## `fiveServer.open`

`boolean` `string` `string[]`

Tells five-server to open the browser after server had been started.

**.prettierrc**

```json
{
  "open": true
}
```

Usage via the CLI

```bash
npx five-server --open="index.html,contact.html"
```

## `fiveServer.browser`

`string` `string[]`

Tells five-server which browser to open.

**.prettierrc**

```json
{
  "browser": "chrome"
}
```

Usage via the CLI

```bash
npx five-server --open="chrome"
```

The browser application name is platform dependent. Don't hard code it in reusable modules. For example, `'Chrome'` is `'Google Chrome'` on macOS, `'google-chrome'` on Linux and `'chrome'` on Windows.

## `fiveServer.port`

`number`

Specify a port number to listen for requests on:

**fiveserver.config.js**

```javascript
module.exports = {
  port: 8080
}
```

Usage via the CLI

```bash
npx webpack serve --port="8080"
```

## `fiveServer.proxy`

`object` `[object, function]`

Proxying some URLs can be useful when you have a separate API backend development server and you want to send API requests on the same domain.

The five-server makes use of the powerful [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware) package. Check out its [documentation](https://github.com/chimurai/http-proxy-middleware#options) for more advanced usages. Note that some of `http-proxy-middleware`'s features do not require a `target` key, e.g. its `router` feature, but you will still need to include a `target` key in your configuration here, otherwise `five-server` won't pass it along to `http-proxy-middleware`).

With a backend on `localhost:3000`, you can use this to enable proxying:

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
}
```

A request to `/api/users` will now proxy the request to `http://localhost:3000/api/users`.

If you don't want `/api` to be passed along, we need to rewrite the path:

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        pathRewrite: { '^/api': '' }
      }
    }
  }
}
```

A backend server running on HTTPS with an invalid certificate will not be accepted by default. If you want to, modify your configuration like this:

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    proxy: {
      '/api': {
        target: 'https://other-server.example.com',
        secure: false
      }
    }
  }
}
```

Sometimes you don't want to proxy everything. It is possible to bypass the proxy based on the return value of a function.

In the function you get access to the request, response, and proxy options.

- Return `null` or `undefined` to continue processing the request with proxy.
- Return `false` to produce a 404 error for the request.
- Return a path to serve from, instead of continuing to proxy the request.

E.g. for a browser request, you want to serve an HTML page, but for an API request you want to proxy it. You could do something like this:

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        bypass: function (req, res, proxyOptions) {
          if (req.headers.accept.indexOf('html') !== -1) {
            console.log('Skipping proxy for browser request.')
            return '/index.html'
          }
        }
      }
    }
  }
}
```

If you want to proxy multiple, specific paths to the same target, you can use an array of one or more objects with a `context` property:

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    proxy: [
      {
        context: ['/auth', '/api'],
        target: 'http://localhost:3000'
      }
    ]
  }
}
```

Note that requests to root won't be proxied by default. To enable root proxying, the `fiveServer.index` option should be specified as a falsy value:

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    index: '', // specify to enable root proxying
    host: '...',
    contentBase: '...',
    proxy: {
      context: () => true,
      target: 'http://localhost:1234'
    }
  }
}
```

The origin of the host header is kept when proxying by default, you can set `changeOrigin` to `true` to override this behaviour. It is useful in some cases like using [name-based virtual hosted sites](https://en.wikipedia.org/wiki/Virtual_hosting#Name-based).

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
}
```

## `fiveServer.public`

`string`

When using _inline mode_ and you're proxying five-server, the inline client script does not always know where to connect to. It will try to guess the URL of the server based on `window.location`, but if that fails you'll need to use this.

For example, the five-server is proxied by nginx, and available on `myapp.test`:

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    public: 'myapp.test:80'
  }
}
```

Usage via the CLI

```bash
npx webpack serve --public myapp.test:80
```

## `fiveServer.publicPath` 🔑

`string = '/'`

The bundled files will be available in the browser under this path.

Imagine that the server is running under `http://localhost:8080` and [`output.filename`](/configuration/output/#outputfilename) is set to `bundle.js`. By default the `fiveServer.publicPath` is `'/'`, so your bundle is available as `http://localhost:8080/bundle.js`.

Change `fiveServer.publicPath` to put bundle under specific directory:

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    publicPath: '/assets/'
  }
}
```

The bundle will now be available as `http://localhost:8080/assets/bundle.js`.

T> Make sure `fiveServer.publicPath` always starts and ends with a forward slash.

It is also possible to use a full URL.

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    publicPath: 'http://localhost:8080/assets/'
  }
}
```

The bundle will also be available as `http://localhost:8080/assets/bundle.js`.

T> It is recommended that `fiveServer.publicPath` is the same as [`output.publicPath`](/configuration/output/#outputpublicpath).

## `fiveServer.quiet` 🔑

`boolean`

With `fiveServer.quiet` enabled, nothing except the initial startup information will be written to the console. This also means that errors or warnings from webpack are not visible.

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    quiet: true
  }
}
```

Usage via the CLI

```bash
npx webpack serve --quiet
```

## `fiveServer.serveIndex`

`boolean = true`

Tells five-server to use [`serveIndex`](https://github.com/expressjs/serve-index) middleware when enabled.

[`serveIndex`](https://github.com/expressjs/serve-index) middleware generates directory listings on viewing directories that don't have an index.html file.

```javascript
module.exports = {
  //...
  fiveServer: {
    serveIndex: true
  }
}
```

## `fiveServer.setup`

`function (app, server)`

W> This option is **deprecated** in favor of [`fiveServer.before`](#devserverbefore) and will be removed in v3.0.0.

Here you can access the Express app object and add your own custom middleware to it.
For example, to define custom handlers for some paths:

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    setup: function (app, server) {
      app.get('/some/path', function (req, res) {
        res.json({ custom: 'response' })
      })
    }
  }
}
```

## `fiveServer.sockHost`

`string`

Tells clients connected to `fiveServer` to use provided socket host.

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    sockHost: 'myhost.test'
  }
}
```

## `fiveServer.sockPath`

`string = '/sockjs-node'`

The path at which to connect to the reloading socket.

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    sockPath: '/socket'
  }
}
```

Usage via the CLI

```bash
npx webpack serve --sock-path /socket
```

## `fiveServer.sockPort`

`number` `string`

Tells clients connected to `fiveServer` to use provided socket port.

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    sockPort: 8080
  }
}
```

## `fiveServer.staticOptions`

`object`

It is possible to configure advanced options for serving static files from `contentBase`. See the [Express documentation](http://expressjs.com/en/4x/api.html#express.static) for the possible options.

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    staticOptions: {
      redirect: false
    }
  }
}
```

T> This only works when using [`fiveServer.contentBase`](#devservercontentbase) as a `string`.

## `fiveServer.stats` 🔑

`string: 'none' | 'errors-only' | 'minimal' | 'normal' | 'verbose'` `object`

This option lets you precisely control what bundle information gets displayed. This can be a nice middle ground if you want some bundle information, but not all of it.

To show only errors in your bundle:

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    stats: 'errors-only'
  }
}
```

For more information, see the [**stats documentation**](/configuration/stats/).

T> This option has no effect when used with `quiet` or `noInfo`.

## `fiveServer.stdin` - CLI only

`boolean`

This option closes the server when stdin ends.

```bash
npx webpack serve --stdin
```

## `fiveServer.transportMode`

`string = 'sockjs': 'sockjs' | 'ws'` `object`

W> `transportMode` is an experimental option, meaning its usage could potentially change without warning.

T> Providing a string to `fiveServer.transportMode` is a shortcut to setting both `fiveServer.transportMode.client` and `fiveServer.transportMode.server` to the given string value.

This option allows us either to choose the current `fiveServer` transport mode for client/server individually or to provide custom client/server implementation. This allows to specify how browser or other client communicates with the `fiveServer`.

The current default mode is [`'sockjs'`](https://www.npmjs.com/package/sockjs). This mode uses [SockJS-node](https://github.com/sockjs/sockjs-node) as a server, and [SockJS-client](https://www.npmjs.com/package/sockjs-client) on the client.

`'ws'` mode will become the default mode in the next major `fiveServer` version. This mode uses [ws](https://www.npmjs.com/package/ws) as a server, and native WebSockets on the client.

Use `'ws'` mode:

```javascript
module.exports = {
  //...
  fiveServer: {
    transportMode: 'ws'
  }
}
```

T> When providing a custom client and server implementation make sure that they are compatible with one another to communicate successfully.

### `fiveServer.transportMode.client`

`string` `path`

To create a custom client implementation, create a class that extends [`BaseClient`](https://github.com/webpack/five-server/blob/master/client-src/clients/BaseClient.js).

Using path to `CustomClient.js`, a custom WebSocket client implementation, along with the compatible `'ws'` server:

```javascript
module.exports = {
  //...
  fiveServer: {
    transportMode: {
      client: require.resolve('./CustomClient'),
      server: 'ws'
    }
  }
}
```

### `fiveServer.transportMode.server`

`string` `path` `function`

To create a custom server implementation, create a class that extends [`BaseServer`](https://github.com/webpack/five-server/blob/master/lib/servers/BaseServer.js).

Using path to `CustomServer.js`, a custom WebSocket server implementation, along with the compatible `'ws'` client:

```javascript
module.exports = {
  //...
  fiveServer: {
    transportMode: {
      client: 'ws',
      server: require.resolve('./CustomServer')
    }
  }
}
```

Using class exported by `CustomServer.js`, a custom WebSocket server implementation, along with the compatible `'ws'` client:

```javascript
module.exports = {
  //...
  fiveServer: {
    transportMode: {
      client: 'ws',
      server: require('./CustomServer')
    }
  }
}
```

Using custom, compatible WebSocket client and server implementations:

```javascript
module.exports = {
  //...
  fiveServer: {
    transportMode: {
      client: require.resolve('./CustomClient'),
      server: require.resolve('./CustomServer')
    }
  }
}
```

## `fiveServer.useLocalIp`

`boolean`

This option lets the browser open with your local IP.

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    useLocalIp: true
  }
}
```

Usage via the CLI

```bash
npx webpack serve --use-local-ip
```

## `fiveServer.watchContentBase`

`boolean`

Tell five-server to watch the files served by the [`fiveServer.contentBase`](#devservercontentbase) option. It is disabled by default. When enabled, file changes will trigger a full page reload.

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    watchContentBase: true
  }
}
```

Usage via the CLI

```bash
npx webpack serve --watch-content-base
```

## `fiveServer.watchOptions` 🔑

`object`

Control options related to watching the files.

webpack uses the file system to get notified of file changes. In some cases, this does not work. For example, when using Network File System (NFS). [Vagrant](https://www.vagrantup.com/) also has a lot of problems with this. In these cases, use polling:

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    watchOptions: {
      poll: true
    }
  }
}
```

If this is too heavy on the file system, you can change this to an integer to set the interval in milliseconds.

See [WatchOptions](/configuration/watch/) for more options.

## `fiveServer.writeToDisk` 🔑

`boolean = false` `function (filePath) => boolean`

Tells `fiveServer` to write generated assets to the disk. The output is written to the [output.path](/configuration/output/#outputpath) directory.

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    writeToDisk: true
  }
}
```

Providing a `Function` to `fiveServer.writeToDisk` can be used for filtering. The function follows the same premise as [`Array#filter`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) in which a boolean return value tells if the file should be written to disk.

**fiveserver.config.js**

```javascript
module.exports = {
  //...
  fiveServer: {
    writeToDisk: filePath => {
      return /superman\.css$/.test(filePath)
    }
  }
}
```

T> It is possible to set any Node.js flags via `NODE_OPTIONS`, for example, to configure `HTTP_MAX_HEADER_SIZE`:

**package.json**

```json
{
  "scripts": "NODE_OPTIONS='--max-http-header-size=100000' webpack serve"
}
```
