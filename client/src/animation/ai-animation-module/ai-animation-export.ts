import type { AnimationEntitiesDocument } from "../animation-module/animation-dashboard.store";
import type { AnimationFileShape } from "./ai-animation.types";
import {
  buildEntityImageLookup,
  drawAnimationFrameToCanvas,
  getSortedFrameIds,
} from "./ai-animation.utils";

function triggerDownload(blob: Blob, fileName: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}

export function downloadAnimationJson({
  animationDocument,
  currentFps,
  fileName,
}: {
  animationDocument: AnimationFileShape;
  currentFps: number;
  fileName: string;
}) {
  const exportDocument = {
    sceneMetadata: {
      ...animationDocument.sceneMetadata,
      fps: currentFps,
    },
    frames: animationDocument.frames,
  };

  const blob = new Blob([JSON.stringify(exportDocument, null, 2)], {
    type: "application/json",
  });

  triggerDownload(blob, fileName);
}

export async function downloadAnimationVideo({
  animationDocument,
  entitiesDocument,
  currentFps,
  sceneWidth,
  sceneHeight,
  sceneBackground,
  fileName,
}: {
  animationDocument: AnimationFileShape;
  entitiesDocument: AnimationEntitiesDocument;
  currentFps: number;
  sceneWidth: number;
  sceneHeight: number;
  sceneBackground: string;
  fileName: string;
}) {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("Video export is not supported in this browser.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = sceneWidth;
  canvas.height = sceneHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create canvas context for video export.");
  }

  const stream = canvas.captureStream(Math.max(currentFps, 1));
  const recordedChunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm",
  });

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  const recorderStopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  const imageLookup = await buildEntityImageLookup(entitiesDocument);
  const frameIds = getSortedFrameIds(animationDocument);
  const frameDuration = 1000 / Math.max(currentFps, 1);

  recorder.start();

  for (const frameId of frameIds) {
    drawAnimationFrameToCanvas({
      context,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      frame: animationDocument.frames[frameId] ?? {},
      entitiesDocument,
      imageLookup,
      sceneBackground,
    });

    await new Promise((resolve) => window.setTimeout(resolve, frameDuration));
  }

  recorder.stop();
  await recorderStopped;

  const videoBlob = new Blob(recordedChunks, { type: "video/webm" });
  triggerDownload(videoBlob, fileName);
}
