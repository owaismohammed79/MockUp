import { Outlet } from "react-router"

function App() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 px-4 py-3">
        <span className="text-sm font-semibold tracking-wide">MockUp</span>
      </header>
      <Outlet />
    </div>
  )
}

export default App
