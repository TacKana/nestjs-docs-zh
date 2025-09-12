# 转换概述

所有由 docs.nestjs.com 应用程序渲染的内容，以及部分配置文件，都是通过 [Dgeni](https://github.com/angular/dgeni) 从源文件生成的。Dgeni 是一个通用的文档生成工具。

`content` 目录下的 Markdown 文件会被处理和转换为 `docs.nestjs.com` 前端所需的文件。

## 包结构

NestJS 的文档工具被拆分为多个 Dgeni 包。

**nestjs-package**

主包。负责协调以下所有包并设置最终配置，同时负责清理文件系统。

**nestjs-base-package**

为每个包提供通用配置、服务和处理器的基础包。负责一般的输入/输出/模板路径解析。

**nestjs-content-package**

负责管理 NestJS 文档的所有手写内容。它会处理 `content` 文件夹下的 markdown 文件，并管理如 `content/discover/who-uses.json` 这样的 `content/**/*.json` 文件。

**content-package**

用于处理 markdown 内容文件的包。它会为每个 markdown 文件创建一个新的 DocType `content`，包含 `content` 和 `title` 字段。**nestjs-content-package** 会进一步管理这些内容。

## 模板

docs.nestjs.com 的所有 dgeni 转换模板都存储在 `tools/transforms/templates` 文件夹中。详见 [README](./templates/README.md)。
