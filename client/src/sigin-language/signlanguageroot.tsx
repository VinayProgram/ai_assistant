import { useEffect, useMemo, useState } from 'react'
import jsdata from '../../public/WLASL/info.json'
import {
  fetchVideoTranscript,
  generateSignLanguagePrompt,
  type SignLanguagePromptResponse,
} from './gemini-api'

type SignInstance = {
  video_id: string
}

type SignEntry = {
  gloss: string
  instances: SignInstance[]
}

type PlaybackItem = {
  id: string
  label: string
  src: string
}

const dataset = jsdata as SignEntry[]
const SPEED_STEPS = [300, 550, 850, 1200]
const DEFAULT_VIDEO_LINK = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const DEFAULT_USER_PROMPT = 'Explain this video transcript in simple sign-language-friendly words'

const sanitizeWords = (value: string) =>
  value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)

const glossaryMap = new Map(
  dataset.map((item) => [item.gloss.toLowerCase(), item]),
)

const buildPlaybackItems = (value: string) => {
  const words = sanitizeWords(value)
  const matched: PlaybackItem[] = []
  const missing: string[] = []

  words.forEach((word, index) => {
    const entry = glossaryMap.get(word)

    if (!entry || !entry.instances.length) {
      if (!missing.includes(word)) {
        missing.push(word)
      }
      return
    }

    matched.push({
      id: `${entry.gloss}-${index}-${entry.instances[0].video_id}`,
      label: entry.gloss,
      src: `WLASL/frames/${entry.gloss}/${entry.instances[0].video_id}.png`,
    })
  })

  return { matched, missing, totalWords: words.length }
}

const buildPlaybackItemsFromGlossary = (glossary: string[]) => {
  const combinedGlossary = glossary.join(' ')
  return buildPlaybackItems(combinedGlossary)
}

const getSpeedLabel = (speed: number) => {
  if (speed <= 350) return 'Fast'
  if (speed <= 700) return 'Balanced'
  if (speed <= 1000) return 'Smooth'
  return 'Slow'
}

const isYouTubeLink = (value: string) =>
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(value.trim())

const getYouTubeEmbedUrl = (value: string) => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  try {
    const normalizedValue = trimmedValue.startsWith('http')
      ? trimmedValue
      : `https://${trimmedValue}`
    const url = new URL(normalizedValue)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const videoId = url.pathname.split('/').filter(Boolean)[0]
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        const videoId = url.searchParams.get('v')
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null
      }

      if (url.pathname.startsWith('/embed/')) {
        const videoId = url.pathname.split('/').filter(Boolean)[1]
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null
      }

      if (url.pathname.startsWith('/shorts/')) {
        const videoId = url.pathname.split('/').filter(Boolean)[1]
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null
      }
    }
  } catch {
    return null
  }

  return null
}

