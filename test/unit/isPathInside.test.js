const path = require('path')
const { isPathInside } = require('../../lib/misc')

describe('isPathInside', () => {
  const root = path.resolve('/srv/webroot')

  it('accepts files and folders inside the root', () => {
    expect(isPathInside(path.join(root, 'index.html'), root)).toBe(true)
    expect(isPathInside(path.join(root, 'sub', 'page.html'), root)).toBe(true)
  })

  it('accepts the root folder itself', () => {
    expect(isPathInside(root, root)).toBe(true)
  })

  it('normalizes ".." segments before checking', () => {
    expect(isPathInside(`${root}/sub/../index.html`, root)).toBe(true)
    expect(isPathInside(`${root}/../secret.txt`, root)).toBe(false)
    expect(isPathInside(`${root}/sub/../../secret.txt`, root)).toBe(false)
  })

  it('rejects the parent folder and absolute paths elsewhere', () => {
    expect(isPathInside(path.join(root, '..'), root)).toBe(false)
    expect(isPathInside(path.resolve('/etc/passwd'), root)).toBe(false)
  })

  it('rejects sibling folders that share the root name as a prefix', () => {
    expect(isPathInside(path.resolve('/srv/webroot2/index.html'), root)).toBe(false)
  })

  it('accepts names that start with two dots', () => {
    expect(isPathInside(path.join(root, '..hidden.html'), root)).toBe(true)
  })
})
