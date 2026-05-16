<p align="center">
  <a href="architecture.md">English</a> · <strong>简体中文</strong>
</p>

---

# 架构说明

Video Driven Skill 分为 Spring Boot 后端与 React 前端。二者通过 REST API 完成常规操作，通过 WebSocket / SSE 等通道承载耗时较长的生成与执行日志。

## 核心流程

```text
视频上传
  -> 抽帧
  -> 标注与需求
  -> 多模态技能生成
  -> 代码审阅与编辑
  -> 本地运行器
  -> 导出、部署或重新生成
```

## 后端

后端负责持久化、文件存储、模型调用、视频处理与技能执行。

主要模块：

- `controller/`：REST 与 WebSocket 入口。
- `service/VideoService.java`：上传处理、FFmpeg 抽帧与视频流式传输。
- `service/AIService.java`：提示词构建与 OpenAI 兼容的多模态 API 调用。
- `service/SkillService.java`：技能 CRUD、导入导出、排序、重新生成与版本管理。
- `service/SkillRunnerService.java`：临时工作区创建、依赖安装、运行时注入、脚本执行与日志采集。
- `service/KnowledgeService.java`：每个技能的参考文件与清单处理。
- `model/`、`repository/`：基于 SQLite 的领域数据。

运行时数据默认位于 `~/video-driven-skill/`（可通过 `VIDEO_DRIVEN_SKILL_HOME` 覆盖；Windows 下为用户主目录下同名文件夹）：

- `uploads/`：上传视频与抽取帧。
- `skills/`：已生成技能源码。
- `archives/`：可复用的视频 / 帧 / 需求素材。
- `video-driven-skill.db`：SQLite 数据库。

使用 **Docker Compose** 时，数据保存在 Compose 卷 `app-data` 中，容器内路径为 `/data`（环境变量 `VIDEO_DRIVEN_SKILL_HOME=/data`）。

## 前端

前端为 Vite 应用，提供类似「工作室」的流程：

- `HomePage.jsx`：上传、导入与最近资源。
- `PlaygroundPage.jsx`：帧标注与技能工作区布局。
- `FrameTimeline.jsx`、`FrameAnnotator.jsx`、`FrameList.jsx`：可视化证据收集。
- `AIProcessor.jsx`：生成控制与流式状态。
- `SkillList.jsx`：技能仓库与手动拖拽排序。
- `SkillEditor.jsx`、`SkillExport.jsx`、`SkillRunner.jsx`：审阅、导出与执行。
- `RegeneratePanel.jsx`、`PartialRegeneratePanel.jsx`、`CodeComparisonView.jsx`：迭代流程。
- `KnowledgeBasePanel.jsx`：挂在技能上的扩展上下文。

## 技能包形态

生成的技能是一个可导出为 ZIP 的小目录：

```text
SKILL.md
package.json
variables.json
scripts/main.js
knowledge/
```

`SKILL.md` 说明技能意图与变量；`scripts/main.js` 为可执行入口；`variables.json` 定义用户可编辑的运行时输入。

## 模型提供方

后端假定使用 **OpenAI 兼容** 的 chat completions API。可通过以下环境变量配置：

```bash
AI_API_KEY=...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

只要请求与响应形态兼容，即可通过覆盖 `AI_BASE_URL` 与 `AI_MODEL` 接入其它提供方。

## 安全边界

项目默认以本地为先，但录屏与生成脚本可能包含敏感信息。请勿将下列内容纳入版本控制：

- `.env`
- SQLite 数据库
- 上传视频
- 抽取帧
- 已生成技能
- 日志
- 构建产物
- 依赖目录
