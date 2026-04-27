import type {
  AnimationDashboardEntity,
  AnimationEntitiesDocument,
} from "../animation-module/animation-dashboard.store";
import type { PromptAnimationImageReference } from "./ai-request-animation-file-api";
import type {
  AnimationFileShape,
  AnimationFrameState,
  LoadedEntityImages,
  ResolvedAnimationCharacter,
} from "./ai-animation.types";

export function getSortedFrameIds(document: AnimationFileShape) {
  return Object.keys(document.frames)
    .map((frameId) => Number(frameId))
    .sort((first, second) => first - second)
    .map(String);
}

export function resolveEntityCharacter(
  entity: AnimationDashboardEntity | undefined,
  activeCharacterId: string
): ResolvedAnimationCharacter | undefined {
  if (!entity) {
    return undefined;
  }

  return (
    entity.characters[activeCharacterId] ??
    entity.characters[entity.defaultCharacter] ??
    Object.values(entity.characters)[0]
  );
}

export function renderRuleFromFrameState(
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

export function sanitizeEntitiesForPrompt(document: AnimationEntitiesDocument) {
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

export function collectPromptImageReferences(document: AnimationEntitiesDocument) {
  const references: PromptAnimationImageReference[] = [];

  for (const [entityId, entity] of Object.entries(document.entities)) {
    for (const [characterId, character] of Object.entries(entity.characters)) {
      if (!character.metadata.previewUrl?.startsWith("data:image/")) {
        continue;
      }

      references.push({
        entityId,
        characterId,
        previewUrl: character.metadata.previewUrl,
      });
    }
  }

  return references;
}

export function loadImage(assetUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load asset: ${assetUrl}`));
    image.src = assetUrl;
  });
}

export async function buildEntityImageLookup(document: AnimationEntitiesDocument) {
  const assetsByEntityId = await Promise.all(
    Object.entries(document.entities).map(async ([entityId, entity]) => {
      const entries = await Promise.all(
        Object.entries(entity.characters).map(async ([characterId, character]) => {
          const assetUrl = character.metadata.previewUrl || character.metadata.src || "";
          const image = await loadImage(assetUrl);
          return [characterId, image] as const;
        })
      );

      return [entityId, Object.fromEntries(entries)] as const;
    })
  );

  return Object.fromEntries(assetsByEntityId) as LoadedEntityImages;
}

export function fillSceneBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  sceneBackground: string
) {
  const backgroundFill = sceneBackground.trim();

  if (backgroundFill.startsWith("linear-gradient")) {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#f8fbff");
    gradient.addColorStop(0.6, "#eef6ff");
    gradient.addColorStop(1, "#fff8eb");
    context.fillStyle = gradient;
  } else {
    context.fillStyle = backgroundFill || "#ffffff";
  }

  context.fillRect(0, 0, width, height);
}

export function drawAnimationFrameToCanvas({
  context,
  canvasWidth,
  canvasHeight,
  frame,
  entitiesDocument,
  imageLookup,
  sceneBackground,
}: {
  context: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  frame: Record<string, AnimationFrameState>;
  entitiesDocument: AnimationEntitiesDocument;
  imageLookup: LoadedEntityImages;
  sceneBackground: string;
}) {
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  fillSceneBackground(context, canvasWidth, canvasHeight, sceneBackground);

  for (const [entityId, frameState] of Object.entries(frame)) {
    if (!frameState.visible || frameState.opacity <= 0) {
      continue;
    }

    const entity = entitiesDocument.entities[entityId];
    const character = resolveEntityCharacter(entity, frameState.activeCharacter);
    const image = imageLookup[entityId]?.[character?.id ?? ""];

    if (!entity || !character || !image) {
      continue;
    }

    const [x, y] = frameState.position;
    const [scaleX, scaleY] = frameState.scale;
    const width = 140;
    const height = 140;

    context.save();
    context.globalAlpha = frameState.opacity;
    context.translate(canvasWidth / 2 + x, canvasHeight / 2 + y);
    context.rotate((frameState.rotation * Math.PI) / 180);
    context.scale(scaleX, scaleY);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    context.restore();
  }
}
