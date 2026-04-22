import { promptLiza } from './liza-api'
import { useLiza } from './liza-context'
import type { LizaActions } from './liza-types'
import type { Bone } from 'three'
import { promptGenerator } from './system-promt'
import React from 'react'

export function LizaPanel() {
  const { bones, lizaModelRef,setAnimation } = useLiza()
  const pmt=promptGenerator(bones)
  const [userPrompt,setUserPrompt]=React.useState<string>("")
const [actionData]=React.useState<LizaActions>({
    "strength": 0.8,
    "actions": {
        "mixamorigHips": {
            "track": {
                "loop": true,
                "positionKeyframes": [
                    {
                        "time": 0,
                        "value": {
                            "z": 0,
                            "y": -2
                        }
                    },
                    {
                        "time": 500,
                        "value": {
                            "z": -15,
                            "y": -2
                        }
                    },
                    {
                        "time": 1000,
                        "value": {
                            "z": 0,
                            "y": -2
                        }
                    }
                ]
            }
        },
        "mixamorigRightFoot": {
            "track": {
                "loop": true,
                "rotationKeyframes": [
                    {
                        "time": 0,
                        "value": {
                            "x": 0.8
                        }
                    },
                    {
                        "time": 500,
                        "value": {
                            "x": 0
                        }
                    },
                    {
                        "time": 1000,
                        "value": {
                            "x": 0.8
                        }
                    }
                ]
            }
        },
        "mixamorigLeftFoot": {
            "track": {
                "loop": true,
                "rotationKeyframes": [
                    {
                        "time": 0,
                        "value": {
                            "x": 0
                        }
                    },
                    {
                        "time": 500,
                        "value": {
                            "x": 0.8
                        }
                    },
                    {
                        "time": 1000,
                        "value": {
                            "x": 0
                        }
                    }
                ]
            }
        },
        "mixamorigSpine": {
            "rotationDelta": {
                "x": 0.15
            }
        },
        "mixamorigHead": {
            "rotationDelta": {
                "x": 0.2
            }
        },
        "mixamorigRightArm": {
            "rotationDelta": {
                "z": 0.2,
                "x": 0.3
            }
        },
        "mixamorigLeftArm": {
            "rotationDelta": {
                "z": -0.2,
                "x": 0.3
            }
        }
    }
})

    const animateKeyframes = (
      duration: number,
      onUpdate: (progress: number) => void,
      onComplete?: () => void,
    ) => {
      const startTime = performance.now()

      const step = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1)
        onUpdate(progress)

        if (progress < 1) {
          window.requestAnimationFrame(step)
          return
        }

        onComplete?.()
      }

      window.requestAnimationFrame(step)
    }

