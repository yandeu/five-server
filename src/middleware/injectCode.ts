/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import { Request, Response } from 'express'
import { createReadStream, existsSync, fstat, statSync } from 'fs'
import { extname, join, resolve } from 'path'
import { Writable } from 'stream'

class Inject extends Writable {
  size: number = 0
  data: string = ''
  injectTag = ''

  constructor(public tags, public code) {
    super()
  }

  doInjection(data: string) {
    const injectCandidates = [new RegExp('</head>', 'i'), new RegExp('</html>', 'i'), new RegExp('</body>', 'i')]
    let match

    for (let i = 0; i < injectCandidates.length; ++i) {
      match = injectCandidates[i].exec(data)
      if (match) {
        this.injectTag = match[0]
        break
      }
    }

    if (this.injectTag) {
      data = data.replace(this.injectTag, this.code + this.injectTag)
    }

    this.data = data
  }

  _write(chunk, encoding, callback) {
    this.data += chunk.toString()
    callback()
  }

  _final(callback) {
    this.doInjection(this.data)

    callback()
  }
}

export const injectCode = (root: string, PHP: any) => {
  return async (req: Request, res: Response, next) => {
    if (req.url === '/' || extname(req.url) === '.html' || extname(req.url) === '.htm' || extname(req.url) === '.php') {
      const filePath = resolve(join(root + req.url))

      if (!existsSync(filePath)) return next()
      if (!statSync(filePath).isFile()) return next()

      const code = `<!-- Code injected by Five-server -->
            <script async data-id="five-server" data-file="${filePath}" type="application/javascript" src="/fiveserver.js"></script>
            `

      const inject = new Inject(['</head>', '</html>', '</body>'], code)

      if (extname(req.url) === '.php') {
        const html = await PHP.parseFile(filePath, res)
        inject.doInjection(html)
        res.type('html')
        res.setHeader('Content-Length', inject.data.length)
        return res.send(inject.data)
      }

      createReadStream(filePath)
        .pipe(inject)
        .on('finish', () => {
          if (!inject.injectTag) return next()
          else {
            res.type('html')
            res.setHeader('Content-Length', inject.data.length)
            res.send(inject.data)
          }
        })
        .on('error', () => {
          return next()
        })
    } else {
      return next()
    }
  }
}
