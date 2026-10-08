import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProtectedLayout } from './app/layouts/ProtectedLayout'
import { Login } from './app/routes/Login'
import { RolePickerRoute } from './app/routes/RolePickerRoute'
import { Dashboard } from './app/routes/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/role-picker" element={<RolePickerRoute />} />
        
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
