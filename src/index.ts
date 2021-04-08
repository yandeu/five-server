/* eslint-disable sort-imports */

/**
 * @copyright   Copyright (c) 2012 Tapio Vierros (https://github.com/tapio)
 * @copyright   Copyright (c) 2021 Yannick Deubel (https://github.com/yandeu)
 * @license     {@link https://github.com/yandeu/five-server/blob/main/LICENSE.md|LICENSE}
 */

import chokidar from 'chokidar'
import { error, getConfigFile, removeLeadingSlash } from './misc'
import fs from 'fs'
import http from 'http'
import https from 'https'
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
import { Colors, colors } from './colors'
import { ProxyMiddlewareOptions } from './dependencies/proxy-middleware'
import { entryPoint, staticServer } from './staticServer'
import { Certificate, LiveServerParams } from './types'
import { getCertificate } from './utils/getCertificate'
import { getNetworkAddress } from './utils/getNetworkAddress'

// execute php
import { ExecPHP } from './utils/execPHP'
const PHP = new ExecPHP()

export { LiveServerParams }

// const INJECTED_CODE = fs.readFileSync(path.join(__dirname, '../injected.html'), 'utf8')
const INJECTED_CODE = fs.readFileSync(path.join(__dirname, '../injected.js'), 'utf8')

interface ExtendedWebSocket extends WebSocket {
  sendWithDelay: (data: any, cb?: ((err?: Error | undefined) => void) | undefined) => void
  file: string
  ip: string
  color: Colors
}

export default class LiveServer {
  public httpServer!: http.Server
  public watcher!: chokidar.FSWatcher
  public logLevel = 2
  public injectBody = false

  private colors: Colors[] = ['blue', 'magenta', 'cyan', 'green', 'red', 'yellow']
  private colorIndex = -1
  private newColor = () => {
    this.colorIndex++
    return this.colors[this.colorIndex % this.colors.length]
  }

  // WebSocket clients
  public clients: ExtendedWebSocket[] = []

  // http sockets
  public sockets: Set<any> = new Set()

  private _openURL!: string
  private _protocol!: 'http' | 'https'

  public get openURL() {
    return this._openURL
  }

  public get protocol() {
    return this._protocol
  }

  public get isRunning() {
    return !!this.httpServer?.listening
  }

