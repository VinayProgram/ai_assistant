import type { AnimationDashboardEntity } from "../animation-module/animation-dashboard.store";

export type AnimationFrameState = {
  activeCharacter: string;
  position: [number, number];
  rotation: number;
  scale: [number, number];
  opacity: number;
  visible: boolean;
};

export type AnimationFileShape = {
  sceneMetadata?: {
    fps?: number;
    width?: number;
    height?: number;
    background?: string;
  };
  frames: Record<string, Record<string, AnimationFrameState>>;
};

export type AudioAsset = {
  fileName: string;
  previewUrl: string;
};

export type LoadedEntityImages = Record<
  string,
  Record<string, HTMLImageElement>
>;

export type ResolvedAnimationCharacter = NonNullable<
  AnimationDashboardEntity["characters"][string]
>;
