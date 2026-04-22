export type BoneListItem = {
  bone: {
    name:string
    orignalPosition:Vec3Partial,
    orignalRotation:Vec3Partial,
    parent:string
  }
}[]


type Vec3Partial = {
  x?: number
  y?: number
  z?: number
}

type Keyframe = {
  time: number
  value: Vec3Partial
}

type BoneAction = {
  rotationDelta?: Vec3Partial
  positionDelta?: Vec3Partial
  track?: {
    loop?: boolean
    rotationKeyframes?: Keyframe[]
    positionKeyframes?: Keyframe[]
  }
}

export type LizaActions = {
  strength?: number
  duration?: number
  actions: {
    [boneName: string]: BoneAction
  }
}
