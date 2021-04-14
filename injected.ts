// <![CDATA[  <-- For SVG support
if ('WebSocket' in window) {
  window.addEventListener('load', () => {
    console.log('[Five Server] connecting...')

    const script = document.querySelector('[data-id="five-server"]') as HTMLScriptElement
    const protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://'
    const address = `${protocol}${new URL(script.src).host}${window.location.pathname.replace(/\/+$/gm, '/fsws')}`

    const CONNECTED_MSG = '[Five Server] connected.'
    const MAX_ATTEMPTS = 25
    let wait = 1000
    let attempts = 0
    let socket!: WebSocket

    const popup = (message: string, type: 'info' | 'success' | 'error' | 'warn') => {
      let el = document.getElementById('fiveserver-info')
      if (el) el.remove()

      el = document.createElement('span')
      el.id = 'fiveserver-info'
      el.style.fontSize = '16px'
      el.style.fontFamily = 'Arial, Helvetica, sans-serif'
      el.style.color = 'white'
      el.style.backgroundColor = 'black'
      el.style.position = 'absolute'
      el.style.left = '50%'
      el.style.transform = 'translateX(-50%)'
      el.style.padding = '4px 12px'
      el.style.borderRadius = '4px'
      document.body.appendChild(el)

      if (type === 'error') {
        el.style.top = '4px'
        el.style.animation = ''

        el.style.color = 'black'
        el.style.backgroundColor = 'red'
      } else {
        // el.style.top = '4px'
        el.style.top = '-40px'
        el.style.animation = 'fiveserverInfoPopup 3s forwards'
      }

      if (type === 'success') {
        el.style.color = '#498d76'
        el.style.backgroundColor = '#00ffa9'
      } else if (type === 'info') {
        el.style.color = '#d2e1f0'
        el.style.backgroundColor = '#2996ff'
      }
      el.innerText = message
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

        // changing the href of the css file will make the browser refetch it
        const url = el.href.replace(/(&|\?)_cacheOverride=\d+/, '')
        el.href = `${url}${url.indexOf('?') >= 0 ? '&' : '?'}_cacheOverride=${new Date().valueOf()}`

        head.appendChild(el)
      }

      if (sheets.length > 0 && showPopup) popup('css updated', 'info')
    }

    const injectBody = body => {
      document.body.innerHTML = body
    }

    const connect = () => {
      socket = new WebSocket(address)

      socket.onmessage = function (msg) {
        wait = 1000
        attempts = 0

        if (msg.data === 'reload') window.location.reload()
        else if (msg.data === 'refreshcss') refreshCSS(true)
        else if (msg.data === 'refreshcss-silent') refreshCSS(false)
        else if (msg.data === 'connected') console.log(CONNECTED_MSG)
        else if (msg.data === 'initRemoteLogs') overwriteLogs()
        else {
          const d = JSON.parse(msg.data)
          if (d.navigate) window.location.replace(d.navigate)
          if (d.body) injectBody(d.body)
          if (d.position) {
            // TODO: This highlight section needs improvement

            let line = d.position.line + 1
            let char = d.position.character

            if (line < 0) return

            const body = document.body.innerHTML.replace(' data-highlight="true"', '')
            const lines = body.split('\n')

            let i = -1
            while (i === -1 && line >= 0 && lines[line]) {
              line--

              if (lines[line] === '') continue

              const htmlOpenTagRegex = /<[a-zA-Z]+(>|.*?[^?]>)/gm
              const match = lines[line].match(htmlOpenTagRegex)

              if (match) {
                const firstIndex = lines[line].indexOf(match[0])
                const lastIndex = lines[line].lastIndexOf(match[match.length - 1], char ? char : lines[line].length - 1)

                // the open html tag to the left
                if (lastIndex >= 0) i = lastIndex
                // the open html tag to the right
                else if (firstIndex >= 0) i = firstIndex

                // shift i by tag length
                if (i !== -1) i += match[0].length - 1
              }

              char = undefined
            }

            if (i === -1) {
              // console.log("TODO: improve highlight");
              return
            }

            let part1 = lines[line].slice(0, i).replace(/(<\w[^>]*)(>)(?!.*<\w[^>]*>)/gm, `$1 data-highlight="true">`)
            const part2 = lines[line].slice(i)

            if (!part1.includes('data-highlight="true"')) {
              part1 += ' data-highlight="true"'
            }

            lines[line] = part1 + part2

            const hasChanges = document.body.innerHTML.trim() !== lines.join('\n').trim()

            if (hasChanges) {
              document.body.innerHTML = lines.join('\n')

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
      [data-highlight="true"] {
        border: 1px rgb(90,170,255) solid !important;
        background-color: rgba(155,215,255,0.5);
        animation: fadeOutHighlight 1s forwards 0.5s;
      }
      @keyframes fadeOutHighlight {
        from {background-color: rgba(155,215,255,0.5);}
        to {background-color: rgba(155,215,255,0);}
      }
      @keyframes fiveserverInfoPopup {
        0%   {top:-40px;}
        15%  {top:4px;}
        85%  {top:4px;}
        100% {top:-40px;}
      }
      `
        document.head.appendChild(style)
      }
      socket.onclose = function (e) {
        popup('lost connection to dev server', 'error')
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

    connect()
  })
}
// ]]>
