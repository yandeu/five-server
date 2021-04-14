import { join } from 'path'
import { readFileSync } from 'fs'

// const INJECTED_CODE = fs.readFileSync(path.join(__dirname, '../injected.html'), 'utf8')
// export const HIGHLIGHT_CSS = readFileSync(join(__dirname, '../public/serve-preview/vs.min.css'), 'utf8')
// export const HIGHLIGHT_JS = readFileSync(join(__dirname, '../public/serve-preview/highlight.min.js'), 'utf8')
export const INJECTED_CODE = readFileSync(join(__dirname, '../injected.js'), 'utf8')
export const STATUS_CODE = readFileSync(join(__dirname, '../public/serve-preview/status.html'), 'utf8')
export const PHP_ERROR = readFileSync(join(__dirname, '../public/serve-php/error.html'), 'utf8')
export const PHP_TEMPLATE = readFileSync(join(__dirname, '../public/serve-php/index.html'), 'utf8')
export const PREVIEW = readFileSync(join(__dirname, '../public/serve-preview/preview.html'), 'utf8')
