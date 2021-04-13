/* eslint-disable sort-imports */
/* eslint-disable prefer-template */
/* eslint-disable prefer-spread */

/**
 * @package    send (https://www.npmjs.com/package/send)
 * @copyright  Copyright(c) 2012 TJ Holowaychuk
 * @copyright  Copyright(c) 2014-2016 Douglas Christopher Wilson
 * @license    {@link https://github.com/pillarjs/send/blob/master/LICENSE|MIT}
 * @description modified version of send@0.17.1 (https://github.com/pillarjs/send/blob/master/index.js)
 */

import { charsets } from '../utils/charset'
import { createError } from '../misc' // const createError = require('http-errors')
import { message } from '../msg'

const debug = require('debug')('send')
const destroy = require('destroy')
const encodeUrl = require('encodeurl')
const escapeHtml = require('escape-html')
const etag = require('etag')
const fresh = require('fresh')
// const onFinished = require('on-finished')
const parseRange = require('range-parser')
const Stream = require('stream')

import fs from 'fs'
import mime from 'mime'
// import ms from 'ms'
import path from 'path'
// import statuses from 'statuses'
import { statusToText } from './statuses'

const extname = path.extname
const join = path.join
const normalize = path.normalize
const resolve = path.resolve
const sep = path.sep

const BYTES_RANGE_REGEXP = /^ *bytes=/
const MAX_MAXAGE = 60 * 60 * 24 * 365 * 1000 // 1 year
const UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/

interface SendStreamOptions {
  acceptRanges?: any
  cacheControl?: any
  dotfiles?: any
  end?: any
  etag?: any
  extensions?: any
  from?: any
  hidden?: any
  immutable?: any
  index?: any
  lastModified?: any
  maxAge?: number
  maxage?: number
  root?: any
  start?: any
}

const send = (req, path, options: SendStreamOptions) => {
  return new SendStream(req, path, options)
}
export default send

class SendStream extends Stream {
  private _maxage: number

  constructor(public req: any, public path: any, public options: SendStreamOptions) {
    super()
    const opts = options || {}

    this.options = opts
    this.path = path
    this.req = req

    this._acceptRanges = opts.acceptRanges !== undefined ? Boolean(opts.acceptRanges) : true
    this._cacheControl = opts.cacheControl !== undefined ? Boolean(opts.cacheControl) : true
    this._etag = opts.etag !== undefined ? Boolean(opts.etag) : true
    this._dotfiles = opts.dotfiles !== undefined ? opts.dotfiles : 'ignore'

    if (this._dotfiles !== 'ignore' && this._dotfiles !== 'allow' && this._dotfiles !== 'deny') {
      throw new TypeError('dotfiles option must be "allow", "deny", or "ignore"')
    }

    this._hidden = Boolean(opts.hidden)

    if (opts.hidden !== undefined) {
      message.warn("hidden: use dotfiles: '" + (this._hidden ? 'allow' : 'ignore') + "' instead")
    }

    // legacy support
    if (opts.dotfiles === undefined) {
      this._dotfiles = undefined
    }

    this._extensions = opts.extensions !== undefined ? normalizeList(opts.extensions, 'extensions option') : []
    this._immutable = opts.immutable !== undefined ? Boolean(opts.immutable) : false
    this._index = opts.index !== undefined ? normalizeList(opts.index, 'index option') : ['index.html']
    this._lastModified = opts.lastModified !== undefined ? Boolean(opts.lastModified) : true

    this._maxage = opts.maxAge || opts.maxage || 0
    // this._maxage = typeof this._maxage === 'string' ? ms(this._maxage) : Number(this._maxage)
    this._maxage = !isNaN(this._maxage) ? Math.min(Math.max(0, this._maxage), MAX_MAXAGE) : 0

    this._root = opts.root ? resolve(opts.root) : null

    if (!this._root && opts.from) {
      this.from(opts.from)
    }
  }

  root(path) {
    this._root = resolve(String(path))
    debug('root %s', this._root)
    return this
  }

