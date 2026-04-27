import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AnimeRoot from './animation/animate-root.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AnimeRoot />
    {/* <SignLanguageRoot/> */}
  </StrictMode>,
)
