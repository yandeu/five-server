/* eslint-disable no-var */

/**
 * @package     batch (https://www.npmjs.com/package/batch)
 * @copyright   Copyright (c) 2013-2015 TJ Holowaychuk <tj@vision-media.ca>
 * @license     {@link https://github.com/visionmedia/batch/blob/master/LICENSE|MIT}
 * @description modified version of batch@3.7.0 (https://github.com/visionmedia/batch/edit/master/index.js)
 */

const EventEmitter = require('events').EventEmitter

const defer =
  typeof process !== 'undefined' && process && typeof process.nextTick === 'function'
    ? process.nextTick
    : function (fn) {
        setTimeout(fn)
      }

/**
 * Noop.
 */

function noop() {}

/**
 * Expose `Batch`.
 */

module.exports = Batch

/**
 * Create a new Batch.
 */

function Batch() {
  // @ts-ignore
  if (!(this instanceof Batch)) return new Batch()

  // @ts-ignore
  this.fns = []

  // @ts-ignore
  this.concurrency(Infinity)

  // @ts-ignore
  this.throws(true)

  for (var i = 0, len = arguments.length; i < len; ++i) {
    // @ts-ignore
    this.push(arguments[i])
  }
}

/**
 * Inherit from `EventEmitter.prototype`.
 */

if (EventEmitter) Batch.prototype.__proto__ = EventEmitter.prototype

/**
 * Set concurrency to `n`.
 *
 * @param {Number} n
 * @return {Batch}
 * @api public
 */

Batch.prototype.concurrency = function (n) {
  this.n = n
  return this
}

/**
 * Queue a function.
 *
 * @param {Function} fn
 * @return {Batch}
 * @api public
 */

Batch.prototype.push = function (fn) {
  this.fns.push(fn)
  return this
}

/**
 * Set wether Batch will or will not throw up.
 *
 * @param  {Boolean} throws
 * @return {Batch}
 * @api public
 */
Batch.prototype.throws = function (throws) {
  this.e = !!throws
  return this
}

/**
 * Execute all queued functions in parallel,
 * executing `cb(err, results)`.
 *
 * @param {Function} cb
 * @return {Batch}
 * @api public
 */

Batch.prototype.end = function (cb) {
  var self = this,
    total = this.fns.length,
    pending = total,
    results: any = [],
    errors: any = [],
    fns = this.fns,
    max = this.n,
    throws = this.e,
    index = 0,
    done

  cb = cb || noop

  // empty
  if (!fns.length)
    return defer(function () {
      cb(null, results)
    })

  // process
  function next() {
    var i = index++
    var fn = fns[i]
    if (!fn) return
    var start = new Date()

    try {
      fn(callback)
    } catch (err) {
      callback(err)
    }

    function callback(err, res?) {
      if (done) return
      if (err && throws)
        return (
          (done = true),
          defer(function () {
            cb(err)
          })
        )
      var complete = total - pending + 1
      var end = new Date()

      results[i] = res
      errors[i] = err

      self.emit('progress', {
        index: i,
        value: res,
        error: err,
        pending: pending,
        total: total,
        complete: complete,
        percent: ((complete / total) * 100) | 0,
        start: start,
        end: end,
        // @ts-ignore
        duration: end - start
      })

      if (--pending) next()
      else
        defer(function () {
          if (!throws) cb(errors, results)
          else cb(null, results)
        })
    }
  }

  // concurrency
  for (var i = 0; i < fns.length; i++) {
    if (i == max) break
    next()
  }

  return this
}
