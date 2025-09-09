### 服务器发送事件（Server-Sent Events）

服务器发送事件（SSE）是一种服务器推送技术，允许客户端通过 HTTP 连接从服务器自动接收更新。每个通知都以文本块的形式发送，以一对换行符终止（了解更多请参阅[这里](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)）。

#### 使用方法

要在路由（在**控制器类**中注册的路由）上启用服务器发送事件，请使用 `@Sse()` 装饰器标注方法处理程序。

```typescript
@Sse('sse')
sse(): Observable<MessageEvent> {
  return interval(1000).pipe(map((_) => ({ data: { hello: 'world' } })));
}
```

> info **提示** `@Sse()` 装饰器和 `MessageEvent` 接口从 `@nestjs/common` 导入，而 `Observable`、`interval` 和 `map` 则从 `rxjs` 包导入。

> warning **警告** 服务器发送事件路由必须返回一个 `Observable` 流。

在上面的示例中，我们定义了一个名为 `sse` 的路由，它将允许我们传播实时更新。这些事件可以使用 [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) 进行监听。

`sse` 方法返回一个发出多个 `MessageEvent` 的 `Observable`（在此示例中，它每秒发出一个新的 `MessageEvent`）。`MessageEvent` 对象应符合以下接口以匹配规范：

```typescript
export interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}
```

完成这些设置后，我们现在可以在客户端应用程序中创建一个 `EventSource` 类的实例，并将 `/sse` 路由（与我们传递给上方 `@Sse()` 装饰器的端点相匹配）作为构造函数参数传入。

`EventSource` 实例会打开一个到 HTTP 服务器的持久连接，该服务器以 `text/event-stream` 格式发送事件。连接保持打开状态，直到调用 `EventSource.close()` 关闭。

一旦连接打开，来自服务器的传入消息将以事件的形式传递到您的代码中。如果传入消息中有事件字段，则触发的事件与事件字段值相同。如果没有事件字段，则触发通用的 `message` 事件（[来源](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)）。

```javascript
const eventSource = new EventSource('/sse');
eventSource.onmessage = ({ data }) => {
  console.log('New message', JSON.parse(data));
};
```

#### 示例

可运行的示例可在[此处](https://github.com/nestjs/nest/tree/master/sample/28-sse)找到。