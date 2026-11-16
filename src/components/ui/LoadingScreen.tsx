import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface LoadingScreenProps {
  progress: number;
  statusLabel: string;
  errorMessage: string | null;
  onRetry: () => void;
  onContinueWithFallback: () => void;
  onFinishTransition?: () => void;
}

/**
 * Dimensões e centro geométrico do novo logo AstroRelics (1376x768)
 */
const VIEWBOX_W = 1376;
const VIEWBOX_H = 768;
const CENTER_X = 688;
const CENTER_Y = 384;

// Parâmetros da órbita inclinada calibrados para o anel ciano/dourado do AstroRelics
const ORBIT_CX = 690;
const ORBIT_CY = 384;
const ORBIT_RX = 368;
const ORBIT_RY = 104;
const ORBIT_ANGLE_DEG = -27.2;
const ORBIT_ANGLE_RAD = (ORBIT_ANGLE_DEG * Math.PI) / 180;

// Posição do flare estelar principal no ápice superior direito da arte
const APEX_FLARE_X = 998;
const APEX_FLARE_Y = 224;

function getOrbitPoint(thetaRad: number) {
  const cosA = Math.cos(ORBIT_ANGLE_RAD);
  const sinA = Math.sin(ORBIT_ANGLE_RAD);
  const ux = ORBIT_RX * Math.cos(thetaRad);
  const uy = ORBIT_RY * Math.sin(thetaRad);

  return {
    x: ORBIT_CX + ux * cosA - uy * sinA,
    y: ORBIT_CY + ux * sinA + uy * cosA,
  };
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  statusLabel,
  errorMessage,
  onRetry,
  onContinueWithFallback,
  onFinishTransition,
}) => {
  const [visualProgress, setVisualProgress] = useState<number>(0);
  const [orbitTheta, setOrbitTheta] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isEntered, setIsEntered] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  const targetProgressRef = useRef<number>(progress);
  const finishTriggeredRef = useRef<boolean>(false);

  // Estrelas sutis de fundo com cintilação determinística
  const ambientStars = useMemo(
    () => [
      { cx: 145, cy: 120, r: 1.4, phase: 0.2 },
      { cx: 290, cy: 615, r: 1.6, phase: 1.5 },
      { cx: 430, cy: 95, r: 1.2, phase: 2.8 },
      { cx: 1120, cy: 110, r: 1.7, phase: 0.9 },
      { cx: 1240, cy: 520, r: 1.4, phase: 2.1 },
      { cx: 1050, cy: 660, r: 1.3, phase: 3.7 },
      { cx: 195, cy: 360, r: 1.1, phase: 4.4 },
      { cx: 1210, cy: 270, r: 1.5, phase: 5.1 },
    ],
    []
  );

  useEffect(() => {
    const enterTimer = window.requestAnimationFrame(() => {
      setIsEntered(true);
    });
    return () => window.cancelAnimationFrame(enterTimer);
  }, []);

  useEffect(() => {
    targetProgressRef.current = progress;
    if (progress < 100) {
      finishTriggeredRef.current = false;
      setIsExiting(false);
    }
  }, [progress]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      setElapsedSec((prev) => prev + dt);
      setOrbitTheta((prev) => (prev + dt * 2.45) % (Math.PI * 2));

      setVisualProgress((prev) => {
        const target = targetProgressRef.current;
        if (prev >= target) return prev;
        const maxStep = dt * 44;
        const diff = target - prev;
        const step = Math.min(diff, Math.max(dt * 18, Math.min(maxStep, diff * dt * 5.5)));
        const next = Math.min(target, prev + step);
        return target >= 100 && next >= 99.5 ? 100 : next;
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (
      !errorMessage &&
      progress >= 100 &&
      visualProgress >= 100 &&
      !finishTriggeredRef.current
    ) {
      finishTriggeredRef.current = true;
      const exitTimer = window.setTimeout(() => {
        setIsExiting(true);
      }, 220);
      const doneTimer = window.setTimeout(() => {
        onFinishTransition?.();
      }, 780);

      return () => {
        window.clearTimeout(exitTimer);
        window.clearTimeout(doneTimer);
      };
    }
  }, [errorMessage, progress, visualProgress, onFinishTransition]);

  const roundedProgress = Math.min(100, Math.max(0, Math.round(visualProgress)));

  // Posições na órbita elíptica
  const starPos = getOrbitPoint(orbitTheta);
  const secondaryPos = getOrbitPoint(orbitTheta + Math.PI);

  // Atenuação sutil quando o cometa passa pela parte traseira da órbita
  const isBackArc = Math.sin(orbitTheta) < -0.15;
  const starScale = isBackArc ? 0.55 : 0.88 + 0.25 * Math.cos(orbitTheta);
  const starOpacity = isBackArc ? 0.35 : 0.95;

  // Fases normalizadas (0..1000) para traços SVG
  const normPhase = (orbitTheta / (Math.PI * 2)) * 1000;
  const oppositePhase = (normPhase + 500) % 1000;

  // Rotações contínuas dos anéis do astrolábio
  const astrolabeCwDeg = (elapsedSec * 9) % 360;
  const astrolabeCcwDeg = -(elapsedSec * 14) % 360;

  // Progresso no anel circular do astrolábio (0..1000)
  const astrolabeProgress = Math.max(12, (visualProgress / 100) * 1000);

  // Respiração luminosa para o flare estelar principal da arte
  const apexPulse = 0.85 + 0.2 * Math.sin(elapsedSec * 3.2);
  const apexRotation = (elapsedSec * 12) % 360;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Carregando AstroRelics"
      className={`fixed inset-0 z-50 bg-[#02040A] flex flex-col items-center justify-center overflow-hidden select-none transition-all duration-700 ease-out ${
        isExiting
          ? 'opacity-0 scale-105 pointer-events-none'
          : isEntered
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-[0.98]'
      }`}
    >
      {/* Fundo espacial contínuo em tela cheia (ciano + dourado suave) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 65% at 50% 44%, rgba(14, 34, 58, 0.55) 0%, rgba(125, 211, 252, 0.07) 28%, rgba(253, 230, 138, 0.03) 48%, rgba(2, 4, 10, 0.96) 78%, #000000 100%)',
        }}
      />

      {/* Campo estelar sutil em tela cheia para integrar toda a viewport */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 w-full h-full"
      >
        {ambientStars.map((star, idx) => {
          const twinkle = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(elapsedSec * 2.1 + star.phase));
          const sx = (star.cx / VIEWBOX_W) * 1600;
          const sy = (star.cy / VIEWBOX_H) * 900;
          return (
            <circle
              key={`bg-${idx}`}
              cx={sx}
              cy={sy}
              r={star.r}
              fill={idx % 2 === 0 ? '#E0F2FE' : '#FEF3C7'}
              opacity={twinkle * 0.6}
            />
          );
        })}
      </svg>

      {/* Container principal com a arte oficial AstroRelics e camadas animadas em SVG */}
      <div className="relative w-full max-w-[1140px] px-2 sm:px-6 flex flex-col items-center justify-center">
        <div
          className={`relative w-full aspect-[1376/768] max-h-[70vh] flex items-center justify-center transition-transform duration-1000 ease-out ${
            isEntered ? 'scale-100' : 'scale-95'
          }`}
        >
          <svg
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
            className="w-full h-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              {/* Glow intenso para o flare estelar e partículas */}
              <filter id="astroStarGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="4.5" result="blur1" />
                <feGaussianBlur stdDeviation="12" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="astroSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Gradiente dual-tone ciano -> dourado fiel à identidade AstroRelics */}
              <linearGradient id="astroCyanGoldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#E0F2FE" stopOpacity="1" />
                <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.95" />
              </linearGradient>

              {/* ClipPaths para profundidade da órbita frente/trás */}
              <clipPath id="astroOrbitBackClip">
                <rect x="-440" y="-170" width="880" height="170" />
              </clipPath>
              <clipPath id="astroOrbitFrontClip">
                <rect x="-440" y="0" width="880" height="170" />
              </clipPath>

              {/* Máscara radial suave para evitar qualquer borda retangular da imagem */}
              <radialGradient id="astroLogoFadeGrad" cx="50%" cy="50%" r="50%">
                <stop offset="58%" stopColor="white" stopOpacity="1" />
                <stop offset="86%" stopColor="white" stopOpacity="0.65" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
              <mask id="astroLogoMask">
                <rect x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#astroLogoFadeGrad)" />
              </mask>
            </defs>

            {/* 1. Anéis externos de astrolábio girando atrás da arte */}
            <g transform={`translate(${CENTER_X}, ${CENTER_Y})`}>
              {/* Anel externo de telemetria (sentido horário) */}
              <g transform={`rotate(${astrolabeCwDeg})`}>
                <circle
                  cx="0"
                  cy="0"
                  r="272"
                  fill="none"
                  stroke="rgba(125, 211, 252, 0.22)"
                  strokeWidth="1.2"
                  strokeDasharray="6 14"
                />
                {/* Marcadores cardeais do astrolábio */}
                {[0, 90, 180, 270].map((deg) => (
                  <line
                    key={deg}
                    x1="0"
                    y1="-282"
                    x2="0"
                    y2="-262"
                    stroke="rgba(253, 230, 138, 0.4)"
                    strokeWidth="1.5"
                    transform={`rotate(${deg})`}
                  />
                ))}
              </g>

              {/* Anel interno de calibração (sentido anti-horário) */}
              <g transform={`rotate(${astrolabeCcwDeg})`}>
                <circle
                  cx="0"
                  cy="0"
                  r="224"
                  fill="none"
                  stroke="rgba(253, 230, 138, 0.18)"
                  strokeWidth="1"
                  strokeDasharray="24 18 4 18"
                />
              </g>
            </g>

            {/* 2. Imagem oficial AstroRelics integrada com mix-blend-screen e máscara suave */}
            <image
              href="/logo_astrorelics.jpg"
              x="0"
              y="0"
              width={VIEWBOX_W}
              height={VIEWBOX_H}
              preserveAspectRatio="xMidYMid meet"
              mask="url(#astroLogoMask)"
              style={{ mixBlendMode: 'screen' }}
            />

            {/* 4. Arco de progresso circular no astrolábio central */}
            <g transform={`translate(${CENTER_X}, ${CENTER_Y}) rotate(-90)`}>
              <circle
                cx="0"
                cy="0"
                r="272"
                pathLength={1000}
                fill="none"
                stroke="url(#astroCyanGoldGrad)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray={`${astrolabeProgress} 1000`}
                opacity="0.55"
                filter="url(#astroSoftGlow)"
              />
            </g>

            {/* 5. Feixes de energia orbitando na trajetória inclinada (metade traseira) */}
            <g
              transform={`translate(${ORBIT_CX}, ${ORBIT_CY}) rotate(${ORBIT_ANGLE_DEG})`}
              clipPath="url(#astroOrbitBackClip)"
              opacity="0.45"
            >
              <ellipse
                cx="0"
                cy="0"
                rx={ORBIT_RX}
                ry={ORBIT_RY}
                pathLength={1000}
                fill="none"
                stroke="url(#astroCyanGoldGrad)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeDasharray="130 870"
                strokeDashoffset={130 - normPhase}
                filter="url(#astroSoftGlow)"
              />
            </g>

            {/* 6. Feixes de energia orbitando na trajetória inclinada (metade frontal) */}
            <g
              transform={`translate(${ORBIT_CX}, ${ORBIT_CY}) rotate(${ORBIT_ANGLE_DEG})`}
              clipPath="url(#astroOrbitFrontClip)"
              opacity="0.88"
            >
              <ellipse
                cx="0"
                cy="0"
                rx={ORBIT_RX}
                ry={ORBIT_RY}
                pathLength={1000}
                fill="none"
                stroke="url(#astroCyanGoldGrad)"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeDasharray="160 840"
                strokeDashoffset={160 - normPhase}
                filter="url(#astroSoftGlow)"
              />
              <ellipse
                cx="0"
                cy="0"
                rx={ORBIT_RX}
                ry={ORBIT_RY}
                pathLength={1000}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeDasharray="45 955"
                strokeDashoffset={45 - normPhase}
                filter="url(#astroStarGlow)"
              />
              {/* Pulso secundário oposto */}
              <ellipse
                cx="0"
                cy="0"
                rx={ORBIT_RX}
                ry={ORBIT_RY}
                pathLength={1000}
                fill="none"
                stroke="rgba(125, 211, 252, 0.7)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray="85 915"
                strokeDashoffset={85 - oppositePhase}
                filter="url(#astroSoftGlow)"
              />
            </g>

            {/* 7. Estrela-guia de 4 pontas orbitando o anel principal */}
            <g
              transform={`translate(${starPos.x}, ${starPos.y}) scale(${starScale})`}
              opacity={starOpacity}
              filter="url(#astroStarGlow)"
            >
              <circle cx="0" cy="0" r="10" fill="rgba(253, 230, 138, 0.4)" />
              <path
                d="M 0 -38 Q 1.8 -4 6 0 Q 1.8 4 0 38 Q -1.8 4 -6 0 Q -1.8 -4 0 -38 Z"
                fill="#FFFFFF"
              />
              <path
                d="M -42 0 Q -4 1.8 0 6 Q 4 1.8 42 0 Q 4 -1.8 0 -6 Q -4 -1.8 -42 0 Z"
                fill="#FFFFFF"
              />
              <circle cx="0" cy="0" r="4" fill="#FEF3C7" />
            </g>

            {/* Partícula ciano no polo oposto */}
            <g
              transform={`translate(${secondaryPos.x}, ${secondaryPos.y})`}
              opacity={isBackArc ? 0.85 : 0.4}
              filter="url(#astroSoftGlow)"
            >
              <circle cx="0" cy="0" r="3" fill="#BAE6FD" />
              <path
                d="M 0 -14 L 1.2 0 L 0 14 L -1.2 0 Z M -16 0 L 0 1.2 L 16 0 L 0 -1.2 Z"
                fill="#E0F2FE"
              />
            </g>

            {/* 8. Respiração luminosa sobre o flare estelar da arte original */}
            <g
              transform={`translate(${APEX_FLARE_X}, ${APEX_FLARE_Y}) scale(${apexPulse})`}
              opacity={0.75}
              filter="url(#astroStarGlow)"
            >
              <circle cx="0" cy="0" r="8" fill="rgba(254, 243, 199, 0.55)" />
              <g transform={`rotate(${apexRotation})`}>
                <path
                  d="M 0 -22 L 1.2 0 L 0 22 L -1.2 0 Z M -22 0 L 0 1.2 L 22 0 L 0 -1.2 Z"
                  fill="rgba(255, 255, 255, 0.7)"
                />
              </g>
            </g>
          </svg>
        </div>

        {/* HUD de Progresso Minimalista AstroRelics */}
        <div className="w-full max-w-md -mt-2 sm:-mt-6 px-4 flex flex-col items-center z-10">
          {!errorMessage ? (
            <div className="w-full">
              <div className="flex items-center justify-between text-[11px] sm:text-xs tracking-[0.2em] uppercase text-slate-300/90 mb-2.5 font-display">
                <span className="truncate max-w-[78%] text-left text-sky-100/80">
                  {statusLabel}
                </span>
                <span className="font-semibold text-amber-100 tabular-nums tracking-widest">
                  {String(roundedProgress).padStart(2, '0')}%
                </span>
              </div>

              {/* Barra de progresso ciano -> dourado inspirada no arco orbital */}
              <div
                role="progressbar"
                aria-valuenow={roundedProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="relative w-full h-[3px] rounded-full bg-white/10 overflow-visible"
              >
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-sky-400/50 via-sky-200 to-amber-200 shadow-[0_0_16px_rgba(125,211,252,0.75)] transition-[width] duration-75 ease-linear"
                  style={{ width: `${Math.max(2, visualProgress)}%` }}
                >
                  {/* Estrela luminosa na ponta da barra */}
                  <span
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-amber-100 shadow-[0_0_14px_4px_rgba(253,230,138,0.95)]"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <p className="text-[10px] sm:text-[11px] tracking-[0.16em] uppercase text-slate-400/80 mt-3.5 text-center">
                Sincronizando modelos 3D · Iluminação Solar · Efemérides Orbitais
              </p>
            </div>
          ) : (
            <div
              role="alert"
              className="w-full mt-2 p-5 rounded-2xl bg-[#070B14]/95 border border-red-400/40 text-left backdrop-blur-md shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-display font-semibold text-white">
                    Falha ao carregar recursos 3D
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{errorMessage}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={onRetry}
                  className="min-h-[44px] sm:min-h-0 sm:h-9 px-4 rounded-lg bg-white hover:bg-slate-200 text-black font-display font-semibold text-xs flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar novamente</span>
                </button>

                <button
                  type="button"
                  onClick={onContinueWithFallback}
                  className="min-h-[44px] sm:min-h-0 sm:h-9 px-3.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/25 text-xs text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Usar modelos provisórios
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
