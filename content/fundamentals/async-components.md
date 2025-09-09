### 异步提供者

有时，应用程序的启动应当延迟，直到一个或多个**异步任务**完成。例如，您可能不希望在与数据库建立连接之前开始接受请求。您可以使用异步提供者来实现这一目标。

实现这一点的语法是将 `async/await` 与 `useFactory` 语法结合使用。工厂函数返回一个 `Promise`，并且工厂函数可以 `await` 异步任务。Nest 将在实例化任何依赖于（注入）此类提供者的类之前，等待该 Promise 的解析。

```typescript
{
  provide: 'ASYNC_CONNECTION',
  useFactory: async () => {
    const connection = await createConnection(options);
    return connection;
  },
}
```

> info **提示** 了解更多关于自定义提供者语法的信息，请参阅[这里](/fundamentals/custom-providers)。

#### 注入

异步提供者像其他任何提供者一样，通过它们的令牌注入到其他组件中。在上面的例子中，您可以使用构造 `@Inject('ASYNC_CONNECTION')`。

#### 示例

[TypeORM 配方](/recipes/sql-typeorm)提供了一个更全面的异步提供者示例。