/* eslint-disable sort-imports */
/* eslint-disable prefer-template */
/* eslint-disable prefer-spread */

/**
 * @package     serve-index (https://www.npmjs.com/package/serve-index)
 * @copyright   Copyright (c) 2010 Sencha Inc.
 * @copyright   Copyright (c) 2011 LearnBoost
 * @copyright   Copyright (c) 2011 TJ Holowaychuk
 * @copyright   Copyright (c) 2014-2015 Douglas Christopher Wilson
 * @license     {@link https://github.com/expressjs/serve-index/blob/master/LICENSE|MIT}
 * @description modified version of serve-index@1.9.1 (https://github.com/expressjs/serve-index/blob/master/index.js)
 */

const accepts = require('accepts')
import { createError } from '../misc' // const createError = require('http-errors')
const debug = require('debug')('serve-index')
const escapeHtml = require('escape-html')
const fs = require('fs')
import path, { extname as _extname, normalize, sep, join } from 'path'

// wrap extname for special files like .d.ts
const extname = (p: string) => {
  if (/\.d\.ts$/.test(p)) return '.d.ts'
  if (/\.test\.c?m?js$/.test(p)) return '.test.js'
  if (/\.test\.jsx$/.test(p)) return '.test.jsx'
  if (/\.test\.tsx?$/.test(p)) return '.test.ts'

  if (/fiveserver/i.test(p)) return 'FIVESERVER'
  if (/eslint/i.test(p)) return 'ESLINT'
  if (/prettier/i.test(p)) return 'PRETTIER'
  if (/^.gitignore$/i.test(p)) return 'GIT'
  if (/^.npmignore$/i.test(p)) return 'NPM'
  if (/^.gitignore$/i.test(p)) return 'GIT'
  if (/^package.json$|^package-lock.json$/i.test(p)) return 'NODEJS'
  if (/^CHANGELOG$|^CHANGELOG\./i.test(p)) return 'CHANGELOG'
  if (/^LICENSE$|^LICENSE\./i.test(p)) return 'LICENSE'
  if (/^README$|^README\./i.test(p)) return 'README'

  return _extname(p)
}

const mime = require('mime-types')
const parseUrl = require('parseurl')
const resolve = require('path').resolve

// FIX: Replaced batch by forking it
const Batch = require('./batch') // const Batch = require('batch')

const cache = {}
const defaultTemplate = join(__dirname, '../../public/serve-index', 'directory.html')
const defaultStylesheet = join(__dirname, '../../public/serve-index', 'style.css')
const mediaTypes = ['text/html', 'text/plain', 'application/json']
const mediaType = {
  'text/html': 'html',
  'text/plain': 'plain',
  'application/json': 'json'
}

const serveIndex = (root, options?: any) => {
  const opts = options || {}

  // root required
  if (!root) {
    throw new TypeError('serveIndex() root path required')
  }

  // resolve root to absolute and normalize
  const rootPath = normalize(resolve(root) + sep)

  const filter = opts.filter
  const hidden = opts.hidden || false
  const dotFiles = opts.dotFiles || true
  const icons = opts.icons
  const stylesheet = opts.stylesheet || defaultStylesheet
  const template = opts.template || defaultTemplate
  const view = opts.view || 'tiles'

  return function (req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 'OPTIONS' === req.method ? 200 : 405
      res.setHeader('Allow', 'GET, HEAD, OPTIONS')
      res.setHeader('Content-Length', '0')
      res.end()
      return
    }

    // get dir
    const dir = getRequestedDir(req)

    // bad request
    if (dir === null) return next(createError(400))

    // parse URLs
    const originalUrl = parseUrl.original(req)
    const originalDir = decodeURIComponent(originalUrl.pathname)

    // join / normalize from root dir
    const path = normalize(join(rootPath, dir))

    // null byte(s), bad request
    if (~path.indexOf('\0')) return next(createError(400))

    // malicious path
    if ((path + sep).substr(0, rootPath.length) !== rootPath) {
      debug('malicious path "%s"', path)
      return next(createError(403))
    }

    // determine ".." display
    const showUp = normalize(resolve(path) + sep) !== rootPath

    // check if we have a directory
    debug('stat "%s"', path)
    fs.stat(path, function (err, stat) {
      if (err && err.code === 'ENOENT') {
        return next()
      }

      if (err) {
        err.status = err.code === 'ENAMETOOLONG' ? 414 : 500
        return next(err)
      }

      if (!stat.isDirectory()) return next()

      // fetch files
      debug('readdir "%s"', path)
      fs.readdir(path, function (err, files) {
        if (err) return next(err)
        if (!hidden) files = removeHidden(files)
        if (!dotFiles) files = removeDotFiles(files)
        if (filter)
          files = files.filter(function (filename, index, list) {
            return filter(filename, index, list, path)
          })
        files.sort()

        // content-negotiation
        const accept = accepts(req)
        const type = accept.type(mediaTypes)

        // not acceptable
        if (!type) return next(createError(406))
        serveIndex[mediaType[type]](req, res, files, next, originalDir, showUp, icons, path, view, template, stylesheet)
      })
    })
  }
}
export default serveIndex

