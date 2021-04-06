/**
 * @author       Leo Lamprecht (https://github.com/leo) - Vercel
 * @copyright    Copyright (c) 2018 ZEIT, Inc.
 * @license      {@link https://github.com/vercel/serve/blob/master/LICENSE|MIT}
 * @description  copied and modified from https://github.com/vercel/serve/blob/master/bin/serve.js
 */

import os from 'os'
const interfaces = os.networkInterfaces()

export const getNetworkAddress = () => {
  for (const name of Object.keys(interfaces)) {
    for (const _interface of interfaces[name] as os.NetworkInterfaceInfo[]) {
      const { address, family, internal } = _interface
      if (family === 'IPv4' && !internal) {
        return address
      }
    }
  }
}
