import React, { useState, useEffect } from 'react'
import { ticketsAPI, usersAPI, User, Ticket } from '../api/client'

const AdminBulkReassign: React.FC = () => {
  const [advisers, setAdvisers] = useState<User[]>([])
  const [sourceAgentId, setSourceAgentId] = useState<number | null>(null)
  const [targetAgentId, setTargetAgentId] = useState<number | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTickets, setSelectedTickets] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isReassigning, setIsReassigning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchAdvisers()
  }, [])

  useEffect(() => {
    if (sourceAgentId) {
      fetchTickets()
    } else {
      setTickets([])
      setSelectedTickets(new Set())
    }
  }, [sourceAgentId])

  const fetchAdvisers = async () => {
    try {
      const advisersData = await usersAPI.list({ role: 'adviser', is_active: true })
      setAdvisers(advisersData)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch advisers')
    }
  }

  const fetchTickets = async () => {
    if (!sourceAgentId) return
    
    setIsLoading(true)
    setError('')
    try {
      const response = await ticketsAPI.list({
        assigned_to: sourceAgentId,
        status: 'Open',
        page_size: 1000
      })
      setTickets(response.tickets)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch tickets')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedTickets.size === tickets.length) {
      setSelectedTickets(new Set())
    } else {
      setSelectedTickets(new Set(tickets.map(t => t.id)))
    }
  }

  const handleSelectTicket = (ticketId: number) => {
    const newSelected = new Set(selectedTickets)
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId)
    } else {
      newSelected.add(ticketId)
    }
    setSelectedTickets(newSelected)
  }

  const handleBulkReassign = async () => {
    if (!targetAgentId || selectedTickets.size === 0) return

    setIsReassigning(true)
    setError('')
    setSuccess('')

    try {
      let successCount = 0
      let errorCount = 0

      // Reassign each ticket
      for (const ticketId of selectedTickets) {
        try {
          await ticketsAPI.reassign(ticketId, targetAgentId)
          successCount++
        } catch (err) {
          errorCount++
          console.error(`Failed to reassign ticket ${ticketId}:`, err)
        }
      }

      if (errorCount === 0) {
        setSuccess(`Successfully reassigned ${successCount} ticket(s) to the new agent`)
      } else {
        setSuccess(`Reassigned ${successCount} ticket(s). ${errorCount} failed.`)
      }

      // Refresh tickets
      await fetchTickets()
      setSelectedTickets(new Set())
      setTargetAgentId(null)
    } catch (err: any) {
      setError('Failed to complete bulk reassignment')
    } finally {
      setIsReassigning(false)
    }
  }

  const sourceAgent = advisers.find(a => a.id === sourceAgentId)
  const targetAgent = advisers.find(a => a.id === targetAgentId)


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


  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Bulk Ticket Reallocation
        </h1>
        <p className="text-gray-600 text-sm">
          Transfer multiple tickets from one agent to another
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
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Agent Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Select Agents</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source Agent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Agent (Source)
            </label>
            <select
              value={sourceAgentId || ''}
              onChange={(e) => {
                setSourceAgentId(e.target.value ? parseInt(e.target.value) : null)
                setSelectedTickets(new Set())
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select source agent --</option>
              {advisers.map((adviser) => (
                <option key={adviser.id} value={adviser.id}>
                  {adviser.name} ({adviser.email})
                </option>
              ))}
            </select>
            {sourceAgent && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{sourceAgent.name}</span>
              </div>
            )}
          </div>

          {/* Target Agent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Agent (Target)
            </label>
            <select
              value={targetAgentId || ''}
              onChange={(e) => setTargetAgentId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!sourceAgentId}
            >
              <option value="">-- Select target agent --</option>
              {advisers
                .filter(adviser => adviser.id !== sourceAgentId)
                .map((adviser) => (
                  <option key={adviser.id} value={adviser.id}>
                    {adviser.name} ({adviser.email})
                  </option>
                ))}
            </select>
            {targetAgent && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{targetAgent.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {sourceAgentId && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Step 2: Select Tickets to Transfer
            </h2>
            {tickets.length > 0 && (
              <div className="text-sm text-gray-600">
                {selectedTickets.size} of {tickets.length} selected
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading tickets...</div>
            </div>
          ) : tickets.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTickets.size === tickets.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Select All</span>
                </label>

                {selectedTickets.size > 0 && (
                  <button
                    onClick={() => setSelectedTickets(new Set())}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left">
                          <span className="sr-only">Select</span>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Ticket #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Subject
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Priority
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedTickets.has(ticket.id) ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleSelectTicket(ticket.id)}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedTickets.has(ticket.id)}
                              onChange={() => handleSelectTicket(ticket.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            #{ticket.id}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                            {ticket.subject}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {ticket.customer_name || ticket.customer_email.split('@')[0]}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                              ticket.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {ticket.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {ticket.priority?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDate(ticket.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 border border-gray-200 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No open tickets</h3>
              <p className="mt-1 text-sm text-gray-500">
                This agent has no open tickets to reassign
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {sourceAgentId && tickets.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Confirm Transfer</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900">Transfer Summary</h3>
                <div className="mt-2 text-sm text-blue-800">
                  <p>
                    You are about to transfer <strong>{selectedTickets.size} ticket(s)</strong>
                  </p>
                  <p className="mt-1">
                    From: <strong>{sourceAgent?.name}</strong>
                  </p>
                  <p>
                    To: <strong>{targetAgent?.name || '(Please select target agent)'}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => {
                setSourceAgentId(null)
                setTargetAgentId(null)
                setSelectedTickets(new Set())
                setTickets([])
              }}
              disabled={isReassigning}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              onClick={handleBulkReassign}
              disabled={!targetAgentId || selectedTickets.size === 0 || isReassigning}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isReassigning ? 'Transferring...' : `Transfer ${selectedTickets.size} Ticket(s)`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBulkReassign


