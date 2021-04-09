/**
 * @copyright   Copyright (c) 2012 Tapio Vierros (https://github.com/tapio)
 * @license     {@link https://github.com/tapio/live-server#license|MIT}
 */

const example = (req: any, res: any, next: any) => {
  res.statusCode = 202
  next()
}

export default example
