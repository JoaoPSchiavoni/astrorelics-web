import React, { MutableRefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ExperienceState } from '../../types/experience';

export interface ExplorationDragState {
  /** Rotação acumulada [pitch, yaw] aplicada pelo usuário ao corpo selecionado */
  userRotationOffset: THREE.Vector2;
  /** Rotação alvo [pitch, yaw] com amortecimento suave */
  targetRotationOffset: THREE.Vector2;
  /** Fator de zoom atual amortecido (1.0 = padrão) */
  userZoom?: number;
  /** Fator de zoom alvo controlado por pinça de 2 dedos ou scroll (1.0 = padrão) */
  targetZoom?: number;
  /** Indica se o usuário está arrastando ativamente */
  isDragging: boolean;
  /** Timestamp (performance.now) do término do último arraste para filtrar cliques acidentais */
  lastDragEndTime: number;
}

interface ExplorationControlsProps {
  experienceState: ExperienceState;
  dragStateRef: MutableRefObject<ExplorationDragState>;
  parallaxOffsetRef: MutableRefObject<THREE.Vector2>;
  onUserInteractionStart?: () => void;
}

const DRAG_THRESHOLD_PX = 5;
const MAX_PITCH_RAD = 1.15; // ~66 graus para evitar inversão dos polos (gimbal lock)
export const MIN_ZOOM = 0.75;
export const MAX_ZOOM = 1.65;
export const MAX_ZOOM_PORTRAIT = 1.45;

