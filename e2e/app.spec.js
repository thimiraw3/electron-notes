// e2e/app.spec.js — full E2E with Playwright
const { test, expect, _electron: electron } = require('@playwright/test')

test('creates a note and types in it', async () => {
  const app = await electron.launch({ args: ['dist/main/index.js'] })
  const win = await app.firstWindow()

  await win.click('[data-testid="new-note-btn"]')
  await win.fill('[data-testid="editor"]', 'My first note')

  const content = await win.inputValue('[data-testid="editor"]')
  expect(content).toBe('My first note')

  await app.close()
})