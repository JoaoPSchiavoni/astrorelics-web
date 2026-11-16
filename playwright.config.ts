import { defineConfig, devices } from '@playwright/test';

/**
 * Testes E2E de responsividade e interação por toque do AstroRelics.
 *
 * Usa o Google Chrome instalado na máquina (`channel: 'chrome'`) para evitar o download
 * de navegadores do Playwright. O WebGL roda via SwiftShader no modo headless.
 *
 * Execução:  npm run test:e2e   (faz o build antes e sobe o `vite preview` automaticamente)
 */
const PORT = 4173;

const webglArgs = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

const touchDevice = (width: number, height: number) => ({
  viewport: { width, height },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['Pixel 7'].userAgent,
});

export default defineConfig({
  testDir: './tests',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    launchOptions: { args: webglArgs },
    trace: 'off',
  },
  projects: [
    { name: 'mobile-320', use: touchDevice(320, 640) },
    { name: 'mobile-360', use: touchDevice(360, 780) },
    { name: 'mobile-375', use: touchDevice(375, 667) },
    { name: 'mobile-390', use: touchDevice(390, 844) },
    { name: 'mobile-430', use: touchDevice(430, 932) },
    { name: 'tablet-768', use: touchDevice(768, 1024) },
    { name: 'landscape-844', use: touchDevice(844, 390) },
    {
      name: 'desktop-1440',
      use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: false },
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
