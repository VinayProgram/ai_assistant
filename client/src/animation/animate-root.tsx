import { SidebarProvider } from "@/components/ui/sidebar"
import AnimationModule from "./animation-module/animationModule"

export default function AnimeRoot() {
  return (
    <SidebarProvider>
      <main style={{width:"100vw"}}>
        <AnimationModule />
      </main>
    </SidebarProvider>
  )
}
