/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import type { Request, Response } from 'express'
import { extname } from 'path'
import { fileTypes } from '../fileTypes'
import { nodeFetch } from '../nodeFetch'

const _cache: Map<string, { timestamp: number; file: string | Buffer }> = new Map()
const _maxCacheTime = 3600 // one hour (in seconds)

export const cache = async (req: Request, res: Response, next) => {
  let url = req.url.replace(/^\//, '')

  const protocol = req.protocol
  const host = req.headers['host']
  const method = req.method

  const ext = extname(new URL(url, 'http://localhost:8080').pathname)
  const now = new Date().getTime()

  const id = `${method}_${url}`
  const data = _cache.get(id)

  if (data) {
    const age = Math.round((now - data?.timestamp) / 1000)

    if (age < _maxCacheTime) {
      res.setHeader('Age', age)
      res.setHeader('X-Cache', 'Hit from fiveserver')
      return res.type(ext).send(data.file)
    }
  }

  try {
    // if the url is a relative path, prepend protocol and host
    if (!/^https?:\/\//.test(url)) url = `${protocol}://${host}/${url}`

    const data = await nodeFetch(url)
    const file = fileTypes.isImage(ext) ? data : data.toString('utf-8')

    _cache.set(id, { timestamp: now, file })

    res.setHeader('Age', 0)
    res.setHeader('X-Cache', 'Miss from fiveserver')
    return res.type(ext).send(file)
  } catch (error) {
    return res.status(error.code).send(error.message)
  }
}
