# GreenTrace

**Hạ tầng định danh và xác minh tài sản nông nghiệp trước khi tài chính hóa.**

GreenTrace 2.0 tổ chức dữ liệu của tài sản nông nghiệp giá trị cao thành một hồ sơ có thể kiểm tra: tài sản nào, ở đâu, ai đang quản lý, bằng chứng đến từ đâu, ai đã xác minh trong phạm vi nào, lịch sử thay đổi ra sao và hồ sơ còn thiếu hoặc bất thường ở điểm nào.

MVP không phát hành token, không vận hành sàn đầu tư, không cho vay, không bảo hiểm và không đưa ra kết luận sinh học tự động.

## Problem

Dữ liệu về một tài sản sinh học thường phân tán giữa người trồng, nhật ký, ảnh hiện trường, tọa độ, cảm biến, chứng nhận và đơn vị kiểm nghiệm. Có dữ liệu không đồng nghĩa có một hồ sơ đủ nguồn gốc, đủ mới và đủ xác minh để bên thứ ba bắt đầu thẩm định.

## Solution

GreenTrace triển khai pipeline theo đúng thứ tự:

1. Định danh tài sản.
2. Kho bằng chứng và SHA-256 hash.
3. Xác minh độc lập theo phạm vi.
4. Sổ vòng đời có transition rules.
5. Điểm tin cậy hồ sơ và cảnh báo logic.
6. Hộ chiếu tài sản số có phiên bản.
7. Readiness gate cho bước xem xét tài chính ở hạ nguồn.

## Architecture

```text
React + TypeScript + Vite
        │ HTTPS / cookie session
Express + Zod + role guards
        │
Prisma ─┼─ SQLite local / PostgreSQL production target
        ├─ private object storage
        ├─ IPFS/Pinata for suitable public evidence
        └─ Solana devnet integrity records
             └─ Anchor green_trace_registry
```

Source chính:

- `src/pages`: public, auth, operator, verifier, reviewer, admin và passport.
- `src/solana`: provider Phantom, config, transaction memo và Explorer URL.
- `server/src/routes`: API theo domain.
- `server/src/services`: trust, anomaly, lifecycle, storage và Solana verification.
- `server/prisma`: schema, migration và seed.
- `solana/programs/green_trace_registry`: Anchor program lưu hash/trạng thái tối thiểu.

## Roles

| Role | Nhãn UI | Quyền chính |
| --- | --- | --- |
| `operator` | Người quản lý tài sản | Tạo tài sản, nộp bằng chứng, yêu cầu xác minh, ghi vòng đời |
| `verifier` | Người xác minh | Xem hàng đợi, kiểm tra bằng chứng, ký attestation bằng Phantom |
| `reviewer` | Bên xem hồ sơ | Tra cứu, lọc, xem và xuất tóm tắt hộ chiếu |
| `admin` | Quản trị viên | Quản lý phạm vi hệ thống và xem audit log |

Backend đọc role từ JWT trong cookie HttpOnly. Role trong localStorage không được dùng để phân quyền API.

## Trust model

Điểm tin cậy hồ sơ có tối đa 100 điểm:

- Định danh: 20.
- Độ đầy đủ bằng chứng: 20.
- Xác minh độc lập: 30.
- Độ mới và hiệu lực: 15.
- Nhất quán và bất thường: 15.

Anomaly engine kiểm tra GPS ngoài vùng khai báo, thời điểm trước ngày trồng, transition vòng đời sai, chứng nhận/attestation hết hạn, thiếu bằng chứng bắt buộc, hash trùng và thiếu xác minh độc lập. UI dùng “Cần kiểm tra” hoặc “Bất thường logic”, không kết luận gian lận.

Readiness gate chỉ trả `READY_FOR_FINANCIAL_REVIEW` khi định danh ≥ 90%, bằng chứng ≥ 80%, xác minh độc lập ≥ 70%, không có cảnh báo HIGH và có chứng nhận còn hiệu lực.

## Why Solana

Solana là lớp ghi nhận tính toàn vẹn, không phải nguồn sự thật ngoài đời. Transaction ghi hash payload, signer, timestamp và reference. Phantom ký ở client; server không nhận seed phrase hoặc private key. Backend chỉ đánh dấu `CONFIRMED` sau khi xác nhận transaction với RPC.

Anchor program hỗ trợ `initialize_registry`, `register_asset`, `record_evidence_hash`, `create_attestation`, `record_lifecycle_event`, `update_passport_root` và `revoke_attestation`.

Backend đối chiếu signer, loại record và payload hash trong Solana memo trước khi xác nhận. Một chữ ký cũ không thể được tái sử dụng cho hồ sơ khác. Verifier có thể thu hồi attestation bằng đúng ví đã ký; việc thu hồi tạo transaction và audit event riêng.

## Privacy model

Evidence có ba mức: `PUBLIC`, `PARTNER`, `PRIVATE`. Exact GPS, phone, KYC, hồ sơ thương mại và raw private documents không xuất hiện trong public passport hoặc on-chain account. Public chain chỉ giữ hash, public signer, state và timestamp.

## Run locally

