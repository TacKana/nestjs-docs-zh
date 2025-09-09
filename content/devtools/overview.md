### 概述

> info **提示** 本章节涵盖 Nest Devtools 与 Nest 框架的集成。如果你正在寻找 Devtools 应用，请访问 [Devtools](https://devtools.nestjs.com) 网站。

要开始调试本地应用，打开 `main.ts` 文件并确保在应用配置对象中将 `snapshot` 属性设为 `true`，如下所示：

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
```

这将指示框架收集必要的元数据，以便 Nest Devtools 可视化你的应用关系图。

接下来，安装所需依赖：

```bash
$ npm i @nestjs/devtools-integration
```

> warning **警告** 如果你的应用中使用了 `@nestjs/graphql` 包，请确保安装最新版本（`npm i @nestjs/graphql@11`）。

安装此依赖后，打开 `app.module.ts` 文件并导入刚安装的 `DevtoolsModule`：

```typescript
@Module({
  imports: [
    DevtoolsModule.register({
      http: process.env.NODE_ENV !== 'production',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

> warning **警告** 此处检查 `NODE_ENV` 环境变量的原因是，绝对不应在生产环境中使用此模块！

导入 `DevtoolsModule` 且应用启动运行后（`npm run start:dev`），你应该能访问 [Devtools](https://devtools.nestjs.com) URL 并看到内省后的关系图。

<figure><img src="/assets/devtools/modules-graph.png" /></figure>

> info **提示** 如上图所示，每个模块都连接到 `InternalCoreModule`。`InternalCoreModule` 是一个始终导入根模块的全局模块。由于它被注册为全局节点，Nest 会自动在所有模块与 `InternalCoreModule` 节点之间创建边。如果你想在关系图中隐藏全局模块，可以使用侧边栏中的“**隐藏全局模块**”复选框。

由此可见，`DevtoolsModule` 会让你的应用暴露一个额外的 HTTP 服务器（在端口 8000 上），Devtools 应用将使用此服务器来内省你的应用。

为了确认一切正常，将关系图视图切换为“Classes”（类）。你应该会看到以下界面：

<figure><img src="/assets/devtools/classes-graph.png" /></figure>

要聚焦特定节点，点击矩形框，关系图将弹出带有 **“Focus”**（聚焦）按钮的窗口。你也可以使用搜索栏（位于侧边栏）来查找特定节点。

> info **提示** 如果点击 **Inspect**（检查）按钮，应用将带你进入 `/debug` 页面并选中该特定节点。

<figure><img src="/assets/devtools/node-popup.png" /></figure>

> info **提示** 要将关系图导出为图片，点击关系图右上角的 **Export as PNG**（导出为 PNG）按钮。

使用侧边栏（左侧）的表单控件，你可以调整边的接近度，例如可视化特定的应用子树：

<figure><img src="/assets/devtools/subtree-view.png" /></figure>

这在团队中有**新成员**时特别有用，你可以向他们展示应用的结构。此功能还可用于可视化特定模块（例如 `TasksModule`）及其所有依赖项，这在将大型应用拆分为较小模块（例如独立的微服务）时非常方便。

你可以观看以下视频了解**关系图探索器**功能的实际应用：

<figure>
  <iframe
    width="1000"
    height="565"
    src="https://www.youtube.com/embed/bW8V-ssfnvM"
    title="YouTube 视频播放器"
    frameBorder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
  ></iframe>
</figure>

#### 调查“无法解析依赖项”错误

> info **注意** 此功能要求 `@nestjs/core` >= `v9.3.10`。

你可能见过的最常见错误消息之一是 Nest 无法解析提供者的依赖项。使用 Nest Devtools，你可以轻松识别问题并了解如何解决。

首先，打开 `main.ts` 文件并按如下方式更新 `bootstrap()` 调用：

```typescript
bootstrap().catch((err) => {
  fs.writeFileSync('graph.json', PartialGraphHost.toString() ?? '');
  process.exit(1);
});
```

同时，请确保将 `abortOnError` 设置为 `false`：

```typescript
const app = await NestFactory.create(AppModule, {
  snapshot: true,
  abortOnError: false, // <--- 此处
});
```

现在，每当你的应用因**“无法解析依赖项”**错误而引导失败时，你会在根目录中找到 `graph.json` 文件（表示部分关系图）。然后你可以将此文件拖放到 Devtools 中（确保将当前模式从“Interactive”切换为“Preview”）：

<figure><img src="/assets/devtools/drag-and-drop.png" /></figure>

成功上传后，你应该会看到以下关系图和对话框：

<figure><img src="/assets/devtools/partial-graph-modules-view.png" /></figure>

如你所见，高亮的 `TasksModule` 是我们需要检查的模块。此外，对话框中已经显示了一些修复此问题的指导。

如果我们切换到“Classes”（类）视图，将会看到：

<figure><img src="/assets/devtools/partial-graph-classes-view.png" /></figure>

此关系图说明，我们想要注入到 `TasksService` 中的 `DiagnosticsService` 在 `TasksModule` 模块的上下文中未找到，我们可能只需将 `DiagnosticsModule` 导入到 `TasksModule` 模块即可修复此问题！

#### 路由探索器

当你导航到**路由探索器**页面时，应该会看到所有已注册的入口点：

<figure><img src="/assets/devtools/routes.png" /></figure>

> info **提示** 此页面不仅显示 HTTP 路由，还包括所有其他入口点（例如 WebSockets、gRPC、GraphQL 解析器等）。

入口点按其宿主控制器分组。你也可以使用搜索栏查找特定入口点。

如果点击特定入口点，将显示**流程图**。此图展示了该入口点的执行流程（例如绑定到此路由的守卫、拦截器、管道等）。这在你想了解特定路由的请求/响应周期，或排查特定守卫/拦截器/管道为何未执行时特别有用。

#### 沙盒

要实时执行 JavaScript 代码并与你的应用交互，请导航到**沙盒**页面：

<figure><img src="/assets/devtools/sandbox.png" /></figure>

此沙盒可用于**实时**测试和调试 API 端点，让开发者能快速识别和修复问题，而无需使用例如 HTTP 客户端。我们还可以绕过认证层，因此不再需要登录的额外步骤，甚至无需用于测试的特殊用户账户。对于事件驱动型应用，我们还可以直接从沙盒触发事件，并观察应用如何响应。

任何记录下来的内容都会传输到沙盒的控制台，因此我们可以轻松查看发生的情况。

只需**实时**执行代码并立即查看结果，无需重新构建应用和重启服务器。

<figure><img src="/assets/devtools/sandbox-table.png" /></figure>

> info **提示** 要美观地显示对象数组，请使用 `console.table()`（或仅 `table()`）函数。

你可以观看以下视频了解**交互式沙盒**功能的实际应用：

<figure>
  <iframe
    width="1000"
    height="565"
    src="https://www.youtube.com/embed/liSxEN_VXKM"
    title="YouTube 视频播放器"
    frameBorder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
  ></iframe>
</figure>

#### 引导性能分析器

要查看所有类节点（控制器、提供者、增强器等）及其对应的实例化时间列表，请导航到**引导性能**页面：

<figure><img src="/assets/devtools/bootstrap-performance.png" /></figure>

当你想识别应用引导过程中最慢的部分时（例如优化应用启动时间，这对无服务器环境等场景至关重要），此页面特别有用。

#### 审计

要查看应用在分析序列化关系图时自动生成的审计结果——错误/警告/提示，请导航到**审计**页面：

<figure><img src="/assets/devtools/audit.png" /></figure>

> info **提示** 上图未显示所有可用的审计规则。

当你想识别应用中的潜在问题时，此页面非常有用。

#### 预览静态文件

要将序列化的关系图保存到文件，请使用以下代码：

```typescript
await app.listen(process.env.PORT ?? 3000); // 或 await app.init()
fs.writeFileSync('./graph.json', app.get(SerializedGraph).toString());
```

> info **提示** `SerializedGraph` 从 `@nestjs/core` 包导出。

然后你可以拖放/上传此文件：

<figure><img src="/assets/devtools/drag-and-drop.png" /></figure>

当你想与他人（例如同事）分享关系图，或想要离线分析时，这非常有用。