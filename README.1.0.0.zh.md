# 幕布网页端平滑滚动/放缩的Edge扩展
当前版本：v1.0.0
<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat-square" alt="License: MIT" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&amp;logo=nodedotjs&amp;logoColor=white" alt="Node.js >=22" /></a>
</p>

<p align="center"><a href="README.en.md">English</a> · 中文</p>
<p align="center"> <a href="README.md">Latest Release</a> · Font Default Release</p>

## 开发动机
发现幕布网页端、win/mac桌面端均存在滚动与放缩动作卡顿，使用体验甚至不如android/ios端APP。

## 新增功能

在 Edge 中打开 mubu.com 域名下**任意网页**时，让滚动/平移/缩放更平滑：

- **思维导图模式页面**：
  - 滚轮平移画布 = 累加 + 缓动（连续滚多下 = 累加位移+平滑过渡）；
  - Ctrl+滚轮缩放 = 累加 + 缓动，缩放中心跟随光标；
- **大纲模式页面**：
  - 滚轮滚动 = 累加 + 缓动（连续滚多下 = 累加位移+平滑过渡）；
- **编程式滚动**：目录点击 / 锚点 / 定位跳转也变为平滑动画。
- **界面字体覆盖**：统一覆盖为Noto Serif SC。
***

***

### 部署方案 A：Edge 解压扩展（一次安装，长期生效）

1. 点击code下载repo中的所有文件.zip
2. 打开 Edge，地址栏输入 edge://extensions
3. 左下角打开 **开发人员模式**
4. 点击 **加载解压缩的扩展**
5. 选择下载目录下的 mubu-smooth-scroll-extension 文件夹
6. 打开/刷新 mubu.com 任意页面即可（覆盖主域名与所有子域名）

> 之前已加载过本扩展的，在 edge://extensions 里点它的 **刷新** 按钮即可。

### 部署方案 B：Node.js 脚本（无需安装扩展，但需保持脚本运行）

要求本机已安装 Node.js。命令行运行：

    node mubu_smooth_scroll.mjs

脚本会启动带调试端口的 Edge、注入补丁并打开幕布；保持终端窗口开启，Ctrl+C 退出。

| 变量 | 含义 | 默认值 |
| --- | --- | --- |
| EDGE_PATH | msedge.exe 完整路径 | C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe |
| MUBU_URL | 打开地址 | https://mubu.com/app |
| MUBU_PORT | 调试端口 | 9222 |

****

## 原理

补丁核心在 smooth-scroll.patch.js（扩展 content.js 与脚本共用）：

1. 给所有元素注入 scroll-behavior: smooth，让编程式滚动变平滑；
2. 大纲/普通页面：拦截 wheel，把 delta 累加到目标值，再用 rAF 逐帧插值 scrollTop；
3. 思维导图（PIXI 画布，无 DOM 滚动容器）：拦截滚轮，把缓动后的增量以合成 wheel 事件
   重新派发给 .minder-container 复用其原生平移/缩放逻辑；
4. 缩放中心修正：合成事件的 offsetX/offsetY 会被 Chrome 按 1/devicePixelRatio 缩放，
   故重派发时把 clientX/clientY 乘回 devicePixelRatio，使缩放中心精确跟随光标；
5. 保留非思维导图区域的 Ctrl+滚轮浏览器缩放等手势。

## 文件说明

- mubu-smooth-scroll-extension/ — Edge 解压扩展（方案 A，推荐）
- mubu_smooth_scroll.mjs — Node.js 脚本（方案 B）
- smooth-scroll.patch.js — 补丁核心（两种方案共用）

## 展望
1. 欢迎添加branch以实现xmind等其他主流思维导图页面滚动/放缩平滑功能
2. 欢迎添加branch以适配google chrome等其他浏览器的扩展功能
