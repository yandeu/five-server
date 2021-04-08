import { exec } from 'child_process'
import fs from 'fs'

export class ExecPHP {
  private php: string | undefined
  private phpIni: string | undefined

  set path(path: string | undefined) {
    this.php = path
  }

  set ini(path: string | undefined) {
    this.phpIni = path
  }

  async parseFile(absolutePath, res): Promise<string> {
    let msg = ''

    return new Promise(resolve => {
      if (!this.php) {
        msg = 'Could not find PHP executable.'
        res.status(500)
      }

      if (!msg && this.php && !fs.existsSync(this.php)) {
        msg = `Could not find executable: "${this.php}"`
        res.status(500)
      }

      if (msg) {
        console.error(msg)
        return resolve(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PHP ERROR</title>
  </head>
  <body>

    <style>
      html {
        font-family: Arial, Helvetica, sans-serif;
        overflow-x: hidden;
      }
      .code-line {
        background: #e0e0e0;   
        padding: 2px 5px;     
        border-radius: 2px;
      }
      .code-box {
        background: #0c0e14;   
        font-size: 14px;
        padding: 8px 12px;
        border-radius: 2px;
        overflow-x: auto;
        max-width: 400px;
      }
      .white   { color: #ffffff; } 
      .red     { color: #ff79c6; }
      .green   { color: #50fa6a; }
      .blue    { color: #bd93f9; }
      .yellow  { color: #f1f275; }
      .gray    { color: #6272a4; }
    </style>


    <div>
      <h2>PHP ERROR</h2>
      <p>${msg}</p>

      <h3>Install PHP</h3>
      <p>Download and install <a href="https://www.apachefriends.org/index.html">XAMPP</a>.</p>
      
      <h3>Get PHP Path</h3>
      <p>Follow the steps below to get the path to the PHP executable:</p>
      <ul>
        <li><b>Ubuntu:</b> Enter <code class="code-line">which php</code> in your Terminal.
        <li><b>macOS:</b> Enter <code class="code-line">which php</code> in your Terminal.
        <li><b>Windows:</b> Search for php.exe.
      </ul>

      <h3>Config File Example</h3>
<pre class="code-box"><code>
<span class="gray">// fiveserver.config.js</span>
<span class="green">module</span><span class="red">.</span><span class="green">exports</span> <span class="red">=</span> <span class="white">{</span>
  <span class="white">php</span><span class="red">:</span> <span class="yellow">"/usr/bin/php"</span>              <span class="gray">// macOS/Ubuntu</span>
  <span class="white">php</span><span class="red">:</span> <span class="yellow">"C:\\\\xampp\\\\php\\\\php.exe"</span>   <span class="gray">// Windows</span>
<span class="white">}</span>
</code></pre>
    </div>
  </body>
</html>
    
        `)
      }

      const cmd = `"${this.php}" "${absolutePath}"`

      exec(cmd, function (error, stdout, stderr) {
        if (error) return resolve(`<p>error: ${error.message}</p>`)
        if (stderr) return resolve(`<p>stderr: ${stderr}</p>`)

        resolve(stdout)
      })
    })
  }
}
