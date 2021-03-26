/* eslint-disable sort-imports */

import chokidar from 'chokidar'
import { error, getConfigFile, removeLeadingSlash } from './misc'
import fs from 'fs'
import http from 'http'
import logger from 'morgan'
import os from 'os'
import path from 'path'

// FIX: Packages are not maintained anymore (replace them!)
import express from 'express' // const connect = require('connect')
import serveIndex from './dependencies/serve-index' // const serveIndex = require('serve-index')

// MOD: Replaced "faye-websocket" by "ws"
// const WebSocket: any = require('faye-websocket')
import WebSocket from 'ws' // eslint-disable-line sort-imports

// MOD: Replaced "opn" by "open"
// const open = require('opn')
import open from 'open'
import { colors } from './colors'
import { ProxyMiddlewareOptions } from './dependencies/proxy-middleware'
import { entryPoint, staticServer } from './staticServer'
import { LiveServerParams } from './types'

export { LiveServerParams }

const INJECTED_CODE = fs.readFileSync(path.join(__dirname, '../injected.html'), 'utf8')

interface ExtendedWebSocket extends WebSocket {
  sendWithDelay: (data: any, cb?: ((err?: Error | undefined) => void) | undefined) => void
  file: string
}

export default class LiveServer {
  public httpServer!: http.Server
  public watcher!: chokidar.FSWatcher
  public logLevel = 2
  public injectBody = false

  // WebSocket clients
  clients: ExtendedWebSocket[] = []

  public get isRunning() {
    return !!this.httpServer?.listening
  }

