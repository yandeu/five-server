import { LiveServerParams } from '.'
import fs from 'fs'
import path from 'path'

export const error = (msg: string) => {
  if (msg) console.log(msg)
  else console.log('ERROR: Unknown :/')

  process.exit(1)
}

// just a fallback for removing http-errors dependency
export const createError = (code: number, msg: string = 'unknown', _nothing?: any) => {
  console.log(`ERROR: ${code} ${msg}`)
  return { message: msg, code, status: code, statusCode: code, name: code }
}

export const escape = html => {
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const removeLeadingSlash = (str: string): string => {
  return str.replace(/^\/+/g, '')
}

export const removeTrailingSlash = (str: string) => {
  return str.replace(/\/+$/g, '')
}

/**
 * Get and parse the configFile.
 * @param configFile Absolute path of configFile, or true, or false.
 * @param workspace Absolute path to the current workspace.
 * @returns LiveServerParams
 */
export const getConfigFile = (configFile: string | boolean = true, workspace?: string): LiveServerParams => {
  let options: LiveServerParams = {
    host: process.env.IP,
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
    open: true,
    mount: [],
    proxy: [],
    middleware: [],
    logLevel: 2
  }

  if (configFile === false) return options

  const dirs: string[] = []
  const files = [
    '.fiveserverrc',
    '.fiveserverrc.json',
    '.fiveserverrc.js',
    '.fiveserverrc.cjs',
    'fiveserver.config.js',
    'fiveserver.config.cjs',
    '.live-server.json'
  ]

  if (typeof configFile === 'string') {
    // TODO: Add support for this
    files.unshift(configFile)
  }

  if (workspace) dirs.push(workspace)

  dirs.push(path.resolve())

  const homeDir = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME']
  if (homeDir) dirs.push(homeDir)

  dirs.push(process.cwd())

  loop: for (const d of dirs) {
    for (const f of files) {
      const configPath = path.join(d, f)
      if (fs.existsSync(configPath)) {
        if (/\.c?js/.test(path.extname(configPath))) {
          const config = require(configPath)
          options = { ...options, ...config }
        } else {
          const config = fs.readFileSync(configPath, 'utf8')
          options = { ...options, ...JSON.parse(config) }
        }

        if (options.ignorePattern) options.ignorePattern = new RegExp(options.ignorePattern)

        break loop
      }
    }
  }

  // some small adjustments
  if (options.root) options.root = options.root.replace(/^\/+/, '')
  if (options.open === 'true') options.open = true
  if (options.open === 'false') options.open = false
  if (options.https === 'true') options.https = true

  return options
}

/**
 * @author       Benjamin Thomas (https://github.com/bentomas)
 * @author       Robert Kieffer (https://github.com/broofa)
 * @copyright    Copyright (c) 2010 Benjamin Thomas, Robert Kieffer
 * @license      {@link https://github.com/broofa/mime/blob/v1.x/LICENSE|MIT}
 * @description  charset() methods have been removed from mime v2, this is why I added it here
 */
/** Lookup a charset based on mime type. */
export const charsets = {
  lookup: (mimeType, fallback?) => {
    // Assume text types are utf8
    return /^text\/|^application\/(javascript|json)/.test(mimeType) ? 'UTF-8' : fallback
  }
}
