import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { SUN_SCENE_CONFIG } from '../../config/celestialBodies';
import { ViewportTier } from '../../types/experience';

interface SpaceLightingProps {
  viewportTier?: ViewportTier;
}

const SUN_CORONA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SUN_CORONA_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;

  void main() {
    vec2 centered = vUv - 0.5;
    float dist = length(centered) * 2.0;

    // Núcleo solar intenso + corona suave exponencial
    float core = smoothstep(0.18, 0.0, dist);
    float innerHalo = exp(-dist * 4.5) * 0.68;
    float outerHalo = exp(-dist * 2.1) * 0.24;

    // Raios ópticos extremamente discretos
    float angle = atan(centered.y, centered.x);
    float rays = pow(abs(cos(angle * 4.0 + uTime * 0.05)), 14.0) * exp(-dist * 3.2) * 0.14;

    float alpha = clamp(core + innerHalo + outerHalo + rays, 0.0, 1.0);
    // Suaviza completamente na borda do plano para nunca marcar quadrado
    alpha *= smoothstep(1.0, 0.45, dist);

    vec3 coreColor = vec3(1.0, 0.99, 0.95);
    vec3 coronaColor = vec3(0.96, 0.86, 0.68);
    vec3 outerColor = vec3(0.35, 0.62, 0.92);

    vec3 finalColor = mix(outerColor, coronaColor, smoothstep(0.75, 0.2, dist));
    finalColor = mix(finalColor, coreColor, smoothstep(0.22, 0.0, dist));

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const SpaceLighting: React.FC<SpaceLightingProps> = ({
  viewportTier = 'desktop',
}) => {
  const { viewport } = useThree();
  const coronaMeshRef = useRef<THREE.Mesh>(null);
  const sunGroupRef = useRef<THREE.Group>(null);
  const shadowMapRes = viewportTier === 'mobile' ? 1024 : 2048;

  const coronaUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  // Ajusta horizontalmente a posição visual do Sol em telas mais estreitas para mantê-lo visível no céu
  const responsiveSunPos = useMemo<[number, number, number]>(() => {
    const aspect = viewport.aspect;
    const base = SUN_SCENE_CONFIG.visualPosition;
    if (aspect < 0.75) {
      return [6.8, 9.2, base[2]];
    }
    if (aspect < 1.15) {
      return [11.5, 8.4, base[2]];
    }
    return base;
  }, [viewport.aspect]);

  useFrame(({ clock, camera }) => {
    coronaUniforms.uTime.value = clock.getElapsedTime();
    if (coronaMeshRef.current) {
      coronaMeshRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group name="space-lighting">
      {/* Luz ambiente e hemisférica sutis para preservar detalhes discretos no lado noturno sem perder o contraste */}
      <ambientLight intensity={0.11} color="#0F1C36" />
      <hemisphereLight args={['#1E3A5F', '#03060E', 0.2]} />

      {/* Luz direcional principal coerente com a posição aparente do Sol, projetando sombras reais de alta definição */}
      <directionalLight
        position={SUN_SCENE_CONFIG.keyLightPosition}
        intensity={2.95}
        color="#FFF9EE"
        castShadow
        shadow-mapSize={[shadowMapRes, shadowMapRes]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.015}
        shadow-camera-near={1}
        shadow-camera-far={32}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={4.5}
        shadow-camera-bottom={-4.5}
      />

      {/* Luz de recorte vinda da coordenada 3D profunda do Sol para acentuar o limbo solar */}
      <directionalLight
        position={responsiveSunPos}
        intensity={0.48}
        color="#BAE6FD"
      />

      {/* Representação visual do Sol distante como referência astronômica */}
      <group ref={sunGroupRef} position={responsiveSunPos}>
        <mesh raycast={() => null}>
          <sphereGeometry args={[0.42, 32, 32]} />
          <meshBasicMaterial color="#FFFDF8" />
        </mesh>

        <mesh ref={coronaMeshRef} raycast={() => null}>
          <planeGeometry args={[9.5, 9.5]} />
          <shaderMaterial
            vertexShader={SUN_CORONA_VERT}
            fragmentShader={SUN_CORONA_FRAG}
            uniforms={coronaUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  );
};