const actionPermformerfucntion = (actionData: LizaActions) => {
    console.log(actionData)
    setAnimation(false)
    const model = lizaModelRef.current
    if (!model) return
    let maxActionTime = 0

    const bonesByName = new Map(
      model.getObjectsByProperty('isBone', true).map((bone) => [bone.name, bone as Bone]),
    )

    Object.entries(actionData.actions).forEach(([boneName, action]) => {
      const bone = bonesByName.get(boneName)
      if (!bone) return

      if (action.rotationDelta) {
        bone.rotation.x += action.rotationDelta.x ?? 0
        bone.rotation.y += action.rotationDelta.y ?? 0
        bone.rotation.z += action.rotationDelta.z ?? 0
      }

      if (action.positionDelta) {
        bone.position.x += action.positionDelta.x ?? 0
        bone.position.y += action.positionDelta.y ?? 0
        bone.position.z += action.positionDelta.z ?? 0
      }

      if (action.track?.rotationKeyframes?.length) {
        const keyframes = action.track.rotationKeyframes
        maxActionTime = Math.max(maxActionTime, keyframes[keyframes.length - 1]?.time ?? 0)
        const baseRotation = {
          x: bone.rotation.x,
          y: bone.rotation.y,
          z: bone.rotation.z,
        }

        keyframes.slice(1).forEach((keyframe, index) => {
          const previous = keyframes[index]
          const from = previous.value
          const to = keyframe.value
          const segmentDuration = Math.max(keyframe.time - previous.time, 1)

          window.setTimeout(() => {
            animateKeyframes(segmentDuration, (progress) => {
              bone.rotation.x =
                baseRotation.x + (from.x ?? 0) + ((to.x ?? 0) - (from.x ?? 0)) * progress
              bone.rotation.y =
                baseRotation.y + (from.y ?? 0) + ((to.y ?? 0) - (from.y ?? 0)) * progress
              bone.rotation.z =
                baseRotation.z + (from.z ?? 0) + ((to.z ?? 0) - (from.z ?? 0)) * progress
            })
          }, previous.time)
        })
      }

      if (action.track?.positionKeyframes?.length) {
        const keyframes = action.track.positionKeyframes
        maxActionTime = Math.max(maxActionTime, keyframes[keyframes.length - 1]?.time ?? 0)
        const basePosition = {
          x: bone.position.x,
          y: bone.position.y,
          z: bone.position.z,
        }

        keyframes.slice(1).forEach((keyframe, index) => {
          const previous = keyframes[index]
          const from = previous.value
          const to = keyframe.value
          const segmentDuration = Math.max(keyframe.time - previous.time, 1)

          window.setTimeout(() => {
            animateKeyframes(segmentDuration, (progress) => {
              bone.position.x =
                basePosition.x + (from.x ?? 0) + ((to.x ?? 0) - (from.x ?? 0)) * progress
              bone.position.y =
                basePosition.y + (from.y ?? 0) + ((to.y ?? 0) - (from.y ?? 0)) * progress
              bone.position.z =
                basePosition.z + (from.z ?? 0) + ((to.z ?? 0) - (from.z ?? 0)) * progress
            })
          }, previous.time)
        })
      }
    })

    window.setTimeout(() => {
      setAnimation(true)
    }, Math.max(maxActionTime, actionData.duration ?? 300))

  }

  const resetFunction = () => {
    setAnimation(false)
    const model = lizaModelRef.current
    if (!model) return

    const bonesByName = new Map(
      model.getObjectsByProperty('isBone', true).map((bone) => [bone.name, bone as Bone]),
    )

    bones.forEach(({ bone: boneData }) => {
      const currentBone = bonesByName.get(boneData.name)
      if (!currentBone) return

      currentBone.position.set(
        boneData.orignalPosition.x ?? 0,
        boneData.orignalPosition.y ?? 0,
        boneData.orignalPosition.z ?? 0,
      )
      currentBone.rotation.set(
        boneData.orignalRotation.x ?? 0,
        boneData.orignalRotation.y ?? 0,
        boneData.orignalRotation.z ?? 0,
      )
    })
    setAnimation(true)
    actionPermformerfucntion(actionData)
  }


  return (
    <aside
      style={{
        width: '320px',
        minHeight: '100vh',
        boxSizing: 'border-box',
        padding: '1.25rem',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#0f172a',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Liza Panel</h2>
        <p style={{ margin: '0.5rem 0 0', color: '#94a3b8', lineHeight: 1.5 }}>
          Control area for Liza. This panel can hold prompts, actions, and rig tools.
        </p>
      </div>

      <div
        style={{
          padding: '0.9rem',
          borderRadius: '0.9rem',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
        }}
      >
        <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Total Bones</div>
        <div style={{ marginTop: '0.35rem', fontSize: '1.8rem', fontWeight: 700 }}>
          {bones.length}
        </div>
        <textarea
          value={userPrompt}
          onChange={(event) => setUserPrompt(event.target.value)}
          placeholder="Describe the motion you want Liza to perform"
          rows={4}
          style={{
            width: '100%',
            marginTop: '0.75rem',
            boxSizing: 'border-box',
            padding: '0.75rem',
            borderRadius: '0.75rem',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            background: '#111827',
            color: '#e2e8f0',
            resize: 'vertical',
          }}
        />
        <button
          onClick={async () => {
            const actionData = await promptLiza(pmt, userPrompt)
            actionPermformerfucntion(actionData)
          }}
        >
          Send
        </button>
        <button onClick={resetFunction}>
          Reset
        </button>
      </div>

    </aside>
  )
}
