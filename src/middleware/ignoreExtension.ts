/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

export const ignoreExtension = (extension: string[], handler: Function) => {
  const reg = new RegExp(`${extension.join('|')}$`)

  return (req, res, next) => {
    if (reg.test(req.url)) return next()

    handler(req, res, next)
  }
}
