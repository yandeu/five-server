/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import { PHP_ERROR, PHP_TEMPLATE } from '../public'
import { exec } from 'child_process'
import fs from 'fs'

export class ExecPHP {
  private php: string | undefined
  private phpIni: string | undefined

  get path() {
    return this.php
  }

  get ini() {
    return this.phpIni
  }

  set path(path: string | undefined) {
    this.php = path
  }

  set ini(path: string | undefined) {
    this.phpIni = path
  }

  async parseFile(absolutePath, res): Promise<string> {
    let msg = ''

    return new Promise(resolve => {
      const returnWithError = (msg, template: string) => {
        return resolve(template.replace('{msg}', msg))
      }

      if (!this.php) {
        msg = 'Could not find PHP executable.'
        res.status(500)
      }

      if (!msg && this.php && !fs.existsSync(this.php)) {
        msg = `Could not find executable: "${this.php}"`
        res.status(500)
      }

      if (msg) returnWithError(msg, PHP_TEMPLATE)

      const cmd = `"${this.php}" "${absolutePath}"`

      exec(cmd, function (error, stdout, stderr) {
        if (error) returnWithError(`<p>error: ${error.message}</p>`, PHP_ERROR)
        if (stderr) returnWithError(`<p>stderr: ${stderr}</p>`, PHP_ERROR)

        resolve(stdout)
      })
    })
  }
}
