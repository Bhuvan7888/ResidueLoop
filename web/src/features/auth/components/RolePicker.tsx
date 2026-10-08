import { useState } from "react"
import { useTranslation } from "react-i18next"
import { updateProfileRole } from "../api"
import { UserRole } from "../hooks/useAuth"

interface RolePickerProps {
  userId: string
  onRoleSelected: (role: UserRole) => void
}

export function RolePicker({ userId, onRoleSelected }: RolePickerProps) {
  const { t } = useTranslation()
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
      <h2 className="text-2xl font-display text-center text-copy-primary">{t('auth.choose_role')}</h2>
      {error && <p className="text-state-error text-center">{error}</p>}
      <div className="grid gap-4">
        <button
          onClick={() => handleSelect('farmer')}
          disabled={loading}
          className="p-6 bg-surface border border-border-surface-border rounded-2xl text-left hover:bg-bg-subtle transition-colors"
        >
          <div className="text-lg font-medium text-copy-primary">{t('auth.role_farmer')}</div>
          <div className="text-copy-secondary text-sm mt-1">{t('auth.role_farmer_desc')}</div>
        </button>
        <button
          onClick={() => handleSelect('buyer')}
          disabled={loading}
          className="p-6 bg-surface border border-border-surface-border rounded-2xl text-left hover:bg-bg-subtle transition-colors"
        >
          <div className="text-lg font-medium text-copy-primary">{t('auth.role_buyer')}</div>
          <div className="text-copy-secondary text-sm mt-1">{t('auth.role_buyer_desc')}</div>
        </button>
        <button
          onClick={() => handleSelect('donor')}
          disabled={loading}
          className="p-6 bg-surface border border-border-surface-border rounded-2xl text-left hover:bg-bg-subtle transition-colors"
        >
          <div className="text-lg font-medium text-copy-primary">{t('auth.role_donor')}</div>
          <div className="text-copy-secondary text-sm mt-1">{t('auth.role_donor_desc')}</div>
        </button>
      </div>
    </div>
  )
}
