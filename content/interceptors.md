### 拦截器

拦截器是一个使用 `@Injectable()` 装饰器注解的类，并实现了 `NestInterceptor` 接口。

<figure><img class="illustrative-image" src="/assets/Interceptors_1.png" /></figure>

拦截器拥有一系列受[面向切面编程](https://en.wikipedia.org/wiki/Aspect-oriented_programming) (AOP) 技术启发的有用能力。它们使得以下功能成为可能：

- 在方法执行前后绑定额外的逻辑
- 转换从函数返回的结果
- 转换从函数抛出的异常
- 扩展基础函数行为
- 根据特定条件完全重写函数（例如，用于缓存目的）

#### 基础概念

每个拦截器都实现 `intercept()` 方法，该方法接受两个参数。第一个是 `ExecutionContext` 实例（与[守卫](/guards)中的对象完全相同）。`ExecutionContext` 继承自 `ArgumentsHost`。我们在异常过滤器章节中见过 `ArgumentsHost`，它是传递给原始处理器的参数的包装器，根据应用程序类型包含不同的参数数组。你可以回顾[异常过滤器](https://docs.nestjs.com/exception-filters#arguments-host)章节了解更多相关内容。

#### 执行上下文

通过扩展 `ArgumentsHost`，`ExecutionContext` 还添加了几个新的辅助方法，提供了关于当前执行过程的额外细节。这些细节有助于构建更通用的拦截器，能够跨广泛的控制器、方法和执行上下文工作。了解更多关于 `ExecutionContext` 的信息[请点击这里](/fundamentals/execution-context)。

#### 调用处理器

第二个参数是 `CallHandler`。`CallHandler` 接口实现了 `handle()` 方法，你可以在拦截器中的某个时点使用它来调用路由处理器方法。如果你在实现 `intercept()` 方法时没有调用 `handle()` 方法，路由处理器方法将完全不会执行。

这种方式意味着 `intercept()` 方法有效地**包装**了请求/响应流。因此，你可以在最终路由处理器执行**之前和之后**实现自定义逻辑。显然，你可以在调用 `handle()` **之前**在 `intercept()` 方法中编写代码，但是如何影响之后发生的事情呢？因为 `handle()` 方法返回一个 `Observable`，我们可以使用强大的 [RxJS](https://github.com/ReactiveX/rxjs) 操作符来进一步操作响应。使用面向切面编程的术语，路由处理器的调用（即调用 `handle()`）被称为[切点](https://en.wikipedia.org/wiki/Pointcut)，表示这是插入我们额外逻辑的点。

例如，考虑一个传入的 `POST /cats` 请求。该请求目标是 `CatsController` 内部定义的 `create()` 处理器。如果在此过程中的任何地方调用了不调用 `handle()` 方法的拦截器，`create()` 方法将不会执行。一旦 `handle()` 被调用（并且其 `Observable` 已返回），`create()` 处理器将被触发。一旦通过 `Observable` 接收到响应流，就可以对流执行额外操作，并将最终结果返回给调用者。

<app-banner-devtools></app-banner-devtools>

#### 切面拦截

我们将看到的第一个用例是使用拦截器来记录用户交互（例如，存储用户调用、异步分发事件或计算时间戳）。下面展示一个简单的 `LoggingInterceptor`：

```typescript
@@filename(logging.interceptor)
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before...');

    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() => console.log(`After... ${Date.now() - now}ms`)),
      );
  }
}
@@switch
import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor {
  intercept(context, next) {
    console.log('Before...');

    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() => console.log(`After... ${Date.now() - now}ms`)),
      );
  }
}
```

> info **提示** `NestInterceptor<T, R>` 是一个泛型接口，其中 `T` 表示 `Observable<T>` 的类型（支持响应流），`R` 是 `Observable<R>` 包装的值的类型。

> warning **注意** 拦截器与控制器、提供者、守卫等一样，可以通过它们的 `constructor` **注入依赖**。

由于 `handle()` 返回一个 RxJS `Observable`，我们有很多操作符可以用来操作流。在上面的例子中，我们使用了 `tap()` 操作符，它在可观察流正常或异常终止时调用我们的匿名日志记录函数，但不会干扰响应周期。

#### 绑定拦截器

为了设置拦截器，我们使用从 `@nestjs/common` 包导入的 `@UseInterceptors()` 装饰器。与[管道](/pipes)和[守卫](/guards)一样，拦截器可以是控制器作用域、方法作用域或全局作用域。

```typescript
@@filename(cats.controller)
@UseInterceptors(LoggingInterceptor)
export class CatsController {}
```

> info **提示** `@UseInterceptors()` 装饰器是从 `@nestjs/common` 包导入的。

使用上述结构，`CatsController` 中定义的每个路由处理器都将使用 `LoggingInterceptor`。当有人调用 `GET /cats` 端点时，你将在标准输出中看到以下输出：

```typescript
Before...
After... 1ms
```

注意我们传递的是 `LoggingInterceptor` 类（而不是实例），将实例化的责任留给框架，并启用依赖注入。与管道、守卫和异常过滤器一样，我们也可以传递一个就地实例：

```typescript
@@filename(cats.controller)
@UseInterceptors(new LoggingInterceptor())
export class CatsController {}
```

如前所述，上述结构将拦截器附加到该控制器声明的每个处理器上。如果我们想将拦截器的范围限制在单个方法上，只需在**方法级别**应用装饰器。

为了设置全局拦截器，我们使用 Nest 应用程序实例的 `useGlobalInterceptors()` 方法：

```typescript
const app = await NestFactory.create(AppModule);
app.useGlobalInterceptors(new LoggingInterceptor());
```

全局拦截器用于整个应用程序，针对每个控制器和每个路由处理器。在依赖注入方面，从任何模块外部注册的全局拦截器（如上面的示例中使用 `useGlobalInterceptors()`）无法注入依赖项，因为这是在任何模块的上下文之外完成的。为了解决这个问题，你可以使用以下结构**直接从任何模块**设置拦截器：

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

> info **提示** 当使用这种方法为拦截器执行依赖注入时，请注意，无论采用这种结构的模块在哪里，拦截器实际上是全局的。应该在哪里这样做？选择定义拦截器的模块（如上例中的 `LoggingInterceptor`）。另外，`useClass` 并不是处理自定义提供者注册的唯一方式。了解更多[请点击这里](/fundamentals/custom-providers)。

#### 响应映射

我们已经知道 `handle()` 返回一个 `Observable`。流包含从路由处理器**返回**的值，因此我们可以使用 RxJS 的 `map()` 操作符轻松地改变它。

> warning **警告** 响应映射功能不适用于库特定的响应策略（禁止直接使用 `@Res()` 对象）。

让我们创建 `TransformInterceptor`，它将以一种简单的方式修改每个响应以演示该过程。它将使用 RxJS 的 `map()` 操作符将响应对象分配给新创建对象的 `data` 属性，将新对象返回给客户端。

```typescript
@@filename(transform.interceptor)
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(map(data => ({ data })));
  }
}
@@switch
import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor {
  intercept(context, next) {
    return next.handle().pipe(map(data => ({ data })));
  }
}
```

> info **提示** Nest 拦截器适用于同步和异步的 `intercept()` 方法。如果需要，你可以简单地将方法切换为 `async`。

使用上述结构，当有人调用 `GET /cats` 端点时，响应将如下所示（假设路由处理器返回一个空数组 `[]`）：

```json
{
  "data": []
}
```

拦截器在创建可重用解决方案以满足整个应用程序中出现的需求方面具有巨大价值。例如，想象我们需要将每个 `null` 值转换为空字符串 `''`。我们可以用一行代码完成，并全局绑定拦截器，以便它自动被每个注册的处理器使用。

```typescript
@@filename()
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ExcludeNullInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(map(value => value === null ? '' : value ));
  }
}
@@switch
import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class ExcludeNullInterceptor {
  intercept(context, next) {
    return next
      .handle()
      .pipe(map(value => value === null ? '' : value ));
  }
}
```

#### 异常映射

另一个有趣的用例是利用 RxJS 的 `catchError()` 操作符来覆盖抛出的异常：

```typescript
@@filename(errors.interceptor)
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  BadGatewayException,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(
        catchError(err => throwError(() => new BadGatewayException())),
      );
  }
}
@@switch
import { Injectable, BadGatewayException } from '@nestjs/common';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor {
  intercept(context, next) {
    return next
      .handle()
      .pipe(
        catchError(err => throwError(() => new BadGatewayException())),
      );
  }
}
```

#### 流覆盖

有几个原因可能使我们有时想完全阻止调用处理器并返回一个不同的值。一个明显的例子是实现缓存以提高响应时间。让我们看一个简单的**缓存拦截器**，它从缓存中返回其响应。在一个实际的例子中，我们会想考虑其他因素，如 TTL、缓存失效、缓存大小等，但这超出了本次讨论的范围。这里我们将提供一个演示主要概念的基本示例。

```typescript
@@filename(cache.interceptor)
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isCached = true;
    if (isCached) {
      return of([]);
    }
    return next.handle();
  }
}
@@switch
import { Injectable } from '@nestjs/common';
import { of } from 'rxjs';

@Injectable()
export class CacheInterceptor {
  intercept(context, next) {
    const isCached = true;
    if (isCached) {
      return of([]);
    }
    return next.handle();
  }
}
```

我们的 `CacheInterceptor` 有一个硬编码的 `isCached` 变量和一个硬编码的响应 `[]`。需要注意的关键点是，我们在这里返回一个新的流，由 RxJS `of()` 操作符创建，因此路由处理器**根本不会被调用**。当有人调用使用 `CacheInterceptor` 的端点时，响应（一个硬编码的空数组）将立即返回。为了创建通用解决方案，你可以利用 `Reflector` 并创建自定义装饰器。`Reflector` 在[守卫](/guards)章节中有详细描述。

#### 更多操作符

使用 RxJS 操作符操作流的可能性给了我们很多能力。让我们考虑另一个常见用例。假设你想处理路由请求的**超时**。当你的端点在一段时间后没有返回任何内容时，你想以错误响应终止。以下结构实现了这一点：

```typescript
@@filename(timeout.interceptor)
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),
      catchError(err => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException());
        }
        return throwError(() => err);
      }),
    );
  };
};
@@switch
import { Injectable, RequestTimeoutException } from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor {
  intercept(context, next) {
    return next.handle().pipe(
      timeout(5000),
      catchError(err => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException());
        }
        return throwError(() => err);
      }),
    );
  };
};
```

5 秒后，请求处理将被取消。你还可以在抛出 `RequestTimeoutException` 之前添加自定义逻辑（例如释放资源）。