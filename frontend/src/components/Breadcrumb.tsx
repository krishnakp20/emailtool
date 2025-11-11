import React from 'react'
import { useLocation, Link } from 'react-router-dom'

const Breadcrumb: React.FC = () => {
  const location = useLocation()
  
  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x)
    const breadcrumbs: any[] = []
    
    let currentPath = ''
    
    pathnames.forEach((name, index) => {
      currentPath += `/${name}`
      
      // Convert path to readable name
      let readableName = name
      if (name === 'admin') readableName = 'Admin'
      if (name === 'inbox') readableName = 'Inbox'
      if (name === 'users') readableName = 'Users'
      if (name === 'categories') readableName = 'Categories'
      if (name === 'templates') readableName = 'Templates'
      if (name === 'ticket') readableName = 'Ticket'
      
      breadcrumbs.push({
        name: readableName,
        path: currentPath,
        isLast: index === pathnames.length - 1
      })
    })
    
    return breadcrumbs
  }
  
  const breadcrumbs = generateBreadcrumbs()
  
  if (breadcrumbs.length === 0) {
    return null
  }
  
  return (
    <nav className="bg-gray-50 border-b border-gray-200 px-6 py-3">
      <div className="flex items-center space-x-2 text-sm">
        <Link
          to="/"
          className="text-gray-500 hover:text-gray-700 transition-colors flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </Link>
        
        {breadcrumbs.map((breadcrumb) => (
          <React.Fragment key={breadcrumb.path}>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            
            {breadcrumb.isLast ? (
              <span className="text-gray-900 font-medium">{breadcrumb.name}</span>
            ) : (
              <Link
                to={breadcrumb.path}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {breadcrumb.name}
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  )
}

export default Breadcrumb
