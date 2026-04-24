import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SignLanguageRoot from './sigin-language/signlanguageroot.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <AnimateRoot /> */}
    <SignLanguageRoot/>
  </StrictMode>,
)
