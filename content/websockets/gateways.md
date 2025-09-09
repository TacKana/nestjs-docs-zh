### 网关

本文档中其他地方讨论的大多数概念，如依赖注入、装饰器、异常过滤器、管道、守卫和拦截器，同样适用于网关。Nest 尽可能抽象实现细节，以便相同的组件可以在基于 HTTP 的平台、WebSockets 和微服务中运行。本节涵盖 Nest 中特定于 WebSockets 的方面。

在 Nest 中，网关是一个用 `@WebSocketGateway()` 装饰器注解的类。从技术上讲，网关是平台无关的，一旦创建了适配器，它们就可以与任何 WebSockets 库兼容。有两个 WS 平台得到开箱即用的支持：[socket.io](https://github.com/socketio/socket.io) 和 [ws](https://github.com/websockets/ws)。你可以选择最适合你需求的库。此外，你还可以按照此[指南](/websockets/adapter)构建自己的适配器。

<figure><img class="illustrative-image" src="/assets/Gateways_1.png" /></figure>

> info **提示** 网关可以被视为[提供者](/providers)；这意味着它们可以通过类构造函数注入依赖关系。同时，网关也可以被其他类（提供者和控制器）注入。

#### 安装

要开始构建基于 WebSockets 的应用程序，首先安装所需的包：

```bash
@@filename()
$ npm i --save @nestjs/websockets @nestjs/platform-socket.io
@@switch
$ npm i --save @nestjs/websockets @nestjs/platform-socket.io
```

#### 概述

通常，每个网关都监听与 **HTTP 服务器** 相同的端口，除非你的应用程序不是 Web 应用程序，或者你手动更改了端口。可以通过向 `@WebSocketGateway(80)` 装饰器传递参数来修改此默认行为，其中 `80` 是选定的端口号。你还可以使用以下结构设置网关使用的[命名空间](https://socket.io/docs/v4/namespaces/)：

```typescript
@WebSocketGateway(80, { namespace: 'events' })
```

> warning **警告** 网关在被现有模块的提供者数组引用之前不会被实例化。

你可以通过 `@WebSocketGateway()` 装饰器的第二个参数将任何支持的[选项](https://socket.io/docs/v4/server-options/)传递给 socket 构造函数，如下所示：

```typescript
@WebSocketGateway(81, { transports: ['websocket'] })
```

网关现在正在监听，但我们还没有订阅任何传入消息。让我们创建一个处理程序，它将订阅 `events` 消息，并用完全相同的数据响应用户。

```typescript
@@filename(events.gateway)
@SubscribeMessage('events')
handleEvent(@MessageBody() data: string): string {
  return data;
}
@@switch
@Bind(MessageBody())
@SubscribeMessage('events')
handleEvent(data) {
  return data;
}
```

> info **提示** `@SubscribeMessage()` 和 `@MessageBody()` 装饰器从 `@nestjs/websockets` 包导入。

一旦创建了网关，我们就可以在我们的模块中注册它。

```typescript
import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@@filename(events.module)
@Module({
  providers: [EventsGateway]
})
export class EventsModule {}
```

你也可以向装饰器传递一个属性键，以从传入的消息体中提取它：

```typescript
@@filename(events.gateway)
@SubscribeMessage('events')
handleEvent(@MessageBody('id') id: number): number {
  // id === messageBody.id
  return id;
}
@@switch
@Bind(MessageBody('id'))
@SubscribeMessage('events')
handleEvent(id) {
  // id === messageBody.id
  return id;
}
```

如果你不想使用装饰器，以下代码在功能上是等效的：

```typescript
@@filename(events.gateway)
@SubscribeMessage('events')
handleEvent(client: Socket, data: string): string {
  return data;
}
@@switch
@SubscribeMessage('events')
handleEvent(client, data) {
  return data;
}
```

在上面的例子中，`handleEvent()` 函数接受两个参数。第一个是平台特定的 [socket 实例](https://socket.io/docs/v4/server-api/#socket)，第二个是从客户端接收的数据。不过，不推荐这种方法，因为它需要在每个单元测试中模拟 `socket` 实例。

一旦接收到 `events` 消息，处理程序会发送一个确认，其中包含通过网络发送的相同数据。此外，还可以使用库特定的方法发送消息，例如使用 `client.emit()` 方法。要访问连接的 socket 实例，请使用 `@ConnectedSocket()` 装饰器。

```typescript
@@filename(events.gateway)
@SubscribeMessage('events')
handleEvent(
  @MessageBody() data: string,
  @ConnectedSocket() client: Socket,
): string {
  return data;
}
@@switch
@Bind(MessageBody(), ConnectedSocket())
@SubscribeMessage('events')
handleEvent(data, client) {
  return data;
}
```

> info **提示** `@ConnectedSocket()` 装饰器从 `@nestjs/websockets` 包导入。

然而，在这种情况下，你将无法利用拦截器。如果你不想响应用户，可以简单地跳过 `return` 语句（或显式返回一个“假”值，例如 `undefined`）。

现在，当客户端发出如下消息时：

```typescript
socket.emit('events', { name: 'Nest' });
```

`handleEvent()` 方法将被执行。为了监听上述处理程序内部发出的消息，客户端必须附加相应的确认监听器：

```typescript
socket.emit('events', { name: 'Nest' }, (data) => console.log(data));
```

#### 多个响应

确认仅发送一次。此外，原生 WebSockets 实现不支持此功能。为了解决这个限制，你可以返回一个由两个属性组成的对象。`event` 是发出的事件的名称，`data` 是要转发给客户端的数据。

```typescript
@@filename(events.gateway)
@SubscribeMessage('events')
handleEvent(@MessageBody() data: unknown): WsResponse<unknown> {
  const event = 'events';
  return { event, data };
}
@@switch
@Bind(MessageBody())
@SubscribeMessage('events')
handleEvent(data) {
  const event = 'events';
  return { event, data };
}
```

> info **提示** `WsResponse` 接口从 `@nestjs/websockets` 包导入。

> warning **警告** 如果你的 `data` 字段依赖于 `ClassSerializerInterceptor`，你应该返回一个实现 `WsResponse` 的类实例，因为它会忽略普通的 JavaScript 对象响应。

为了监听传入的响应，客户端必须应用另一个事件监听器。

```typescript
socket.on('events', (data) => console.log(data));
```

#### 异步响应

消息处理程序可以同步或**异步**响应。因此，支持 `async` 方法。消息处理程序也可以返回一个 `Observable`，在这种情况下，结果值将在流完成之前发出。

```typescript
@@filename(events.gateway)
@SubscribeMessage('events')
onEvent(@MessageBody() data: unknown): Observable<WsResponse<number>> {
  const event = 'events';
  const response = [1, 2, 3];

  return from(response).pipe(
    map(data => ({ event, data })),
  );
}
@@switch
@Bind(MessageBody())
@SubscribeMessage('events')
onEvent(data) {
  const event = 'events';
  const response = [1, 2, 3];

  return from(response).pipe(
    map(data => ({ event, data })),
  );
}
```

在上面的例子中，消息处理程序将响应 **3 次**（使用数组中的每个项）。

#### 生命周期钩子

有 3 个有用的生命周期钩子可用。它们都有相应的接口，并在下表中描述：

<table>
  <tr>
    <td>
      <code>OnGatewayInit</code>
    </td>
    <td>
      强制实现 <code>afterInit()</code> 方法。将库特定的服务器实例作为参数（如果需要，还可以传递其他参数）。
    </td>
  </tr>
  <tr>
    <td>
      <code>OnGatewayConnection</code>
    </td>
    <td>
      强制实现 <code>handleConnection()</code> 方法。将库特定的客户端 socket 实例作为参数。
    </td>
  </tr>
  <tr>
    <td>
      <code>OnGatewayDisconnect</code>
    </td>
    <td>
      强制实现 <code>handleDisconnect()</code> 方法。将库特定的客户端 socket 实例作为参数。
    </td>
  </tr>
</table>

> info **提示** 每个生命周期接口都从 `@nestjs/websockets` 包导出。

#### 服务器和命名空间

偶尔，你可能希望直接访问原生的、**平台特定的**服务器实例。对此对象的引用作为参数传递给 `afterInit()` 方法（`OnGatewayInit` 接口）。另一种选择是使用 `@WebSocketServer()` 装饰器。

```typescript
@WebSocketServer()
server: Server;
```

此外，你可以使用 `namespace` 属性检索相应的命名空间，如下所示：

```typescript
@WebSocketGateway({ namespace: 'my-namespace' })
export class EventsGateway {
  @WebSocketServer()
  namespace: Namespace;
}
```

`@WebSocketServer()` 装饰器通过引用 `@WebSocketGateway()` 装饰器存储的元数据来注入服务器实例。如果你向 `@WebSocketGateway()` 装饰器提供了命名空间选项，`@WebSocketServer()` 装饰器将返回一个 `Namespace` 实例而不是 `Server` 实例。

> warning **注意** `@WebSocketServer()` 装饰器从 `@nestjs/websockets` 包导入。

Nest 将在服务器实例准备好使用后自动将其分配给此属性。

<app-banner-enterprise></app-banner-enterprise>

#### 示例

一个可工作的示例可在[这里](https://github.com/nestjs/nest/tree/master/sample/02-gateways)找到。