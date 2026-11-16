import { expect, Page, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Captura screenshots de referência de cada viewport após o carregamento da cena 3D.
 * Diretório de saída configurável via SHOT_DIR (padrão: test-results/screens).
 */
const SHOT_DIR = process.env.SHOT_DIR ?? path.join('test-results', 'screens');

export async function waitForExperience(page: Page) {
  await page.goto('/');
  // A tela de carregamento é um diálogo modal que some sozinho ao concluir o preload dos modelos
  await expect(page.getByRole('dialog', { name: /Carregando AstroRelics/i })).toBeHidden({
    timeout: 150_000,
  });
  // Tempo para a câmera/planetas assentarem após o fade de entrada
  await page.waitForTimeout(2500);
}

test('screenshot de referência @shots', async ({ page }, testInfo) => {
  await waitForExperience(page);
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, `${testInfo.project.name}.png`) });
});
