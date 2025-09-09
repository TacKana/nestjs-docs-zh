### 异常过滤器

HTTP [异常过滤器](/exception-filters)层与对应的 WebSocket 层之间的唯一区别在于，不应抛出 `HttpException`，而应使用 `WsException`。

```typescript
throw new WsException('无效凭据。');
```

> info **提示** `WsException` 类从 `@nestjs/websockets` 包中导入。

在上面的示例中，Nest 将处理抛出的异常，并发射以下结构的 `exception` 消息：

```typescript
{
  status: 'error',
  message: '无效凭据。'
}
```

#### 过滤器

WebSocket 异常过滤器的行为与 HTTP 异常过滤器相同。以下示例使用手动实例化的方法作用域过滤器。与基于 HTTP 的应用一样，你也可以使用网关作用域的过滤器（即在网关类前添加 `@UseFilters()` 装饰器）。

```typescript
@UseFilters(new WsExceptionFilter())
@SubscribeMessage('events')
onEvent(client, data: any): WsResponse<any> {
  const event = 'events';
  return { event, data };
}
```

#### 继承

通常，你会创建完全自定义的异常过滤器，以满足应用程序的需求。但在某些情况下，你可能希望简单地扩展**核心异常过滤器**，并根据特定因素重写其行为。

为了将异常处理委托给基础过滤器，你需要扩展 `BaseWsExceptionFilter` 并调用继承的 `catch()` 方法。

```typescript
@@filename()
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(exception, host);
  }
}
@@switch
import { Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception, host) {
    super.catch(exception, host);
  }
}
```

上面的实现只是一个展示方法的框架。扩展异常过滤器的实现应包括你定制的**业务逻辑**（例如，处理各种条件）。