import * as React from "react";
import {
  Download,
  Film,
  Music4,
  Pause,
  Play,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { useAnimationDashboardStore } from "../animation-module/animation-dashboard.store";
import { promptAnimation } from "./ai-request-animation-file-api";
import {
  useAiAnimationDerived,
  useAiAnimationStore,
} from "./ai-animation.store";
import { downloadAnimationJson, downloadAnimationVideo } from "./ai-animation-export";
import {
  collectPromptImageReferences,
  sanitizeEntitiesForPrompt,
} from "./ai-animation.utils";

export function AiAnimationHeader() {
  const {
    currentFrameId,
    sortedFrameIds,
    currentFps,
    activeAnimationDocument,
    sceneWidth,
    sceneHeight,
    sceneBackground,
  } = useAiAnimationDerived();
  const isPlaying = useAiAnimationStore((state) => state.isPlaying);
  const togglePlaying = useAiAnimationStore((state) => state.togglePlaying);
  const isExportingVideo = useAiAnimationStore((state) => state.isExportingVideo);
  const setIsExportingVideo = useAiAnimationStore((state) => state.setIsExportingVideo);
  const setGenerationError = useAiAnimationStore((state) => state.setGenerationError);
  const generatedFrames = useAiAnimationStore((state) => state.generatedFrames);
  const entitiesDocument = useAnimationDashboardStore((state) => state.entitiesDocument);
  const sortedFrameIdsLength = sortedFrameIds.length;

  const handleDownloadAnimation = React.useCallback(() => {
    downloadAnimationJson({
      animationDocument: activeAnimationDocument,
      currentFps,
      fileName: generatedFrames ? "generated-animation.json" : "animation-preview.json",
    });
  }, [activeAnimationDocument, currentFps, generatedFrames]);

  const handleDownloadVideo = React.useCallback(async () => {
    try {
      setGenerationError("");
      setIsExportingVideo(true);
      await downloadAnimationVideo({
        animationDocument: activeAnimationDocument,
        entitiesDocument,
        currentFps,
        sceneWidth,
        sceneHeight,
        sceneBackground,
        fileName: generatedFrames ? "generated-animation.webm" : "animation-preview.webm",
      });
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "Failed to export animation video"
      );
    } finally {
      setIsExportingVideo(false);
    }
  }, [
    activeAnimationDocument,
    currentFps,
    entitiesDocument,
    generatedFrames,
    sceneBackground,
    sceneHeight,
    sceneWidth,
    setGenerationError,
    setIsExportingVideo,
  ]);

  return (
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
        <Button variant="outline" onClick={handleDownloadAnimation}>
          <Download className="size-4" />
          Download
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadVideo}
          disabled={isExportingVideo || sortedFrameIdsLength === 0}
        >
          <Film className="size-4" />
          {isExportingVideo ? "Exporting..." : "Download Video"}
        </Button>
        <Button onClick={togglePlaying}>
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          {isPlaying ? "Pause" : "Play"}
        </Button>
      </div>
    </div>
  );
}

export function AiAnimationPromptPanel() {
  const entitiesDocument = useAnimationDashboardStore((state) => state.entitiesDocument);
  const audioInputRef = React.useRef<HTMLInputElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const storyPrompt = useAiAnimationStore((state) => state.storyPrompt);
  const setStoryPrompt = useAiAnimationStore((state) => state.setStoryPrompt);
  const isGenerating = useAiAnimationStore((state) => state.isGenerating);
  const setIsGenerating = useAiAnimationStore((state) => state.setIsGenerating);
  const generatedFrames = useAiAnimationStore((state) => state.generatedFrames);
  const setGeneratedFrames = useAiAnimationStore((state) => state.setGeneratedFrames);
  const clearGeneratedFrames = useAiAnimationStore((state) => state.clearGeneratedFrames);
  const generationError = useAiAnimationStore((state) => state.generationError);
  const setGenerationError = useAiAnimationStore((state) => state.setGenerationError);
  const fpsInput = useAiAnimationStore((state) => state.fpsInput);
  const setFpsInput = useAiAnimationStore((state) => state.setFpsInput);
  const applyFpsOverride = useAiAnimationStore((state) => state.applyFpsOverride);
  const setIsPlaying = useAiAnimationStore((state) => state.setIsPlaying);
  const audioAsset = useAiAnimationStore((state) => state.audioAsset);
  const setAudioAsset = useAiAnimationStore((state) => state.setAudioAsset);
  const isPlaying = useAiAnimationStore((state) => state.isPlaying);

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
  }, [audioAsset, isPlaying]);

  React.useEffect(() => {
    return () => {
      if (audioAsset?.previewUrl) {
        URL.revokeObjectURL(audioAsset.previewUrl);
      }
    };
  }, [audioAsset]);

  const handleGenerateAnimation = React.useCallback(async () => {
    setGenerationError("");
    setIsGenerating(true);

    try {
      const sanitizedEntities = sanitizeEntitiesForPrompt(entitiesDocument);
      const imageReferences = collectPromptImageReferences(entitiesDocument);
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
  }, [
    entitiesDocument,
    setGeneratedFrames,
    setGenerationError,
    setIsGenerating,
    setIsPlaying,
    storyPrompt,
  ]);

  const handleApplyFrameRate = React.useCallback(() => {
    const nextFps = Number(fpsInput);
    if (!Number.isFinite(nextFps) || nextFps <= 0) {
      setGenerationError("Frame rate must be a number greater than 0.");
      return;
    }

    setGenerationError("");
    applyFpsOverride(nextFps);
  }, [applyFpsOverride, fpsInput, setGenerationError]);

  const handleAudioSelection = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [audioAsset, setAudioAsset]
  );

  return (
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
            onClick={clearGeneratedFrames}
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
  );
}
