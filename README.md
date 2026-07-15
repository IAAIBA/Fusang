# Fusang

Fusang 是一个以横向文学蒙太奇为核心的个人展示与写作站点。

[访问生产站点](https://fusang.arsvine.com)

## 特性

- 无缝循环的横向滚动与惯性拖动
- 深色、亮色主题
- 雨夜、水面与植物氛围影像
- 全粒子 Fusang 狗狗头像
- SVG 自定义鼠标与交互冷却动画
- MDX 写作、归档、RSS 与 sitemap
- 移动端横屏提示

## 技术栈

- Astro
- React
- GSAP
- TypeScript
- Vitest 与 Playwright
- Vercel

## 本地开发

```bash
pnpm install
pnpm dev
```

## 检查与构建

```bash
pnpm check
pnpm test
pnpm test:e2e
pnpm build
```

## 部署

`main` 分支已连接到 Vercel 项目 `arsvine-realm/fusang`，推送后由 Vercel 自动创建生产部署。

第三方来源与许可见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
