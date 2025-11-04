import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Inbox from './pages/Inbox'
import TicketView from './pages/TicketView'
import SendEmail from './pages/SendEmail'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminCategories from './pages/AdminCategories'
import AdminTemplates from './pages/AdminTemplates'
import AdminBlockedSenders from './pages/AdminBlockedSenders'
import AdminBulkReassign from './pages/AdminBulkReassign'
import AdminExports from './pages/AdminExports'
import AdminInstagram from './pages/AdminInstagram'
import Layout from './components/Layout'

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { currentUser, isLoading } = useAuth()
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }
  
  if (adminOnly && currentUser.role !== 'admin') {
    return <Navigate to="/inbox" replace />
  }
  
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="ticket/:id" element={<TicketView />} />
        <Route path="send-email" element={<SendEmail />} />
        <Route path="admin" element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="admin/users" element={
          <ProtectedRoute adminOnly>
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="admin/categories" element={
          <ProtectedRoute adminOnly>
            <AdminCategories />
          </ProtectedRoute>
        } />
        <Route path="admin/templates" element={
          <ProtectedRoute adminOnly>
            <AdminTemplates />
          </ProtectedRoute>
        } />
        <Route path="admin/blocked-senders" element={
          <ProtectedRoute adminOnly>
            <AdminBlockedSenders />
          </ProtectedRoute>
        } />
        <Route path="admin/bulk-reassign" element={
          <ProtectedRoute adminOnly>
            <AdminBulkReassign />
          </ProtectedRoute>
        } />
        <Route path="admin/exports" element={
          <ProtectedRoute adminOnly>
            <AdminExports />
          </ProtectedRoute>
        } />
        <Route path="admin/instagram" element={
          <ProtectedRoute adminOnly>
            <AdminInstagram />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App 