const misc = require('../lib/misc')

describe('appendPathToUrl()', () => {
  it('should append fsws', () => {
    expect(misc.appendPathToUrl('https://example.com', 'fsws')).toBe('https://example.com/fsws')
    expect(misc.appendPathToUrl('https://example.com', '/fsws')).toBe('https://example.com/fsws')
    expect(misc.appendPathToUrl('https://example.com/', 'fsws')).toBe('https://example.com/fsws')
    expect(misc.appendPathToUrl('https://example.com/', '/fsws')).toBe('https://example.com/fsws')
    expect(misc.appendPathToUrl('https://example.com//', 'fsws')).toBe('https://example.com/fsws')
    expect(misc.appendPathToUrl('https://example.com', '//fsws')).toBe('https://example.com/fsws')

    expect(misc.appendPathToUrl('https://example.com/about', 'fsws')).toBe('https://example.com/about/fsws')
    expect(misc.appendPathToUrl('https://example.com/about/', 'fsws')).toBe('https://example.com/about/fsws')
    expect(misc.appendPathToUrl('https://example.com/about', '/fsws')).toBe('https://example.com/about/fsws')
    expect(misc.appendPathToUrl('https://example.com/about/', '/fsws')).toBe('https://example.com/about/fsws')

    expect(misc.appendPathToUrl('https://example.com/about', '//fsws')).toBe('https://example.com/about/fsws')
  })
})
