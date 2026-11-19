import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoaderCircle, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

// Day 6 adds the offline queue here: pending and failed updates, and Sync now.
export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  if (!user) return null

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-medium">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <Badge variant="secondary" className="mt-1">
              {user.role === 'SUPERVISOR' ? 'Supervisor' : 'Technician'}
            </Badge>
          </div>
        </CardContent>
      </Card>
      <Button variant="outline" className="h-11" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? <LoaderCircle className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
        Log out
      </Button>
    </div>
  )
}
