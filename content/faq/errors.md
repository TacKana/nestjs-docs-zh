### 常见错误

使用 NestJS 进行开发时，在学习框架的过程中可能会遇到各种错误。

#### "无法解析依赖"错误

> info **提示** 查看 [NestJS 开发者工具](/devtools/overview#investigating-the-cannot-resolve-dependency-error)，它可以帮助你轻松解决"无法解析依赖"错误。

可能最常见的一条错误消息是 Nest 无法解析提供者的依赖关系。错误消息通常如下所示：

```bash
Nest 无法解析 <provider> 的依赖关系 (?)。请确保参数 <unknown_token> 在索引 [<index>] 处可在 <module> 上下文中使用。

可能的解决方案：
- <module> 是有效的 NestJS 模块吗？
- 如果 <unknown_token> 是一个提供者，它是否属于当前 <module>？
- 如果 <unknown_token> 是从单独的 @Module 导出的，该模块是否在 <module> 中导入？
  @Module({
    imports: [ /* 包含 <unknown_token> 的模块 */ ]
  })
```

这个错误最常见的原因是模块的 `providers` 数组中没有包含 `<provider>`。请确保提供者确实在 `providers` 数组中，并遵循 [标准 NestJS 提供者实践](/fundamentals/custom-providers#di-fundamentals)。

有几个常见的陷阱。一个是将提供者放在 `imports` 数组中。如果是这种情况，错误消息中 `<module>` 的位置会显示提供者的名称。

如果在开发过程中遇到此错误，请查看错误消息中提到的模块，并检查其 `providers`。对于 `providers` 数组中的每个提供者，确保模块可以访问所有依赖项。通常，提供者会在"功能模块"和"根模块"中重复出现，这意味着 Nest 会尝试实例化提供者两次。很可能，包含被复制的 `<provider>` 的模块应该添加到"根模块"的 `imports` 数组中。

如果上面的 `<unknown_token>` 是 `dependency`，你可能存在循环文件导入。这与下面的[循环依赖](/faq/common-errors#circular-dependency-error)不同，因为不是在构造函数中让提供者相互依赖，而是意味着两个文件最终相互导入。一个常见的情况是模块文件声明一个令牌并导入一个提供者，而提供者从模块文件导入令牌常量。如果你使用 barrel 文件，请确保你的 barrel 导入不会创建这些循环导入。

如果上面的 `<unknown_token>` 是 `Object`，这意味着你正在使用没有适当提供者令牌的类型/接口进行注入。要解决这个问题，请确保：

1. 你正在导入类引用或使用带有 `@Inject()` 装饰器的自定义令牌。阅读[自定义提供者页面](/fundamentals/custom-providers)，以及
2. 对于基于类的提供者，你正在导入具体类，而不仅仅是类型通过 [`import type ...`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export) 语法。

另外，确保你没有最终将提供者注入到自身，因为 NestJS 中不允许自我注入。当这种情况发生时，`<unknown_token>` 很可能等于 `<provider>`。

<app-banner-devtools></app-banner-devtools>

如果你处于**monorepo 设置**中，你可能会遇到与上述相同的错误，但对于核心提供者称为 `ModuleRef` 作为 `<unknown_token>`：

```bash
Nest 无法解析 <provider> 的依赖关系 (?)。
请确保参数 ModuleRef 在索引 [<index>] 处可在 <module> 上下文中使用。
...
```

这很可能发生在你的项目最终加载了两个 `@nestjs/core` 包的 Node 模块时，如下所示：

```text
.
├── package.json
├── apps
│   └── api
│       └── node_modules
│           └── @nestjs/bull
│               └── node_modules
│                   └── @nestjs/core
└── node_modules
    ├── (其他包)
    └── @nestjs/core
```

解决方案：

- 对于 **Yarn** Workspaces，使用 [nohoist 功能](https://classic.yarnpkg.com/blog/2018/02/15/nohoist) 来防止提升 `@nestjs/core` 包。
- 对于 **pnpm** Workspaces，在你的其他模块中将 `@nestjs/core` 设置为 peerDependencies，并在导入模块的应用 package.json 中设置 `"dependenciesMeta": {{ '{' }}"other-module-name": {{ '{' }}"injected": true &#125;&#125;`。参见：[dependenciesmetainjected](https://pnpm.io/package_json#dependenciesmetainjected)

#### "循环依赖"错误

有时你会发现很难避免应用程序中的[循环依赖](https://docs.nestjs.com/fundamentals/circular-dependency)。你需要采取一些措施来帮助 Nest 解决这些问题。由循环依赖引起的错误如下所示：

```bash
Nest 无法创建 <module> 实例。
<module> "imports" 数组中索引 [<index>] 处的模块未定义。

潜在原因：
- 模块之间存在循环依赖。使用 forwardRef() 来避免它。阅读更多：https://docs.nestjs.com/fundamentals/circular-dependency
- 索引 [<index>] 处的模块类型为"undefined"。检查你的导入语句和模块的类型。

作用域 [<module_import_chain>]
# 示例链 AppModule -> FooModule
```

循环依赖可能由提供者相互依赖引起，或者 TypeScript 文件相互依赖常量，例如从模块文件导出常量并在服务文件中导入它们。对于后者，建议为你的常量创建一个单独的文件。对于前者，请遵循循环依赖指南，并确保模块**和**提供者都标记为 `forwardRef`。

#### 调试依赖错误

除了手动验证你的依赖是否正确之外，从 Nest 8.1.0 开始，你可以将 `NEST_DEBUG` 环境变量设置为解析为真值的字符串，并在 Nest 解析应用程序的所有依赖项时获取额外的日志记录信息。

<figure><img src="/assets/injector_logs.png" /></figure>

在上图中，黄色的字符串是正在注入依赖项的主机类，蓝色的字符串是注入的依赖项的名称或其注入令牌，紫色的字符串是正在搜索依赖项的模块。使用这个，你通常可以回溯依赖解析的过程，了解发生了什么以及为什么会出现依赖注入问题。

#### "检测到文件更改"无限循环

使用 TypeScript 4.9 及以上版本的 Windows 用户可能会遇到这个问题。
当你尝试在监视模式下运行应用程序时，例如 `npm run start:dev`，并看到无限循环的日志消息：

```bash
XX:XX:XX AM - 检测到文件更改。开始增量编译...
XX:XX:XX AM - 发现 0 个错误。监视文件更改。
```

当你使用 NestJS CLI 在监视模式下启动应用程序时，它是通过调用 `tsc --watch` 完成的，从 TypeScript 4.9 版本开始，使用了[新策略](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/#file-watching-now-uses-file-system-events)来检测文件更改，这可能是导致此问题的原因。
为了解决这个问题，你需要在 tsconfig.json 文件中的 `"compilerOptions"` 选项后添加如下设置：

```bash
  "watchOptions": {
    "watchFile": "fixedPollingInterval"
  }
```

这告诉 TypeScript 使用轮询方法来检查文件更改，而不是文件系统事件（新的默认方法），后者在某些机器上可能会引起问题。
你可以在 [TypeScript 文档](https://www.typescriptlang.org/tsconfig#watch-watchDirectory)中阅读更多关于 `"watchFile"` 选项的信息。