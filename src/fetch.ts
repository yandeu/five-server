/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import http from 'http'
import https from 'https'

/** Reject will return statusCode and statusMessage { code: number, message: string } */
export const fetch = (url: string, options: http.RequestOptions = {}): Promise<Buffer> => {
  const data: any[] = []

  const module = /^https/.test(url) ? https : http

  return new Promise((resolve, reject) => {
    module
      .get(url, options, res => {
        const code = res.statusCode
        const message = res.statusMessage
        const headers = res.headers

        if (!code) return reject({ code, message })

        if (code >= 400) return reject({ code, message })

        if (code >= 300 && typeof headers.location !== 'string')
          return reject({ code, message: 'location not found in headers' })

        if (code >= 300 && typeof headers.location === 'string') fetch(headers.location, options).then(resolve, reject)

        if (code <= 299)
          res
            .on('data', chunk => data.push(chunk))
            .on('end', () => {
              resolve(Buffer.concat(data))
            })
            .on('error', error => reject({ code: 500, message: error.message }))
      })
      .on('error', error => reject({ code: 500, message: error.message }))
  })
}
