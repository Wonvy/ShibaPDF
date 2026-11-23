<div align="center">

# ShibaPDF

**纯本地无损 PDF 跨页拆单页、四色黑转单黑 (K100) 与印刷规范预检工作台**

*100% 浏览器本地运行 · 零服务器上传 · 无损保留矢量文字、渐变与半透明柔和阴影*

🌐 **[在线直接使用：wonvy.github.io/ShibaPDF](https://wonvy.github.io/ShibaPDF/)** · [English](./README.md) | **简体中文**

</div>

---

![ShibaPDF 跨页裁切视图](./docs/images/split-view-light.png)

## 项目简介

**ShibaPDF** 是一款专为平面设计师、画册排版人员与印前流程打造的轻量级单文件 Web 工具。无需安装 Adobe Acrobat，所有 PDF 解析与重构均在本地浏览器内存完成，一站式解决画册交付中的两大核心场景：

1. **客户电子阅览版（`拆分为单页`）** —— 无损将对页/跨页切分为单页、精准裁除四周出血（例如 `426 × 291 mm` ➜ `210 × 285 mm`），并支持自动将首张跨页左侧的**封底**移至末页，使**封面**排在第 1 页。
2. **印刷厂开机送印版（`不拆页 · 印前单黑`）** —— 100% 保持原跨页尺寸、页数与四周出血不变，专门解决 PowerPoint / Office 导出 PDF 常见的 **“四色黑套印重影”** 问题：将黑/灰文字与线条指令无损改写为纯单黑 **`C0 M0 Y0 K100`**，并将页面透明混合空间修正为符合 `PDF/X-4` 标准的 `/DeviceCMYK`，**完全保留半透明遮罩、软阴影与矢量渐变不压平**。

---

## 核心功能

- **8 项印刷规范自动预检（Preflight）**：
  - **四色黑与单黑文字检测**：识别 `/DeviceRGB` 透明混合空间及非单黑文字隐患，支持**一键导出 K100 修复版**。
  - **页面尺寸一致性与出血位检测**：自动识别混排异形页，区分净尺寸无出血稿件（`0mm`）与标准含出血稿件（`3mm` / `5mm`）。
  - **字体嵌入完整性检测**：深度扫描全书普通字体与中文字体子集描述符，提前预警未嵌入字体引发的乱码缺字。
  - **图片真实印刷分辨率 (DPI) 检测**：通过追踪 PDF 矩阵变换（`CTM`）计算每张位图在纸面上的**真实有效印刷 DPI**（对照 `300 DPI` 印刷标准预警低清图）。
  - **色彩空间审计（CMYK / RGB）、原生透明度与渐变检测、骑马钉 `4P` 页数模数检验、RIP 加密锁检测**。
- **灵活出血控制**：支持 `无 0mm` / `3mm` / `5mm` 快捷预设，支持四边统一或**上、下、左、右独立微调**，可选裁除出血或保留外出血并写入 `TrimBox`。
- **底层共享不膨胀**：跨页拆分共享底层图像、字体与色彩资源对象，导出文件体积不会翻倍。
- **极简双栏工作台**：基于开源 [Lucide Icons](https://lucide.dev/) 线性图标库，支持 **浅色 / 深色** 主题与 **中 / 英** 实时切换。

---

## 界面预览

### 印前规范自动检测报告
![印前规范预检报告](./docs/images/preflight-report-light.png)

### 深色模式与拆后单页顺序总览
![深色模式单页总览](./docs/images/pages-gallery-dark-zh.png)

---

## 快速开始

### 方式一：双击即用（免安装离线单文件）
直接用任意现代浏览器（Chrome / Edge / Safari / Firefox）打开仓库根目录下的 **[`index.html`](./index.html)** 即可离线运行（Windows / macOS 通用）；也可直接开启 GitHub Pages 在线访问。

### 方式二：修改源码并重新打包
若修改了 `src/` 目录下的前端源码，运行以下命令即可重新编译单文件 `index.html`：

```bash
npm install
npm run build
```

---

## 目录结构

```text
ShibaPDF/
├── index.html                        # 打包后的独立单文件网页应用（离线可用 / GitHub Pages 直出）
├── src/
│   ├── template.html                 # 左右分栏结构模板与 Lucide 图标绑定
│   ├── styles.css                    # 极简黑白灰亮/暗双主题样式
│   └── app.js                        # 跨页拆分、K100 指令重写与 8 项印前预检核心引擎
├── scripts/
│   └── build.js                      # 单文件内联构建脚本
├── docs/images/                      # 文档界面配图
└── .github/workflows/deploy-pages.yml # GitHub Pages 自动部署工作流
```

---

## 开源协议

基于 **MIT License** 开源。致谢 [pdf-lib](https://pdf-lib.js.org/)、[PDF.js](https://mozilla.github.io/pdf.js/) 与 [Lucide Icons](https://lucide.dev/)。
