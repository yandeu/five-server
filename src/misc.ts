import fs from 'fs'
import path from 'path'

export const error = (msg: string) => {
  if (msg) console.log(msg)
  else console.log('ERROR: Unknown :/')

  process.exit(1)
}

// just a fallback for removing http-errors dependency
export const createError = (code: number, msg: string = 'unknown', _nothing?: any) => {
  return new Error(`${code.toString()}: ${msg}`)
}

export const escape = html => {
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const removeLeadingSlash = (str: string) => {
  return str.replace(/^\/+/g, '')
}

export const removeTrailingSlash = (str: string) => {
  return str.replace(/\/+$/g, '')
}

export const getConfigFile = (configFile: string | boolean = true) => {
  let options: any = {
    host: process.env.IP,
    port: process.env.PORT,
    open: true,
    mount: [],
    proxy: [],
    middleware: [],
    logLevel: 2
  }

  if (configFile === false) return options
  if (typeof configFile === 'string') {
    console.log(`configFile can't be a string yet`)
    return options
  }

  const dirs = [path.resolve()]
  const files = ['.fiveserverrc', '.prettierrc.json', '.live-server.json']

  const homeDir = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME']
  if (homeDir) dirs.push(homeDir)

  loop: for (const d of dirs) {
    for (const f of files) {
      const configPath = path.join(d, f)
      if (fs.existsSync(configPath)) {
        const userConfig = fs.readFileSync(configPath, 'utf8')
        options = { ...options, ...JSON.parse(userConfig) }
        if (options.ignorePattern) options.ignorePattern = new RegExp(options.ignorePattern)
        break loop
      }
    }
  }

  if (options.root) options.root = options.root.replace(/^\/+/, '')

  return options
}

/**
 * @author       Benjamin Thomas (https://github.com/bentomas)
 * @author       Robert Kieffer (https://github.com/broofa)
 * @copyright    Copyright (c) 2010 Benjamin Thomas, Robert Kieffer
 * @license      {@link  https://github.com/broofa/mime/blob/v1.x/LICENSE|MIT}
 * @description  charset() methods have been removed from mime v2, this is why I added it here
 */
/** Lookup a charset based on mime type. */
export const charsets = {
  lookup: (mimeType, fallback?) => {
    // Assume text types are utf8
    return /^text\/|^application\/(javascript|json)/.test(mimeType) ? 'UTF-8' : fallback
  }
}