  error(status, err?: any) {
    // emit if listeners instead of responding
    if (hasListeners(this, 'error')) {
      // the favicon is missing a lot (but this is ok issue)
      if (err && err.path && /favicon\.ico/.test(err.path)) return

      return this.emit(
        'error',
        createError(status, err, {
          expose: false
        })
      )
    }

    const res = this.res
    const msg = statusToText(status) || String(status)
    const doc = createHtmlDocument('Error', escapeHtml(msg))

    // clear existing headers
    clearHeaders(res)

    // add error headers
    if (err && err.headers) {
      setHeaders(res, err.headers)
    }

    // send basic response
    res.statusCode = status
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')
    res.setHeader('Content-Length', Buffer.byteLength(doc))
    res.setHeader('Content-Security-Policy', "default-src 'none'")
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.end(doc)
  }

  hasTrailingSlash() {
    return this.path[this.path.length - 1] === '/'
  }

  isConditionalGET() {
    return (
      this.req.headers['if-match'] ||
      this.req.headers['if-unmodified-since'] ||
      this.req.headers['if-none-match'] ||
      this.req.headers['if-modified-since']
    )
  }

  isPreconditionFailure() {
    const req = this.req
    const res = this.res

    // if-match
    const match = req.headers['if-match']
    if (match) {
      const etag = res.getHeader('ETag')
      return (
        !etag ||
        (match !== '*' &&
          parseTokenList(match).every(function (match) {
            return match !== etag && match !== 'W/' + etag && 'W/' + match !== etag
          }))
      )
    }

    // if-unmodified-since
    const unmodifiedSince = parseHttpDate(req.headers['if-unmodified-since'])
    if (!isNaN(unmodifiedSince)) {
      const lastModified = parseHttpDate(res.getHeader('Last-Modified'))
      return isNaN(lastModified) || lastModified > unmodifiedSince
    }

    return false
  }

