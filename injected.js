// <![CDATA[  <-- For SVG support
if ("WebSocket" in window) {
  (function () {
    function refreshCSS() {
      var sheets = [].slice.call(document.getElementsByTagName("link"));
      var head = document.getElementsByTagName("head")[0];
      for (var i = 0; i < sheets.length; ++i) {
        var elem = sheets[i];
        head.removeChild(elem);
        var rel = elem.rel;
        if ((elem.href && typeof rel != "string") || rel.length == 0 || rel.toLowerCase() == "stylesheet") {
          var url = elem.href.replace(/(&|\?)_cacheOverride=\d+/, "");
          elem.href = url + (url.indexOf("?") >= 0 ? "&" : "?") + "_cacheOverride=" + new Date().valueOf();
        }
        head.appendChild(elem);
      }
    }
    function injectBody(body) {
      document.body.innerHTML = body;
    }
    var protocol = window.location.protocol === "http:" ? "ws://" : "wss://";
    var address = protocol + window.location.host + window.location.pathname + "/ws";
    var socket = new WebSocket(address);
    socket.onmessage = function (msg) {
      if (msg.data == "reload") window.location.reload();
      else if (msg.data == "refreshcss") refreshCSS();
      else {
        const d = JSON.parse(msg.data);
        if (d.body) injectBody(d.body);
        if (d.position) {
          let line = d.position.line + 1;
          let char = d.position.character;

          if (line < 0) return;

          const body = document.body.innerHTML.replace(' data-hightlight="true"', "");
          const lines = body.split("\n");

          let i = -1;
          while (i === -1 && line >= 0 && lines[line]) {
            line--;

            if (lines[line] === "") continue;

            const htmlOpenTagRegex = /<[a-zA-Z]+(>|.*?[^?]>)/gm;
            const match = lines[line].match(htmlOpenTagRegex);

            if (match) {
              const firstIndex = lines[line].indexOf(match[0]);
              const lastIndex = lines[line].lastIndexOf(match[match.length - 1], char ? char : lines[line].length - 1);
              // console.log("match", match);
              // console.log("first", firstIndex);
              // console.log("lastIndex", lastIndex);

              // the open html tag to the left
              if (lastIndex >= 0) i = lastIndex;
              // the open html tag to the right
              else if (firstIndex >= 0) i = firstIndex;

              // shift i by tag lenght
              if (i !== -1) i += match[0].length - 1;
            }

            // i = lines[line].lastIndexOf(">", char ? char : lines[line].length - 1);
            char = undefined;
            // console.log("i", i, "l", line, "line", lines[line]);
          }

          if (i === -1) {
            // console.log("TODO: improve hightlight");
            return;
          }

          lines[line] = lines[line].slice(0, i) + ' data-hightlight="true"' + lines[line].slice(i);

          const hasChanges = document.body.innerHTML.trim() !== lines.join("\n").trim();

          if (hasChanges) {
            document.body.innerHTML = lines.join("\n");

            // scroll element into view (center of page)
            const el = document.querySelector(`[data-hightlight="true"]`);
            if (el) {
              const documentOffsetTop = (el) => {
                return el.offsetTop + (el.offsetParent ? documentOffsetTop(el.offsetParent) : 0);
              };
              const pos = documentOffsetTop(el) - window.innerHeight / 2;
              window.scrollTo(0, pos);
            }
          }
        }
      }
    };
    socket.onopen = function () {
      var scripts = document.querySelectorAll("script");
      for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];
        if (script.dataset && script.dataset.file) {
          socket.send(JSON.stringify({ file: script.dataset.file }));
        }
      }

      // add styles to body
      const style = document.createElement("style");
      style.innerHTML = `      
      /* Injected by five-server */
      [data-hightlight="true"] {
        border: 1px rgb(90,170,255) solid !important;
        background-color: rgba(155,215,255,0.5);
        animation: fadeOutHighlight 1s forwards 0.5s;
      }
      @keyframes fadeOutHighlight {
        from {background-color: rgba(155,215,255,0.5);}
        to {background-color: rgba(155,215,255,0);}
      }
      `;
      document.head.appendChild(style);

      console.log(
        `%c %c %c %c %c Five-Server is connected. %c https://npmjs.com/five-server`,
        "background: #ff0000",
        "background: #ffff00",
        "background: #00ff00",
        "background: #00ffff",
        "color: #fff; background: #000000;",
        "background: none",
      );
    };
  })();
}
// ]]>
