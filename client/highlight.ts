/* eslint-disable prefer-object-spread */
/* eslint-disable prefer-template */

/**
 * @copyright
 * Copyright (c) 2012 - present Adobe Systems Incorporated. All rights reserved. (https://github.com/adobe)
 * Copyright (c) 2021 Yannick Deubel (https://github.com/yandeu)
 *
 * @license {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 *
 * @description
 * copied from https://github.com/adobe/brackets/blob/master/src/LiveDevelopment/Agents/RemoteFunctions.js
 * previously licensed under MIT (https://github.com/adobe/brackets/blob/master/LICENSE)
 */

let _remoteHighlight
const HIGHLIGHT_CLASS_NAME = '__brackets-ld-highlight'

const config = {
  experimental: false, // enable experimental features
  debug: true, // enable debug output and helpers
  autoConnect: false, // go live automatically after startup?
  highlight: true, // enable highlighting?
  highlightConfig: {
    // the highlight configuration for the Inspector
    borderColor: { r: 255, g: 229, b: 153, a: 0.66 },
    contentColor: { r: 111, g: 168, b: 220, a: 0.55 },
    marginColor: { r: 246, g: 178, b: 107, a: 0.66 },
    paddingColor: { r: 147, g: 196, b: 125, a: 0.66 },
    showInfo: true
  },
  remoteHighlight: {
    animateStartValue: {
      'background-color': 'rgba(0, 162, 255, 0.5)',
      opacity: 0
    },
    animateEndValue: {
      'background-color': 'rgb(106, 171, 233)', //'rgba(0, 162, 255, 0)',
      opacity: 0.6
    },
    paddingStyling: {
      //'border-width': '1px',
      //'border-style': 'dashed',
      //'border-color': 'rgba(0, 162, 255, 0.5)',
      'background-color': 'rgb(156, 221, 156)'
    },
    marginStyling: {
      'background-color': 'rgb(255 ,177 ,95)' // 'rgba(21, 165, 255, 0.58)'
    },
    borderColor: 'rgba(21, 165, 255, 0.85)',
    showPaddingMargin: true
  }
}

// Checks if the element is in Viewport in the client browser
function isInViewport(element) {
  const rect = element.getBoundingClientRect()
  const html = window.document.documentElement
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || html.clientHeight) &&
    rect.right <= (window.innerWidth || html.clientWidth)
  )
}

// set an event on a element
function _trigger(element, name, value, autoRemove?) {
  // MOD(yandeu): Do not automatically remove the highlight.
  /*
  const key = 'data-ld-' + name
  if (value !== undefined && value !== null) {
    element.setAttribute(key, value)
    if (autoRemove) {
      window.setTimeout(element.removeAttribute.bind(element, key))
    }
  } else {
    element.removeAttribute(key)
  }
  */
}

// compute the screen offset of an element
function _screenOffset(element) {
  const elemBounds = element.getBoundingClientRect(),
    body = window.document.body
  let offsetTop, offsetLeft

  if (window.getComputedStyle(body).position === 'static') {
    offsetLeft = elemBounds.left + window.pageXOffset
    offsetTop = elemBounds.top + window.pageYOffset
  } else {
    const bodyBounds = body.getBoundingClientRect()
    offsetLeft = elemBounds.left - bodyBounds.left
    offsetTop = elemBounds.top - bodyBounds.top
  }
  return { left: offsetLeft, top: offsetTop }
}

// returns the distance from the top of the closest relatively positioned parent element
function getDocumentOffsetTop(element) {
  return element.offsetTop + (element.offsetParent ? getDocumentOffsetTop(element.offsetParent) : 0)
}

// redraw active highlights
function redrawHighlights() {
  if (_remoteHighlight) {
    _remoteHighlight.redraw()
  }
}

let req, timeout
const animateHighlight = function (time) {
  if (req) {
    window.cancelAnimationFrame(req)
    window.clearTimeout(timeout)
  }
  req = window.requestAnimationFrame(redrawHighlights)

  timeout = setTimeout(function () {
    window.cancelAnimationFrame(req)
    req = null
  }, time * 1000)
}

export class Highlight {
  trigger: boolean
  elements: any[] = []
  selector = '[data-highlight="true"]'

  constructor(trigger: boolean) {
    this.trigger = !!trigger
  }

