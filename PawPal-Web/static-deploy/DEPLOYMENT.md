# PawPal 完整部署指南

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户浏览器                                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloud Storage (前端)                          │
│                    - index.html                                  │
│                    - css/style.css                               │
│                    - js/main.js                                  │
│                    - config.js                                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ API 请求
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloud Run (PawPal-Web 后端)                   │
│                    Flask API Gateway                             │
│                    端口: 8080                                    │
└──────────┬──────────────────┼──────────────────┬────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   User Service   │ │   Walk Service   │ │  Review Service  │
│  (已部署在外部)   │ │   Cloud Run      │ │   Cloud Run      │
│ 34.9.57.25:3001  │ │                  │ │                  │
└──────────────────┘ └──────────────────┘ └────────┬─────────┘
                                                   │
                                                   ▼
                                          ┌──────────────────┐
                                          │    Cloud SQL     │
                                          │     (MySQL)      │
                                          └──────────────────┘
```

---

## 第一步: 部署 Walk Service 到 Cloud Run

### 1.1 进入 Walk Service 目录

```bash
cd PawPal-Walk
```

### 1.2 部署到 Cloud Run

```bash
gcloud run deploy pawpal-walk-service \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8000
```

### 1.3 记录 URL

部署完成后记录 URL，例如:
```
https://pawpal-walk-service-xxxxx-uc.a.run.app
```

---

## 第二步: 部署 Review Service 到 Cloud Run

### 2.1 进入 Review Service 目录

```bash
cd PawPal-Review1
```

### 2.2 部署到 Cloud Run (连接 Cloud SQL)

```bash
gcloud run deploy pawpal-review-service \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8001 \
  --add-cloudsql-instances pawpal-481117:us-central1:pawpal-review \
  --set-env-vars "DB_USER=root,DB_PASS=17283940,DB_NAME=pawpal-review,CLOUD_SQL_CONNECTION_NAME=pawpal-481117:us-central1:pawpal-review"
```

### 2.3 记录 URL

部署完成后记录 URL，例如:
```
https://pawpal-review-service-xxxxx-uc.a.run.app
```

---

## 第三步: 部署 PawPal-Web 后端到 Cloud Run

### 3.1 在 PawPal-Web 目录创建 Dockerfile

在 `PawPal-Web/` 目录创建 `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .
COPY templates templates/
COPY static static/

# Set environment variables
ENV PORT=8080
ENV FLASK_DEBUG=False

# Run with gunicorn
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 app:app
```

### 3.2 创建 requirements.txt

在 `PawPal-Web/` 目录创建 `requirements.txt`:

```
flask==3.0.0
flask-cors==4.0.0
requests==2.31.0
python-dotenv==1.0.0
gunicorn==21.2.0
```

### 3.3 部署到 Cloud Run

```bash
cd PawPal-Web

gcloud run deploy pawpal-web-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "USER_SERVICE_URL=http://34.9.57.25:3001,WALK_SERVICE_URL=https://pawpal-walk-service-xxxxx-uc.a.run.app,REVIEW_SERVICE_URL=https://pawpal-review-service-xxxxx-uc.a.run.app,SECRET_KEY=your-secret-key-here,GOOGLE_CLIENT_ID=445201823926-sqscktas1gm0k5ve91mchu5cj96bofcm.apps.googleusercontent.com"
```

**注意**: 将 `xxxxx` 替换为实际的 Walk Service 和 Review Service URL。

### 3.4 记录 URL

部署完成后记录 URL，例如:
```
https://pawpal-web-backend-xxxxx-uc.a.run.app
```

---

## 第四步: 更新前端配置

### 4.1 修改 config.js

编辑 `PawPal-Web/static-deploy/config.js`:

```javascript
const CONFIG = {
    // 替换为你的 Cloud Run 后端 URL
    API_BASE_URL: 'https://pawpal-web-backend-xxxxx-uc.a.run.app',

    // Google OAuth Client ID
    GOOGLE_CLIENT_ID: '445201823926-sqscktas1gm0k5ve91mchu5cj96bofcm.apps.googleusercontent.com'
};
```

---

## 第五步: 部署前端到 Cloud Storage

### 5.1 创建 Cloud Storage Bucket

```bash
# 创建 bucket (名称必须全局唯一)
gsutil mb -l us-central1 gs://pawpal-web-frontend

