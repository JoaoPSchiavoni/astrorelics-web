import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { CELESTIAL_BODIES, CELESTIAL_BODY_ORDER } from '../config/celestialBodies';
import { SPACE_ARTIFACTS, SPACE_ARTIFACT_ORDER } from '../config/spaceArtifacts';
import { CelestialBodyConfig, CelestialBodyId, SpaceArtifactId } from '../types/experience';

export interface LoadedCelestialAsset {
  id: CelestialBodyId;
  source: 'glb' | 'provisional-sphere';
  resolvedPath: string | null;
  /** Cena Three.js normalizada para raio unitário (R = 1.0) centrada na origem (0,0,0) */
  normalizedGroup: THREE.Group | null;
}

export interface PreloadProgressState {
  progress: number; // 0 a 100
  currentLabel: string;
  assets: Partial<Record<CelestialBodyId, LoadedCelestialAsset>>;
}

const assetCache: Partial<Record<CelestialBodyId, LoadedCelestialAsset>> = {};

/**
 * Loader GLTF compartilhado. Os modelos em `3d_models/` são otimizados com texturas WebP
 * (EXT_texture_webp) e geometria comprimida (EXT_meshopt_compression), então o decoder
 * Meshopt precisa estar registrado antes de qualquer carregamento.
 */
let sharedLoader: GLTFLoader | null = null;
function getLoader(): GLTFLoader {
  if (!sharedLoader) {
    sharedLoader = new GLTFLoader();
    sharedLoader.setMeshoptDecoder(MeshoptDecoder);
  }
  return sharedLoader;
}

/**
 * Indica se devemos priorizar assets leves (smartphones, telas pequenas ou pouca memória).
 * Nesses casos usamos as variantes `.mobile.glb` (texturas ≤ 2048px) e anisotropia menor.
 */
export function prefersLightAssets(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const isCoarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  return (
    window.innerWidth < 768 ||
    (isCoarse && shortSide < 600) ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 4)
  );
}

function isSaveDataEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return Boolean(nav.connection?.saveData);
}

/** Anisotropia menor em dispositivos leves: o filtro 8x custa banda de memória em GPUs móveis */
function getMaxAnisotropy(): number {
  return prefersLightAssets() ? 4 : 8;
}

/**
 * Verifica qual caminho de arquivo GLB/GLTF está disponível localmente para o corpo celeste.
 */
async function resolveAvailableModelPath(config: CelestialBodyConfig): Promise<string | null> {
  const preferred =
    prefersLightAssets() && config.mobileModelPath ? [config.mobileModelPath] : [];
  const uniquePaths = Array.from(
    new Set([...preferred, config.modelPath, ...config.candidatePaths])
  );

  for (const candidate of uniquePaths) {
    try {
      const response = await fetch(candidate, { method: 'HEAD' });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        // Evita falso positivo caso o servidor SPA retorne index.html para uma rota inexistente
        if (!contentType.includes('text/html')) {
          return candidate;
        }
      }
    } catch {
      // Continua tentando o próximo caminho candidato
    }
  }

  return null;
}

/**
 * Normaliza qualquer cena GLTF/GLB para que fique perfeitamente centralizada em (0, 0, 0)
 * com raio exatamente igual a 1.0 unidade, além de calibrar os materiais PBR para iluminação espacial.
 */
function buildNormalizedModelGroup(gltf: GLTF, config: CelestialBodyConfig): THREE.Group {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDimension = Math.max(size.x, size.y, size.z);
  const currentRadius = maxDimension > 0.0001 ? maxDimension * 0.5 : 1.0;
  const normalizeScale = 1.0 / currentRadius;

  // Aplica calibração de material para evitar brilho plástico e garantir transição dia/noite natural
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = false;
      mesh.receiveShadow = true;

      // Garante normais suaves caso a geometria precise
      if (mesh.geometry && !mesh.geometry.attributes.normal) {
        mesh.geometry.computeVertexNormals();
      }

      const tuneMaterial = (mat: THREE.Material): THREE.Material => {
        const cloned = mat.clone();
        if (cloned instanceof THREE.MeshStandardMaterial || cloned instanceof THREE.MeshPhysicalMaterial) {
          cloned.roughness = config.materialTuning.roughness;
          cloned.metalness = config.materialTuning.metalness;
          if (cloned instanceof THREE.MeshPhysicalMaterial) {
            cloned.clearcoat = 0;
          }
          if (cloned.normalMap) {
            cloned.normalScale.set(
              config.materialTuning.normalScale,
              config.materialTuning.normalScale
            );
          }
          if (cloned.map) {
            cloned.map.colorSpace = THREE.SRGBColorSpace;
            cloned.map.anisotropy = getMaxAnisotropy();
          }
          cloned.needsUpdate = true;
        }
        return cloned;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(tuneMaterial);
      } else if (mesh.material) {
        mesh.material = tuneMaterial(mesh.material);
      }
    }
  });

  // Centraliza geometricamente na origem e normaliza o raio para 1.0
  root.position.set(
    -center.x * normalizeScale,
    -center.y * normalizeScale,
    -center.z * normalizeScale
  );
  root.scale.setScalar(normalizeScale);

  const wrapper = new THREE.Group();
  wrapper.name = `normalized-${config.id}`;
  wrapper.add(root);
  return wrapper;
}

