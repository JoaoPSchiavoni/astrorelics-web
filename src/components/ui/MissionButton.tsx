import React from 'react';
import { Compass, Award, ChevronLeft, Radio } from 'lucide-react';
import { useLanguage } from '../../utils/i18n';
import { ArtifactCartoonIcon } from './ArtifactCartoonIcons';

interface MissionButtonProps {
  isOpen: boolean;
  echoesReconstructedCount: number;
  unlockedCount: number;
  totalEndings: number;
  hasActiveRun: boolean;
  onToggle: () => void;
  isLandscapeMobile?: boolean;
}

export const MissionButton: React.FC<MissionButtonProps> = ({
  isOpen,
  echoesReconstructedCount,
  unlockedCount,
  totalEndings,
  hasActiveRun,
  onToggle,
  isLandscapeMobile = false,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  // Em telas mobile (< 768px) ou landscape mobile, o botão de Missões já fica integrado no HeaderHud
  // para não obstruir a manipulação 3D no centro da tela.
  if (isLandscapeMobile) {
    return null;
  }

  return (
    <div className="hidden md:block fixed right-5 top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isEn ? 'Open Interactive Missions panel' : 'Abrir painel de Missões Interativas'}
        title={
          isEn
            ? 'Interactive Missions — Echoes of Space & Opportunity Rover'
            : 'Missões Interativas — Ecos do Espaço & Rover Opportunity'
        }
        className={`group relative flex items-center gap-2.5 pl-2.5 pr-3.5 py-2.5 rounded-2xl backdrop-blur-xl border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          isOpen
            ? 'bg-[#13284C]/95 border-amber-400 text-white shadow-[0_0_30px_rgba(245,158,11,0.4)] scale-[1.02]'
            : 'bg-[#061226]/90 hover:bg-[#0B1E3D]/95 border-amber-400/50 hover:border-amber-400 text-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.75),0_0_22px_rgba(245,158,11,0.2)] hover:scale-[1.03]'
        }`}
      >
        {/* Indicador luminoso pulsante */}
        <span className="absolute -top-1 -left-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-white/60" />
        </span>

        {/* Ícone do Opportunity / Missão */}
        <div className="w-10 h-10 rounded-xl bg-[#040B18] border border-amber-400/40 p-1 shrink-0 group-hover:scale-105 transition-transform shadow-inner">
          <ArtifactCartoonIcon id="opportunity_rover" className="w-full h-full" />
        </div>

        {/* Texto e Progresso */}
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-display font-bold text-sm tracking-wide text-white">
              {isEn ? 'Missions' : 'Missões'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-sky-500/15 border border-sky-400/35 text-[10px] font-mono font-semibold text-sky-300">
              <Radio className="w-2.5 h-2.5 text-sky-400" />
              {echoesReconstructedCount}/3 {isEn ? 'Echoes' : 'Ecos'}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-400/30 text-[10px] font-mono font-semibold text-amber-300">
              <Award className="w-2.5 h-2.5 text-amber-400" />
              {unlockedCount}/{totalEndings}
            </span>
            {hasActiveRun && (
              <span className="text-[10px] text-sky-300 font-medium">
                · {isEn ? 'Active' : 'Ativa'}
              </span>
            )}
          </div>
        </div>

        <ChevronLeft
          className={`w-4 h-4 text-amber-300 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : 'group-hover:-translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
};
