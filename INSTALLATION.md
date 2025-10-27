# Installation Guide

## Quick Start

Follow these steps to get your Ledger frontend up and running:

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React 18 and React DOM
- React Router for routing
- Tailwind CSS for styling
- Shadcn UI components
- Lucide React for icons
- TypeScript for type safety
- Vite for fast development

### 2. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 3. Login

Use any email and password to login. The authentication is currently set up for demonstration purposes and will accept any credentials.

## Available Scripts

- `npm run dev` - Starts the development server with hot module replacement
- `npm run build` - Creates an optimized production build
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check for code issues

## Project Features

### Authentication
- ✅ Login page with email/password authentication
- ✅ Protected routes that require authentication
- ✅ User session management with localStorage
- ✅ Logout functionality

### Navigation
- ✅ Responsive sidebar with organized menu sections
- ✅ Active route highlighting
- ✅ User profile dropdown in header

### Feature Pages (All Implemented)

**Sales Management**
- Dashboard (with financial metrics and quick actions)
- Income tracking
- Customer management
- Invoice management
- Payment receipts
- Business proposals
- Items & Services catalog

**Purchase Management**
- Expense tracking
- Vendor management
- Bill management
- Bill payments
- 1099 form management

**Banking**
- Bank account management
- Transaction tracking
- Account registers
- Bank reconciliation

**Accounting**
- Chart of Accounts
- Journal Entries
- Recurring Transactions

**Reporting**
- Profit & Loss statements
- Balance Sheet
- Reports overview

**Settings**
- Profile settings
- Company configuration
- Security settings

## Technology Stack

- **React 18** - Latest React with hooks and concurrent features
- **TypeScript** - Full type safety throughout the application
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - High-quality, accessible component library
- **React Router v6** - Modern routing solution
- **Lucide React** - Beautiful, consistent icon set

## File Structure

```
ledger-frontend/
├── public/                  # Static assets
├── src/
│   ├── components/         
│   │   ├── ui/            # Shadcn UI components
│   │   ├── Header.tsx     # Top navigation bar
│   │   ├── Sidebar.tsx    # Left navigation menu
│   │   └── ProtectedRoute.tsx
│   ├── contexts/          
│   │   └── AuthContext.tsx # Authentication state management
│   ├── layouts/           
│   │   └── MainLayout.tsx  # Main app layout with sidebar
│   ├── lib/               
│   │   └── utils.ts        # Utility functions
│   ├── pages/             # All feature pages (23 pages total)
│   ├── App.tsx            # Main app with routing
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles and Tailwind
├── components.json         # Shadcn UI configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── package.json           # Dependencies and scripts
```

## Next Steps

1. **Backend Integration**: Connect to your actual backend API
   - Update `AuthContext.tsx` to call your authentication endpoints
   - Add API service layer for data fetching

2. **Enhanced Features**: Add functionality to placeholder pages
   - Implement forms for creating/editing records
   - Add data tables with sorting and filtering
   - Implement real-time data updates

3. **State Management**: Consider adding a state management solution
   - React Query for server state
   - Zustand or Redux for complex client state

4. **Testing**: Add tests for components and features
   - Vitest for unit tests
   - React Testing Library for component tests
   - Playwright or Cypress for E2E tests

## Troubleshooting

### Port Already in Use
If port 5173 is already in use, Vite will automatically try the next available port.

### TypeScript Errors
Make sure all dependencies are installed with `npm install`. Most TypeScript errors are due to missing dependencies.

### Hot Module Replacement Issues
If HMR stops working, try:
1. Save the file again
2. Restart the dev server
3. Clear browser cache

## Support

For issues or questions about the implementation, refer to:
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Shadcn UI Documentation](https://ui.shadcn.com)

