import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative" style={{
        backgroundImage: 'radial-gradient(circle, #5A7BEF15 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <Header />
        
        <main className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};