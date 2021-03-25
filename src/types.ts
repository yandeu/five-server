/** five-server start params */
export interface LiveServerParams {
  /** When set, serve this file (server root relative) for every 404 (useful for single-page applications). */
  file?: string
  /**  Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP. */
  host?: string
  /** Path to htpasswd file to enable HTTP Basic authentication */
  htpasswd?: string
  /** Comma-separated string for paths to ignore. */
  ignore?: string
  /** Ignore files by RegExp. */
  ignorePattern?: any
  /** 0 = errors only, 1 = some, 2 = lots */
  logLevel?: 0 | 1 | 2
  /** Mount a directory to a route, e.g. [['/components', './node_modules']].*/
  mount?: string[][]
  /** Takes an array of Connect-compatible middleware that are injected into the server middleware stack. */
  middleware?: Array<(req: any, res: any, next: any) => void>
  /** Set to false to not inject body changes. (Default: false; Experimental; VSCode only) */
  injectBody?: boolean
  /** Set to false to not inject CSS changes, just reload as with any other file change. */
  injectCss?: boolean
  /** Subpath(s) to open in browser, use false to suppress launch. */
  open?: string | string[] | boolean | null
  /** Set the server port. Defaults to 8080. */
  port?: number
  /** Set root directory that's being served. Defaults to cwd. */
  root?: string
  /** Waits for all changes, before reloading. Defaults to 0 sec. */
  wait?: number
  /** Paths to exclusively watch for changes */
  watch?: string[]

  /** @deprecated Use open instead */
  noBrowser?: boolean

  spa?: boolean
  browser?: string
  cors?: boolean
  https?: any
  proxy?: any
  httpsModule?: any
  configFile?: any

  _cli?: boolean
}
