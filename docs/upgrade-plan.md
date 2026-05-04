# 🛡️ Bản Kế Hoạch Nâng Cấp Bento SDK (Upgrade Plan)

Sau khi đối chiếu trực tiếp với source code của Backend (cụ thể là `CreateTransactionDto` ở `src/modules/transactions/dto/create-transaction.dto.ts`), tôi nhận thấy API Backend hiện tại đang yêu cầu chính xác các trường sau:
- `agent_id` (string - đang được ngầm định dùng như agent pubkey)
- `encrypted_payload` (string)
- `base64_tx` (string)
- `network` (string - optional)
- `expires_at` (Date - optional)

*(Lưu ý: Backend DTO hiện tại **chưa có trường `signature` và `wallet_address`**. Do đó, SDK sẽ tạm thời chỉ gửi đúng những gì Backend hỗ trợ, đồng thời đánh dấu Todo cho phần chữ ký số)*

Dưới đây là bản Plan chuẩn cấu trúc phần mềm, bám sát Singleton pattern và khớp 100% với Backend hiện tại.

---

## 🏗️ Phase 1: Core Architecture & Singleton Pattern

**Task 1.1: Triển khai Singleton cho `BentoClient`**
- **Mô tả:** Đảm bảo `BentoClient` chỉ khởi tạo 1 lần duy nhất trong toàn bộ vòng đời ứng dụng.
- **Chi tiết:**
  - Tạo private static instance bên trong `BentoClient`.
  - Mở hàm `initialize(config)` nhận vào:
    - `agentX25519PrivateKey`: Khóa riêng để giải/mã hóa.
    - `agentX25519PublicKey`: Sẽ được dùng để truyền vào trường `agent_id` của API.
    - `agentWalletPrivateKey`: Lưu tạm trong bộ nhớ (để dùng cho Phase ký Ed25519 sau này khi Backend update).
    - `baseURL`: Mặc định là `http://localhost:4001` (linh hoạt cho môi trường dev).
  - Trăng bị các hàm Getter an toàn để check `isInitialized()`.

**Task 1.2: Refactor `ApiClient` đồng bộ với DTO Backend**
- **Mô tả:** Sửa lại `src/api/client.ts` để payload khớp 100% với `CreateTransactionDto`.
- **Chi tiết:**
  - Đọc `baseURL` từ Singleton Config.
  - Sửa Interface Payload cho hàm `postTransaction` thành:
    ```typescript
    export interface TransactionPayload {
      agent_id: string; // Dùng Agent X25519 Public Key
      encrypted_payload: string;
      base64_tx: string;
      network?: string;
    }
    ```
  - Bỏ `wallet_address` và `signature` ra khỏi Request hiện tại vì Backend chưa hứng các trường này.

---

## 🔐 Phase 2: Triển khai Cryptography Engine (X25519 & AES)

**Task 2.1: Triển khai BSIT Protocol Encryption**
- **Mô tả:** Tạo module `src/crypto/bsit.ts` thực hiện chuẩn mã hóa end-to-end.
- **Chi tiết:**
  - Viết hàm `deriveSharedSecret(privateKey, systemPublicKey)`.
  - Viết hàm `encryptInstruction(instruction, sharedSecret)`:
    - Dùng AES-256-GCM.
    - Đóng gói cùng nonce (IV) và Auth Tag để thành chuẩn chuỗi Base64 `encrypted_payload`.

**Task 2.2: Chuẩn bị khung cho Ed25519 Signature (Future-Proof)**
- **Mô tả:** Tạo sẵn module `src/crypto/identity.ts` nhưng để ở dạng tiện ích chờ Backend hỗ trợ.
- **Chi tiết:**
  - Viết hàm parse `bs58` key.
  - Viết hàm `signPayload()` dùng TweetNaCl để ký chuẩn bị cho version API v2.

---

## 🚀 Phase 3: Hoàn Thiện Guard Pipeline (`protect`)

**Task 3.1: Orchestrate hàm `protect()`**
- **Mô tả:** Lắp ráp các mảnh ghép trên thành 1 flow liền mạch.
- **Chi tiết:**
  1. Validate: Gọi `BentoClient.getInstance()`. Nếu chưa init -> quăng lỗi.
  2. Lấy `SystemPublicKey` từ `/api/v1/system/public-key` (cache vào memory để tránh gọi nhiều lần).
  3. Gọi module `bsit` để mã hóa `instruction` thành `encrypted_payload`.
  4. Build HTTP payload:
     ```typescript
     {
       agent_id: client.config.agentX25519PublicKey, // Khớp DTO Backend
       encrypted_payload: encryptedPayload,
       base64_tx: rawTxBase64,
       network: "solana"
     }
     ```
  5. POST lên `http://localhost:4001/api/v1/transactions`.
  6. Xử lý logic đồng bộ (Chờ response HTTP) và trả về Enum kết quả `AnalysisResult` cho user.

---

## 🧪 Phase 4: Quality Assurance (Unit & E2E Testing)

**Task 4.1: Cấu hình Jest & Unit Tests**
- **Mô tả:** Test độc lập từng phần lõi.
- **Chi tiết:**
  - Test `BentoClient`: Verify Singleton pattern (Init 2 lần có throw error không?).
  - Test `bsit.ts`: Mock public/private key để đảm bảo hàm sinh Shared Secret đúng chuẩn toán học, mã hóa giải mã ra đúng plain text ban đầu.
  - Test `ApiClient`: Mock axios response.

**Task 4.2: End-to-End (E2E) Test Flow**
- **Mô tả:** Viết script mô phỏng Agent thật.
- **Chi tiết:**
  - Tạo file E2E: Init SDK trỏ về Mock Backend hoặc Localhost.
  - Gọi hàm `protect()` với sample instruction và transaction.
  - Expect kết quả trả về không bị crash và phải có các property cơ bản (success/fail).
