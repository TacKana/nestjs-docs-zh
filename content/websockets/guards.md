### 守卫（Guards）

WebSocket 守卫与[常规的 HTTP 应用守卫](/guards)在根本上并无不同。唯一的区别在于，你应该使用 `WsException` 而非抛出 `HttpException`。

> **提示** `WsException` 类由 `@nestjs/websockets` 包提供。

#### 绑定守卫

下面的例子展示了如何使用一个方法作用域的守卫。与基于 HTTP 的应用一样，你也可以使用网关作用域的守卫（即在网关类上使用 `@UseGuards()` 装饰器）。

```typescript
@@filename()
@UseGuards(AuthGuard)
@SubscribeMessage('events')
handleEvent(client: Client, data: unknown): WsResponse<unknown> {
  const event = 'events';
  return { event, data };
}
@@switch
@UseGuards(AuthGuard)
@SubscribeMessage('events')
handleEvent(client, data) {
  const event = 'events';
  return { event, data };
}
```