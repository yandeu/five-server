import { join } from 'path'
import { readFileSync } from 'fs'

export const INJECTED_CODE = readFileSync(join(__dirname, '../client/injected.js'), 'utf8')
export const STATUS_CODE = readFileSync(join(__dirname, '../public/serve-preview/status.html'), 'utf8')
export const PHP_ERROR = readFileSync(join(__dirname, '../public/serve-php/error.html'), 'utf8')
export const PHP_TEMPLATE = readFileSync(join(__dirname, '../public/serve-php/index.html'), 'utf8')
export const PREVIEW = readFileSync(join(__dirname, '../public/serve-preview/preview.html'), 'utf8')