  elementExists(element) {
    let i
    for (i in this.elements) {
      if (this.elements[i] === element) {
        return true
      }
    }
    return false
  }

  makeHighlightDiv(element, doAnimation) {
    const elementBounds = element.getBoundingClientRect(),
      highlight = window.document.createElement('div'),
      elementStyling = window.getComputedStyle(element),
      transitionDuration = parseFloat(elementStyling.getPropertyValue('transition-duration')),
      animationDuration = parseFloat(elementStyling.getPropertyValue('animation-duration'))

    if (transitionDuration) {
      animateHighlight(transitionDuration)
    }

    if (animationDuration) {
      animateHighlight(animationDuration)
    }

    // Don't highlight elements with 0 width & height
    if (elementBounds.width === 0 && elementBounds.height === 0) {
      return
    }

    const realElBorder = {
      right: elementStyling.getPropertyValue('border-right-width'),
      left: elementStyling.getPropertyValue('border-left-width'),
      top: elementStyling.getPropertyValue('border-top-width'),
      bottom: elementStyling.getPropertyValue('border-bottom-width')
    }

    const borderBox = elementStyling.boxSizing === 'border-box'

    let innerWidth = parseFloat(elementStyling.width),
      innerHeight = parseFloat(elementStyling.height),
      outerHeight = innerHeight,
      outerWidth = innerWidth

    if (!borderBox) {
      innerWidth += parseFloat(elementStyling.paddingLeft) + parseFloat(elementStyling.paddingRight)
      innerHeight += parseFloat(elementStyling.paddingTop) + parseFloat(elementStyling.paddingBottom)
      ;(outerWidth = innerWidth + parseFloat(realElBorder.right) + parseFloat(realElBorder.left)),
        (outerHeight = innerHeight + parseFloat(realElBorder.bottom) + parseFloat(realElBorder.top))
    }

    const visualizations = {
      horizontal: 'left, right',
      vertical: 'top, bottom'
    }

    const drawPaddingRect = function (side) {
      const elStyling = {}

      if (visualizations.horizontal.indexOf(side) >= 0) {
        elStyling['width'] = elementStyling.getPropertyValue('padding-' + side)
        elStyling['height'] = innerHeight + 'px'
        elStyling['top'] = 0

        if (borderBox) {
          elStyling['height'] = innerHeight - parseFloat(realElBorder.top) - parseFloat(realElBorder.bottom) + 'px'
        }
      } else {
        elStyling['height'] = elementStyling.getPropertyValue('padding-' + side)
        elStyling['width'] = innerWidth + 'px'
        elStyling['left'] = 0

        if (borderBox) {
          elStyling['width'] = innerWidth - parseFloat(realElBorder.left) - parseFloat(realElBorder.right) + 'px'
        }
      }

      elStyling[side] = 0
      elStyling['position'] = 'absolute'

      return elStyling
    }

    const drawMarginRect = function (side) {
      const elStyling = {}

      const margin = []
      margin['right'] = parseFloat(elementStyling.getPropertyValue('margin-right'))
      margin['top'] = parseFloat(elementStyling.getPropertyValue('margin-top'))
      margin['bottom'] = parseFloat(elementStyling.getPropertyValue('margin-bottom'))
      margin['left'] = parseFloat(elementStyling.getPropertyValue('margin-left'))

      if (visualizations['horizontal'].indexOf(side) >= 0) {
        elStyling['width'] = elementStyling.getPropertyValue('margin-' + side)
        elStyling['height'] = outerHeight + margin['top'] + margin['bottom'] + 'px'
        elStyling['top'] = '-' + (margin['top'] + parseFloat(realElBorder.top)) + 'px'
      } else {
        elStyling['height'] = elementStyling.getPropertyValue('margin-' + side)
        elStyling['width'] = outerWidth + 'px'
        elStyling['left'] = '-' + realElBorder.left
      }

      elStyling[side] = '-' + (margin[side] + parseFloat(realElBorder[side])) + 'px'
      elStyling['position'] = 'absolute'

      return elStyling
    }

    const setVisibility = function (el) {
      if (!config.remoteHighlight.showPaddingMargin || parseInt(el.height, 10) <= 0 || parseInt(el.width, 10) <= 0) {
        el.display = 'none'
      } else {
        el.display = 'block'
      }
    }

    const paddingVisualizations = [
      drawPaddingRect('top'),
      drawPaddingRect('right'),
      drawPaddingRect('bottom'),
      drawPaddingRect('left')
    ]

    const marginVisualizations = [
      drawMarginRect('top'),
      drawMarginRect('right'),
      drawMarginRect('bottom'),
      drawMarginRect('left')
    ]

    const setupVisualizations = function (arr, config) {
      let i
      for (i = 0; i < arr.length; i++) {
        setVisibility(arr[i])

        // Applies to every visualisationElement (padding or margin div)
        arr[i]['transform'] = 'none'
        const el = window.document.createElement('div'),
          styles = Object.assign({}, config, arr[i])

        _setStyleValues(styles, el.style)

        highlight.appendChild(el)
      }
    }

    setupVisualizations(marginVisualizations, config.remoteHighlight.marginStyling)
    setupVisualizations(paddingVisualizations, config.remoteHighlight.paddingStyling)

    highlight.className = HIGHLIGHT_CLASS_NAME

    const offset = _screenOffset(element)

    let el = element,
      offsetLeft = 0,
      offsetTop = 0

    // Probably the easiest way to get elements position without including transform
    do {
      offsetLeft += el.offsetLeft
      offsetTop += el.offsetTop
      el = el.offsetParent
    } while (el)

    const stylesToSet = {
      left: offsetLeft + 'px',
      top: offsetTop + 'px',
      width: innerWidth + 'px',
      height: innerHeight + 'px',
      'z-index': 2000000,
      margin: 0,
      padding: 0,
      position: 'absolute',
      'pointer-events': 'none',
      'box-shadow': '0 0 1px #fff',
      'box-sizing': elementStyling.getPropertyValue('box-sizing'),
      'border-right': elementStyling.getPropertyValue('border-right'),
      'border-left': elementStyling.getPropertyValue('border-left'),
      'border-top': elementStyling.getPropertyValue('border-top'),
      'border-bottom': elementStyling.getPropertyValue('border-bottom'),
      transform: elementStyling.getPropertyValue('transform'),
      'transform-origin': elementStyling.getPropertyValue('transform-origin'),
      'border-color': config.remoteHighlight.borderColor
    }

    const mergedStyles = Object.assign({}, stylesToSet)

    const animateStartValues = config.remoteHighlight.animateStartValue

    const animateEndValues = config.remoteHighlight.animateEndValue

    const transitionValues = {
      'transition-property': 'opacity, background-color, transform',
      'transition-duration': '300ms, 2.3s'
    }

    function _setStyleValues(styleValues, obj) {
      let prop

      for (prop in styleValues) {
        obj.setProperty(prop, styleValues[prop])
      }
    }

    _setStyleValues(mergedStyles, highlight.style)
    _setStyleValues(doAnimation ? animateStartValues : animateEndValues, highlight.style)

    if (doAnimation) {
      _setStyleValues(transitionValues, highlight.style)

      window.setTimeout(function () {
        _setStyleValues(animateEndValues, highlight.style)
      }, 20)
    }

    window.document.body.appendChild(highlight)
  }

