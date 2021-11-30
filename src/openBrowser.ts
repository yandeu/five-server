/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import { colors } from './colors'
import { message } from './msg'
import open from 'open'

export class OpenBrowser {
  constructor(public _open: any) {}

  private async launchDefaultBrowser(target: string) {
    await this.launchBrowser(target, 'default')
  }

  private async open(target: string, browser?: string) {
    if (!browser || browser === 'default') return await this._open(target)

    const hasArguments = browser.includes('--')

    if (!hasArguments) return await this._open(target, { app: { name: browser } })

    if (hasArguments) {
      const b = browser.split('--').map(c => c.trim())

      return await this._open(target, {
        app: { name: b.shift() as string, arguments: b.map(arg => `--${arg}`) }
      })
    }
  }

  private async launchBrowser(target: string, browser: string | string[] = 'default', index = -1) {
    let res

    // browser is string
    if (typeof browser === 'string') res = await this.open(target, browser)
    // browser is empty array
    else if (Array.isArray(browser) && browser.length === 0) res = await this.launchDefaultBrowser(target)
    // browser is non-empty array
    else if (Array.isArray(browser)) {
      index++
      res = await this.open(target, browser[index])
    }

    if (res)
      res.once('exit', code => {
        if (code && code > 0) {
          if (typeof browser === 'string') {
            message.log(colors(`Could not open browser "${browser}". Trying the default browser next.`, 'yellow'))
            this.launchDefaultBrowser(target)
          } else if (Array.isArray(browser)) {
            if (typeof browser[index + 1] === 'undefined') {
              message.log(
                colors(`Could not open browser "${browser[index]}". Trying the default browser next.`, 'yellow')
              )
              this.launchDefaultBrowser(target)
            } else {
              message.log(
                colors(`Could not open browser "${browser[index]}". Trying "${browser[index + 1]}" next.`, 'yellow')
              )

              this.launchBrowser(target, browser, index)
            }
          }
        }
      })
  }

  /** Launch a new browser window. */
  public async openBrowser(
    openURL: string,
    path: string | boolean | string[] | null | undefined = '',
    browser: string | string[] = 'default'
  ) {
    // openURL is required
    if (!openURL || typeof openURL !== 'string') return
    // Don't open a browser
    if (path === null) return

    // remove trailing slash
    if (openURL) openURL = openURL.replace(/\/+$/, '')

    const isURL = path => /^https?.\/\//gm.test(path)

    // add leading slash
    if (!isURL(path) && typeof path === 'string' && path.length > 0 && !/^\//.test(path)) path = `/${path}`

    // Try to open one browser from a list of browsers
    if (Array.isArray(path)) {
      for (let p of path) {
        if (isURL(p)) await this.launchBrowser(p, browser)
        else {
          // add leading slash
          if (typeof p === 'string' && !/^\//.test(p)) p = `/${p}`
          await this.launchBrowser(`${openURL}${p}`, browser)
        }
      }
    }

    // Open browser "browser"
    if (typeof path === 'string') {
      if (isURL(path)) await this.launchBrowser(path, browser)
      else await this.launchBrowser(`${openURL}${path}`, browser)
    }
  }
}

const ob = new OpenBrowser(open)
export const openBrowser = ob.openBrowser.bind(ob)
