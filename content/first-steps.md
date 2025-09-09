### 第一步

在这组文章中，你将学习 Nest 的**核心基础知识**。为了熟悉 Nest 应用程序的基本构建模块，我们将构建一个基础的 CRUD 应用程序，其功能涵盖了入门级的许多方面。

#### 语言选择

我们热爱 [TypeScript](https://www.typescriptlang.org/)，但最重要的是——我们热爱 [Node.js](https://nodejs.org/en/)。这就是为什么 Nest 同时兼容 TypeScript 和纯 JavaScript。Nest 利用了最新的语言特性，因此要将其与原生 JavaScript 一起使用，我们需要一个 [Babel](https://babeljs.io/) 编译器。

我们在提供的示例中主要使用 TypeScript，但你始终可以**切换代码片段**到原生 JavaScript 语法（只需点击每个片段右上角的语言切换按钮即可）。

#### 前提条件

请确保你的操作系统上已安装 [Node.js](https://nodejs.org)（版本 >= 20）。

#### 设置

使用 [Nest CLI](/cli/overview) 设置新项目非常简单。安装 [npm](https://www.npmjs.com/) 后，你可以在操作系统的终端中运行以下命令来创建一个新的 Nest 项目：

```bash
$ npm i -g @nestjs/cli
$ nest new project-name
```

> info **提示** 要使用 TypeScript 的[更严格](https://www.typescriptlang.org/tsconfig#strict)功能集创建新项目，请将 `--strict` 标志传递给 `nest new` 命令。

`project-name` 目录将被创建，node 模块和一些其他样板文件将被安装，并且会创建一个 `src/` 目录，其中包含几个核心文件。

<div class="file-tree">
  <div class="item">src</div>
  <div class="children">
    <div class="item">app.controller.spec.ts</div>
    <div class="item">app.controller.ts</div>
    <div class="item">app.module.ts</div>
    <div class="item">app.service.ts</div>
    <div class="item">main.ts</div>
  </div>
</div>

以下是这些核心文件的简要概述：

|                          |                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `app.controller.ts`      | 带有单个路由的基础控制器。                                                               |
| `app.controller.spec.ts` | 控制器的单元测试。                                                                       |
| `app.module.ts`          | 应用程序的根模块。                                                                       |
| `app.service.ts`         | 带有单个方法的基础服务。                                                                 |
| `main.ts`                | 应用程序的入口文件，使用核心函数 `NestFactory` 创建 Nest 应用程序实例。                  |

`main.ts` 包含一个异步函数，它将**引导**我们的应用程序：

```typescript
@@filename(main)

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
@@switch
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

要创建 Nest 应用程序实例，我们使用核心的 `NestFactory` 类。`NestFactory` 提供了一些静态方法，允许创建应用程序实例。`create()` 方法返回一个应用程序对象，该对象实现了 `INestApplication` 接口。这个对象提供了一组方法，这些方法将在后续章节中描述。在上面的 `main.ts` 示例中，我们只是启动了 HTTP 监听器，让应用程序等待传入的 HTTP 请求。

请注意，使用 Nest CLI 搭建的项目会创建一个初始的项目结构，鼓励开发者遵循将每个模块放在其专用目录中的约定。

> info **提示** 默认情况下，如果在创建应用程序过程中发生任何错误，你的应用程序将以代码 `1` 退出。如果你希望改为抛出错误，请禁用 `abortOnError` 选项（例如，`NestFactory.create(AppModule, {{ '{' }} abortOnError: false {{ '}' }})`）。

<app-banner-courses></app-banner-courses>

#### 平台

Nest 旨在成为一个与平台无关的框架。平台独立性使得可以创建可重用的逻辑部分，开发者可以在几种不同类型的应用程序中利用这些部分。从技术上讲，一旦创建了适配器，Nest 就能够与任何 Node HTTP 框架一起工作。目前开箱即用地支持两种 HTTP 平台：[express](https://expressjs.com/) 和 [fastify](https://www.fastify.io)。你可以选择最适合你需求的平台。

|                    |                                                                                                                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `platform-express` | [Express](https://expressjs.com/) 是一个著名的用于 Node 的简约 Web 框架。它是一个经过实战检验、生产就绪的库，拥有社区实现的丰富资源。默认使用 `@nestjs/platform-express` 包。许多用户对 Express 感到满意，无需额外启用它。 |
| `platform-fastify` | [Fastify](https://www.fastify.io/) 是一个高性能、低开销的框架，高度专注于提供最大效率和速度。阅读如何在此处使用它](/techniques/performance)。                                                                              |

无论使用哪个平台，它都会暴露自己的应用程序接口。这些接口分别被视为 `NestExpressApplication` 和 `NestFastifyApplication`。

当你向 `NestFactory.create()` 方法传递一个类型时，如下例所示，`app` 对象将具有专门用于该特定平台的方法。但请注意，你**不需要**指定类型，**除非**你确实需要访问底层平台 API。

```typescript
const app = await NestFactory.create<NestExpressApplication>(AppModule);
```

#### 运行应用程序

安装过程完成后，你可以在操作系统命令提示符下运行以下命令，启动应用程序监听传入的 HTTP 请求：

```bash
$ npm run start
```

> info **提示** 为了加速开发过程（构建速度提高 20 倍），你可以使用 [SWC 构建器](/recipes/swc)，通过向 `start` 脚本传递 `-b swc` 标志来实现，如下所示：`npm run start -- -b swc`。

此命令启动应用程序，HTTP 服务器监听在 `src/main.ts` 文件中定义的端口。应用程序运行后，打开浏览器并导航到 `http://localhost:3000/`。你应该看到 `Hello World!` 消息。

要监视文件中的更改，你可以运行以下命令来启动应用程序：

```bash
$ npm run start:dev
```

此命令将监视你的文件，自动重新编译和重新加载服务器。

#### 代码检查和格式化

[CLI](/cli/overview) 尽力提供一个可靠的大规模开发工作流程。因此，生成的 Nest 项目预装了代码**检查器**和**格式化器**（分别是 [eslint](https://eslint.org/) 和 [prettier](https://prettier.io/)）。

> info **提示** 不确定格式化器和检查器的作用区别？在此处了解差异](https://prettier.io/docs/en/comparison.html)。

为了确保最大的稳定性和可扩展性，我们使用基础的 [`eslint`](https://www.npmjs.com/package/eslint) 和 [`prettier`](https://www.npmjs.com/package/prettier) CLI 包。这种设置允许通过设计实现与官方扩展的整洁 IDE 集成。

对于不涉及 IDE 的无头环境（持续集成、Git 钩子等），Nest 项目提供了即用型的 `npm` 脚本。

```bash
# 使用 eslint 进行检查和自动修复
$ npm run lint

# 使用 prettier 进行格式化
$ npm run format
```