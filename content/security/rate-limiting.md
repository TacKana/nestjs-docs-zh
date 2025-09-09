### 速率限制（Rate Limiting）

**速率限制**是一种常用的技术，用于保护应用程序免受暴力攻击。要开始使用，你需要安装 `@nestjs/throttler` 包。

```bash
$ npm i --save @nestjs/throttler
```

安装完成后，`ThrottlerModule` 可以像其他 Nest 包一样，通过 `forRoot` 或 `forRootAsync` 方法进行配置。

```typescript
@@filename(app.module)
@Module({
  imports: [
     ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
  ],
})
export class AppModule {}
```

以上配置将为应用程序中受保护的路由设置全局选项：`ttl`（生存时间，单位为毫秒）和 `limit`（在 ttl 时间内的最大请求次数）。

导入模块后，你可以选择如何绑定 `ThrottlerGuard`。在 [守卫](https://docs.nestjs.com/guards) 部分提到的任何绑定方式都是可行的。例如，如果你想全局绑定该守卫，可以通过在任何模块中添加以下提供者来实现：

```typescript
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard
}
```

#### 多个速率限制器定义

有时你可能需要设置多个速率限制定义，例如：一秒内不超过 3 次调用，10 秒内不超过 20 次调用，一分钟内不超过 100 次调用。为此，你可以在数组中设置带有命名选项的定义，这些选项稍后可以在 `@SkipThrottle()` 和 `@Throttle()` 装饰器中引用，以再次更改选项。

```typescript
@@filename(app.module)
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100
      }
    ]),
  ],
})
export class AppModule {}
```

#### 自定义配置

有时你可能希望将守卫绑定到控制器或全局，但希望对一个或多个端点禁用速率限制。为此，你可以使用 `@SkipThrottle()` 装饰器来对整个类或单个路由取消速率限制。`@SkipThrottle()` 装饰器还可以接受一个字符串键和布尔值的对象，用于在需要排除控制器中的大部分（但不是所有）路由的情况下进行配置，并且如果你有多个速率限制器集，可以按集配置。如果不传递对象，默认使用 `{{ '{' }} default: true {{ '}' }}`。

```typescript
@SkipThrottle()
@Controller('users')
export class UsersController {}
```

这个 `@SkipThrottle()` 装饰器可用于跳过路由或类，或在已跳过的类中取消跳过路由。

```typescript
@SkipThrottle()
@Controller('users')
export class UsersController {
  // 此路由应用速率限制。
  @SkipThrottle({ default: false })
  dontSkip() {
    return '列出用户时应用速率限制。';
  }
  // 此路由将跳过速率限制。
  doSkip() {
    return '列出用户时不应用速率限制。';
  }
}
```

还有 `@Throttle()` 装饰器，可用于覆盖全局模块中设置的 `limit` 和 `ttl`，以提供更严格或更宽松的安全选项。此装饰器也可用于类或函数。从版本 5 开始，装饰器接受一个对象，其中字符串关联到速率限制器集的名称，以及一个包含 limit 和 ttl 键和整数值的对象，类似于传递给根模块的选项。如果你在原始选项中没有设置名称，请使用字符串 `default`。你需要像这样配置它：

```typescript
// 覆盖默认的速率限制和持续时间配置。
@Throttle({ default: { limit: 3, ttl: 60000 } })
@Get()
findAll() {
  return "列出用户时使用自定义速率限制。";
}
```

#### 代理服务器

如果你的应用程序运行在代理服务器后面，配置 HTTP 适配器以信任代理至关重要。你可以参考 [Express](http://expressjs.com/en/guide/behind-proxies.html) 和 [Fastify](https://www.fastify.io/docs/latest/Reference/Server/#trustproxy) 的特定 HTTP 适配器选项来启用 `trust proxy` 设置。

以下示例展示了如何为 Express 适配器启用 `trust proxy`：

```typescript
@@filename(main)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 'loopback'); // 信任来自环回地址的请求
  await app.listen(3000);
}

bootstrap();
@@switch
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.set('trust proxy', 'loopback'); // 信任来自环回地址的请求
  await app.listen(3000);
}

bootstrap();
```

启用 `trust proxy` 允许你从 `X-Forwarded-For` 头中检索原始 IP 地址。你还可以通过重写 `getTracker()` 方法来自定义应用程序的行为，以从此头中提取 IP 地址，而不是依赖 `req.ip`。以下示例展示了如何为 Express 和 Fastify 实现这一点：

```typescript
@@filename(throttler-behind-proxy.guard)
import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ips.length ? req.ips[0] : req.ip; // 根据你的需要个性化 IP 提取
  }
}
```

> info **提示** 你可以在 [这里](https://expressjs.com/en/api.html#req.ips) 找到 Express 的 `req` 请求对象的 API，在 [这里](https://www.fastify.io/docs/latest/Reference/Request/) 找到 Fastify 的。

#### WebSockets

此模块可与 WebSockets 一起工作，但需要一些类扩展。你可以扩展 `ThrottlerGuard` 并重写 `handleRequest` 方法，如下所示：

```typescript
@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const {
      context,
      limit,
      ttl,
      throttler,
      blockDuration,
      getTracker,
      generateKey,
    } = requestProps;

    const client = context.switchToWs().getClient();
    const tracker = client._socket.remoteAddress;
    const key = generateKey(context, tracker, throttler.name);
    const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } =
      await this.storageService.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttler.name,
      );

    const getThrottlerSuffix = (name: string) =>
      name === 'default' ? '' : `-${name}`;

    // 当用户达到限制时抛出错误。
    if (isBlocked) {
      await this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
        tracker,
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      });
    }

    return true;
  }
}
```

> info **提示** 如果你使用 ws，需要将 `_socket` 替换为 `conn`

使用 WebSockets 时需要注意以下几点：

- 守卫不能通过 `APP_GUARD` 或 `app.useGlobalGuards()` 注册
- 当达到限制时，Nest 会发出 `exception` 事件，因此请确保有监听器准备好处理此事件

> info **提示** 如果你使用 `@nestjs/platform-ws` 包，可以使用 `client._socket.remoteAddress`。

#### GraphQL

`ThrottlerGuard` 也可用于处理 GraphQL 请求。同样，守卫可以扩展，但这次将重写 `getRequestResponse` 方法。

```typescript
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.res };
  }
}
```

#### 配置

以下选项对传递给 `ThrottlerModule` 选项数组的对象有效：

<table>
  <tr>
    <td><code>name</code></td>
    <td>用于内部跟踪正在使用的速率限制器集的名称。如果没有传递，默认为 <code>default</code></td>
  </tr>
  <tr>
    <td><code>ttl</code></td>
    <td>每个请求在存储中存活的毫秒数</td>
  </tr>
  <tr>
    <td><code>limit</code></td>
    <td>在 TTL 限制内的最大请求数</td>
  </tr>
  <tr>
    <td><code>blockDuration</code></td>
    <td>请求将被阻止的毫秒数</td>
  </tr>
  <tr>
    <td><code>ignoreUserAgents</code></td>
    <td>一个正则表达式数组，用于指定在限制请求时要忽略的用户代理</td>
  </tr>
  <tr>
    <td><code>skipIf</code></td>
    <td>一个函数，接收 <code>ExecutionContext</code> 并返回一个 <code>boolean</code>，用于短路速率限制器逻辑。类似于 <code>@SkipThrottler()</code>，但基于请求</td>
  </tr>
</table>

如果你需要设置存储，或者想更全局地使用上述选项，应用于每个速率限制器集，你可以通过 `throttlers` 选项键传递上述选项，并使用下表：

<table>
  <tr>
    <td><code>storage</code></td>
    <td>一个自定义存储服务，用于跟踪速率限制。<a href="/security/rate-limiting#storages">参见这里。</a></td>
  </tr>
  <tr>
    <td><code>ignoreUserAgents</code></td>
    <td>一个正则表达式数组，用于指定在限制请求时要忽略的用户代理</td>
  </tr>
  <tr>
    <td><code>skipIf</code></td>
    <td>一个函数，接收 <code>ExecutionContext</code> 并返回一个 <code>boolean</code>，用于短路速率限制器逻辑。类似于 <code>@SkipThrottler()</code>，但基于请求</td>
  </tr>
  <tr>
    <td><code>throttlers</code></td>
    <td>一个速率限制器集数组，使用上表定义</td>
  </tr>
  <tr>
    <td><code>errorMessage</code></td>
    <td>一个 <code>string</code> 或一个函数，接收 <code>ExecutionContext</code> 和 <code>ThrottlerLimitDetail</code> 并返回一个 <code>string</code>，用于覆盖默认的速率限制器错误消息</td>
  </tr>
  <tr>
    <td><code>getTracker</code></td>
    <td>一个函数，接收 <code>Request</code> 并返回一个 <code>string</code>，用于覆盖 <code>getTracker</code> 方法的默认逻辑</td>
  </tr>
  <tr>
    <td><code>generateKey</code></td>
    <td>一个函数，接收 <code>ExecutionContext</code>、跟踪器 <code>string</code> 和速率限制器名称作为 <code>string</code>，并返回一个 <code>string</code>，用于覆盖将用于存储速率限制值的最终键。这会覆盖 <code>generateKey</code> 方法的默认逻辑</td>
  </tr>
</table>

#### 异步配置

你可能希望异步获取速率限制配置，而不是同步获取。你可以使用 `forRootAsync()` 方法，它允许依赖注入和 `async` 方法。

一种方法是使用工厂函数：

```typescript
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL'),
          limit: config.get('THROTTLE_LIMIT'),
        },
      ],
    }),
  ],
})
export class AppModule {}
```

你也可以使用 `useClass` 语法：

```typescript
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useClass: ThrottlerConfigService,
    }),
  ],
})
export class AppModule {}
```

只要 `ThrottlerConfigService` 实现了 `ThrottlerOptionsFactory` 接口，这是可行的。

#### 存储

内置存储是一个内存缓存，它会跟踪发出的请求，直到它们超过全局选项设置的 TTL。你可以将自己的存储选项放入 `ThrottlerModule` 的 `storage` 选项中，只要该类实现了 `ThrottlerStorage` 接口。

对于分布式服务器，你可以使用社区存储提供者 [Redis](https://github.com/jmcdo29/nest-lab/tree/main/packages/throttler-storage-redis) 来获得单一的事实来源。

> info **注意** `ThrottlerStorage` 可以从 `@nestjs/throttler` 导入。

#### 时间辅助函数

有几个辅助方法可以使时间设置更易读，如果你更喜欢使用它们而不是直接定义。`@nestjs/throttler` 导出了五个不同的辅助函数：`seconds`、`minutes`、`hours`、`days` 和 `weeks`。要使用它们，只需调用 `seconds(5)` 或任何其他辅助函数，就会返回正确的毫秒数。

#### 迁移指南

对于大多数人来说，将选项包装在数组中就足够了。

如果你使用自定义存储，你应该将 `ttl` 和 `limit` 包装在一个数组中，并将其分配给选项对象的 `throttlers` 属性。

任何 `@SkipThrottle()` 装饰器都可用于绕过特定路由或方法的速率限制。它接受一个可选的布尔参数，默认为 `true`。这在你想跳过特定端点的速率限制时非常有用。

任何 `@Throttle()` 装饰器现在也应该接受一个具有字符串键的对象，这些键关联到速率限制器上下文的名称（同样，如果没有名称，则为 `'default'`），以及具有 `limit` 和 `ttl` 键的对象的值。

> Warning **重要** `ttl` 现在以**毫秒**为单位。如果你想保持 ttl 以秒为单位以便于阅读，请使用此包中的 `seconds` 辅助函数。它只是将 ttl 乘以 1000 以转换为毫秒。

更多信息，请参阅 [变更日志](https://github.com/nestjs/throttler/blob/master/CHANGELOG.md#500)