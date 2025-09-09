### 性能（Fastify）

默认情况下，Nest 使用 [Express](https://expressjs.com/) 框架。如前所述，Nest 也兼容其他库，例如 [Fastify](https://github.com/fastify/fastify)。Nest 通过实现一个框架适配器来实现这种框架独立性，该适配器的主要功能是将中间件和处理程序代理到相应的库特定实现。

> info **提示** 注意，要实现框架适配器，目标库必须提供与 Express 类似的请求/响应管道处理。

[Fastify](https://github.com/fastify/fastify) 为 Nest 提供了一个很好的替代框架，因为它以类似 Express 的方式解决设计问题。然而，Fastify 比 Express **快得多**，基准测试结果几乎快两倍。一个合理的问题是，为什么 Nest 使用 Express 作为默认的 HTTP 提供者？原因是 Express 广泛使用、众所周知，并且拥有大量兼容的中间件，这些中间件可以直接供 Nest 用户使用。

但由于 Nest 提供了框架独立性，您可以轻松地在它们之间迁移。当您非常重视极快的性能时，Fastify 可能是更好的选择。要使用 Fastify，只需选择内置的 `FastifyAdapter`，如本章所示。

#### 安装

首先，我们需要安装所需的包：

```bash
$ npm i --save @nestjs/platform-fastify
```

#### 适配器

安装 Fastify 平台后，我们可以使用 `FastifyAdapter`。

```typescript
@@filename(main)
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

默认情况下，Fastify 仅监听 `localhost 127.0.0.1` 接口（[了解更多](https://www.fastify.io/docs/latest/Guides/Getting-Started/#your-first-server)）。如果您想接受其他主机的连接，应在 `listen()` 调用中指定 `'0.0.0.0'`：

```typescript
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  await app.listen(3000, '0.0.0.0');
}
```

#### 平台特定包

请注意，当您使用 `FastifyAdapter` 时，Nest 使用 Fastify 作为 **HTTP 提供者**。这意味着每个依赖 Express 的配方可能不再有效。您应改用 Fastify 的等效包。

#### 重定向响应

Fastify 处理重定向响应的方式与 Express 略有不同。要使用 Fastify 正确重定向，应同时返回状态码和 URL，如下所示：

```typescript
@Get()
index(@Res() res) {
  res.status(302).redirect('/login');
}
```

#### Fastify 选项

您可以通过 `FastifyAdapter` 构造函数将选项传递给 Fastify 构造函数。例如：

```typescript
new FastifyAdapter({ logger: true });
```

#### 中间件

中间件函数获取原始的 `req` 和 `res` 对象，而不是 Fastify 的包装器。这是 `middie` 包（底层使用）和 `fastify` 的工作方式 - 查看此[页面](https://www.fastify.io/docs/latest/Reference/Middleware/)了解更多信息。

```typescript
@@filename(logger.middleware)
import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    console.log('Request...');
    next();
  }
}
@@switch
import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggerMiddleware {
  use(req, res, next) {
    console.log('Request...');
    next();
  }
}
```

#### 路由配置

您可以使用 Fastify 的[路由配置](https://fastify.dev/docs/latest/Reference/Routes/#config)功能与 `@RouteConfig()` 装饰器。

```typescript
@RouteConfig({ output: 'hello world' })
@Get()
index(@Req() req) {
  return req.routeConfig.output;
}
```

#### 路由约束

从 v10.3.0 开始，`@nestjs/platform-fastify` 支持 Fastify 的[路由约束](https://fastify.dev/docs/latest/Reference/Routes/#constraints)功能，使用 `@RouteConstraints` 装饰器。

```typescript
@RouteConstraints({ version: '1.2.x' })
newFeature() {
  return 'This works only for version >= 1.2.x';
}
```

> info **提示** `@RouteConfig()` 和 `@RouteConstraints` 从 `@nestjs/platform-fastify` 导入。

#### 示例

可用的工作示例在[这里](https://github.com/nestjs/nest/tree/master/sample/10-fastify)。