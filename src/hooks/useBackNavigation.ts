import { useEffect, useRef } from 'react';
import { SpaceArtifactId } from '../types/experience';

interface UseBackNavigationOptions {
  activeArtifactId: SpaceArtifactId | null;
  isMissionPanelOpen: boolean;
  onCloseMissionPanel: () => void;
  onCloseArtifact: () => void;
}

/**
 * Integra as camadas sobrepostas (painel de missões e inspeção de objeto 3D) ao histórico
 * do navegador (`history.pushState` / `popstate`), permitindo que o botão físico/gestual
 * "Voltar" do Android ou navegador feche o painel/artefato aberto em vez de sair do site.
 */
export function useBackNavigation({
  activeArtifactId,
  isMissionPanelOpen,
  onCloseMissionPanel,
  onCloseArtifact,
}: UseBackNavigationOptions): void {
  const pushedDepthRef = useRef<number>(0);
  const handlingPopRef = useRef<boolean>(false);

  const stateRef = useRef({
    activeArtifactId,
    isMissionPanelOpen,
    onCloseMissionPanel,
    onCloseArtifact,
  });
  stateRef.current = {
    activeArtifactId,
    isMissionPanelOpen,
    onCloseMissionPanel,
    onCloseArtifact,
  };

  const desiredDepth = (activeArtifactId ? 1 : 0) + (isMissionPanelOpen ? 1 : 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (handlingPopRef.current) {
      handlingPopRef.current = false;
      pushedDepthRef.current = desiredDepth;
      return;
    }

    while (pushedDepthRef.current < desiredDepth) {
      pushedDepthRef.current += 1;
      try {
        window.history.pushState(
          { astroRelicsLayer: pushedDepthRef.current },
          ''
        );
      } catch {
        break;
      }
    }

    // Se fechou pela UI, sincroniza o state sem disparar navegação externa
    pushedDepthRef.current = desiredDepth;
  }, [desiredDepth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const current = stateRef.current;
      if (current.isMissionPanelOpen) {
        handlingPopRef.current = true;
        current.onCloseMissionPanel();
      } else if (current.activeArtifactId) {
        handlingPopRef.current = true;
        current.onCloseArtifact();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}
