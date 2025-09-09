### 守卫（Guards）

微服务守卫与[常规 HTTP 应用守卫](/guards)没有本质区别。唯一的区别在于：不应抛出 `HttpException`，而应改用 `RpcException`。

> info **提示** `RpcException` 类由 `@nestjs/microservices` 包提供。

#### 绑定守卫

以下示例使用了一个方法作用域的守卫。与基于 HTTP 的应用一样，你也可以使用控制器作用域的守卫（即在控制器类前添加 `@UseGuards()` 装饰器）。

```typescript
@@filename()
@UseGuards(AuthGuard)
@MessagePattern({ cmd: 'sum' })
accumulate(data: number[]): number {
  return (data || []).reduce((a, b) => a + b);
}
@@switch
@UseGuards(AuthGuard)
@MessagePattern({ cmd: 'sum' })
accumulate(data) {
  return (data || []).reduce((a, b) => a + b);
}
```