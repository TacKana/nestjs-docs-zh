### 测试

自动化测试被认为是任何严肃软件开发工作中不可或缺的一部分。自动化使得在开发过程中能够快速、轻松地重复运行单个测试或测试套件，帮助确保发布版本满足质量和性能目标。自动化有助于提高测试覆盖率，并为开发者提供更快的反馈循环。自动化不仅能提高开发者的生产力，还能确保在关键开发生命周期节点（如源码控制检入、功能集成和版本发布）运行测试。

这类测试通常涵盖多种类型，包括单元测试、端到端（e2e）测试、集成测试等。虽然其好处毋庸置疑，但设置这些测试可能很繁琐。Nest 致力于推广开发最佳实践，包括有效测试，因此它内置了以下特性来帮助开发者和团队构建及自动化测试。Nest：

- 自动为组件搭建默认单元测试，为应用程序搭建端到端测试
- 提供默认工具（如构建隔离模块/应用加载器的测试运行器）
- 开箱即用地与 [Jest](https://github.com/facebook/jest) 和 [Supertest](https://github.com/visionmedia/supertest) 集成，同时保持对测试工具的无关性
- 在测试环境中提供 Nest 依赖注入系统，以便轻松模拟组件

如前所述，你可以使用任何喜欢的**测试框架**，因为 Nest 并不强制使用任何特定工具。只需替换所需的元素（如测试运行器），你仍然可以享受 Nest 现成测试设施的好处。

#### 安装

首先安装所需的包：

```bash
$ npm i --save-dev @nestjs/testing
```

#### 单元测试

在以下示例中，我们测试两个类：`CatsController` 和 `CatsService`。如前所述，[Jest](https://github.com/facebook/jest) 被提供为默认测试框架。它作为测试运行器，并提供断言函数和测试替代工具，帮助进行模拟、监视等操作。在以下基础测试中，我们手动实例化这些类，并确保控制器和服务满足其 API 契约。

```typescript
@@filename(cats.controller.spec)
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

describe('CatsController', () => {
  let catsController: CatsController;
  let catsService: CatsService;

  beforeEach(() => {
    catsService = new CatsService();
    catsController = new CatsController(catsService);
  });

  describe('findAll', () => {
    it('应该返回一个猫的数组', async () => {
      const result = ['test'];
      jest.spyOn(catsService, 'findAll').mockImplementation(() => result);

      expect(await catsController.findAll()).toBe(result);
    });
  });
});
@@switch
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

describe('CatsController', () => {
  let catsController;
  let catsService;

  beforeEach(() => {
    catsService = new CatsService();
    catsController = new CatsController(catsService);
  });

  describe('findAll', () => {
    it('应该返回一个猫的数组', async () => {
      const result = ['test'];
      jest.spyOn(catsService, 'findAll').mockImplementation(() => result);

      expect(await catsController.findAll()).toBe(result);
    });
  });
});
```

> info **提示** 将测试文件放在它们测试的类附近。测试文件应有 `.spec` 或 `.test` 后缀。

由于上述示例很简单，我们并没有真正测试任何 Nest 特定的内容。实际上，我们甚至没有使用依赖注入（注意我们将 `CatsService` 的实例传递给 `catsController`）。这种形式的测试——手动实例化被测试的类——通常被称为**隔离测试**，因为它独立于框架。让我们介绍一些更高级的功能，帮助你测试更广泛使用 Nest 特性的应用程序。

#### 测试工具

`@nestjs/testing` 包提供了一组实用工具，可实现更健壮的测试过程。让我们使用内置的 `Test` 类重写前面的示例：

```typescript
@@filename(cats.controller.spec)
import { Test } from '@nestjs/testing';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

describe('CatsController', () => {
  let catsController: CatsController;
  let catsService: CatsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
        controllers: [CatsController],
        providers: [CatsService],
      }).compile();

    catsService = moduleRef.get(CatsService);
    catsController = moduleRef.get(CatsController);
  });

  describe('findAll', () => {
    it('应该返回一个猫的数组', async () => {
      const result = ['test'];
      jest.spyOn(catsService, 'findAll').mockImplementation(() => result);

      expect(await catsController.findAll()).toBe(result);
    });
  });
});
@@switch
import { Test } from '@nestjs/testing';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

describe('CatsController', () => {
  let catsController;
  let catsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
        controllers: [CatsController],
        providers: [CatsService],
      }).compile();

    catsService = moduleRef.get(CatsService);
    catsController = moduleRef.get(CatsController);
  });

  describe('findAll', () => {
    it('应该返回一个猫的数组', async () => {
      const result = ['test'];
      jest.spyOn(catsService, 'findAll').mockImplementation(() => result);

      expect(await catsController.findAll()).toBe(result);
    });
  });
});
```

`Test` 类有助于提供应用程序执行上下文，该上下文本质上模拟了完整的 Nest 运行时，但提供了钩子，使管理类实例（包括模拟和重写）变得容易。`Test` 类有一个 `createTestingModule()` 方法，该方法接受模块元数据对象作为参数（与传递给 `@Module()` 装饰器的对象相同）。该方法返回一个 `TestingModule` 实例，该实例又提供了一些方法。对于单元测试，重要的是 `compile()` 方法。该方法使用其依赖项引导模块（类似于在传统的 `main.ts` 文件中使用 `NestFactory.create()` 引导应用程序的方式），并返回一个准备好进行测试的模块。

> info **提示** `compile()` 方法是**异步的**，因此必须等待。模块编译完成后，你可以使用 `get()` 方法检索它声明的任何**静态**实例（控制器和提供者）。

`TestingModule` 继承自[模块引用](/fundamentals/module-ref)类，因此具有动态解析作用域提供者（瞬态或请求作用域）的能力。使用 `resolve()` 方法实现此功能（`get()` 方法只能检索静态实例）。

```typescript
const moduleRef = await Test.createTestingModule({
  controllers: [CatsController],
  providers: [CatsService],
}).compile();

catsService = await moduleRef.resolve(CatsService);
```

> warning **警告** `resolve()` 方法从它自己的 **DI 容器子树** 返回提供者的唯一实例。每个子树都有一个唯一的上下文标识符。因此，如果你多次调用此方法并比较实例引用，会发现它们不相等。

> info **提示** 了解更多关于模块引用功能的信息[请点击这里](/fundamentals/module-ref)。

你可以使用[自定义提供者](/fundamentals/custom-providers)覆盖任何提供者的生产版本，以进行测试。例如，你可以模拟数据库服务，而不是连接到实时数据库。我们将在下一节介绍覆盖，但它们也可用于单元测试。

<app-banner-courses></app-banner-courses>

#### 自动模拟

Nest 还允许你定义一个模拟工厂，应用于所有缺失的依赖项。这在类中有大量依赖项且模拟所有依赖项将花费很长时间和大量设置的情况下非常有用。要使用此功能，`createTestingModule()` 需要与 `useMocker()` 方法链式调用，传递依赖项模拟的工厂。该工厂可以接受一个可选的令牌，这是一个实例令牌，任何对 Nest 提供者有效的令牌，并返回一个模拟实现。以下是一个使用 [`jest-mock`](https://www.npmjs.com/package/jest-mock) 创建通用模拟器和使用 `jest.fn()` 为 `CatsService` 创建特定模拟的示例。

```typescript
// ...
import { ModuleMocker, MockMetadata } from 'jest-mock';

const moduleMocker = new ModuleMocker(global);

describe('CatsController', () => {
  let controller: CatsController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CatsController],
    })
      .useMocker((token) => {
        const results = ['test1', 'test2'];
        if (token === CatsService) {
          return { findAll: jest.fn().mockResolvedValue(results) };
        }
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockMetadata<
            any,
            any
          >;
          const Mock = moduleMocker.generateFromMetadata(
            mockMetadata,
          ) as ObjectConstructor;
          return new Mock();
        }
      })
      .compile();

    controller = moduleRef.get(CatsController);
  });
});
```

你也可以像通常获取自定义提供者一样从测试容器中获取这些模拟，`moduleRef.get(CatsService)`。

> info **提示** 也可以直接传递通用模拟工厂，如 [`@golevelup/ts-jest`](https://github.com/golevelup/nestjs/tree/master/packages/testing) 中的 `createMock`。

> info **提示** `REQUEST` 和 `INQUIRER` 提供者无法自动模拟，因为它们已在上下文中预定义。但是，可以使用自定义提供者语法或利用 `.overrideProvider` 方法进行**覆盖**。

#### 端到端测试

与专注于单个模块和类的单元测试不同，端到端（e2e）测试在更聚合的级别上覆盖类和模块的交互——更接近最终用户与生产系统的交互类型。随着应用程序的增长，手动测试每个 API 端点的端到端行为变得困难。自动化端到端测试帮助我们确保系统的整体行为正确并满足项目要求。为了执行 e2e 测试，我们使用与**单元测试**中刚刚介绍的类似配置。此外，Nest 使得使用 [Supertest](https://github.com/visionmedia/supertest) 库模拟 HTTP 请求变得容易。

```typescript
@@filename(cats.e2e-spec)
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { CatsModule } from '../../src/cats/cats.module';
import { CatsService } from '../../src/cats/cats.service';
import { INestApplication } from '@nestjs/common';

describe('Cats', () => {
  let app: INestApplication;
  let catsService = { findAll: () => ['test'] };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CatsModule],
    })
      .overrideProvider(CatsService)
      .useValue(catsService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it(`/GET cats`, () => {
    return request(app.getHttpServer())
      .get('/cats')
      .expect(200)
      .expect({
        data: catsService.findAll(),
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
@@switch
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { CatsModule } from '../../src/cats/cats.module';
import { CatsService } from '../../src/cats/cats.service';
import { INestApplication } from '@nestjs/common';

describe('Cats', () => {
  let app: INestApplication;
  let catsService = { findAll: () => ['test'] };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CatsModule],
    })
      .overrideProvider(CatsService)
      .useValue(catsService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it(`/GET cats`, () => {
    return request(app.getHttpServer())
      .get('/cats')
      .expect(200)
      .expect({
        data: catsService.findAll(),
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

> info **提示** 如果你使用 [Fastify](/techniques/performance) 作为 HTTP 适配器，它需要稍微不同的配置，并且具有内置的测试功能：
>
> ```ts
> let app: NestFastifyApplication;
>
> beforeAll(async () => {
>   app = moduleRef.createNestApplication<NestFastifyApplication>(
>     new FastifyAdapter(),
>   );
>
>   await app.init();
>   await app.getHttpAdapter().getInstance().ready();
> });
>
> it(`/GET cats`, () => {
>   return app
>     .inject({
>       method: 'GET',
>       url: '/cats',
>     })
>     .then((result) => {
>       expect(result.statusCode).toEqual(200);
>       expect(result.payload).toEqual(/* expectedPayload */);
>     });
> });
>
> afterAll(async () => {
>   await app.close();
> });
> ```

在此示例中，我们基于前面描述的一些概念构建。除了我们之前使用的 `compile()` 方法外，我们现在使用 `createNestApplication()` 方法来实例化完整的 Nest 运行时环境。

需要注意的一点是，当你的应用程序使用 `compile()` 方法编译时，`HttpAdapterHost#httpAdapter` 在那时将是未定义的。这是因为在此编译阶段尚未创建 HTTP 适配器或服务器。如果你的测试需要 `httpAdapter`，你应该使用 `createNestApplication()` 方法创建应用程序实例，或者重构你的项目，在初始化依赖图时避免此依赖。

好了，让我们分解这个示例：

我们在 `app` 变量中保存了对运行中应用程序的引用，以便我们可以使用它来模拟 HTTP 请求。

我们使用 Supertest 的 `request()` 函数模拟 HTTP 测试。我们希望这些 HTTP 请求路由到我们运行的 Nest 应用程序，因此我们将 Nest 底层的 HTTP 监听器的引用传递给 `request()` 函数（而 Nest 又可能由 Express 平台提供）。因此构造了 `request(app.getHttpServer())`。对 `request()` 的调用会给我们一个包装后的 HTTP 服务器，现在连接到 Nest 应用程序，它暴露了模拟实际 HTTP 请求的方法。例如，使用 `request(...).get('/cats')` 将向 Nest 应用程序发起一个请求，该请求与通过网络传入的 **实际** HTTP 请求（如 `get '/cats'`）相同。

在此示例中，我们还提供了 `CatsService` 的替代（测试替代）实现，它只返回一个我们可以测试的硬编码值。使用 `overrideProvider()` 来提供这样的替代实现。类似地，Nest 提供了分别使用 `overrideModule()`、`overrideGuard()`、`overrideInterceptor()`、`overrideFilter()` 和 `overridePipe()` 方法来覆盖模块、守卫、拦截器、过滤器和管道。

每个覆盖方法（除了 `overrideModule()`）都返回一个具有 3 种不同方法的对象，这些方法镜像了[自定义提供者](/fundamentals/custom-providers)中描述的方法：

- `useClass`：你提供一个类，该类将被实例化以提供覆盖对象（提供者、守卫等）的实例。
- `useValue`：你提供一个将覆盖对象的实例。
- `useFactory`：你提供一个返回将覆盖对象的实例的函数。

另一方面，`overrideModule()` 返回一个具有 `useModule()` 方法的对象，你可以使用该方法提供一个将覆盖原始模块的模块，如下所示：

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideModule(CatsModule)
  .useModule(AlternateCatsModule)
  .compile();
```

每种覆盖方法类型依次返回 `TestingModule` 实例，因此可以与[流式风格](https://en.wikipedia.org/wiki/Fluent_interface)的其他方法链式调用。你应该在此类链的末尾使用 `compile()`，以使 Nest 实例化和初始化模块。

此外，有时你可能希望提供自定义日志记录器，例如在测试运行时（例如，在 CI 服务器上）。使用 `setLogger()` 方法并传递一个满足 `LoggerService` 接口的对象，以指示 `TestModuleBuilder` 在测试期间如何记录日志（默认情况下，只有“错误”日志会记录到控制台）。

编译后的模块有几个有用的方法，如下表所述：

<table>
  <tr>
    <td>
      <code>createNestApplication()</code>
    </td>
    <td>
      基于给定模块创建并返回一个 Nest 应用程序（<code>INestApplication</code> 实例）。
      注意，你必须使用 <code>init()</code> 方法手动初始化应用程序。
    </td>
  </tr>
  <tr>
    <td>
      <code>createNestMicroservice()</code>
    </td>
    <td>
      基于给定模块创建并返回一个 Nest 微服务（<code>INestMicroservice</code> 实例）。
    </td>
  </tr>
  <tr>
    <td>
      <code>get()</code>
    </td>
    <td>
      检索应用程序上下文中可用的控制器或提供者（包括守卫、过滤器等）的静态实例。继承自 <a href="/fundamentals/module-ref">模块引用</a> 类。
    </td>
  </tr>
  <tr>
     <td>
      <code>resolve()</code>
    </td>
    <td>
      检索应用程序上下文中可用的控制器或提供者（包括守卫、过滤器等）的动态创建的作用域实例（请求或瞬态）。继承自 <a href="/fundamentals/module-ref">模块引用</a> 类。
    </td>
  </tr>
  <tr>
    <td>
      <code>select()</code>
    </td>
    <td>
      导航模块的依赖图；可用于从所选模块中检索特定实例（与 <code>get()</code> 方法中的严格模式（<code>strict: true</code>）一起使用）。
    </td>
  </tr>
</table>

> info **提示** 将你的 e2e 测试文件放在 `test` 目录中。测试文件应有 `.e2e-spec` 后缀。

#### 覆盖全局注册的增强器

如果你有一个全局注册的守卫（或管道、拦截器、过滤器），你需要采取一些额外的步骤来覆盖该增强器。回顾一下，原始注册如下所示：

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
],
```

这是通过 `APP_*` 令牌将守卫注册为“多”提供者。为了能够在此处替换 `JwtAuthGuard`，注册需要使用此插槽中的现有提供者：

```typescript
providers: [
  {
    provide: APP_GUARD,
    useExisting: JwtAuthGuard,
    // ^^^^^^^^ 注意使用 'useExisting' 而不是 'useClass'
  },
  JwtAuthGuard,
],
```

> info **提示** 将 `useClass` 更改为 `useExisting`，以引用已注册的提供者，而不是让 Nest 在令牌背后实例化它。

现在 `JwtAuthGuard` 对 Nest 可见，作为常规提供者，可以在创建 `TestingModule` 时覆盖：

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(JwtAuthGuard)
  .useClass(MockAuthGuard)
  .compile();
```

现在你所有的测试将在每个请求上使用 `MockAuthGuard`。

#### 测试请求作用域实例

[请求作用域](/fundamentals/injection-scopes)的提供者为每个传入的**请求**唯一创建。实例在请求处理完成后被垃圾回收。这带来了一个问题，因为我们无法访问为测试请求专门生成的依赖注入子树。

我们知道（基于前面的部分）`resolve()` 方法可用于检索动态实例化的类。而且，如[此处](/fundamentals/module-ref#resolving-scoped-providers)所述，我们知道我们可以传递一个唯一的上下文标识符来控制 DI 容器子树的生命周期。我们如何在测试上下文中利用这一点？

策略是事先生成一个上下文标识符，并强制 Nest 使用此特定 ID 为所有传入请求创建子树。这样，我们将能够检索为测试请求创建的实例。

为此，在 `ContextIdFactory` 上使用 `jest.spyOn()`：

```typescript
const contextId = ContextIdFactory.create();
jest
  .spyOn(ContextIdFactory, 'getByRequest')
  .mockImplementation(() => contextId);
```

现在我们可以使用 `contextId` 访问为任何后续请求生成的单个 DI 容器子树。

```typescript
catsService = await moduleRef.resolve(CatsService, contextId);
```
