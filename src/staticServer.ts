import { colors } from './colors'
import fs from 'fs'
import path from 'path'
import send from './dependencies/send'
const es = require('event-stream') // looks ok for now (https://david-dm.org/dominictarr/event-stream)

// Based on connect.static(), but streamlined and with added code injector
export const staticServer = (root: any, opts: { logLevel: number; injectedCode: string }) => {
  const { logLevel, injectedCode } = opts

  let isFile = false
  let filePath = ''

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
    const injectCandidates = [new RegExp('</head>', 'i'), new RegExp('</body>', 'i'), new RegExp('</svg>')]
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
      filePath = filepath

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
        if (injectTag === null && logLevel >= 3) {
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
        const injection = `
    <!-- Code injected by Five-server -->
    <script data-file="${filePath}" type="text/javascript" src="/fiveserver.js"></script>

  ${injectTag}`

        // We need to modify the length given to browser
        const len = injection.length + res.getHeader('Content-Length') - injectTag.length
        res.setHeader('Content-Length', len)
        const originalPipe = stream.pipe
        stream.pipe = function (resp) {
          originalPipe.call(stream, es.replace(new RegExp(injectTag, 'i'), injection)).pipe(resp)
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
export const entryPoint = (staticHandler, file) => {
  if (!file)
    return function (req, res, next) {
      next()
    }

  return function (req, res, next) {
    req.url = `/${file}`
    staticHandler(req, res, next)
  }
}
