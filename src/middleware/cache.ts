/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import type { Response } from 'express'
import { extname } from 'path'
import { fetch } from '../fetch'
import { fileTypes } from '../fileTypes'

const _cache: Map<string, { timestamp: number; file: string | Buffer }> = new Map()
const _maxCacheTime = 3600 // one hour (in seconds)

export const cache = async (req, res: Response, next) => {
  const url = req.url.replace(/^\//, '')
  const ext = extname(new URL(url, undefined).pathname)
  const now = new Date().getTime()
  const data = _cache.get(url)

  if (data) {
    const age = Math.round((now - data?.timestamp) / 1000)

    if (age < _maxCacheTime) {
      res.setHeader('Age', age)
      res.setHeader('X-Cache', 'Hit from fiveserver')
      return res.type(ext).send(data.file)
    }
  }

  try {
    const data = await fetch(url)
    const file = fileTypes.isImage(ext) ? data : data.toString('utf-8')

    _cache.set(url, { timestamp: now, file })

    res.setHeader('Age', 0)
    res.setHeader('X-Cache', 'Miss from fiveserver')
    return res.type(ext).send(file)
  } catch (error) {
    return res.status(error.code).send(error.message)
  }
}