  /** Start five-server */
  public async start(options: LiveServerParams = {}): Promise<void> {
    if (!options._cli) {
      const opts = getConfigFile(options.configFile, options.workspace)
      options = { ...opts, ...options }
    }

    const {
      browser = null,
      cors = false,
      file,
      htpasswd = null,
      https: _https = null,
      injectBody = false,
      injectCss = true,
      logLevel = 2,
      middleware = [],
      mount = [],
      php,
      phpIni,
      port = 8080,
      proxy = [],
      remoteLogs = false,
      useLocalIp = false,
      wait = 100,
      withExtension = 'unset',
      workspace
    } = options

    PHP.path = php
    PHP.ini = phpIni

    let host = options.host || 'localhost' // '0.0.0.0'
    if (useLocalIp && host === 'localhost') host = '0.0.0.0'

    this.injectBody = injectBody

    let watch = options.watch
    if (watch === true) watch = undefined
    if (watch === false) watch = false
    else if (watch && !Array.isArray(watch)) watch = [watch]

    const root = options.root || process.cwd()
    const rootPath = workspace ? path.join(workspace, options.root ? options.root : '') : root
    const watchPaths = watch || [rootPath]

    let openPath = options.open
    if (typeof openPath === 'string') openPath = removeLeadingSlash(openPath)
    else if (Array.isArray(openPath)) openPath.map(o => removeLeadingSlash(o))
    else if (openPath === undefined || openPath === true) openPath = ''
    else if (openPath === null || openPath === false) openPath = null

    if (options.noBrowser) openPath = null // Backwards compatibility with 0.7.0

    // if server is already running, just open a new browser window
    if (this.isRunning) {
      console.log(colors(`Opening new window at ${this.openURL}`, 'green'))
      this.launchBrowser(openPath, browser)
      return
    }

    this.logLevel = logLevel

    const staticServerHandler = staticServer(rootPath, { logLevel, injectedCode: INJECTED_CODE })

    // const httpsModule = 'https'

    // let httpsModule = options.httpsModule

    // if (httpsModule) {
    //   try {
    //     require.resolve(httpsModule)
    //   } catch (e) {
    //     console.error(colors(`HTTPS module "${httpsModule}" you've provided was not found.`, 'red'))
    //     console.error('Did you do', `"npm install ${httpsModule}"?`)
    //     // @ts-ignore
    //     return
    //   }
    // } else {
    //   httpsModule = 'https'
    // }

    // setup a web server
    const app = express()

    // enable CORS
    if (cors) app.use(require('cors')({ credentials: true }))

    // serve fiveserver files
    app.use((req, res, next) => {
      if (req.url === '/fiveserver.js') return res.type('.js').send(INJECTED_CODE)
      if (req.url === '/fiveserver') return res.json({ status: 'online' })

      next()
    })

    // serve files (.html, .php) with or without extension
    app.use(async (req, res, next) => {
      const isHtml = path.extname(req.url) === '.html'
      const isPhp = path.extname(req.url) === '.php'
      const isNon = path.extname(req.url) === ''

      if (withExtension === 'always' && isNon) return next()
      if (withExtension === 'avoid' && (isHtml || isPhp)) return next()
      if (withExtension === 'redirect') {
        if (isHtml || isPhp) {
          const reg = new RegExp(`${path.extname(req.url)}$`)
          return res.redirect(req.url.replace(reg, ''))
        }
      }

      // serve file without extension (if it exists)
      if (isNon) {
        // get the absolute path
        const absolute = path.resolve(path.join(rootPath + req.url))
        // check if .html file exists
        if (fs.existsSync(`${absolute}.html`)) req.url = req.url += '.html'
        // check if .php file exists
        else if (fs.existsSync(`${absolute}.php`)) req.url = req.url += '.php'
      }

      next()
    })

    // serve without file extension
    app.use(async (req, res, next) => {
      // check if the url has not dot
      if (/\/[\w-]+$/.test(req.url)) {
        // get the absolute path
        const absolute = path.join(path.resolve(), rootPath + req.url)
        // check if .html file exists
        if (fs.existsSync(`${absolute}.html`)) req.url = req.url += '.html'
        // check if .php file exists
        else if (fs.existsSync(`${absolute}.php`)) req.url = req.url += '.php'
      }

      next()
    })

    // serve php files as text/html
    app.use(async (req, res, next) => {
      if (/\.php$/.test(req.url)) {
        const filePath = path.resolve(path.join(rootPath + req.url))

        res.setHeader('Content-Type', 'text/html; charset=UTF-8')
        let html = await PHP.parseFile(filePath, res)

        html = html.replace(
          '</html>',
          `
    <!-- Code injected by Five-server -->
    <script async data-id="five-server" data-file="${filePath}" type="application/javascript" src="/fiveserver.js"></script>

  </html>`
        )

        res.send(html)
      } else {
        next()
      }
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

    mount.forEach(mountRule => {
      const mountPath = path.resolve(process.cwd(), mountRule[1])
      if (!options.watch)
        // Auto add mount paths to watching but only if exclusive path option is not given
        watchPaths.push(mountPath)

      // make sure mountRule[0] has a leading slash
      if (mountRule[0].indexOf('/') !== 0) mountRule[0] = `/${mountRule[0]}`

      // mount it with  express.static
      app.use(mountRule[0], express.static(mountPath))

      // log the mapping folder
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
      .use(serveIndex(rootPath, { icons: true }))

    if (_https !== null && _https !== false) {
      let httpsConfig = _https as Certificate

      if (typeof _https === 'string') {
        httpsConfig = require(path.resolve(process.cwd(), _https))
      }

      if (_https === true) {
        const fakeCert = getCertificate(path.join(workspace ? workspace : path.resolve(), '.cache'))
        httpsConfig = { key: fakeCert, cert: fakeCert }
      }

      this.httpServer = https.createServer(httpsConfig, app)
      this._protocol = 'https'
    } else {
      this.httpServer = http.createServer(app)
      this._protocol = 'http'
    }

    // Setup server to listen at port
    await this.listen(port, host)

    const address = this.httpServer.address() as any
    const serveHost = address.address === '0.0.0.0' ? '127.0.0.1' : address.address

    let openHost = host === '0.0.0.0' ? '127.0.0.1' : host
    if (useLocalIp) openHost = getNetworkAddress() || openHost

    const serveURL = `${this._protocol}://${serveHost}:${address.port}`
    this._openURL = `${this._protocol}://${openHost}:${address.port}`

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
        .map(addr => {
          return `${this._protocol}://${addr.address}:${address.port}`
        })
    }

    // Output
    if (this.logLevel >= 1) {
      if (serveURL === this.openURL)
        if (serveURLs.length === 1) {
          console.log(colors('Serving "%s" at %s', 'green'), root, serveURLs[0])
        } else {
          console.log(colors('Serving "%s" at\n\t%s', 'green'), root, serveURLs.join('\n\t'))
        }
      else console.log(colors('Serving "%s" at %s (%s)', 'green'), root, this.openURL, serveURL)
    }

    this.launchBrowser(openPath, browser)

    const wss = new WebSocket.Server({ server: this.httpServer })

    wss.on('connection', (ws: ExtendedWebSocket, req: any) => {
      if (remoteLogs !== false) ws.send('initRemoteLogs')
      ws.send('connected')

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

      ws.ip = req?.connection?.remoteAddress
      ws.color = typeof remoteLogs === 'string' ? remoteLogs : this.newColor()

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

            const useRemoteLogs = remoteLogs === true || typeof remoteLogs === 'string'
            if (useRemoteLogs && json && json.console) {
              const ip = `[${ws.ip}]`
              const msg = json.console.message
              const T = json.console.type
              const t = T === 'warn' ? ' (warn) ' : T === 'error' ? ' (error) ' : ' '

              console[T](colors(`${ip}${t}${msg}`, ws.color))
            }
          }
        } catch (err) {
          //
        }
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
    if (watch === false) return
    this.watcher = chokidar.watch(watchPaths as any, {
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
  }

  private async listen(port: any, host: any): Promise<void> {
    return new Promise((resolve, reject) => {
      // Handle server startup errors
      this.httpServer.once('error', e => {
        // @ts-ignore
        if (e.message === 'EADDRINUSE' || (e.code && e.code === 'EADDRINUSE')) {
          const serveURL = `${this._protocol}://${host}:${port}`
          console.log(colors('%s is already in use. Trying another port.', 'yellow'), serveURL)
          setTimeout(() => {
            this.listen(0, host) // 0 means random port
          }, 1000)
        } else {
          console.error(colors(e.toString(), 'red'))
          this.shutdown()
          reject(e.message)
        }
      })

      this.httpServer.on('connection', socket => {
        this.sockets.add(socket)
      })

      // Handle successful httpServer
      this.httpServer.once('listening', (/*e*/) => {
        resolve()
      })

      this.httpServer.listen(port, host)
    })
  }

  /**
   * Navigate the browser to another page.
   * @param url Navigates to the given URL.
   */
  public navigate(url: string) {
    this.clients.forEach(ws => {
      if (ws) ws.sendWithDelay(JSON.stringify({ navigate: url }))
    })
  }

  /** Launch a new browser window. */
  public async launchBrowser(
    path: string | boolean | string[] | null | undefined,
    browser: string | string[] | null = null
  ) {
    const launch = async (target: string, browser: string | string[] | null = null, index = -1) => {
      if (!browser) return await open(target)

      let res: any

      const opn = async (browser: string) => {
        const hasArguments = browser.includes('--')

        if (!hasArguments) {
          res = await open(target, { app: { name: browser } })
        }

        if (hasArguments) {
          const b = browser.split('--').map(c => c.trim())
          res = await open(target, {
            app: { name: b.shift() as string, arguments: b.map(arg => `--${arg}`) }
          })
        }
      }

      if (typeof browser === 'string') await opn(browser)

      if (Array.isArray(browser)) {
        index++
        await opn(browser[index])
      }

      const launchDefaultBrowser = () => {
        launch(target)
      }

      res.once('exit', code => {
        if (code && code > 0) {
          if (typeof browser === 'string') {
            console.log(colors(`Could not open browser "${browser}". Trying the default browser next.`, 'yellow'))
            launchDefaultBrowser()
          } else if (Array.isArray(browser)) {
            if (typeof browser[index + 1] === 'undefined') {
              console.log(
                colors(`Could not open browser "${browser[index]}". Trying the default browser next.`, 'yellow')
              )
              launchDefaultBrowser()
            } else {
              console.log(
                colors(`Could not open browser "${browser[index]}". Trying "${browser[index + 1]}" next.`, 'yellow')
              )

              launch(target, browser, index)
            }
          }
        }
      })
    }

    // Don't open a browser
    if (path === null) return

    // Try to open one browser from a list of browsers
    if (Array.isArray(path)) {
      for (const p of path) {
        await launch(`${this.openURL}/${p}`, browser)
      }
    }

    // Open browser "browser"
    if (typeof path === 'string') {
      await launch(`${this.openURL}/${path}`, browser)
    }
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
  public updateBody(file: string, body: string, position?: { line: number; character: number }) {
    this.clients.forEach(ws => {
      if (ws && ws.file === file) ws.sendWithDelay(JSON.stringify({ body, position }))
    })
  }

  public highlight(file: string, position: { line: number; character: number }) {
    this.clients.forEach(ws => {
      if (ws && ws.file === file) ws.sendWithDelay(JSON.stringify({ position }))
    })
  }

  /** Close five-server (same as shutdown()) */
  public get close() {
    return this.shutdown
  }

  /** Shutdown five-server */
  public async shutdown(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close()
    }

    for (const client of this.clients) {
      await client.close()
    }

    for (const socket of this.sockets) {
      socket.destroy()
      this.sockets.delete(socket)
    }

    return new Promise((resolve, reject) => {
      if (this.httpServer && this.httpServer.listening) {
        this.httpServer.close(err => {
          if (err) return reject(err.message)
          else {
            resolve()
            // @ts-ignore
            this.httpServer = null
          }
        })
      } else {
        return resolve()
      }
    })
  }
}
