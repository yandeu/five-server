import { promises as dns } from 'dns'

/**
 * Checks whether the OS resolves "localhost" to the IPv4 loopback address 127.0.0.1.
 * Returns false if the lookup fails.
 */
export const localhostResolvesTo127 = async (): Promise<boolean> => {
  try {
    const addresses = await dns.lookup('localhost', { all: true })
    return addresses.some(entry => entry.address === '127.0.0.1')
  } catch {
    return false
  }
}
