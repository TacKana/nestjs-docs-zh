# docs.nestjs.com 项目工具

本文档概述了我们用于生成 docs.nestjs.com 网站内容的工具。

# 转换

所有由 docs.nestjs.com 应用程序渲染的内容，以及其部分配置文件，都是通过 [Dgeni](https://github.com/angular/dgeni) 从源文件生成的。Dgeni 是一个通用的文档生成工具。

`content` 目录下的 Markdown 文件会被处理和转换为可供 `docs.nestjs.com` 网站前端使用的文件。

# dgeni-cli

dgeni CLI `tools/dgeni-cli.ts` 是一个用于从命令行启动 Dgeni 包的封装器。我们没有使用 Dgeni 包本身提供的 CLI 接口，主要原因是它不支持 TypeScript 的即时编译。
