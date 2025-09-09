<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">一个用于构建高效、可扩展服务端应用的渐进式 <a href="http://nodejs.org" target="_blank">Node.js</a> 框架。</p>
<p align="center">
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM 版本" /></a>
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="软件包许可证" /></a>
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/dm/@nestjs/core.svg" alt="NPM 下载量" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://dev.to/nestjs"><img src="https://img.shields.io/badge/blog-dev.to-green"/></a>
<a href="https://opencollective.com/nest#backer"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Open Collective 赞助者" /></a>
<a href="https://opencollective.com/nest#sponsor"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Open Collective 赞助商" /></a>
<a href="https://paypal.me/kamilmysliwiec"><img src="https://img.shields.io/badge/Donate-PayPal-dc3d53.svg"/></a>
<a href="https://twitter.com/nestframework"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
<!--
[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
[![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)
-->

## 项目简介

本项目基于 [Angular CLI](https://github.com/angular/angular-cli) 构建，使用 [Dgeni 文档生成器](https://github.com/angular/dgeni) 将源码文档（markdown 格式）编译为发布格式。此仓库包含 [docs.nestjs.com](https://docs.nestjs.com) 的源代码，即官方 Nest 文档。

## 安装方法

安装项目依赖并通过以下命令启动本地服务器：

```bash
$ npm install
$ npm run start
```

在浏览器中访问 [`http://localhost:4200/`](http://localhost:4200/)。

所有页面均采用 [markdown](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet) 编写，位于 `content` 目录下。

## 构建

运行 `npm run build` 构建项目，构建产物将存储在 `dist/` 目录。

如需 _监听模式_ 构建，运行 `npm run build:watch`。内容变更会自动重新编译并重建，内容通过 [`http://localhost:4200/`](http://localhost:4200/) 提供。

生产环境构建请使用 `npm run build:prod`。

## 支持

Nest 是一个 MIT 许可的开源项目。项目的发展离不开赞助商和出色的支持者。如果你愿意加入他们，请[点击这里了解更多](https://opencollective.com/nest)。

## 联系我们

- 作者 - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- 官网 - [https://nestjs.com](https://nestjs.com/)
- 推特 - [@nestframework](https://twitter.com/nestframework)

## 许可证

Nest 遵循 [MIT 许可证](LICENSE)。
