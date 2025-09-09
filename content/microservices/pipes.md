### 管道

[常规管道](/pipes)与微服务管道之间没有本质区别。唯一的不同在于，你应该使用 `RpcException` 而不是抛出 `HttpException`。

> info **提示** `RpcException` 类是从 `@nestjs/microservices` 包中导出的。

#### 绑定管道

下面的例子展示了一个手动实例化的方法作用域管道。就像基于 HTTP 的应用一样，你也可以使用控制器作用域的管道（例如，在控制器类前加上 `@UsePipes()` 装饰器）。

```typescript
@@filename()
@UsePipes(new ValidationPipe({ exceptionFactory: (errors) => new RpcException(errors) }))
@MessagePattern({ cmd: 'sum' })
accumulate(data: number[]): number {
  return (data || []).reduce((a, b) => a + b);
}
@@switch
@UsePipes(new ValidationPipe({ exceptionFactory: (errors) => new RpcException(errors) }))
@MessagePattern({ cmd: 'sum' })
accumulate(data) {
  return (data || []).reduce((a, b) => a + b);
}
```