const SignLanguageRoot = () => {
  const [videoLink, setVideoLink] = useState(DEFAULT_VIDEO_LINK)
  const [userPrompt, setUserPrompt] = useState(DEFAULT_USER_PROMPT)
  const [submittedVideoLink, setSubmittedVideoLink] = useState(DEFAULT_VIDEO_LINK)
  const [aiResult, setAiResult] = useState<SignLanguagePromptResponse | null>(null)
  const [transcript, setTranscript] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [frameSpeed, setFrameSpeed] = useState(550)
  const [activeFrame, setActiveFrame] = useState(0)
  const [showVideoPreview, setShowVideoPreview] = useState(false)

  const playbackSource = useMemo(() => {
    if (aiResult?.glossary?.length) {
      return buildPlaybackItemsFromGlossary(aiResult.glossary)
    }

    return buildPlaybackItems('')
  }, [aiResult])

  const { matched, missing, totalWords } = playbackSource
  const previewEmbedUrl = useMemo(
    () => getYouTubeEmbedUrl(submittedVideoLink || videoLink),
    [submittedVideoLink, videoLink],
  )

  useEffect(() => {
    setActiveFrame(0)
  }, [aiResult, submittedVideoLink])

  useEffect(() => {
    if (!matched.length) {
      return
    }

    const timer = window.setInterval(() => {
      setActiveFrame((current) => (current + 1) % matched.length)
    }, frameSpeed)

    return () => window.clearInterval(timer)
  }, [matched, frameSpeed])

  const currentFrame = matched[activeFrame]

  const nextSpeed = () => {
    const currentIndex = SPEED_STEPS.indexOf(frameSpeed)
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % SPEED_STEPS.length
    setFrameSpeed(SPEED_STEPS[nextIndex])
  }

  const handleConvertVideo = async () => {
    const trimmedVideoLink = videoLink.trim()

    if (!trimmedVideoLink) {
      setGenerationError('Paste a YouTube video link first.')
      return
    }

    if (!isYouTubeLink(trimmedVideoLink)) {
      setGenerationError('Paste a valid YouTube link to generate sign-language playback.')
      return
    }

    setGenerationError('')
    setAiResult(null)
    setTranscript('')
    setIsGenerating(true)

    try {
      const transcriptResponse = await fetchVideoTranscript(trimmedVideoLink)
      const geminiResponse = await generateSignLanguagePrompt(
        transcriptResponse.transcript,
        userPrompt.trim(),
      )

      setSubmittedVideoLink(trimmedVideoLink)
      setTranscript(transcriptResponse.transcript)
      setAiResult(geminiResponse)
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Failed to convert video')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed_0%,_#ffe4c7_32%,_#f3f4f6_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/75 p-6 shadow-[0_30px_80px_rgba(180,83,9,0.12)] backdrop-blur xl:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-900">
                YouTube To Sign Language
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Convert a video transcript into sign-language playback
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Paste a YouTube link, fetch the transcript through FastAPI, send the transcript to Gemini, and preview the matched WLASL signs as a playback board.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[360px]">
              <div className="rounded-3xl bg-slate-950 px-4 py-3 text-white">
                <div className="text-xs uppercase tracking-[0.24em] text-white/60">Matched</div>
                <div className="mt-2 text-3xl font-semibold">{matched.length}</div>
              </div>
              <div className="rounded-3xl bg-white px-4 py-3 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Missing</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{missing.length}</div>
              </div>
              <div className="rounded-3xl bg-white px-4 py-3 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Speed</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{getSpeedLabel(frameSpeed)}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="rounded-[32px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr_auto] lg:items-end">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">YouTube video link</label>
                  <input
                    type="url"
                    value={videoLink}
                    onChange={(event) => setVideoLink(event.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="h-12 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-inner outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Instruction for Gemini</label>
                  <input
                    type="text"
                    value={userPrompt}
                    onChange={(event) => setUserPrompt(event.target.value)}
                    placeholder="Explain the transcript in simple sign-language-friendly words"
                    className="h-12 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-inner outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleConvertVideo}
                  disabled={isGenerating || !videoLink.trim()}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? 'Converting...' : 'Fetch Transcript'}
                </button>
              </div>

              {generationError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {generationError}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-slate-700">Playback speed</label>
                    <span className="text-sm text-slate-500">{frameSpeed} ms per sign</span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={1400}
                    step={50}
                    value={frameSpeed}
                    onChange={(event) => setFrameSpeed(Number(event.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={nextSpeed}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 transition hover:border-amber-300 hover:bg-amber-50"
                >
                  Update playback speed
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-3xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <div>
                  <div className="text-sm font-medium text-slate-900">Optional YouTube preview</div>
                  <div className="text-sm text-slate-500">
                    Play the source video next to the sign-language playback.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVideoPreview((current) => !current)}
                  disabled={!previewEmbedUrl}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {showVideoPreview ? 'Hide video' : 'Play video'}
                </button>
              </div>
            </div>

            <div className={`mt-6 grid gap-5 ${showVideoPreview && previewEmbedUrl ? 'xl:grid-cols-[1fr_1fr]' : 'lg:grid-cols-[1.2fr_0.8fr]'}`}>
              <div className="rounded-[28px] bg-slate-950 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-white/50">Current sign</div>
                    <div className="mt-1 text-xl font-semibold">{currentFrame?.label ?? 'No sign selected'}</div>
                  </div>
                  <div className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                    {matched.length ? `${activeFrame + 1} / ${matched.length}` : '0 / 0'}
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,_rgba(251,191,36,0.24),_rgba(15,23,42,0.8))] p-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-slate-900/70 ring-1 ring-white/10">
                    {currentFrame ? (
                      <img
                        src={currentFrame.src}
                        alt={currentFrame.label}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/60">
                        Fetch a transcript to generate explanation-based sign playback.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {showVideoPreview && previewEmbedUrl ? (
                <div className="rounded-[28px] bg-slate-50 p-4 ring-1 ring-slate-200 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Source video</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">YouTube preview</div>
                    </div>
                    <div className="text-sm text-slate-500">Optional playback</div>
                  </div>

                  <div className="overflow-hidden rounded-[24px] bg-slate-950 ring-1 ring-slate-200">
                    <div className="aspect-video">
                      <iframe
                        src={previewEmbedUrl}
                        title="YouTube video preview"
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[28px] bg-slate-50 p-4 ring-1 ring-slate-200 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Playback timeline</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">Matched signs</div>
                    </div>
                    <div className="text-sm text-slate-500">{totalWords} words scanned</div>
                  </div>

                  <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                    {matched.length ? (
                      matched.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveFrame(index)}
                          className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                            index === activeFrame
                              ? 'bg-slate-950 text-white shadow-lg'
                              : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:ring-amber-300'
                          }`}
                        >
                          <span className="font-medium capitalize">{item.label}</span>
                          <span className={`text-xs ${index === activeFrame ? 'text-white/60' : 'text-slate-400'}`}>
                            Sign {index + 1}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-white px-4 py-6 text-sm text-slate-500 ring-1 ring-slate-200">
                        No matched glossary items yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {showVideoPreview && previewEmbedUrl ? (
              <div className="mt-5 rounded-[28px] bg-slate-50 p-4 ring-1 ring-slate-200 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Playback timeline</div>
                    <div className="mt-1 text-xl font-semibold text-slate-950">Matched signs</div>
                  </div>
                  <div className="text-sm text-slate-500">{totalWords} words scanned</div>
                </div>

                <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
                  {matched.length ? (
                    matched.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveFrame(index)}
                        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                          index === activeFrame
                            ? 'bg-slate-950 text-white shadow-lg'
                            : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:ring-amber-300'
                        }`}
                      >
                        <span className="font-medium capitalize">{item.label}</span>
                        <span className={`text-xs ${index === activeFrame ? 'text-white/60' : 'text-slate-400'}`}>
                          Sign {index + 1}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-white px-4 py-6 text-sm text-slate-500 ring-1 ring-slate-200">
                      No matched glossary items yet.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="flex flex-col gap-6">
            <section className="rounded-[32px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Transcript pipeline</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Server and Gemini response</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The client now sends the YouTube link to a FastAPI transcript service. The returned transcript is what goes into Gemini for explanation and glossary generation.
              </p>

              <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Submitted link</div>
                <p className="mt-3 break-all text-sm leading-6 text-slate-700">{submittedVideoLink}</p>
              </div>

              <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Transcript preview</div>
                <p className="mt-3 line-clamp-6 text-sm leading-6 text-slate-700">
                  {transcript || 'No transcript yet. Fetch a transcript from the FastAPI server to continue.'}
                </p>
              </div>

              <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Explanation</div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {aiResult?.explanation ?? 'No explanation yet. After transcript fetch, Gemini will simplify it here.'}
                </p>
              </div>

              <div className="mt-5">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Glossary used for playback</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiResult?.glossary?.length ? (
                    aiResult.glossary.map((phrase) => (
                      <span
                        key={phrase}
                        className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900"
                      >
                        {phrase}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
                      Waiting for Gemini output
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] bg-slate-950 p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] sm:p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-white/50">Coverage</div>
              <div className="mt-4 space-y-4 text-sm leading-6 text-white/75">
                <p>Words missing from WLASL stay listed below so you can see why some parts of the explanation do not play.</p>
                <p>The transcript comes from the FastAPI server, and Gemini only receives that transcript plus your instruction.</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {missing.length ? (
                  missing.map((word) => (
                    <span
                      key={word}
                      className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/10"
                    >
                      {word}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-medium text-emerald-200 ring-1 ring-emerald-400/20">
                    All generated words were matched.
                  </span>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default SignLanguageRoot
