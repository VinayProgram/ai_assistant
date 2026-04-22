import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import type { Object3D } from 'three'
import type { BoneListItem } from './liza-types'
import * as THREE from 'three'
type LizaContextValue = {
  lizaModelRef:React.RefObject<Object3D<THREE.Object3DEventMap> | null>,
  bones:BoneListItem
  setBones:React.Dispatch<React.SetStateAction<BoneListItem>>
  animation:boolean,
  setAnimation:React.Dispatch<React.SetStateAction<boolean>>
}

const LizaContext = createContext<LizaContextValue | null>(null)

export function LizaProvider({ children }: { children: ReactNode }) {
  const lizaModelRef=React.useRef<null|THREE.Object3D>(null)
  const [bones,setBones]=React.useState<BoneListItem>([])
  const [animation,setAnimation]=React.useState<boolean>(true)
  
  const value = useMemo<LizaContextValue>(
    () => ({
      lizaModelRef,
      bones,
      setBones,
      animation,
      setAnimation
    }),
    [animation, bones, lizaModelRef, setBones],
  )


  return <LizaContext.Provider value={value}>{children}</LizaContext.Provider>
}

export function useLiza() {
  const context = useContext(LizaContext)

  if (!context) {
    throw new Error('useLiza must be used inside LizaProvider')
  }

  return context
}
