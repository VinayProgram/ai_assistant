import * as React from "react";
import { Music4, Pause, Play, Sparkles, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

import animationDocument from "./animation.json";
import {
  promptAnimation,
  type PromptAnimationImageReference,
  type PromptAnimationResponse,
} from "./ai-request-animation-file";
import {
  useAnimationDashboardStore,
  type AnimationDashboardEntity,
  type AnimationEntitiesDocument,
} from "../animation-module/animation-dashboard.store";

type AnimationFrameState = {
  activeCharacter: string;
  position: [number, number];
  rotation: number;
  scale: [number, number];
  opacity: number;
  visible: boolean;
};

type AnimationFileShape = {
  sceneMetadata?: {
    fps?: number;
    width?: number;
    height?: number;
    background?: string;
  };
  frames: Record<string, Record<string, AnimationFrameState>>;
};

const typedAnimationDocument = animationDocument as unknown as AnimationFileShape;

const shellClassName =
  "mx-auto mt-8 max-w-7xl rounded-[32px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_32px_120px_-48px_rgba(15,23,42,0.45)] backdrop-blur";

function getSortedFrameIds(document: AnimationFileShape) {
  return Object.keys(document.frames)
    .map((frameId) => Number(frameId))
    .sort((first, second) => first - second)
    .map(String);
}

function resolveEntityCharacter(
  entity: AnimationDashboardEntity | undefined,
  activeCharacterId: string
) {
  if (!entity) {
    return undefined;
  }

  return (
    entity.characters[activeCharacterId] ??
    entity.characters[entity.defaultCharacter] ??
    Object.values(entity.characters)[0]
  );
}

function renderRuleFromFrameState(
  frameState: AnimationFrameState,
  assetUrl: string
): React.CSSProperties {
  const [x, y] = frameState.position;
  const [scaleX, scaleY] = frameState.scale;

  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 140,
    height: 140,
    objectFit: "contain",
    opacity: frameState.opacity,
    display: frameState.visible ? "block" : "none",
    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${frameState.rotation}deg) scale(${scaleX}, ${scaleY})`,
    transformOrigin: "center center",
    pointerEvents: "none",
    userSelect: "none",
    backgroundImage: assetUrl ? `url("${assetUrl}")` : undefined,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "contain",
     transition: "transform 300ms ease, opacity 300ms ease",
  };
}

function sanitizeEntitiesForPrompt(document: AnimationEntitiesDocument) {
  return {
    entities: Object.fromEntries(
      Object.entries(document.entities).map(([entityId, entity]) => [
        entityId,
        {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          defaultCharacter: entity.defaultCharacter,
          createdAt: entity.createdAt,
          characters: Object.fromEntries(
            Object.entries(entity.characters).map(([characterId, character]) => [
              characterId,
              {
                id: character.id,
                label: character.label,
                metadata: {
                  src: character.metadata.src,
                  fileName: character.metadata.fileName,
                  mimeType: character.metadata.mimeType,
                  size: character.metadata.size,
                },
              },
            ])
          ),
        },
      ])
    ),
  };
}

function collectPromptImageReferences(document: AnimationEntitiesDocument) {
  const references: PromptAnimationImageReference[] = []

  for (const [entityId, entity] of Object.entries(document.entities)) {
    for (const [characterId, character] of Object.entries(entity.characters)) {
      if (!character.metadata.previewUrl?.startsWith("data:image/")) {
        continue
      }

      references.push({
        entityId,
        characterId,
        previewUrl: character.metadata.previewUrl,
      })
    }
  }

  return references
}

const AiAnimationGenModule = () => {
  const entitiesDocument = useAnimationDashboardStore((state) => state.entitiesDocument);
  const audioInputRef = React.useRef<HTMLInputElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [storyPrompt, setStoryPrompt] = React.useState(
    "Lead hero waves at lead hero2, then lead hero2 smiles back."
  );
  const [generatedFrames, setGeneratedFrames] = React.useState<
    PromptAnimationResponse["frames"] | null
  >(null);
  const [generationError, setGenerationError] = React.useState("");
  const [currentFrameIndex, setCurrentFrameIndex] = React.useState(0);
  const [fpsInput, setFpsInput] = React.useState(
    String(typedAnimationDocument.sceneMetadata?.fps ?? 2)
  );
  const [fpsOverride, setFpsOverride] = React.useState<number | null>(null);
  const [audioAsset, setAudioAsset] = React.useState<{
    fileName: string;
    previewUrl: string;
  } | null>(null);

  const activeAnimationDocument = React.useMemo<AnimationFileShape>(
    () => ({
      ...typedAnimationDocument,
      sceneMetadata: {
        ...typedAnimationDocument.sceneMetadata,
        fps: fpsOverride ?? typedAnimationDocument.sceneMetadata?.fps ?? 2,
      },
      frames: generatedFrames ?? typedAnimationDocument.frames,
    }),
    [fpsOverride, generatedFrames]
  );

  const sortedFrameIds = React.useMemo(
    () => getSortedFrameIds(activeAnimationDocument),
    [activeAnimationDocument]
  );

  React.useEffect(() => {
    setCurrentFrameIndex(0);
  }, [generatedFrames]);

  React.useEffect(() => {
    if (!isPlaying || sortedFrameIds.length === 0) {
      return;
    }

    const fps = activeAnimationDocument.sceneMetadata?.fps ?? 2;
    const frameDuration = 1000 / Math.max(fps, 1);
    let animationFrameId = 0;
    let lastAdvanceTime = performance.now();

    const tick = (now: number) => {
      if (now - lastAdvanceTime >= frameDuration) {
        setCurrentFrameIndex((previousIndex) =>
          (previousIndex + 1) % sortedFrameIds.length
        );
        lastAdvanceTime = now;
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [activeAnimationDocument, isPlaying, sortedFrameIds.length]);

  React.useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }

    if (isPlaying) {
      void audioElement.play().catch(() => {
        // Ignore autoplay rejections and let the user start audio manually.
      });
      return;
    }

    audioElement.pause();
  }, [isPlaying, audioAsset]);

  const handleGenerateAnimation = async () => {
    setGenerationError("");
    setIsGenerating(true);

    try {
      const sanitizedEntities = sanitizeEntitiesForPrompt(entitiesDocument);
      const imageReferences = collectPromptImageReferences(entitiesDocument)
      const response = await promptAnimation(
        JSON.stringify(sanitizedEntities),
        storyPrompt,
        imageReferences
      );

      setGeneratedFrames(response.frames);
      setIsPlaying(true);
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "Failed to generate animation"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyFrameRate = () => {
    const nextFps = Number(fpsInput);
    if (!Number.isFinite(nextFps) || nextFps <= 0) {
      setGenerationError("Frame rate must be a number greater than 0.");
      return;
    }

    setGenerationError("");
    setFpsOverride(nextFps);
  };

  const handleAudioSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (audioAsset?.previewUrl) {
      URL.revokeObjectURL(audioAsset.previewUrl);
    }

    setAudioAsset({
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
    });
    event.target.value = "";
  };

  React.useEffect(() => {
    return () => {
      if (audioAsset?.previewUrl) {
        URL.revokeObjectURL(audioAsset.previewUrl);
      }
    };
  }, [audioAsset]);

  const currentFrameId = sortedFrameIds[currentFrameIndex] ?? sortedFrameIds[0];
  const currentFrame = activeAnimationDocument.frames[currentFrameId] ?? {};
  const sceneWidth = activeAnimationDocument.sceneMetadata?.width ?? 900;
  const sceneHeight = activeAnimationDocument.sceneMetadata?.height ?? 420;
  const sceneBackground =
    activeAnimationDocument.sceneMetadata?.background ??
    "linear-gradient(180deg, #f8fbff 0%, #eef6ff 60%, #fff8eb 100%)";
  const currentFps = activeAnimationDocument.sceneMetadata?.fps ?? 2;

  return (
    <section className={shellClassName}>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            AI Animation Preview
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Write a story, generate frames, and run the animation
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Before sending the prompt, the entity payload is sanitized to remove
            `previewUrl`. The response frames are saved in component state and used
            immediately by the animation preview loop.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Current Frame
            </p>
            <p className="mt-1 font-mono text-sm text-slate-700">{currentFrameId}</p>
          </div>
          <Button onClick={() => setIsPlaying((current) => !current)}>
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            {isPlaying ? "Pause" : "Play"}
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-sky-100 p-2 text-sky-700">
            <WandSparkles className="size-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-950">Story Prompt</p>
            <p className="text-sm text-slate-500">
              Describe the motion and expression changes you want, then generate frames.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,220px)_auto_minmax(0,1fr)]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Frame Rate
            </p>
            <input
              type="number"
              min="1"
              step="1"
              value={fpsInput}
              onChange={(event) => setFpsInput(event.target.value)}
              className="mt-2 flex h-10 w-full rounded-xl border border-input bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="self-end">
            <Button variant="outline" onClick={handleApplyFrameRate}>
              Update Framerate
            </Button>
          </div>
          <div className="flex flex-col justify-end gap-3 sm:flex-row sm:items-end sm:justify-end">
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioSelection}
              className="hidden"
            />
            <Button variant="outline" onClick={() => audioInputRef.current?.click()}>
              <Music4 className="size-4" />
              Add Audio
            </Button>
            {audioAsset ? (
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="truncate text-sm font-medium text-slate-700">
                  {audioAsset.fileName}
                </p>
                <audio ref={audioRef} src={audioAsset.previewUrl} controls className="mt-2 h-10" />
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto]">
          <textarea
            value={storyPrompt}
            onChange={(event) => setStoryPrompt(event.target.value)}
            placeholder="Lead hero walks in, waves, then lead hero2 becomes happy and waves back."
            className="min-h-28 w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={handleGenerateAnimation}
              disabled={isGenerating || !storyPrompt.trim()}
            >
              <Sparkles className="size-4" />
              {isGenerating ? "Generating..." : "Generate Animation"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setGeneratedFrames(null)}
              disabled={!generatedFrames}
            >
              Use Default Frames
            </Button>
          </div>
        </div>

        {generationError ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {generationError}
          </div>
        ) : null}
      </div>

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

            const assetUrl =
              character.metadata.previewUrl || character.metadata.src || "";

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
    </section>
  );
};

export default AiAnimationGenModule;
