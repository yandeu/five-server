// Single Page Apps - redirect to /#/ except when a file extension is given
import path from 'path'

const SPAIgnoreAssets = (req: any, res: any, next: any) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') next()
  if (req.url !== '/' && path.extname(req.url) === '') {
    const route = req.url
    req.url = '/'
    res.statusCode = 302
    res.setHeader('Location', `${req.url}#${route}`)
    res.end()
  } else next()
}

export default SPAIgnoreAssets
