/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

// https://html-validate.org/dev/using-api.html
import { ExecPHP } from '../utils/execPHP'
import { HtmlValidate } from 'html-validate'
import { basename } from 'path'
import { parentPort } from 'worker_threads'
import { writeFile } from 'fs'

const PHP = new ExecPHP()

const htmlvalidate = new HtmlValidate({
  // https://html-validate.org/rules/index.html
  rules: {
    'close-attr': 'error', // necessary
    'close-order': 'error', // necessary
    'element-name': 'error', // necessary
    deprecated: 'error',
    'no-dup-attr': 'error',
    'no-dup-class': 'error',
    'no-dup-id': 'error'
  }
})

const injectHighlight = (body: string, cursorPosition: any) => {
  if (!cursorPosition) return body

  const lines = body.split('\n')
  let line = cursorPosition.line + 1
  let char: any = cursorPosition.character

  let i = -1
  while (i === -1 && line >= 0 && lines[line]) {
    line--

    if (lines[line] === '') continue
    if (!lines[line]) continue

    const htmlOpenTagRegex = /<[a-zA-Z]+(>|.*?[^?]>)/gm
    const match = lines[line].match(htmlOpenTagRegex)

    if (match) {
      const firstIndex = lines[line].indexOf(match[0])
      const lastIndex = lines[line].lastIndexOf(match[match.length - 1], char ? char : lines[line].length - 1)

      // the open html tag to the left
      if (lastIndex >= 0) i = lastIndex
      // the open html tag to the right
      else if (firstIndex >= 0) i = firstIndex

      // shift i by tag length
      if (i !== -1) i += match[0].length - 1
    }

    char = undefined
  }

  if (i === -1) {
    // console.log("TODO: improve highlight");
    return body
  }

  let part1 = lines[line].slice(0, i).replace(/(<\w[^>]*)(>)(?!.*<\w[^>]*>)/gm, `$1 data-highlight="true">`)
  const part2 = lines[line].slice(i)

  if (!part1.includes('data-highlight="true"')) {
    part1 += ' data-highlight="true"'
  }

  // don't highlight if here is an H
  if (part1.includes(' H ')) {
    part1 = part1.replace(' data-highlight="true"', '')
  }

  // quick fix self closing tags
  // just move the "/" to the end :D
  part1 = part1.replace(' / data-highlight="true"', ' data-highlight="true"/')

  lines[line] = part1 + part2

  return lines.join('\n')
}

const writeTmpFile = (fileName: string, text: string): Promise<void> => {
  return new Promise(resolve => {
    writeFile(fileName, text, { encoding: 'utf-8' }, () => {
      return resolve()
    })
  })
}

// let start

// const reset_time = () => {
//   start = process.hrtime()
// }

// const elapsed_time = (note = '') => {
//   const precision = 3 // 3 decimal places
//   const elapsed = process.hrtime(start)[1] / 1000000 // divide by a million to get nano to milliseconds
//   // eslint-disable-next-line prefer-template
//   return process.hrtime(start)[0] + ' s, ' + elapsed.toFixed(precision) + ' ms - ' + note // print message + time
// }

parentPort?.on('message', async (data: string) => {
  // reset_time()

  const { text, shouldHighlight, cursorPosition, fileName, init } = JSON.parse(data)

  if (init) {
    PHP.path = init.phpExecPath
    PHP.ini = init.phpIniPath
    parentPort?.postMessage(JSON.stringify({ ignore: true }))
    return
  }

  const isPhp = /\.php$/.test(fileName)
  const tmpFile = fileName.replace(basename(fileName), `.${basename(fileName)}`)

  if (isPhp) await writeTmpFile(tmpFile, text)

  const php = isPhp ? await PHP.parseFile(tmpFile, { status: () => {} }) : text
  const html = shouldHighlight ? injectHighlight(php, cursorPosition) : php

  const res = /(<body[^>]*>)((.|[\n\r])*)(<\/body>)/gim.exec(html)

  if (!res) {
    parentPort?.postMessage(JSON.stringify({ ignore: true }))
  } else {
    const b = res[2]
      .split('\n')
      // .map((l) => l.trim())
      .join('')

    const body = `${res[1]}${b}${res[4]}`

    const report = htmlvalidate.validateString(html)
    parentPort?.postMessage(JSON.stringify({ report, body, fileName /*, time: elapsed_time()*/ }))
  }
})
