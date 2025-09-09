### 异步本地存储

`AsyncLocalStorage` 是一个 [Node.js API](https://nodejs.org/api/async_context.html#async_context_class_asynclocalstorage)（基于 `async_hooks` API），它提供了一种在应用中传播本地状态的新方式，无需显式将其作为函数参数传递。这类似于其他语言中的线程本地存储。

Async Local Storage 的核心思想是，我们可以使用 `AsyncLocalStorage#run` 调用来“包装”某个函数调用。所有在被包装调用内执行的代码都能访问同一个 `store`，且每个调用链都会拥有唯一的存储空间。

在 NestJS 的上下文中，这意味着如果能在请求生命周期内找到一个位置，将请求的其余代码包装起来，我们就能访问和修改仅对该请求可见的状态，这可以作为 REQUEST 作用域提供者及其某些限制的替代方案。

或者，我们也可以使用 ALS 来仅为系统的一部分（例如“事务”对象）传播上下文，而无需在服务间显式传递，这可以增强隔离性和封装性。

#### 自定义实现

NestJS 本身并未提供任何内置的 `AsyncLocalStorage` 抽象，因此让我们通过最简单的 HTTP 案例来了解如何自行实现，以便更好地理解整个概念：

> info **提示** 如需使用现成的[专用包](recipes/async-local-storage#nestjs-cls)，请继续阅读下文。

1. 首先，在某个共享源文件中创建一个新的 `AsyncLocalStorage` 实例。由于我们使用的是 NestJS，我们还可以将其转换为带有自定义提供者的模块。

```ts
@@filename(als.module)
@Module({
  providers: [
    {
      provide: AsyncLocalStorage,
      useValue: new AsyncLocalStorage(),
    },
  ],
  exports: [AsyncLocalStorage],
})
export class AlsModule {}
```
>  info **提示** `AsyncLocalStorage` 从 `async_hooks` 导入。

2. 我们只关注 HTTP，因此使用中间件通过 `AsyncLocalStorage#run` 包装 `next` 函数。由于中间件是请求首先到达的地方，这将使 `store` 在所有增强器和系统的其余部分中可用。

```ts
@@filename(app.module)
@Module({
  imports: [AlsModule],
  providers: [CatsService],
  controllers: [CatsController],
})
export class AppModule implements NestModule {
  constructor(
    // 在模块构造函数中注入 AsyncLocalStorage，
    private readonly als: AsyncLocalStorage
  ) {}

  configure(consumer: MiddlewareConsumer) {
    // 绑定中间件，
    consumer
      .apply((req, res, next) => {
        // 根据请求用一些默认值填充存储，
        const store = {
          userId: req.headers['x-user-id'],
        };
        // 并将 "next" 函数作为回调与存储一起传递给 "als.run" 方法。
        this.als.run(store, () => next());
      })
      .forRoutes('*path');
  }
}
@@switch
@Module({
  imports: [AlsModule],
  providers: [CatsService],
  controllers: [CatsController],
})
@Dependencies(AsyncLocalStorage)
export class AppModule {
  constructor(als) {
    // 在模块构造函数中注入 AsyncLocalStorage，
    this.als = als
  }

  configure(consumer) {
    // 绑定中间件，
    consumer
      .apply((req, res, next) => {
        // 根据请求用一些默认值填充存储，
        const store = {
          userId: req.headers['x-user-id'],
        };
        // 并将 "next" 函数作为回调与存储一起传递给 "als.run" 方法。
        this.als.run(store, () => next());
      })
      .forRoutes('*path');
  }
}
```

3. 现在，在请求生命周期的任何地方，我们都可以访问本地存储实例。

```ts
@@filename(cats.service)
@Injectable()
export class CatsService {
  constructor(
    // 我们可以注入提供的 ALS 实例。
    private readonly als: AsyncLocalStorage,
    private readonly catsRepository: CatsRepository,
  ) {}

  getCatForUser() {
    // "getStore" 方法将始终返回与给定请求关联的存储实例。
    const userId = this.als.getStore()["userId"] as number;
    return this.catsRepository.getForUser(userId);
  }
}
@@switch
@Injectable()
@Dependencies(AsyncLocalStorage, CatsRepository)
export class CatsService {
  constructor(als, catsRepository) {
    // 我们可以注入提供的 ALS 实例。
    this.als = als
    this.catsRepository = catsRepository
  }

  getCatForUser() {
    // "getStore" 方法将始终返回与给定请求关联的存储实例。
    const userId = this.als.getStore()["userId"] as number;
    return this.catsRepository.getForUser(userId);
  }
}
```

4. 就这样。现在我们有了共享请求相关状态的方法，而无需注入整个 `REQUEST` 对象。

> warning **警告** 请注意，虽然这种技术对许多用例很有用，但它本质上会模糊代码流程（创建隐式上下文），因此请负责任地使用，尤其要避免创建上下文相关的“[上帝对象](https://en.wikipedia.org/wiki/God_object)”。

### NestJS CLS

[nestjs-cls](https://github.com/Papooch/nestjs-cls) 包在使用原生 `AsyncLocalStorage` 的基础上提供了多项开发者体验改进（`CLS` 是“延续本地存储”的缩写）。它将实现抽象到一个 `ClsModule` 中，该模块提供了为不同传输方式（不仅是 HTTP）初始化 `store` 的各种方法，以及强类型支持。

然后可以通过可注入的 `ClsService` 访问存储，或者通过使用[代理提供者](https://www.npmjs.com/package/nestjs-cls#proxy-providers)将其完全从业务逻辑中抽象出来。

> info **提示** `nestjs-cls` 是第三方包，不由 NestJS 核心团队维护。请在该库的[相应仓库](https://github.com/Papooch/nestjs-cls/issues)中报告发现的任何问题。

#### 安装

除了对 `@nestjs` 库的 peer 依赖外，它仅使用内置的 Node.js API。像安装其他包一样安装它。

```bash
npm i nestjs-cls
```

#### 用法

使用 `nestjs-cls` 可以实现与[上文](recipes/async-local-storage#custom-implementation)描述的类似功能，具体如下：

1. 在根模块中导入 `ClsModule`。

```ts
@@filename(app.module)
@Module({
  imports: [
    // 注册 ClsModule，
    ClsModule.forRoot({
      middleware: {
        // 自动为所有路由挂载 ClsMiddleware
        mount: true,
        // 并使用 setup 方法提供默认存储值。
        setup: (cls, req) => {
          cls.set('userId', req.headers['x-user-id']);
        },
      },
    }),
  ],
  providers: [CatsService],
  controllers: [CatsController],
})
export class AppModule {}
```

2. 然后可以使用 `ClsService` 访问存储值。

```ts
@@filename(cats.service)
@Injectable()
export class CatsService {
  constructor(
    // 我们可以注入提供的 ClsService 实例，
    private readonly cls: ClsService,
    private readonly catsRepository: CatsRepository,
  ) {}

  getCatForUser() {
    // 并使用 "get" 方法检索任何存储的值。
    const userId = this.cls.get('userId');
    return this.catsRepository.getForUser(userId);
  }
}
@@switch
@Injectable()
@Dependencies(AsyncLocalStorage, CatsRepository)
export class CatsService {
  constructor(cls, catsRepository) {
    // 我们可以注入提供的 ClsService 实例，
    this.cls = cls
    this.catsRepository = catsRepository
  }

  getCatForUser() {
    // 并使用 "get" 方法检索任何存储的值。
    const userId = this.cls.get('userId');
    return this.catsRepository.getForUser(userId);
  }
}
```

3. 为了获得由 `ClsService` 管理的存储值的强类型（并获得字符串键的自动提示），我们可以在注入时使用可选的类型参数 `ClsService<MyClsStore>`。

```ts
export interface MyClsStore extends ClsStore {
  userId: number;
}
```

> info **提示** 该包还可以自动生成请求 ID，并通过 `cls.getId()` 稍后访问，或者使用 `cls.get(CLS_REQ)` 获取整个请求对象。

#### 测试

由于 `ClsService` 只是另一个可注入的提供者，它可以在单元测试中完全被模拟。

然而，在某些集成测试中，我们可能仍希望使用真正的 `ClsService` 实现。在这种情况下，我们需要使用 `ClsService#run` 或 `ClsService#runWith` 调用来包装具有上下文感知的代码片段。

```ts
describe('CatsService', () => {
  let service: CatsService
  let cls: ClsService
  const mockCatsRepository = createMock<CatsRepository>()

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      // 像通常一样设置大部分测试模块。
      providers: [
        CatsService,
        {
          provide: CatsRepository
          useValue: mockCatsRepository
        }
      ],
      imports: [
        // 导入静态版本的 ClsModule，它仅提供 ClsService，
        // 但不以任何方式设置存储。
        ClsModule
      ],
    }).compile()

    service = module.get(CatsService)

    // 同时检索 ClsService 供后续使用。
    cls = module.get(ClsService)
  })

  describe('getCatForUser', () => {
    it('retrieves cat based on user id', async () => {
      const expectedUserId = 42
      mocksCatsRepository.getForUser.mockImplementationOnce(
        (id) => ({ userId: id })
      )

      // 将测试调用包装在 `runWith` 方法中，
      // 在该方法中我们可以传递手动制作的存储值。
      const cat = await cls.runWith(
        { userId: expectedUserId },
        () => service.getCatForUser()
      )

      expect(cat.userId).toEqual(expectedUserId)
    })
  })
})
```

#### 更多信息

访问 [NestJS CLS GitHub 页面](https://github.com/Papooch/nestjs-cls)获取完整的 API 文档和更多代码示例。