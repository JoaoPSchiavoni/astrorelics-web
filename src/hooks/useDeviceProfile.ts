import { useEffect, useState } from 'react';
import { ViewportTier } from '../types/experience';

export interface DeviceProfile {
  /** Mesma regra de tiers usada pela cena 3D: < 640 mobile, < 1024 tablet, demais desktop */
  viewportTier: ViewportTier;
  /** Dispositivo com ponteiro principal grosso (dedo) */
  isTouch: boolean;
  /** Smartphone deitado: toque + largura > altura + altura reduzida (< 500px) */
  isLandscapeMobile: boolean;
  /** Layout compacto de painéis (bottom sheets) para telas < 768px */
  isCompactLayout: boolean;
  reducedMotion: boolean;
  /** Heurística de dispositivo com GPU/CPU modestas (usada para sombras, DPR e partículas) */
  isLowPower: boolean;
  /** Usuário pediu economia de dados (Data Saver) */
  saveData: boolean;
}

export function getViewportTier(width: number): ViewportTier {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
}

function readProfile(): DeviceProfile {
  if (typeof window === 'undefined') {
    return {
      viewportTier: 'desktop',
      isTouch: false,
      isLandscapeMobile: false,
      isCompactLayout: false,
      reducedMotion: false,
      isLowPower: false,
      saveData: false,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isTouch = matches('(pointer: coarse)');
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory ?? 8;
  const viewportTier = getViewportTier(width);
  const isLandscapeMobile = isTouch && width > height && height < 500;

  return {
    viewportTier,
    isTouch,
    isLandscapeMobile,
    isCompactLayout: width < 768,
    reducedMotion: matches('(prefers-reduced-motion: reduce)'),
    isLowPower: viewportTier === 'mobile' || isLandscapeMobile || cores <= 4 || memory <= 4,
    saveData: Boolean(nav.connection?.saveData),
  };
}

function sameProfile(a: DeviceProfile, b: DeviceProfile): boolean {
  return (
    a.viewportTier === b.viewportTier &&
    a.isTouch === b.isTouch &&
    a.isLandscapeMobile === b.isLandscapeMobile &&
    a.isCompactLayout === b.isCompactLayout &&
    a.reducedMotion === b.reducedMotion &&
    a.isLowPower === b.isLowPower &&
    a.saveData === b.saveData
  );
}

/**
 * Perfil reativo do dispositivo (viewport, orientação, toque, movimento reduzido e capacidade).
 * As atualizações são agrupadas por `requestAnimationFrame` e só geram re-render quando algum
 * campo realmente muda, evitando renders em cascata durante o redimensionamento.
 */
export function useDeviceProfile(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(() => readProfile());

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = readProfile();
        setProfile((prev) => (sameProfile(prev, next) ? prev : next));
      });
    };

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerQuery = window.matchMedia('(pointer: coarse)');

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    motionQuery.addEventListener('change', update);
    pointerQuery.addEventListener('change', update);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      motionQuery.removeEventListener('change', update);
      pointerQuery.removeEventListener('change', update);
    };
  }, []);

  return profile;
}