export const ExplorationControls: React.FC<ExplorationControlsProps> = ({
  experienceState,
  dragStateRef,
  parallaxOffsetRef,
  onUserInteractionStart,
}) => {
  const { gl, camera, size } = useThree();
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const startPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPinchDistRef = useRef<number | null>(null);
  const hasNotifiedInteractionRef = useRef(false);

  useEffect(() => {
    const domElement = gl.domElement;
    // Desativa gestos nativos do navegador no canvas para evitar conflito com scroll/zoom da página
    domElement.style.touchAction = 'none';

    const notifyInteraction = () => {
      if (!hasNotifiedInteractionRef.current && onUserInteractionStart) {
        hasNotifiedInteractionRef.current = true;
        onUserInteractionStart();
      }
    };

    const getPinchDistance = (): number | null => {
      if (activePointersRef.current.size < 2) return null;
      const pts = Array.from(activePointersRef.current.values());
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (experienceState !== 'exploring') return;

      const currentTargetZoom = dragStateRef.current.targetZoom ?? 1.0;
      const zoomDelta = -e.deltaY * 0.00085;
      const isPortrait = window.innerHeight > window.innerWidth;
      const maxZoomLimit = isPortrait ? MAX_ZOOM_PORTRAIT : MAX_ZOOM;
      dragStateRef.current.targetZoom = THREE.MathUtils.clamp(
        currentTargetZoom + zoomDelta,
        MIN_ZOOM,
        maxZoomLimit
      );
      notifyInteraction();
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (experienceState !== 'exploring') return;
      if (e.button !== undefined && e.button !== 0) return;

      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointersRef.current.size === 1) {
        startPointerPosRef.current = { x: e.clientX, y: e.clientY };
        dragStateRef.current.isDragging = false;
        lastPinchDistRef.current = null;
      } else if (activePointersRef.current.size === 2) {
        // Inicia gesto de pinça com dois dedos
        dragStateRef.current.isDragging = false;
        lastPinchDistRef.current = getPinchDistance();
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!activePointersRef.current.has(e.pointerId)) return;

      if (experienceState !== 'exploring') {
        activePointersRef.current.clear();
        dragStateRef.current.isDragging = false;
        lastPinchDistRef.current = null;
        return;
      }

      // Gesto de pinça com dois dedos para zoom suave no mobile/tablet
      if (activePointersRef.current.size >= 2) {
        activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const dist = getPinchDistance();
        if (dist !== null && lastPinchDistRef.current !== null && lastPinchDistRef.current > 8) {
          const ratio = dist / lastPinchDistRef.current;
          const currentTargetZoom = dragStateRef.current.targetZoom ?? 1.0;
          const isPortrait = window.innerHeight > window.innerWidth;
          const maxZoomLimit = isPortrait ? MAX_ZOOM_PORTRAIT : MAX_ZOOM;
          dragStateRef.current.targetZoom = THREE.MathUtils.clamp(
            currentTargetZoom * Math.pow(ratio, 0.9),
            MIN_ZOOM,
            maxZoomLimit
          );
          dragStateRef.current.lastDragEndTime = performance.now();
          notifyInteraction();
        }
        lastPinchDistRef.current = dist;
        return;
      }

      const prev = activePointersRef.current.get(e.pointerId);
      if (!prev) return;

      const totalDx = e.clientX - startPointerPosRef.current.x;
      const totalDy = e.clientY - startPointerPosRef.current.y;
      const totalDist = Math.hypot(totalDx, totalDy);

      if (!dragStateRef.current.isDragging && totalDist > DRAG_THRESHOLD_PX) {
        dragStateRef.current.isDragging = true;
        domElement.style.cursor = 'grabbing';
        notifyInteraction();
      }

      if (dragStateRef.current.isDragging) {
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;

        const isTouchPointer = e.pointerType === 'touch' || window.innerWidth < 768;
        const sensitivity = isTouchPointer ? 0.0062 : 0.0058;

        // Arrastar horizontalmente gira o corpo ao redor do eixo Y (360° livres)
        dragStateRef.current.targetRotationOffset.y += dx * sensitivity;
        // Arrastar verticalmente inclina o eixo X com limite confortável nos polos
        dragStateRef.current.targetRotationOffset.x = THREE.MathUtils.clamp(
          dragStateRef.current.targetRotationOffset.x + dy * sensitivity,
          -MAX_PITCH_RAD,
          MAX_PITCH_RAD
        );

        // Paralaxe espacial sutil
        parallaxOffsetRef.current.x = THREE.MathUtils.clamp(
          parallaxOffsetRef.current.x + dx * 0.0012,
          -0.65,
          0.65
        );
        parallaxOffsetRef.current.y = THREE.MathUtils.clamp(
          parallaxOffsetRef.current.y + dy * 0.0012,
          -0.45,
          0.45
        );
      }

      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };

    const handlePointerUpOrCancel = (e: PointerEvent) => {
      activePointersRef.current.delete(e.pointerId);

      if (dragStateRef.current.isDragging || lastPinchDistRef.current !== null) {
        dragStateRef.current.lastDragEndTime = performance.now();
      }

      if (activePointersRef.current.size < 2) {
        lastPinchDistRef.current = null;
      }

      if (activePointersRef.current.size === 1) {
        const remaining = Array.from(activePointersRef.current.values())[0];
        startPointerPosRef.current = { x: remaining.x, y: remaining.y };
        dragStateRef.current.isDragging = false;
      } else if (activePointersRef.current.size === 0) {
        dragStateRef.current.isDragging = false;
        domElement.style.cursor = experienceState === 'exploring' ? 'grab' : 'default';
      }
    };

    const handleWindowBlur = () => {
      activePointersRef.current.clear();
      lastPinchDistRef.current = null;
      dragStateRef.current.isDragging = false;
      domElement.style.cursor = experienceState === 'exploring' ? 'grab' : 'default';
    };

    const preventSafariGesture = (e: Event) => {
      e.preventDefault();
    };

    domElement.style.cursor = experienceState === 'exploring' ? 'grab' : 'default';

    domElement.addEventListener('wheel', handleWheel, { passive: false });
    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('lostpointercapture', handlePointerUpOrCancel);
    domElement.addEventListener('gesturestart', preventSafariGesture, { passive: false } as AddEventListenerOptions);
    domElement.addEventListener('gesturechange', preventSafariGesture, { passive: false } as AddEventListenerOptions);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUpOrCancel);
    window.addEventListener('pointercancel', handlePointerUpOrCancel);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      domElement.removeEventListener('wheel', handleWheel);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('lostpointercapture', handlePointerUpOrCancel);
      domElement.removeEventListener('gesturestart', preventSafariGesture);
      domElement.removeEventListener('gesturechange', preventSafariGesture);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUpOrCancel);
      window.removeEventListener('pointercancel', handlePointerUpOrCancel);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [gl, experienceState, dragStateRef, parallaxOffsetRef, onUserInteractionStart]);

  useFrame((_, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    const drag = dragStateRef.current;

    if (drag.userZoom === undefined) drag.userZoom = 1.0;
    if (drag.targetZoom === undefined) drag.targetZoom = 1.0;

    // Amortecimento suave (damping) para rotação do corpo em primeiro plano
    drag.userRotationOffset.x = THREE.MathUtils.damp(
      drag.userRotationOffset.x,
      drag.targetRotationOffset.x,
      8.5,
      safeDelta
    );
    drag.userRotationOffset.y = THREE.MathUtils.damp(
      drag.userRotationOffset.y,
      drag.targetRotationOffset.y,
      8.5,
      safeDelta
    );

    // Amortecimento suave do zoom de pinça / roda
    drag.userZoom = THREE.MathUtils.damp(
      drag.userZoom,
      drag.targetZoom,
      7.5,
      safeDelta
    );

    // Adapta distância base da câmera para telas muito estreitas (ex: 320px-360px)
    const aspect = size.height > 0 ? size.width / size.height : 1.0;
    const baseCamZ = aspect < 0.55 ? 8.55 : aspect < 0.72 ? 8.35 : 8.2;
    const targetCamZ =
      experienceState === 'traveling' ? baseCamZ : baseCamZ / Math.max(0.5, drag.userZoom);

    // Mantém a câmera estável com leve resposta de orientação e distância adaptativa
    const targetCamX = parallaxOffsetRef.current.x * 0.18;
    const targetCamY = -parallaxOffsetRef.current.y * 0.14;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 5, safeDelta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 5, safeDelta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 7, safeDelta);
    camera.lookAt(0, 0, 0);
  });

  return null;
};
