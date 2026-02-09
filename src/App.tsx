import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanySettingsProvider } from '@/contexts/CompanySettingsContext';
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
import { Proposals } from '@/pages/income/Proposals';
import { Deposits } from "@/pages/income/Deposits";
// Expenses pages
import { Vendors } from '@/pages/expenses/Vendors';
import { Bills } from '@/pages/expenses/Bills';
import { BillPayments } from '@/pages/expenses/BillPayments';
import { _1099s } from '@/pages/expenses/1099s';
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
import { RecurringTransactions } from '@/pages/accounting/RecurringTransactions';

function App() {
  return (
    <AuthProvider>
      <CompanySettingsProvider>
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
              <Route path="/proposals" element={<Proposals />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/receive-payments" element={<ReceivePayments />} />
              <Route path="/deposits" element={<Deposits />} />
              <Route path="/catalog" element={<ItemsServices />} />
              <Route path="/products-services" element={<Navigate to="/catalog" replace />} />
              
              {/* Expenses */}
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/bill-payments" element={<BillPayments />} />
              <Route path="/1099s" element={<_1099s />} />
              {/* Banking */}
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/registers" element={<Registers />} />
              <Route path="/registers/:accountId" element={<Registers />} />
              <Route path="/reconciliations" element={<Reconciliations />} />
              
              {/* Accounting */}
              <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
              <Route path="/journal-entries" element={<JournalEntries />} />
              <Route path="/recurring-transactions" element={<RecurringTransactions />} />
              
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
      </CompanySettingsProvider>
    </AuthProvider>
  );
}

export default App;

