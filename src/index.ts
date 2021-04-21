/* eslint-disable sort-imports */

/**
 * @copyright
 * Copyright (c) 2012 Tapio Vierros (https://github.com/tapio)
 * Copyright (c) 2021 Yannick Deubel (https://github.com/yandeu)
 *
 * @license {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 *
 * @description
 * forked from live-server@1.2.1 (https://github.com/tapio/live-server)
 * previously licensed under MIT (https://github.com/tapio/live-server#license)
 */

import chokidar from 'chokidar'
import { getConfigFile, removeLeadingSlash } from './misc'
import fs from 'fs'
import http from 'http'
import https from 'https'
import logger from 'morgan'
import os from 'os'
import path, { join, normalize } from 'path'

// FIX: Packages are not maintained anymore (replace them!)
import express from 'express' // const connect = require('connect')
import serveIndex, { htmlPath } from './serve-index' // const serveIndex = require('serve-index')

// MOD: Replaced "faye-websocket" by "ws"
// const WebSocket: any = require('faye-websocket')
import WebSocket from 'ws' // eslint-disable-line sort-imports

// MOD: Replaced "opn" by "open"
// const open = require('opn')
import open from 'open'
import { Colors, colors } from './colors'
import { ProxyMiddlewareOptions } from './dependencies/proxy-middleware'
import { injectCode, fallbackFile } from './inject'
import { Certificate, LiveServerParams } from './types'
import { getCertificate } from './utils/getCertificate'
import { getNetworkAddress } from './utils/getNetworkAddress'

// execute php
import { ExecPHP } from './utils/execPHP'
import { INJECTED_CODE, STATUS_CODE, PREVIEW } from './public'
import { message } from './msg'
const PHP = new ExecPHP()

// for hot body injections
import WorkerPool from './workerPool'
import type { Report } from 'html-validate'

export { LiveServerParams }

// extend WebSocket interface
interface ExtendedWebSocket extends WebSocket {
  sendWithDelay: (data: any, cb?: ((err?: Error | undefined) => void) | undefined) => void
  file: string
  ip: string
  color: Colors
}

export default class LiveServer {
  public httpServer!: http.Server
  public watcher!: chokidar.FSWatcher
  public logLevel = 1
  public injectBody = false

  /** inject stript to any file */
  public injectToAny = true

  private _parseBody: WorkerPool | undefined
  private _parseBody_IsValidHtml = true
  private _parseBody_updateBody(
    fileName: string,
    text: string,
    shouldHighlight: boolean = false,
    cursorPosition: { line: number; character: number } = { line: 0, character: 0 }
  ): void {
    this._parseBody?.postMessage(
      JSON.stringify({
        fileName,
        text,
        shouldHighlight,
        cursorPosition
      })
    )
  }

  public get parseBody() {
    if (this._parseBody) return { workers: this._parseBody, updateBody: this._parseBody_updateBody.bind(this) }

    this._parseBody = new WorkerPool('./workers/parseBody.js', {
      worker: 2,
      rateLimit: 50
    })

    this._parseBody.on('message', d => {
      const data = JSON.parse(d)
      if (data.ignore) return

      const { body, report, fileName } = data as {
        report: Report
        body: string
        fileName: string
      }

      if (report.valid) {
        this.updateBody(fileName, body)

        if (!this._parseBody_IsValidHtml) {
          this._parseBody_IsValidHtml = true
          this?.sendMessage(fileName, 'HIDE_MESSAGES')
        }
      } else {
        this._parseBody_IsValidHtml = false
        if (report.results.length > 0 && report.results[0].messages.length > 0) {
          const errors = report.results[0].messages.map(m => `${m.message}\n  at line: ${m.line}`)

          this.sendMessage(fileName, errors)
        }
      }
    })

    return { workers: this._parseBody, updateBody: this._parseBody_updateBody.bind(this) }
  }

  private colors: Colors[] = ['magenta', 'cyan', 'blue', 'green', 'yellow', 'red']
  private colorIndex = -1
  private newColor = () => {
    this.colorIndex++
    return this.colors[this.colorIndex % this.colors.length]
  }

  // WebSocket clients
  public clients: ExtendedWebSocket[] = []

