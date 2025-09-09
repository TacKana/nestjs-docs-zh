### 中间件

中间件是一个在路由处理器**之前**被调用的函数。中间件函数可以访问 [request](https://expressjs.com/en/4x/api.html#req) 和 [response](https://expressjs.com/en/4x/api.html#res) 对象，以及应用程序请求-响应周期中的下一个中间件函数 `next()`。通常，**下一个**中间件函数由一个名为 `next` 的变量表示。

<figure><img class="illustrative-image" src="/assets/Middlewares_1.png" /></figure>

默认情况下，Nest 中间件等同于 [express](https://expressjs.com/en/guide/using-middleware.html) 中间件。以下是 express 官方文档中对中间件功能的描述：

<blockquote class="external">
  中间件函数可以执行以下任务：
  <ul>
    <li>执行任意代码。</li>
    <li>修改请求和响应对象。</li>
    <li>结束请求-响应周期。</li>
    <li>调用堆栈中的下一个中间件函数。</li>
    <li>如果当前中间件函数没有结束请求-响应周期，它必须调用 <code>next()</code> 来将控制权传递给下一个中间件函数。否则，请求将被挂起。</li>
  </ul>
</blockquote>

你可以通过函数或带有 `@Injectable()` 装饰器的类来实现自定义的 Nest 中间件。类应该实现 `NestMiddleware` 接口，而函数则没有特殊要求。让我们首先使用类方法实现一个简单的中间件功能。

> warning **警告** `Express` 和 `fastify` 处理中间件的方式不同，并提供不同的方法签名，更多信息请阅读[这里](/techniques/performance#middleware)。

```typescript
@@filename(logger.middleware)
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
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

#### 依赖注入

Nest 中间件完全支持依赖注入。就像提供者和控制器一样，它们能够**注入**同一模块中可用的依赖项。通常，这是通过 `constructor` 完成的。

#### 应用中间件

`@Module()` 装饰器中没有中间件的位置。相反，我们使用模块类的 `configure()` 方法来设置它们。包含中间件的模块必须实现 `NestModule` 接口。让我们在 `AppModule` 级别设置 `LoggerMiddleware`。

```typescript
@@filename(app.module)
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CatsModule } from './cats/cats.module';

@Module({
  imports: [CatsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('cats');
  }
}
@@switch
import { Module } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CatsModule } from './cats/cats.module';

@Module({
  imports: [CatsModule],
})
export class AppModule {
  configure(consumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('cats');
  }
}
```

在上面的例子中，我们为之前在 `CatsController` 中定义的 `/cats` 路由处理器设置了 `LoggerMiddleware`。我们还可以通过在配置中间件时向 `forRoutes()` 方法传递一个包含路由 `path` 和请求 `method` 的对象来进一步限制中间件到特定的请求方法。在下面的例子中，注意我们导入了 `RequestMethod` 枚举来引用所需的请求方法类型。

```typescript
@@filename(app.module)
import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CatsModule } from './cats/cats.module';

@Module({
  imports: [CatsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: 'cats', method: RequestMethod.GET });
  }
}
@@switch
import { Module, RequestMethod } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CatsModule } from './cats/cats.module';

