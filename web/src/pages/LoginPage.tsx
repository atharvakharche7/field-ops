import { ApiError } from '@/api/client'
import { homePath, useAuth } from '@/auth/AuthContext'
import { errorMessage } from '@/lib/errors'
import { Logo } from '@/layouts/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

// The seeded accounts. Shown on the page so anyone opening the live demo can try it.
const DEMO_ACCOUNTS = [
  { label: 'Technician (Ravi)', email: 'tech1@fieldops.dev' },
  { label: 'Technician (Priya)', email: 'tech2@fieldops.dev' },
  { label: 'Supervisor', email: 'supervisor@fieldops.dev' },
]
const DEMO_PASSWORD = 'Password@123'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already logged in (for example after pressing Back): skip the form.
  if (user) return <Navigate to={homePath(user)} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault() // stop the browser's own form submit, which would reload the page
    setError(null)
    setSubmitting(true)
    try {
      const u = await login(email.trim(), password)
      // Go back to the page they were trying to open, or to their home page.
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : homePath(u), { replace: true })
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Invalid email or password' : errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-10">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Log in</CardTitle>
          <CardDescription>Field service tickets for network technicians and supervisors.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                className="h-11"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="h-11"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="h-11" disabled={submitting || !email || !password}>
              {submitting && <LoaderCircle className="animate-spin" aria-hidden />}
              {submitting ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="w-full max-w-sm">
        <p className="mb-2 text-center text-sm text-muted-foreground">Try a demo account</p>
        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map(acc => (
            <Button
              key={acc.email}
              type="button"
              variant="outline"
              className="h-11 justify-between"
              onClick={() => {
                setEmail(acc.email)
                setPassword(DEMO_PASSWORD)
                setError(null)
              }}
            >
              <span>{acc.label}</span>
              <span className="text-xs text-muted-foreground">{acc.email}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
