### RabbitMQ

[RabbitMQ](https://www.rabbitmq.com/) 是一个开源且轻量级的消息代理（message broker），支持多种消息协议。它可以部署为分布式和联邦式配置，以满足高规模和高可用性需求。此外，它是部署最广泛的消息代理，被全球各地的小型初创公司和大型企业所使用。

#### 安装

要开始构建基于 RabbitMQ 的微服务，首先安装所需的包：

```bash
$ npm i --save amqplib amqp-connection-manager
```

#### 概述

要使用 RabbitMQ 传输器，将以下选项对象传递给 `createMicroservice()` 方法：

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://localhost:5672'],
    queue: 'cats_queue',
    queueOptions: {
      durable: false
    },
  },
});
@@switch
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://localhost:5672'],
    queue: 'cats_queue',
    queueOptions: {
      durable: false
    },
  },
});
```

> info **提示** `Transport` 枚举是从 `@nestjs/microservices` 包中导入的。

#### 选项

`options` 属性特定于所选的传输器。<strong>RabbitMQ</strong> 传输器公开了以下描述的属性。

<table>
  <tr>
    <td><code>urls</code></td>
    <td>要按顺序尝试的连接 URL 数组</td>
  </tr>
  <tr>
    <td><code>queue</code></td>
    <td>服务器将监听的队列名称</td>
  </tr>
  <tr>
    <td><code>prefetchCount</code></td>
    <td>设置通道的预取计数</td>
  </tr>
  <tr>
    <td><code>isGlobalPrefetchCount</code></td>
    <td>启用每通道预取</td>
  </tr>
  <tr>
    <td><code>noAck</code></td>
    <td>如果为 <code>false</code>，则启用手动确认模式</td>
  </tr>
  <tr>
    <td><code>consumerTag</code></td>
    <td>服务器将用于区分消费者消息传递的名称；不得已在通道上使用。通常更容易省略此项，服务器将创建一个随机名称并在回复中提供。消费者标签标识符（在此处了解更多 <a href="https://amqp-node.github.io/amqplib/channel_api.html#channel_consume" rel="nofollow" target="_blank">here</a>）</td>
  </tr>
  <tr>
    <td><code>queueOptions</code></td>
    <td>额外的队列选项（在此处了解更多 <a href="https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue" rel="nofollow" target="_blank">here</a>）</td>
  </tr>
  <tr>
    <td><code>socketOptions</code></td>
    <td>额外的套接字选项（在此处了解更多 <a href="https://amqp-node.github.io/amqplib/channel_api.html#connect" rel="nofollow" target="_blank">here</a>）</td>
  </tr>
  <tr>
    <td><code>headers</code></td>
    <td>随每条消息一起发送的头部信息</td>
  </tr>
  <tr>
    <td><code>replyQueue</code></td>
    <td>生产者的回复队列。默认为 <code>amq.rabbitmq.reply-to</code></td>
  </tr>
  <tr>
    <td><code>persistent</code></td>
    <td>如果为真，消息将在代理重启后存活，前提是它位于一个同样能在重启后存活的队列中</td>
  </tr>
  <tr>
    <td><code>noAssert</code></td>
    <td>当为 false 时，消费前不会断言队列</td>
  </tr>
  <tr>
    <td><code>wildcards</code></td>
    <td>仅当你想使用主题交换（Topic Exchange）将消息路由到队列时才设置为 true。启用此选项将允许你在消息和事件模式中使用通配符（*, #）</td>
  </tr>
  <tr>
    <td><code>exchange</code></td>
    <td>交换机的名称。当 "wildcards" 设置为 true 时，默认为队列名称</td>
  </tr>
  <tr>
    <td><code>exchangeType</code></td>
    <td>交换机的类型。默认为 <code>topic</code>。有效值为 <code>direct</code>、<code>fanout</code>、<code>topic</code> 和 <code>headers</code></td>
  </tr>
  <tr>
    <td><code>routingKey</code></td>
    <td>主题交换的附加路由键</td>
  </tr>
  <tr>
    <td><code>maxConnectionAttempts</code></td>
    <td>最大连接尝试次数。仅适用于消费者配置。-1 表示无限</td>
  </tr>
</table>

#### 客户端

与其他微服务传输器一样，你有 <a href="/microservices/basics#client">几种选项</a> 来创建 RabbitMQ `ClientProxy` 实例。

创建实例的一种方法是使用 `ClientsModule`。要使用 `ClientsModule` 创建客户端实例，导入它并使用 `register()` 方法传递一个选项对象，该对象具有与上面在 `createMicroservice()` 方法中显示的相同属性，以及一个用作注入令牌的 `name` 属性。在此处了解更多关于 `ClientsModule` 的信息 <a href="/microservices/basics#client">here</a>。

```typescript
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'cats_queue',
          queueOptions: {
            durable: false
          },
        },
      },
    ]),
  ]
  ...
})
```

也可以使用其他创建客户端的选项（`ClientProxyFactory` 或 `@Client()`）。你可以在此处阅读有关它们的信息 <a href="/microservices/basics#client">here</a>。

#### 上下文

在更复杂的场景中，你可能需要访问有关传入请求的附加信息。使用 RabbitMQ 传输器时，你可以访问 `RmqContext` 对象。

```typescript
@@filename()
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: RmqContext) {
  console.log(`模式: ${context.getPattern()}`);
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(`模式: ${context.getPattern()}`);
}
```

> info **提示** `@Payload()`、`@Ctx()` 和 `RmqContext` 是从 `@nestjs/microservices` 包中导入的。

要访问原始的 RabbitMQ 消息（包含 `properties`、`fields` 和 `content`），使用 `RmqContext` 对象的 `getMessage()` 方法，如下所示：

```typescript
@@filename()
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: RmqContext) {
  console.log(context.getMessage());
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(context.getMessage());
}
```

要获取对 RabbitMQ [通道](https://www.rabbitmq.com/channels.html) 的引用，使用 `RmqContext` 对象的 `getChannelRef` 方法，如下所示：

```typescript
@@filename()
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: RmqContext) {
  console.log(context.getChannelRef());
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(context.getChannelRef());
}
```

#### 消息确认

为了确保消息从不丢失，RabbitMQ 支持 [消息确认](https://www.rabbitmq.com/confirms.html)。确认是由消费者发送回 RabbitMQ 的，告诉 RabbitMQ 某个特定消息已被接收、处理，并且 RabbitMQ 可以自由删除它。如果消费者在没有发送确认的情况下死亡（其通道关闭、连接关闭或 TCP 连接丢失），RabbitMQ 将理解消息未被完全处理并将其重新排队。

要启用手动确认模式，将 `noAck` 属性设置为 `false`：

```typescript
options: {
  urls: ['amqp://localhost:5672'],
  queue: 'cats_queue',
  noAck: false,
  queueOptions: {
    durable: false
  },
},
```

当手动消费者确认开启时，我们必须从工作器发送适当的确认，以信号表示我们已完成任务。

```typescript
@@filename()
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: RmqContext) {
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();

  channel.ack(originalMsg);
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();

  channel.ack(originalMsg);
}
```

#### 记录构建器

要配置消息选项，你可以使用 `RmqRecordBuilder` 类（注意：这也适用于基于事件的流）。例如，要设置 `headers` 和 `priority` 属性，使用 `setOptions` 方法，如下所示：

```typescript
const message = ':cat:';
const record = new RmqRecordBuilder(message)
  .setOptions({
    headers: {
      ['x-version']: '1.0.0',
    },
    priority: 3,
  })
  .build();

