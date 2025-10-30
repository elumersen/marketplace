import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MainLayout } from '@/layouts/MainLayout';
import { Toaster } from '@/components/ui/toaster';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
// Income pages
import { Customers } from '@/pages/income/Customers';
import { Invoices } from '@/pages/income/Invoices';
import { ReceivePayments } from '@/pages/income/ReceivePayments';
import { ItemsServices } from '@/pages/income/ItemsServices';
// Expenses pages
import { Vendors } from '@/pages/expenses/Vendors';
import { Bills } from '@/pages/expenses/Bills';
import { BillPayments } from '@/pages/expenses/BillPayments';
// Banking pages
import { Transactions } from '@/pages/banking/Transactions';
import { Registers } from '@/pages/banking/Registers';
import { Reconciliations } from '@/pages/banking/Reconciliations';
// Accounting pages
import { ChartOfAccounts } from '@/pages/accounting/ChartOfAccounts';
import { JournalEntries } from '@/pages/accounting/JournalEntries';
// Reporting pages
import { ProfitLoss } from '@/pages/reporting/ProfitLoss';
import { BalanceSheet } from '@/pages/reporting/BalanceSheet';
// Settings
import { Settings } from '@/pages/Settings';
import { TooltipProvider } from '@/components/ui/tooltip';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TooltipProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Main */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Income */}
              <Route path="/customers" element={<Customers />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/receive-payments" element={<ReceivePayments />} />
              <Route path="/items-services" element={<ItemsServices />} />
              
              {/* Expenses */}
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/bill-payments" element={<BillPayments />} />
              
              {/* Banking */}
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/registers" element={<Registers />} />
              <Route path="/registers/:accountId" element={<Registers />} />
              <Route path="/reconciliations" element={<Reconciliations />} />
              
              {/* Accounting */}
              <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
              <Route path="/journal-entries" element={<JournalEntries />} />
              
              {/* Reporting */}
              <Route path="/profit-loss" element={<ProfitLoss />} />
              <Route path="/balance-sheet" element={<BalanceSheet />} />
              
              {/* Settings */}
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
          <Toaster />
        </TooltipProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

