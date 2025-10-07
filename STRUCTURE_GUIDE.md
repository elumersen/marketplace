# Ledger Frontend - Structure Guide

## 📊 Sidebar Analysis & Page Categorization

### Navigation Structure

The application has been organized into **7 main sections** with **15 active pages** accessible from the sidebar:

---

## 🏗️ Page Organization by Category

### 1. **Dashboard** (Root Level)
- **Path**: `/`
- **Component**: `src/pages/Dashboard.tsx`
- **Purpose**: Main overview with financial metrics, recent transactions, and quick actions
- **Icon**: LayoutDashboard

---

### 2. **Income Section** (4 pages)
**Purpose**: Sales and revenue management

| Page | Path | Component | Icon | Description |
|------|------|-----------|------|-------------|
| Customers | `/customers` | `src/pages/income/Customers.tsx` | Users | Customer database management |
| Invoices | `/invoices` | `src/pages/income/Invoices.tsx` | FileText | Invoice creation and tracking |
| Receive Payments | `/receive-payments` | `src/pages/income/ReceivePayments.tsx` | DollarSign | Payment receipt management |
| Items & Services | `/items-services` | `src/pages/income/ItemsServices.tsx` | Package | Product/service catalog |

---

### 3. **Expenses Section** (3 pages)
**Purpose**: Purchase and expense management

| Page | Path | Component | Icon | Description |
|------|------|-----------|------|-------------|
| Vendors | `/vendors` | `src/pages/expenses/Vendors.tsx` | Building2 | Vendor database management |
| Bills | `/bills` | `src/pages/expenses/Bills.tsx` | FileText | Vendor bill tracking |
| Bill Payments | `/bill-payments` | `src/pages/expenses/BillPayments.tsx` | CreditCard | Vendor payment management |

---

### 4. **Banking Section** (3 pages)
**Purpose**: Bank account and transaction management

| Page | Path | Component | Icon | Description |
|------|------|-----------|------|-------------|
| Transactions | `/transactions` | `src/pages/banking/Transactions.tsx` | TrendingDown | Transaction list and categorization |
| Registers | `/registers` | `src/pages/banking/Registers.tsx` | BookOpen | Account register views |
| Reconciliations | `/reconciliations` | `src/pages/banking/Reconciliations.tsx` | Landmark | Bank reconciliation |

---

### 5. **Accounting Section** (2 pages)
**Purpose**: Core accounting functions

| Page | Path | Component | Icon | Description |
|------|------|-----------|------|-------------|
| Chart of Accounts | `/chart-of-accounts` | `src/pages/accounting/ChartOfAccounts.tsx` | BarChart3 | Account structure management |
| Journal Entries | `/journal-entries` | `src/pages/accounting/JournalEntries.tsx` | BookOpen | Manual journal entries |

---

### 6. **Reporting Section** (2 pages)
**Purpose**: Financial reports and analysis

| Page | Path | Component | Icon | Description |
|------|------|-----------|------|-------------|
| Profit & Loss | `/profit-loss` | `src/pages/reporting/ProfitLoss.tsx` | TrendingUp | Income statement |
| Balance Sheet | `/balance-sheet` | `src/pages/reporting/BalanceSheet.tsx` | FileText | Financial position |

---

### 7. **Settings**
- **Path**: `/settings`
- **Component**: `src/pages/Settings.tsx`
- **Purpose**: Application and user settings
- **Icon**: Settings

---

## 📁 Updated File Structure

```
ledger-frontend/
├── src/
│   ├── components/
│   │   ├── ui/                    # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   └── separator.tsx
│   │   ├── Header.tsx             # [REMOVED - Integrated into Sidebar]
│   │   ├── Sidebar.tsx            # Navigation with logout button
│   │   └── ProtectedRoute.tsx    # Auth guard
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx        # Authentication state
│   │
│   ├── layouts/
│   │   └── MainLayout.tsx         # Simplified layout (Sidebar + Content)
│   │
│   ├── lib/
│   │   └── utils.ts               # Utility functions
│   │
│   ├── pages/
│   │   ├── Login.tsx              # Authentication page
│   │   ├── Dashboard.tsx          # Main dashboard
│   │   ├── Settings.tsx           # Settings page
│   │   │
│   │   ├── income/                # Income section pages
│   │   │   ├── Customers.tsx
│   │   │   ├── Invoices.tsx
│   │   │   ├── ReceivePayments.tsx
│   │   │   └── ItemsServices.tsx
│   │   │
│   │   ├── expenses/              # Expenses section pages
│   │   │   ├── Vendors.tsx
│   │   │   ├── Bills.tsx
│   │   │   └── BillPayments.tsx
│   │   │
│   │   ├── banking/               # Banking section pages
│   │   │   ├── Transactions.tsx
│   │   │   ├── Registers.tsx
│   │   │   └── Reconciliations.tsx
│   │   │
│   │   ├── accounting/            # Accounting section pages
│   │   │   ├── ChartOfAccounts.tsx
│   │   │   └── JournalEntries.tsx
│   │   │
│   │   └── reporting/             # Reporting section pages
│   │       ├── ProfitLoss.tsx
│   │       └── BalanceSheet.tsx
│   │
│   ├── App.tsx                    # Routing configuration
│   ├── main.tsx                   # Application entry
│   └── index.css                  # Global styles + theme
│
├── public/
├── Configuration files
└── Documentation
```