@Module({
  imports: [CatsModule],
})
export class AppModule {
  configure(consumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: 'cats', method: RequestMethod.GET });
  }
}
```

> info **提示** `configure()` 方法可以使用 `async/await` 使其异步（例如，你可以在 `configure()` 方法体内 `await` 异步操作的完成）。

> warning **警告** 当使用 `express` 适配器时，NestJS 应用默认会从 `body-parser` 包注册 `json` 和 `urlencoded`。这意味着如果你想通过 `MiddlewareConsumer` 自定义该中间件，需要在用 `NestFactory.create()` 创建应用时将 `bodyParser` 标志设置为 `false` 来关闭全局中间件。

#### 路由通配符

基于模式的路由在 NestJS 中间件中也受支持。例如，命名通配符（`*splat`）可以用作通配符来匹配路由中的任意字符组合。在以下示例中，中间件将为任何以 `abcd/` 开头的路由执行，无论后面跟着多少个字符。

```typescript
forRoutes({
  path: 'abcd/*splat',
  method: RequestMethod.ALL,
});
```

> info **提示** `splat` 只是通配符参数的名称，没有特殊含义。你可以任意命名，例如 `*wildcard`。

`'abcd/*'` 路由路径将匹配 `abcd/1`、`abcd/123`、`abcd/abc` 等。连字符（`-`）和点（`.`）在基于字符串的路径中被按字面意义解释。然而，`abcd/` 没有额外字符时不会匹配该路由。为此，你需要将通配符用大括号括起来以使其可选：

```typescript
forRoutes({
  path: 'abcd/{*splat}',
  method: RequestMethod.ALL,
});
```

#### 中间件消费者

`MiddlewareConsumer` 是一个辅助类。它提供了几个内置方法来管理中间件。所有这些方法都可以简单地以[流畅风格](https://en.wikipedia.org/wiki/Fluent_interface)**链式调用**。`forRoutes()` 方法可以接受单个字符串、多个字符串、一个 `RouteInfo` 对象、一个控制器类甚至多个控制器类。在大多数情况下，你可能只需要传递一个由逗号分隔的**控制器**列表。下面是一个带有单个控制器的示例：

```typescript
@@filename(app.module)
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CatsModule } from './cats/cats.module';
import { CatsController } from './cats/cats.controller';

@Module({
  imports: [CatsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(CatsController);
  }
}
@@switch
import { Module } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CatsModule } from './cats/cats.module';
import { CatsController } from './cats/cats.controller';

@Module({
  imports: [CatsModule],
})
export class AppModule {
  configure(consumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(CatsController);
  }
}
```

> info **提示** `apply()` 方法可以接受单个中间件，或多个参数来指定<a href="/middleware#multiple-middleware">多个中间件</a>。

#### 排除路由

有时，我们可能希望**排除**某些路由不应用中间件。这可以很容易地使用 `exclude()` 方法实现。`exclude()` 方法接受单个字符串、多个字符串或一个 `RouteInfo` 对象来标识要排除的路由。

以下是如何使用它的示例：

```typescript
consumer
  .apply(LoggerMiddleware)
  .exclude(
    { path: 'cats', method: RequestMethod.GET },
    { path: 'cats', method: RequestMethod.POST },
    'cats/(*splat)',
  )
  .forRoutes(CatsController);
```

> info **提示** `exclude()` 方法支持使用 [path-to-regexp](https://github.com/pillarjs/path-to-regexp#parameters) 包的通配符参数。

在上面的例子中，`LoggerMiddleware` 将绑定到 `CatsController` 内部定义的所有路由，**除了**传递给 `exclude()` 方法的三个路由。

这种方法提供了基于特定路由或路由模式应用或排除中间件的灵活性。

#### 函数式中间件

我们一直在使用的 `LoggerMiddleware` 类非常简单。它没有成员，没有额外的方法，也没有依赖关系。为什么我们不能用一个简单的函数来代替类呢？事实上，我们可以。这种类型的中间件被称为**函数式中间件**。让我们将记录器中间件从基于类的转换为函数式中间件，以说明区别：

```typescript
@@filename(logger.middleware)
import { Request, Response, NextFunction } from 'express';

export function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`Request...`);
  next();
};
@@switch
export function logger(req, res, next) {
  console.log(`Request...`);
  next();
};
```

并在 `AppModule` 中使用它：

```typescript
@@filename(app.module)
consumer
  .apply(logger)
  .forRoutes(CatsController);
```

> info **提示** 任何时候你的中间件不需要任何依赖项时，考虑使用更简单的**函数式中间件**替代方案。

#### 多个中间件

如上所述，为了绑定多个按顺序执行的中间件，只需在 `apply()` 方法内提供一个逗号分隔的列表：

```typescript
consumer.apply(cors(), helmet(), logger).forRoutes(CatsController);
```

#### 全局中间件

如果我们想一次性将中间件绑定到每个注册的路由，我们可以使用 `INestApplication` 实例提供的 `use()` 方法：

```typescript
@@filename(main)
const app = await NestFactory.create(AppModule);
app.use(logger);
await app.listen(process.env.PORT ?? 3000);
```

> info **提示** 在全局中间件中访问 DI 容器是不可能的。当使用 `app.use()` 时，你可以使用[函数式中间件](middleware#functional-middleware)代替。或者，你可以在 `AppModule`（或任何其他模块）中使用类中间件并通过 `.forRoutes('*')` 来消费它。