/**
 * Pré-carrega todos os modelos 3D configurados antes de liberar a navegação e as viagens,
 * reportando o progresso detalhado para a tela de carregamento.
 */
export async function preloadAllCelestialModels(
  onProgress: (state: PreloadProgressState) => void,
  forceReload = false
): Promise<Record<CelestialBodyId, LoadedCelestialAsset>> {
  if (!forceReload && CELESTIAL_BODY_ORDER.every((id) => Boolean(assetCache[id]))) {
    const cachedResult = assetCache as Record<CelestialBodyId, LoadedCelestialAsset>;
    onProgress({
      progress: 100,
      currentLabel: 'Modelos espaciais prontos',
      assets: cachedResult,
    });
    return cachedResult;
  }

  const loader = getLoader();
  const totalBodies = CELESTIAL_BODY_ORDER.length;
  const perBodyProgress: Record<CelestialBodyId, number> = {
    earth: 0,
    moon: 0,
    mars: 0,
  };

  const emitOverallProgress = (label: string) => {
    const sum =
      perBodyProgress.earth + perBodyProgress.moon + perBodyProgress.mars;
    const avg = Math.min(99, Math.round(sum / totalBodies));
    onProgress({
      progress: avg,
      currentLabel: label,
      assets: { ...assetCache },
    });
  };

  emitOverallProgress('Verificando modelos 3D dos corpos celestes...');

  // Os três corpos são baixados em paralelo (antes era sequencial, somando as latências)
  const loadBody = async (id: CelestialBodyId): Promise<void> => {
    const config = CELESTIAL_BODIES[id];
    const resolvedPath = await resolveAvailableModelPath(config);

    if (!resolvedPath) {
      // Arquivo GLB ainda não presente: usa esfera provisória organizada para substituição posterior
      assetCache[id] = {
        id,
        source: 'provisional-sphere',
        resolvedPath: null,
        normalizedGroup: null,
      };
      perBodyProgress[id] = 100;
      emitOverallProgress(`${config.name}: esfera provisória configurada`);
      return;
    }

    const gltf = await new Promise<GLTF>((resolve, reject) => {
      loader.load(
        resolvedPath,
        (loaded) => resolve(loaded),
        (event) => {
          if (event.lengthComputable && event.total > 0) {
            perBodyProgress[id] = Math.min(98, Math.round((event.loaded / event.total) * 100));
            emitOverallProgress(`Carregando modelo 3D: ${config.name} (${perBodyProgress[id]}%)`);
          } else {
            perBodyProgress[id] = Math.min(90, perBodyProgress[id] + 15);
            emitOverallProgress(`Carregando modelo 3D: ${config.name}...`);
          }
        },
        (err) => {
          reject(
            new Error(
              `Falha ao carregar o modelo 3D de ${config.name} em "${resolvedPath}": ${
                err instanceof Error ? err.message : 'arquivo inválido ou inacessível'
              }`
            )
          );
        }
      );
    });

    const normalizedGroup = buildNormalizedModelGroup(gltf, config);
    assetCache[id] = {
      id,
      source: 'glb',
      resolvedPath,
      normalizedGroup,
    };
    perBodyProgress[id] = 100;
    emitOverallProgress(`${config.name} carregado`);
  };

  await Promise.all(CELESTIAL_BODY_ORDER.map((id) => loadBody(id)));

  const finalAssets = assetCache as Record<CelestialBodyId, LoadedCelestialAsset>;
  onProgress({
    progress: 100,
    currentLabel: 'Telemetria visual pronta',
    assets: finalAssets,
  });

  // Inicia aquecimento em segundo plano dos 5 modelos 3D de artefatos após liberar a cena principal
  setTimeout(() => {
    void preloadAllSpaceArtifacts();
  }, 1800);

  return finalAssets;
}

