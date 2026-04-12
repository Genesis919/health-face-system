# 健康臉譜系統

這是一個使用 `Next.js 14`、`Tailwind CSS`、`Supabase` 製作的第一版系統。

這份說明特別用「完全不會寫程式的人也能照做」的方式來寫。你只要照順序一步一步操作，就可以把專案在自己的電腦上啟動起來。

## 這個系統現在有哪些功能

- 三種角色登入：護理師、社工、主管
- 院民管理：新增、編輯、停用
- CSV 匯入院民名單
- 每日異常紀錄：健康不佳、就醫或住院
- 沒有填寫的日期，自動顯示笑臉
- 月總結：護理師填「本月整體狀況」，社工填「給家屬的話」
- 主管審核
- 健康臉譜預覽
- 匯出 PNG 圖片

## 啟動前你需要準備什麼

你需要先準備這些東西：

1. 一台可以上網的電腦
2. Node.js
3. 一個 Supabase 帳號
4. 這個專案資料夾

## 第 1 步：安裝 Node.js

Node.js 是讓這個專案能執行的基礎工具。

### 安裝方式

1. 打開 Node.js 官網：[https://nodejs.org/](https://nodejs.org/)
2. 下載 `20.x LTS` 或更新版本
3. 執行安裝程式
4. 安裝過程中一直按 `Next`
5. 安裝完成後，重新開啟終端機或 PowerShell

### 如何確認安裝成功

打開 PowerShell，輸入：

```powershell
node -v
```

如果有看到版本號，例如：

```powershell
v20.18.0
```

再輸入：

```powershell
npm -v
```

如果也有出現版本號，就代表安裝成功。

## 第 2 步：進入專案資料夾

請打開 PowerShell，輸入：

```powershell
cd C:\Users\GS22095-NB\Documents\health-face-system
```

## 第 3 步：安裝專案需要的套件

在同一個 PowerShell 視窗輸入：

```powershell
npm install
```

這一步會下載專案需要的程式套件，第一次通常要等幾分鐘。

### 如果安裝成功

你會看到安裝完成的訊息，然後回到可輸入指令的狀態。

## 第 4 步：建立 Supabase 專案

如果你還沒有 Supabase 專案，請先建立一個。

### 建立方式

1. 打開 Supabase 官網：[https://supabase.com/](https://supabase.com/)
2. 註冊或登入
3. 按 `New project`
4. 選擇組織
5. 輸入專案名稱，例如：`health-face-system`
6. 設定資料庫密碼
7. 選擇區域
8. 按建立

等專案建立完成後，再繼續下面步驟。

## 第 5 步：建立 `.env.local`

這個檔案是讓專案知道要連到哪一個 Supabase。

### 做法

1. 在專案根目錄中找到 `.env.example`
2. 複製一份
3. 改名成 `.env.local`

### `.env.local` 內容應該長這樣

```env
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon public key
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role secret key
```

### 這三個值去哪裡找

請到 Supabase 後台：

1. 進入你的專案
2. 點左下角 `Settings`
3. 點 `API`

你會看到：

- `Project URL`
- `anon public`
- `service_role secret`

請把它們分別填進 `.env.local`。

### 注意

- `.env.local` 不能上傳到 GitHub
- `SUPABASE_SERVICE_ROLE_KEY` 是後端管理金鑰，不能分享給別人

## 第 6 步：在 Supabase 執行 `schema.sql`

這一步是建立資料表。

### 做法

1. 進入 Supabase 專案
2. 點左側 `SQL Editor`
3. 點 `New query`
4. 打開這個檔案：

[supabase/schema.sql](C:/Users/GS22095-NB/Documents/health-face-system/supabase/schema.sql)

5. 把整份內容完整複製
6. 貼到 Supabase 的 SQL Editor
7. 按 `Run`

### 成功後會建立這些表

- `profiles`
- `residents`
- `daily_statuses`
- `monthly_summaries`

## 第 7 步：需要範例資料時，執行 `seed.sql`

這一步不是一定要做，但如果你想先看到系統裡有院民資料，可以執行。

### 做法

1. 再次進入 `SQL Editor`
2. 點 `New query`
3. 打開這個檔案：

[supabase/seed.sql](C:/Users/GS22095-NB/Documents/health-face-system/supabase/seed.sql)

4. 複製內容
5. 貼到 Supabase 的 SQL Editor
6. 按 `Run`

執行後，系統會先建立幾筆範例院民資料。

## 第 8 步：建立三種角色的登入帳號

這個系統目前使用 Supabase Auth 登入，所以你要先建立三個登入帳號：

1. 護理師
2. 社工
3. 主管

### 8-1 先建立帳號

在 Supabase 後台：

1. 點左側 `Authentication`
2. 點 `Users`
3. 點 `Add user`
4. 建立 3 個帳號，例如：

- nurse@example.com
- social@example.com
- supervisor@example.com

每個帳號都要設定密碼。

### 8-2 找出這三個帳號的 UUID

在 `Authentication > Users` 頁面中，每一位使用者都會有一個 `User UID`。

請把三個人的 `UUID` 記下來。

### 8-3 把角色寫進 `profiles` 表

到 Supabase 的 `SQL Editor` 開一個新查詢，把下面 SQL 貼上，並把 `UUID` 與姓名改成你自己的資料：

```sql
insert into public.profiles (id, full_name, role) values
  ('護理師的UUID', '王護理師', 'nurse'),
  ('社工的UUID', '李社工', 'social_worker'),
  ('主管的UUID', '周主任', 'supervisor');
```

按 `Run` 後，三種角色就建立完成。

## 第 9 步：啟動系統

回到 PowerShell，確認你還在專案資料夾內，然後輸入：

```powershell
npm run dev
```

如果啟動成功，你通常會看到類似這樣的訊息：

```powershell
Local: http://localhost:3000
```

## 第 10 步：打開系統

打開瀏覽器，進入：

[http://localhost:3000](http://localhost:3000)

你就可以用剛剛建立的帳號登入。

## 建議測試流程

第一次啟動後，你可以照下面順序測試：

1. 用主管帳號登入
2. 到「院民管理」確認是否有資料
3. 用護理師帳號登入，填寫每日異常
4. 到「月總結」填寫護理內容
5. 用社工帳號登入，填寫給家屬的話
6. 再用主管登入做審核
7. 審核通過後測試匯出 PNG

## CSV 匯入格式

如果你要批次匯入院民，CSV 檔案第一列建議使用這些欄位：

```csv
full_name,room_no,gender,birth_date,family_contact,active
陳美玉,201,female,1940-01-02,王小姐 0912-000-001,true
林阿財,202,male,1938-05-07,林先生 0912-000-002,true
```

## package.json scripts 說明

目前可用的指令如下：

- `npm run dev`：開發模式啟動系統
- `npm run build`：建立正式部署版本
- `npm run start`：啟動正式版
- `npm run lint`：檢查程式碼格式與規則
- `npm run typecheck`：檢查 TypeScript 型別

## 專案結構

```text
app/
  api/                 後端 API
  dashboard/           首頁儀表板
  residents/           院民管理
  daily/               每日異常紀錄
  monthly/             月總結
  review/              主管審核
  preview/             臉譜預覽與匯出
components/            畫面元件
lib/                   權限、工具、Supabase 連線
supabase/              SQL 與種子資料
```

## 如果無法啟動，先檢查這幾件事

1. `node -v` 是否有顯示版本，而且版本至少是 20
2. 有沒有先執行 `npm install`
3. `.env.local` 是否真的存在，而且三個欄位都有填
4. `schema.sql` 是否已經成功執行
5. `profiles` 表是否有建立三種角色資料

## 目前我已經先幫你補好的內容

- 已補上新手版一步一步啟動教學
- 已補上 `.env.example` 中文註解
- 已補上 ESLint 設定
- 已補上 `typecheck` script
- 已補上 `eslint` 與 `eslint-config-next` 套件需求

## 目前尚未在這台環境直接驗證的部分

這台工作環境目前沒有可用的 `node` 與 `npm` 指令，所以我無法在這裡直接執行 `npm install` 或 `npm run dev` 幫你做實機啟動測試。

不過我已經把啟動需要的檔案、腳本與說明補齊。你只要先安裝 Node.js，再照這份 README 的步驟做，就可以開始啟動驗證。
