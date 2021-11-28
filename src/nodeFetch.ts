/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import { createHttpError } from './misc.js'
import http from 'http'
import https from 'https'

/** Reject will return statusCode and statusMessage { code: number, message: string } */
export const nodeFetch = (url: string, options: http.RequestOptions = {}, redirects = 0): Promise<Buffer> => {
  const data: any[] = []
  const module = /^https/.test(url) ? https : http
  const isURL = /^https?:\/\//
  const maxRedirect = 5

  return new Promise((resolve, reject) => {
    if (!isURL.test(url)) return reject(createHttpError(400, `${url} is not a valid url`))

    module
      .get(url, options, res => {
        const code = res.statusCode
        const message = res.statusMessage
        const location = res.headers.location

        if (redirects >= maxRedirect) return reject(createHttpError(429, 'Too Many Requests'))

        if (!code) return reject(createHttpError(code, message))

        if (code >= 400) return reject(createHttpError(code, message))

        if (code >= 300 && typeof location !== 'string')
          return reject(createHttpError(code, 'location not found in headers'))

        if (code >= 300 && typeof location === 'string') {
          if (isURL.test(location)) nodeFetch(location, options, (redirects += 1)).then(resolve, reject)
          else nodeFetch(new URL(location, url).href, options, (redirects += 1)).then(resolve, reject)
        }

        if (code < 300)
          res
            .on('data', chunk => data.push(chunk))
            .on('end', () => resolve(Buffer.concat(data)))
            .on('error', error => reject(createHttpError(500, error.message)))
      })
      .on('error', error => reject(createHttpError(500, error.message)))
  })
}