serveIndex.html = function _html(req, res, files, next, dir, showUp, icons, path, view, template, stylesheet) {
  const render = typeof template !== 'function' ? createHtmlRender(template) : template

  if (showUp) {
    files.unshift('..')
  }

  // stat all files
  stat(path, files, function (err, fileList) {
    if (err) return next(err)

    // sort file list
    fileList.sort(fileSort)

    // read stylesheet
    fs.readFile(stylesheet, 'utf8', function (err, style) {
      if (err) return next(err)

      // create locals for rendering
      const locals = {
        directory: dir,
        displayIcons: Boolean(icons),
        fileList: fileList,
        path: path,
        style: style,
        viewName: view
      }

      // render html
      render(locals, function (err, body) {
        if (err) return next(err)
        send(res, 'text/html', body)
      })
    })
  })
}

serveIndex.json = function _json(req, res, files, next, dir, showUp, icons, path) {
  // stat all files
  stat(path, files, function (err, fileList) {
    if (err) return next(err)

    // sort file list
    fileList.sort(fileSort)

    // serialize
    const body = JSON.stringify(
      fileList.map(function (file) {
        return file.name
      })
    )

    send(res, 'application/json', body)
  })
}

serveIndex.plain = function _plain(req, res, files, next, dir, showUp, icons, path) {
  // stat all files
  stat(path, files, function (err, fileList) {
    if (err) return next(err)

    // sort file list
    fileList.sort(fileSort)

    // serialize
    const body =
      fileList
        .map(function (file) {
          return file.name
        })
        .join('\n') + '\n'

    send(res, 'text/plain', body)
  })
}

function createHtmlFileList(files, dir, useIcons, view) {
  let html =
    '<ul id="files" class="view-' +
    escapeHtml(view) +
    '">' +
    (view === 'details'
      ? '<li class="header">' +
        '<span class="name">Name</span>' +
        '<span class="size">Size</span>' +
        '<span class="date">Modified</span>' +
        '</li>'
      : '')

  html += files
    .map(function (file) {
      const classes: string[] = []
      const isDir = file.stat && file.stat.isDirectory()
      const path = dir.split('/').map(function (c) {
        return encodeURIComponent(c)
      })

      if (useIcons) {
        classes.push('icon')

        if (isDir) {
          classes.push('icon-directory')
        } else {
          const ext = extname(file.name)
          const icon = iconLookup(file.name)

          classes.push('icon')
          classes.push('icon-' + ext.substring(1))

          if (classes.indexOf(icon.className) === -1) {
            classes.push(icon.className)
          }
        }
      }

      path.push(encodeURIComponent(file.name))

      const date =
        file.stat && file.name !== '..'
          ? file.stat.mtime.toLocaleDateString() + ' ' + file.stat.mtime.toLocaleTimeString()
          : ''
      const size = file.stat && !isDir ? file.stat.size : ''

      return (
        '<li><a href="' +
        escapeHtml(normalizeSlashes(normalize(path.join('/')))) +
        '" class="' +
        escapeHtml(classes.join(' ')) +
        '"' +
        ' title="' +
        escapeHtml(file.name) +
        '">' +
        '<span class="name">' +
        escapeHtml(file.name) +
        '</span>' +
        '<span class="size">' +
        escapeHtml(size) +
        '</span>' +
        '<span class="date">' +
        escapeHtml(date) +
        '</span>' +
        '</a></li>'
      )
    })
    .join('\n')

  html += '</ul>'

  return html
}

function createHtmlRender(template) {
  return function render(locals, callback) {
    // read template
    fs.readFile(template, 'utf8', function (err, str) {
      if (err) return callback(err)

      const body = str
        .replace(/\{style\}/g, locals.style.concat(iconStyle(locals.fileList, locals.displayIcons)))
        .replace(
          /\{files\}/g,
          createHtmlFileList(locals.fileList, locals.directory, locals.displayIcons, locals.viewName)
        )
        .replace(/\{directory\}/g, escapeHtml(locals.directory))
        .replace(/\{linked-path\}/g, htmlPath(locals.directory))

      callback(null, body)
    })
  }
}

