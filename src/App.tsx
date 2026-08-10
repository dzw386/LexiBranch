import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <p className="eyebrow">LexiBranch scaffold</p>
      <h1>Vite + React</h1>
      <p>
        Edit <code>src/App.tsx</code> and save to test HMR.
      </p>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Count is {count}
      </button>
      <nav aria-label="Documentation">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          Vite documentation
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          React documentation
        </a>
      </nav>
    </main>
  )
}

export default App
