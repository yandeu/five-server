#!/usr/bin/env node

/**
 * @copyright   Copyright (c) 2012 Tapio Vierros (https://github.com/tapio)
 * @copyright   Copyright (c) 2021 Yannick Deubel (https://github.com/yandeu)
 * @license     {@link https://github.com/yandeu/five-server/blob/main/LICENSE.md|LICENSE}
 */

import { NAME, VERSION } from './const'
import { getConfigFile, removeLeadingSlash } from './misc'
import LiveServer from './index'
import { message } from './msg'
import path from 'path'

// clear the log
console.clear()

const liveServer = new LiveServer()
let isTesting = false

const opts: any = getConfigFile()
opts._cli = true

for (let i = process.argv.length - 1; i >= 2; --i) {
  const arg = process.argv[i]
  if (arg.indexOf('--root=') > -1) {
    const root = arg.substring(7)
    opts.root = root
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--useLocalIp') > -1) {
    opts.useLocalIp = true
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--php=') > -1) {
    const php = arg.substring(6)
    opts.php = php
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--phpIni=') > -1) {
    const phpIni = arg.substring(9)
    opts.phpIni = phpIni
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--remoteLogs=') > -1) {
    const log = arg.substring(13)
    if (log === 'true') opts.remoteLogs = true
    else if (log === 'false') opts.remoteLogs = false
    else opts.remoteLogs = log
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--port=') > -1) {
    const portString = arg.substring(7)
    const portNumber = parseInt(portString, 10)
    if (portNumber === +portString) {
      opts.port = portNumber
      process.argv.splice(i, 1)
    }
  } else if (arg.indexOf('--host=') > -1) {
    opts.host = arg.substring(7)
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--open=') > -1) {
    const open = arg.substring(7)

    if (open === 'true') opts.open = true
    else if (open === 'false') opts.open = false
    else if (/,/.test(open)) opts.open = open.split(',').map(opn => (opn === '/' ? '' : opn))
    else opts.open = open

    process.argv.splice(i, 1)
  } else if (arg.indexOf('--watch=') > -1) {
    // Will be modified later when cwd is known
    opts.watch = arg.substring(8).split(',')
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--ignore=') > -1) {
    // Will be modified later when cwd is known
    opts.ignore = arg.substring(9).split(',')
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--ignorePattern=') > -1) {
    opts.ignorePattern = new RegExp(arg.substring(16))
    process.argv.splice(i, 1)
  } else if (arg === '--no-css-inject') {
    opts.injectCss = false
    process.argv.splice(i, 1)
  } else if (arg === '--no-browser') {
    opts.open = false
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--browser=') > -1) {
    opts.browser = arg.substring(10).split(',')
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--entry-file=') > -1) {
    const file = arg.substring(13)
    if (file.length) {
      opts.file = file
      process.argv.splice(i, 1)
    }
  } else if (arg === '--spa') {
    opts.middleware.push('spa')
    process.argv.splice(i, 1)
  } else if (arg === '--quiet' || arg === '-q') {
    opts.logLevel = 0
    process.argv.splice(i, 1)
  } else if (arg === '--verbose' || arg === '-V') {
    opts.logLevel = 3
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--mount=') > -1) {
    // e.g. "--mount=/components:./node_modules" will be ['/components', '<process.cwd()>/node_modules']
    // split only on the first ":", as the path may contain ":" as well (e.g. C:\file.txt)
    const match = arg.substring(8).match(/([^:]+):(.+)$/)
    if (!match) message.error('Option --mount is wrong', null, false)
    else {
      match[2] = path.resolve(process.cwd(), match[2])
      opts.mount.push([match[1], match[2]])
      process.argv.splice(i, 1)
    }
  } else if (arg.indexOf('--wait=') > -1) {
    const waitString = arg.substring(7)
    const waitNumber = parseInt(waitString, 10)
    if (waitNumber === +waitString) {
      opts.wait = waitNumber
      process.argv.splice(i, 1)
    }
  } else if (arg === '--version' || arg === '-v') {
    message.log(NAME, VERSION)
    process.exit()
  } else if (arg.indexOf('--htpasswd=') > -1) {
    opts.htpasswd = arg.substring(11)
    process.argv.splice(i, 1)
  } else if (arg === '--cors') {
    opts.cors = true
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--https=') > -1) {
    const https = arg.substring(8)
    if (https === 'true') opts.https = true
    else opts.https = https
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--https-module=') > -1) {
    opts.httpsModule = arg.substring(15)
    process.argv.splice(i, 1)
  } else if (arg.indexOf('--proxy=') > -1) {
    // split only on the first ":", as the URL will contain ":" as well
    const match = arg.substring(8).match(/([^:]+):(.+)$/)
    if (!match) message.error('Option --proxy is wrong', null, false)
    else {
      opts.proxy.push([match[1], match[2]])
      process.argv.splice(i, 1)
    }
  } else if (arg.indexOf('--middleware=') > -1) {
    opts.middleware.push(arg.substring(13))
    process.argv.splice(i, 1)
  } else if (arg === '--help' || arg === '-h') {
    message.log(
      'Usage: live-server [-v|--version] [-h|--help] [-q|--quiet] [--port=PORT] [--host=HOST] [--open=PATH] [--no-browser] [--browser=BROWSER] [--ignore=PATH] [--ignorePattern=RGXP] [--no-css-inject] [--entry-file=PATH] [--spa] [--mount=ROUTE:PATH] [--wait=MILLISECONDS] [--htpasswd=PATH] [--cors] [--https=PATH] [--https-module=MODULE_NAME] [--proxy=PATH] [PATH]'
    )
    process.exit()
  } else if (arg === '--test') {
    // Hidden param for tests (with jest) to exit automatically
    isTesting = true
    process.argv.splice(i, 1)
  }
}

// Patch paths
opts.root = process.argv[2] ? removeLeadingSlash(process.argv[2]) : opts.root

if (opts.watch) {
  if (opts.length === 1 && opts.watch[0] === 'true') opts.watch = true
  else if (opts.length === 1 && opts.watch[0] === 'false') opts.watch = false
  else {
    if (typeof opts.watch === 'string') opts.watch = [opts.watch]
    opts.watch = opts.watch.map(function (relativePath) {
      return path.join(path.resolve(), relativePath)
    })
  }
}
if (opts.ignore) {
  if (typeof opts.ignore === 'string') opts.ignore = [opts.ignore]
}

if (!isTesting) liveServer.start(opts)

// when testing with jest
if (isTesting) {
  liveServer.start(opts).then(() => {
    setTimeout(() => {
      liveServer.shutdown().then(() => {
        setTimeout(() => {
          process.exit(0)
        }, 500)
      })
    }, 500)
  })
}
