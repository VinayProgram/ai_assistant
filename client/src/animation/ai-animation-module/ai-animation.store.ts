import * as React from "react";
import { create } from "zustand";

import animationDocument from "./animation.json";
import type { AudioAsset, AnimationFileShape } from "./ai-animation.types";
import { getSortedFrameIds } from "./ai-animation.utils";

type AnimationPreviewStore = {
  storyPrompt: string;
  isPlaying: boolean;
  isGenerating: boolean;
  isExportingVideo: boolean;
  generationError: string;
  currentFrameIndex: number;
  fpsInput: string;
  fpsOverride: number | null;
  generatedFrames: AnimationFileShape["frames"] | null;
  audioAsset: AudioAsset | null;
  setStoryPrompt: (value: string) => void;
  setIsPlaying: (value: boolean) => void;
  togglePlaying: () => void;
  setIsGenerating: (value: boolean) => void;
  setIsExportingVideo: (value: boolean) => void;
  setGenerationError: (value: string) => void;
  setCurrentFrameIndex: (value: number) => void;
  advanceFrame: (frameCount: number) => void;
  resetFrameIndex: () => void;
  setFpsInput: (value: string) => void;
  applyFpsOverride: (value: number) => void;
  setGeneratedFrames: (frames: AnimationFileShape["frames"] | null) => void;
  clearGeneratedFrames: () => void;
  setAudioAsset: (asset: AudioAsset | null) => void;
};

const typedAnimationDocument = animationDocument as unknown as AnimationFileShape;

export const defaultStoryPrompt =
  "Lead hero waves at lead hero2, then lead hero2 smiles back.";

export const useAiAnimationStore = create<AnimationPreviewStore>((set) => ({
  storyPrompt: defaultStoryPrompt,
  isPlaying: true,
  isGenerating: false,
  isExportingVideo: false,
  generationError: "",
  currentFrameIndex: 0,
  fpsInput: String(typedAnimationDocument.sceneMetadata?.fps ?? 2),
  fpsOverride: null,
  generatedFrames: null,
  audioAsset: null,
  setStoryPrompt: (value) => set({ storyPrompt: value }),
  setIsPlaying: (value) => set({ isPlaying: value }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setIsGenerating: (value) => set({ isGenerating: value }),
  setIsExportingVideo: (value) => set({ isExportingVideo: value }),
  setGenerationError: (value) => set({ generationError: value }),
  setCurrentFrameIndex: (value) => set({ currentFrameIndex: value }),
  advanceFrame: (frameCount) =>
    set((state) => ({
      currentFrameIndex: frameCount > 0 ? (state.currentFrameIndex + 1) % frameCount : 0,
    })),
  resetFrameIndex: () => set({ currentFrameIndex: 0 }),
  setFpsInput: (value) => set({ fpsInput: value }),
  applyFpsOverride: (value) => set({ fpsOverride: value }),
  setGeneratedFrames: (frames) => set({ generatedFrames: frames, currentFrameIndex: 0 }),
  clearGeneratedFrames: () => set({ generatedFrames: null, currentFrameIndex: 0 }),
  setAudioAsset: (asset) => set({ audioAsset: asset }),
}));

export function getActiveAnimationDocument(
  fpsOverride: number | null,
  generatedFrames: AnimationFileShape["frames"] | null
): AnimationFileShape {
  return {
    ...typedAnimationDocument,
    sceneMetadata: {
      ...typedAnimationDocument.sceneMetadata,
      fps: fpsOverride ?? typedAnimationDocument.sceneMetadata?.fps ?? 2,
    },
    frames: generatedFrames ?? typedAnimationDocument.frames,
  };
}

export function getActiveAnimationSelectors(state: AnimationPreviewStore) {
  const activeAnimationDocument = getActiveAnimationDocument(
    state.fpsOverride,
    state.generatedFrames
  );
  const sortedFrameIds = getSortedFrameIds(activeAnimationDocument);
  const currentFrameId = sortedFrameIds[state.currentFrameIndex] ?? sortedFrameIds[0] ?? "1";
  const currentFrame = activeAnimationDocument.frames[currentFrameId] ?? {};
  const sceneWidth = activeAnimationDocument.sceneMetadata?.width ?? 900;
  const sceneHeight = activeAnimationDocument.sceneMetadata?.height ?? 420;
  const sceneBackground =
    activeAnimationDocument.sceneMetadata?.background ??
    "linear-gradient(180deg, #f8fbff 0%, #eef6ff 60%, #fff8eb 100%)";
  const currentFps = activeAnimationDocument.sceneMetadata?.fps ?? 2;

  return {
    activeAnimationDocument,
    sortedFrameIds,
    currentFrameId,
    currentFrame,
    sceneWidth,
    sceneHeight,
    sceneBackground,
    currentFps,
  };
}

export function useAiAnimationDerived() {
  const fpsOverride = useAiAnimationStore((state) => state.fpsOverride);
  const generatedFrames = useAiAnimationStore((state) => state.generatedFrames);
  const currentFrameIndex = useAiAnimationStore((state) => state.currentFrameIndex);

  return React.useMemo(() => {
    const activeAnimationDocument = getActiveAnimationDocument(
      fpsOverride,
      generatedFrames
    );
    const sortedFrameIds = getSortedFrameIds(activeAnimationDocument);
    const currentFrameId = sortedFrameIds[currentFrameIndex] ?? sortedFrameIds[0] ?? "1";
    const currentFrame = activeAnimationDocument.frames[currentFrameId] ?? {};
    const sceneWidth = activeAnimationDocument.sceneMetadata?.width ?? 900;
    const sceneHeight = activeAnimationDocument.sceneMetadata?.height ?? 420;
    const sceneBackground =
      activeAnimationDocument.sceneMetadata?.background ??
      "linear-gradient(180deg, #f8fbff 0%, #eef6ff 60%, #fff8eb 100%)";
    const currentFps = activeAnimationDocument.sceneMetadata?.fps ?? 2;

    return {
      activeAnimationDocument,
      sortedFrameIds,
      currentFrameId,
      currentFrame,
      sceneWidth,
      sceneHeight,
      sceneBackground,
      currentFps,
    };
  }, [currentFrameIndex, fpsOverride, generatedFrames]);
}
