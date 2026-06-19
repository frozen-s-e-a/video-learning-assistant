# Video Learning Assistant

一个面向编程教学视频的浏览器学习助手。你暂停视频后，插件可以截取当前画面、读取页面上下文和字幕信息，并把问题发送到云端 FastAPI 后端，由 AI 解释当前代码、课件或错误信息。

当前项目优先支持 Bilibili，其次支持 YouTube，并提供通用 `<video>` 页面 fallback。

## 功能状态

- Chrome / Edge Manifest V3 插件
- 视频暂停后显示分析按钮
- 支持当前画面截图分析
- 支持框选画面区域后分析
- 支持读取视频标题、URL、当前播放时间和字幕上下文
- 支持侧栏展示分析结果和继续追问
- 支持本地最近历史记录
- 支持个人访问 token 鉴权
- 支持模型选择配置入口：OpenAI GPT、Claude、DeepSeek、小米 MiMo、Fake provider
- FastAPI 云后端骨架和测试

注意：当前能完整跑通闭环的是 `fake` provider。OpenAI、Claude、DeepSeek、小米 MiMo 的配置入口和后端 provider shell 已预留，但真实 API 调用还没有接入；配置真实 key 后会返回 `PROVIDER_NOT_IMPLEMENTED`，避免误用 fake 结果。

## 项目结构

```text
.
├── extension/              # 浏览器插件
│   ├── src/                # content script, background, side panel, options
│   └── tests/              # Vitest 测试
├── server/                 # FastAPI 后端
│   ├── app/                # API, auth, schemas, providers, services
│   └── tests/              # Pytest 测试
└── docs/
    ├── deployment.md       # 后端部署说明
    └── extension-install.md# 插件安装说明
```

## 本地启动后端

推荐使用 Conda 新建独立环境：

```powershell
conda create -n video-learning-assistant python=3.11
conda activate video-learning-assistant
python -m pip install -r server\requirements.txt
Copy-Item server\.env.example server\.env
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8787 --app-dir server
```

检查后端：

```text
http://127.0.0.1:8787/health
```

`.env` 里至少需要设置：

```env
APP_ACCESS_TOKEN=change-me
```

## 安装插件

1. 打开 Chrome 或 Edge。
2. 进入 `chrome://extensions` 或 `edge://extensions`。
3. 开启开发者模式。
4. 点击 `Load unpacked` / `加载已解压的扩展程序`。
5. 选择仓库里的 `extension` 目录。
6. 打开插件 options 页面。
7. 填写后端地址，例如 `http://127.0.0.1:8787`。
8. 填写和后端 `.env` 一致的 access token。
9. provider 先选 `fake`，model 选择 fake 模型。
10. 打开 Bilibili 或 YouTube 教学视频，暂停后点击分析按钮。

更多细节见 [docs/extension-install.md](docs/extension-install.md)。

## 云服务器部署

云端部署时，把 `server` 目录放到服务器上，使用 Uvicorn 启动，并通过 HTTPS 反向代理暴露给插件。

简化示例：

```bash
cp .env.example .env
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8787
```

更多细节见 [docs/deployment.md](docs/deployment.md)。

## 测试

后端测试：

```powershell
conda activate video-learning-assistant
$env:PYTHONPATH=(Resolve-Path 'server').Path
python -m pytest server\tests -v
```

前端测试：

```powershell
cd extension
npm install
npm test
```

当前已验证：

- Backend: 19 tests passed
- Extension: 32 tests passed

## 后续开发重点

1. 接入真实 OpenAI / Claude / DeepSeek / 小米 MiMo API。
2. 增加 OCR 服务，让非视觉模型也能分析代码截图。
3. 支持更多视频网站的字幕解析。
4. 增加云端历史或多设备同步。
5. 打包发布插件，减少手动安装步骤。