  removeContentHeaderFields() {
    const res = this.res
    const headers = getHeaderNames(res)

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      if (header.substr(0, 8) === 'content-' && header !== 'content-location') {
        res.removeHeader(header)
      }
    }
  }

  notModified() {
    const res = this.res
    debug('not modified')
    this.removeContentHeaderFields()
    res.statusCode = 304
    res.end()
  }

  headersAlreadySent() {
    const err = new Error("Can't set headers after they are sent.")
    debug('headers already sent')
    this.error(500, err)
  }

  isCachable() {
    const statusCode = this.res.statusCode
    return (statusCode >= 200 && statusCode < 300) || statusCode === 304
  }

  onStatError(error) {
    switch (error.code) {
      case 'ENAMETOOLONG':
      case 'ENOENT':
      case 'ENOTDIR':
        this.error(404, error)
        break
      default:
        this.error(500, error)
        break
    }
  }

  isFresh() {
    return fresh(this.req.headers, {
      etag: this.res.getHeader('ETag'),
      'last-modified': this.res.getHeader('Last-Modified')
    })
  }

  isRangeFresh() {
    const ifRange = this.req.headers['if-range']

    if (!ifRange) {
      return true
    }

    // if-range as etag
    if (ifRange.indexOf('"') !== -1) {
      const etag = this.res.getHeader('ETag')
      return Boolean(etag && ifRange.indexOf(etag) !== -1)
    }

    // if-range as modified date
    const lastModified = this.res.getHeader('Last-Modified')
    return parseHttpDate(lastModified) <= parseHttpDate(ifRange)
  }

  redirect(path) {
    const res = this.res

    if (hasListeners(this, 'directory')) {
      this.emit('directory', res, path)
      return
    }

    if (this.hasTrailingSlash()) {
      this.error(403)
      return
    }

    const loc = encodeUrl(collapseLeadingSlashes(this.path + '/'))
    const doc = createHtmlDocument(
      'Redirecting',
      'Redirecting to <a href="' + escapeHtml(loc) + '">' + escapeHtml(loc) + '</a>'
    )

    // redirect
    res.statusCode = 301
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')
    res.setHeader('Content-Length', Buffer.byteLength(doc))
    res.setHeader('Content-Security-Policy', "default-src 'none'")
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Location', loc)
    res.end(doc)
  }

  pipe(res) {
    // root path
    const root = this._root

    // references
    this.res = res

    // decode the path
    let path: string | -1 = decode(this.path)
    if (path === -1) {
      this.error(400)
      return res
    }

    // null byte(s)
    // @ts-ignore
    // TODO(yandeu): Not sure how to improve this
    if (~path.indexOf('\0')) {
      this.error(400)
      return res
    }

    let parts
    if (root !== null) {
      // normalize
      if (path) {
        path = normalize('.' + sep + path)
      }

      // malicious path
      if (UP_PATH_REGEXP.test(path)) {
        debug('malicious path "%s"', path)
        this.error(403)
        return res
      }

      // explode path parts
      parts = path.split(sep)

      // join / normalize from optional root dir
      path = normalize(join(root, path))
    } else {
      // ".." is malicious without "root"
      if (UP_PATH_REGEXP.test(path)) {
        debug('malicious path "%s"', path)
        this.error(403)
        return res
      }

      // explode path parts
      parts = normalize(path).split(sep)

      // resolve the path
      path = resolve(path)
    }

    // dotfile handling
    if (containsDotFile(parts)) {
      let access = this._dotfiles

      // legacy support
      if (access === undefined) {
        access = parts[parts.length - 1][0] === '.' ? (this._hidden ? 'allow' : 'ignore') : 'allow'
      }

      debug('%s dotfile "%s"', access, path)
      switch (access) {
        case 'allow':
          break
        case 'deny':
          this.error(403)
          return res
        case 'ignore':
        default:
          this.error(404)
          return res
      }
    }

    // index file support
    if (this._index.length && this.hasTrailingSlash()) {
      this.sendIndex(path)
      return res
    }

    this.sendFile(path)
    return res
  }

  send(path, stat) {
    let len = stat.size
    const options = this.options
    const opts: any = {}
    const res = this.res
    const req = this.req
    let ranges = req.headers.range
    let offset = options.start || 0

    if (headersSent(res)) {
      // impossible to send now
      this.headersAlreadySent()
      return
    }

    debug('pipe "%s"', path)

    // set header fields
    this.setHeader(path, stat)

    // set content-type
    this.type(path)

    // conditional GET support
    if (this.isConditionalGET()) {
      if (this.isPreconditionFailure()) {
        this.error(412)
        return
      }

      if (this.isCachable() && this.isFresh()) {
        this.notModified()
        return
      }
    }

    // adjust len to start/end options
    len = Math.max(0, len - offset)
    if (options.end !== undefined) {
      const bytes = options.end - offset + 1
      if (len > bytes) len = bytes
    }

    // Range support
    if (this._acceptRanges && BYTES_RANGE_REGEXP.test(ranges)) {
      // parse
      ranges = parseRange(len, ranges, {
        combine: true
      })

      // If-Range support
      if (!this.isRangeFresh()) {
        debug('range stale')
        ranges = -2
      }

      // unsatisfiable
      if (ranges === -1) {
        debug('range unsatisfiable')

        // Content-Range
        res.setHeader('Content-Range', contentRange('bytes', len))

        // 416 Requested Range Not Satisfiable
        return this.error(416, {
          headers: { 'Content-Range': res.getHeader('Content-Range') }
        })
      }

      // valid (syntactically invalid/multiple ranges are treated as a regular response)
      if (ranges !== -2 && ranges.length === 1) {
        debug('range %j', ranges)

        // Content-Range
        res.statusCode = 206
        res.setHeader('Content-Range', contentRange('bytes', len, ranges[0]))

        // adjust for requested range
        offset += ranges[0].start
        len = ranges[0].end - ranges[0].start + 1
      }
    }

    // clone options
    for (const prop in options) {
      opts[prop] = options[prop]
    }

    // set read options
    opts.start = offset
    opts.end = Math.max(offset, offset + len - 1)

    // content-length
    res.setHeader('Content-Length', len)

    // HEAD support
    if (req.method === 'HEAD') {
      res.end()
      return
    }

    this.stream(path, opts)
  }

  sendFile(path) {
    let i = 0
    const self = this

    debug('stat "%s"', path)
    fs.stat(path, function onstat(err, stat) {
      if (err && err.code === 'ENOENT' && !extname(path) && path[path.length - 1] !== sep) {
        // not found, check extensions
        return next(err)
      }
      if (err) return self.onStatError(err)
      if (stat.isDirectory()) return self.redirect(path)
      self.emit('file', path, stat)
      self.send(path, stat)
    })

    function next(err?) {
      if (self._extensions.length <= i) {
        return err ? self.onStatError(err) : self.error(404)
      }

      const p = path + '.' + self._extensions[i++]

      debug('stat "%s"', p)
      fs.stat(p, function (err, stat) {
        if (err) return next(err)
        if (stat.isDirectory()) return next()
        self.emit('file', p, stat)
        self.send(p, stat)
      })
    }
  }

  sendIndex(path) {
    let i = -1
    const self = this

    function next(err?) {
      if (++i >= self._index.length) {
        if (err) return self.onStatError(err)
        return self.error(404)
      }

      const p = join(path, self._index[i])

      debug('stat "%s"', p)
      fs.stat(p, function (err, stat) {
        if (err) return next(err)
        if (stat.isDirectory()) return next()
        self.emit('file', p, stat)
        self.send(p, stat)
      })
    }

    next()
  }

  stream(path, options) {
    // TODO: this is all lame, refactor meeee
    let finished = false
    const self = this
    const res = this.res

    // pipe
    const stream = fs.createReadStream(path, options)
    this.emit('stream', stream)
    stream.pipe(res)

    // response finished, done with the fd

    // MOD(yandeu): use on('finished') and on('end') instead of onFinished()
    // onFinished(res, function onfinished() {
    //   finished = true
    //   destroy(stream)
    // })

    stream.on('finished', function () {
      // request already finished
      if (finished) return
      // clean up stream
      finished = true
      destroy(stream)
    })

    stream.on('end', function () {
      // request already finished
      if (finished) return
      // clean up stream
      finished = true
      destroy(stream)
    })

    // error handling code-smell
    stream.on('error', function onerror(err) {
      // request already finished
      if (finished) return
      // clean up stream
      finished = true
      destroy(stream)
      // error
      self.onStatError(err)
    })

    // end
    stream.on('end', function onend() {
      self.emit('end')
    })
  }

  type(path) {
    const res = this.res

    if (res.getHeader('Content-Type')) return

    const type = mime.getType(path)

    if (!type) {
      debug('no content-type')
      return
    }

    const charset = charsets.lookup(type)

    debug('content-type %s', type)
    res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''))
  }

  setHeader(path, stat) {
    const res = this.res

    this.emit('headers', res, path, stat)

    if (this._acceptRanges && !res.getHeader('Accept-Ranges')) {
      debug('accept ranges')
      res.setHeader('Accept-Ranges', 'bytes')
    }

    if (this._cacheControl && !res.getHeader('Cache-Control')) {
      let cacheControl = 'public, max-age=' + Math.floor(this._maxage / 1000)

      if (this._immutable) {
        cacheControl += ', immutable'
      }

      debug('cache-control %s', cacheControl)
      res.setHeader('Cache-Control', cacheControl)
    }

    if (this._lastModified && !res.getHeader('Last-Modified')) {
      const modified = stat.mtime.toUTCString()
      debug('modified %s', modified)
      res.setHeader('Last-Modified', modified)
    }

    if (this._etag && !res.getHeader('ETag')) {
      const val = etag(stat)
      debug('etag %s', val)
      res.setHeader('ETag', val)
    }
  }
}

