export type CelestialBodyId = 'earth' | 'moon' | 'mars';

export type SpaceArtifactId =
  | 'j002e3_s_ivb'
  | 'apollo_lrrr'
  | 'apollo_snoopy_lm'
  | 'opportunity_rover'
  | 'ingenuity_helicopter';

export type ExperienceState = 'loading' | 'exploring' | 'traveling' | 'error';

export type TravelPhase = 'idle' | 'acceleration' | 'cruise' | 'arrival';

export type ViewportTier = 'desktop' | 'tablet' | 'mobile';

export type OrbitalSlot = 'center' | 'left' | 'right';

export type SlotAssignmentMap = Record<CelestialBodyId, OrbitalSlot>;

export interface AtmosphereConfig {
  enabled: boolean;
  color: string;
  secondaryColor: string;
  intensity: number;
  fresnelPower: number;
  scale: number;
}

export interface MaterialTuningConfig {
  roughness: number;
  metalness: number;
  normalScale: number;
}

export interface BackgroundSlotMap {
  desktop: [number, number, number];
  tablet: [number, number, number];
  mobile: [number, number, number];
}

export interface CelestialBodyTelemetry {
  classification: string;
  meanRadius: string;
  gravity: string;
  orbitalContext: string;
  futureMissionsPreview: string;
}

export interface CelestialBodyConfig {
  id: CelestialBodyId;
  name: string;
  subtitle: string;
  description: string;
  /** Caminho principal do modelo 3D (GLB/GLTF) */
  modelPath: string;
  /**
   * Variante leve do modelo (texturas ≤ 2048px) usada em smartphones e dispositivos de baixo
   * desempenho para reduzir download, memória de GPU e travamentos no upload das texturas.
   */
  mobileModelPath?: string;
  /** Caminhos alternativos verificados automaticamente para facilitar substituição */
  candidatePaths: string[];
  /** Raio normalizado em unidades de cena quando o corpo está selecionado em primeiro plano */
  foregroundRadius: number;
  /** Posição em primeiro plano para cada tipo de tela */
  foregroundPosition: BackgroundSlotMap;
  /** Raio normalizado em unidades de cena quando o corpo está ao fundo */
  backgroundRadius: number;
  /**
   * Posição 3D deste corpo quando OUTRO corpo está selecionado em primeiro plano.
   * As posições são calibradas para evitar sobreposição entre os planetas e os painéis da interface.
   */
  backgroundWhenSelectedIs: Partial<Record<CelestialBodyId, BackgroundSlotMap>>;
  /** Orientação inicial [pitch, yaw, roll] em radianos ao selecionar ou restaurar */
  initialRotation: [number, number, number];
  /** Inclinação axial em radianos */
  axialTilt: number;
  /** Velocidade de rotação sideral sutil quando em repouso */
  idleRotationSpeed: number;
  /** Configuração da camada atmosférica (Terra e Marte possuem; Lua não possui) */
  atmosphere: AtmosphereConfig;
  /** Ajustes de material PBR para evitar aparência plástica e preservar contraste com o Sol */
  materialTuning: MaterialTuningConfig;
  /** Dados contextuais e preparação estrutural para futuras missões e equipamentos */
  telemetry: CelestialBodyTelemetry;
}

export interface SpaceArtifactSpec {
  label: string;
  value: string;
}

export interface SpaceArtifactConfig {
  id: SpaceArtifactId;
  name: string;
  shortName: string;
  mission: string;
  year: string;
  statusBadge: string;
  locationLabel: string;
  coordinatesLabel: string;
  /** 'body-surface' fixa o Pin no próprio astro (Lua/Marte); 'deep-space' deixa o Pin à deriva no espaço */
  placementType: 'body-surface' | 'deep-space';
  /** Corpo celeste onde o objeto está pousado ou ao qual está historicamente associado */
  relatedBodyId: CelestialBodyId;
  /** Coordenadas esféricas locais [latGraus, lonGraus] na malha do planeta para fixar o Pin 3D */
  surfaceLatLon?: [number, number];
  /** Posição 3D base quando o Pin está à deriva no espaço entre Terra, Lua e Marte */
  deepSpacePosition?: BackgroundSlotMap;
  /** Caminho do modelo 3D (.glb) fiel ao objeto real */
  modelPath: string;
  /** Escala (raio normalizado) quando o objeto está em foco para inspeção 3D */
  inspectRadius: number;
  /** Orientação inicial [pitch, yaw, roll] em radianos para destacar os melhores detalhes do modelo */
  initialRotation: [number, number, number];
  /** Velocidade de rotação automática suave durante a inspeção */
  idleRotationSpeed: number;
  /** Cor temática de destaque na interface e no Pin */
  accentColor: string;
  /** Descrição técnica e física do equipamento */
  description: string;
  /** História completa da missão e como foi deixado para trás */
  history: string;
  /** Importância científica e legado para a exploração espacial */
  importance: string;
  /** Especificações rápidas da ficha técnica */
  specs: SpaceArtifactSpec[];
}
