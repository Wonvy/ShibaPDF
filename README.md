# ShibaPDF

**ShibaPDF** 是一款轻量、极简的纯本地 **PDF 对页/跨页拆单页 & 印前单色黑修复工具**。全程在浏览器本地内存运行（零服务器上传），无需安装 Adobe Acrobat，100% 无损保留原文档的矢量文字、渐变、半透明阴影与印刷色彩。

---

## 核心特性

- **对页无损拆单页**：支持单个或多个 PDF 批量拖入拆分，底层共享资源对象，拆分后文件体积不翻倍。
- **灵活出血设置与智能识别**：
  - 一键切换 `无出血 0mm` / `3mm` / `5mm`，支持四边统一或**上、下、左、右独立设置**。
  - 自动识别常见画册尺寸是否含出血，防止无出血稿件被误裁。
  - 支持“裁除四周出血输出净尺寸单页”或“保留外侧出血并写入 `TrimBox`”。
- **画册封面/封底自动归位**：针对首张对页为 `[左封底 | 右封面]` 的画册排版，支持一键将首张左半页自动移至末页，使封面排第 1 页、封底排末页。
- **印刷单色黑 `K100`（解决 PPT 导 PDF 四色黑 & 保留透明度）**：
  - 自动将页面透明混合空间从 `/DeviceRGB` 修正为符合 `PDF/X-4` 标准的 `/DeviceCMYK`，**100% 保留半透明遮罩、柔和投影与矢量渐变不压平**。
  - 自动将黑/灰文字与矢量线条改写为纯单黑 `0 0 0 K k`（`C0 M0 Y0 K100`），避免套印重影。
- **实时双视图预览**：支持 **跨页裁切红线视图**（含无级缩放）与 **拆后单页顺序预览**。
- **极简留白设计**：支持 **浅色 / 深色** 主题与 **中文 / English** 双语切换。

---

## 快速使用

### 方式一：直接使用单文件网页版（免安装，Windows / macOS 通用）
直接用任意现代浏览器（Chrome / Edge / Safari）双击打开仓库根目录下的 **[`index.html`](./index.html)** 即可离线使用；也可以直接将该仓库开启 **GitHub Pages** 作为在线网页工具访问。

### 方式二：二次开发与重新构建网页版
修改 `src/` 目录下的源码后，执行以下命令重新打包单文件 `index.html`：

```bash
npm install
npm run build
```

### 方式三：Windows 桌面客户端源码（Python 可选版）
位于 `desktop/shibapdf_gui.py`：

```bash
pip install pypdf tkinterdnd2 pyinstaller
python desktop/shibapdf_gui.py
```

---

## 目录结构

```text
ShibaPDF/
├── index.html              # 打包后的独立单文件网页版（可直接离线打开或部署 GitHub Pages）
├── src/
│   ├── template.html       # 界面 HTML 结构模板
│   ├── styles.css          # 极简留白亮/暗双主题样式
│   └── app.js              # 跨页拆分、预览与单色黑 K100 核心逻辑
├── scripts/
│   └── build.js            # 单文件内联打包脚本
└── desktop/
    └── shibapdf_gui.py     # Windows 桌面版 Python 源码
```
