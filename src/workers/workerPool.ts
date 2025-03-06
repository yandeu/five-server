/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import { EventEmitter } from 'events'
import { Worker } from 'worker_threads'
import { join } from 'path'
import { removeTmpDirectory } from './parseBody'

interface Init {
  phpExecPath?: string
  phpIniPath?: string
  cwd: string
}

interface WorkerPoolOptions {
  // Limit the send rate in milliseconds. (default: 50)
  rateLimit?: number
  // Number of workers to initialize. (default: 1)
  worker?: number

  logLevel?: number
  // Object passed to process on init
  init?: Init
}

/** Handles multiple Workers. */
export default class WorkerPool extends EventEmitter {
  private index = 0
  private worker: number
  private rateLimit: number
  private workers: Worker[] = []
  private queue: string[] = []
  private timer: 'idle' | 'running' = 'idle'
  private terminating = false
  private logLevel = 1

  constructor(
    public script: string,
    public options: WorkerPoolOptions = {}
  ) {
    super()

    const { rateLimit = 50, worker = 1, logLevel = 1, init } = options

    this.rateLimit = rateLimit
    this.worker = worker
    this.logLevel = logLevel

    for (let i = 0; i < this.worker; i++) {
      this.create(init)
    }
  }

  public async terminate() {
    this.terminating = true

    await removeTmpDirectory(this.options.init?.cwd)

    this.removeAllListeners()

    for (let i = 0; i < this.workers.length; i++) {
      this.workers[i].removeAllListeners()
      this.workers[i].terminate()
    }
  }

  private sendMessage(msg: string) {
    if (this.terminating) return

    this.index++
    const nr = this.index % this.worker
    this.workers[nr].postMessage(msg)
  }

  postMessage(msg: string) {
    if (this.terminating) return

    if (this.rateLimit <= 0) this.sendMessage(msg)
    else this.addToQueue(msg)
  }

  addToQueue(msg: string) {
    if (this.terminating) return

    // add new element to queue
    const length = this.queue.unshift(msg)

    // run timer
    this.runTimer()

    // remove last element from queue
    if (length >= 5) this.queue.pop()
  }

  sendFromQueue() {
    const msg = this.queue.shift()
    this.queue = [] // delete all other messages

    if (msg) this.sendMessage(msg)
  }

  runTimer(force = false) {
    if (!force && this.timer === 'running') return
    this.timer = 'running'

    this.sendFromQueue()

    setTimeout(() => {
      if (this.queue.length > 0) this.runTimer(true)
      else this.timer = 'idle'
    }, this.rateLimit)
  }

  private create(init: Init | object = {}) {
    if (this.terminating) return

    const worker = new Worker(join(__dirname, this.script))

    // pass init object once worker is online
    worker.on('online', () => {
      worker.postMessage(JSON.stringify({ init }))
    })

    worker.on('message', msg => {
      this.emit('message', msg)
    })

    if (this.logLevel >= 2) {
      worker.on('error', err => {
        console.log('WORKER error:', err)
      })

      worker.on('exit', err => {
        console.log('WORKER exit:', err)
      })

      worker.on('messageerror', err => {
        console.log('WORKER messageerror:', err)
      })
    }

    this.workers.push(worker)
  }
}