  /** Start five-server */
  public async start(options: LiveServerParams = {}): Promise<http.Server> {
    if (this.isRunning) await this.shutdown()

    if (!options._cli) {
      const opts = getConfigFile(options.configFile)
      options = { ...opts, ...options }
    }

    const {
      browser = null,
      cors = false,
      file,
      host = 'localhost', // '0.0.0.0'
      htpasswd = null,
      https = null,
      logLevel = 2,
      middleware = [],
      mount = [],
      injectCss = true,
      injectBody = false,
      port = 8080,
      proxy = [],
      wait = 100
    } = options

    this.injectBody = injectBody

    const root = options.root || process.cwd()
    const watchPaths = options.watch || [root]

    let openPath = options.open
    if (typeof openPath === 'string') openPath = removeLeadingSlash(openPath)
    else if (Array.isArray(openPath)) openPath.map(o => removeLeadingSlash(o))
    else if (openPath === undefined || openPath === true) openPath = ''
    else if (openPath === null || openPath === false) openPath = null

    if (options.noBrowser) openPath = null // Backwards compatibility with 0.7.0

    this.logLevel = logLevel

    const staticServerHandler = staticServer(root, { logLevel, injectedCode: INJECTED_CODE })

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

    app.use((req, res, next) => {
      if (req.url === '/fiveserver.js') {
        return res.sendFile(path.join(__dirname, '../injected.js'))
      }
      next()
    })

    // Add logger. Level 2 logs only errors
    if (this.logLevel === 2) {
      app.use(
        logger('dev', {
          skip: function (req, res) {
            return res.statusCode < 400
          }
        })
      )
      // Level 2 or above logs all requests
    } else if (this.logLevel > 2) {
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
    mount.forEach(mountRule => {
      const mountPath = path.resolve(process.cwd(), mountRule[1])
      if (!options.watch)
        // Auto add mount paths to wathing but only if exclusive path option is not given
        watchPaths.push(mountPath)
      app.use(mountRule[0], staticServer(mountPath, { logLevel, injectedCode: INJECTED_CODE }))
      if (this.logLevel >= 1) console.log('Mapping %s to "%s"', mountRule[0], mountPath)
    })
    proxy.forEach(proxyRule => {
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
      if (this.logLevel >= 1) console.log('Mapping %s to "%s"', proxyRule[0], proxyRule[1])
    })
    app
      .use(staticServerHandler) // Custom static server
      .use(entryPoint(staticServerHandler, file))
      .use(serveIndex(root, { icons: true }))

    let httpServer: http.Server
    let protocol
    if (https !== null) {
      let httpsConfig = https
      if (typeof https === 'string') {
        httpsConfig = require(path.resolve(process.cwd(), https))
      }
      httpServer = require(httpsModule).createServer(httpsConfig, app)
      protocol = 'https'
    } else {
      httpServer = http.createServer(app)
      protocol = 'http'
    }

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      // Handle server startup errors
      httpServer.addListener('error', e => {
        // @ts-ignore
        if (e.message === 'EADDRINUSE' || (e.code && e.code === 'EADDRINUSE')) {
          const serveURL = `${protocol}://${host}:${port}`
          console.log(colors('%s is already in use. Trying another port.', 'yellow'), serveURL)
          setTimeout(function () {
            httpServer.listen(0, host)
          }, 1000)
        } else {
          console.error(colors(e.toString(), 'red'))
          this.shutdown()
          return reject(colors(e.toString(), 'red'))
        }
      })

      // Handle successful httpServer
      httpServer.addListener('listening', (/*e*/) => {
        this.httpServer = httpServer

        const address = httpServer.address() as any
        const serveHost = address.address === '0.0.0.0' ? '127.0.0.1' : address.address
        const openHost = host === '0.0.0.0' ? '127.0.0.1' : host

        const serveURL = `${protocol}://${serveHost}:${address.port}`
        const openURL = `${protocol}://${openHost}:${address.port}`

        resolve(httpServer)

        let serveURLs: any = [serveURL]
        if (this.logLevel > 2 && address.address === '0.0.0.0') {
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
        if (this.logLevel >= 1) {
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
              if (browser) open(`${openURL}/${p}`, { app: { name: browser } })
              else open(`${openURL}/${p}`)
            })
          } else {
            if (browser) open(`${openURL}/${openPath}`, { app: { name: browser } })
            else open(`${openURL}/${openPath}`)
          }
      })

      // Setup server to listen at port
      await httpServer.listen(port, host)

      // server.addListener('upgrade', function (request, socket, head) {
      //   let ws: any = new WebSocket(request, socket, head)

      const wss = new WebSocket.Server({ server: httpServer })

      wss.on('connection', (ws: ExtendedWebSocket) => {
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

        ws.on('message', data => {
          try {
            if (typeof data === 'string') {
              const json = JSON.parse(data)
              if (json && json.file) {
                ws.file = json.file
              }
            }
          } catch (err) {
            //
          }
        })

        ws.on('open', () => {
          ws.send('connected')
        })

        ws.on('close', () => {
          this.clients = this.clients.filter(function (x) {
            return x !== ws
          })
        })

        this.clients.push(ws)
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
      this.watcher = chokidar.watch(watchPaths, {
        ignored: ignored,
        ignoreInitial: true
      })
      const handleChange = changePath => {
        const htmlChange = path.extname(changePath) === '.html'
        if (htmlChange && injectBody) return

        const cssChange = path.extname(changePath) === '.css' && injectCss
        if (this.logLevel >= 1) {
          if (cssChange) console.log(colors('CSS change detected', 'magenta'), changePath)
          else console.log(colors('Change detected', 'cyan'), changePath)
        }
        this.clients.forEach(ws => {
          if (ws) ws.sendWithDelay(cssChange ? 'refreshcss' : 'reload')
        })
      }
      this.watcher
        .on('change', handleChange)
        .on('add', handleChange)
        .on('unlink', handleChange)
        .on('addDir', handleChange)
        .on('unlinkDir', handleChange)
        .on('ready', () => {
          if (this.logLevel >= 1) console.log(colors('Ready for changes', 'cyan'))
        })
        .on('error', err => {
          console.log(colors('ERROR:', 'red'), err)
        })
    })
  }

  /** Reloads all browser windows */
  public reloadBrowserWindow() {
    this.clients.forEach(ws => {
      if (ws) ws.sendWithDelay('reload')
    })
  }

  /** Manually refresh css */
  public refreshCSS() {
    this.clients.forEach(ws => {
      if (ws) ws.sendWithDelay('refreshcss')
    })
  }

  /** Inject new HTML into the body (VSCode only) */
  public updateBody(body: string, file: string) {
    this.clients.forEach(ws => {
      if (ws && ws.file === file) ws.sendWithDelay(body)
    })
  }

  /** Close five-server (same as shutdown()) */
  public get close() {
    return this.shutdown
  }

  /** Shutdown five-server */
  public async shutdown(): Promise<void> {
    const watcher = this.watcher
    if (watcher) {
      await watcher.close()
    }
    const httpServer = this.httpServer

    return new Promise((resolve, reject) => {
      if (httpServer && httpServer.listening)
        httpServer.close(err => {
          if (err) return reject(err.message)
          else return resolve()
        })
    })
  }
}
