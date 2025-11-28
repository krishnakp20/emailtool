import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Sidebar: React.FC = () => {
  const { currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'admin'

  return (
    <div className="w-52 bg-white shadow-lg border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-800">Helpdesk</h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Inbox Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-1">
            Inbox
          </h3>
          <div className="space-y-0.5">
            <NavLink
              to="/send-email"
              className={({ isActive }) =>
                `flex items-center px-2 py-1.5 text-sm rounded ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send E-mail
            </NavLink>

            <NavLink
              to="/inbox"
              className={({ isActive }) =>
                `flex items-center px-2 py-1.5 text-sm rounded ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              All Tickets
            </NavLink>

            <NavLink
              to="/inbox?unassigned=true"
              className={({ isActive }) =>
                `flex items-center px-2 py-1.5 text-sm rounded ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Unassigned
            </NavLink>
            <NavLink
              to="/inbox?status=Open"
              className={({ isActive }) =>
                `flex items-center px-2 py-1.5 text-sm rounded ${
                  isActive
                    ? 'bg-green-100 text-green-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Open
            </NavLink>
            <NavLink
              to="/inbox?status=Pending"
              className={({ isActive }) =>
                `flex items-center px-2 py-1.5 text-sm rounded ${
                  isActive
                    ? 'bg-yellow-100 text-yellow-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
              Pending
            </NavLink>
            <NavLink
              to="/inbox?status=Closed"
              className={({ isActive }) =>
                `flex items-center px-2 py-1.5 text-sm rounded ${
                  isActive
                    ? 'bg-gray-100 text-gray-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
              Closed
            </NavLink>
          </div>
        </div>

        {/* Priority Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-1">
            Priority
          </h3>
          <div className="space-y-0.5">
            <NavLink
              to="/inbox?priority_id=1"
              className={({ isActive }) =>
                `flex items-center px-2 py-1.5 text-sm rounded ${
                  isActive
                    ? 'bg-red-100 text-red-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              High
            </NavLink>
            <NavLink
              to="/inbox?priority_id=2"
              className={({ isActive }) =>
                `flex items-center px-2 py-1.5 text-sm rounded ${
                  isActive
                    ? 'bg-yellow-100 text-yellow-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
              Medium
            </NavLink>
            <NavLink
              to="/inbox?priority_id=3"
              className={({ isActive }) =>
                `flex items-center px-2 py-1.5 text-sm rounded ${
                  isActive
                    ? 'bg-green-100 text-green-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Low
            </NavLink>
          </div>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-1">
              Admin
            </h3>
            <div className="space-y-0.5">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center px-2 py-1.5 text-sm rounded ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Dashboard
              </NavLink>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `flex items-center px-2 py-1.5 text-sm rounded ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Users
              </NavLink>
              <NavLink
                to="/admin/categories"
                className={({ isActive }) =>
                  `flex items-center px-2 py-1.5 text-sm rounded ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Categories
              </NavLink>
              <NavLink
                to="/admin/templates"
                className={({ isActive }) =>
                  `flex items-center px-2 py-1.5 text-sm rounded ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Templates
              </NavLink>
              <NavLink
                to="/admin/blocked-senders"
                className={({ isActive }) =>
                  `flex items-center px-2 py-1.5 text-sm rounded ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Blocked Senders
              </NavLink>
              <NavLink
                to="/admin/bulk-reassign"
                className={({ isActive }) =>
                  `flex items-center px-2 py-1.5 text-sm rounded ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Bulk Reassign
              </NavLink>
              <NavLink
                  to="/admin/bulk-emails"
                  className={({ isActive }) =>
                    `flex items-center px-2 py-1.5 text-sm rounded ${
                      isActive
                        ? 'bg-purple-100 text-purple-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
              >
                  {/* Bulk Email Icon */}
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2v-5M3 12v7a2 2 0 002 2h14"
                    />
                  </svg>

                  Bulk Emails
              </NavLink>

              <NavLink
                to="/admin/exports"
                className={({ isActive }) =>
                  `flex items-center px-2 py-1.5 text-sm rounded ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Data Exports
              </NavLink>
              <NavLink
                to="/admin/instagram"
                className={({ isActive }) =>
                  `flex items-center px-2 py-1.5 text-sm rounded ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </NavLink>
            </div>
          </div>
        )}
      </nav>
    </div>
  )
}

export default Sidebar
