function $(id) {
  const el = 'string' == typeof id ? document.getElementById(id) : id

  el.on = function (event, fn) {
    if ('content loaded' == event) {
      event = window.attachEvent ? 'load' : 'DOMContentLoaded'
    }
    el.addEventListener ? el.addEventListener(event, fn, false) : el.attachEvent(`on${event}`, fn)
  }

  el.all = function (selector) {
    return $(el.querySelectorAll(selector))
  }

  el.each = function (fn) {
    for (let i = 0, len = el.length; i < len; ++i) {
      fn($(el[i]), i)
    }
  }

  el.getClasses = function () {
    const c = this.getAttribute('class')
    if (c) return c.split(/\s+/)
    return []
  }

  el.addClass = function (name) {
    const classes = this.getAttribute('class')
    if (!el.getAttribute(name)) el.setAttribute('class', classes ? `${classes} ${name}` : name)
  }

  el.removeClass = function (name) {
    const classes = this.getClasses().filter(function (curr) {
      return curr != name
    })
    this.setAttribute('class', classes.join(' '))
  }

  return el
}
