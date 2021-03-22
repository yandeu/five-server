/*!
 * proxy-middleware
 * Copyright (c) 2014 Andrew Kelley
 * MIT Licensed
 */

// modified version of proxy-middleware@0.15.0 (https://github.com/gonzalocasas/node-proxy-middleware/blob/master/index.js)

const os = require('os')
const http = require('http')
const https = require('https')
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

module.exports = function proxyMiddleware(options: ProxyMiddlewareOptions) {
  // enable ability to quickly pass a url for shorthand setup
  // not implemented yet
  // if (typeof options === 'string') {
  //   options = require('url').parse(options)
  // }

  const httpLib = options.protocol === 'https:' ? https : http
  const request = httpLib.request

  options = options || {}
  options.pathname = options.pathname || '/'

  return function (req, resp, next) {
    let url = req.url
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

    //options for this request
    const opts = { ...options }
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

    const myReq = request(opts, function (myRes) {
      const statusCode = myRes.statusCode,
        headers = myRes.headers,
        location = headers.location
      // Fix the location
      if (
        ((statusCode > 300 && statusCode < 304) || statusCode === 201) &&
        location &&
        location.indexOf(options.href) > -1
      ) {
        // absolute path
        headers.location = location.replace(options.href, slashJoin('/', slashJoin(options.route || '', '')))
      }
      applyViaHeader(myRes.headers, opts, myRes.headers)
      rewriteCookieHosts(myRes.headers, opts, myRes.headers, req)
      resp.writeHead(myRes.statusCode, myRes.headers)
      myRes.on('error', function (err) {
        next(err)
      })
      myRes.pipe(resp)
    })
    myReq.on('error', function (err) {
      next(err)
    })
    if (!req.readable) {
      myReq.end()
    } else {
      req.pipe(myReq)
    }
  }
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

  for (let i = 0; i < existingCookies.length; i++) {
    let rewrittenCookie = existingCookies[i].replace(/(Domain)=[a-z.-_]*?(;|$)/gi, `$1=${rewriteHostname}$2`)

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
