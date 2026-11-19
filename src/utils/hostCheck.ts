import os from 'os'
import type { IncomingHttpHeaders } from 'http'

/** Names that always reach a loopback-bound server. IPv6 names are bracketed, as they appear in a Host header. */
const LOOPBACK_NAMES = ['localhost', '127.0.0.1', '[::1]', '[0:0:0:0:0:0:0:1]']

/** Bind addresses that mean "this machine only". */
const LOOPBACK_BINDS = ['127.0.0.1', 'localhost', '::1']

/** Bind addresses that accept connections on every interface. */
const WILDCARD_BINDS = ['0.0.0.0', '::']

/**
 * Returns the hostname from a Host header value or the host part of an origin,
 * lowercased, without the port, with IPv6 addresses in brackets.
 * Returns null for malformed values.
 */
export function hostnameOf(value: string): string | null {
  const v = value.trim().toLowerCase()
  if (!v || /[\s/@\\]/.test(v)) return null

  if (v.startsWith('[')) {
    const end = v.indexOf(']')
    if (end === -1) return null
    const rest = v.slice(end + 1)
    if (rest !== '' && !/^:\d+$/.test(rest)) return null
    return v.slice(0, end + 1)
  }

  const parts = v.split(':')
  if (parts.length > 2) return null
  if (parts.length === 2 && !/^\d+$/.test(parts[1])) return null
  return parts[0] || null
}

/**
 * Names this server accepts in a Host header (and in an origin).
 * Loopback bind: loopback names only.
 * Other bind (e.g. --host=0.0.0.0): loopback names, the configured host, and this machine's interface addresses.
 * Note: with a LAN bind, any name that resolves to a local interface address is accepted.
 */
export function allowedHostnames(host: string): Set<string> {
  const names = new Set(LOOPBACK_NAMES)
  if (LOOPBACK_BINDS.includes(host)) return names

  if (!WILDCARD_BINDS.includes(host)) {
    const name = hostnameOf(host.includes(':') ? `[${host}]` : host)
    if (name) names.add(name)
  }

  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list ?? []) {
      const address = iface.address.split('%')[0]
      names.add(iface.family === 'IPv6' ? `[${address}]` : address)
    }
  }

  return names
}

export function isHostAllowed(value: string | undefined, allowed: Set<string>): boolean {
  if (!value) return false
  const name = hostnameOf(value)
  return name !== null && allowed.has(name)
}

/** A WebSocket handshake needs an allowed Host and an Origin with an allowed host. A missing Origin is rejected. */
export function isWebSocketAllowed(headers: IncomingHttpHeaders, allowed: Set<string>): boolean {
  if (!isHostAllowed(headers.host, allowed)) return false

  const origin = headers.origin
  if (!origin) return false

  try {
    return isHostAllowed(new URL(origin).host, allowed)
  } catch {
    return false
  }
}