---

## 🎨 Sidebar Design Features

### Visual Improvements
1. **Cleaner Header**: "Ledger Pro" branding
2. **Section Headers**: Uppercase labels for each category
3. **Active State**: Blue background with white text for active page
4. **Hover State**: Smooth transition on hover
5. **Sign Out Button**: Fixed at bottom with logout icon

### Color Scheme (CSS Variables)
```css
/* Light Mode */
--sidebar: 0 0% 98%              /* Light gray background */
--sidebar-foreground: 222.2 84% 4.9%  /* Dark text */
--sidebar-border: 214.3 31.8% 91.4%   /* Light border */
--sidebar-accent: 221.2 83.2% 53.3%   /* Blue accent */
--sidebar-accent-foreground: 210 40% 98%  /* White text on blue */

/* Dark Mode */
--sidebar: 222.2 84% 4.9%        /* Dark background */
--sidebar-foreground: 210 40% 98%     /* Light text */
--sidebar-border: 217.2 32.6% 17.5%   /* Dark border */
--sidebar-accent: 217.2 91.2% 59.8%   /* Lighter blue */
--sidebar-accent-foreground: 222.2 47.4% 11.2%  /* Dark text on blue */
```

---

## 🔄 Changes from Original Structure

### Removed/Deprecated Pages
These pages existed but were NOT included in the simplified sidebar:
- `Income.tsx` - Overview page (consolidated into Dashboard)
- `Expenses.tsx` - Overview page (consolidated into Dashboard)
- `Proposals.tsx` - Business proposals (removed from nav)
- `TenNinetyNines.tsx` - Tax forms (removed from nav)
- `Banking.tsx` - Overview page (removed from nav)
- `RecurringTransactions.tsx` - Recurring entries (removed from nav)
- `Reports.tsx` - Reports overview (consolidated into specific reports)

### Simplified Layout
- **Removed**: Separate Header component
- **Integrated**: User dropdown functionality into Sidebar with logout button
- **Cleaner**: Single layout component with Sidebar + Content area

---

## 🛣️ Routing Structure

```javascript
// Root
/ → Dashboard

// Income
/customers → Customers
/invoices → Invoices
/receive-payments → ReceivePayments
/items-services → ItemsServices

// Expenses
/vendors → Vendors
/bills → Bills
/bill-payments → BillPayments

// Banking
/transactions → Transactions
/registers → Registers
/reconciliations → Reconciliations

// Accounting
/chart-of-accounts → ChartOfAccounts
/journal-entries → JournalEntries

// Reporting
/profit-loss → ProfitLoss
/balance-sheet → BalanceSheet

// Settings
/settings → Settings
```

---

## 📊 Page Count Summary

| Category | Page Count | Percentage |
|----------|-----------|------------|
| Income | 4 | 26.7% |
| Expenses | 3 | 20.0% |
| Banking | 3 | 20.0% |
| Accounting | 2 | 13.3% |
| Reporting | 2 | 13.3% |
| Dashboard | 1 | 6.7% |
| Settings | 1 | 6.7% |
| **Total** | **15** | **100%** |

---

## 🎯 Benefits of This Structure

### 1. **Logical Organization**
- Pages grouped by business function
- Easy to find related features
- Clear mental model for users

### 2. **Scalability**
- Easy to add new pages to existing categories
- Clear where new features should go
- Maintains consistency

### 3. **Code Organization**
- Related components grouped together
- Easier imports and maintenance
- Better IDE navigation

### 4. **User Experience**
- Intuitive navigation
- Reduced cognitive load
- Professional appearance

---

## 🚀 Usage

### Adding a New Page

1. **Determine Category**: Decide which section (income, expenses, etc.)
2. **Create File**: `src/pages/[category]/NewPage.tsx`
3. **Update Sidebar**: Add entry to navigation array in `Sidebar.tsx`
4. **Update Routes**: Add route in `App.tsx`

Example:
```typescript
// In Sidebar.tsx
{ name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },

// In App.tsx
import { PurchaseOrders } from '@/pages/expenses/PurchaseOrders';
// ...
<Route path="/purchase-orders" element={<PurchaseOrders />} />
```

---

## 📝 Best Practices

1. **File Naming**: Use PascalCase for component files
2. **Component Exports**: Use named exports for consistency
3. **Icons**: Choose appropriate Lucide icons
4. **Paths**: Use kebab-case for URLs
5. **Organization**: Keep related features in same category

---

## 🎨 Customization

### Changing Sidebar Colors
Edit `src/index.css`:
```css
:root {
  --sidebar: your-color-here;
  --sidebar-accent: your-accent-color;
}
```

### Changing Sidebar Width
Edit `src/components/Sidebar.tsx`:
```tsx
<div className="flex h-screen w-64 flex-col ...">
// Change w-64 to w-72, w-80, etc.
```

### Adding Section Separators
In `Sidebar.tsx` navigation array:
```typescript
{ section: 'Your Section Name' },
```

---

This structure provides a clean, professional, and maintainable foundation for your ledger application! 🎉

