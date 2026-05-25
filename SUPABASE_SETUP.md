# Supabase 設定指南

為了啟用跨平台同步功能，請在您的 Supabase 專案中執行以下設定。

---

## 1. 建立資料表 (Database Table)

請在 Supabase 的 **SQL Editor** 中執行以下 SQL 語法建立 `notes` 資料表：

```sql
-- 建立 notes 資料表
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject text not null, -- '權利關係', '宅建業法', '法令上の制限', '稅・その他'
  content text not null, -- Markdown 格式內容
  image_url text,        -- 截圖的儲存 URL
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 啟用資料列層級安全性 (RLS)
alter table public.notes enable row level security;

-- 建立允許所有人讀寫的簡單安全政策 (對於個人分享或免登入版)
create policy "Allow public read and write" on public.notes
  for all using (true) with check (true);
```

---

## 2. 建立儲存空間 (Storage Bucket)

為了儲存您上傳的課本截圖，請建立一個儲存空間：

1. 前往 Supabase 控制台的 **Storage** 頁面。
2. 點選 **New bucket**。
3. 將 Bucket Name 設定為 `screenshots`。
4. 將其設定為 **Public**（公開存取，以便透過 URL 讀取圖片）。
5. 點選 **Create bucket**。
6. 前往 **Policies**，確保為 `screenshots` Bucket 啟用上傳、下載及刪除的權限（如果是 Public bucket，預設可以點選對應的範例 Policy 快速套用，允許所有匿名使用者上傳與讀取）。

---

## 3. 取得 API 金鑰

在 App 的「設定」頁面中，您需要輸入以下資訊：
*   **Supabase URL**：可在 Supabase Project Settings -> API 找到。
*   **Supabase Anon Key**：可在 Supabase Project Settings -> API 找到。
*   **Gemini API Key**：請至 Google AI Studio 申請。
