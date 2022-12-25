/**
 * @copyright
 * Copyright (c) 2014 Andrew Kelley
 * Copyright (c) 2021 Yannick Deubel (https://github.com/yandeu)
 *
 * @license {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 *
 * @description
 * copied and modified from proxy-middleware@0.15.0 (https://github.com/gonzalocasas/node-proxy-middleware/blob/master/index.js)
 * previously licensed under MIT (https://github.com/gonzalocasas/node-proxy-middleware/blob/master/LICENSE)
 */

import { Inject, code } from './injectCode'
import type { NextFunction, Request, Response } from 'express6'
import { IncomingMessage } from 'http'
import http from 'http'
import https from 'https'
import os from 'os'
import type { request as requestFnc } from 'http'

const owns = {}.hasOwnProperty

export interface ProxyMiddlewareOptions extends Omit<URL, 'toJSON'> {
  cookieRewrite?: boolean
  headers?: any
  method?: any
  preserveHost: boolean
  route?: string
  via: boolean
  /** @deprecated The path property is a concatenation of the pathname and search components. */
  path: string
}

interface RequestWithRetry extends Request {
  retries: number
}

export const proxyMiddleware = (options: ProxyMiddlewareOptions, injectBody: boolean) => {
  // enable ability to quickly pass a url for shorthand setup
  if (typeof options === 'string') {
    options = require('url').parse(options)
  }

  const httpLib = options.protocol === 'https:' ? https : http
  const request = httpLib.request as typeof requestFnc

  options = options || {}
  // options.hostname = options.hostname
  // options.port = options.port
  options.pathname = options.pathname || '/'

  const doRequest = async (req: RequestWithRetry, res: Response, next: NextFunction) => {
    let url = req.url as string
    // You can pass the route within the options, as well
    if (typeof options.route === 'string') {
      if (url === options.route) {
        url = ''
      } else if (url.slice(0, options.route.length) === options.route) {
        url = url.slice(options.route.length)
      } else {
        return next()
      }
    }

    // options for this request
    const opts = extend({}, options)
    if (url && url.charAt(0) === '?') {
      // prevent /api/resource/?offset=0
      if (options.pathname.length > 1 && options.pathname.charAt(options.pathname.length - 1) === '/') {
        opts.path = options.pathname.substring(0, options.pathname.length - 1) + url
      } else {
        opts.path = options.pathname + url
      }
    } else if (url) {
      opts.path = slashJoin(options.pathname, url)
    } else {
      opts.path = options.pathname
    }
    opts.method = req.method
    opts.headers = options.headers ? merge(req.headers, options.headers) : req.headers

    applyViaHeader(req.headers, opts, opts.headers)

    if (!options.preserveHost) {
      // Forwarding the host breaks dotcloud
      delete opts.headers.host
    }

    const MAX_RETRY = 20
    const RETRY_TIMEOUT = 200

    const myReq = request(opts, (request: IncomingMessage) => {
      const statusCode = request.statusCode
      const headers = request.headers
      const location = headers.location
      const redirectCodes: boolean = !!statusCode && statusCode > 300 && statusCode < 304

      // Fix the location (makes absolute path)
      if ((redirectCodes || statusCode === 201) && location && location.indexOf(options.href) > -1)
        headers.location = location.replace(options.href, slashJoin('/', slashJoin(options.route || '', '')))

      // handle redirects
      if (statusCode && redirectCodes && url !== location) {
        res.writeHead(statusCode, { Location: headers.location })
        return res.end()
      }

      request.on('error', function (err) {
        next(err)
      })

      // do injection here
      const htmlOrPhp = /\.(php|html)$/.test(url)
      const contentType1 = /html/.test(request.headers['content-type'] || '')
      const contentType2 = /html/.test((request.headers['Content-Type'] as string) || '')
      const shouldInject = htmlOrPhp || contentType1 || contentType2

      // inject the reload script before proxying
      if (shouldInject) {
        const inject = new Inject(['</head>', '</html>', '</body>'], code(url, injectBody))

        request.pipe(inject).on('finish', () => {
          // could not inject the script :/
          if (!inject.injectTag)
            inject.data += `<script>console.warn("[Five Server] Could not inject script. Why? This file does probably not include a head, html or body tag.");</script>`

          applyViaHeader(request.headers, opts, request.headers)
          rewriteCookieHosts(request.headers, opts, request.headers, req)

          // request.headers['content-type'] = 'text/html; charset=utf-8'
          request.headers['content-length'] = inject.data.length.toString()
          // to inject the script, we had to decode the compression, hence we remove the content-encoding header
          request.headers['content-encoding'] = ''

          res.writeHead(request.statusCode || 200, request.headers)

          res.end(inject.data)
        })
      }

      if (!shouldInject) {
        // simply proxy the request
        applyViaHeader(request.headers, opts, request.headers)
        rewriteCookieHosts(request.headers, opts, request.headers, req)
        res.writeHead(request.statusCode || 500, request.headers)
        request.pipe(res)
      }
    })

    myReq.on('error', function (err) {
      if (!req.retries) req.retries = 0

      // retry every x ms (in case your dev-server needs some time to restart)
      if (req.retries < MAX_RETRY) {
        setTimeout(() => {
          req.retries++
          return doRequest(req, res, next)
        }, RETRY_TIMEOUT)
      }

      // exit with error
      else {
        return next(err)
      }
    })

    if (req.readable) req.pipe(myReq)
    else myReq.end()
  }

  return doRequest
}

function applyViaHeader(existingHeaders, opts: ProxyMiddlewareOptions, applyTo) {
  if (!opts.via) return

  const viaName = true === opts.via ? os.hostname() : opts.via
  let viaHeader = `1.1 ${viaName}`
  if (existingHeaders.via) {
    viaHeader = `${existingHeaders.via}, ${viaHeader}`
  }

  applyTo.via = viaHeader
}

function rewriteCookieHosts(existingHeaders, opts: ProxyMiddlewareOptions, applyTo, req) {
  if (!opts.cookieRewrite || !owns.call(existingHeaders, 'set-cookie')) {
    return
  }

  let existingCookies = existingHeaders['set-cookie']
  const rewrittenCookies: any[] = [],
    rewriteHostname = true === opts.cookieRewrite ? os.hostname() : opts.cookieRewrite

  if (!Array.isArray(existingCookies)) {
    existingCookies = [existingCookies]
  }

  const replacer = (match, _p1, p2) => match.replace(p2, rewriteHostname)
  for (let i = 0; i < existingCookies.length; i++) {
    let rewrittenCookie = existingCookies[i].replace(/(Domain=)([^;]+)/i, replacer)

    if (!req.connection.encrypted) {
      rewrittenCookie = rewrittenCookie.replace(/;\s*?(Secure)/i, '')
    }
    rewrittenCookies.push(rewrittenCookie)
  }

  applyTo['set-cookie'] = rewrittenCookies
}

function slashJoin(p1, p2) {
  let trailing_slash = false

  if (p1.length && p1[p1.length - 1] === '/') {
    trailing_slash = true
  }
  if (trailing_slash && p2.length && p2[0] === '/') {
    p2 = p2.substring(1)
  }

  return p1 + p2
}

function extend(obj, src) {
  for (const key in src) if (owns.call(src, key)) obj[key] = src[key]
  return obj
}

//merges data without changing state in either argument
function merge(src1, src2) {
  const merged = {}
  extend(merged, src1)
  extend(merged, src2)
  return merged
}
