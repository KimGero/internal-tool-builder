import { ComponentPalette } from './builder/ComponentPalette'
import { Canvas } from './builder/Canvas'
import { PropertiesPanel } from './builder/PropertiesPanel'

function App() {
  return (
    <div className="flex h-screen">
      <ComponentPalette />
      <main className="flex-1">
        <Canvas />
      </main>
      <PropertiesPanel />
    </div>
  )
}

export default App