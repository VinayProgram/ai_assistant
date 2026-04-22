import { LizaCanvas } from './liza-canvas'
import { LizaProvider } from './liza-context'
import { LizaPanel } from './liza-panel'

const LizaAI = () => {
  return (
    <LizaProvider>
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          background: '#101828',
        }}
      >
        <LizaPanel />
        <LizaCanvas />
      </div>
    </LizaProvider>
  )
}

export default LizaAI
