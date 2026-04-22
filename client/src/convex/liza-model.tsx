import { useAnimations, useFBX } from '@react-three/drei'
import React from 'react'
import { useLiza } from './liza-context'
import * as THREE from 'three'
export function LizaModel() {
  const fbx = useFBX('/liza2.fbx')
  const ref=React.useRef<null|THREE.Object3D>(null)
  const { actions } = useAnimations(fbx.animations, ref)
  const {setBones,lizaModelRef,animation}=useLiza()
  React.useEffect(()=>{
    if(!ref.current)return
    setBones(ref.current.getObjectsByProperty('isBone',true).map(x=>({bone:{
      name:x.name,
      orignalPosition:{
        x:x.position.x,
        y:x.position.y,
        z:x.position.z,
      },
      orignalRotation:{
        x:x.rotation.x,
        y:x.rotation.y,
        z:x.rotation.z,
      },
      parent:x.parent?.name ?? ''
    }})))
    lizaModelRef.current=ref.current
  },[fbx,ref])

  React.useEffect(() => {
    Object.values(actions).forEach((action) => {
      if (!action) return

      action.reset().fadeIn(0.3).play()
    })

    return () => {
      Object.values(actions).forEach((action) => {
        action?.fadeOut(0.2).stop()
      })
    }
  }, [actions])

  React.useEffect(() => {
    Object.values(actions).forEach((action) => {
      if (!action) return

      if (animation) {
        action.reset().fadeIn(0.3).play()
        return
      }

      action.fadeOut(0.2).stop()
    })
  }, [actions, animation])

  return (
      <primitive object={fbx} ref={ref}/>
  )
}

useFBX.preload('/liza2.fbx')
