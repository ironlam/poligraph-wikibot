import { describe, it, expect } from 'vitest'
import { resolveLegislature } from '../wikidata.js'

describe('resolveLegislature', () => {
  it('should resolve XVe legislature (2017-2022)', () => {
    expect(resolveLegislature('2017-06-21')).toBe('Q30897847')
    expect(resolveLegislature('2020-01-15')).toBe('Q30897847')
    expect(resolveLegislature('2022-06-21')).toBe('Q30897847')
  })

  it('should resolve XVIe legislature (2022-2024)', () => {
    expect(resolveLegislature('2022-06-22')).toBe('Q112567597')
    expect(resolveLegislature('2023-06-01')).toBe('Q112567597')
    expect(resolveLegislature('2024-07-07')).toBe('Q112567597')
  })

  it('should resolve XVIIe legislature (2024-)', () => {
    expect(resolveLegislature('2024-07-08')).toBe('Q117155032')
    expect(resolveLegislature('2025-11-13')).toBe('Q117155032')
  })

  it('should return null for pre-2017 dates', () => {
    expect(resolveLegislature('2016-12-31')).toBeNull()
    expect(resolveLegislature('2012-06-18')).toBeNull()
  })
})
