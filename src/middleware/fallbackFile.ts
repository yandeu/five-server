/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

export const fallbackFile = (handler, file) => {
  if (!file)
    return (req, res, next) => {
      next()
    }

  return (req, res, next) => {
    req.url = `/${file}`
    handler(req, res, next)
  }
}
