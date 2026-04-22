import * as React from "react";
import { Boxes, ImagePlus, Layers2, Plus, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  type AnimationDashboardEntity,
  type AnimationEntityCharacter,
  type AnimationEntityType,
  useAnimationDashboardStore,
} from "./animation-dashboard.store";

const shellClassName =
  "min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.15),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.18),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#eef6ff_42%,#fffaf1_100%)] px-6 py-8";

const panelClassName =
  "mx-auto max-w-7xl rounded-[32px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_32px_120px_-48px_rgba(15,23,42,0.45)] backdrop-blur";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function CharacterAssetCard({ character }: { character: AnimationEntityCharacter }) {
  const isImage = character.metadata.mimeType.startsWith("image/");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
        {isImage ? (
          <img
            src={character.metadata.previewUrl}
            alt={character.label}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="text-center text-slate-500">
            <ImagePlus className="mx-auto size-7" />
            <p className="mt-2 text-xs uppercase tracking-[0.18em]">
              {character.metadata.mimeType}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{character.id}</p>
          <p className="text-xs text-slate-500">
            {character.metadata.fileName} {character.metadata.size > 0 ? `• ${formatBytes(character.metadata.size)}` : ""}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            LocalStorage Path
          </p>
          <p className="mt-1 break-all font-mono text-xs text-slate-700">
            {character.metadata.storageKey}
          </p>
        </div>
      </div>
    </div>
  );
}

function EntityCard({
  entity,
  onAddCharacters,
  onRemove,
  isUploading,
}: {
  entity: AnimationDashboardEntity;
  onAddCharacters: (
    entityId: string,
    characterLabel: string,
    files: File[]
  ) => Promise<void>;
  onRemove: (entityId: string) => void;
  isUploading: boolean;
}) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [characterLabel, setCharacterLabel] = React.useState("character");

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    await onAddCharacters(entity.id, characterLabel, files);
    event.target.value = "";
  };

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            {entity.type}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{entity.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Entity key: <span className="font-mono">{entity.id}</span>
          </p>
        </div>
        <Button variant="outline" onClick={() => onRemove(entity.id)}>
          <Trash2 className="size-4" />
          Remove Entity
        </Button>
      </div>

      <div className="mt-4 grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 lg:grid-cols-[1.2fr_1fr_auto]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Default Character
          </p>
          <p className="mt-2 font-mono text-sm text-slate-700">{entity.defaultCharacter}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Add Another Character Set
          </p>
          <Input
            value={characterLabel}
            onChange={(event) => setCharacterLabel(event.target.value)}
            placeholder="character"
            className="mt-2 bg-white"
          />
        </div>
        <div className="self-end">
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.svg"
            onChange={handleFiles}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Plus className="size-4" />
            Add SVGs / Images
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.values(entity.characters).map((character) => (
          <CharacterAssetCard key={character.id} character={character} />
        ))}
      </div>
    </article>
  );
}

const AnimationDashboard = () => {
  const createInputRef = React.useRef<HTMLInputElement | null>(null);
  const [entityName, setEntityName] = React.useState("");
  const [entityType, setEntityType] = React.useState<AnimationEntityType>("entity");
  const [characterLabel, setCharacterLabel] = React.useState("character");

  const entitiesDocument = useAnimationDashboardStore((state) => state.entitiesDocument);
  const isUploading = useAnimationDashboardStore((state) => state.isUploading);
  const loadEntities = useAnimationDashboardStore((state) => state.loadEntities);
  const createEntityWithCharacters = useAnimationDashboardStore(
    (state) => state.createEntityWithCharacters
  );
  const addCharactersToEntity = useAnimationDashboardStore(
    (state) => state.addCharactersToEntity
  );
  const removeEntity = useAnimationDashboardStore((state) => state.removeEntity);
  const clearEntities = useAnimationDashboardStore((state) => state.clearEntities);

  React.useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const entities = React.useMemo(
    () => Object.values(entitiesDocument.entities),
    [entitiesDocument]
  );

  const handleCreateEntity = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0 || !entityName.trim()) {
      event.target.value = "";
      return;
    }

    await createEntityWithCharacters({
      entityName,
      entityType,
      characterLabel,
      files,
    });

    setEntityName("");
    setCharacterLabel("character");
    event.target.value = "";
  };

  return (
    <section className={shellClassName}>
      <div className={panelClassName}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Animation Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Create entities and attach multiple character SVG or image variants
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Build a structure like your `animationentites.json`: create an entity,
              set its type like `entity` or `environment`, add a first character,
              then keep adding more variants to the same entity.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={clearEntities} disabled={entities.length === 0}>
              <Trash2 className="size-4" />
              Clear All Entities
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Entities
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{entities.length}</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Types
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              `entity`, `environment`, `prop`
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Storage Root
            </p>
            <p className="mt-2 break-all font-mono text-xs text-slate-700">
              animation-entities-dashboard
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_80px_-48px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-100 p-2 text-sky-700">
              <Boxes className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-950">Create Entity</p>
              <p className="text-sm text-slate-500">
                Add an entity, choose the type, then upload the first SVG or image set.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Entity Name
              </p>
              <Input
                value={entityName}
                onChange={(event) => setEntityName(event.target.value)}
                placeholder="leadHero"
                className="mt-2"
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Entity Type
              </p>
              <select
                value={entityType}
                onChange={(event) =>
                  setEntityType(event.target.value as AnimationEntityType)
                }
                className="mt-2 flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="entity">entity</option>
                <option value="environment">environment</option>
                <option value="prop">prop</option>
              </select>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                First Character Label
              </p>
              <Input
                value={characterLabel}
                onChange={(event) => setCharacterLabel(event.target.value)}
                placeholder="character1"
                className="mt-2"
              />
            </div>
            <div className="self-end">
              <Input
                ref={createInputRef}
                type="file"
                multiple
                accept="image/*,.svg"
                onChange={handleCreateEntity}
                className="hidden"
              />
              <Button
                size="lg"
                onClick={() => createInputRef.current?.click()}
                disabled={isUploading || !entityName.trim()}
              >
                {isUploading ? <Upload className="size-4" /> : <Layers2 className="size-4" />}
                {isUploading ? "Saving..." : "Create + Upload"}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {entities.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 text-center">
              <Boxes className="size-10 text-slate-400" />
              <p className="mt-4 text-lg font-semibold text-slate-900">
                No entities created yet
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Create an entity like `leadHero`, set its type, and upload one or
                more SVG/image files as character variants.
              </p>
            </div>
          ) : (
            entities.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                onAddCharacters={(entityId, nextCharacterLabel, files) =>
                  addCharactersToEntity({
                    entityId,
                    characterLabel: nextCharacterLabel,
                    files,
                  })
                }
                onRemove={removeEntity}
                isUploading={isUploading}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default AnimationDashboard;
