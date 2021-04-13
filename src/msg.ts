import EventEmitter from 'events'
import { colors } from './colors'

class Message extends EventEmitter {
  public logLevel: 0 | 1 | 2 | 3 = 1

  private logs: Map<string, { log: string; count: number }> = new Map()

  /**
   * Pretty print message to console.
   */
  pretty(log: string, config: { timestamp?: boolean; id?: string } = {}) {
    const { timestamp = true, id = 'fiveserver' } = config

    const h = this.logs.get(id)

    let count = 0

    if (h && h.log === log) count = h.count + 1
    this.logs.set(id, { log: log, count })

    // timestamp
    const time = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').substring(11)
    const t = timestamp ? colors(`${time} `, 'gray') : ''

    // counter
    const counter = count > 0 ? colors(` (x${count + 1})`, 'yellow') : ''

    const m = `${t}${log}${counter}`

    if (this.logLevel >= 1) message.log(m)
    this.emit('message', { type: 'pretty', msg: m })
  }

  log = (...msg: any[]) => {
    const m = msg.join(' ')

    if (this.logLevel >= 1) console.log(m)
    this.emit('message', { type: 'log', msg: m })
  }

  warn = (...msg: any[]) => {
    const m = colors(msg.join(' '), 'yellow')

    if (this.logLevel >= 1) console.warn(m)
    this.emit('message', { type: 'warn', msg: m })
  }

  info = (...msg: any[]) => {
    const m = colors(msg.join(' '), 'blue')

    if (this.logLevel >= 1) console.log(m)
    this.emit('message', { type: 'info', msg: m })
  }

  error = (msg: string, comment: null | string = '', exit) => {
    if (comment === null) comment = ''
    if (comment !== '') comment += ':'

    const m = msg ? colors(`ERROR: ${comment} ${msg}`, 'red') : colors(`ERROR: ${comment} unknown`, 'red')

    console.error(m)
    this.emit('message', { type: 'error', msg: m })

    if (exit) process.exit(1)
  }
}

export const message = new Message()
