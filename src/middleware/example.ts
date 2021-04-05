/**
 * @copyright   Copyright (c) 2021 Yannick Deubel (https://github.com/yandeu)
 * @license     {@link https://github.com/tapio/live-server#license|MIT}
 */

const example = (req: any, res: any, next: any) => {
  res.statusCode = 202
  next()
}

export default example
