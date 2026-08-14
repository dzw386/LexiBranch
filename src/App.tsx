import { Button } from '@/components/ui/button'

function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-lg space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            LexiBranch
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Styling setup
          </h1>
          <p className="text-muted-foreground">
            Tailwind CSS and shadcn/ui are ready for the application interface.
          </p>
        </div>
        <Button>Preview Button</Button>
      </section>
    </main>
  )
}

export default App
