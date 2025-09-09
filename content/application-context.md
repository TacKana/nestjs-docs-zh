### 独立应用

有多种方式可以挂载 Nest 应用。你可以创建一个 Web 应用、微服务，或者仅创建一个简单的 Nest **独立应用**（不包含任何网络监听器）。Nest 独立应用是 Nest **IoC 容器**的封装，该容器持有所有已实例化的类。我们可以使用独立应用对象直接从任何导入的模块中获取到任何现有实例的引用。因此，你可以在任何地方利用 Nest 框架，例如，包括脚本化的 **CRON** 任务。你甚至可以在其上构建一个 **CLI**。

#### 开始使用

要创建一个 Nest 独立应用，使用以下结构：

```typescript
@@filename()
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // 在此处添加你的应用逻辑...
}
bootstrap();
```

#### 从静态模块获取提供者

独立应用对象允许你获取在 Nest 应用中注册的任何实例的引用。假设我们在 `TasksModule` 模块中有一个 `TasksService` 提供者，该模块由我们的 `AppModule` 模块导入。这个类提供了一组我们希望从 CRON 任务中调用的方法。

```typescript
@@filename()
const tasksService = app.get(TasksService);
```

要访问 `TasksService` 实例，我们使用 `get()` 方法。`get()` 方法就像一个**查询**，它在每个已注册的模块中搜索实例。你可以向它传递任何提供者的 token。或者，为了进行严格的上下文检查，传递一个带有 `strict: true` 属性的选项对象。启用此选项后，你需要通过特定的模块来从选定的上下文中获取特定的实例。

```typescript
@@filename()
const tasksService = app.select(TasksModule).get(TasksService, { strict: true });
```

以下是可用于从独立应用对象中检索实例引用的方法的总结。

<table>
  <tr>
    <td>
      <code>get()</code>
    </td>
    <td>
      检索应用上下文中可用的控制器或提供者（包括守卫、过滤器等）的实例。
    </td>
  </tr>
  <tr>
    <td>
      <code>select()</code>
    </td>
    <td>
      遍历模块图以拉取所选模块的特定实例（与上述严格模式一起使用）。
    </td>
  </tr>
</table>

> info **提示** 在非严格模式下，默认选择根模块。要选择任何其他模块，你需要逐步手动遍历模块图。

请注意，独立应用没有任何网络监听器，因此任何与 HTTP 相关的 Nest 功能（例如，中间件、拦截器、管道、守卫等）在此上下文中不可用。

例如，即使你在应用中注册了全局拦截器，然后使用 `app.get()` 方法获取控制器的实例，拦截器也不会被执行。

#### 从动态模块获取提供者

在处理[动态模块](/fundamentals/dynamic-modules)时，我们需要向 `app.select` 提供代表应用中已注册动态模块的相同对象。例如：

```typescript
@@filename()
export const dynamicConfigModule = ConfigModule.register({ folder: './config' });

@Module({
  imports: [dynamicConfigModule],
})
export class AppModule {}
```

然后你可以在之后选择该模块：

```typescript
@@filename()
const configService = app.select(dynamicConfigModule).get(ConfigService, { strict: true });
```

#### 终止阶段

如果你希望在脚本结束后关闭 Node 应用（例如，对于运行 CRON 任务的脚本），你必须在 `bootstrap` 函数的末尾调用 `app.close()` 方法，如下所示：

```typescript
@@filename()
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // 应用逻辑...
  await app.close();
}
bootstrap();
```

如[生命周期事件](/fundamentals/lifecycle-events)章节所述，这将触发生命周期钩子。

#### 示例

一个可用的示例可以在[这里](https://github.com/nestjs/nest/tree/master/sample/18-context)找到。