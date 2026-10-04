import { defineConfig } from 'vitest/config'

export default defineConfig({
  // the state suites boot the whole reader against fake IndexedDB; several run at once
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'], testTimeout: 20000 },
})