this.client.send('replace-emoji', record).subscribe(...);
```

> info **提示** `RmqRecordBuilder` 类是从 `@nestjs/microservices` 包中导出的。

你也可以在服务器端读取这些值，通过访问 `RmqContext`，如下所示：

```typescript
@@filename()
@MessagePattern('replace-emoji')
replaceEmoji(@Payload() data: string, @Ctx() context: RmqContext): string {
  const { properties: { headers } } = context.getMessage();
  return headers['x-version'] === '1.0.0' ? '🐱' : '🐈';
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('replace-emoji')
replaceEmoji(data, context) {
  const { properties: { headers } } = context.getMessage();
  return headers['x-version'] === '1.0.0' ? '🐱' : '🐈';
}
```

#### 实例状态更新

要获取关于连接和底层驱动程序实例状态的实时更新，你可以订阅 `status` 流。此流提供特定于所选驱动程序的状态更新。对于 RMQ 驱动程序，`status` 流发出 `connected` 和 `disconnected` 事件。

```typescript
this.client.status.subscribe((status: RmqStatus) => {
  console.log(status);
});
```

> info **提示** `RmqStatus` 类型是从 `@nestjs/microservices` 包中导入的。

同样，你可以订阅服务器的 `status` 流以接收关于服务器状态的通知。

```typescript
const server = app.connectMicroservice<MicroserviceOptions>(...);
server.status.subscribe((status: RmqStatus) => {
  console.log(status);
});
```

#### 监听 RabbitMQ 事件

在某些情况下，你可能希望监听微服务发出的内部事件。例如，你可以监听 `error` 事件以在发生错误时触发其他操作。为此，使用 `on()` 方法，如下所示：

```typescript
this.client.on('error', (err) => {
  console.error(err);
});
```

同样，你可以监听服务器的内部事件：

```typescript
server.on<RmqEvents>('error', (err) => {
  console.error(err);
});
```

> info **提示** `RmqEvents` 类型是从 `@nestjs/microservices` 包中导入的。

#### 底层驱动程序访问

对于更高级的用例，你可能需要访问底层驱动程序实例。这对于手动关闭连接或使用驱动程序特定方法等场景非常有用。但是，请记住，在大多数情况下，你**不需要**直接访问驱动程序。

为此，你可以使用 `unwrap()` 方法，它返回底层驱动程序实例。泛型类型参数应指定你期望的驱动程序实例类型。

```typescript
const managerRef =
  this.client.unwrap<import('amqp-connection-manager').AmqpConnectionManager>();
```

同样，你可以访问服务器的底层驱动程序实例：

```typescript
const managerRef =
  server.unwrap<import('amqp-connection-manager').AmqpConnectionManager>();
```

#### 通配符

RabbitMQ 支持在路由键中使用通配符以实现灵活的消息路由。`#` 通配符匹配零个或多个单词，而 `*` 通配符恰好匹配一个单词。

例如，路由键 `cats.#` 匹配 `cats`、`cats.meow` 和 `cats.meow.purr`。路由键 `cats.*` 匹配 `cats.meow` 但不匹配 `cats.meow.purr`。

要在 RabbitMQ 微服务中启用通配符支持，在选项对象中将 `wildcards` 配置选项设置为 `true`：

```typescript
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  {
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://localhost:5672'],
      queue: 'cats_queue',
      wildcards: true,
    },
  },
);
```

使用此配置，你可以在订阅事件/消息时在路由键中使用通配符。例如，要监听路由键为 `cats.#` 的消息，可以使用以下代码：

```typescript
@MessagePattern('cats.#')
getCats(@Payload() data: { message: string }, @Ctx() context: RmqContext) {
  console.log(`收到路由键为的消息: ${context.getPattern()}`);

  return {
    message: '来自猫咪服务的问候！',
  }
}
```

要发送具有特定路由键的消息，可以使用 `ClientProxy` 实例的 `send()` 方法：

```typescript
this.client.send('cats.meow', { message: '喵！' }).subscribe((response) => {
  console.log(response);
});
```
