### 异常过滤器

Nest 内置了一个**异常处理层**，负责处理应用程序中所有未处理的异常。当应用程序代码未处理某个异常时，该层会捕获它，并自动发送一个合适的用户友好响应。

<figure>
  <img class="illustrative-image" src="/assets/Filter_1.png" />
</figure>

开箱即用的情况下，此功能由内置的**全局异常过滤器**实现，该过滤器处理 `HttpException` 类型（及其子类）的异常。当异常是**无法识别**的类型（既不是 `HttpException` 也不是继承自 `HttpException` 的类）时，内置异常过滤器会生成以下默认 JSON 响应：

```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

> info **提示** 全局异常过滤器部分支持 `http-errors` 库。基本上，任何包含 `statusCode` 和 `message` 属性的抛出异常都会被正确填充并作为响应返回（而不是对无法识别的异常使用默认的 `InternalServerErrorException`）。

#### 抛出标准异常

Nest 提供了一个内置的 `HttpException` 类，该类从 `@nestjs/common` 包中导出。对于典型的基于 HTTP REST/GraphQL API 的应用程序，最佳实践是在发生特定错误条件时发送标准的 HTTP 响应对象。

例如，在 `CatsController` 中，我们有一个 `findAll()` 方法（一个 `GET` 路由处理程序）。假设此路由处理程序由于某种原因抛出异常。为了演示这一点，我们将其硬编码如下：

```typescript
@@filename(cats.controller)
@Get()
async findAll() {
  throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
}
```

> info **提示** 这里我们使用了 `HttpStatus`，这是一个从 `@nestjs/common` 包导入的辅助枚举。

当客户端调用此端点时，响应如下所示：

```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

`HttpException` 构造函数接受两个必需参数，用于确定响应：

- `response` 参数定义 JSON 响应体。它可以是 `string` 或如下所述的 `object`。
- `status` 参数定义 [HTTP 状态码](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)。

默认情况下，JSON 响应体包含两个属性：

- `statusCode`：默认为 `status` 参数中提供的 HTTP 状态码
- `message`：基于 `status` 的 HTTP 错误的简短描述

要仅覆盖 JSON 响应体的消息部分，请在 `response` 参数中提供字符串。要覆盖整个 JSON 响应体，请在 `response` 参数中传递对象。Nest 将序列化该对象并将其作为 JSON 响应体返回。

第二个构造函数参数 - `status` - 应为有效的 HTTP 状态码。最佳实践是使用从 `@nestjs/common` 导入的 `HttpStatus` 枚举。