# 配置为静态网站
gsutil web set -m index.html -e index.html gs://pawpal-web-frontend
```

### 5.2 上传静态文件

```bash
# 上传 static-deploy 文件夹中的所有文件
gsutil -m cp -r PawPal-Web/static-deploy/* gs://pawpal-web-frontend/

# 设置公开访问权限
gsutil iam ch allUsers:objectViewer gs://pawpal-web-frontend
```

### 5.3 配置 CORS (可选)

创建 `cors.json`:
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

应用 CORS 配置:
```bash
gsutil cors set cors.json gs://pawpal-web-frontend
```

---

## 第六步: 配置 Google OAuth

在 Google Cloud Console:

1. 进入 **APIs & Services** > **Credentials**
2. 点击你的 OAuth 2.0 Client ID
3. 在 **Authorized JavaScript origins** 添加:
   - `https://storage.googleapis.com`
   - `https://pawpal-web-frontend.storage.googleapis.com` (如果使用)
4. 在 **Authorized redirect URIs** 添加:
   - `https://pawpal-web-backend-xxxxx-uc.a.run.app/api/auth/google/callback`
5. 保存

---

## 第七步: 访问应用

你的应用将在以下地址可用:

```
https://storage.googleapis.com/pawpal-web-frontend/index.html
```

---

## 部署命令汇总

```bash
# 1. 部署 Walk Service
cd PawPal-Walk
gcloud run deploy pawpal-walk-service --source . --region us-central1 --allow-unauthenticated --port 8000

# 2. 部署 Review Service
cd ../PawPal-Review1
gcloud run deploy pawpal-review-service --source . --region us-central1 --allow-unauthenticated --port 8001 \
  --add-cloudsql-instances pawpal-481117:us-central1:pawpal-review \
  --set-env-vars "DB_USER=root,DB_PASS=17283940,DB_NAME=pawpal-review,CLOUD_SQL_CONNECTION_NAME=pawpal-481117:us-central1:pawpal-review"

# 3. 部署 Web Backend
cd ../PawPal-Web
gcloud run deploy pawpal-web-backend --source . --region us-central1 --allow-unauthenticated \
  --set-env-vars "USER_SERVICE_URL=http://34.9.57.25:3001,WALK_SERVICE_URL=<WALK_SERVICE_URL>,REVIEW_SERVICE_URL=<REVIEW_SERVICE_URL>,SECRET_KEY=<YOUR_SECRET>"

# 4. 更新 config.js 后上传前端
gsutil mb -l us-central1 gs://pawpal-web-frontend
gsutil -m cp -r static-deploy/* gs://pawpal-web-frontend/
gsutil iam ch allUsers:objectViewer gs://pawpal-web-frontend
```

---

## 环境变量参考

### PawPal-Web Backend (Cloud Run)

| 变量 | 说明 | 示例 |
|------|------|------|
| `USER_SERVICE_URL` | User 微服务地址 | `http://34.9.57.25:3001` |
| `WALK_SERVICE_URL` | Walk 微服务地址 | `https://pawpal-walk-service-xxx.run.app` |
| `REVIEW_SERVICE_URL` | Review 微服务地址 | `https://pawpal-review-service-xxx.run.app` |
| `SECRET_KEY` | Flask session 密钥 | (生成一个随机字符串) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `445201823926-xxx.apps.googleusercontent.com` |

### Review Service (Cloud Run)

| 变量 | 说明 | 示例 |
|------|------|------|
| `DB_USER` | 数据库用户名 | `root` |
| `DB_PASS` | 数据库密码 | `your-password` |
| `DB_NAME` | 数据库名称 | `pawpal-review` |
| `CLOUD_SQL_CONNECTION_NAME` | Cloud SQL 连接名 | `project:region:instance` |

---

## 故障排除

### Cloud Run 部署失败
- 检查 Dockerfile 是否正确
- 确保所有依赖在 requirements.txt 中
- 查看 Cloud Build 日志

### Review Service 数据库连接失败
- 确保 Cloud SQL 实例已创建
- 检查 `--add-cloudsql-instances` 参数
- 确认数据库 `pawpal-review` 已创建

### CORS 错误
- 确保 Cloud Run 服务允许未认证访问
- 检查 PawPal-Web 的 CORS 配置

### Google OAuth 不工作
- 确认 OAuth Client ID 正确
- 检查授权来源和回调 URL
