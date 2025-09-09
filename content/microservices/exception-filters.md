### 异常过滤器

HTTP [异常过滤器](/exception-filters)层与对应的微服务层之间的唯一区别在于：你应该使用 `RpcException` 而不是抛出 `HttpException`。

```typescript
throw new RpcException('Invalid credentials.');
```

> info **提示** `RpcException` 类是从 `@nestjs/microservices` 包中导入的。

在上面的示例中，Nest 将处理抛出的异常，并返回具有以下结构的 `error` 对象：

```json
{
  "status": "error",
  "message": "Invalid credentials."
}
```

#### 过滤器

微服务异常过滤器的行为类似于 HTTP 异常过滤器，但有一个小区别。`catch()` 方法必须返回一个 `Observable`。

```typescript
@@filename(rpc-exception.filter)
import { Catch, RpcExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class ExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    return throwError(() => exception.getError());
  }
}
@@switch
import { Catch } from '@nestjs/common';
import { throwError } from 'rxjs';

@Catch(RpcException)
export class ExceptionFilter {
  catch(exception, host) {
    return throwError(() => exception.getError());
  }
}
```

> warning **警告** 在使用[混合应用](/faq/hybrid-application)时，默认情况下不会启用全局微服务异常过滤器。

以下示例使用了一个手动实例化的方法作用域过滤器。就像基于 HTTP 的应用程序一样，你也可以使用控制器作用域的过滤器（即，在控制器类前加上 `@UseFilters()` 装饰器）。

```typescript
@@filename()
@UseFilters(new ExceptionFilter())
@MessagePattern({ cmd: 'sum' })
accumulate(data: number[]): number {
  return (data || []).reduce((a, b) => a + b);
}
@@switch
@UseFilters(new ExceptionFilter())
@MessagePattern({ cmd: 'sum' })
accumulate(data) {
  return (data || []).reduce((a, b) => a + b);
}
```

#### 继承

通常，你会创建完全定制的异常过滤器来满足你的应用程序需求。但是，在某些情况下，你可能希望简单地扩展**核心异常过滤器**，并根据特定因素重写行为。

为了将异常处理委托给基础过滤器，你需要扩展 `BaseExceptionFilter` 并调用继承的 `catch()` 方法。

```typescript
@@filename()
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';

@Catch()
export class AllExceptionsFilter extends BaseRpcExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    return super.catch(exception, host);
  }
}
@@switch
import { Catch } from '@nestjs/common';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';

@Catch()
export class AllExceptionsFilter extends BaseRpcExceptionFilter {
  catch(exception, host) {
    return super.catch(exception, host);
  }
}
```

上述实现只是一个演示方法的框架。你扩展的异常过滤器的实现将包括你定制的**业务逻辑**（例如，处理各种条件）。