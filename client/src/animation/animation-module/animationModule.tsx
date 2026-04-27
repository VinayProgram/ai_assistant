import AiAnimationGenModule from "../ai-animation-module/ai-animation-module";
import AiImageModule from "../ai-image-module/ai-image-module";
import AnimationDashboard from "./animation-dashboard";

const AnimationModule = () => {
  return (
    <>
    <AiImageModule/>
    <AnimationDashboard />
    <AiAnimationGenModule/>

    </>
  );
};

export default AnimationModule;
