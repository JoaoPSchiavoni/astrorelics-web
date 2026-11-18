import { expect, test } from '@playwright/test';
import { waitForExperience } from './visual.spec';

test.describe('AstroRelics — Mobile-First & Responsiveness Acceptance Suite', () => {
  test('sem overflow horizontal, sem erros no console e controles essenciais acessíveis', async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await waitForExperience(page);

    // 1. Ausência de overflow horizontal
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // 2. Seletor de destinos (Terra, Lua, Marte) visível e clicável
    const navGroup = page.getByRole('group', { name: /Destinos|Destinations/i });
    await expect(navGroup).toBeVisible();

    const earthBtn = navGroup.getByRole('button', { name: /Terra|Earth/i });
    const moonBtn = navGroup.getByRole('button', { name: /Lua|Moon/i });
    const marsBtn = navGroup.getByRole('button', { name: /Marte|Mars/i });

    await expect(earthBtn).toBeVisible();
    await expect(moonBtn).toBeVisible();
    await expect(marsBtn).toBeVisible();

    const isMobileProject = testInfo.project.name !== 'desktop-1440';
    if (isMobileProject) {
      for (const btn of [earthBtn, moonBtn, marsBtn]) {
        const box = await btn.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(40);
      }
    }

    // 3. Botão de Missões acessível em qualquer largura (inclusive < 768px)
    const missionsBtn = page
      .getByRole('button', { name: /Missões|Missions/i })
      .filter({ visible: true })
      .first();
    await expect(missionsBtn).toBeVisible();

    if (isMobileProject) {
      const mBox = await missionsBtn.boundingBox();
      expect(mBox).not.toBeNull();
      expect(mBox!.height).toBeGreaterThanOrEqual(42);
    }

    // 4. Fluxo de seleção de equipamento 3D na dock inferior e abertura do painel/bottom sheet
    const dockGroup = page
      .getByRole('group', { name: /Relíquias|NASA Relics/i })
      .filter({ visible: true })
      .first();
    await expect(dockGroup).toBeVisible();

    const firstArtifactBtn = dockGroup.getByRole('button').first();
    await firstArtifactBtn.click();

    // Aguarda salto hiperespacial (0.85s) + estabilização
    await page.waitForTimeout(1300);

    // Verifica botão de Voltar ao planeta e abas de conteúdo
    const backBtn = page
      .getByRole('button', { name: /Voltar|Back/i })
      .filter({ visible: true })
      .first();
    await expect(backBtn).toBeVisible();

    // Em modo paisagem compacta, o sheet começa recolhido para preservar a visão 3D;
    // clicamos em "Ver Info" / "Expandir painel de informações" se estiver recolhido para exibir as abas.
    const readInfoBtn = page
      .getByRole('button', {
        name: /Expandir painel de informações|Expand artifact information|Ver Info|Read Info/i,
      })
      .filter({ visible: true })
      .first();
    if (await readInfoBtn.isVisible()) {
      await readInfoBtn.click();
    }

    const historyTab = page
      .getByRole('button', { name: /História|History/i })
      .filter({ visible: true })
      .first();
    await expect(historyTab).toBeVisible();
    await historyTab.click();

    // No mobile/tablet (< 1024px), testa o botão de Esconder / Expandir o texto do objeto 3D
    const vp = page.viewportSize();
    if (vp && vp.width < 1024) {
      const hideTextBtn = page
        .getByRole('button', {
          name: /Esconder texto|Hide artifact information/i,
        })
        .filter({ visible: true })
        .first();
      await expect(hideTextBtn).toBeVisible();
      await hideTextBtn.click();
      await expect(historyTab).toBeHidden();

      const expandTextBtn = page
        .getByRole('button', {
          name: /Expandir painel de informações|Expand artifact information/i,
        })
        .filter({ visible: true })
        .first();
      await expect(expandTextBtn).toBeVisible();
      await expandTextBtn.click();
      await expect(historyTab).toBeVisible();
    }

    // Volta para o planeta
    await backBtn.click();
    await page.waitForTimeout(400);

    // 5. Abre o painel de Missões e testa minimizar/Ver 3D no mobile (< 768px)
    await missionsBtn.click();
    const missionPanel = page.getByRole('complementary', {
      name: /Centro de Missões|Interactive Missions/i,
    });
    await expect(missionPanel).toBeVisible();

    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      const minimizeBtn = missionPanel.getByRole('button', {
        name: /Minimizar painel|Minimize mission panel|Ver 3D|3D View/i,
      });
      await expect(minimizeBtn).toBeVisible();
      await minimizeBtn.click();

      const expandBtn = missionPanel.getByRole('button', {
        name: /Expandir|Expand/i,
      });
      await expect(expandBtn).toBeVisible();
      await expandBtn.click();
    }

    const closeMissionBtn = missionPanel.getByRole('button', {
      name: /Fechar painel|Close missions/i,
    });
    await closeMissionBtn.click();
    await expect(missionPanel).toBeHidden();

    // 6. Garante que ao sair da aba / minimizar o navegador (blur / pagehide), o áudio é pausado imediatamente
    const isPausedAfterBlur = await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new PageTransitionEvent('pagehide'));
      const audio = document.getElementById('beyond-bg-music') as HTMLAudioElement | null;
      return audio ? audio.paused : true;
    });
    expect(isPausedAfterBlur).toBe(true);

    expect(consoleErrors).toEqual([]);
  });
});