function fileSort(a, b) {
  // sort ".." to the top
  if (a.name === '..' || b.name === '..') {
    return a.name === b.name ? 0 : a.name === '..' ? -1 : 1
  }

  return (
    Number(b.stat && b.stat.isDirectory()) - Number(a.stat && a.stat.isDirectory()) ||
    String(a.name).toLocaleLowerCase().localeCompare(String(b.name).toLocaleLowerCase())
  )
}

function getRequestedDir(req) {
  try {
    return decodeURIComponent(parseUrl(req).pathname)
  } catch (e) {
    return null
  }
}

function htmlPath(dir) {
  const parts = dir.split('/')
  const crumb = new Array(parts.length)

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]

    if (part) {
      parts[i] = encodeURIComponent(part)
      crumb[i] = '<a href="' + escapeHtml(parts.slice(0, i + 1).join('/')) + '">' + escapeHtml(part) + '</a>'
    }
  }

  return crumb.join(' / ')
}

function iconLookup(filename) {
  const ext = extname(filename)

  // try by extension
  if (icons[ext]) {
    return {
      className: 'icon-' + ext.substring(1).split('.').join('-'),
      fileName: icons[ext]
    }
  }

  const mimetype = mime.lookup(ext)
  console.log('mimetype', mimetype)

  // default if no mime type
  if (mimetype === false) {
    return {
      className: 'icon-default',
      fileName: icons.default
    }
  }

  // try by mime type
  if (icons[mimetype]) {
    return {
      className: 'icon-' + mimetype.replace('/', '-'),
      fileName: icons[mimetype]
    }
  }

  const suffix = mimetype.split('+')[1]

  if (suffix && icons['+' + suffix]) {
    return {
      className: 'icon-' + suffix,
      fileName: icons['+' + suffix]
    }
  }

  const type = mimetype.split('/')[0]

  // try by type only
  if (icons[type]) {
    return {
      className: 'icon-' + type,
      fileName: icons[type]
    }
  }

  return {
    className: 'icon-default',
    fileName: icons.default
  }
}

function iconStyle(files, useIcons) {
  if (!useIcons) return ''
  let i
  const list: any[] = []
  const rules = {}
  let selector
  const selectors = {}
  let style = ''
  let iconName

  for (i = 0; i < files.length; i++) {
    const file = files[i]

    const isDir = file.stat && file.stat.isDirectory()
    const icon = isDir ? { className: 'icon-directory', fileName: icons.folder } : iconLookup(file.name)
    iconName = icon.fileName

    selector = '#files .' + icon.className + ' .name'

    if (!rules[iconName]) {
      rules[iconName] = load(iconName)
      selectors[iconName] = []
      list.push(iconName)
    }

    if (selectors[iconName].indexOf(selector) === -1) {
      selectors[iconName].push(selector)
    }
  }

  for (i = 0; i < list.length; i++) {
    iconName = list[i]
    style += selectors[iconName].join(',\n') + ' {\n  ' + rules[iconName] + '\n}\n'
  }

  return style
}

function load(icon) {
  if (cache[icon]) return cache[icon]
  return (cache[icon] = 'background-image: url(/fiveserver/serve-index/icons/' + icon + ');')
}

function normalizeSlashes(path) {
  return path.split(sep).join('/')
}

function removeHidden(files) {
  const hide = ['.git', '.cache']

  return files.filter(function (file) {
    return !hide.includes(file)
  })
}

function removeDotFiles(files) {
  return files.filter(function (file) {
    return file[0] !== '.'
  })
}

function send(res, type, body) {
  // security header for content sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // standard headers
  res.setHeader('Content-Type', type + '; charset=utf-8')
  res.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'))

  // body
  res.end(body, 'utf8')
}

function stat(dir, files, cb) {
  const batch = new Batch()

  batch.concurrency(10)

  files.forEach(function (file) {
    batch.push(function (done) {
      fs.stat(join(dir, file), function (err, stat) {
        if (err && err.code !== 'ENOENT') return done(err)

        // pass ENOENT as null stat, not error
        done(null, {
          name: file,
          stat: stat || null
        })
      })
    })
  })

  batch.end(cb)
}

