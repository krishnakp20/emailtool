import React, { useState, useEffect } from 'react'
import { ticketsAPI, usersAPI, Ticket } from '../api/client'

const AdminDashboard: React.FC = () => {
  console.log('🚀 AdminDashboard component mounted')
  
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    pendingTickets: 0,
    closedTickets: 0,
    unassignedTickets: 0,
    totalUsers: 0,
    activeAdvisers: 0
  })
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // Debug: Check authentication status
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      console.log('🔐 Auth Debug:', { 
        hasToken: !!token, 
        tokenLength: token?.length,
        hasUser: !!user,
        userData: user ? JSON.parse(user) : null
      })

      // Fetch ticket counts by status
      console.log('📊 Fetching ticket counts...')
      const [allTickets, openTickets, pendingTickets, closedTickets, unassignedTickets] = await Promise.all([
        ticketsAPI.list({ page_size: 1 }),
        ticketsAPI.list({ status: 'Open', page_size: 1 }),
        ticketsAPI.list({ status: 'Pending', page_size: 1 }),
        ticketsAPI.list({ status: 'Closed', page_size: 1 }),
        ticketsAPI.list({ unassigned: true, page_size: 1 })
      ])

      console.log('✅ Ticket counts fetched:', {
        total: allTickets.total,
        open: openTickets.total,
        pending: pendingTickets.total,
        closed: closedTickets.total,
        unassigned: unassignedTickets.total
      })

      // Fetch user counts
      console.log('👥 Fetching user counts...')
      const [allUsers, activeAdvisers] = await Promise.all([
        usersAPI.list(),
        usersAPI.list({ role: 'adviser', is_active: true })
      ])

      console.log('✅ User counts fetched:', {
        total: allUsers.length,
        activeAdvisers: activeAdvisers.length
      })

      // Fetch recent tickets
      console.log('📋 Fetching recent tickets...')
      const recentTicketsData = await ticketsAPI.list({ page_size: 10 })

      console.log('✅ Recent tickets fetched:', recentTicketsData.tickets.length)

      setStats({
        totalTickets: allTickets.total,
        openTickets: openTickets.total,
        pendingTickets: pendingTickets.total,
        closedTickets: closedTickets.total,
        unassignedTickets: unassignedTickets.total,
        totalUsers: allUsers.length,
        activeAdvisers: activeAdvisers.length
      })

      setRecentTickets(recentTicketsData.tickets)
    } catch (error: any) {
      console.error('❌ Failed to fetch dashboard data:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      // Set error message for user
      if (error.response?.status === 401) {
        setError('Authentication failed. Please login again.')
      } else if (error.response?.data?.detail) {
        setError(`API Error: ${error.response.data.detail}`)
      } else {
        setError(`Failed to load dashboard: ${error.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <strong>Error loading dashboard:</strong> {error}
        </div>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open Tickets</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.openTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Tickets</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unassigned</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.unassignedTickets}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">User Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Users</span>
              <span className="font-medium">{stats.totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Advisers</span>
              <span className="font-medium">{stats.activeAdvisers}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Ticket Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Open</span>
              <span className="font-medium">{stats.openTickets}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending</span>
              <span className="font-medium">{stats.pendingTickets}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Closed</span>
              <span className="font-medium">{stats.closedTickets}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Tickets</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentTickets.length > 0 ? (
            recentTickets.map((ticket: any) => (
              <div key={ticket.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      #{ticket.id} - {ticket.subject}
                    </div>
                    <div className="text-sm text-gray-500">
                      {ticket.customer_email} • {new Date(ticket.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                      ticket.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ticket.status}
                    </span>
                    {!ticket.assigned_user && (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-4 text-center text-gray-500">
              No tickets found. {stats.totalTickets === 0 ? 'The system appears to be empty.' : 'Try refreshing the page.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard 