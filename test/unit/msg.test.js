const { message } = require('../../lib/msg')
const { removeColors } = require('../../lib/colors')

const hasColorYellow = /^%1B%5B33m/
const hasColorBlue = /^%1B%5B34m/
const hasColorRed = /^%1B%5B31m/

let exitCalls = 0,
  exitCode = -1
process.exit = code => {
  exitCalls++
  exitCode = code
}

describe('msg.ts', () => {
  test('pretty', done => {
    message.once('message', data => {
      const msg = removeColors(data.msg)
      expect(msg).toMatch(/^(\d\d:?)+ Pretty Message$/)
      done()
    })
    message.pretty('Pretty Message')
  })

  test('pretty (same message twice)', done => {
    message.once('message', data => {
      const msg = removeColors(data.msg)
      // because above message was the same
      expect(msg).toMatch(/^(\d\d:?)+ Pretty Message \(x2\)$/)
      done()
    })
    message.pretty('Pretty Message')
  })

  test('pretty (no timestamp)', done => {
    message.once('message', data => {
      const msg = removeColors(data.msg)
      expect(msg).toMatch('Pretty Message without Timestamp')
      done()
    })
    message.pretty('Pretty Message without Timestamp', { timestamp: false })
  })

  test('warn', done => {
    message.once('message', data => {
      expect(data.type).toMatch('warn')
      expect(encodeURI(data.msg)).toMatch(hasColorYellow)
      done()
    })
    message.warn('Warning')
  })

  test('info', done => {
    message.once('message', data => {
      expect(data.type).toMatch('info')
      expect(encodeURI(data.msg)).toMatch(hasColorBlue)
      done()
    })
    message.info('Information')
  })

  test('error', done => {
    message.once('message', data => {
      expect(data.type).toMatch('error')
      expect(encodeURI(data.msg)).toMatch(hasColorRed)
      done()
    })
    message.error('Error')
  })

  test('error (comment: null)', done => {
    message.once('message', data => {
      expect(data.type).toMatch('error')
      expect(encodeURI(data.msg)).toMatch(hasColorRed)
      done()
    })
    message.error('Error', null, false)
  })

  test('error (error in foo())', done => {
    message.once('message', data => {
      expect(data.type).toMatch('error')
      expect(encodeURI(data.msg)).toMatch(hasColorRed)
      expect(removeColors(data.msg)).toMatch('ERROR: foo(): Foo does not accept any argument.')
      done()
    })
    message.error('Foo does not accept any argument.', 'foo()')
  })

  test('error (without message)', done => {
    message.once('message', data => {
      expect(removeColors(data.msg)).toMatch('ERROR: unknown')
      done()
    })
    message.error()
  })

  test('error (process.exit(1))', done => {
    message.once('message', data => {
      expect(removeColors(data.msg)).toMatch('ERROR: Error')
      setTimeout(() => {
        expect(exitCalls).toBe(1)
        expect(exitCode).toBe(1)
        done()
      }, 100)
    })
    message.error('Error', null, true)
  })

  test('error (process.exit(1))', done => {
    message.once('message', data => {
      expect(removeColors(data.msg)).toMatch('ERROR: Error')
      setTimeout(() => {
        expect(exitCalls).toBe(2)
        expect(exitCode).toBe(50)
        done()
      }, 100)
    })
    message.error('Error', null, true, 50)
  })
})
