import { useState } from "react"
import { updateProfileRole } from "../api"
import { UserRole } from "../hooks/useAuth"

interface RolePickerProps {
  userId: string
  onRoleSelected: (role: UserRole) => void
}

export function RolePicker({ userId, onRoleSelected }: RolePickerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = async (role: UserRole) => {
    setLoading(true)
    setError(null)
    try {
      await updateProfileRole(userId, role)
      onRoleSelected(role)
    } catch (err: any) {
      setError(err.message || 'Failed to save role')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display text-center text-copy-primary">Choose your role</h2>
      {error && <p className="text-state-error text-center">{error}</p>}
      <div className="grid gap-4">
        <button
          onClick={() => handleSelect('farmer')}
          disabled={loading}
          className="p-6 bg-surface border border-border-surface-border rounded-2xl text-left hover:bg-bg-subtle transition-colors"
        >
          <div className="text-lg font-medium text-copy-primary">Farmer</div>
          <div className="text-copy-secondary text-sm mt-1">I want to sell paddy straw from my fields.</div>
        </button>
        <button
          onClick={() => handleSelect('buyer')}
          disabled={loading}
          className="p-6 bg-surface border border-border-surface-border rounded-2xl text-left hover:bg-bg-subtle transition-colors"
        >
          <div className="text-lg font-medium text-copy-primary">Buyer</div>
          <div className="text-copy-secondary text-sm mt-1">I want to buy paddy straw for my plant.</div>
        </button>
        <button
          onClick={() => handleSelect('donor')}
          disabled={loading}
          className="p-6 bg-surface border border-border-surface-border rounded-2xl text-left hover:bg-bg-subtle transition-colors"
        >
          <div className="text-lg font-medium text-copy-primary">Donor</div>
          <div className="text-copy-secondary text-sm mt-1">I want to fund alternatives to crop burning.</div>
        </button>
      </div>
    </div>
  )
}
