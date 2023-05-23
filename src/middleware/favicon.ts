/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import { FAVICON } from '../public'

let icon

export const favicon = (req: any, res: any, next: any) => {
  if (/favicon\.ico$/.test(req.url)) {
    if (!icon) icon = FAVICON
    res.type('ico').send(icon)
  } else {
    return next()
  }
}
