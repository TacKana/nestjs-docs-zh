### 概述

[Nest CLI](https://github.com/nestjs/nest-cli) 是一个命令行界面工具，可帮助你初始化、开发和维护 Nest 应用程序。它以多种方式提供帮助，包括搭建项目脚手架、在开发模式下提供服务，以及为生产分发构建和打包应用程序。它体现了最佳实践的架构模式，以鼓励构建良好结构的应用。

#### 安装

**注意**：在本指南中，我们描述了使用 [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) 安装包，包括 Nest CLI。你也可以根据需要选择其他包管理器。使用 npm 时，你有多种选项来管理操作系统命令行如何解析 `nest` CLI 二进制文件的位置。这里，我们描述使用 `-g` 选项全局安装 `nest` 二进制文件。这提供了一定的便利性，也是我们在整个文档中假设采用的方法。请注意，全局安装**任何** `npm` 包都意味着用户需要自行确保运行的是正确版本。这也意味着如果你有多个不同的项目，每个项目都将运行**相同**版本的 CLI。一个合理的替代方案是使用 `npm` cli 内置的 [npx](https://github.com/npm/cli/blob/latest/docs/lib/content/commands/npx.md) 程序（或其他包管理器的类似功能）来确保运行的是**受管理版本**的 Nest CLI。我们建议你查阅 [npx 文档](https://github.com/npm/cli/blob/latest/docs/lib/content/commands/npx.md) 和/或咨询你的 DevOps 支持团队以获取更多信息。

使用 `npm install -g` 命令全局安装 CLI（有关全局安装的详细信息，请参阅上面的**注意**）。

```bash
$ npm install -g @nestjs/cli
```

> info **提示** 或者，你可以使用命令 `npx @nestjs/cli@latest` 而无需全局安装 CLI。

#### 基本工作流程

安装后，你可以通过 `nest` 可执行文件直接从操作系统命令行调用 CLI 命令。通过输入以下内容查看可用的 `nest` 命令：

```bash
$ nest --help
```

使用以下结构获取单个命令的帮助。将示例中的 `generate` 替换为任何命令，如 `new`、`add` 等，以获取该命令的详细帮助：

```bash
$ nest generate --help
```

要创建、构建并在开发模式下运行一个新的基础 Nest 项目，请转到应作为新项目父级的文件夹，并运行以下命令：

```bash
$ nest new my-nest-project
$ cd my-nest-project
$ npm run start:dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看运行中的新应用程序。当你更改任何源文件时，应用程序将自动重新编译并重新加载。

> info **提示** 我们推荐使用 [SWC 构建器](/recipes/swc) 以获得更快的构建速度（比默认的 TypeScript 编译器性能提升 10 倍）。

#### 项目结构

当你运行 `nest new` 时，Nest 会生成一个样板应用结构，创建一个新文件夹并填充一组初始文件。你可以继续使用这种默认结构，并按照本文档中的描述添加新组件。我们将 `nest new` 生成的项目结构称为**标准模式**。Nest 还支持另一种用于管理多个项目和库的结构，称为**monorepo 模式**。

除了**构建**过程的工作方式有一些特定考虑（本质上，monorepo 模式简化了有时可能由 monorepo 风格项目结构引起的构建复杂性）以及内置的[库](/cli/libraries)支持之外，其余的 Nest 功能以及本文档同样适用于标准和 monorepo 模式的项目结构。实际上，你可以在未来的任何时候轻松地从标准模式切换到 monorepo 模式，因此在学习 Nest 期间，你可以安全地推迟这一决定。

你可以使用任一模式来管理多个项目。以下是差异的简要总结：

| 功能点                                                     | 标准模式                                                       | Monorepo 模式                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| 多项目管理                                                 | 独立的文件系统结构                                                 | 单一文件系统结构                                           |
| `node_modules` 和 `package.json`                           | 独立实例                                                           | 在 monorepo 中共享                                         |
| 默认编译器                                                 | `tsc`                                                              | webpack                                                    |
| 编译器设置                                                 | 分别指定                                                           | Monorepo 默认设置，可按项目覆盖                            |
| 配置文件如 `eslint.config.mjs`、`.prettierrc` 等           | 分别指定                                                           | 在 monorepo 中共享                                         |
| `nest build` 和 `nest start` 命令                          | 目标默认自动指向上下文中的（唯一）项目                             | 目标默认指向 monorepo 中的**默认项目**                     |
| 库管理                                                     | 手动管理，通常通过 npm 打包                                        | 内置支持，包括路径管理和打包                               |

阅读[工作区](/cli/monorepo)和[库](/cli/libraries)部分以获取更详细的信息，帮助你决定哪种模式最适合你。

<app-banner-courses></app-banner-courses>

#### CLI 命令语法

所有 `nest` 命令都遵循相同的格式：

```bash
nest commandOrAlias requiredArg [optionalArg] [options]
```

例如：

```bash
$ nest new my-nest-project --dry-run
```

这里，`new` 是 _commandOrAlias_。`new` 命令有一个别名 `n`。`my-nest-project` 是 _requiredArg_。如果未在命令行提供 _requiredArg_，`nest` 将提示输入。此外，`--dry-run` 有一个等效的简写形式 `-d`。考虑到这一点，以下命令与上述命令等效：

```bash
$ nest n my-nest-project -d
```

大多数命令和一些选项都有别名。尝试运行 `nest new --help` 来查看这些选项和别名，并确认你对上述结构的理解。

#### 命令概览

运行 `nest <command> --help` 查看以下任何命令的命令特定选项。

有关每个命令的详细描述，请参阅[用法](/cli/usages)。

| 命令       | 别名 | 描述                                                                                    |
| ---------- | ----- | ---------------------------------------------------------------------------------------------- |
| `new`      | `n`   | 搭建一个新的_标准模式_应用程序，包含运行所需的所有样板文件。          |
| `generate` | `g`   | 基于原理图生成和/或修改文件。                                          |
| `build`    |       | 将应用程序或工作区编译到输出文件夹中。                                    |
| `start`    |       | 编译并运行应用程序（或工作区中的默认项目）。                          |
| `add`      |       | 导入已打包为 **nest 库**的库，运行其安装原理图。 |
| `info`     | `i`   | 显示已安装的 nest 包信息和其他有用的系统信息。              |

#### 要求

Nest CLI 需要构建时包含[国际化支持](https://nodejs.org/api/intl.html)（ICU）的 Node.js 二进制文件，例如来自 [Node.js 项目页面](https://nodejs.org/en/download)的官方二进制文件。如果遇到与 ICU 相关的错误，请检查你的二进制文件是否满足此要求。

```bash
node -p process.versions.icu
```

如果该命令打印 `undefined`，则表示你的 Node.js 二进制文件没有国际化支持。