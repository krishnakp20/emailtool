import React, { useState, useEffect } from 'react'
import { usersAPI, categoriesAPI, User, CategoryPriority } from '../api/client'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const AdminExports: React.FC = () => {
  const [advisers, setAdvisers] = useState<User[]>([])
  const [priorities, setPriorities] = useState<CategoryPriority[]>([])
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Ticket export filters
  const [ticketFilters, setTicketFilters] = useState({
    status: '',
    assigned_to: '',
    priority_id: '',
    from_date: '',
    to_date: ''
  })

  // Email export filters
  const [emailFilters, setEmailFilters] = useState({
    spam_status: 'all',
    from_date: '',
    to_date: ''
  })

  useEffect(() => {
    fetchAdvisers()
    fetchPriorities()
  }, [])

  const fetchAdvisers = async () => {
    try {
      const advisersData = await usersAPI.list({ role: 'adviser' })
      setAdvisers(advisersData)
    } catch (err: any) {
      console.error('Failed to fetch advisers:', err)
    }
  }

  const fetchPriorities = async () => {
    try {
      const prioritiesData = await categoriesAPI.priorities.list()
      setPriorities(prioritiesData)
    } catch (err: any) {
      console.error('Failed to fetch priorities:', err)
    }
  }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Authorization': `Bearer ${token}`
    }
  }

  const handleExportTickets = async () => {
    setIsExporting('tickets')
    setError('')
    setSuccess('')

    try {
      const params = new URLSearchParams()
      if (ticketFilters.status) params.append('status', ticketFilters.status)
      if (ticketFilters.assigned_to) params.append('assigned_to', ticketFilters.assigned_to)
      if (ticketFilters.priority_id) params.append('priority_id', ticketFilters.priority_id)
      if (ticketFilters.from_date) params.append('from_date', ticketFilters.from_date)
      if (ticketFilters.to_date) params.append('to_date', ticketFilters.to_date)

      const url = `${API_BASE_URL}/exports/tickets/csv?${params.toString()}`
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to export tickets')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `tickets_export_${new Date().getTime()}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      setSuccess('Tickets exported successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to export tickets')
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportEmails = async () => {
    setIsExporting('emails')
    setError('')
    setSuccess('')

    try {
      const params = new URLSearchParams()
      if (emailFilters.spam_status !== 'all') params.append('spam_status', emailFilters.spam_status)
      if (emailFilters.from_date) params.append('from_date', emailFilters.from_date)
      if (emailFilters.to_date) params.append('to_date', emailFilters.to_date)

      const url = `${API_BASE_URL}/exports/emails/csv?${params.toString()}`
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to export emails')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `emails_export_${new Date().getTime()}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      setSuccess('Emails exported successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to export emails')
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportSpamOnly = async () => {
    setIsExporting('spam')
    setError('')
    setSuccess('')

    try {
      const params = new URLSearchParams()
      if (emailFilters.from_date) params.append('from_date', emailFilters.from_date)
      if (emailFilters.to_date) params.append('to_date', emailFilters.to_date)

      const url = `${API_BASE_URL}/exports/spam-emails/csv?${params.toString()}`
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to export spam emails')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `spam_emails_${new Date().getTime()}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      setSuccess('Spam emails exported successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to export spam emails')
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportBlockedSenders = async () => {
    setIsExporting('blocked')
    setError('')
    setSuccess('')

    try {
      const url = `${API_BASE_URL}/exports/blocked-senders/csv`
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to export blocked senders')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `blocked_senders_${new Date().getTime()}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      setSuccess('Blocked senders list exported successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to export blocked senders')
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Data Exports
        </h1>
        <p className="text-gray-600 text-sm">
          Export tickets, emails, and spam data to CSV format
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex justify-between items-center">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Export Tickets */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Export Tickets</h2>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Export all tickets with optional filters. CSV file includes ticket details, customer info, and assignment data.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={ticketFilters.status}
              onChange={(e) => setTicketFilters({...ticketFilters, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
            <select
              value={ticketFilters.assigned_to}
              onChange={(e) => setTicketFilters({...ticketFilters, assigned_to: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Agents</option>
              {advisers.map((adviser) => (
                <option key={adviser.id} value={adviser.id}>
                  {adviser.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={ticketFilters.priority_id}
              onChange={(e) => setTicketFilters({...ticketFilters, priority_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Priorities</option>
              {priorities.map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {priority.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={ticketFilters.from_date}
              onChange={(e) => setTicketFilters({...ticketFilters, from_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={ticketFilters.to_date}
              onChange={(e) => setTicketFilters({...ticketFilters, to_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleExportTickets}
          disabled={isExporting === 'tickets'}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isExporting === 'tickets' ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Tickets
            </>
          )}
        </button>
      </div>

      {/* Export Emails */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Export Emails</h2>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Export all email messages with spam classification. Includes inbound and outbound messages.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Spam Filter</label>
            <select
              value={emailFilters.spam_status}
              onChange={(e) => setEmailFilters({...emailFilters, spam_status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Emails</option>
              <option value="spam">Spam Only</option>
              <option value="not_spam">Not Spam Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={emailFilters.from_date}
              onChange={(e) => setEmailFilters({...emailFilters, from_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={emailFilters.to_date}
              onChange={(e) => setEmailFilters({...emailFilters, to_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleExportEmails}
            disabled={isExporting === 'emails'}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isExporting === 'emails' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Emails
              </>
            )}
          </button>

          <button
            onClick={handleExportSpamOnly}
            disabled={isExporting === 'spam'}
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isExporting === 'spam' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Export Spam Only
              </>
            )}
          </button>
        </div>
      </div>

      {/* Export Blocked Senders */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Export Blocked Senders</h2>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Export the complete list of blocked email addresses (spam senders).
        </p>

        <button
          onClick={handleExportBlockedSenders}
          disabled={isExporting === 'blocked'}
          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isExporting === 'blocked' ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Blocked Senders
            </>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 mb-1">Export Information</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• All exports are in CSV format compatible with Excel and other spreadsheet software</li>
              <li>• Files are generated on-demand and downloaded directly to your device</li>
              <li>• Use filters to export specific date ranges or categories</li>
              <li>• Spam classification is based on the blocked senders list</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminExports


