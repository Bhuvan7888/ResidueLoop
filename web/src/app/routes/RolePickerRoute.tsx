import { Navigate } from 'react-router-dom'
import { RolePicker } from '@/features/auth/components/RolePicker'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function RolePickerRoute() {
  const { session, role, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  if (role) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <RolePicker 
          userId={session.user.id} 
          onRoleSelected={() => {
            // Force a reload or navigate to the correct dashboard
            window.location.href = '/'
          }} 
        />
      </div>
    </div>
  )
}
