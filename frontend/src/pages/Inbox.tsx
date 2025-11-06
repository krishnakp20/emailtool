import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ticketsAPI, usersAPI, Ticket, User } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import TagPills from '../components/TagPills'

const Inbox: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [advisers, setAdvisers] = useState<User[]>([])
  const [reassigningTicketId, setReassigningTicketId] = useState<number | null>(null)
  const [showReassignDropdown, setShowReassignDropdown] = useState<number | null>(null)

  // Get filters from URL params
  const status = searchParams.get('status')
  const priorityId = searchParams.get('priority_id')
  const assignedTo = searchParams.get('assigned_to')
  const unassigned = searchParams.get('unassigned')
  const search = searchParams.get('search')

  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true)
      setError('')
      
      try {
        const params: any = { page, page_size: pageSize }
        
        if (status) params.status = status
        if (priorityId) params.priority_id = parseInt(priorityId)
        if (assignedTo) params.assigned_to = parseInt(assignedTo)
        if (unassigned === 'true') params.unassigned = true
        if (search) params.search = search
        
        const response = await ticketsAPI.list(params)
        setTickets(response.tickets)
        setTotal(response.total)
        console.log(`Fetched ${response.tickets.length} tickets, total: ${response.total}`)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch tickets')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTickets()
  }, [status, priorityId, assignedTo, unassigned, search, page, pageSize])

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchAdvisers()
    }
  }, [currentUser])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showReassignDropdown !== null) {
        setShowReassignDropdown(null)
      }
    }

    if (showReassignDropdown !== null) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showReassignDropdown])

  const fetchAdvisers = async () => {
    try {
      const advisersData = await usersAPI.list({ role: 'adviser', is_active: true })
      setAdvisers(advisersData)
    } catch (err: any) {
      console.error('Failed to fetch advisers:', err)
    }
  }

  const handleReassign = async (ticketId: number, adviserId: number) => {
    setReassigningTicketId(ticketId)
    try {
      await ticketsAPI.reassign(ticketId, adviserId)
      // Refresh tickets to show updated assignment
      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === ticketId
            ? { ...ticket, assigned_to: adviserId, assigned_user: advisers.find(a => a.id === adviserId) }
            : ticket
        )
      )
      setShowReassignDropdown(null)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reassign ticket')
    } finally {
      setReassigningTicketId(null)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo(0, 0)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tickets...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        {error}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getStatusBadge = (status: string) => {
    const classes = {
      Open: 'bg-green-100 text-green-700 border-green-200',
      Pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      Closed: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return classes[status as keyof typeof classes] || classes.Closed
  }

  const getPriorityIcon = (priority?: { name: string; weight: number }) => {
    if (!priority) return null
    const colors = {
      High: 'text-red-500',
      Medium: 'text-yellow-500',
      Low: 'text-blue-500',
    }
    const color = colors[priority.name as keyof typeof colors] || 'text-gray-500'
    return (
      <svg className={`w-4 h-4 ${color}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" />
      </svg>
    )
  }

  return (
    <div className="space-y-3">
      {/* Error Alert */}
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
      
      {/* Compact Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            {status ? `${status} Tickets` : unassigned === 'true' ? 'Unassigned' : 'All Tickets'}
            <span className="ml-2 text-sm font-normal text-gray-500">({total})</span>
          </h1>
          {(status || priorityId || unassigned === 'true' || search) && (
            <div className="flex items-center gap-1.5">
              {status && <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">Status: {status}</span>}
              {priorityId && <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">Priority</span>}
              {unassigned === 'true' && <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">Unassigned</span>}
              {search && <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">"{search}"</span>}
            </div>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      {tickets.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    #
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Customer
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Subject
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Assigned
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Updated
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => navigate(`/ticket/${ticket.id}`)}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {getPriorityIcon(ticket.priority)}
                        <span className="text-xs font-bold text-gray-900">#{ticket.id}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-xs">
                        <div className="font-medium text-gray-900">{ticket.customer_name || ticket.customer_email.split('@')[0]}</div>
                        <div className="text-gray-500 truncate max-w-[150px]">{ticket.customer_email}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs font-medium text-gray-900 truncate max-w-[300px]">{ticket.subject}</div>
                      <div className="mt-0.5">
                        <TagPills ticket={ticket} />
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {currentUser?.role === 'admin' ? (
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setShowReassignDropdown(showReassignDropdown === ticket.id ? null : ticket.id)}
                            disabled={reassigningTicketId === ticket.id}
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              ticket.assigned_user
                                ? 'text-gray-900 hover:bg-gray-100'
                                : 'text-red-700 bg-red-50 hover:bg-red-100'
                            } ${reassigningTicketId === ticket.id ? 'opacity-50' : ''}`}
                          >
                            {reassigningTicketId === ticket.id ? (
                              'Updating...'
                            ) : ticket.assigned_user ? (
                              <>
                                {ticket.assigned_user.name}
                                <svg className="w-3 h-3 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </>
                            ) : (
                              'Unassigned ▼'
                            )}
                          </button>
                          
                          {showReassignDropdown === ticket.id && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[180px]">
                              <div className="py-1 max-h-60 overflow-y-auto">
                                {advisers.map((adviser) => (
                                  <button
                                    key={adviser.id}
                                    onClick={() => handleReassign(ticket.id, adviser.id)}
                                    className={`block w-full text-left px-3 py-2 text-xs hover:bg-blue-50 ${
                                      ticket.assigned_to === adviser.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                                    }`}
                                  >
                                    {adviser.name}
                                    {ticket.assigned_to === adviser.id && ' ✓'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        ticket.assigned_user ? (
                          <div className="text-xs font-medium text-gray-900">{ticket.assigned_user.name}</div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                          Unassigned
                        </span>
                        )
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                      {formatDate(ticket.updated_at)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/ticket/${ticket.id}`)
                        }}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 py-16">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No tickets found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {search ? `No tickets match "${search}"` : 'Try adjusting your filters or check back later'}
            </p>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} of {total}
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-2 py-1 border border-gray-300 text-xs rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-3 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded">
                {page}/{totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-2 py-1 border border-gray-300 text-xs rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inbox 