const artifactCache: Partial<Record<SpaceArtifactId, THREE.Group>> = {};
const artifactInFlight: Partial<Record<SpaceArtifactId, Promise<THREE.Group>>> = {};

/**
 * Normaliza um modelo GLB de artefato espacial para raio unitário (R = 1.0) centrado na origem (0,0,0),
 * preservando integralmente as propriedades PBR originais (metalness, roughness, texturas e cores) de cada peça.
 */
function buildNormalizedArtifactGroup(gltf: GLTF, id: SpaceArtifactId): THREE.Group {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDimension = Math.max(size.x, size.y, size.z);
  const currentRadius = maxDimension > 0.0001 ? maxDimension * 0.5 : 1.0;
  const normalizeScale = 1.0 / currentRadius;

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mesh.geometry && !mesh.geometry.attributes.normal) {
        mesh.geometry.computeVertexNormals();
      }

      const tuneArtifactMaterial = (mat: THREE.Material): THREE.Material => {
        const cloned = mat.clone();
        if (
          cloned instanceof THREE.MeshStandardMaterial ||
          cloned instanceof THREE.MeshPhysicalMaterial
        ) {
          if (cloned.map) {
            cloned.map.colorSpace = THREE.SRGBColorSpace;
            cloned.map.anisotropy = getMaxAnisotropy();
          }
          if (cloned.normalMap) {
            cloned.normalMap.anisotropy = getMaxAnisotropy();
          }
          if (cloned.roughnessMap) {
            cloned.roughnessMap.anisotropy = getMaxAnisotropy();
          }
          if (cloned.metalnessMap) {
            cloned.metalnessMap.anisotropy = getMaxAnisotropy();
          }
          cloned.needsUpdate = true;
        }
        return cloned;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(tuneArtifactMaterial);
      } else if (mesh.material) {
        mesh.material = tuneArtifactMaterial(mesh.material);
      }
    }
  });

  root.position.set(
    -center.x * normalizeScale,
    -center.y * normalizeScale,
    -center.z * normalizeScale
  );
  root.scale.setScalar(normalizeScale);

  const wrapper = new THREE.Group();
  wrapper.name = `normalized-artifact-${id}`;
  wrapper.add(root);
  return wrapper;
}

/**
 * Carrega (ou retorna do cache) o modelo 3D normalizado de um artefato espacial específico.
 */
export async function loadSpaceArtifactModel(id: SpaceArtifactId): Promise<THREE.Group> {
  if (artifactCache[id]) {
    return artifactCache[id]!;
  }
  if (artifactInFlight[id]) {
    return artifactInFlight[id]!;
  }

  const config = SPACE_ARTIFACTS[id];
  const loader = getLoader();

  const promise = new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      config.modelPath,
      (gltf) => {
        const group = buildNormalizedArtifactGroup(gltf, id);
        artifactCache[id] = group;
        delete artifactInFlight[id];
        resolve(group);
      },
      undefined,
      (err) => {
        delete artifactInFlight[id];
        reject(err);
      }
    );
  });

  artifactInFlight[id] = promise;
  return promise;
}

/**
 * Indica se o modelo do artefato já está em cache (pronto para exibição imediata).
 */
export function isSpaceArtifactCached(id: SpaceArtifactId): boolean {
  return Boolean(artifactCache[id]);
}

/** Aguarda um momento ocioso do navegador (fallback para setTimeout no Safari). */
function waitForIdle(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(() => resolve(), { timeout: timeoutMs });
    } else {
      setTimeout(resolve, Math.min(timeoutMs, 300));
    }
  });
}

/**
 * Pré-carrega silenciosamente em segundo plano os modelos 3D dos 5 artefatos para que
 * a transição em velocidade da luz exiba o objeto 3D imediatamente ao chegar.
 *
 * - Com "Economia de dados" ativa, nada é baixado antecipadamente (os modelos carregam sob demanda).
 * - Cada download espera um momento ocioso do navegador, para não disputar o thread principal
 *   com a renderização da cena (o parse do GLB e a decodificação das texturas custam CPU).
 */
export async function preloadAllSpaceArtifacts(): Promise<void> {
  if (isSaveDataEnabled()) return;
  const light = prefersLightAssets();

  for (const id of SPACE_ARTIFACT_ORDER) {
    try {
      await waitForIdle(light ? 2000 : 1000);
      await loadSpaceArtifactModel(id);
      if (light) {
        // Pausa curta entre downloads no mobile para preservar fluidez de 60fps na cena 3D ativa
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch {
      // Silencioso no pré-carregamento em background
    }
  }
}
