export const error = (msg: string) => {
  if (msg) console.log(msg)
  else console.log('ERROR: Unknown :/')

  process.exit(1)
}
