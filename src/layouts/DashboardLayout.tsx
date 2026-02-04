import React from "react";
import { Link } from "react-router-dom";
import { LogOut, Leaf, Wallet } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { ConnectButton, useCurrentAccount, useCurrentWallet, useDisconnectWallet } from '@mysten/dapp-kit';

const DashboardLayout = ({ children, role }: { children: React.ReactNode; role: string }) => {
  const { logout } = useAuth(); // Lấy hàm logout từ AuthContext
  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const { mutate: disconnect } = useDisconnectWallet();

  const links =
    role === "farmer"
      ? [
          { path: "/farmer/dashboard", label: "Tổng quan" },
          { path: "/farmer/orders", label: "Đơn hàng" },
          { path: "/farmer/products", label: "Sản phẩm" },
          { path: "/farmer/profile", label: "Hồ sơ" },
        ]
      : [];

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      <aside className="w-64 bg-green-700 text-white p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Leaf className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold">GreenTrace</h2>
          </div>
          <nav className="space-y-2">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block px-4 py-2 rounded-lg hover:bg-green-600 transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Wallet Section */}
        <div className="space-y-2">
          {connectionStatus === 'connected' ? (
            <div className="bg-green-800/50 rounded-lg p-3 border border-green-600">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-green-300" />
                <p className="text-xs text-green-300">Ví Sui</p>
              </div>
              <p className="text-xs font-mono text-white mb-3">
                {currentAccount?.address 
                  ? `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}`
                  : ''}
              </p>
              <Button
                onClick={() => disconnect()}
                variant="outline"
                size="sm"
                className="w-full text-xs bg-red-500/20 border-red-400 text-red-200 hover:bg-red-500/30"
              >
                Đăng xuất ví
              </Button>
            </div>
          ) : (
            <div className="bg-green-800/50 rounded-lg p-3 border border-green-600">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-green-300" />
                <p className="text-xs text-green-300">Ví Sui</p>
              </div>
              <ConnectButton className="w-full text-xs" />
            </div>
          )}
        
        <Button
          onClick={logout} // Sử dụng logout từ AuthContext
          variant="destructive"
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 w-full"
        >
          <LogOut /> Đăng xuất
        </Button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
};

export default DashboardLayout;