const icons = {
  // base icons
  default: 'file.svg',
  folder: 'folder.svg',

  // generic mime type icons
  font: 'font.svg',
  image: 'image.svg',
  text: 'document.svg',
  video: 'video.svg',
  audio: 'audio.svg',

  // generic mime suffix icons
  '+json': 'json.svg',
  '+xml': 'xml.svg',
  '+zip': 'zip.svg',

  // specific mime type icons
  'application/javascript': 'javascript.svg',
  'application/json': 'json.svg',
  // 'application/msword': 'page_white_word.png',
  'application/pdf': 'pdf.svg',
  'application/postscript': 'svg.svg',
  // 'application/rtf': 'page_white_word.png',
  // 'application/vnd.ms-excel': 'page_white_excel.png',
  // 'application/vnd.ms-powerpoint': 'page_white_powerpoint.png',
  // 'application/vnd.oasis.opendocument.presentation': 'page_white_powerpoint.png',
  // 'application/vnd.oasis.opendocument.spreadsheet': 'page_white_excel.png',
  // 'application/vnd.oasis.opendocument.text': 'page_white_word.png',
  'application/x-7z-compressed': 'zip.svg',
  'application/x-sh': 'console.svg',
  'application/x-msaccess': 'database.svg',
  'application/x-sql': 'database.svg',
  'application/x-tar': 'zip.svg',
  'application/x-xz': 'zip.svg',
  'application/xml': 'xml.svg',
  'application/zip': 'zip.svg',
  'image/svg+xml': 'svg.svg',

  // special
  CHANGELOG: 'changelog.svg',
  ESLINT: 'eslint.svg',
  FIVESERVER: 'fiveserver.svg',
  GIT: 'git.svg',
  LICENSE: 'certificate.svg',
  NODEJS: 'nodejs.svg',
  NPM: 'npm.svg',
  PRETTIER: 'prettier.svg',
  README: 'readme.svg',
  '.test.js': 'test-js.svg',
  '.test.jsx': 'test-jsx.svg',
  '.test.ts': 'test-ts.svg',

  // other, extension-specific icons (.svg from https://github.com/PKief/vscode-material-icon-theme/tree/master/icons)
  '.cert': 'certificate.svg',
  '.cjs': 'javascript.svg',
  '.css': 'css.svg',
  '.d.ts': 'typescript-def.svg',
  '.html': 'html.svg',
  '.info': 'readme.svg',
  '.js': 'javascript.svg',
  '.json': 'json.svg',
  '.jsx': 'react.svg',
  '.key': 'key.svg',
  '.less': 'less.svg',
  '.md': 'markdown.svg',
  '.mjs': 'javascript.svg',
  '.pem': 'key.svg',
  '.sass': 'sass.svg',
  '.scss': 'sass.svg',
  '.svg': 'svg.svg',
  '.ts': 'typescript.svg',
  '.tsx': 'react_ts.svg',
  '.yaml': 'yaml.svg',
  '.yml': 'yaml.svg',

  // other, extension-specific icons
  '.accdb': 'database.svg',
  '.apk': 'zip.svg',
  '.app': 'console.svg',
  // '.as': 'page_white_actionscript.png',
  // '.asp': 'page_white_code.png',
  // '.aspx': 'page_white_code.png',
  '.bat': 'console.svg',
  '.bz2': 'zip.svg',
  '.c': 'c.svg',
  '.cab': 'zip.svg',
  '.cc': 'cpp.svg',
  '.cgi': 'console.svg',
  '.cpp': 'cpp.svg',
  // '.cs': 'page_white_csharp.png',
  '.db': 'database.svg',
  '.deb': 'zip.svg',
  '.dll': 'settings.svg',
  // '.dmg': 'drive.png',
  // '.docx': 'page_white_word.png',
  // '.erb': 'page_white_ruby.png',
  '.exe': 'console.svg',
  '.fnt': 'font.svg',
  '.gz': 'zip.svg',
  '.h': 'h.svg',
  '.iso': 'disc.svg',
  '.jar': 'zip.svg',
  '.java': 'java.svg',
  // '.jsp': 'page_white_cup.png',
  // '.lua': 'page_white_code.png',
  '.lz': 'zip.svg',
  '.lzma': 'zip.svg',
  '.msi': 'zip.svg',
  '.mv4': 'video.svg',
  '.php': 'php.svg',
  // '.pl': 'page_white_code.png',
  '.pkg': 'zip.svg',
  // '.pptx': 'page_white_powerpoint.png',
  '.psd': 'image.svg',
  // '.py': 'page_white_code.png',
  '.rar': 'zip.svg',
  // '.rb': 'page_white_ruby.png',
  '.rm': 'video.svg',
  '.rpm': 'zip.svg',
  '.tbz2': 'zip.svg',
  '.tgz': 'zip.svg',
  '.tlz': 'zip.svg',
  // '.vb': 'page_white_code.png',
  // '.vbs': 'page_white_code.png',
  '.xcf': 'image.svg'
  // '.xlsx': 'page_white_excel.png'
}
