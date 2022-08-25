/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

// https://html-validate.org/dev/using-api.html
import { basename, join } from 'path'
import { existsSync, writeFile } from 'fs'
import { mkdir, rm } from 'fs/promises'
import { ExecPHP } from '../utils/execPHP'
import { HtmlValidate } from 'html-validate'
import { parentPort } from 'worker_threads'
import { parse } from 'node-html-parser'

const PHP = new ExecPHP()

const htmlvalidate = new HtmlValidate({
  // https://html-validate.org/rules/index.html
  rules: {
    'close-attr': 'error', // necessary
    'close-order': 'error', // necessary
    'element-name': [
      'error',
      {
        whitelist: ['dialog']
      }
    ], // necessary
    deprecated: 'error',
    'no-dup-attr': 'error',
    'no-dup-class': 'error',
    'no-dup-id': 'error'
  }
})

export const injectHighlight = (body: string, cursorPosition: { line: number; character: number }) => {
  if (!cursorPosition) return body

  try {
    const lines = body.split('\n')
    const line = cursorPosition.line
    const char = cursorPosition.character

    // add five-server-cursor tag where cursor is
    // eslint-disable-next-line prefer-template
    lines[line] = lines[line].slice(0, char) + '<five-server-cursor></five-server-cursor>' + lines[line].slice(char)

    let new_body = lines.join('\n')
    const root = parse(new_body)
    const span = root.querySelector('five-server-cursor')
    const parent = span?.parentNode
    if (!parent) throw new Error()

    // don't highlight if here is an H
    if (!parent.getAttribute('H')) parent?.setAttribute('data-highlight', 'true')
    new_body = root.toString().replace('<five-server-cursor></five-server-cursor>', '')
    return new_body
  } catch {
    return body
  }
}

const writeTmpFile = (fileName: string, text: string): Promise<void> => {
  return new Promise(resolve => {
    writeFile(fileName, text, { encoding: 'utf-8' }, () => {
      return resolve()
    })
  })
}

export const createTmpDirectory = async (cwd: string) => {
  const tmpDir = join(cwd, '.php_tmp')
  if (!existsSync(tmpDir)) await mkdir(tmpDir)
  return tmpDir
}

export const removeTmpDirectory = async (cwd: string | undefined) => {
  if (cwd) {
    const tmpDir = join(cwd, '.php_tmp')
    if (existsSync(tmpDir)) await rm(tmpDir, { recursive: true, force: true })
  }
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

  const { text, shouldHighlight, cursorPosition, fileName, init, close } = JSON.parse(data)

  if (init) {
    PHP.path = init.phpExecPath
    PHP.ini = init.phpIniPath
    PHP.cwd = init.cwd
    parentPort?.postMessage(JSON.stringify({ ignore: true }))
    return
  }

  const isPhp = /\.php$/.test(fileName)
  let tmpDir = '',
    tmpFile = ''

  if (isPhp) {
    tmpDir = await createTmpDirectory(PHP.cwd)
    tmpFile = join(tmpDir, basename(fileName))
    await writeTmpFile(tmpFile, text)
  }

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
