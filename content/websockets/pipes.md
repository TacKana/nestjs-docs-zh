### 管道（Pipes）

[常规管道](/pipes)与 WebSocket 管道本质上没有区别。唯一的区别在于，你应该使用 `WsException` 而不是抛出 `HttpException`。此外，所有管道仅会应用于 `data` 参数（因为验证或转换 `client` 实例毫无意义）。

> info **提示** `WsException` 类由 `@nestjs/websockets` 包导出。

#### 绑定管道

以下示例使用手动实例化的方法作用域管道。就像基于 HTTP 的应用程序一样，你也可以使用网关作用域的管道（例如，在网关类前添加 `@UsePipes()` 装饰器）。

```typescript
@@filename()
@UsePipes(new ValidationPipe({ exceptionFactory: (errors) => new WsException(errors) }))
@SubscribeMessage('events')
handleEvent(client: Client, data: unknown): WsResponse<unknown> {
  const event = 'events';
  return { event, data };
}
@@switch
@UsePipes(new ValidationPipe({ exceptionFactory: (errors) => new WsException(errors) }))
@SubscribeMessage('events')
handleEvent(client, data) {
  const event = 'events';
  return { event, data };
}
```