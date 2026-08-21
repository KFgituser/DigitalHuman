# Docker Compose 部署与迁移

本项目由三个 Linux 容器组成：React/Nginx 前端、Spring Boot 后端、MySQL 数据库。浏览器只访问前端的 80 端口；Nginx 会把 `/api` 自动转发给后端，因此不再依赖 `localhost:8080`。

## 第一次在当前机器启动

1. 启动 Docker Desktop，确认它处于 **Linux containers / WSL 2** 模式。
2. 新开 PowerShell，确认下列命令均能显示版本号：

   ```powershell
   docker version
   docker compose version
   ```

3. 在项目根目录执行一次。脚本会生成仅本机保存的 `.env`，并询问初始管理员账号和密码：

   ```powershell
   .\scripts\Initialize-DeploymentEnv.ps1
   ```

4. 构建并启动：

   ```powershell
   docker compose -f compose.yaml -f compose.build.yaml up -d --build
   ```

5. 浏览器访问 `http://localhost`。查看运行状态与日志：

   ```powershell
   docker compose ps
   docker compose logs -f
   ```

数据保存在 Docker 命名卷 `digitalhuman_mysql_data`；普通的重启、更新容器不会清空数据。停止服务使用 `docker compose down`，不要使用 `docker compose down -v`，后者会删除数据库。

## 打成可离线迁移的部署包

首次启动并确认可用后，执行：

```powershell
.\scripts\Export-OfflinePackage.ps1 -OutputDirectory 'D:\digitalhuman-offline'
```

此命令会构建应用镜像、下载 MySQL 镜像，并在目标目录输出：

```text
digitalhuman-offline/
├─ images.tar             所有运行所需 Docker 镜像
├─ compose.yaml
├─ .env                   真实密钥与初始账号配置，必须保密
├─ database/
├─ database-backup.sql    导出时 Compose 正在运行则自动包含
└─ Start-Offline.ps1
```

把整个文件夹复制至新机器。新机器只需安装并启动 Docker Desktop，不需要安装 Java、Node.js、MySQL 或联网。进入该目录后运行：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\Start-Offline.ps1
```

之后访问 `http://localhost` 或 `http://新机器IP`。

## 数据备份

运行中的 Compose 数据库可随时导出：

```powershell
.\scripts\Backup-ComposeDatabase.ps1
```

备份文件在 `backups/`。当使用 `Export-OfflinePackage.ps1` 时，若 Compose 的 MySQL 正在运行，脚本会自动创建并携带 `database-backup.sql`；新机器的 `Start-Offline.ps1` 首次运行会自动恢复它。这样账号、问答记录等 MySQL 数据会一并迁移。

如果你当前仍使用 Docker 之外的本机 MySQL，先用该 MySQL 的 `mysqldump` 导出 `digitalhuman` 数据库，再在 Compose 的 MySQL 启动后导入；完成这一次迁移后，后续离线导出会自动携带数据快照。

## 安全注意事项

- `.env` 和 SQL 备份均包含敏感数据，不能提交 Git，也不应发到公开网盘。
- 首次启动 MySQL 后，修改 `.env` 中的数据库密码不会修改已经初始化的数据库账号；如需轮换密码，应在 MySQL 内执行专门的账号变更。
- 若端口 80 被 IIS 等程序占用，将 `.env` 的 `HOST_PORT` 改为未占用端口，例如 `8088`，再执行 `docker compose up -d`。
