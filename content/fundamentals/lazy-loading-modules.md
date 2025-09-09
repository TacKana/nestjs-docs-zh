### 懒加载模块

默认情况下，模块是急切加载的，这意味着应用一旦启动，所有模块都会立即加载，无论它们是否立即需要。虽然这对大多数应用来说没问题，但对于运行在**无服务器环境**中的应用/工作者来说，可能会成为瓶颈，因为启动延迟（“冷启动”）至关重要。

懒加载可以通过仅加载特定无服务器函数调用所需的模块来减少启动时间。此外，一旦无服务器函数“预热”完成，你还可以异步加载其他模块，以进一步加快后续调用的启动时间（延迟模块注册）。

> info **提示** 如果你熟悉 **[Angular](https://angular.dev/)** 框架，可能之前见过“[懒加载模块](https://angular.dev/guide/ngmodules/lazy-loading#lazy-loading-basics)”这个术语。请注意，这项技术在 Nest 中**功能上是不同的**，因此请将其视为一个完全不同的功能，只是共享了相似的命名约定。

> warning **警告** 请注意，[生命周期钩子方法](https://docs.nestjs.com/fundamentals/lifecycle-events)在懒加载的模块和服务中不会被调用。

#### 开始使用

要按需加载模块，Nest 提供了 `LazyModuleLoader` 类，可以通过常规方式注入到类中：

```typescript
@@filename(cats.service)
@Injectable()
export class CatsService {
  constructor(private lazyModuleLoader: LazyModuleLoader) {}
}
@@switch
@Injectable()
@Dependencies(LazyModuleLoader)
export class CatsService {
  constructor(lazyModuleLoader) {
    this.lazyModuleLoader = lazyModuleLoader;
  }
}
```

> info **提示** `LazyModuleLoader` 类是从 `@nestjs/core` 包导入的。

或者，你也可以从应用启动文件（`main.ts`）中获取 `LazyModuleLoader` 提供者的引用，如下所示：

```typescript
// "app" 代表一个 Nest 应用实例
const lazyModuleLoader = app.get(LazyModuleLoader);
```

有了这个，你现在可以使用以下结构加载任何模块：

```typescript
const { LazyModule } = await import('./lazy.module');
const moduleRef = await this.lazyModuleLoader.load(() => LazyModule);
```

> info **提示** “懒加载”的模块在首次调用 `LazyModuleLoader#load` 方法时会被**缓存**。这意味着，后续每次尝试加载 `LazyModule` 都会**非常快**，并且会返回缓存的实例，而不是再次加载模块。
>
> ```bash
> 加载 "LazyModule" 尝试：1
> 时间：2.379ms
> 加载 "LazyModule" 尝试：2
> 时间：0.294ms
> 加载 "LazyModule" 尝试：3
> 时间：0.303ms
> ```
>
> 此外，“懒加载”的模块与应用启动时急切加载的模块以及之后在你的应用中注册的任何其他懒加载模块共享相同的模块图。

其中 `lazy.module.ts` 是一个导出**常规 Nest 模块**的 TypeScript 文件（不需要额外的更改）。

`LazyModuleLoader#load` 方法返回（`LazyModule` 的）[模块引用](/fundamentals/module-ref)，它允许你导航内部提供者列表，并使用其注入令牌作为查找键来获取任何提供者的引用。

例如，假设我们有一个 `LazyModule`，其定义如下：

```typescript
@Module({
  providers: [LazyService],
  exports: [LazyService],
})
export class LazyModule {}
```

> info **提示** 懒加载模块不能注册为**全局模块**，因为这毫无意义（因为它们是懒加载的，在所有静态注册的模块已经实例化后按需注册）。同样，注册的**全局增强器**（守卫/拦截器等）也无法正常工作。

有了这个，我们可以获取 `LazyService` 提供者的引用，如下所示：

```typescript
const { LazyModule } = await import('./lazy.module');
const moduleRef = await this.lazyModuleLoader.load(() => LazyModule);

const { LazyService } = await import('./lazy.service');
const lazyService = moduleRef.get(LazyService);
```

> warning **警告** 如果你使用 **Webpack**，请确保更新你的 `tsconfig.json` 文件 - 将 `compilerOptions.module` 设置为 `"esnext"`，并添加 `compilerOptions.moduleResolution` 属性，值为 `"node"`：
>
> ```json
> {
>   "compilerOptions": {
>     "module": "esnext",
>     "moduleResolution": "node",
>     ...
>   }
> }
> ```
>
> 设置了这些选项后，你将能够利用[代码分割](https://webpack.js.org/guides/code-splitting/)功能。

#### 懒加载控制器、网关和解析器

由于 Nest 中的控制器（或 GraphQL 应用中的解析器）代表路由/路径/主题（或查询/变更）的集合，因此你**不能**使用 `LazyModuleLoader` 类来懒加载它们。

> error **警告** 在懒加载模块中注册的控制器、[解析器](/graphql/resolvers)和[网关](/websockets/gateways)将无法按预期工作。同样，你也不能按需注册中间件函数（通过实现 `MiddlewareConsumer` 接口）。

例如，假设你正在使用 Fastify 驱动（使用 `@nestjs/platform-fastify` 包）构建一个 REST API（HTTP 应用）。Fastify 不允许你在应用准备就绪/成功监听消息后注册路由。这意味着即使我们分析了模块控制器中注册的路由映射，所有懒加载的路由也将无法访问，因为在运行时无法注册它们。

同样，我们作为 `@nestjs/microservices` 包一部分提供的某些传输策略（包括 Kafka、gRPC 或 RabbitMQ）需要在建立连接之前订阅/监听特定主题/通道。一旦你的应用开始监听消息，框架将无法订阅/监听新主题。

最后，启用代码优先方法的 `@nestjs/graphql` 包会基于元数据动态生成 GraphQL 模式。这意味着它需要预先加载所有类。否则，将无法创建适当、有效的模式。

#### 常见用例

最常见的情况是，当你的工作者/定时任务/lambda 和无服务器函数/webhook 必须根据输入参数（路由路径/日期/查询参数等）触发不同的服务（不同的逻辑）时，你会看到懒加载模块。另一方面，对于单体应用来说，懒加载模块可能意义不大，因为启动时间相对无关紧要。