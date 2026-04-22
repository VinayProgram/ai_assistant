import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Html, OrbitControls } from '@react-three/drei'
import { LizaModel } from './liza-model'

function Loader() {
  return (
    <Html center>
      <div
        style={{
          padding: '0.75rem 1rem',
          borderRadius: '999px',
          background: 'rgba(15, 23, 42, 0.75)',
          color: '#fff',
          fontSize: '0.95rem',
          letterSpacing: '0.02em',
        }}
      >
        Loading model...
      </div>
    </Html>
  )
}

export function LizaCanvas() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Canvas >
        <color attach="background" args={['#848890ff']} />
        <ambientLight intensity={4} />
        <directionalLight position={[4, 6, 4]} intensity={2} />
        <Suspense fallback={<Loader />}>
          <LizaModel/>
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enableDamping />
      </Canvas>
    </div>
  )
}