Yêu cầu Node.js 20+, npm, và tùy chọn Solana/Anchor CLI cho on-chain program.

```bash
npm install
npm --prefix server install
copy .env.example .env
copy server\.env.example server\.env
npm run db:setup
npm run dev:api
npm run dev
```

Đặt `JWT_SECRET` tối thiểu 32 ký tự trong `server/.env`. Frontend chạy tại `http://localhost:5173`, API tại `http://localhost:3000`. Vite proxy `/api` và `/storage` sang backend; application client không hard-code localhost.

Nếu Prisma schema-engine không chạy được trong một Windows sandbox hạn chế, local SQLite có fallback kiểm thử:

```bash
npm --prefix server run db:bootstrap
npm --prefix server run seed
```

## Environment variables

Frontend: `VITE_API_BASE_URL`, `VITE_SOLANA_CLUSTER`, `VITE_SOLANA_RPC_URL`, `VITE_SOLANA_PROGRAM_ID`, `VITE_TRACK_ASIA_ACCESS_TOKEN`.

Backend: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `SOLANA_CLUSTER`, `SOLANA_RPC_URL`, `SOLANA_VERIFY_TRANSACTIONS`, `PINATA_JWT`, `PUBLIC_BASE_URL`, `MAX_UPLOAD_BYTES`.

Không commit `.env`, private key, API secret hoặc wallet keypair. Xem `SECURITY_NOTICE.md`.

## Anchor setup

```bash
cd solana
npm install
anchor keys sync
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

Nếu chưa cài Anchor/Solana CLI, vẫn có thể kiểm tra Rust program và TypeScript test source:

```bash
cargo test --manifest-path solana/Cargo.toml
cd solana && npm install && npx tsc --noEmit
```

Sau deploy, đặt program ID công khai vào `VITE_SOLANA_PROGRAM_ID`. `anchor keys sync` giữ `declare_id!` và `Anchor.toml` đồng bộ với keypair cục bộ; keypair không được commit.

## Demo accounts

Tất cả dùng mật khẩu `GreenTrace123!`:

| Email | Role |
| --- | --- |
| `operator@greentrace.vn` | operator |
| `operator2@greentrace.vn` | operator |
| `verifier@greentrace.vn` | verifier |
| `verifier2@greentrace.vn` | verifier |
| `reviewer@greentrace.vn` | reviewer |
| `admin@greentrace.vn` | admin |

Seed gồm 8 hồ sơ Sâm Ngọc Linh: hồ sơ tốt, thiếu chứng nhận, GPS bất thường, xung đột vòng đời, attestation hết hạn và hồ sơ mới ít dữ liệu.

## Demo flow

1. Đăng nhập operator và tạo tài sản; trạng thái đầu là `REGISTERED`.
2. Tải ảnh/PDF/JSON/log; server validate MIME/size và tạo SHA-256.
3. Gửi yêu cầu xác minh.
4. Đăng xuất, đăng nhập verifier và kết nối Phantom.
5. Chọn scope, nhập note, duyệt; Phantom gửi transaction hash payload lên Solana devnet.
6. Backend xác nhận signature, tạo attestation và tính lại trust profile.
7. Operator bổ sung bằng chứng, chuyển vòng đời hợp lệ và tạo phiên bản passport mới có passport root transaction.
8. Reviewer lọc tài sản, mở passport, xem evidence, verifier, cảnh báo, lifecycle, Explorer links và disclaimer.

## Tests and build

```bash
npm run lint
npm run test:all
npm run build:all
```

Backend tests bao phủ auth role guard, asset create, evidence hashing, approve flow, trust/anomaly rules, illegal lifecycle transition và redaction. Frontend tests bao phủ role routes, trust score/disclaimer và error state.
Backend acceptance còn bao phủ reject, attestation revocation và admin policy guard. Dashboard operator hiển thị phân bố vòng đời, điểm tin cậy, bằng chứng còn thiếu và thời gian xử lý xác minh; admin quản lý role, xem tổ chức, policy và audit log.

## Limitations

- Xác minh chuyên môn vẫn cần tổ chức/người có thẩm quyền ngoài đời.
- MVP dùng rule-based trust/anomaly engine; trọng số phải được hiệu chỉnh với chuyên gia ngành.
- Pinata chỉ được dùng khi có `PINATA_JWT`; nếu thiếu credential, public evidence lưu ở public local storage.
- Exact legal ownership, appraisal, credit policy, insurance underwriting và biological authenticity nằm ngoài phạm vi.
- PostgreSQL production cần migration provider/schema riêng trong quy trình triển khai.
- Solana/Anchor CLI và Phantom phải có trên máy để chạy local-validator hoặc ký giao dịch devnet thật; repository không chứa private key thay thế.

## Legal and product disclaimers

GreenTrace không xác nhận quyền sở hữu pháp lý, không định giá tài sản, không cung cấp điểm tín dụng, không đưa ra khuyến nghị đầu tư và không bảo đảm rằng đối tác tài chính sẽ chấp nhận hồ sơ. Blockchain chỉ chứng minh ai ký, thời điểm, hash dữ liệu và lịch sử trạng thái sau khi ghi.
