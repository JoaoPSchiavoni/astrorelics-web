import * as THREE from 'three';

/**
 * Espaço (em px CSS) ocupado pela interface 2D sobre o canvas em cada borda.
 * Usado para deslocar o centro óptico da câmera (`setViewOffset`) e manter o corpo celeste
 * ou artefato selecionado centralizado na área realmente visível — e não atrás do header
 * ou do bottom sheet — em smartphones.
 */
export interface UiInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type UiInsetSide = keyof UiInsets;

export const ZERO_INSETS: UiInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** FOV padrão do projeto (desktop e telas largas). */
export const DESKTOP_FOV = 42;

/**
 * FOV vertical base adaptado à proporção da tela. Em retrato estreito (ex.: 320–430px) o campo
 * horizontal fica muito fechado com 42°, cortando os astros laterais e os pins à deriva; abrimos
 * gradualmente até 48°. Em telas com proporção ≥ 0.75 (tablets, desktop, paisagem) mantém 42°.
 */
export function getBaseFov(aspect: number): number {
  if (aspect >= 0.75) return DESKTOP_FOV;
  const t = THREE.MathUtils.clamp((0.75 - aspect) / (0.75 - 0.46), 0, 1);
  return DESKTOP_FOV + t * 6;
}

/**
 * Converte as áreas ocupadas pela UI no deslocamento (px) do centro de projeção.
 * Valores positivos em Y empurram a imagem para cima (o centro visual sobe).
 * O deslocamento é limitado a 30% da dimensão para evitar enquadramentos extremos.
 */
export function computeViewOffset(
  insets: UiInsets,
  width: number,
  height: number
): { x: number; y: number } {
  const x = THREE.MathUtils.clamp((insets.right - insets.left) / 2, -width * 0.3, width * 0.3);
  const y = THREE.MathUtils.clamp((insets.bottom - insets.top) / 2, -height * 0.3, height * 0.3);
  return { x, y };
}
