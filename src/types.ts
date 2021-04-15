import { Colors } from './colors'

/** Glob Pattern */
export type Glob = string

/** Https Certificate */
export interface Certificate {
  cert: any
  key: any
  passphrase?: string
}

/** five-server start params */
export interface LiveServerParams {
  /** Open a specific browser instead of the default one. */
  browser?: string | string[]
  /** Enable or disable the use of a config file. Or specify a custom path to your config file. */
  configFile?: boolean | string
  /** Enable CORS. */
  cors?: boolean
  /** When set, serve this file (server root relative) for every 404 (useful for single-page applications). */
  file?: string
  /** Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP. */
  host?: string
  /** Path to htpasswd file to enable HTTP Basic authentication */
  htpasswd?: string
  /** Enable https in your browser. */
  https?: boolean | string | Certificate
  /** Files/Folders to ignore from watching. */
  ignore?: Array<string | RegExp | Glob>
  /** 0 = errors only, 1 = some, 2 = lots, 3 = all */
  logLevel?: 0 | 1 | 2 | 3
  /** Mount a directory to a route, e.g. [['/components', './node_modules']]. */
  mount?: string[][]
  /** Takes an array of Connect-compatible middleware that are injected into the server middleware stack. */
  middleware?: Array<(req: any, res: any, next: any) => void>
  /** Set to false to not inject CSS changes, just reload as with any other file change. */
  injectCss?: boolean
  /** Subpath(s) to open in browser, use false to suppress launch. */
  open?: string | string[] | boolean | null
  /** Absolute path to PHP executable. */
  php?: string
  /** Absolute path to php.ini file. */
  phpIni?: string
  /** Set the server port. Defaults to 5555. */
  port?: number
  /** Proxy all requests for ROUTE to URL. */
  proxy?: string[][]
  /** Displays the logs of your browser in your terminal. Default: false. */
  remoteLogs?: boolean | Colors
  /** Set root directory that's being served. Defaults to cwd. */
  root?: string
  /** This option lets the browser open with your local IP. */
  useLocalIp?: boolean
  /** Waits for all changes, before reloading. Defaults to 0 sec. */
  wait?: number
  /** Paths to exclusively watch for changes. Defaults to cwd. */
  watch?: boolean | Array<string | RegExp | Glob>

  /** Highlights the code you are working on. (VSCode Extension only) */
  highlight?: boolean
  /** Set to false to not inject body changes. (VSCode Extension only) */
  injectBody?: boolean
  /** Navigates your browser automatically to the current working file. (VSCode Extension only) */
  navigate?: boolean
  /** Access your page with or without file extension.
   * @example 'redirect' will redirect /contact.html to /contact.
   */
  withExtension?: 'always' | 'avoid' | 'redirect' | 'unset'
  /** @private Absolute path of your workspace. (VSCode Extension only) */
  workspace?: string

  /** @deprecated No need for an external https module */
  httpsModule?: any
  /** @deprecated Use ignore instead. */
  ignorePattern?: any
  /** @deprecated Use open instead. */
  noBrowser?: boolean
  /** @deprecated No one uses /# anymore. */
  spa?: boolean

  /** @private Doesn't fetch the config file twice. */
  _cli?: boolean
}
