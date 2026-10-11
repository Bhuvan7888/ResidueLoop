import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedLayout } from './app/layouts/ProtectedLayout'
import { Landing } from './app/routes/Landing'
import { Login } from './app/routes/Login'
import { RolePickerRoute } from './app/routes/RolePickerRoute'
import { Dashboard } from './app/routes/Dashboard'
import { PublicCharity } from './app/routes/PublicCharity'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/charity" element={<PublicCharity />} />
        <Route path="/login" element={<Login />} />
        <Route path="/role-picker" element={<RolePickerRoute />} />
        
        <Route element={<ProtectedLayout />}>
          <Route path="/app" element={<Dashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
