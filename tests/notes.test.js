// tests/notes.test.js — unit test (no Electron needed)
import { describe, it, expect } from 'vitest'

function formatTitle(content) {
  return content.split('\n')[0].slice(0, 50) || 'Untitled'
}

describe('formatTitle', () => {
  it('takes first line up to 50 chars', () => {
    expect(formatTitle('Hello world\nrest')).toBe('Hello world')
  })
  it('returns Untitled for empty content', () => {
    expect(formatTitle('')).toBe('Untitled')
  })
})