  // http sockets
  public sockets: Set<any> = new Set()
  public ipColors: Map<string, Colors> = new Map()

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
      logLevel = 1,
      middleware = [],
      mount = [],
      php,
      phpIni,
      port = 5555,
      proxy = [],
      remoteLogs = false,
      useLocalIp = false,
      wait = 100,
      withExtension = 'unset',
      workspace
    } = options

    PHP.path = php
    PHP.ini = phpIni

    this.logLevel = message.logLevel = logLevel

    let host = options.host || '0.0.0.0' // 'localhost'
    if (useLocalIp && host === 'localhost') host = '0.0.0.0'

    this.injectBody = injectBody

    let _watch = options.watch
    if (_watch === true) _watch = ['.']

    if (_watch === false) _watch = false
    else if (_watch && !Array.isArray(_watch)) _watch = [_watch]

    if (typeof _watch === 'undefined') _watch = ['.']

    // tmp
    const _tmp = options.root || process.cwd()
    /** CWD (absolute path) */
    const cwd = workspace ? workspace : process.cwd()
    /** root (absolute path) */
    const root = workspace ? path.join(workspace, options.root ? options.root : '') : path.resolve(_tmp)
    /** file, dir, glob, or array => passed to chokidar.watch() (relative path to CWD) */
    const watch = _watch

    // console.log('cwd', cwd)
    // console.log('root', root)
    // console.log('watch', watch)

    let openPath = options.open
    if (typeof openPath === 'string') openPath = removeLeadingSlash(openPath)
    else if (Array.isArray(openPath)) openPath.map(o => removeLeadingSlash(o))
    else if (openPath === undefined || openPath === true) openPath = ''
    else if (openPath === null || openPath === false) openPath = null

    if (options.noBrowser) openPath = null // Backwards compatibility

    // if server is already running, just open a new browser window
    if (this.isRunning) {
      message.log(colors(`Opening new window at ${this.openURL}`, 'green'))
      this.launchBrowser(openPath, browser)
      return
    }

    /**
     * STEP: 1/4
     * Set up "express" server (https://www.npmjs.com/package/express)
     */

    // express.js
    const app = express()

    // enable CORS
    if (cors) app.use(require('cors')({ credentials: true }))

    // serve fiveserver files
    app.use((req, res, next) => {
      if (req.url === '/fiveserver.js') return res.type('.js').send(INJECTED_CODE)
      if (req.url === '/fiveserver/status') return res.json({ status: 'online' })

      next()
    })

    // fiveserver /public
    app.use('/fiveserver', express.static(path.join(__dirname, '../public')))

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
        const absolute = path.resolve(path.join(root + req.url))
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
        const absolute = path.join(path.resolve(), root + req.url)
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
        const filePath = path.resolve(path.join(root + req.url))
        if (!fs.existsSync(filePath)) return next()

        let html = await PHP.parseFile(filePath, res)

        const injectCandidates = [new RegExp('</head>', 'i'), new RegExp('</html>', 'i'), new RegExp('</body>', 'i')]
        let match
        let injectTag = ''

        for (let i = 0; i < injectCandidates.length; ++i) {
          match = injectCandidates[i].exec(html)
          if (match) {
            injectTag = match[0]
            break
          }
        }

        if (!injectTag) return next()

        res.setHeader('Content-Type', 'text/html; charset=UTF-8')

        html = html.replace(
          injectTag,
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

    // Use http-auth if configured
    if (htpasswd !== null) message.error('Sorry htpasswd does not work yet.', null, false)

    // Custom https module
    if (options.httpsModule) message.error('Sorry "httpsModule" has been removed.', null, false)

    // SPA middleware
    if (options.spa) message.error('Sorry SPA middleware has been removed.', null, false)

    // Add middleware
    middleware.map(function (mw) {
      if (typeof mw === 'string') {
        const ext = path.extname(mw).toLocaleLowerCase()
        if (ext !== '.js') {
          mw = require(path.join(__dirname, 'middleware', `${mw}.js`)).default
        } else {
          mw = require(mw)
        }
        if (typeof mw !== 'function') message.error(`middleware ${mw} does not return a function`, null, false)
      }
      app.use(mw)
    })

    mount.forEach(mountRule => {
      const mountPath = path.resolve(process.cwd(), mountRule[1])

      if (!options.watch && watch !== false)
        // Auto add mount paths to watching but only if exclusive path option is not given
        watch.push(mountPath)

      // make sure mountRule[0] has a leading slash
      if (mountRule[0].indexOf('/') !== 0) mountRule[0] = `/${mountRule[0]}`

      // mount it with express.static
      app.use(mountRule[0], express.static(mountPath))

      // log the mapping folder
      if (this.logLevel >= 1) message.log('Mapping %s to "%s"', mountRule[0], mountPath)
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
      if (this.logLevel >= 1) message.log('Mapping %s to "%s"', proxyRule[0], proxyRule[1])
    })

    const injectHandler = injectCode(root, { logLevel })

    // inject to .html and .php files
    app.use(injectHandler)

    const ignorePHP = handler => {
      return function (req, res, next) {
        if (path.extname(req.url) === '.php') next()
        else handler(req, res, next)
      }
    }

    // serve static files (ignore php files) // don't serve index files!
    // TODO(yandeu): Make "index" optional // { index: false }
    app.use(ignorePHP(express.static(root)))

    // inject to fallback "file"
    app.use(fallbackFile(injectHandler, file))

    // inject to any (converts and file to a .html file (if possible))
    app.use((req, res, next) => {
      if (!this.injectToAny) return next()
      if (!['.preview', '.php'].includes(path.extname(req.url))) return next()

      // remove .preview
      req.url = req.url.replace(/\.preview$/, '')
      const URL = decodeURI(req.url)

      const isPHP = path.extname(req.url) === '.php'
      const phpMsg = isPHP
        ? 'Why this preview? Five Server could not detect any head, body or html tag in your file.<br><br>'
        : ''

      try {
        const filePath = path.resolve(path.join(root + URL))

        const isFile = fs.statSync(filePath).isFile()
        if (!isFile) return next()

        let ext = path.extname(URL).replace(/^\./, '').toLowerCase()
        const fileName = path.basename(filePath, ext)

        const isImage = /(gif|jpg|jpeg|tiff|png|svg)$/i.test(ext)
        const isVideo = /(mpg|mpeg|avi|wmv|mov|ogg|webm|mp4|mkv)$/i.test(ext)
        const isAudio = /(mid|midi|wma|aac|wav|ogg|mp3|mp4)$/i.test(ext)
        const isPDF = /(pdf)$/i.test(ext)

        let preview = ''

        if (isImage)
          preview = `<div class="image" text-align:center; line-height: 0; padding: 0;">
        
        <img style="max-width: 100%;" src="${URL}"></div>`
        else if (isVideo) {
          const format = ext === 'ogg' ? 'ogg' : ext === 'webm' ? 'webm' : 'mp4'
          preview = `
          <video style="max-width: 100%;" controls>
            <source src="${URL}" type="video/${format}">
            Your browser does not support the video tag.
          </video>`
        } else if (isAudio) {
          const format = ext === 'ogg' ? 'ogg' : ext === 'wav' ? 'wav' : 'mpeg'
          preview = `
            <div style="margin-top: 72px;">
              <audio controls>
                <source src="${URL}" type="audio/${format}">
                Your browser does not support the audio element.
              </audio>
            </div>`
        } else if (isPDF) {
          preview = `
            <div>
              <iframe 
                style="min-height: calc(100vh - 260px)"
                frameborder="0" 
                scrolling="no"                
                width="100%" height="100%"
                src="${URL}">
              </iframe>
            </div>`
        } else {
          const MAX_FILE_SIZE = 250 // KB
          const fileSize = Math.round(fs.statSync(filePath).size / 1024) // KB
          const tooBig = fileSize > MAX_FILE_SIZE

          if (tooBig) ext = 'txt'

          let fileContent = !tooBig
            ? fs.readFileSync(filePath, { encoding: 'utf-8' })
            : `File is too big for a preview!\n\n\nFile Size: ${fileSize}KB\nAllowed Size: ${MAX_FILE_SIZE}KB`

          // check for .rc file (can be yml or json)
          if (/^\.[\w]+rc$/.test(fileName)) {
            const content = fileContent.trim()
            ext = content[0] === '{' ? 'json' : 'yml'
          }

          // replace all < with &lt;
          fileContent = fileContent.replace(/</gm, '&lt;')

          preview = `
            <div>
              <pre margin="0px;"><code class="">${fileContent}</code></pre>
            </div>`
        }

        const html = PREVIEW.replace('{linked-path}', htmlPath(URL))
          .replace('{fileName}', fileName)
          .replace('{ext}', ext)
          .replace('{phpMsg}', phpMsg)
          .replace('{preview}', preview)

        return res.type('html').send(html)
      } catch (error) {
        return next()
      }
    })

    // serveIndex middleware
    app.use(serveIndex(root, { icons: true, hidden: false, dotFiles: true }))

    // no one want to see a 404 favicon error
    let favicon
    app.use((req: any, res: any, next: any) => {
      if (/favicon\.ico$/.test(req.url)) {
        if (!favicon) favicon = fs.readFileSync(join(__dirname, '../public/favicon.ico'))
        res.type('ico').send(favicon)
      } else {
        return next()
      }
    })

    const fileDoesExist = (path: string): Promise<boolean> => {
      return new Promise(resolve => {
        fs.stat(path, (err, stat) => {
          if (err && err.code === 'ENOENT') {
            return resolve(false)
          } else return resolve(true)
        })
      })
    }

    // serve 403/404 page
    app.use(async (req: any, res: any, next: any) => {
      // join / normalize from root dir
      const path = normalize(join(root, req.url))
      const file = req.url.replace(/^\//gm, '') // could be c:/Users/USERNAME/Desktop/website/ for example

      if (await fileDoesExist(file)) {
        const html = STATUS_CODE.replace('{linked-path}', htmlPath(decodeURI(req.url)))
          .replace('{status}', '403')
          .replace('{message}', `Can't access files outside of root.`)
        return res.status(403).send(html)
      }

      if (!(await fileDoesExist(path))) {
        const html = STATUS_CODE.replace('{linked-path}', htmlPath(decodeURI(req.url)))
          .replace('{status}', '404')
          .replace('{message}', 'This page could not be found.')
        return res.status(404).send(html)
      }

      return next()
    })

    // create http server
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

    // start and listen at port
    await this.listen(port, host)

    const address = this.httpServer.address() as any
    //const serveHost = address.address === '0.0.0.0' ? '127.0.0.1' : address.address

    let openHost = host === '0.0.0.0' ? '127.0.0.1' : host
    if (useLocalIp) openHost = getNetworkAddress() || openHost

    //const serveURL = `${this._protocol}://${serveHost}:${address.port}`
    this._openURL = `${this._protocol}://${openHost}:${address.port}`

    message.log('')
    message.log(`  Five Server ${colors('running at:', 'green')}`)
    // message.log(colors(`  (v${VERSION} http://npmjs.com/five-server)`, 'gray'))
    message.log('')

    //let serveURLs: any = [serveURL]
    if (this.logLevel >= 1) {
      if (address.address === '0.0.0.0') {
        const interfaces = os.networkInterfaces()

        Object.keys(interfaces).forEach(key =>
          (interfaces[key] || [])
            .filter(details => details.family === 'IPv4')
            .map(detail => {
              return {
                type: detail.address.includes('127.0.0.1') ? 'Local:   ' : 'Network: ',
                host: detail.address.replace('127.0.0.1', 'localhost')
              }
            })
            .forEach(({ type, host }) => {
              const url = `${this._protocol}://${host}:${colors(address.port, 'bold')}`
              message.log(`  > ${type} ${colors(url, 'cyan')}`)
            })
        )
      } else {
        message.log(`  > Local: ${colors(`${this._protocol}://${openHost}:${colors(address.port, 'bold')}`, 'cyan')}`)
      }
      message.log('')
    }

    /**
     * STEP: 2/4
     * Open Browser using "open" (https://www.npmjs.com/package/open)
     */
    this.launchBrowser(openPath, browser)

    /**
     * STEP: 3/4
     * Make WebSocket Connection using "ws" (https://www.npmjs.com/package/ws)
     */
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

      // store ip
      ws.ip = req?.connection?.remoteAddress

      // store color
      const clr = this.ipColors.get(ws.ip) || this.newColor()
      this.ipColors.set(ws.ip, clr)
      ws.color = clr

      // ws.on('error', err => {
      //   message.log('WS ERROR:', err)
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
              const clr = T === 'warn' ? 'yellow' : T === 'error' ? 'red' : ''

              const log = `${colors(ip, ws.color)} ${clr ? colors(msg, clr) : msg}`
              message.pretty(log, { id: 'ws' })
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

    /**
     * STEP: 4/4
     * Listen for File changes using "chokidar" (https://www.npmjs.com/package/chokidar)
     */
    let ignored: any = [
      function (testPath) {
        // Always ignore dotfiles (important e.g. because editor hidden temp files)
        return testPath !== '.' && /(^[.#]|(?:__|~)$)/.test(path.basename(testPath))
      },
      /(^|[/\\])\../, // ignore dotfile
      '**/node_modules/**',
      '**/bower_components/**',
      '**/jspm_packages/**'
    ]
    if (options.ignore) {
      ignored = ignored.concat(options.ignore)
    }
    if (options.ignorePattern) {
      ignored.push(options.ignorePattern)
    }

    // Setup file watcher
    if (watch === false) return
    this.watcher = chokidar.watch(watch as any, {
      cwd: cwd,
      ignoreInitial: true,
      ignored: ignored
    })

    const handleChange = changePath => {
      const cssChange = path.extname(changePath) === '.css' && injectCss
      if (this.logLevel >= 1) {
        const five = colors(colors('[Five Server]', 'bold'), 'cyan')
        const msg = cssChange ? colors('CSS change detected', 'magenta') : colors('change detected', 'cyan')
        const file = colors(changePath.replace(path.resolve(root), ''), 'gray')

        message.pretty(`${five} ${msg} ${file}`, { id: cssChange ? 'cssChange' : 'change' })
      }

      const htmlChange = path.extname(changePath) === '.html'
      if (htmlChange && injectBody) return

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
        if (this.logLevel > 1) message.log(colors('Ready for changes', 'cyan'))
      })
      .on('error', err => {
        message.log(colors('ERROR:', 'red'), err)
      })
  }

  private async listen(port: any, host: any): Promise<void> {
    return new Promise((resolve, reject) => {
      // Handle server startup errors
      this.httpServer.once('error', e => {
        // @ts-ignore
        if (e.message === 'EADDRINUSE' || (e.code && e.code === 'EADDRINUSE')) {
          // const serveURL = `${this._protocol}://${host}:${port}`
          message.log(colors(`Port ${port} is already in use. Trying another port.`, 'yellow'))
          setTimeout(() => {
            this.listen(0, host) // 0 means random port
          }, 1000)
        } else {
          message.error(colors(e.toString(), 'red'), null, false)
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
            message.log(colors(`Could not open browser "${browser}". Trying the default browser next.`, 'yellow'))
            launchDefaultBrowser()
          } else if (Array.isArray(browser)) {
            if (typeof browser[index + 1] === 'undefined') {
              message.log(
                colors(`Could not open browser "${browser[index]}". Trying the default browser next.`, 'yellow')
              )
              launchDefaultBrowser()
            } else {
              message.log(
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

    const isURL = path => /(www|http:|https:)+[^\s]+[\w]/gm.test(path)

    // Try to open one browser from a list of browsers
    if (Array.isArray(path)) {
      for (const p of path) {
        if (isURL(p)) await launch(p, browser)
        else await launch(`${this.openURL}/${p}`, browser)
      }
    }

    // Open browser "browser"
    if (typeof path === 'string') {
      if (isURL(path)) await launch(path, browser)
      else await launch(`${this.openURL}/${path}`, browser)
    }
  }

  /** Reloads all browser windows */
  public reloadBrowserWindow() {
    this.clients.forEach(ws => {
      if (ws) ws.sendWithDelay('reload')
    })
  }

  /** Send message to the client. (Will show a popup in the Browser) */
  public sendMessage(file: string, msg: string | string[], type = 'info') {
    this.clients.forEach(ws => {
      // send message or message[s]
      const content = typeof msg === 'string' ? { message: msg } : { messages: msg }
      if (ws && ws.file === file) ws.send(JSON.stringify(content))
    })
  }

  /** Manually refresh css */
  public refreshCSS(showPopup = true) {
    this.clients.forEach(ws => {
      if (ws) ws.sendWithDelay(showPopup ? 'refreshcss' : 'refreshcss-silent')
    })
  }

  /** Inject a a new <body> into the DOM. (Better prepend parseBody first) */
  public updateBody(file: string, body: any) {
    this.clients.forEach(ws => {
      if (ws && ws.file === file) ws.send(JSON.stringify({ body, hot: true }))
    })
  }

  public highlightSelector(file: string, selector: string) {
    // TODO(yandeu): add this
  }

  /** @deprecated */
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
    this._parseBody?.terminate()

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
