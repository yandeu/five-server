/* eslint-disable sort-imports */

/**
 * @copyright   Copyright JS Foundation and other contributors
 * @license     {@link https://github.com/webpack/webpack-dev-server/blob/master/LICENSE MIT}
 * @description Copied from webpack-dev-server@3.11.2 (https://github.com/webpack/webpack-dev-server/blob/master/lib/utils/getCertificate.js)
 */

import { createCertificate } from './createCertificate'

import fs from 'fs'
import os from 'os'
import path from 'path'
import { message } from '../msg'
// import del from 'del'

export const getCertificate = (cacheDir: string = '.cache') => {
  // Use a self-signed certificate if no certificate was configured.
  // Cycle certs every 24 hours
  const certificateDir = cacheDir || path.resolve() || os.tmpdir()
  const certificatePath = path.join(certificateDir, 'server.pem')

  let certificateExists = fs.existsSync(certificatePath)

  if (certificateExists) {
    const certificateTtl = 1000 * 60 * 60 * 24
    const certificateStat = fs.statSync(certificatePath) as any

    const now = new Date() as any

    // cert is more than 30 days old, kill it with fire
    if ((now - certificateStat.ctime) / certificateTtl > 30) {
      message.info('SSL Certificate is more than 30 days old. Removing.')

      // del.sync([certificatePath], { force: true })
      try {
        fs.unlinkSync(certificatePath)
        //file removed
      } catch (err) {
        message.error(err.message, null, false)
      }

      certificateExists = false
    }
  }

  if (!certificateExists) {
    message.info(`Generating SSL Certificate "${path.resolve(certificatePath)}"`)

    const attributes = [{ name: 'commonName', value: 'localhost' }]
    const pems = createCertificate(attributes)

    fs.mkdirSync(certificateDir, { recursive: true })
    fs.writeFileSync(certificatePath, pems.private + pems.cert, {
      encoding: 'utf8'
    })
  }

  return fs.readFileSync(certificatePath, { encoding: 'utf-8' })
}
