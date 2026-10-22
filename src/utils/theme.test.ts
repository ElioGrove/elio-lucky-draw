import { expect, it, vi } from 'vitest'
import { themeChange } from './index'
import { persistenceIssue } from './persistence'

it('applies the theme even when browser storage writes are unavailable', () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  try {
    expect(() => themeChange('dracula')).not.toThrow()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dracula')
    expect(persistenceIssue.value).toBe('error.storageFull')
  }
  finally {
    spy.mockRestore()
    persistenceIssue.value = ''
  }
})
