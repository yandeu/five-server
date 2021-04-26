/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import { join } from 'path'
import { readFileSync } from 'fs'

let icon

export const favicon = (req: any, res: any, next: any) => {
  if (/favicon\.ico$/.test(req.url)) {
    if (!icon) icon = readFileSync(join(__dirname, '../../public/favicon.ico'))
    res.type('ico').send(icon)
  } else {
    return next()
  }
}