  add(element, doAnimation) {
    if (this.elementExists(element) || element === window.document) {
      return
    }
    if (this.trigger) {
      _trigger(element, 'highlight', 1)
    }

    if ((!window.event || window.event instanceof MessageEvent) && !isInViewport(element)) {
      let top = getDocumentOffsetTop(element)
      if (top) {
        top -= window.innerHeight / 2
        window.scrollTo(0, top)
      }
    }
    this.elements.push(element)

    this.makeHighlightDiv(element, doAnimation)
  }

  clear() {
    let i
    const highlights = window.document.querySelectorAll('.' + HIGHLIGHT_CLASS_NAME),
      body = window.document.body

    for (i = 0; i < highlights.length; i++) {
      body.removeChild(highlights[i])
    }

    if (this.trigger) {
      for (i = 0; i < this.elements.length; i++) {
        _trigger(this.elements[i], 'highlight', 0)
      }
    }

    this.elements = []
  }

  redraw() {
    let i, highlighted

    // When redrawing a selector-based highlight, run a new selector
    // query to ensure we have the latest set of elements to highlight.
    if (this.selector) {
      highlighted = window.document.querySelectorAll(this.selector)
    } else {
      highlighted = this.elements.slice(0)
    }

    this.clear()
    for (i = 0; i < highlighted.length; i++) {
      this.add(highlighted[i], false)
    }
  }
}
