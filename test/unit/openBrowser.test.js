const { rejects } = require('assert')
const { OpenBrowser } = require('../../lib/openBrowser')
const pause = require('../helpers/pause')

const mock_error_event = {
  once: (event, cb) => {
    // console.log('event', event)
    cb(1)
  }
}

let logs = []
const mock_open = (...args) => {
  return new Promise(resolve => {
    // log
    // console.log('args', args)

    // return error
    if (args[1] && args[1].app.name === 'unknown') return resolve(mock_error_event)

    // resolve
    logs.push(...args)
    return resolve()
  })
}

const op = new OpenBrowser(mock_open)
const openBrowser = op.openBrowser.bind(op)

beforeEach(() => {
  logs = []
})

describe('openBrowser.ts', () => {
  describe('Test Paths', () => {
    test('without args', async () => {
      await openBrowser()
      expect(logs.length).toBe(0)
    })

    test('with url', async () => {
      await openBrowser('http://localhost:3000')
      expect(logs[0]).toBe('http://localhost:3000')
    })

    test('with url (with root slash)', async () => {
      await openBrowser('http://localhost:3000/')
      expect(logs[0]).toBe('http://localhost:3000')
    })

    test('with url and empty path', async () => {
      await openBrowser('http://localhost:3000', '')
      expect(logs[0]).toBe('http://localhost:3000')
    })

    test('with url and root path', async () => {
      await openBrowser('http://localhost:3000', '/')
      expect(logs[0]).toBe('http://localhost:3000/')
    })

    test('with url+path', async () => {
      await openBrowser('http://localhost:3000/hello')
      expect(logs[0]).toBe('http://localhost:3000/hello')
    })

    test('with url and any path', async () => {
      await openBrowser('http://localhost:3000', 'hello')
      expect(logs.length).toBe(1)
      expect(logs[0]).toBe('http://localhost:3000/hello')
    })

    test('testing slashes', async () => {
      await openBrowser('http://localhost:3000', 'hello/')
      expect(logs.length).toBe(1)
      expect(logs[0]).toBe('http://localhost:3000/hello/')

      await openBrowser('http://localhost:3000', '/hello/')
      expect(logs.length).toBe(2)
      expect(logs[1]).toBe('http://localhost:3000/hello/')

      await openBrowser('http://localhost:3000', '/hello')
      expect(logs.length).toBe(3)
      expect(logs[2]).toBe('http://localhost:3000/hello')

      await openBrowser('http://localhost:3000/', '/hello')
      expect(logs.length).toBe(4)
      expect(logs[3]).toBe('http://localhost:3000/hello')

      await openBrowser('http://localhost:3000/', 'hello')
      expect(logs.length).toBe(5)
      expect(logs[4]).toBe('http://localhost:3000/hello')
    })

    test('open multiple paths', async () => {
      await openBrowser('http://localhost:3000', ['hello', 'bye'])
      expect(logs.length).toBe(2)
      expect(logs[0]).toBe('http://localhost:3000/hello')
      expect(logs[1]).toBe('http://localhost:3000/bye')
    })

    test('path is an url arguments', async () => {
      await openBrowser('http://localhost:3000', 'http://localhost:3000/hello')
      expect(logs.length).toBe(1)
      expect(logs[0]).toBe('http://localhost:3000/hello')
    })

    test('path is an url arguments (multiple)', async () => {
      await openBrowser('http://localhost:3000', ['http://localhost:3000/hello'])
      expect(logs.length).toBe(1)
      expect(logs[0]).toBe('http://localhost:3000/hello')
    })
  })

  describe('Test Browsers', () => {
    test('do not open any browser', async () => {
      await openBrowser('http://localhost:3000', null)
      expect(logs.length).toBe(0)
    })

    test('open chrome', async () => {
      await openBrowser('http://localhost:3000', '', 'chrome')
      expect(logs.length).toBe(2)
      expect(logs[0]).toBe('http://localhost:3000')
      expect(logs[1].app.name).toBe('chrome')
    })

    test('open chrome (array)', async () => {
      await openBrowser('http://localhost:3000', '', ['chrome'])
      expect(logs.length).toBe(2)
      expect(logs[0]).toBe('http://localhost:3000')
      expect(logs[1].app.name).toBe('chrome')
    })

    test('test unknown browser', async () => {
      await openBrowser('http://localhost:3000', '', 'unknown')
      expect(logs.length).toBe(1)
      expect(logs[0]).toBe('http://localhost:3000')
    })

    test('test array unknown browsers', async () => {
      await openBrowser('http://localhost:3000', '', ['unknown', 'unknown'])
      expect(logs.length).toBe(1)
      expect(logs[0]).toBe('http://localhost:3000')
    })

    test('test empty browser array', async () => {
      await openBrowser('http://localhost:3000', '', [])
      expect(logs.length).toBe(1)
      expect(logs[0]).toBe('http://localhost:3000')
    })

    test('test multiple browsers', async () => {
      await openBrowser('http://localhost:3000', '', ['unknown', 'chrome'])
      expect(logs.length).toBe(2)
      expect(logs[0]).toBe('http://localhost:3000')
      expect(logs[1].app.name).toBe('chrome')
    })

    test('test with arguments', async () => {
      await openBrowser('http://localhost:3000', '', 'chrome --argument')
      expect(logs.length).toBe(2)
      expect(logs[0]).toBe('http://localhost:3000')
      expect(logs[1].app.name).toBe('chrome')
    })
  })
})

afterAll(async () => {
  //await Promise.race([await close(server), pause(2000)])
})
