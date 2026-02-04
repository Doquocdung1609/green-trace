import { Link } from 'react-router-dom';

const TestIndex = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-emerald-600">
          🌱 Green Trace - Sui Migration Testing
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Mint NFT cơ bản */}
          <Link
            to="/test/sui"
            className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:shadow-lg transition-all duration-300 border-2 border-blue-200 hover:border-blue-400"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl">
                🧪
              </div>
              <h2 className="text-xl font-bold text-gray-800">Test Mint NFT (Cơ bản)</h2>
            </div>
            <p className="text-gray-600 mb-3">
              Mint NFT đơn giản với thông tin cơ bản để test smart contract
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm">Quick Test</span>
              <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm">✅ Working</span>
            </div>
          </Link>

          {/* AddProduct */}
          <Link
            to="/farmer/add-product"
            className="group p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl hover:shadow-lg transition-all duration-300 border-2 border-emerald-200 hover:border-emerald-400"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl">
                🚜
              </div>
              <h2 className="text-xl font-bold text-gray-800">Add Product</h2>
            </div>
            <p className="text-gray-600 mb-3">
              Thêm sản phẩm với đầy đủ tính năng: upload ảnh, chứng nhận, timeline, IoT data trên Sui blockchain
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm">Full Features</span>
              <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm">✅ Production</span>
            </div>
          </Link>

          {/* Update NFT */}
          <Link
            to="/farmer/update-nft"
            className="group p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl hover:shadow-lg transition-all duration-300 border-2 border-indigo-200 hover:border-indigo-400"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl">
                🔄
              </div>
              <h2 className="text-xl font-bold text-gray-800">Update NFT</h2>
            </div>
            <p className="text-gray-600 mb-3">
              Cập nhật thông tin NFT: IoT data, ROI, giá, số lượng, tuổi, mô tả
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-indigo-200 text-indigo-800 rounded-full text-sm">Update Feature</span>
              <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm">✅ New</span>
            </div>
          </Link>

          {/* Documentation */}
          <a
            href="/HUONG_DAN_ADD_PRODUCT_SUI.md"
            target="_blank"
            className="group p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl hover:shadow-lg transition-all duration-300 border-2 border-orange-200 hover:border-orange-400"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl">
                📚
              </div>
              <h2 className="text-xl font-bold text-gray-800">Hướng Dẫn Sử Dụng</h2>
            </div>
            <p className="text-gray-600 mb-3">
              Tài liệu chi tiết về cách sử dụng và troubleshooting
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-sm">Documentation</span>
              <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm">📖 Guide</span>
            </div>
          </a>
        </div>

        {/* Info Panel */}
        <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-gray-800">📊 Migration Status</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <span className="text-gray-700">Smart Contract v2 deployed</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <span className="text-gray-700">Frontend component migrated</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <span className="text-gray-700">IPFS integration working</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <span className="text-gray-700">Full product info support</span>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-white rounded-lg border border-gray-300">
            <p className="text-sm text-gray-600">
              <strong>Package ID:</strong><br/>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                0x8f8459de97c57ffef07e8b3bb71dfe28b4e8358025979e629f2eeec5c9b19e50
              </code>
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 flex justify-center gap-4">
          <a
            href="https://suiscan.xyz/devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Suiscan Explorer
          </a>
          <a
            href="https://discord.com/invite/sui"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            SUI Faucet
          </a>
        </div>
      </div>
    </div>
  );
};

export default TestIndex;
