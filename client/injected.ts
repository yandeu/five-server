declare const diffDOM: any

import { Highlight } from './highlight'
import { appendPathToUrl } from '../src/helpers'

// clone the current state of the body before any javascript
// manipulates it inside window.addEventListener('load', (...))
let _internalDOMBody

const block = (document.body) ? document.body.hasAttribute('data-server-no-reload') : false;

if (block) {
  console.info('[Five Server] Reload disabled due to \'data-server-no-reload\' attribute on BODY element')
}
if ('WebSocket' in window && !block) {
  window.addEventListener('load', () => {
    console.log('[Five Server] connecting...')

    const script = document.querySelector('[data-id="five-server"]') as HTMLScriptElement

    const protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://'
    const address = appendPathToUrl(`${protocol}${new URL(script.src).host}`, 'fsws')

    // check if we need to clone the body for the "injectBody" feature or not
    const optionsInjectBody = script.getAttribute('data-inject-body')
    if (optionsInjectBody && optionsInjectBody.toString() === 'true')
      _internalDOMBody = document.body ? document.body.cloneNode(true) : undefined

    let timer: any = null

    const highlight = new Highlight(true)
    highlight.redraw()
    window.addEventListener('resize', () => {
      highlight.redraw()
    })

    const CONNECTED_MSG = '[Five Server] connected.'
    const MAX_ATTEMPTS = 25
    let wait = 1000
    let attempts = 0
    let socket!: WebSocket

    let lastPopUp = ''
    const popup = (
      message: string,
      type: 'info' | 'success' | 'error' | 'warn',
      options: { time?: number; animation?: boolean } = {}
    ) => {
      const str = JSON.stringify({ message, type, options })

      // block identical popups, except "css update"
      if (lastPopUp === str && message !== 'css updated') return
      lastPopUp = str

      let wrapper = document.getElementById('fiveserver-info-wrapper')
      if (wrapper) wrapper.remove()

      const { time = 3, animation = true } = options

      wrapper = document.createElement('div')
      wrapper.id = 'fiveserver-info-wrapper'
      wrapper.classList.add(`fiveserver-info-wrapper_${type}`)

      wrapper.style.zIndex = '100'
      wrapper.style.display = 'flex'
      wrapper.style.justifyContent = 'center'
      wrapper.style.position = 'fixed'
      wrapper.style.top = 'flex'

      wrapper.style.left = '50%'
      wrapper.style.transform = 'translateX(-50%)'
      wrapper.style.width = '100%'
      wrapper.style.maxWidth = '80%'

      const el = document.createElement('div')
      el.id = 'fiveserver-info'
      el.style.fontSize = '16px'
      el.style.fontFamily = 'Arial, Helvetica, sans-serif'
      el.style.color = 'white'
      el.style.backgroundColor = 'black'

      el.style.padding = '4px 12px'
      el.style.borderRadius = '4px'
      el.style.whiteSpace = 'pre-wrap'

      wrapper.appendChild(el)

      document.body.appendChild(wrapper)

      // remove popup from DOM after 'time'
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      timer = setTimeout(() => {
        if (wrapper && wrapper.isConnected) wrapper.remove()
      }, time * 1000)

      if (type === 'error') {
        wrapper.style.top = '4px'
        wrapper.style.animation = ''

        el.style.color = 'black'
        el.style.backgroundColor = 'red'
      } else {
        if (animation) {
          wrapper.style.top = '-40px'
          wrapper.style.animation = `fiveserverInfoPopup ${time}s forwards`
        } else {
          wrapper.style.top = '4px'
          wrapper.style.animation = ''
        }
      }

      if (type === 'success') {
        el.style.color = '#498d76'
        el.style.backgroundColor = '#00ffa9'
      } else if (type === 'info') {
        el.style.color = '#d2e1f0'
        el.style.backgroundColor = '#2996ff'
      }
      el.innerHTML = message.replace(/</gm, '&lt;')
    }

    const send = (type: string, ...message: string[]) => {
      if (socket && socket?.readyState === 1) {
        socket.send(JSON.stringify({ console: { type, message } }))
      }
    }

    const overwriteLogs = () => {
      // log
      const oldLog = console.log
      console.log = function (...message) {
        if (message[0] === CONNECTED_MSG) {
          popup('connected', 'success')
        } else {
          send('log', ...message)
        }
        oldLog.apply(console, message)
      }

      // warn
      const oldWarn = console.warn
      console.warn = function (...message) {
        send('warn', ...message)
        oldWarn.apply(console, message)
      }

      // error
      const oldError = console.error
      console.error = function (...message) {
        send('error', ...message)
        oldError.apply(console, message)
      }
    }

    const refreshCSS = (showPopup: boolean) => {
      const head = document.getElementsByTagName('head')[0]

      let sheets = Array.from(document.getElementsByTagName('link'))
      sheets = sheets.filter(sheet => /\.css/gm.test(sheet.href) || sheet.rel.toLowerCase() == 'stylesheet')

      for (let i = 0; i < sheets.length; ++i) {
        const el = sheets[i]

        const newEl = el.cloneNode(true) as HTMLLinkElement

        // changing the href of the css file will make the browser refetch it
        const url = newEl.href.replace(/(&|\?)_cacheOverride=\d+/, '')
        newEl.href = `${url}${url.indexOf('?') >= 0 ? '&' : '?'}_cacheOverride=${new Date().valueOf()}`

        newEl.onload = () => {
          setTimeout(() => el.remove(), 0)
        }

        head.appendChild(newEl)
      }

      if (sheets.length > 0 && showPopup) popup('css updated', 'info')
    }

    const injectBody = body => {
      document.body.innerHTML = body
    }

    let _diffDOMStatus = ''
    let _dd

    const addDiffDOM = (): Promise<void> => {
      _diffDOMStatus = 'loading'
      return new Promise(resolve => {
        const url = `//${new URL(script.src).host}/fiveserver/scripts/diffDOM.js`
        const s = document.createElement('script')
        s.type = 'text/javascript'
        s.src = url
        s.onload = () => {
          setTimeout(() => {
            _dd = new diffDOM.DiffDOM()
            _diffDOMStatus = 'ready'
            resolve()
          })
        }
        document.getElementsByTagName('head')[0].appendChild(s)
      })
    }

    const domParser = new DOMParser()
    let diffError = false
    const updateBody = async (d: any) => {
      if (_diffDOMStatus === '') await addDiffDOM()

      if (_diffDOMStatus === 'ready') {
        try {
          const body = _internalDOMBody

          const newBody = domParser.parseFromString(d, 'text/html').querySelector('body')

          const tmp = document.createElement('body')
          tmp.innerHTML = d

          // copy all attributes
          if (newBody) {
            if (newBody.attributes.length > 0)
              for (let i = 0; i < newBody.attributes.length; i++) {
                const attr = newBody.attributes.item(i)
                if (attr) {
                  const newAttr = document.createAttribute(attr.name)
                  newAttr.value = attr.value
                  tmp.attributes.setNamedItem(newAttr)
                }
              }
          }

          const diff = _dd.diff(body, tmp)

          const testBody = document.body.cloneNode(true)

          const testSuccess = _dd.apply(testBody, diff)
          if (testSuccess) {
            const success = _dd.apply(document.body, diff)

            if (success) {
              _internalDOMBody = tmp

              if (diffError) {
                diffError = false
                appendMessage('HIDE')
              }

              // scroll element into view (center of page)
              const el = document.querySelector(`[data-highlight="true"]`)
              if (el) {
                const documentOffsetTop = el => {
                  return el.offsetTop + (el.offsetParent ? documentOffsetTop(el.offsetParent) : 0)
                }
                const pos = documentOffsetTop(el) - window.innerHeight / 2
                window.scrollTo(0, pos)
              }
            }
          }
        } catch (error) {
          diffError = true
          appendMessage('Having issues parsing the DOM.\nPlease verify that your HTML is valid...')
        }
      }
    }

    const appendMessages = (msg: string[]) => {
      appendMessage(msg.join('\n\n'))
    }

    const appendMessage = (msg: string) => {
      if (msg === 'HIDE' || msg === 'HIDE_MESSAGE' || msg === 'HIDE_MESSAGES') {
        const wrapper = document.getElementById('fiveserver-info-wrapper')
        if (wrapper) wrapper.remove()
      } else {
        popup(msg, 'info', { animation: false })
      }
    }

    const connect = () => {
      socket = new WebSocket(address)

      socket.onmessage = function (msg) {
        wait = 1000
        attempts = 0

        if (msg.data === 'reload') window.location.reload()
        else if (msg.data === 'refreshcss') refreshCSS(true)
        else if (msg.data === 'refreshcss-silent') refreshCSS(false)
        else if (msg.data === 'connected') {
          console.log(CONNECTED_MSG)
          // dispatch "connected" event when client is connected
          const script = document.querySelector('[data-id="five-server"]')
          if (script) script.dispatchEvent(new Event('connected'))
        } else if (msg.data === 'initRemoteLogs') overwriteLogs()
        else {
          const d = JSON.parse(msg.data)
          if (d.navigate) window.location.replace(d.navigate)
          // hot body injection
          if (d.body && d.hot) updateBody(d.body)
          // simple body replacement
          else if (d.body) injectBody(d.body)

          // message and messages 🤣
          if (d.messages) appendMessages(d.messages)
          if (d.message) appendMessage(d.message)

          // redraw the highlight on body update
          if (d.body) highlight.redraw()
        }
      }
      socket.onopen = function () {
        // reload page on successful reconnection
        if (attempts > 0) {
          window.location.reload()
          return
        }

        const scripts = document.querySelectorAll('script')
        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i]
          if (script.dataset && script.dataset.file) {
            socket.send(JSON.stringify({ file: script.dataset.file }))
          }
        }

        // add styles to body
        const style = document.createElement('style')
        style.innerHTML = `      
      /* Injected by five-server */
      /*[data-highlight="true"] {
        border: 1px rgb(90,170,255) solid !important;
        background-color: rgba(155,215,255,0.5);
        animation: fadeOutHighlight 1s forwards 0.5s;
      }
      img[data-highlight="true"] {
        filter: sepia(100%) hue-rotate(180deg) saturate(200%);
        animation: fadeOutHighlightIMG 0.5s forwards 0.5s;
      }*/
      @keyframes fadeOutHighlight {
        from {background-color: rgba(155,215,255,0.5);}
        to {background-color: rgba(155,215,255,0);}
      }      
      @keyframes fadeOutHighlightIMG {
        0% {filter: sepia(100%) hue-rotate(180deg) saturate(200%);}
        33% {filter: sepia(66%) hue-rotate(180deg) saturate(100%);}
        50% {filter: sepia(50%) hue-rotate(90deg) saturate(50%);}
        66% {filter: sepia(33%) hue-rotate(0deg) saturate(100%);}
        100% {filter: sepia(0%) hue-rotate(0deg) saturate(100%);}
      }
      @keyframes fiveserverInfoPopup {
        0%   {top:-40px;}
        15%  {top:4px;}
        85%  {top:4px;}
        100% {top:-40px;}
      }
      /*smaller*/
      @media (max-width: 640px) {
        #fiveserver-info-wrapper {
          max-width: 98%;
        }
        #fiveserver-info {
          border-radius: 0px;
        }      
      }

      `
        document.head.appendChild(style)
      }
      socket.onclose = function (e) {
        setTimeout(function () {
          popup('lost connection to dev server', 'error')
        }, 300)
        if (attempts === 0) console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason)

        setTimeout(function () {
          attempts++
          if (attempts > 1) console.log('connecting...')
          if (attempts <= MAX_ATTEMPTS) connect()
          wait = Math.floor(wait * 1.1)
        }, wait)
      }
      socket.onerror = function (event) {
        // console.error('Socket encountered error: ', event, 'Closing socket')
        socket.close()
      }
    }

    const MAX_STATUS_CHECK = 10
    let statusChecks = 0
    const reCheckStatus = () => {
      if (statusChecks > MAX_STATUS_CHECK) {
        console.error('[Five Server] status check failed')
        console.log('[Five Server] browser reloads in 5 seconds')
        setTimeout(() => {
          window.location.reload()
        }, 5000)
        return
      }
      console.log('[Five Server] status check...')
      setTimeout(() => {
        checkStatus()
      }, 1000)
    }

    const checkStatus = async () => {
      statusChecks++
      const p = new URL(script.src).protocol
      const h = new URL(script.src).host

      const url = `${p}//${h}/fiveserver/status`

      try {
        const res = await fetch(url)
        const json = await res.json()

        if (json && json.status && json.status === 'online') {
          connect()
          statusChecks = 0
        } else {
          reCheckStatus()
        }
      } catch (error) {
        reCheckStatus()
      }
    }

    checkStatus()
  })
}