还有一个**第三个**构造函数参数（可选）- `options` - 可用于提供错误 [原因](https://nodejs.org/en/blog/release/v16.9.0/#error-cause)。此 `cause` 对象不会序列化到响应对象中，但可用于日志记录目的，提供有关导致抛出 `HttpException` 的内部错误的有价值信息。

以下是一个覆盖整个响应体并提供错误原因的示例：

```typescript
@@filename(cats.controller)
@Get()
async findAll() {
  try {
    await this.service.findAll()
  } catch (error) {
    throw new HttpException({
      status: HttpStatus.FORBIDDEN,
      error: 'This is a custom message',
    }, HttpStatus.FORBIDDEN, {
      cause: error
    });
  }
}
```

使用上述代码，响应将如下所示：

```json
{
  "status": 403,
  "error": "This is a custom message"
}
```

#### 异常日志记录

默认情况下，异常过滤器不会记录内置异常，如 `HttpException`（以及继承自它的任何异常）。当这些异常被抛出时，它们不会出现在控制台中，因为它们被视为正常应用程序流的一部分。相同的行为适用于其他内置异常，如 `WsException` 和 `RpcException`。

这些异常都继承自基础 `IntrinsicException` 类，该类从 `@nestjs/common` 包导出。此类有助于区分作为正常应用程序操作一部分的异常和不是的异常。

如果你想记录这些异常，可以创建自定义异常过滤器。我们将在下一节中解释如何执行此操作。

#### 自定义异常

在许多情况下，你不需要编写自定义异常，可以使用内置的 Nest HTTP 异常，如下一节所述。如果你确实需要创建自定义异常，最佳实践是创建自己的**异常层次结构**，其中你的自定义异常继承自基础 `HttpException` 类。通过这种方法，Nest 将识别你的异常，并自动处理错误响应。让我们实现这样一个自定义异常：

```typescript
@@filename(forbidden.exception)
export class ForbiddenException extends HttpException {
  constructor() {
    super('Forbidden', HttpStatus.FORBIDDEN);
  }
}
```

由于 `ForbiddenException` 扩展了基础 `HttpException`，它将与内置异常处理程序无缝协作，因此我们可以在 `findAll()` 方法中使用它。

```typescript
@@filename(cats.controller)
@Get()
async findAll() {
  throw new ForbiddenException();
}
```

#### 内置 HTTP 异常

Nest 提供了一组标准异常，这些异常继承自基础 `HttpException`。它们从 `@nestjs/common` 包中公开，代表了许多最常见的 HTTP 异常：

- `BadRequestException`
- `UnauthorizedException`
- `NotFoundException`
- `ForbiddenException`
- `NotAcceptableException`
- `RequestTimeoutException`
- `ConflictException`
- `GoneException`
- `HttpVersionNotSupportedException`
- `PayloadTooLargeException`
- `UnsupportedMediaTypeException`
- `UnprocessableEntityException`
- `InternalServerErrorException`
- `NotImplementedException`
- `ImATeapotException`
- `MethodNotAllowedException`
- `BadGatewayException`
- `ServiceUnavailableException`
- `GatewayTimeoutException`
- `PreconditionFailedException`

所有内置异常也可以使用 `options` 参数提供错误 `cause` 和错误描述：

```typescript
throw new BadRequestException('Something bad happened', {
  cause: new Error(),
  description: 'Some error description',
});
```

使用上述代码，响应将如下所示：

```json
{
  "message": "Something bad happened",
  "error": "Some error description",
  "statusCode": 400
}
```

#### 异常过滤器

虽然基础（内置）异常过滤器可以自动为你处理许多情况，但你可能希望对异常层进行**完全控制**。例如，你可能希望基于某些动态因素添加日志记录或使用不同的 JSON 模式。**异常过滤器**正是为此目的而设计的。它们让你可以控制确切的控制流以及发送回客户端的响应内容。

让我们创建一个异常过滤器，负责捕获作为 `HttpException` 类实例的异常，并为它们实现自定义响应逻辑。为此，我们需要访问底层平台 `Request` 和 `Response` 对象。我们将访问 `Request` 对象，以便提取原始 `url` 并将其包含在日志记录信息中。我们将使用 `Response` 对象通过 `response.json()` 方法直接控制发送的响应。

```typescript
@@filename(http-exception.filter)
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
  }
}
@@switch
import { Catch, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter {
  catch(exception, host) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();

    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
  }
}
```

> info **提示** 所有异常过滤器都应实现通用 `ExceptionFilter<T>` 接口。这要求你提供具有指定签名的 `catch(exception: T, host: ArgumentsHost)` 方法。`T` 表示异常的类型。

> warning **警告** 如果你使用 `@nestjs/platform-fastify`，可以使用 `response.send()` 而不是 `response.json()`。不要忘记从 `fastify` 导入正确的类型。

`@Catch(HttpException)` 装饰器将必需的元数据绑定到异常过滤器，告诉 Nest 此特定过滤器正在寻找 `HttpException` 类型的异常，而不是其他任何异常。`@Catch()` 装饰器可以接受单个参数或逗号分隔的列表。这让你可以一次为多种类型的异常设置过滤器。

#### 参数主机

让我们看一下 `catch()` 方法的参数。`exception` 参数是当前正在处理的异常对象。`host` 参数是一个 `ArgumentsHost` 对象。`ArgumentsHost` 是一个强大的实用程序对象，我们将在[执行上下文章节](/fundamentals/execution-context)\*中进一步研究。在此代码示例中，我们使用它来获取对传递给原始请求处理程序（在异常起源的控制器中）的 `Request` 和 `Response` 对象的引用。在此代码示例中，我们使用了 `ArgumentsHost` 上的一些辅助方法来获取所需的 `Request` 和 `Response` 对象。了解更多关于 `ArgumentsHost` 的信息[请点击这里](/fundamentals/execution-context)。

\*这种抽象级别的原因是 `ArgumentsHost` 在所有上下文中都起作用（例如，我们现在正在处理的 HTTP 服务器上下文，以及微服务和 WebSockets）。在执行上下文章节中，我们将看到如何利用 `ArgumentsHost` 及其辅助函数的力量访问**任何**执行上下文的<a href="/fundamentals/execution-context#host-methods">底层参数</a>。这将使我们能够编写跨所有上下文操作的通用异常过滤器。

<app-banner-courses></app-banner-courses>

#### 绑定过滤器

让我们将新的 `HttpExceptionFilter` 绑定到 `CatsController` 的 `create()` 方法。

```typescript
@@filename(cats.controller)
@Post()
@UseFilters(new HttpExceptionFilter())
async create(@Body() createCatDto: CreateCatDto) {
  throw new ForbiddenException();
}
@@switch
@Post()
@UseFilters(new HttpExceptionFilter())
@Bind(Body())
async create(createCatDto) {
  throw new ForbiddenException();
}
```

> info **提示** `@UseFilters()` 装饰器从 `@nestjs/common` 包导入。

我们在这里使用了 `@UseFilters()` 装饰器。与 `@Catch()` 装饰器类似，它可以接受单个过滤器实例或逗号分隔的过滤器实例列表。在这里，我们原地创建了 `HttpExceptionFilter` 的实例。或者，你可以传递类（而不是实例），将实例化的责任留给框架，并启用**依赖注入**。

```typescript
@@filename(cats.controller)
@Post()
@UseFilters(HttpExceptionFilter)
async create(@Body() createCatDto: CreateCatDto) {
  throw new ForbiddenException();
}
@@switch
@Post()
@UseFilters(HttpExceptionFilter)
@Bind(Body())
async create(createCatDto) {
  throw new ForbiddenException();
}
```

> info **提示** 尽可能首选使用类而不是实例来应用过滤器。它减少了**内存使用**，因为 Nest 可以轻松地在整个模块中重用同一类的实例。

在上面的示例中，`HttpExceptionFilter` 仅应用于单个 `create()` 路由处理程序，使其成为方法范围的。异常过滤器可以在不同范围内设置：控制器/解析器/网关的方法范围、控制器范围或全局范围。
例如，要将过滤器设置为控制器范围，你可以执行以下操作：

```typescript
@@filename(cats.controller)
@Controller()
@UseFilters(new HttpExceptionFilter())
export class CatsController {}
```

此构造为 `CatsController` 内部定义的每个路由处理程序设置 `HttpExceptionFilter`。

要创建全局范围的过滤器，你可以执行以下操作：

```typescript
@@filename(main)
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

> warning **警告** `useGlobalFilters()` 方法不为网关或混合应用程序设置过滤器。

全局范围的过滤器用于整个应用程序，用于每个控制器和每个路由处理程序。在依赖注入方面，从任何模块外部注册的全局过滤器（如上例中的 `useGlobalFilters()`）无法注入依赖项，因为这是在任何模块的上下文之外完成的。为了解决这个问题，你可以使用以下构造**直接从任何模块**注册全局范围的过滤器：

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
```

> info **提示** 当使用此方法为过滤器执行依赖注入时，请注意，无论此构造用于哪个模块，过滤器实际上都是全局的。应该在何处完成？选择定义过滤器（上例中的 `HttpExceptionFilter`）的模块。此外，`useClass` 不是处理自定义提供程序注册的唯一方法。了解更多[请点击这里](/fundamentals/custom-providers)。

你可以使用此技术添加任意数量的过滤器；只需将每个添加到提供程序数组即可。

#### 捕获所有内容

为了捕获**每个**未处理的异常（无论异常类型如何），将 `@Catch()` 装饰器的参数列表留空，例如 `@Catch()`。

在下面的示例中，我们有一个与平台无关的代码，因为它使用 [HTTP 适配器](./faq/http-adapter)来传递响应，并且不直接使用任何特定于平台的对象（`Request` 和 `Response`）：

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // 在某些情况下，`httpAdapter` 可能在构造函数方法中不可用，
    // 因此我们应该在这里解析它。
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
```

> warning **警告** 当将捕获所有内容的异常过滤器与绑定到特定类型的过滤器结合使用时，应首先声明“捕获任何内容”的过滤器，以允许特定过滤器正确处理绑定类型。

#### 继承

通常，你会创建完全自定义的异常过滤器，以满足你的应用程序需求。但是，在某些情况下，你可能希望简单地扩展内置的默认**全局异常过滤器**，并基于某些因素覆盖行为。

为了将异常处理委托给基础过滤器，你需要扩展 `BaseExceptionFilter` 并调用继承的 `catch()` 方法。

```typescript
@@filename(all-exceptions.filter)
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(exception, host);
  }
}
@@switch
import { Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception, host) {
    super.catch(exception, host);
  }
}
```

> warning **警告** 扩展 `BaseExceptionFilter` 的方法范围和控制器范围的过滤器不应使用 `new` 实例化。相反，让框架自动实例化它们。

全局过滤器**可以**扩展基础过滤器。这可以通过两种方式之一完成。

第一种方法是在实例化自定义全局过滤器时注入 `HttpAdapter` 引用：

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

第二种方法是使用 `APP_FILTER` 令牌 <a href="exception-filters#binding-filters">如此处所示</a>。
