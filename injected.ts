// <![CDATA[  <-- For SVG support
if ('WebSocket' in window) {
  window.addEventListener('load', () => {
    const script = document.querySelector('[data-id="five-server"]') as HTMLScriptElement
    const protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://'
    // const address = `${protocol}${window.location.host}${window.location.pathname}/ws`
    const address = `${protocol}${new URL(script.src).host}${window.location.pathname}/ws`

    const CONNECTED_MSG = 'Five-Server connected! https://npmjs.com/five-server'
    const MAX_ATTEMPTS = 25
    let wait = 1000
    let attempts = 0
    let socket!: WebSocket

    const send = (type: string, ...message: string[]) => {
      if (socket && socket?.readyState === 1) {
        socket.send(JSON.stringify({ console: { type, message } }))
      }
    }

    const overwriteLogs = () => {
      // log
      const oldLog = console.log
      console.log = function (...message) {
        if (message[0] === CONNECTED_MSG) send('log', 'Connected!')
        else send('log', ...message)
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

    function refreshCSS() {
      const sheets = document.getElementsByTagName('link')
      const head = document.getElementsByTagName('head')[0]
      for (let i = 0; i < sheets.length; ++i) {
        const elem = sheets[i]
        head.removeChild(elem)
        const rel = elem.rel
        if ((elem.href && typeof rel != 'string') || rel.length == 0 || rel.toLowerCase() == 'stylesheet') {
          const url = elem.href.replace(/(&|\?)_cacheOverride=\d+/, '')
          elem.href = `${url}${url.indexOf('?') >= 0 ? '&' : '?'}_cacheOverride=${new Date().valueOf()}`
        }
        head.appendChild(elem)
      }
    }
    function injectBody(body) {
      document.body.innerHTML = body
    }

    const connect = () => {
      socket = new WebSocket(address)

      socket.onmessage = function (msg) {
        wait = 1000
        attempts = 0

        if (msg.data === 'reload') window.location.reload()
        else if (msg.data === 'refreshcss') refreshCSS()
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
      `
        document.head.appendChild(style)
      }
      socket.onclose = function (e) {
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
