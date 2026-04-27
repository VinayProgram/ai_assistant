import { AiAnimationHeader, AiAnimationPromptPanel } from "./ai-animation-controls";
import {
  AiAnimationPlaybackLoop,
  AiAnimationStage,
  AiAnimationSummaryCards,
} from "./ai-animation-preview";

const shellClassName =
  "mx-auto mt-8 max-w-7xl rounded-[32px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_32px_120px_-48px_rgba(15,23,42,0.45)] backdrop-blur";

const AiAnimationGenModule = () => {
  return (
    <section className={shellClassName}>
      <AiAnimationPlaybackLoop />
      <AiAnimationHeader />
      <AiAnimationPromptPanel />
      <AiAnimationStage />
      <AiAnimationSummaryCards />
    </section>
  );
};

export default AiAnimationGenModule;