// SendStream.prototype.etag = deprecate.function(function etag(val) {
//   this._etag = Boolean(val)
//   debug('etag %s', this._etag)
//   return this
// }, 'send.etag: pass etag as option')

// SendStream.prototype.hidden = deprecate.function(function hidden(val) {
//   this._hidden = Boolean(val)
//   this._dotfiles = undefined
//   debug('hidden %s', this._hidden)
//   return this
// }, 'send.hidden: use dotfiles option')

// SendStream.prototype.index = deprecate.function(function index(paths) {
//   let index = !paths ? [] : normalizeList(paths, 'paths argument')
//   debug('index %o', paths)
//   this._index = index
//   return this
// }, 'send.index: pass index as option')

// SendStream.prototype.from = deprecate.function(SendStream.prototype.root, 'send.from: pass root as option')

// SendStream.prototype.root = deprecate.function(SendStream.prototype.root, 'send.root: pass root as option')

// SendStream.prototype.maxage = deprecate.function(function maxage(maxAge) {
//   this._maxage = typeof maxAge === 'string' ? ms(maxAge) : Number(maxAge)
//   this._maxage = !isNaN(this._maxage) ? Math.min(Math.max(0, this._maxage), MAX_MAXAGE) : 0
//   debug('max-age %d', this._maxage)
//   return this
// }, 'send.maxage: pass maxAge as option')

