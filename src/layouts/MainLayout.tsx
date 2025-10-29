import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-200/20 via-purple-200/20 to-pink-200/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-200/20 via-indigo-200/20 to-purple-200/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};