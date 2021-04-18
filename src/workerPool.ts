/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

import { EventEmitter } from 'events'
import { Worker } from 'worker_threads'
import { join } from 'path'

interface WorkerPoolOptions {
  // Limit the send rate in milliseconds. (default: 50)
  rateLimit?: number
  // Number of workers to initialize. (default: 1)
  worker?: number
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

  constructor(public script: string, options: WorkerPoolOptions = {}) {
    super()

    const { rateLimit = 50, worker = 1 } = options

    this.rateLimit = rateLimit
    this.worker = worker

    for (let i = 0; i < this.worker; i++) {
      this.create()
    }
  }

  public terminate() {
    this.terminating = true

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
    else this.addQueue(msg)
  }

  addQueue(msg: string) {
    if (this.terminating) return

    // add new element to queue
    const length = this.queue.unshift(msg)

    // run timer
    this.runTimer()

    // remove last element from queue
    if (length >= 5) {
      this.queue.pop()
    }
  }

  runTimer() {
    if (this.terminating) return

    if (this.timer === 'running') return
    this.timer = 'running'

    setTimeout(() => {
      this.timer = 'idle'
      const msg = this.queue.shift()
      if (msg) this.sendMessage(msg)
    }, this.rateLimit)
  }

  private create() {
    if (this.terminating) return

    const worker = new Worker(join(__dirname, this.script))

    worker.on('message', msg => {
      this.emit('message', msg)
    })

    this.workers.push(worker)
  }
}