function clearHeaders(res) {
  const headers = getHeaderNames(res)

  for (let i = 0; i < headers.length; i++) {
    res.removeHeader(headers[i])
  }
}

function collapseLeadingSlashes(str) {
  let i = 0
  for (i; i < str.length; i++) {
    if (str[i] !== '/') {
      break
    }
  }

  return i > 1 ? '/' + str.substr(i) : str
}

function containsDotFile(parts) {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part.length > 1 && part[0] === '.') {
      return true
    }
  }

  return false
}

function contentRange(type, size, range?: { start: number; end: number }) {
  return type + ' ' + (range ? range.start + '-' + range.end : '*') + '/' + size
}

function createHtmlDocument(title, body) {
  return (
    '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '<meta charset="utf-8">\n' +
    '<title>' +
    title +
    '</title>\n' +
    '</head>\n' +
    '<body>\n' +
    '<pre>' +
    body +
    '</pre>\n' +
    '</body>\n' +
    '</html>\n'
  )
}

function decode(path) {
  try {
    return decodeURIComponent(path)
  } catch (err) {
    return -1
  }
}

function getHeaderNames(res) {
  return typeof res.getHeaderNames !== 'function' ? Object.keys(res._headers || {}) : res.getHeaderNames()
}

function hasListeners(emitter, type) {
  const count =
    typeof emitter.listenerCount !== 'function' ? emitter.listeners(type).length : emitter.listenerCount(type)

  return count > 0
}

function headersSent(res) {
  return typeof res.headersSent !== 'boolean' ? Boolean(res._header) : res.headersSent
}

function normalizeList(val, name) {
  const list = [].concat(val || [])

  for (let i = 0; i < list.length; i++) {
    if (typeof list[i] !== 'string') {
      throw new TypeError(name + ' must be array of strings or false')
    }
  }

  return list
}

function parseHttpDate(date) {
  const timestamp = date && Date.parse(date)

  return typeof timestamp === 'number' ? timestamp : NaN
}

function parseTokenList(str: string) {
  const list: string[] = []
  let end = 0
  let start = 0

  // gather tokens
  for (let i = 0, len = str.length; i < len; i++) {
    switch (str.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) {
          start = end = i + 1
        }
        break
      case 0x2c /* , */:
        list.push(str.substring(start, end))
        start = end = i + 1
        break
      default:
        end = i + 1
        break
    }
  }

  // final token
  list.push(str.substring(start, end))

  return list
}

function setHeaders(res, headers) {
  const keys = Object.keys(headers)

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    res.setHeader(key, headers[key])
  }
}
