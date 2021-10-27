/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import { PREVIEW, PREVIEW_FULLSCREEN } from '../public'
import { basename, extname, join, resolve } from 'path'
import { readFileSync, statSync } from 'fs'
import { fileTypes } from '../fileTypes'
import { htmlPath } from './explorer'

export const preview = (root: string, injectToAny: boolean) => {
  return (req, res, next) => {
    if (!injectToAny) return next()
    if (!['.preview', '.fullscreen', '.php'].includes(extname(req.url))) return next()

    const isFullscreenPreview = /\.fullscreen$/.test(req.url)

    // remove .preview
    req.url = req.url.replace(/\.preview$|\.fullscreen$/, '')
    const URL = decodeURI(req.url)

    const isPHP = extname(req.url) === '.php'
    const phpMsg = isPHP
      ? 'Why this preview? Five Server could not detect any head, body or html tag in your file.<br><br>'
      : ''

    try {
      const filePath = resolve(join(root + URL))

      const isFile = statSync(filePath).isFile()
      if (!isFile) return next()

      let ext = extname(URL).replace(/^\./, '').toLowerCase()
      const fileName = basename(filePath, ext)

      const isImage = fileTypes.isImage(ext)
      const isVideo = fileTypes.isVideo(ext)
      const isAudio = fileTypes.isAudio(ext)
      const isPDF = fileTypes.isPDF(ext)

      let preview = ''

      if (isImage)
        preview = `<div class="image" style="background: white;">
        
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
        const fileSize = Math.round(statSync(filePath).size / 1024) // KB
        const tooBig = fileSize > MAX_FILE_SIZE

        if (tooBig) ext = 'txt'

        let fileContent = !tooBig
          ? readFileSync(filePath, { encoding: 'utf-8' })
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

      const TEMPLATE = isFullscreenPreview ? PREVIEW_FULLSCREEN : PREVIEW

      const html = TEMPLATE.replace('{linked-path}', htmlPath(URL))
        .replace(/{fileName}/gm, fileName)
        .replace(/{ext}/gm, ext)
        .replace('{phpMsg}', phpMsg ? `<div class="message"><p>${phpMsg}</p></div>` : '')
        .replace('{preview}', preview)

      return res.type('html').send(html)
    } catch (error) {
      return next()
    }
  }
}
