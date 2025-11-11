import React from 'react'
import { Link } from 'react-router-dom'
import { Ticket, ticketsAPI } from '../api/client'
import TagPills from './TagPills'

interface TicketRowProps {
  ticket: Ticket
  onTicketUpdate?: (ticketId: number, updates: Partial<Ticket>) => void
}

const TicketRow: React.FC<TicketRowProps> = ({ ticket, onTicketUpdate }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const _getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-green-100 text-green-800'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'Closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleUpdate = async (updates: Partial<Ticket>) => {
    try {
      const updatedTicket = await ticketsAPI.update(ticket.id, updates)
      if (onTicketUpdate) {
        onTicketUpdate(ticket.id, updatedTicket)
      }
    } catch (error) {
      console.error('Failed to update ticket:', error)
    }
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {ticket.customer_name || ticket.customer_email.split('@')[0]}
        </div>
        <div className="text-sm text-gray-500">{ticket.customer_email}</div>
      </td>
      
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 font-medium">
          <Link 
            to={`/ticket/${ticket.id}`}
            className="hover:text-blue-600 hover:underline"
          >
            {ticket.subject}
          </Link>
        </div>
        <TagPills ticket={ticket} editable={true} onUpdate={handleUpdate} />
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={ticket.assigned_to || ''}
          onChange={(e) => handleUpdate({ assigned_to: e.target.value ? parseInt(e.target.value) : undefined })}
          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Unassigned</option>
          <option value="1">admin</option>
          {/* TODO: Load users dynamically */}
        </select>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        #{ticket.id}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={ticket.status}
          onChange={(e) => handleUpdate({ status: e.target.value as any })}
          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="Open">Open</option>
          <option value="Pending">Pending</option>
          <option value="Closed">Closed</option>
        </select>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDate(ticket.updated_at)}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDate(ticket.created_at)}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <Link
          to={`/ticket/${ticket.id}`}
          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          View
        </Link>
      </td>
    </tr>
  )
}

export default TicketRow 