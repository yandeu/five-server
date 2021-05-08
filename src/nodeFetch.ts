/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import http from 'http'
import https from 'https'

/** Reject will return statusCode and statusMessage { code: number, message: string } */
export const nodeFetch = (url: string, options: http.RequestOptions = {}): Promise<Buffer> => {
  const data: any[] = []
  const module = /^https/.test(url) ? https : http
  const isURL = /^https?:\/\//

  return new Promise((resolve, reject) => {
    if (!isURL.test(url)) return reject({ code: 400, message: `${url} is not a valid url` })

    module
      .get(url, options, res => {
        const code = res.statusCode
        const message = res.statusMessage
        const location = res.headers.location

        if (!code) return reject({ code, message })

        if (code >= 400) return reject({ code, message })

        if (code >= 300 && typeof location !== 'string')
          return reject({ code, message: 'location not found in headers' })

        if (code >= 300 && typeof location === 'string') {
          if (isURL.test(location)) nodeFetch(location, options).then(resolve, reject)
          else nodeFetch(new URL(location, url).href, options).then(resolve, reject)
        }

        if (code < 300)
          res
            .on('data', chunk => data.push(chunk))
            .on('end', () => resolve(Buffer.concat(data)))
            .on('error', error => reject({ code: 500, message: error.message }))
      })
      .on('error', error => reject({ code: 500, message: error.message }))
  })
}
