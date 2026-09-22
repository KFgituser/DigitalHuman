# 持续集成（CI）

本项目使用 GitHub Actions。在每次推送和 Pull Request 时，CI 会：

1. 使用 Java 17 执行后端测试与打包；
2. 使用 Node.js 22 安装、测试并构建前端；
3. 拒绝提交本地配置、`.env` 文件和明显的密码文本文件。

CI 不会部署服务，也不会使用真实数据库账号、JWT 密钥或管理员密码。

## 启用方式

将仓库推送到 GitHub 后，在仓库的 **Actions** 页面启用工作流即可。首次执行会自动开始；不需要配置 Secrets。

## 本地执行同等检查

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd package -DskipTests

cd ..\frontend
npm ci
$env:CI = 'true'
npm test -- --watchAll=false
npm run build
```

## 后续接入 CD

以后增加 Docker 镜像构建与部署时，数据库账号、JWT 密钥等只放在 GitHub Secrets 或目标服务器 `.env`，不要提交到仓库。
