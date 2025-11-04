import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Breadcrumb from './Breadcrumb'
import { SidebarProvider } from '../contexts/SidebarContext'

const Layout: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
          <Breadcrumb />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-3">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default Layout 