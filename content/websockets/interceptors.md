### 拦截器

[常规拦截器](/interceptors)与 WebSocket 拦截器在使用上并无区别。以下示例展示了一个手动实例化的方法作用域拦截器。正如基于 HTTP 的应用程序一样，您也可以使用网关作用域拦截器（即在网关类前添加 `@UseInterceptors()` 装饰器）。

```typescript
@@filename()
@UseInterceptors(new TransformInterceptor())
@SubscribeMessage('events')
handleEvent(client: Client, data: unknown): WsResponse<unknown> {
  const event = 'events';
  return { event, data };
}
@@switch
@UseInterceptors(new TransformInterceptor())
@SubscribeMessage('events')
handleEvent(client, data) {
  const event = 'events';
  return { event, data };
}
```
