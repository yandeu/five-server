/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import { extname, join, resolve } from 'path'
import { existsSync } from 'fs'
import { removeDoubleSlash } from '../helpers'
import type { Request } from 'express'
import url from 'node:url'

/** Checks if there is an index file and modifies req.url */
export const findIndex = (
  root: string,
  withExtension: 'always' | 'avoid' | 'redirect' | 'unset' = 'unset',
  extensions: string[] = ['html', 'php']
) => {
  return async (req: Request, res, next) => {
    const reg = new RegExp(`(${extensions.join('|')})$`)
    const pathname = url.parse(req.url).pathname || ''

    const isAllowedExtension = reg.test(pathname)
    const hasExtension = extname(pathname) !== ''

    if (withExtension === 'always' && !hasExtension) return next()
    else if (withExtension === 'avoid' && isAllowedExtension) return next()
    else if (withExtension === 'redirect') {
      if (isAllowedExtension) {
        const redirectTo = req.url.replace(extname(pathname), '')
        return res.redirect(redirectTo)
      }
    }

    if (!hasExtension) {
      // get the absolute path
      const absolute = resolve(join(root + pathname))

      // check if file exists and modify req.url
      extensions.forEach(ext => {
        if (existsSync(`${absolute}.${ext}`)) req.url = removeDoubleSlash(`${pathname}.${ext}`)
        else if (existsSync(`${absolute}/index.${ext}`)) req.url = removeDoubleSlash(`${pathname}/index.${ext}`)
      })
    }

    next()
  }
}
