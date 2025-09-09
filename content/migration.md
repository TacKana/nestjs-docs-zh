### 迁移指南

本文提供从 NestJS 版本 10 迁移到版本 11 的全面指南。要了解 v11 中引入的新功能，请参阅[这篇文章](https://trilon.io/blog/announcing-nestjs-11-whats-new)。虽然此次更新包含一些微小的破坏性变更，但它们不太可能影响大多数用户。你可以在[此处](https://github.com/nestjs/nest/releases/tag/v11.0.0)查看完整的变更列表。

#### 升级包

尽管你可以手动升级包，但我们推荐使用 [npm-check-updates (ncu)](https://npmjs.com/package/npm-check-updates) 以获得更流畅的升级过程。

#### Express v5

经过多年的开发，Express v5 于 2024 年正式发布，并在 2025 年成为稳定版本。NestJS 11 现在默认集成了 Express v5。虽然这次更新对大多数用户是无缝的，但需要注意的是，Express v5 引入了一些破坏性变更。详细指南请参考 [Express v5 迁移指南](https://expressjs.com/en/guide/migrating-5.html)。

Express v5 中最显著的变化之一是修订了路径路由匹配算法。以下是路径字符串与传入请求匹配方式的变化：

- 通配符 `*` 必须命名，与参数的行为一致：使用 `/*splat` 或 `/{{ '{' }}*splat&#125;` 替代 `/*`。`splat` 只是通配符参数的名称，没有特殊含义。你可以任意命名，例如 `*wildcard`。
- 不再支持可选字符 `?`，请改用花括号：`/:file{{ '{' }}.:ext&#125;`。
- 不支持正则表达式字符。
- 为避免升级过程中的混淆，已保留一些字符 `(()[]?+!)`，可使用 `\` 进行转义。
- 参数名称现在支持有效的 JavaScript 标识符，或使用引号如 `:"this"`。

因此，在 Express v4 中正常工作的路由可能在 Express v5 中失效。例如：

```typescript
@Get('users/*')
findAll() {
  // 在 NestJS 11 中，这将自动转换为有效的 Express v5 路由。
  // 虽然它可能仍然有效，但在 Express v5 中不再建议使用这种通配符语法。
  return '此路由在 Express v5 中不应工作';
}
```

要解决此问题，可以更新路由以使用命名通配符：

```typescript
@Get('users/*splat')
findAll() {
  return '此路由将在 Express v5 中工作';
}
```

> warning **警告** 请注意，`*splat` 是一个命名通配符，匹配不包括根路径的任何路径。如果你也需要匹配根路径（`/users`），可以使用 `/users/{{ '{' }}*splat&#125;`，将通配符包裹在花括号中（可选组）。请注意，`splat` 只是通配符参数的名称，没有特殊含义。你可以任意命名，例如 `*wildcard`。

类似地，如果你有一个在所有路由上运行的中间件，可能需要更新路径以使用命名通配符：

```typescript
// 在 NestJS 11 中，这将自动转换为有效的 Express v5 路由。
// 虽然它可能仍然有效，但在 Express v5 中不再建议使用这种通配符语法。
forRoutes('*'); // <-- 这在 Express v5 中不应工作
```

相反，可以更新路径以使用命名通配符：

```typescript
forRoutes('{*splat}'); // <-- 这将在 Express v5 中工作
```

请注意，`{{ '{' }}*splat&#125;` 是一个命名通配符，匹配包括根路径在内的任何路径。外部的花括号使路径变为可选。

#### 查询参数解析

> info **注意** 此变更仅适用于 Express v5。

在 Express v5 中，查询参数默认不再使用 `qs` 库解析，而是使用 `simple` 解析器，它不支持嵌套对象或数组。

因此，像这样的查询字符串：

```plaintext
?filter[where][name]=John&filter[where][age]=30
?item[]=1&item[]=2
```

将不再按预期解析。要恢复之前的行为，可以通过将 `query parser` 选项设置为 `extended` 来配置 Express 使用 `extended` 解析器（Express v4 的默认设置）：

```typescript
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule); // <-- 确保使用 <NestExpressApplication>
  app.set('query parser', 'extended'); // <-- 添加此行
  await app.listen(3000);
}
bootstrap();
```

#### Fastify v5

`@nestjs/platform-fastify` v11 现在最终支持 Fastify v5。这次更新对大多数用户应该是无缝的；然而，Fastify v5 引入了一些破坏性变更，但这些变更不太可能影响大多数 NestJS 用户。更多详细信息，请参考 [Fastify v5 迁移指南](https://fastify.dev/docs/v5.1.x/Guides/Migration-Guide-V5/)。

> info **提示** Fastify v5 中路径匹配没有变化（中间件除外，见下文），因此你可以继续像以前一样使用通配符语法。行为保持不变，使用通配符（如 `*`）定义的路由仍将按预期工作。

#### Fastify CORS

默认情况下，只允许 [CORS 安全列表方法](https://fetch.spec.whatwg.org/#methods)。如果需要启用其他方法（如 `PUT`、`PATCH` 或 `DELETE`），必须在 `methods` 选项中明确定义它们。

```typescript
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']; // 或逗号分隔的字符串 'GET,POST,PUT,PATH,DELETE'

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
  { cors: { methods } },
);

// 或者，也可以使用 `enableCors` 方法
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
);
app.enableCors({ methods });
```

#### Fastify 中间件注册

NestJS 11 现在使用最新版本的 [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) 包来匹配 `@nestjs/platform-fastify` 中的**中间件路径**。因此，不再支持使用 `(.*)` 语法匹配所有路径。相反，应使用命名通配符。

例如，如果你有一个适用于所有路由的中间件：

```typescript
// 在 NestJS 11 中，即使你不更新，它也会自动转换为有效的路由。
.forRoutes('(.*)');
```

你需要更新它以使用命名通配符：

```typescript
.forRoutes('*splat');
```

其中 `splat` 只是通配符参数的任意名称。你可以任意命名。

#### 模块解析算法

从 NestJS 11 开始，模块解析算法已改进，以增强性能并减少大多数应用程序的内存使用。此变更不需要任何手动干预，但在某些边缘情况下，行为可能与之前版本不同。

在 NestJS v10 及更早版本中，动态模块被分配了一个从模块的动态元数据生成的唯一不透明键。该键用于在模块注册表中标识模块。例如，如果你在多个模块中包含 `TypeOrmModule.forFeature([User])`，NestJS 将对这些模块进行去重，并在注册表中将它们视为单个模块节点。此过程称为节点去重。

随着 NestJS v11 的发布，我们不再为动态模块生成可预测的哈希值。相反，现在使用对象引用来确定一个模块是否等同于另一个模块。要在多个模块之间共享相同的动态模块，只需将其分配给一个变量并在需要的地方导入即可。这种新方法提供了更大的灵活性，并确保更高效地处理动态模块。

这种新算法可能会影响你的集成测试，如果你使用了大量动态模块，因为如果没有上述手动去重，你的 TestingModule 可能会有多个依赖实例。这使得存根方法变得更加棘手，因为你需要定位正确的实例。你的选择是：

- 对要存根的动态模块进行去重
- 使用 `module.select(ParentModule).get(Target)` 找到正确的实例
- 使用 `module.get(Target, {{ '{' }} each: true &#125;)` 存根所有实例
- 或者使用 `Test.createTestingModule({{ '{' }}&#125;, {{ '{' }} moduleIdGeneratorAlgorithm: 'deep-hash' &#125;)` 将测试切换回旧算法

#### Reflector 类型推断

NestJS 11 对 `Reflector` 类进行了多项改进，增强了其功能和对元数据值的类型推断。这些更新在使用元数据时提供了更直观和健壮的体验。

1. 当只有一个元数据条目且 `value` 为 `object` 类型时，`getAllAndMerge` 现在返回一个对象而不是包含单个元素的数组。这一变化提高了处理基于对象的元数据时的一致性。
2. `getAllAndOverride` 的返回类型已更新为 `T | undefined` 而不是 `T`。这一更新更好地反映了可能找不到元数据的情况，并确保正确处理未定义的情况。
3. `ReflectableDecorator` 的转换类型参数现在在所有方法中都能正确推断。

这些增强通过提供更好的类型安全性和对元数据的处理，改善了 NestJS 11 的整体开发体验。

#### 生命周期钩子执行顺序

终止生命周期钩子现在以与其初始化对应钩子相反的顺序执行。也就是说，像 `OnModuleDestroy`、`BeforeApplicationShutdown` 和 `OnApplicationShutdown` 这样的钩子现在以相反的顺序执行。

想象以下场景：

```plaintext
// 其中 A、B 和 C 是模块，“->” 表示模块依赖关系。
A -> B -> C
```

在这种情况下，`OnModuleInit` 钩子按以下顺序执行：

```plaintext
C -> B -> A
```

而 `OnModuleDestroy` 钩子以相反的顺序执行：

```plaintext
A -> B -> C
```

> info **提示** 全局模块被视为所有其他模块的依赖项。这意味着全局模块首先初始化，最后销毁。

#### 中间件注册顺序

在 NestJS v11 中，中间件注册的行为已更新。之前，中间件注册的顺序由模块依赖图的拓扑排序决定，其中与根模块的距离定义了中间件注册的顺序，无论中间件是在全局模块还是常规模块中注册。在这方面，全局模块被视为与常规模块相同，这导致了不一致的行为，特别是与其他框架功能相比。

从 v11 开始，在全局模块中注册的中间件现在**首先执行**，无论其在模块依赖图中的位置如何。这一变化确保全局中间件始终在导入模块的任何中间件之前运行，保持了一致和可预测的顺序。

#### 缓存模块

`CacheModule`（来自 `@nestjs/cache-manager` 包）已更新以支持最新版本的 `cache-manager` 包。此更新带来了一些破坏性变更，包括迁移到 [Keyv](https://keyv.org/)，它通过存储适配器为多个后端存储提供了统一的键值存储接口。

先前版本和新版本之间的关键区别在于外部存储的配置。在先前版本中，要注册 Redis 存储，你可能会这样配置：

```ts
// 旧版本 - 不再支持
CacheModule.registerAsync({
  useFactory: async () => {
    const store = await redisStore({
      socket: {
        host: 'localhost',
        port: 6379,
      },
    });

    return {
      store,
    };
  },
}),
```

在新版本中，应使用 `Keyv` 适配器来配置存储：

```ts
// 新版本 - 支持
CacheModule.registerAsync({
  useFactory: async () => {
    return {
      stores: [
        new KeyvRedis('redis://localhost:6379'),
      ],
    };
  },
}),
```

其中 `KeyvRedis` 从 `@keyv/redis` 包导入。更多信息请参阅[缓存文档](/techniques/caching)。

> warning **警告** 在此更新中，由 Keyv 库处理的缓存数据现在结构化为包含 `value` 和 `expires` 字段的对象，例如：`{{ '{' }}"value": "yourData", "expires": 1678901234567{{ '}' }}`。虽然 Keyv 在通过其 API 访问数据时自动检索 `value` 字段，但如果你直接与缓存数据交互（例如，在 cache-manager API 之外）或需要支持使用先前版本的 `@nestjs/cache-manager` 写入的数据，请注意这一变化。

#### 配置模块

如果你使用 `@nestjs/config` 包中的 `ConfigModule`，请注意 `@nestjs/config@4.0.0` 中引入的几个破坏性变更。最值得注意的是，`ConfigService#get` 方法读取配置变量的顺序已更新。新的顺序是：

- 内部配置（配置命名空间和自定义配置文件）
- 已验证的环境变量（如果启用了验证并提供了模式）
- `process.env` 对象

之前，已验证的环境变量和 `process.env` 对象首先被读取，防止它们被内部配置覆盖。通过此更新，内部配置现在将始终优先于环境变量。

此外，先前允许禁用 `process.env` 对象验证的 `ignoreEnvVars` 配置选项已被弃用。相反，使用 `validatePredefined` 选项（设置为 `false` 以禁用预定义环境变量的验证）。预定义环境变量指的是在模块导入之前设置的 `process.env` 变量。例如，如果你使用 `PORT=3000 node main.js` 启动应用程序，`PORT` 变量被视为预定义的。然而，由 `ConfigModule` 从 `.env` 文件加载的变量不被归类为预定义的。

还引入了一个新的 `skipProcessEnv` 选项。此选项允许你完全阻止 `ConfigService#get` 方法访问 `process.env` 对象，这在希望限制服务直接读取环境变量时非常有用。

#### Terminus 模块

如果你使用 `TerminusModule` 并构建了自己的自定义健康指示器，版本 11 引入了一个新的 API。新的 `HealthIndicatorService` 旨在增强自定义健康指示器的可读性和可测试性。

在版本 11 之前，健康指示器可能如下所示：

```typescript
@Injectable()
export class DogHealthIndicator extends HealthIndicator {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async isHealthy(key: string) {
    try {
      const badboys = await this.getBadboys();
      const isHealthy = badboys.length === 0;

      const result = this.getStatus(key, isHealthy, {
        badboys: badboys.length,
      });

      if (!isHealthy) {
        throw new HealthCheckError('Dog check failed', result);
      }

      return result;
    } catch (error) {
      const result = this.getStatus(key, isHealthy);
      throw new HealthCheckError('Dog check failed', result);
    }
  }

  private getBadboys() {
    return firstValueFrom(
      this.httpService.get<Dog[]>('https://example.com/dog').pipe(
        map((response) => response.data),
        map((dogs) => dogs.filter((dog) => dog.state === DogState.BAD_BOY)),
      ),
    );
  }
}
```

从版本 11 开始，建议使用新的 `HealthIndicatorService` API，它简化了实现过程。以下是同一健康指示器现在的实现方式：

```typescript
@Injectable()
export class DogHealthIndicator {
  constructor(
    private readonly httpService: HttpService,
    // 注入由 `TerminusModule` 提供的 `HealthIndicatorService`
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string) {
    // 为给定键启动健康指示器检查
    const indicator = this.healthIndicatorService.check(key);

    try {
      const badboys = await this.getBadboys();
      const isHealthy = badboys.length === 0;

      if (!isHealthy) {
        // 将指示器标记为“down”并在响应中添加额外信息
        return indicator.down({ badboys: badboys.length });
      }

      // 将健康指示器标记为“up”
      return indicator.up();
    } catch (error) {
      return indicator.down('无法检索狗狗信息');
    }
  }

  private getBadboys() {
    // ...
  }
}
```

关键变化：

- `HealthIndicatorService` 取代了旧的 `HealthIndicator` 和 `HealthCheckError` 类，为健康检查提供了更清晰的 API。
- `check` 方法允许轻松跟踪状态（`up` 或 `down`），同时支持在健康检查响应中包含额外的元数据。

> info **信息** 请注意，`HealthIndicator` 和 `HealthCheckError` 类已被标记为弃用，并计划在下一个主要版本中移除。

#### 不再支持 Node.js v16 和 v18

从 NestJS 11 开始，不再支持 Node.js v16，因为它于 2023 年 9 月 11 日达到其生命周期终点（EOL）。同样，Node.js v18 的安全支持计划于 2025 年 4 月 30 日结束，因此我们也提前放弃了对它的支持。

NestJS 11 现在需要 **Node.js v20 或更高版本**。

为确保最佳体验，我们强烈推荐使用 Node.js 的最新 LTS 版本。

#### Mau 官方部署平台

如果你错过了公告，我们在 2024 年推出了我们的官方部署平台 [Mau](https://www.mau.nestjs.com/)。
Mau 是一个完全托管的平台，简化了 NestJS 应用程序的部署过程。使用 Mau，你可以通过单一命令将应用程序部署到云端（**AWS**；Amazon Web Services），管理环境变量，并实时监控应用程序性能。

Mau 使配置和维护基础设施变得像点击几个按钮一样简单。Mau 设计简单直观，因此你可以专注于构建应用程序，而不必担心底层基础设施。在底层，我们使用 Amazon Web Services 为你提供强大可靠的平台，同时抽象掉 AWS 的所有复杂性。我们为你处理所有繁重的工作，因此你可以专注于构建应用程序和发展业务。

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

你可以在[本章节](/deployment#easy-deployment-with-mau)中了解更多关于 Mau 的信息。
