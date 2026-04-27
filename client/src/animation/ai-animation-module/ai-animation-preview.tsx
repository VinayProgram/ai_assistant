import * as React from "react";

import { useAnimationDashboardStore } from "../animation-module/animation-dashboard.store";
import {
  useAiAnimationDerived,
  useAiAnimationStore,
} from "./ai-animation.store";
import {
  renderRuleFromFrameState,
  resolveEntityCharacter,
} from "./ai-animation.utils";

export function AiAnimationStage() {
  const entitiesDocument = useAnimationDashboardStore((state) => state.entitiesDocument);
  const { currentFrameId, currentFrame, sceneWidth, sceneHeight, sceneBackground } =
    useAiAnimationDerived();

  return (
    <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      <div
        className="relative"
        style={{
          width: "100%",
          maxWidth: sceneWidth,
          height: sceneHeight,
          minHeight: sceneHeight,
          background: sceneBackground,
        }}
      >
        {Object.entries(currentFrame).map(([entityId, frameState]) => {
          const entity = entitiesDocument.entities[entityId];
          const character = resolveEntityCharacter(entity, frameState.activeCharacter);

          if (!entity || !character) {
            return (
              <div
                key={entityId}
                className="absolute left-4 top-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
              >
                Missing entity or character for <span className="font-mono">{entityId}</span>
              </div>
            );
          }

          const assetUrl = character.metadata.previewUrl || character.metadata.src || "";

          return (
            <div
              key={`${currentFrameId}-${entityId}-${character.id}`}
              style={renderRuleFromFrameState(frameState, assetUrl)}
              aria-label={`${entity.name}-${character.id}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function AiAnimationPlaybackLoop() {
  const isPlaying = useAiAnimationStore((state) => state.isPlaying);
  const { currentFps, sortedFrameIds } = useAiAnimationDerived();
  const advanceFrame = useAiAnimationStore((state) => state.advanceFrame);
  const sortedFrameIdsLength = sortedFrameIds.length;

  React.useEffect(() => {
    if (!isPlaying || sortedFrameIdsLength === 0) {
      return;
    }

    const frameDuration = 1000 / Math.max(currentFps, 1);
    let animationFrameId = 0;
    let lastAdvanceTime = performance.now();

    const tick = (now: number) => {
      if (now - lastAdvanceTime >= frameDuration) {
        advanceFrame(sortedFrameIdsLength);
        lastAdvanceTime = now;
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [ advanceFrame, currentFps, isPlaying, sortedFrameIdsLength]);

  return null;
}

export function AiAnimationSummaryCards() {
  const generatedFrames = useAiAnimationStore((state) => state.generatedFrames);
  const { currentFps } = useAiAnimationDerived();
  const audioAsset = useAiAnimationStore((state) => state.audioAsset);

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
          Prompt Payload
        </p>
        <p className="mt-2 text-sm font-medium text-slate-700">
          Entities sanitized before prompt submission
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
          Frame Source
        </p>
        <p className="mt-2 text-sm font-medium text-slate-700">
          {generatedFrames ? "AI-generated state frames" : "Default animation.json frames"}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
          Playback
        </p>
        <p className="mt-2 text-sm font-medium text-slate-700">
          {currentFps} fps{audioAsset ? ` with audio: ${audioAsset.fileName}` : ""}
        </p>
      </div>
    </div>
  );
}
