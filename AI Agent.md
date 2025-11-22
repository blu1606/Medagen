# PROJECT SPECIFICATION: MEDAGEN AI-AGENT ARCHITECTURE (UPDATED CV LOGIC)

Dưới đây là TỔNG QUAN TOÀN BỘ Ý TƯỞNG AI-AGENT CỦA DỰ ÁN MEDAGEN — phiên bản cập nhật logic CV Router, đầy đủ, hệ thống, bao phủ toàn bộ thiết kế Agent, tools, workflow và vai trò trong kiến trúc tổng thể.

---

## 🧠 TỔNG QUAN IDEA VỀ AI-AGENT — MEDAGEN

### ⭐ 1. AI-Agent là “Bộ Não Điều Phối” của toàn hệ thống
Medagen không phải là một mô hình đơn lẻ. Nó là hệ sinh thái nhiều năng lực (tools):
* **Computer Vision Tools:** Hệ thống đa tầng (Router xác định vùng → Model chuyên sâu).
* **Triage Rules Engine:** Engine luật lâm sàng.
* **RAG Guideline Search:** Tra cứu hướng dẫn Bộ Y Tế/WHO.
* **Search Database + Vector (Supabase):** Truy xuất dữ liệu cấu trúc.
* **Location Search:** Google Maps.

→ **AI-Agent** là trung tâm điều phối, tiếp nhận input từ người dùng và quyết định tool nào sẽ làm việc gì.

### ⭐ 2. Agent thực hiện “Clinical Reasoning” dạng ReAct
Agent dùng **ReAct Framework**:
> **Thought → Action (Tool) → Observation → … → Final Answer**

Không đoán mò. Agent sẽ:
1.  Phân tích input.
2.  Tự quyết định cần gọi tool nào (CV Router? Rules? RAG?).
3.  Xử lý kết quả trả về.
4.  Tạo ra suy luận lâm sàng an toàn:
    * Triệu chứng chính & Red flags.
    * Mô tả nguy cơ & Mức độ Triage.

### ⭐ 3. Agent chỉ làm TRIAGE — KHÔNG CHẨN ĐOÁN
**Guardrails quan trọng:**
* Không chẩn đoán bệnh cụ thể.
* Không kê đơn, không điều trị.
* Không đưa kết luận y khoa vượt ngưỡng an toàn.

**Agent chỉ:**
* Phân tích triệu chứng.
* Gợi ý mức độ nguy cấp (Emergency/Urgent/Routine/Self-care).
* Tóm tắt red flags.
* Đưa ra hướng dẫn dựa trên guideline.

---
## KIẾN TRÚC CV 3 TẦNG (3-LAYER FILTER)

Hệ thống sử dụng mô hình phễu lọc 3 bước để đảm bảo tính chính xác và tối ưu hóa tài nguyên xử lý.

---

### TỔNG QUAN CÁC TẦNG

#### 🔹 Tầng 1: ĐỊNH VỊ (Body Region)
Đây là tầng sơ loại để xác định vị trí giải phẫu trên cơ thể.
* **Input:** Ảnh gốc (Raw Image).
* **Nhiệm vụ:** Phân loại vùng cơ thể (Body Part Detection).
* **Output:** Label vùng (Ví dụ: `Thorax`, `Face`, `Abdomen`, `Bone structure`...).

#### 🔹 Tầng 2: ĐIỀU HƯỚNG (Specialty Router)
Tầng trung gian quyết định chuyên khoa nào sẽ chịu trách nhiệm xử lý.
* **Input:** Label Vị trí (từ Tầng 1) + **Triệu chứng lâm sàng (Text)** từ người dùng.
* **Nhiệm vụ:** Mapping sang chuyên khoa y tế để chọn model đích.
* **Output:** ID Chuyên khoa (Ví dụ: `Oncology`, `Dermatology`, `Orthopedics`...).

#### 🔹 Tầng 3: CHẨN ĐOÁN (Specific Pathology)
Tầng phân tích chuyên sâu sử dụng các model State-of-the-art cho từng loại bệnh.
* **Input:** Vùng quan tâm (ROI) đã được crop hoặc focus.
* **Nhiệm vụ:** Xác định tên bệnh lý cụ thể và mức độ nghiêm trọng.
* **Output:** Tên bệnh + Confidence Score + Grade/Stage (Cấp độ).

---

### VÍ DỤ THỰC TẾ (USE CASES)

#### 📌 Ví dụ 1: Chẩn đoán Phổi (Case Nặng)
> **Luồng đi:** Phổi $\rightarrow$ Ung bướu $\rightarrow$ K Phổi Giai đoạn cuối

