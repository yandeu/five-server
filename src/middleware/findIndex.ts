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

    const isAllowedExtension = reg.test(req.url)
    const hasNoExtension = extname(req.url) === ''

    if (withExtension === 'always' && hasNoExtension) return next()
    if (withExtension === 'avoid' && isAllowedExtension) return next()
    if (withExtension === 'redirect') {
      if (isAllowedExtension) {
        const reg = new RegExp(`${extname(req.url)}$`)
        return res.redirect(req.url.replace(reg, ''))
      }
    }

    if (hasNoExtension) {
      // get the absolute path
      const absolute = resolve(join(root + req.pathname))

      // check if file exists and modify req.url
      extensions.forEach(ext => {
        if (existsSync(`${absolute}.${ext}`)) req.url = removeDoubleSlash(`${req.pathname}.${ext}`)
        else if (existsSync(`${absolute}/index.${ext}`)) req.url = removeDoubleSlash(`${req.pathname}/index.${ext}`)
      })
    }

    // re-add query params
    const queryString = new URLSearchParams(req.query).toString()
    req.url += queryString

    next()
  }
}
