const express = require('express')
const fs = require('fs')
const app = express()
const port = 3000

const html = () => fs.readFileSync('./template.html', { encoding: 'utf-8' })
const toHtml = body => html().replace('{body}', body)

app.get('/', (req, res) => {
  const content = `
    <h1>This is the index file</h1>
    <p>Modify this file in "server.js" and you will see that the browser refreshed automatically!</p>
    <a href="/hello">go to /hello</a>
    `
  res.send(toHtml(content))
})

app.get('/hello', (req, res) => {
  const content = `
    <h1>Hello World!</h1>
    <a href="/">back to /index.html</a>
    `
  res.send(toHtml('Hello World!'))
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