* **Tầng 1 (Region):**
    * **Input:** Ảnh X-quang hoặc CT scan lồng ngực.
    * **Output:** `Thorax / Lung` (Lồng ngực/Phổi).

* **Tầng 2 (Specialty):**
    * **Context:** Region là `Lung` + Text user cung cấp: *"Ho ra máu, sụt cân nhanh trong 1 tháng"*.
    * **Logic:** Triệu chứng cảnh báo đỏ (Red flags) $\rightarrow$ Ưu tiên **Ung bướu** hơn là Hô hấp thông thường.
    * **Output:** `Oncology` (Ung bướu).

* **Tầng 3 (Pathology):**
    * **Model Selection:** Gọi model `Onco_Lung_CT_Net` (Chuyên phát hiện khối u).
    * **Action:** Quét khối u, đo kích thước và độ xâm lấn.
    * **Output:** **Malignant Tumor (Khối u ác tính)** - Suggestive of Stage IV.

---

#### 📌 Ví dụ 2: Chẩn đoán Mặt (Case Phổ thông)
> **Luồng đi:** Mặt $\rightarrow$ Da liễu $\rightarrow$ Mụn trứng cá

* **Tầng 1 (Region):**
    * **Input:** Ảnh chụp selfie cận cảnh khuôn mặt bằng điện thoại.
    * **Output:** `Face` (Mặt).

* **Tầng 2 (Specialty):**
    * **Context:** Region là `Face` + Text user cung cấp: *"Nổi nốt đỏ, sờ thấy đau nhẹ"*.
    * **Logic:** Các triệu chứng và hình ảnh khớp với bệnh lý bề mặt da.
    * **Output:** `Dermatology` (Da liễu).

* **Tầng 3 (Pathology):**
    * **Model Selection:** Gọi model `Derm_Acne_Classifier` (Chuyên phân loại mụn).
    * **Action:** Phân tích tổn thương da (lesion analysis).
    * **Output:** **Acne Vulgaris (Mụn trứng cá)** - Grade: Moderate (Mức độ trung bình).

---

## 🧠 I. USECASE 1 — ĐỦ THÔNG TIN

### 1.1. Chỉ có TEXT nhưng RÕ RÀNG
* **Ví dụ:** “Em bị đỏ mắt, chảy nước mắt, hơi mờ nhẹ 2 ngày nay.”
* **Flow:**
    1.  Agent đọc text → xác định chuyên khoa: Ophthalmology (Mắt).
    2.  Match bệnh cụ thể (Viêm kết mạc, Dry eye...) → Dùng **CSDL (Database Search)**.
    3.  Nếu bệnh rõ → KHÔNG cần RAG (ưu tiên CSDL vì cấu trúc và chính xác hơn).
    4.  Gọi **Triage Rules** → Phân loại mức độ khẩn cấp.
    5.  Nếu cần → Gọi **Maps**.

### 1.2. Có cả TEXT và IMAGE (Flow cập nhật CV Router)
* **Ví dụ:** “Da chân em nổi mẩn đỏ, ngứa.” + [Ảnh chụp chân]
* **Flow:**
    1.  **Phân tích Text:** Agent nhận diện sơ bộ là "Da liễu" ở vùng "Chân".
    2.  **Phân tích Ảnh (Bước 1 - Router):**
        * Agent gọi `CV_Body_Classifier`.
        * Kết quả xác thực: "Đây là vùng Chân (Leg)" + "Bề mặt da (Skin surface)".
    3.  **Chọn Model (Bước 2):**
        * Khớp Text (Da) + Ảnh (Skin surface) → Quyết định dùng `tool_derm_cv`.
    4.  **Chạy Model (Bước 3):**
        * `tool_derm_cv` phân tích tổn thương → Trả về: "Viêm da cơ địa (80%), Nấm da (15%)..."
    5.  **Tổng hợp:**
        * Dùng kết quả CV (probability > 0.6) để query **CSDL**.
        * Nếu kết quả thấp → Query **RAG** vùng Da liễu.
        * Chạy Triage Rules & Maps.

---

## 🧠 II. USECASE 2 — KHÔNG ĐỦ THÔNG TIN

### 2.1. Có TEXT nhưng MƠ HỒ
* **Flow:** Agent hỏi lại (Clarification). Nếu user bổ sung → quay lại flow đủ thông tin. Nếu không → Dùng RAG hẹp hoặc từ chối.

