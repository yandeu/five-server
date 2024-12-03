/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import type { ChildProcess } from 'child_process'
import { colors } from './colors'
import { message } from './msg'
import open from '@yandeu/open-cjs'

export class OpenBrowser {
  constructor(public _open: any) {}

  private async _o(target: string, cfg: any = {}): Promise<void | ChildProcess> {
    return new Promise(resolve => {
      try {
        this._open(target, { wait: false, ...cfg }).then(a => {
          a.once('error', () => {
            return resolve()
          })
          a.once('exit', () => {
            return resolve()
          })
          a.once('spawn', () => {
            return resolve(a)
          })
        })
      } catch (error) {
        resolve()
      }
    })
  }

  private async launchDefaultBrowser(target: string): Promise<void | ChildProcess> {
    await this.launchBrowser(target, 'default')
  }

  private async open(target: string, browser?: string) {
    if (!browser || browser === 'default') return await this._o(target)

    const hasArguments = browser.includes('--')

    if (!hasArguments) return await this._o(target, { app: { name: browser } })

    if (hasArguments) {
      const b = browser.split('--').map(c => c.trim())

      return await this._o(target, {
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

    const is_undefined_str = browser => typeof browser === 'string' && browser === 'undefined'

    if (!res) {
      if (typeof browser === 'string') {
        if (browser === 'default') {
          message.log(colors(`Could not open the default browser. Will abort!`, 'red'))
          return
        } else {
          if (!is_undefined_str(browser)) {
            message.log(colors(`Could not open browser "${browser}". Trying the default browser next.`, 'yellow'))
          }
          await this.launchDefaultBrowser(target)
        }
      } else if (Array.isArray(browser)) {
        if (typeof browser[index + 1] === 'undefined') {
          if (!is_undefined_str(browser[index])) {
            message.log(
              colors(`Could not open browser "${browser[index]}". Trying the default browser next.`, 'yellow')
            )
          }
          await this.launchDefaultBrowser(target)
        } else {
          if (!is_undefined_str(browser[index])) {
            message.log(
              colors(`Could not open browser "${browser[index]}". Trying "${browser[index + 1]}" next.`, 'yellow')
            )
          }
          await this.launchBrowser(target, browser, index)
        }
      }
    }
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
