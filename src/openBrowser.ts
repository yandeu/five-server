/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import _open from 'open'
import { colors } from './colors'
import { message } from './msg'

const launchDefaultBrowser = async (target: string) => {
  await launchBrowser(target, 'default')
}

const open = async (target: string, browser?: string) => {
  if (!browser || browser === 'default') return await _open(target)

  const hasArguments = browser.includes('--')

  if (!hasArguments) return await _open(target, { app: { name: browser } })

  if (hasArguments) {
    const b = browser.split('--').map(c => c.trim())

    return await _open(target, {
      app: { name: b.shift() as string, arguments: b.map(arg => `--${arg}`) }
    })
  }
}

const launchBrowser = async (target: string, browser: string | string[] = 'default', index = -1) => {
  let res

  // browser is string
  if (typeof browser === 'string') res = await open(target, browser)
  // browser is empty array
  else if (Array.isArray(browser) && browser.length === 0) res = await launchDefaultBrowser(target)
  // browser is non-empty array
  else if (Array.isArray(browser)) {
    index++
    res = await open(target, browser[index])
  }

  if (res)
    res.once('exit', code => {
      if (code && code > 0) {
        if (typeof browser === 'string') {
          message.log(colors(`Could not open browser "${browser}". Trying the default browser next.`, 'yellow'))
          launchDefaultBrowser(target)
        } else if (Array.isArray(browser)) {
          if (typeof browser[index + 1] === 'undefined') {
            message.log(
              colors(`Could not open browser "${browser[index]}". Trying the default browser next.`, 'yellow')
            )
            launchDefaultBrowser(target)
          } else {
            message.log(
              colors(`Could not open browser "${browser[index]}". Trying "${browser[index + 1]}" next.`, 'yellow')
            )

            launchBrowser(target, browser, index)
          }
        }
      }
    })
}

/** Launch a new browser window. */
export const openBrowser = async (
  openURL: string,
  path: string | boolean | string[] | null | undefined,
  browser: string | string[] = 'default'
) => {
  // Don't open a browser
  if (path === null) return

  const isURL = path => /^https?.\/\//gm.test(path)

  // Try to open one browser from a list of browsers
  if (Array.isArray(path)) {
    for (const p of path) {
      if (isURL(p)) await launchBrowser(p, browser)
      else await launchBrowser(`${openURL}/${p}`, browser)
    }
  }

  // Open browser "browser"
  if (typeof path === 'string') {
    if (isURL(path)) await launchBrowser(path, browser)
    else await launchBrowser(`${openURL}/${path}`, browser)
  }
}
