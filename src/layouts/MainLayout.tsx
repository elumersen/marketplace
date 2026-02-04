import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";

export const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-[#D9E1FF] bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20">
      <Sidebar />
      <div
        className="flex flex-1 flex-col overflow-hidden relative"
        style={{
          backgroundImage:
            "radial-gradient(circle, #5A7BEF15 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 relative z-10">
          <div className="mx-auto min-w-0 max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
