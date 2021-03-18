// Single Page Apps - redirect to /#/
const SPA = (req: any, res: any, next: any) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') next()
  if (req.url !== '/') {
    const route = req.url
    req.url = '/'
    res.statusCode = 302
    res.setHeader('Location', `${req.url}#${route}`)
    res.end()
  } else next()
}

export default SPA
