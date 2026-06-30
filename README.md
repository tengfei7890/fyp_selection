# 毕业设计选题系统（FYP Selection）

一套服务于"本科生毕业设计选题"业务流程的工程服务软件，支持教师 / 学生 / 管理员三类角色，
并提供随机、双向互选、教师指定、范围随机等多种选题模式，以及平台内沟通能力。

## 技术栈

- **后端**：Node.js + Express + TypeScript + Prisma + MySQL 8 + JWT
- **前端**：React 18 + Vite + TypeScript + Ant Design 5 + React Router v6
- **共享**：`shared/enums.ts` 跨端枚举，两端通过 `@shared/*` 别名引用

## 目录结构

```
fyp_selection/
├─ docker-compose.yml   # 本地 MySQL 8
├─ shared/enums.ts      # 前后端共享枚举
├─ server/              # 后端 (Express + Prisma)
└─ web/                 # 前端 (Vite + React + antd)
```

## 快速开始

### 1. 启动数据库

```bash
docker compose up -d
```

### 2. 启动后端

```bash
cd server
npm install
cp .env.example .env          # 按需修改（默认即可）
npx prisma migrate dev --name init
npm run seed                  # 写入种子数据（各角色账号 + 课题）
npm run dev                   # http://localhost:4000
```

### 3. 启动前端

```bash
cd web
npm install
npm run dev                   # http://localhost:5173
```

## 种子账号（密码均为 `123456`）

| 角色 | 用户名 | 说明 |
|---|---|---|
| 管理员 | `admin` | 系统维护、锁定后修正数据 |
| 教师 | `teacher1` / `teacher2` | 上传与管理课题、查看申请人 |
| 学生 | `student1` … `student5` | 浏览 / 搜索 / 收藏 / 申请课题 |

## 开发路线（分阶段）

- **Phase 0 — 骨架**：项目结构、Prisma、JWT 认证、三角色布局 ✅
- **Phase 1 — 核心**：课题 CRUD、浏览/搜索/收藏/申请、个人信息、用户管理、系统锁定 ✅
- **Phase 2 — 选题引擎**：四种选题模式（随机/双向互选/直接指定/范围随机）→ Assignment 定稿；级联（一人一题）；管理员锁定后修正 ✅
- **Phase 3 — 沟通**：站内信（教师↔学生），会话/未读/课题标签，轻量轮询、预留 WebSocket ✅
- **Phase 4 — 打磨**：合格筛选/匹配、站内通知中心、审计日志、UI 一致性 ✅

版本标签：`v0.1.0`（Phase 0+1 基线）、`v0.2.0`（Phase 2 选题引擎）、`v0.3.0`（Phase 3 站内信）、`v0.4.0`（Phase 4 打磨）。

## 常见问题（本地开发）

**1. `docker compose up` 拉取 MySQL 镜像超时（连不上 Docker Hub）**

国内网络常无法访问 `registry-1.docker.io`。可从镜像加速源拉取后打 tag，无需改全局配置：

```bash
docker pull docker.m.daocloud.io/library/mysql:8.0   # 或 docker.1panel.live / docker.nju.edu.cn
docker tag docker.m.daocloud.io/library/mysql:8.0 mysql:8.0
docker compose up -d
```

**2. `prisma migrate` 报 `P3014`（无法创建 shadow database）**

Prisma 迁移需要一个有建库权限的用户创建影子库。给 `fyp` 用户授权即可（仅本地开发）：

```bash
docker exec fyp_mysql mysql -uroot -prootpass \
  -e "GRANT ALL PRIVILEGES ON *.* TO 'fyp'@'%'; FLUSH PRIVILEGES;"
```