### 2.2. Có IMAGE nhưng KHÔNG CÓ TEXT (Flow cập nhật CV Router)
* **Ví dụ:** User gửi 1 ảnh, không nói gì.
* **Flow:**
    1.  **Agent yêu cầu text:** "Bạn có thể mô tả thêm không?"
    2.  **Nếu User im lặng/không biết, Agent tự kích hoạt CV Pipeline:**
    3.  **Bước 1 (Router):**
        * Gọi `CV_Body_Classifier`.
        * *Giả sử kết quả:* "Vùng mắt (Eye)" hoặc "Cận cảnh giác mạc".
    4.  **Bước 2 (Mapping):**
        * Mapping "Eye" → Chuyên khoa Mắt (Ophthalmology).
        * Quyết định gọi `tool_eye_cv`.
    5.  **Bước 3 (Inference):**
        * `tool_eye_cv` trả về: "Xuất huyết dưới kết mạc".
    6.  **Final:** Agent dùng kết quả đó để query CSDL/RAG và trả lời user (kèm cảnh báo đây là phỏng đoán dựa trên ảnh).

---

## 🧠 III. USECASE 3 — OUT OF SCOPE
Các trường hợp Agent **PHẢI TỪ CHỐI**:
1.  **Yêu cầu kê đơn:** "Cho tôi thuốc..." → Từ chối.
2.  **Thủ tục hành chính:** "BHYT, giá tiền..." → Từ chối.
3.  **Expert-to-Expert:** Câu hỏi so sánh chuyên sâu bác sĩ → Từ chối.
4.  **Hình ảnh không liên quan (CV Router phát hiện):**
    * Nếu `CV_Body_Classifier` trả về: "Xe hơi", "Con mèo", "Phong cảnh".
    * Agent: "Hình ảnh không liên quan đến y tế. Vui lòng gửi ảnh tổn thương hoặc mô tả triệu chứng."

---

## 🧠 IV. QUY TẮC CHỌN TOOL (Updated)

1.  **CSDL (Database):** Ưu tiên số 1. Dùng khi bệnh/triệu chứng đã rõ ràng, có cấu trúc.
2.  **RAG (Vector Search):** Ưu tiên số 2. Dùng khi thông tin mơ hồ, cần tra cứu guideline dài, hoặc tìm kiếm ngữ nghĩa (semantic search).
3.  **CV (Computer Vision):** Dùng khi có ảnh.
    * **Quy tắc mới:** BẮT BUỘC phải đi qua bước **Xác định Vùng/Chuyên khoa (Router)** trước khi gọi model bệnh học. Không bao giờ gọi thẳng model bệnh nếu chưa biết ảnh chụp cái gì.

---

## 🧠 V. KIẾN TRÚC AGENT MEDAGEN (MASTER FLOW)

```text
User Input
   │
   ├── [Text Only]
   │      ├── Clear intent ──> CSDL ──> Triage ──> Maps
   │      └── Unclear ──> Ask User ──> (If still unclear) ──> RAG (Broad)
   │
   ├── [Image Included]
   │      ├── 1. CV Router (Body Part/Domain Check)
   │      │       ├── Non-medical ──> Reject
   │      │       ├── Skin ──> call derm_cv
   │      │       ├── Eye ──> call eye_cv
   │      │       ├── Wound ──> call wound_cv
   │      │       └── Bone/Xray ──> call ortho_cv (future)
   │      │
   │      ├── 2. Get Disease Probability
   │      └── 3. Combine with Text ──> CSDL/RAG ──> Triage ──> Maps
   │
   └── [Out of Scope] ──> Reject (Safety Guardrails)
```

## 🧠 VI. TÓM TẮT HỆ THỐNG

**AI-Agent Medagen** là hệ thống Triage y tế thông minh, vận hành dựa trên cơ chế phối hợp đa công cụ (Multi-tool orchestration) với logic xử lý hình ảnh 2 lớp (Two-step CV):

1.  **Phân loại (Router Step):**
    * Agent nhìn ảnh → Xác định **Vùng cơ thể** (Tay, Chân, Mắt...) hoặc **Miền dữ liệu** (Da liễu, Nhãn khoa...).
    * *Mục đích:* Điều hướng chính xác, tránh dùng sai model (ví dụ: không dùng model da liễu để phân tích ảnh mắt).

2.  **Phân tích (Inference Step):**
    * Dựa vào kết quả Router, Agent gọi đúng **Model chuyên sâu** (`derm_cv`, `eye_cv`, `wound_cv`) để trích xuất đặc điểm bệnh lý và độ tin cậy (probability).

3.  **Tổng hợp & Ra quyết định (Reasoning Step):**
    * Agent kết hợp: **Triệu chứng (Text)** + **Kết quả ảnh (CV)** + **Kiến thức y khoa (CSDL/RAG)**.
    * Chạy qua **Triage Rules** để đưa ra mức độ khẩn cấp và lời khuyên an toàn (Emergency / Urgent / Routine / Self-care).