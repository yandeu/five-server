const example = (req: any, res: any, next: any) => {
  res.statusCode = 202
  next()
}

export default example
