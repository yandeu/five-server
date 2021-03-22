/* eslint-disable sort-imports */

import chokidar from 'chokidar'
import { error, escape, getConfigFile } from './misc'
import fs from 'fs'
import http from 'http'
import logger from 'morgan'
import os from 'os'
import path from 'path'

// FIX: Packages are not maintained anymore (replace them!)
import express from 'express' // const connect = require('connect')
import serveIndex from './dependencies/serve-index' // const serveIndex = require('serve-index')
import send from './dependencies/send'
const es = require('event-stream') // looks ok for now (https://david-dm.org/dominictarr/event-stream)

// MOD: Replaced "faye-websocket" by "ws"
// const WebSocket: any = require('faye-websocket')
import WebSocket from 'ws' // eslint-disable-line sort-imports

// MOD: Replaced "opn" by "open"
// const open = require('opn')
import open from 'open'
import { colors } from './colors'
import { ProxyMiddlewareOptions } from './dependencies/proxy-middleware'

const INJECTED_CODE = fs.readFileSync(path.join(__dirname, '../injected.html'), 'utf8')

// Based on connect.static(), but streamlined and with added code injecter
const staticServer = root => {
  let isFile = false
  try {
    // For supporting mounting files instead of just directories
    isFile = fs.statSync(root).isFile()
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
  return function (req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    const baseURL = `http://${req.headers.host}/`
    const reqUrl = new URL(req.url, baseURL)
    const reqpath = isFile ? '' : reqUrl.pathname
    const hasNoOrigin = !req.headers.origin
    const injectCandidates = [new RegExp('</body>', 'i'), new RegExp('</head>', 'i'), new RegExp('</svg>')]
    let injectTag: any = null

    function directory() {
      const baseURL = `http://${req.headers.host}/`
      const reqUrl = new URL(req.url, baseURL)
      const pathname = reqUrl.pathname
      res.statusCode = 301
      res.setHeader('Location', `${pathname}/`)
      res.end(`Redirecting to ${escape(pathname)}/`)
    }

    function file(filepath /*, stat*/) {
      const x = path.extname(filepath).toLocaleLowerCase()
      const possibleExtensions = ['', '.html', '.htm', '.xhtml', '.php', '.svg']
      let match

      if (hasNoOrigin && possibleExtensions.indexOf(x) > -1) {
        // TODO: Sync file read here is not nice, but we need to determine if the html should be injected or not
        const contents = fs.readFileSync(filepath, 'utf8')
        for (let i = 0; i < injectCandidates.length; ++i) {
          match = injectCandidates[i].exec(contents)
          if (match) {
            injectTag = match[0]
            break
          }
        }
        if (injectTag === null && LiveServer.logLevel >= 3) {
          console.warn(
            colors('Failed to inject refresh script!', 'yellow'),
            "Couldn't find any of the tags ",
            injectCandidates,
            'from',
            filepath
          )
        }
      }
    }

    function error(err) {
      if (err.status === 404) return next()
      next(err)
    }

    function inject(stream) {
      if (injectTag) {
        // We need to modify the length given to browser
        const len = INJECTED_CODE.length + res.getHeader('Content-Length')
        res.setHeader('Content-Length', len)
        const originalPipe = stream.pipe
        stream.pipe = function (resp) {
          originalPipe.call(stream, es.replace(new RegExp(injectTag, 'i'), INJECTED_CODE + injectTag)).pipe(resp)
        }
      }
    }

    send(req, reqpath, { root: root })
      .on('error', error)
      .on('directory', directory)
      .on('file', file)
      .on('stream', inject)
      .pipe(res)
  }
}

/**
 * Rewrite request URL and pass it back to the static handler.
 * @param staticHandler {function} Next handler
 * @param file {string} Path to the entry point file
 */
const entryPoint = (staticHandler, file) => {
  if (!file)
    return function (req, res, next) {
      next()
    }

  return function (req, res, next) {
    req.url = `/${file}`
    staticHandler(req, res, next)
  }
}

/** five-server start params */
export interface LiveServerParams {
  /** When set, serve this file (server root relative) for every 404 (useful for single-page applications). */
  file?: string
  /**  Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP. */
  host?: string
  /** Path to htpasswd file to enable HTTP Basic authentication */
  htpasswd?: string
  /** Comma-separated string for paths to ignore. */
  ignore?: string
  /** Ignore files by RegExp. */
  ignorePattern?: any
  /** 0 = errors only, 1 = some, 2 = lots */
  logLevel?: 0 | 1 | 2
  /** Mount a directory to a route, e.g. [['/components', './node_modules']].*/
  mount?: string[][]
  /** Takes an array of Connect-compatible middleware that are injected into the server middleware stack. */
  middleware?: Array<(req: any, res: any, next: any) => void>
  /** Don't inject CSS changes, just reload as with any other file change. */
  noCssInject?: boolean
  /** Subpath(s) to open in browser, use false to suppress launch. */
  open?: string | string[] | boolean
  /** Set the server port. Defaults to 8080. */
  port?: number
  /** Set root directory that's being served. Defaults to cwd. */
  root?: string
  /** Waits for all changes, before reloading. Defaults to 0 sec. */
  wait?: number
  /** Paths to exclusively watch for changes */
  watch?: string[]

  /** @deprecated Use open instead */
  noBrowser?: boolean

  spa?: boolean
  browser?: string
  cors?: boolean
  https?: any
  proxy?: any
  httpsModule?: any
  configFile?: any

  _cli?: boolean
}

export default class LiveServer {
  static server: http.Server
  static watcher: chokidar.FSWatcher
  static logLevel = 2

  /** Start five-server */
  public static async start(options: LiveServerParams = {}): Promise<http.Server> {
    if (!options._cli) {
      const opts = getConfigFile(options.configFile)
      options = { ...opts, ...options }
    }

    const {
      browser = null,
      cors = false,
      file,
      host = '0.0.0.0',
      htpasswd = null,
      https = null,
      logLevel = 2,
      middleware = [],
      mount = [],
      noCssInject,
      port = 8080,
      proxy = [],
      wait = 100
    } = options

    const root = options.root || process.cwd()
    const watchPaths = options.watch || [root]

    LiveServer.logLevel = logLevel

    let openPath =
      options.open === undefined || options.open === true
        ? ''
        : options.open === null || options.open === false
        ? null
        : options.open

    if (options.noBrowser) openPath = null // Backwards compatibility with 0.7.0

    const staticServerHandler = staticServer(root)

    let httpsModule = options.httpsModule

    if (httpsModule) {
      try {
        require.resolve(httpsModule)
      } catch (e) {
        console.error(colors(`HTTPS module "${httpsModule}" you've provided was not found.`, 'red'))
        console.error('Did you do', `"npm install ${httpsModule}"?`)
        // @ts-ignore
        return
      }
    } else {
      httpsModule = 'https'
    }

    // Setup a web server
    const app = express()

    // Add logger. Level 2 logs only errors
    if (LiveServer.logLevel === 2) {
      app.use(
        logger('dev', {
          skip: function (req, res) {
            return res.statusCode < 400
          }
        })
      )
      // Level 2 or above logs all requests
    } else if (LiveServer.logLevel > 2) {
      app.use(logger('dev'))
    }
    if (options.spa) {
      // @ts-expect-error
      middleware.push('spa')
    }
    // Add middleware
    middleware.map(function (mw) {
      if (typeof mw === 'string') {
        const ext = path.extname(mw).toLocaleLowerCase()
        // TODO: Try to use a better import syntax
        // require().default does just not look right :/
        if (ext !== '.js') {
          mw = require(path.join(__dirname, 'middleware', `${mw}.js`)).default
        } else {
          mw = require(mw)
        }
        if (typeof mw !== 'function') error(`middleware ${mw} does not return a function`)
      }
      app.use(mw)
    })

    // Use http-auth if configured
    if (htpasswd !== null) {
      // TODO: Replace http-auth with a lib that does not have native code
      error('Sorry htpasswd does not work yet.')
      // const auth = require('http-auth')
      // const authConnect = require('http-auth-connect')
      // const basic = auth.basic({
      //   realm: 'Please authorize',
      //   file: htpasswd
      // })
      // app.use(authConnect(basic))
    }
    if (cors) {
      app.use(
        require('cors')({
          origin: true, // reflecting request origin
          credentials: true // allowing requests with credentials
        })
      )
    }
    mount.forEach(function (mountRule) {
      const mountPath = path.resolve(process.cwd(), mountRule[1])
      if (!options.watch)
        // Auto add mount paths to wathing but only if exclusive path option is not given
        watchPaths.push(mountPath)
      app.use(mountRule[0], staticServer(mountPath))
      if (LiveServer.logLevel >= 1) console.log('Mapping %s to "%s"', mountRule[0], mountPath)
    })
    proxy.forEach(function (proxyRule) {
      const url = new URL(proxyRule[1])

      const proxyOpts: ProxyMiddlewareOptions = {
        hash: url.hash,
        host: url.host,
        hostname: url.hostname,
        href: url.href,
        origin: url.origin,
        password: url.password,
        path: url.pathname + url.search,
        pathname: url.pathname,
        port: url.port,
        preserveHost: true,
        protocol: url.protocol,
        search: url.search,
        searchParams: url.searchParams,
        username: url.username,
        via: true
      }

      app.use(proxyRule[0], require('./dependencies/proxy-middleware')(proxyOpts))
      if (LiveServer.logLevel >= 1) console.log('Mapping %s to "%s"', proxyRule[0], proxyRule[1])
    })
    app
      .use(staticServerHandler) // Custom static server
      .use(entryPoint(staticServerHandler, file))
      .use(serveIndex(root, { icons: true }))

    let server: http.Server
    let protocol
    if (https !== null) {
      let httpsConfig = https
      if (typeof https === 'string') {
        httpsConfig = require(path.resolve(process.cwd(), https))
      }
      server = require(httpsModule).createServer(httpsConfig, app)
      protocol = 'https'
    } else {
      server = http.createServer(app)
      protocol = 'http'
    }

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      // Handle server startup errors
      server.addListener('error', function (e) {
        // @ts-ignore
        if (e.message === 'EADDRINUSE' || (e.code && e.code === 'EADDRINUSE')) {
          const serveURL = `${protocol}://${host}:${port}`
          console.log(colors('%s is already in use. Trying another port.', 'yellow'), serveURL)
          setTimeout(function () {
            server.listen(0, host)
          }, 1000)
        } else {
          console.error(colors(e.toString(), 'red'))
          LiveServer.shutdown()
          return reject(colors(e.toString(), 'red'))
        }
      })

      // Handle successful server
      server.addListener('listening', function (/*e*/) {
        LiveServer.server = server

        const address = server.address() as any
        const serveHost = address.address === '0.0.0.0' ? '127.0.0.1' : address.address
        const openHost = host === '0.0.0.0' ? '127.0.0.1' : host

        const serveURL = `${protocol}://${serveHost}:${address.port}`
        const openURL = `${protocol}://${openHost}:${address.port}`

        resolve(server)

        let serveURLs: any = [serveURL]
        if (LiveServer.logLevel > 2 && address.address === '0.0.0.0') {
          const ifaces = os.networkInterfaces()

          serveURLs = Object.keys(ifaces).map(iface => {
            return ifaces[iface]
          })

          serveURLs = serveURLs
            // flatten address data, use only IPv4
            .reduce(function (data, addresses) {
              addresses
                .filter(function (addr) {
                  return addr.family === 'IPv4'
                })
                .forEach(function (addr) {
                  data.push(addr)
                })
              return data
            }, [])
            .map(function (addr) {
              return `${protocol}://${addr.address}:${address.port}`
            })
        }

        // Output
        if (LiveServer.logLevel >= 1) {
          if (serveURL === openURL)
            if (serveURLs.length === 1) {
              console.log(colors('Serving "%s" at %s', 'green'), root, serveURLs[0])
            } else {
              console.log(colors('Serving "%s" at\n\t%s', 'green'), root, serveURLs.join('\n\t'))
            }
          else console.log(colors('Serving "%s" at %s (%s)', 'green'), root, openURL, serveURL)
        }

        // Launch browser
        if (openPath !== null)
          if (typeof openPath === 'object') {
            openPath.forEach(function (p) {
              if (browser) open(openURL + p, { app: { name: browser } })
              else open(openURL + p)
            })
          } else {
            if (browser) open(openURL + openPath, { app: { name: browser } })
            else open(openURL + openPath)
          }
      })

      // Setup server to listen at port
      await server.listen(port, host)

      // WebSocket
      let clients: any[] = []
      // server.addListener('upgrade', function (request, socket, head) {
      //   let ws: any = new WebSocket(request, socket, head)

      const wss = new WebSocket.Server({ server })

      wss.on('connection', ws => {
        // @ts-ignore
        ws.sendWithDelay = (data: any, cb?: ((err?: Error | undefined) => void) | undefined) => {
          setTimeout(
            () => {
              ws.send(data, e => {
                if (cb) cb(e)
              })
            },
            wait,
            { once: true }
          )
        }

        // ws.on('error', err => {
        //   console.log('WS ERROR:', err)
        // })

        ws.on('open', () => {
          ws.send('connected')
        })

        ws.on('close', () => {
          clients = clients.filter(function (x) {
            return x !== ws
          })
        })

        clients.push(ws)
      })

      let ignored: any = [
        function (testPath) {
          // Always ignore dotfiles (important e.g. because editor hidden temp files)
          return testPath !== '.' && /(^[.#]|(?:__|~)$)/.test(path.basename(testPath))
        }
      ]
      if (options.ignore) {
        ignored = ignored.concat(options.ignore)
      }
      if (options.ignorePattern) {
        ignored.push(options.ignorePattern)
      }
      // Setup file watcher
      LiveServer.watcher = chokidar.watch(watchPaths, {
        ignored: ignored,
        ignoreInitial: true
      })
      function handleChange(changePath) {
        const cssChange = path.extname(changePath) === '.css' && !noCssInject
        if (LiveServer.logLevel >= 1) {
          if (cssChange) console.log(colors('CSS change detected', 'magenta'), changePath)
          else console.log(colors('Change detected', 'cyan'), changePath)
        }
        clients.forEach(function (ws) {
          if (ws) ws.sendWithDelay(cssChange ? 'refreshcss' : 'reload')
        })
      }
      LiveServer.watcher
        .on('change', handleChange)
        .on('add', handleChange)
        .on('unlink', handleChange)
        .on('addDir', handleChange)
        .on('unlinkDir', handleChange)
        .on('ready', function () {
          if (LiveServer.logLevel >= 1) console.log(colors('Ready for changes', 'cyan'))
        })
        .on('error', function (err) {
          console.log(colors('ERROR:', 'red'), err)
        })
    })
  }

  /** Shutdown five-server */
  public static shutdown() {
    const watcher = LiveServer.watcher
    if (watcher) {
      watcher.close()
    }
    const server = LiveServer.server
    if (server) server.close()
  }
}
