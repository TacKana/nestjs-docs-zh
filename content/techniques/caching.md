### 缓存

缓存是一种强大而直接的**技术**，用于提升应用程序性能。它作为临时存储层，能够快速访问常用数据，减少重复获取或计算相同信息的需要，从而加快响应速度并提高整体效率。

#### 安装

要在 Nest 中开始使用缓存，需要安装 `@nestjs/cache-manager` 包以及 `cache-manager` 包。

```bash
$ npm install @nestjs/cache-manager cache-manager
```

默认情况下，所有内容都存储在内存中；由于 `cache-manager` 底层使用 [Keyv](https://keyv.org/docs/)，你可以通过安装相应包轻松切换到更高级的存储方案，例如 Redis。我们稍后会详细介绍这一点。

#### 内存缓存

要在应用程序中启用缓存，请导入 `CacheModule` 并使用 `register()` 方法进行配置：

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';

@Module({
  imports: [CacheModule.register()],
  controllers: [AppController],
})
export class AppModule {}
```

此设置使用默认配置初始化内存缓存，让你可以立即开始缓存数据。

#### 与缓存存储交互

要与缓存管理器实例交互，请使用 `CACHE_MANAGER` 令牌将其注入到你的类中，如下所示：

```typescript
constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
```

> info **提示** `Cache` 类和 `CACHE_MANAGER` 令牌都是从 `@nestjs/cache-manager` 包导入的。

`Cache` 实例（来自 `cache-manager` 包）上的 `get` 方法用于从缓存中检索项。如果缓存中不存在该项，将返回 `null`。

```typescript
const value = await this.cacheManager.get('key');
```

要向缓存添加项，请使用 `set` 方法：

```typescript
await this.cacheManager.set('key', 'value');
```

> warning **注意** 内存缓存存储只能存储[结构化克隆算法](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#javascript_types)支持的类型值。

你可以为此特定键手动指定 TTL（生存时间，以毫秒为单位），如下所示：

```typescript
await this.cacheManager.set('key', 'value', 1000);
```

其中 `1000` 是 TTL（以毫秒为单位）——在这种情况下，缓存项将在一秒后过期。

要禁用缓存过期，请将 `ttl` 配置属性设置为 `0`：

```typescript
await this.cacheManager.set('key', 'value', 0);
```

要从缓存中移除项，请使用 `del` 方法：

```typescript
await this.cacheManager.del('key');
```

要清空整个缓存，请使用 `clear` 方法：

```typescript
await this.cacheManager.clear();
```

#### 自动缓存响应

> warning **警告** 在 [GraphQL](/graphql/quick-start) 应用程序中，拦截器会为每个字段解析器单独执行。因此，`CacheModule`（使用拦截器缓存响应）将无法正常工作。

要启用自动缓存响应，只需在你想要缓存数据的地方绑定 `CacheInterceptor`。

```typescript
@Controller()
@UseInterceptors(CacheInterceptor)
export class AppController {
  @Get()
  findAll(): string[] {
    return [];
  }
}
```

> warning**警告** 只有 `GET` 端点会被缓存。此外，注入原生响应对象（`@Res()`）的 HTTP 服务器路由无法使用缓存拦截器。有关更多详情，请参阅<a href="/interceptors#response-mapping">响应映射</a>。

为了减少所需的样板代码，你可以将 `CacheInterceptor` 全局绑定到所有端点：

```typescript
import { Module } from '@nestjs/common';
import { CacheModule, CacheInterceptor } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [CacheModule.register()],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
```

#### 生存时间（TTL）

`ttl` 的默认值为 `0`，意味着缓存永不过期。要指定自定义 [TTL](https://en.wikipedia.org/wiki/Time_to_live)，你可以在 `register()` 方法中提供 `ttl` 选项，如下所示：

```typescript
CacheModule.register({
  ttl: 5000, // 毫秒
});
```

#### 全局使用模块

当你想在其他模块中使用 `CacheModule` 时，需要导入它（就像任何 Nest 模块的标准做法一样）。或者，通过将选项对象的 `isGlobal` 属性设置为 `true` 来声明它为[全局模块](/modules#global-modules)，如下所示。这样，一旦在根模块（例如 `AppModule`）中加载了 `CacheModule`，你就不需要在其他模块中再次导入它。

```typescript
CacheModule.register({
  isGlobal: true,
});
```

#### 全局缓存覆盖

启用全局缓存后，缓存项会根据路由路径自动生成 `CacheKey` 进行存储。你可以在每个方法基础上覆盖某些缓存设置（`@CacheKey()` 和 `@CacheTTL()`），从而为单个控制器方法提供自定义的缓存策略。这在[使用不同缓存存储](/techniques/caching#different-stores)时可能最为相关。

你可以在每个控制器上应用 `@CacheTTL()` 装饰器，为整个控制器设置缓存 TTL。如果同时定义了控制器级别和方法级别的缓存 TTL 设置，方法级别的设置将优先于控制器级别的设置。

```typescript
@Controller()
@CacheTTL(50)
export class AppController {
  @CacheKey('custom_key')
  @CacheTTL(20)
  findAll(): string[] {
    return [];
  }
}
```

> info **提示** `@CacheKey()` 和 `@CacheTTL()` 装饰器是从 `@nestjs/cache-manager` 包导入的。

`@CacheKey()` 装饰器可以单独使用，也可以与 `@CacheTTL()` 装饰器配合使用，反之亦然。你可以选择只覆盖 `@CacheKey()` 或只覆盖 `@CacheTTL()`。未使用装饰器覆盖的设置将使用全局注册的默认值（参见[自定义缓存](/techniques/caching#customize-caching)）。

#### WebSockets 和微服务

你也可以将 `CacheInterceptor` 应用于 WebSocket 订阅者以及微服务的模式（无论使用哪种传输方法）。

```typescript
@@filename()
@CacheKey('events')
@UseInterceptors(CacheInterceptor)
@SubscribeMessage('events')
handleEvent(client: Client, data: string[]): Observable<string[]> {
  return [];
}
@@switch
@CacheKey('events')
@UseInterceptors(CacheInterceptor)
@SubscribeMessage('events')
handleEvent(client, data) {
  return [];
}
```

但是，需要额外的 `@CacheKey()` 装饰器来指定用于后续存储和检索缓存数据的键。另外，请注意**不应缓存所有内容**。执行某些业务操作而非仅仅查询数据的操作绝不应被缓存。

此外，你可以使用 `@CacheTTL()` 装饰器指定缓存过期时间（TTL），这将覆盖全局默认的 TTL 值。

```typescript
@@filename()
@CacheTTL(10)
@UseInterceptors(CacheInterceptor)
@SubscribeMessage('events')
handleEvent(client: Client, data: string[]): Observable<string[]> {
  return [];
}
@@switch
@CacheTTL(10)
@UseInterceptors(CacheInterceptor)
@SubscribeMessage('events')
handleEvent(client, data) {
  return [];
}
```

> info **提示** `@CacheTTL()` 装饰器可以单独使用，也可以与 `@CacheKey()` 装饰器配合使用。

#### 调整跟踪

默认情况下，Nest 使用请求 URL（在 HTTP 应用中）或缓存键（在 WebSocket 和微服务应用中，通过 `@CacheKey()` 装饰器设置）来将缓存记录与你的端点关联起来。然而，有时你可能希望基于不同因素设置跟踪，例如使用 HTTP 头（例如 `Authorization` 来正确识别 `profile` 端点）。

为了实现这一点，创建一个 `CacheInterceptor` 的子类并重写 `trackBy()` 方法。

```typescript
@Injectable()
class HttpCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    return 'key';
  }
}
```

#### 使用替代缓存存储

切换到不同的缓存存储非常简单。首先，安装相应的包。例如，要使用 Redis，请安装 `@keyv/redis` 包：

```bash
$ npm install @keyv/redis
```

安装完成后，你可以注册 `CacheModule` 并使用多个存储，如下所示：

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';
import { CacheableMemory } from 'cacheable';

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => {
        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
            new KeyvRedis('redis://localhost:6379'),
          ],
        };
      },
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

在这个例子中，我们注册了两个存储：`CacheableMemory` 和 `KeyvRedis`。`CacheableMemory` 存储是一个简单的内存存储，而 `KeyvRedis` 是一个 Redis 存储。`stores` 数组用于指定你想要使用的存储。数组中的第一个存储是默认存储，其余的是备用存储。

查看 [Keyv 文档](https://keyv.org/docs/)以获取有关可用存储的更多信息。

#### 异步配置

你可能希望异步传入模块选项，而不是在编译时静态传递它们。在这种情况下，使用 `registerAsync()` 方法，它提供了几种处理异步配置的方式。

一种方法是使用工厂函数：

```typescript
CacheModule.registerAsync({
  useFactory: () => ({
    ttl: 5,
  }),
});
```

我们的工厂函数的行为与其他所有异步模块工厂类似（可以是 `async` 的，并且能够通过 `inject` 注入依赖项）。

```typescript
CacheModule.registerAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    ttl: configService.get('CACHE_TTL'),
  }),
  inject: [ConfigService],
});
```

或者，你可以使用 `useClass` 方法：

```typescript
CacheModule.registerAsync({
  useClass: CacheConfigService,
});
```

上述构造将在 `CacheModule` 内部实例化 `CacheConfigService`，并使用它来获取选项对象。`CacheConfigService` 必须实现 `CacheOptionsFactory` 接口以提供配置选项：

```typescript
@Injectable()
class CacheConfigService implements CacheOptionsFactory {
  createCacheOptions(): CacheModuleOptions {
    return {
      ttl: 5,
    };
  }
}
```

如果你希望使用从其他模块导入的现有配置提供者，请使用 `useExisting` 语法：

```typescript
CacheModule.registerAsync({
  imports: [ConfigModule],
  useExisting: ConfigService,
});
```

这与 `useClass` 的工作方式相同，但有一个关键区别——`CacheModule` 将查找导入的模块以重用任何已创建的 `ConfigService`，而不是实例化自己的。

> info **提示** `CacheModule#register`、`CacheModule#registerAsync` 和 `CacheOptionsFactory` 有一个可选的泛型（类型参数）来缩小特定于存储的配置选项，使其类型安全。

你还可以向 `registerAsync()` 方法传递所谓的 `extraProviders`。这些提供者将与模块提供者合并。

```typescript
CacheModule.registerAsync({
  imports: [ConfigModule],
  useClass: ConfigService,
  extraProviders: [MyAdditionalProvider],
});
```

当你希望向工厂函数或类构造函数提供额外的依赖项时，这非常有用。

#### 示例

一个可运行的示例可在[这里](https://github.com/nestjs/nest/tree/master/sample/20-cache)找到。
