import escapeHtml from './dependencies/escape-html'

// https://docs.python.org/3/library/stdtypes.html#str.splitlines
export const splitLines = (str: string): string => {
  return str.replace(/\r\n|\r|\n/gm, '')
}

export const escape = html => escapeHtml(html)

export const removeLeadingSlash = (str: string): string => {
  return str.replace(/^\/+/g, '')
}

export const removeTrailingSlash = (str: string) => {
  return str.replace(/\/+$/g, '')
}

/** Just like path.join() (for url) */
export const appendPathToUrl = (url: string, append: string): string => {
  return `${removeTrailingSlash(url)}/${removeLeadingSlash(append)}`
}
