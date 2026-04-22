import { create } from "zustand";

import animationEntitiesSeed from "./animationentites.json";

export const ANIMATION_ENTITIES_STORAGE_KEY = "animation-entities-dashboard";

export type AnimationEntityType = "entity" | "environment" | "prop";

export interface AnimationEntityCharacter {
  id: string;
  label: string;
  metadata: {
    src: string;
    fileName: string;
    mimeType: string;
    storageKey: string;
    previewUrl: string;
    size: number;
  };
}

export interface AnimationDashboardEntity {
  id: string;
  name: string;
  type: AnimationEntityType;
  characters: Record<string, AnimationEntityCharacter>;
  defaultCharacter: string;
  createdAt: string;
}

export interface AnimationEntitiesDocument {
  entities: Record<string, AnimationDashboardEntity>;
}

interface SeedAnimationEntitiesDocument {
  entities: Record<
    string,
    {
      characters: Record<
        string,
        {
          metadata: {
            src: string;
          };
        }
      >;
      defaultCharacter: string;
    }
  >;
}

interface CreateEntityInput {
  entityName: string;
  entityType: AnimationEntityType;
  characterLabel: string;
  files: File[];
}

interface AddCharactersInput {
  entityId: string;
  characterLabel: string;
  files: File[];
}

interface AnimationDashboardState {
  entitiesDocument: AnimationEntitiesDocument;
  isUploading: boolean;
  loadEntities: () => void;
  createEntityWithCharacters: (input: CreateEntityInput) => Promise<void>;
  addCharactersToEntity: (input: AddCharactersInput) => Promise<void>;
  removeEntity: (entityId: string) => void;
  clearEntities: () => void;
}

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read file"));
    };

    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeKeyPart(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .replace(/^_+|_+$/g, "");
}

function getInitialDocument(): AnimationEntitiesDocument {
  const seed = animationEntitiesSeed as SeedAnimationEntitiesDocument;

  return {
    entities: Object.fromEntries(
      Object.entries(seed.entities ?? {}).map(([entityId, entity]) => [
        entityId,
        {
          id: entityId,
          name: entityId,
          type: "entity" as const,
          defaultCharacter: entity.defaultCharacter,
          createdAt: new Date(0).toISOString(),
          characters: Object.fromEntries(
            Object.entries(entity.characters ?? {}).map(([characterId, character]) => [
              characterId,
              {
                id: characterId,
                label: characterId,
                metadata: {
                  src: character.metadata.src,
                  fileName: character.metadata.src,
                  mimeType: "image/svg+xml",
                  storageKey: `${ANIMATION_ENTITIES_STORAGE_KEY}:seed:${entityId}:${characterId}`,
                  previewUrl: character.metadata.src,
                  size: 0,
                },
              },
            ])
          ),
        },
      ])
    ),
  };
}

function persistDocument(document: AnimationEntitiesDocument) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ANIMATION_ENTITIES_STORAGE_KEY,
    JSON.stringify(document)
  );
}

async function buildCharacters(
  entityId: string,
  characterLabel: string,
  files: File[]
): Promise<Record<string, AnimationEntityCharacter>> {
  const characters: Record<string, AnimationEntityCharacter> = {};
  const baseLabel = sanitizeKeyPart(characterLabel) || "character";

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const previewUrl = await toDataUrl(file);
    const characterId =
      files.length === 1 ? baseLabel : `${baseLabel}${index + 1}`;
    const storageKey = `${ANIMATION_ENTITIES_STORAGE_KEY}:asset:${entityId}:${characterId}`;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, previewUrl);
    }

    characters[characterId] = {
      id: characterId,
      label: files.length === 1 ? characterLabel : `${characterLabel} ${index + 1}`,
      metadata: {
        src: file.name,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        storageKey,
        previewUrl,
        size: file.size,
      },
    };
  }

  return characters;
}

function removeEntityAssets(entity: AnimationDashboardEntity) {
  if (typeof window === "undefined") {
    return;
  }

  for (const character of Object.values(entity.characters)) {
    window.localStorage.removeItem(character.metadata.storageKey);
  }
}

export const useAnimationDashboardStore = create<AnimationDashboardState>((set, get) => ({
  entitiesDocument: getInitialDocument(),
  isUploading: false,
  loadEntities: () => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(ANIMATION_ENTITIES_STORAGE_KEY);
    if (!raw) {
      set({ entitiesDocument: getInitialDocument() });
      return;
    }

    try {
      const parsed = JSON.parse(raw) as AnimationEntitiesDocument;
      set({ entitiesDocument: parsed });
    } catch {
      set({ entitiesDocument: getInitialDocument() });
    }
  },
  createEntityWithCharacters: async ({
    entityName,
    entityType,
    characterLabel,
    files,
  }) => {
    if (typeof window === "undefined" || files.length === 0) {
      return;
    }

    set({ isUploading: true });

    try {
      const entityId = sanitizeKeyPart(entityName) || makeId("entity");
      const characters = await buildCharacters(entityId, characterLabel, files);
      const defaultCharacter = Object.keys(characters)[0] ?? "";
      const nextDocument: AnimationEntitiesDocument = {
        entities: {
          ...get().entitiesDocument.entities,
          [entityId]: {
            id: entityId,
            name: entityName,
            type: entityType,
            characters,
            defaultCharacter,
            createdAt: new Date().toISOString(),
          },
        },
      };

      persistDocument(nextDocument);
      set({ entitiesDocument: nextDocument, isUploading: false });
    } catch (error) {
      console.error("Failed to create animation entity", error);
      set({ isUploading: false });
    }
  },
  addCharactersToEntity: async ({ entityId, characterLabel, files }) => {
    if (typeof window === "undefined" || files.length === 0) {
      return;
    }

    const existingEntity = get().entitiesDocument.entities[entityId];
    if (!existingEntity) {
      return;
    }

    set({ isUploading: true });

    try {
      const nextCharacters = await buildCharacters(entityId, characterLabel, files);
      const nextDocument: AnimationEntitiesDocument = {
        entities: {
          ...get().entitiesDocument.entities,
          [entityId]: {
            ...existingEntity,
            characters: {
              ...existingEntity.characters,
              ...nextCharacters,
            },
            defaultCharacter:
              existingEntity.defaultCharacter || Object.keys(nextCharacters)[0] || "",
          },
        },
      };

      persistDocument(nextDocument);
      set({ entitiesDocument: nextDocument, isUploading: false });
    } catch (error) {
      console.error("Failed to add characters to entity", error);
      set({ isUploading: false });
    }
  },
  removeEntity: (entityId) => {
    if (typeof window === "undefined") {
      return;
    }

    const currentEntity = get().entitiesDocument.entities[entityId];
    if (!currentEntity) {
      return;
    }

    removeEntityAssets(currentEntity);

    const nextEntities = { ...get().entitiesDocument.entities };
    delete nextEntities[entityId];

    const nextDocument = { entities: nextEntities };
    persistDocument(nextDocument);
    set({ entitiesDocument: nextDocument });
  },
  clearEntities: () => {
    if (typeof window === "undefined") {
      return;
    }

    for (const entity of Object.values(get().entitiesDocument.entities)) {
      removeEntityAssets(entity);
    }

    window.localStorage.removeItem(ANIMATION_ENTITIES_STORAGE_KEY);
    set({ entitiesDocument: { entities: {} } });
  },
}));
