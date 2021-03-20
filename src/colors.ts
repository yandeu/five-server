// usage '\u001b[Xm' // where X is the number

export const colors = (str: string, clr: Colors) => {
  const c = colorCodes[clr]
  const open = `\u001b[${c[0]}m`
  const close = `\u001b[${c[0]}m`
  return `${open}${str}${close}`
}

export type Colors = keyof typeof colorCodes

const colorCodes = {
  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  gray: [90, 39], // brightBlack
  grey: [90, 39], // brightBlack

  brightRed: [91, 39],
  brightGreen: [92, 39],
  brightYellow: [93, 39],
  brightBlue: [94, 39],
  brightMagenta: [95, 39],
  brightCyan: [96, 39],
  brightWhite: [97, 39]
}
