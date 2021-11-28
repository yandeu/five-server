exports.listen = async (app, port) => {
  return new Promise(resolve => {
    const server = app.listen(port, () => {
      return resolve(server)
    })
  })
}

exports.close = async server => {
  return new Promise(resolve => {
    server.close(() => {
      return resolve()
    })
  })
}
