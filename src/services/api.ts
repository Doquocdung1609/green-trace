import { Connection, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import type { Order, Product } from '../types/types';


const PRODUCTS_KEY = 'products';

const initialProducts: Product[] = [
    {
      id: '1',
      name: 'Cà phê Đắk Lắk',
      price: 200000,
      image: 'https://daklakmuseum.vn/baotangdaklak/imgs/166682075163094.jpeg',
      origin: 'Đắk Lắk',
      farmerName: 'Nguyễn Văn A',
      productionDate: '08/2025',
      timeline: [
        { title: 'Trồng trọt', desc: 'Canh tác hữu cơ tại nông trại đạt chuẩn VietGAP, sử dụng phân bón tự nhiên.', date: '01/08/2025', location: 'Nông trại Buôn Ma Thuột, Đắk Lắk', responsible: 'Nguyễn Văn A', details: 'Đất được kiểm tra pH và dinh dưỡng định kỳ.' },
        { title: 'Thu hoạch', desc: 'Thu hoạch thủ công, chọn lọc hạt cà phê chín mọng.', date: '15/09/2025', location: 'Nông trại Buôn Ma Thuột, Đắk Lắk', responsible: 'Nhóm thu hoạch địa phương' },
        { title: 'Vận chuyển', desc: 'Vận chuyển bằng xe lạnh để giữ độ tươi.', date: '17/09/2025', location: 'Từ Đắk Lắk đến kho trung tâm', responsible: 'Công ty vận tải X' },
        { title: 'Kiểm định', desc: 'Kiểm tra chất lượng và chứng nhận VietGAP.', date: '18/09/2025', location: 'Trung tâm kiểm định TP. HCM', responsible: 'Cơ quan chứng nhận VietGAP' },
        { title: 'Phân phối', desc: 'Phân phối đến các nhà bán lẻ.', date: '19/09/2025', location: 'Kho trung tâm TP. HCM', responsible: 'Nhà phân phối Y' },
        { title: 'Bàn ăn', desc: 'Sẵn sàng cho người tiêu dùng thưởng thức.', date: '20/09/2025', location: 'Cửa hàng bán lẻ', responsible: 'Nhà bán lẻ Z' },
      ],
      quantity: 500,
      description: 'Cà phê robusta chất lượng cao, hương vị đậm đà từ vùng đất bazan Đắk Lắk.',
      certifications: [
        { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
        { name: 'Organic', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      ],
      blockchainTxId: 'tx-1234567890',
    },
    {
      id: '2',
      name: 'Rau cải xanh',
      price: 30000,
      image: 'https://product.hstatic.net/1000354044/product/e67ea114189ed254f3c8534857bfea25_13e759bd88d348ec992725c28d788b08_master.jpg',
      origin: 'Đà Lạt',
      farmerName: 'Trần Thị B',
      productionDate: '07/2025',
      timeline: [
        { title: 'Trồng trọt', desc: 'Trồng trong nhà kính, không sử dụng thuốc trừ sâu hóa học.', date: '01/07/2025', location: 'Nông trại Đà Lạt, Lâm Đồng', responsible: 'Trần Thị B', details: 'Sử dụng hệ thống tưới nhỏ giọt tiết kiệm nước.' },
        { title: 'Thu hoạch', desc: 'Thu hoạch vào buổi sáng sớm để giữ độ giòn.', date: '20/08/2025', location: 'Nông trại Đà Lạt, Lâm Đồng', responsible: 'Nhóm thu hoạch' },
        { title: 'Vận chuyển', desc: 'Vận chuyển nhanh chóng trong ngày.', date: '21/08/2025', location: 'Từ Đà Lạt đến TP. HCM', responsible: 'Vận tải Z' },
        { title: 'Kiểm định', desc: 'Kiểm tra dư lượng thuốc bảo vệ thực vật.', date: '22/08/2025', location: 'Lab kiểm định Đà Lạt', responsible: 'Cơ quan VietGAP' },
        { title: 'Phân phối', desc: 'Đưa đến các chợ và siêu thị.', date: '23/08/2025', location: 'Kho TP. HCM', responsible: 'Phân phối A' },
        { title: 'Bàn ăn', desc: 'Tươi ngon cho bữa ăn gia đình.', date: '24/08/2025', location: 'Người tiêu dùng', responsible: 'Nhà bán lẻ B' },
      ],
      quantity: 1000,
      description: 'Rau cải xanh tươi, giàu vitamin từ khí hậu mát mẻ Đà Lạt.',
      certifications: [
        { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      ],
      blockchainTxId: 'tx-0987654321',
    },
    {
      id: '3',
      name: 'Xoài Cát Hòa Lộc',
      price: 50000,
      image: 'https://cdn.tgdd.vn/Files/2017/12/03/1047079/nguon-goc-xoai-cat-hoa-loc-va-cach-chon-xoai-cat-hoa-loc-tuoi-ngon-202302251337264013.jpg',
      origin: 'Tiền Giang',
      farmerName: 'Lê Văn C',
      productionDate: '06/2025',
      timeline: [
        { title: 'Trồng trọt', desc: 'Chăm sóc cây theo phương pháp hữu cơ.', date: '01/06/2025', location: 'Vườn Hòa Lộc, Tiền Giang', responsible: 'Lê Văn C' },
        { title: 'Thu hoạch', desc: 'Chọn quả chín cây.', date: '10/09/2025', location: 'Vườn Hòa Lộc, Tiền Giang', responsible: 'Nhóm thu hoạch' },
        { title: 'Vận chuyển', desc: 'Đóng gói cẩn thận và vận chuyển.', date: '11/09/2025', location: 'Từ Tiền Giang đến kho', responsible: 'Vận tải B' },
        { title: 'Kiểm định', desc: 'Kiểm tra chất lượng quả.', date: '12/09/2025', location: 'Trung tâm kiểm định', responsible: 'Cơ quan kiểm định' },
        { title: 'Phân phối', desc: 'Phân phối rộng rãi.', date: '13/09/2025', location: 'Kho trung tâm', responsible: 'Phân phối C' },
        { title: 'Bàn ăn', desc: 'Ngọt ngon cho người dùng.', date: '14/09/2025', location: 'Cửa hàng bán lẻ', responsible: 'Nhà bán lẻ D' },
      ],
      quantity: 0,
      description: 'Xoài cát thơm ngon, vị ngọt đặc trưng từ Tiền Giang.',
      certifications: [
        { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
        { name: 'GlobalGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      ],
      blockchainTxId: 'tx-1122334455',
    },
    {
      id: '4',
      name: 'Rau má',
      price: 45000,
      image: 'https://file.dacsanxuthanh.vn/2023/05/30/s-20210602-144322-287677-rau-ma-max-1800x1800.jpg',
      origin: 'Thanh Hóa',
      farmerName: 'Phạm Thị D',
      productionDate: '05/2025',
      timeline: [
        { title: 'Trồng trọt', desc: 'Trồng trên đất phù sa, tưới nước sạch.', date: '01/05/2025', location: 'Nông trại Thanh Hóa', responsible: 'Phạm Thị D', details: 'Không sử dụng hóa chất.' },
        { title: 'Thu hoạch', desc: 'Thu hoạch bằng tay, đảm bảo lá tươi.', date: '10/06/2025', location: 'Nông trại Thanh Hóa', responsible: 'Nhóm thu hoạch' },
        { title: 'Vận chuyển', desc: 'Vận chuyển nhanh bằng xe chuyên dụng.', date: '11/06/2025', location: 'Từ Thanh Hóa đến Hà Nội', responsible: 'Vận tải D' },
        { title: 'Kiểm định', desc: 'Kiểm tra chất lượng rau.', date: '12/06/2025', location: 'Trung tâm kiểm định Hà Nội', responsible: 'Cơ quan VietGAP' },
        { title: 'Phân phối', desc: 'Đưa đến các siêu thị.', date: '13/06/2025', location: 'Kho Hà Nội', responsible: 'Phân phối E' },
        { title: 'Bàn ăn', desc: 'Tươi ngon, bổ dưỡng.', date: '14/06/2025', location: 'Người tiêu dùng', responsible: 'Nhà bán lẻ F' },
      ],
      quantity: 200,
      description: 'Rau má tươi, tốt cho sức khỏe, giàu chất xơ.',
      certifications: [
        { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      ],
      blockchainTxId: 'tx-6677889900',
    },
    {
      id: '5',
      name: 'Sầu riêng Ri6',
      price: 120000,
      image: 'https://product.hstatic.net/200000157781/product/sau_rieng_ri6_977b4b436948421fabd583bbd83f2fb8.png',
      origin: 'Đắk Nông',
      farmerName: 'Nguyễn Thị E',
      productionDate: '04/2025',
      timeline: [
        { title: 'Trồng trọt', desc: 'Chăm sóc theo tiêu chuẩn hữu cơ.', date: '01/04/2025', location: 'Vườn Đắk Nông', responsible: 'Nguyễn Thị E', details: 'Sử dụng phân bón hữu cơ.' },
        { title: 'Thu hoạch', desc: 'Chọn quả chín tự nhiên.', date: '20/07/2025', location: 'Vườn Đắk Nông', responsible: 'Nhóm thu hoạch' },
        { title: 'Vận chuyển', desc: 'Vận chuyển trong điều kiện bảo quản lạnh.', date: '21/07/2025', location: 'Từ Đắk Nông đến TP. HCM', responsible: 'Vận tải F' },
        { title: 'Kiểm định', desc: 'Kiểm tra chất lượng và độ ngọt.', date: '22/07/2025', location: 'Trung tâm kiểm định TP. HCM', responsible: 'Cơ quan kiểm định' },
        { title: 'Phân phối', desc: 'Phân phối đến các chợ đầu mối.', date: '23/07/2025', location: 'Kho TP. HCM', responsible: 'Phân phối G' },
        { title: 'Bàn ăn', desc: 'Hương vị đặc trưng, thơm ngon.', date: '24/07/2025', location: 'Người tiêu dùng', responsible: 'Nhà bán lẻ H' },
      ],
      quantity: 300,
      description: 'Sầu riêng Ri6 thơm ngon, béo ngậy từ Đắk Nông.',
      certifications: [
        { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
        { name: 'Organic', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      ],
      blockchainTxId: 'tx-9988776655',
    },
    {
      id: '6',
      name: 'Bắp cải tím',
      price: 25000,
      image: 'https://nongsandalat.vn/wp-content/uploads/2021/10/bap_cai_tim_da_lat-570x421-1.jpg',
      origin: 'Đà Lạt',
      farmerName: 'Trần Văn F',
      productionDate: '03/2025',
      timeline: [
        { title: 'Trồng trọt', desc: 'Trồng trong nhà kính, không hóa chất.', date: '01/03/2025', location: 'Nông trại Đà Lạt', responsible: 'Trần Văn F', details: 'Tưới bằng hệ thống tự động.' },
        { title: 'Thu hoạch', desc: 'Thu hoạch đúng độ chín.', date: '15/04/2025', location: 'Nông trại Đà Lạt', responsible: 'Nhóm thu hoạch' },
        { title: 'Vận chuyển', desc: 'Vận chuyển bằng xe lạnh.', date: '16/04/2025', location: 'Từ Đà Lạt đến TP. HCM', responsible: 'Vận tải H' },
        { title: 'Kiểm định', desc: 'Kiểm tra chất lượng rau.', date: '17/04/2025', location: 'Lab kiểm định Đà Lạt', responsible: 'Cơ quan VietGAP' },
        { title: 'Phân phối', desc: 'Phân phối đến các siêu thị.', date: '18/04/2025', location: 'Kho TP. HCM', responsible: 'Phân phối I' },
        { title: 'Bàn ăn', desc: 'Tươi ngon, bổ dưỡng.', date: '19/04/2025', location: 'Người tiêu dùng', responsible: 'Nhà bán lẻ J' },
      ],
      quantity: 800,
      description: 'Bắp cải tím giòn, giàu dinh dưỡng từ Đà Lạt.',
      certifications: [
        { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      ],
      blockchainTxId: 'tx-5544332211',
    },
    {
      id: '7',
      name: 'Chôm chôm',
      price: 35000,
      image: 'https://thuyanhfruits.com/wp-content/uploads/2021/02/unnamed.png',
      origin: 'Vĩnh Long',
      farmerName: 'Lê Thị G',
      productionDate: '02/2025',
      timeline: [
        { title: 'Trồng trọt', desc: 'Chăm sóc cây theo phương pháp tự nhiên.', date: '01/02/2025', location: 'Vườn Vĩnh Long', responsible: 'Lê Thị G', details: 'Không sử dụng thuốc trừ sâu.' },
        { title: 'Thu hoạch', desc: 'Chọn quả chín mọng.', date: '10/05/2025', location: 'Vườn Vĩnh Long', responsible: 'Nhóm thu hoạch' },
        { title: 'Vận chuyển', desc: 'Đóng gói và vận chuyển nhanh.', date: '11/05/2025', location: 'Từ Vĩnh Long đến TP. HCM', responsible: 'Vận tải J' },
        { title: 'Kiểm định', desc: 'Kiểm tra chất lượng trái cây.', date: '12/05/2025', location: 'Trung tâm kiểm định', responsible: 'Cơ quan kiểm định' },
        { title: 'Phân phối', desc: 'Phân phối đến các chợ.', date: '13/05/2025', location: 'Kho TP. HCM', responsible: 'Phân phối K' },
        { title: 'Bàn ăn', desc: 'Ngọt, mọng nước.', date: '14/05/2025', location: 'Người tiêu dùng', responsible: 'Nhà bán lẻ L' },
      ],
      quantity: 400,
      description: 'Chôm chôm ngọt, mọng nước từ Vĩnh Long.',
      certifications: [
        { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      ],
      blockchainTxId: 'tx-3322110099',
    },
    {
      id: '8',
      name: 'Rau muống',
      price: 20000,
      image: 'https://suckhoedoisong.qltns.mediacdn.vn/324455921873985536/2023/9/6/14-cong-dung-tuyet-voi-cua-rau-muong-voi-suc-khoe-anh2-16940033928751881268635.jpg',
      origin: 'Đồng Nai',
      farmerName: 'Nguyễn Văn H',
      productionDate: '01/2025',
      timeline: [
        { title: 'Trồng trọt', desc: 'Trồng trên đất sạch, tưới nước sông.', date: '01/01/2025', location: 'Nông trại Đồng Nai', responsible: 'Nguyễn Văn H', details: 'Không sử dụng thuốc trừ sâu.' },
        { title: 'Thu hoạch', desc: 'Thu hoạch vào sáng sớm.', date: '15/02/2025', location: 'Nông trại Đồng Nai', responsible: 'Nhóm thu hoạch' },
        { title: 'Vận chuyển', desc: 'Vận chuyển nhanh đến chợ.', date: '16/02/2025', location: 'Từ Đồng Nai đến TP. HCM', responsible: 'Vận tải L' },
        { title: 'Kiểm định', desc: 'Kiểm tra chất lượng rau.', date: '17/02/2025', location: 'Lab kiểm định TP. HCM', responsible: 'Cơ quan VietGAP' },
        { title: 'Phân phối', desc: 'Phân phối đến các siêu thị.', date: '18/02/2025', location: 'Kho TP. HCM', responsible: 'Phân phối M' },
        { title: 'Bàn ăn', desc: 'Tươi ngon cho bữa ăn.', date: '19/02/2025', location: 'Người tiêu dùng', responsible: 'Nhà bán lẻ N' },
      ],
      quantity: 1200,
      description: 'Rau muống tươi, giòn, giàu chất xơ từ Đồng Nai.',
      certifications: [
        { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      ],
      blockchainTxId: 'tx-7766554433',
    },
    {
      id: '9',
      name: 'Hạt điều Bình Phước',
      price: 180000,
      image: 'https://dacsandalat.com.vn/wp-content/uploads/2024/10/hat-dieu-rang-muoi-q_optimized.jpg',
      origin: 'Bình Phước',
      farmerName: 'Trần Thị I',
      productionDate: '12/2024',
      timeline: [
        { title: 'Trồng trọt', desc: 'Chăm sóc cây điều hữu cơ.', date: '01/12/2024', location: 'Nông trại Bình Phước', responsible: 'Trần Thị I', details: 'Sử dụng phân bón tự nhiên.' },
        { title: 'Thu hoạch', desc: 'Thu hoạch hạt điều chín.', date: '10/03/2025', location: 'Nông trại Bình Phước', responsible: 'Nhóm thu hoạch' },
        { title: 'Vận chuyển', desc: 'Vận chuyển đến nhà máy chế biến.', date: '11/03/2025', location: 'Từ Bình Phước đến TP. HCM', responsible: 'Vận tải N' },
        { title: 'Kiểm định', desc: 'Kiểm tra chất lượng hạt.', date: '12/03/2025', location: 'Trung tâm kiểm định TP. HCM', responsible: 'Cơ quan kiểm định' },
        { title: 'Phân phối', desc: 'Phân phối đến các cửa hàng.', date: '13/03/2025', location: 'Kho TP. HCM', responsible: 'Phân phối O' },
        { title: 'Bàn ăn', desc: 'Thơm ngon, béo bùi.', date: '14/03/2025', location: 'Người tiêu dùng', responsible: 'Nhà bán lẻ P' },
      ],
      quantity: 600,
      description: 'Hạt điều rang muối thơm ngon từ Bình Phước.',
      certifications: [
        { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
        { name: 'Organic', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      ],
      blockchainTxId: 'tx-8877665544',
    },
    {
      id: '10',
      name: 'Thanh long ruột đỏ',
      price: 40000,
      image: 'https://bizweb.dktcdn.net/100/390/808/products/thanh-long-600x600.jpg?v=1600505776873',
      origin: 'Bình Thuận',
      farmerName: 'Lê Văn J',
      productionDate: '11/2024',
      timeline: [
        { title: 'Trồng trọt', desc: 'Chăm sóc cây theo tiêu chuẩn sạch.', date: '01/11/2024', location: 'Vườn Bình Thuận', responsible: 'Lê Văn J', details: 'Sử dụng phân hữu cơ.' },
        { title: 'Thu hoạch', desc: 'Chọn quả chín đỏ.', date: '10/02/2025', location: 'Vườn Bình Thuận', responsible: 'Nhóm thu hoạch' },
        { title: 'Vận chuyển', desc: 'Vận chuyển bằng xe lạnh.', date: '11/02/2025', location: 'Từ Bình Thuận đến TP. HCM', responsible: 'Vận tải P' },
        { title: 'Kiểm định', desc: 'Kiểm tra chất lượng quả.', date: '12/02/2025', location: 'Trung tâm kiểm định', responsible: 'Cơ quan kiểm định' },
        { title: 'Phân phối', desc: 'Phân phối đến các chợ.', date: '13/02/2025', location: 'Kho TP. HCM', responsible: 'Phân phối Q' },
        { title: 'Bàn ăn', desc: 'Ngọt, mọng nước.', date: '14/02/2025', location: 'Người tiêu dùng', responsible: 'Nhà bán lẻ R' },
      ],
      quantity: 500,
      description: 'Thanh long ruột đỏ ngọt, giàu vitamin từ Bình Thuận.',
      certifications: [
        { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      ],
      blockchainTxId: 'tx-2233445566',
    },
    {
      id: '11',
      name: 'Cà rốt Đà Lạt',
      price: 28000,
      image: 'https://foody24h.vn/uploads/services/ca-rot-da-lat-1924-2022-01-23.jpg',
      origin: 'Đà Lạt',
      farmerName: 'Nguyễn Thị K',
      productionDate: '10/2024',
      timeline: [
        { title: 'Trồng trọt', desc: 'Trồng trên đất bazan đỏ.', date: '01/10/2024', location: 'Nông trại Đà Lạt', responsible: 'Nguyễn Thị K', details: 'Tưới nước sạch.' },
        { title: 'Thu hoạch', desc: 'Thu hoạch đúng kích thước.', date: '15/01/2025', location: 'Nông trại Đà Lạt', responsible: 'Nhóm thu hoạch' },
        { title: 'Vận chuyển', desc: 'Vận chuyển nhanh bằng xe lạnh.', date: '16/01/2025', location: 'Từ Đà Lạt đến TP. HCM', responsible: 'Vận tải R' },
        { title: 'Kiểm định', desc: 'Kiểm tra chất lượng củ.', date: '17/01/2025', location: 'Lab kiểm định Đà Lạt', responsible: 'Cơ quan VietGAP' },
        { title: 'Phân phối', desc: 'Phân phối đến siêu thị.', date: '18/01/2025', location: 'Kho TP. HCM', responsible: 'Phân phối S' },
        { title: 'Bàn ăn', desc: 'Giòn, ngọt, bổ dưỡng.', date: '19/01/2025', location: 'Người tiêu dùng', responsible: 'Nhà bán lẻ T' },
      ],
      quantity: 900,
      description: 'Cà rốt ngọt, giòn từ khí hậu Đà Lạt.',
      certifications: [
        { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      ],
      blockchainTxId: 'tx-1122337788',
    },
    {
      id: '12',
      name: 'Dưa hấu ruột đỏ',
      price: 15000,
      image: 'https://lh5.googleusercontent.com/proxy/bwozxqzmZJSbJ0ir6CfLTZxVWAMAcapPlvOaAIMDjIt9vkI4Ym0WjEc1gQYmt2c8Xb4AY-gKJbDqQ-hSsuw9bhiLmaSUsTr1TMoADJiUCL9vKkySdp2qHhMUmeKV6bACPzrlbAKkXQ',
      origin: 'Hà Nội',
      farmerName: 'Trần Văn L',
      productionDate: '09/2024',
      timeline: [
        { title: 'Trồng trọt', desc: 'Trồng trên đất phù sa màu mỡ.', date: '01/09/2024', location: 'Nông trại Hà Nội', responsible: 'Trần Văn L', details: 'Sử dụng phân hữu cơ.' },
        { title: 'Thu hoạch', desc: 'Chọn quả chín mọng.', date: '10/12/2024', location: 'Nông trại Hà Nội', responsible: 'Nhóm thu hoạch' },
        { title: 'Vận chuyển', desc: 'Vận chuyển nhanh đến chợ.', date: '11/12/2024', location: 'Từ Hà Nội đến kho', responsible: 'Vận tải T' },
        { title: 'Kiểm định', desc: 'Kiểm tra độ ngọt và chất lượng.', date: '12/12/2024', location: 'Trung tâm kiểm định Hà Nội', responsible: 'Cơ quan kiểm định' },
        { title: 'Phân phối', desc: 'Phân phối đến các cửa hàng.', date: '13/12/2024', location: 'Kho Hà Nội', responsible: 'Phân phối U' },
        { title: 'Bàn ăn', desc: 'Ngọt, mọng nước.', date: '14/12/2024', location: 'Người tiêu dùng', responsible: 'Nhà bán lẻ V' },
      ],
      quantity: 700,
      description: 'Dưa hấu ruột đỏ ngọt, tươi mát từ Hà Nội.',
      certifications: [
        { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      ],
      blockchainTxId: 'tx-9988771122',
    },
  ];

function getProducts(): Product[] {
  const stored = localStorage.getItem(PRODUCTS_KEY);
  if (stored) {
    return JSON.parse(stored);
  } else {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(initialProducts));
    return initialProducts;
  }
}

// Lấy danh sách sản phẩm
export const fetchProducts = async (): Promise<Product[]> => {
  return getProducts();
};

// Thêm sản phẩm mới
export const addProduct = async (newProduct: Omit<Product, 'id' | 'blockchainTxId'>, blockchainTxId: string): Promise<Product> => {
  const products = getProducts();
  const id = (products.length + 1).toString();
  const product: Product = { ...newProduct, id, blockchainTxId };
  products.push(product);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  return product;
};

// Cập nhật sản phẩm
export const updateProduct = async (updatedProduct: Product): Promise<void> => {
  let products = getProducts();
  products = products.map(p => (p.id === updatedProduct.id ? updatedProduct : p));
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

// Xóa sản phẩm
export const deleteProduct = async (id: string): Promise<void> => {
  let products = getProducts();
  products = products.filter(p => p.id !== id);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

// Lấy sản phẩm theo ID (cho trang ProductDetail)
export const fetchProductById = async (id: string): Promise<Product | null> => {
  const products = getProducts();
  return products.find(p => p.id === id) || null;
};

export const fetchOrders = async (): Promise<Order[]> => {
  const stored = localStorage.getItem('orders');
  return stored ? JSON.parse(stored) : [];
};

export const addOrder = async (order: Order): Promise<void> => {
  const orders = await fetchOrders();
  const updated = [...orders, order];
  localStorage.setItem('orders', JSON.stringify(updated));

  // Update product quantities
  const products = await fetchProducts();
  const updatedProducts = products.map((p) => {
    const orderItem = order.items.find((item) => item.productId === p.id);
    if (orderItem) {
      return { ...p, quantity: p.quantity - orderItem.quantity };
    }
    return p;
  });
  localStorage.setItem('products', JSON.stringify(updatedProducts));
};
