/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import { join, normalize } from 'path'
import { STATUS_CODE } from '../public'
import { fileDoesExist } from '../misc'
import { htmlPath } from './explorer'

export const notFound = (root: string) => {
  return async (req: any, res: any, next: any) => {
    // join / normalize from root dir
    const path = normalize(join(root, req.url))
    const file = req.url.replace(/^\//gm, '') // could be c:/Users/USERNAME/Desktop/website/ for example

    if (await fileDoesExist(file)) {
      const html = STATUS_CODE.replace('{linked-path}', htmlPath(decodeURI(req.url)))
        .replace('{status}', '403')
        .replace('{message}', `Can't access files outside of root.`)
      return res.status(403).send(html)
    }

    if (!(await fileDoesExist(path))) {
      const html = STATUS_CODE.replace('{linked-path}', htmlPath(decodeURI(req.url)))
        .replace('{status}', '404')
        .replace('{message}', 'This page could not be found.')
      return res.status(404).send(html)
    }

    return next()
  }
}
