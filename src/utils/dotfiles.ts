/** Plain-text reason shown to the user when a hidden file is requested. */
export const dotfileMessage = (blocked: 'git' | 'dotfile'): string =>
  blocked === 'git'
    ? 'The .git folder is always hidden for security reasons.'
    : 'This is a dotfile. Dotfiles can contain secrets (like .env), so Five Server hides them. To show dotfiles, start Five Server with --dotFiles or set dotFiles: true in your config.'

/**
 * Decides whether a request path points to a hidden file.
 *
 * - ".git" is always hidden.
 * - Any other path segment that starts with "." (e.g. ".env", ".secret/key") is hidden unless `dotFiles` is true.
 *
 * The path is decoded first, so "%2e%2e" and "%2eenv" are treated the same as ".." and ".env".
 * Returns null if the path is not hidden.
 */
export const dotfileBlock = (urlPath: string, dotFiles: boolean): 'git' | 'dotfile' | null => {
  let decoded = urlPath
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    // keep the raw path if it is not valid percent-encoding
  }

  const segments = decoded.split('/')
  if (segments.includes('.git')) return 'git'
  if (!dotFiles && segments.some(segment => segment.startsWith('.'))) return 'dotfile'
  return null
}
