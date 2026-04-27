import { useState } from 'react';
import {
  Wand2,
  Image as ImageIcon,
  BookOpen,
  Sparkles,
  Download,
  Share2,
  History
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { generateVisualPrompt, type CharacterPrompts } from './ai-image-generation-api';
const AiImageModule = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompts, setPrompts] = useState<CharacterPrompts>({});

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const d = await generateVisualPrompt({ storyText: prompt });
      console.log(d);
      if (d) setPrompts(d);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Input & Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Story Studio</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Transform your narrative into visual art using AI.
            </p>
          </div>

          {Object.entries(prompts).map(([name, prompt]) => (
            <div key={name}>
              <h3>{name}</h3>
              <p>{prompt}</p>
              {/* Pass prompt to your Nano Banana 2 generation function here */}
            </div>
          ))}
          <Card className="border-slate-200 dark:border-zinc-800 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Story Prompt
                </label>
                <Textarea
                  placeholder="Once upon a time, in a neon-drenched cyberpunk city..."
                  className="min-h-[200px] resize-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus:ring-indigo-500"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Style Preset</label>
                <div className="flex flex-wrap gap-2">
                  {['Cinematic', 'Oil Painting', 'Digital Art', 'Anime', '3D Render'].map((style) => (
                    <Badge
                      key={style}
                      variant="outline"
                      className="cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors"
                    >
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!prompt || isGenerating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Visualizing Story...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4" /> Generate Magic
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent History Mini-list */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-500">
              <History className="w-4 h-4" /> Recent Drafts
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square rounded-md bg-slate-200 dark:bg-zinc-800 animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Preview Area */}
        <div className="lg:col-span-8">
          <Tabs defaultValue="preview" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-slate-200/50 dark:bg-zinc-900">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="variations">Variations</TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="rounded-full">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="preview" className="mt-0">
              <Card className="overflow-hidden border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[500px] flex flex-col items-center justify-center relative border-dashed border-2">
                {isGenerating ? (
                  <div className="text-center space-y-4">
                    <div className="relative mx-auto w-24 h-24">
                      <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900 rounded-full" />
                      <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                    </div>
                    <p className="text-indigo-600 font-medium animate-pulse">Consulting the imagination...</p>
                  </div>
                ) : (
                  <div className="text-center p-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <div className="max-w-xs mx-auto">
                      <p className="text-lg font-medium">No image generated yet</p>
                      <p className="text-sm text-slate-500">Write a story prompt on the left and click generate to see the results here.</p>
                    </div>
                  </div>
                )}

                {/* Overlay for generated image would go here */}
                {/* <img src="..." className="absolute inset-0 w-full h-full object-cover" /> */}
              </Card>
            </TabsContent>

            <TabsContent value="variations">
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 4, 5].map((item) => (
                  <div key={item} className="aspect-video bg-slate-100 dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </div>
  );
};

export default AiImageModule;
