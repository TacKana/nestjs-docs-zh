### Redis

[Redis](https://redis.io/) 传输器实现了发布/订阅消息传递模式，并利用了 Redis 的 [Pub/Sub](https://redis.io/topics/pubsub) 功能。发布的消息被分类到通道中，而无需知道哪些订阅者（如果有的话）最终会接收到消息。每个微服务可以订阅任意数量的通道。此外，可以同时订阅多个通道。通过通道交换的消息是**即发即弃**的，这意味着如果一条消息被发布但没有订阅者对其感兴趣，该消息将被移除且无法恢复。因此，你不能保证消息或事件至少会被一个服务处理。单个消息可以被多个订阅者订阅（和接收）。

<figure><img class="illustrative-image" src="/assets/Redis_1.png" /></figure>

#### 安装

要开始构建基于 Redis 的微服务，首先需要安装所需的包：

```bash
$ npm i --save ioredis
```

#### 概述

要使用 Redis 传输器，将以下选项对象传递给 `createMicroservice()` 方法：

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.REDIS,
  options: {
    host: 'localhost',
    port: 6379,
  },
});
@@switch
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.REDIS,
  options: {
    host: 'localhost',
    port: 6379,
  },
});
```

> info **提示** `Transport` 枚举是从 `@nestjs/microservices` 包中导入的。

#### 选项

`options` 属性是特定于所选传输器的。<strong>Redis</strong> 传输器公开了以下描述的属性。

<table>
  <tr>
    <td><code>host</code></td>
    <td>连接 URL</td>
  </tr>
  <tr>
    <td><code>port</code></td>
    <td>连接端口</td>
  </tr>
  <tr>
    <td><code>retryAttempts</code></td>
    <td>消息重试次数（默认：<code>0</code>）</td>
  </tr>
  <tr>
    <td><code>retryDelay</code></td>
    <td>消息重试尝试之间的延迟（毫秒）（默认：<code>0</code>）</td>
  </tr>
   <tr>
    <td><code>wildcards</code></td>
    <td>启用 Redis 通配符订阅，指示传输器在底层使用 <code>psubscribe</code>/<code>pmessage</code>（默认：<code>false</code>）</td>
  </tr>
</table>

该传输器还支持官方 [ioredis](https://redis.github.io/ioredis/index.html#RedisOptions) 客户端支持的所有属性。

#### 客户端

与其他微服务传输器类似，你有<a href="/microservices/basics#client">几种选项</a>用于创建 Redis `ClientProxy` 实例。

创建实例的一种方法是使用 `ClientsModule`。要使用 `ClientsModule` 创建客户端实例，请导入它并使用 `register()` 方法传递一个选项对象，该对象具有与上述 `createMicroservice()` 方法中相同的属性，以及一个用作注入令牌的 `name` 属性。有关 `ClientsModule` 的更多信息，请阅读<a href="/microservices/basics#client">此处</a>。

```typescript
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: 'localhost',
          port: 6379,
        }
      },
    ]),
  ]
  ...
})
```

也可以使用其他创建客户端的选项（`ClientProxyFactory` 或 `@Client()`）。你可以在<a href="/microservices/basics#client">此处</a>阅读有关它们的信息。

#### 上下文

在更复杂的场景中，你可能需要访问有关传入请求的额外信息。使用 Redis 传输器时，你可以访问 `RedisContext` 对象。

```typescript
@@filename()
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: RedisContext) {
  console.log(`Channel: ${context.getChannel()}`);
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(`Channel: ${context.getChannel()}`);
}
```

> info **提示** `@Payload()`、`@Ctx()` 和 `RedisContext` 是从 `@nestjs/microservices` 包中导入的。

#### 通配符

要启用通配符支持，将 `wildcards` 选项设置为 `true`。这会指示传输器在底层使用 `psubscribe` 和 `pmessage`。

```typescript
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.REDIS,
  options: {
    // 其他选项
    wildcards: true,
  },
});
```

确保在创建客户端实例时也传递 `wildcards` 选项。

启用此选项后，你可以在消息和事件模式中使用通配符。例如，要订阅所有以 `notifications` 开头的通道，可以使用以下模式：

```typescript
@EventPattern('notifications.*')
```

#### 实例状态更新

要获取底层驱动实例的连接和状态的实时更新，你可以订阅 `status` 流。此流提供特定于所选驱动程序的状态更新。对于 Redis 驱动程序，`status` 流会发出 `connected`、`disconnected` 和 `reconnecting` 事件。

```typescript
this.client.status.subscribe((status: RedisStatus) => {
  console.log(status);
});
```

> info **提示** `RedisStatus` 类型是从 `@nestjs/microservices` 包中导入的。

类似地，你可以订阅服务器的 `status` 流以接收有关服务器状态的通知。

```typescript
const server = app.connectMicroservice<MicroserviceOptions>(...);
server.status.subscribe((status: RedisStatus) => {
  console.log(status);
});
```

#### 监听 Redis 事件

在某些情况下，你可能需要监听微服务发出的内部事件。例如，你可以监听 `error` 事件以便在发生错误时触发其他操作。为此，请使用 `on()` 方法，如下所示：

```typescript
this.client.on('error', (err) => {
  console.error(err);
});
```

类似地，你可以监听服务器的内部事件：

```typescript
server.on<RedisEvents>('error', (err) => {
  console.error(err);
});
```

> info **提示** `RedisEvents` 类型是从 `@nestjs/microservices` 包中导入的。

#### 底层驱动访问

对于更高级的用例，你可能需要访问底层驱动实例。这对于手动关闭连接或使用驱动程序特定方法等场景非常有用。但是，请记住，在大多数情况下，你**不需要**直接访问驱动程序。

为此，你可以使用 `unwrap()` 方法，该方法返回底层驱动实例。泛型类型参数应指定你期望的驱动实例类型。

```typescript
const [pub, sub] =
  this.client.unwrap<[import('ioredis').Redis, import('ioredis').Redis]>();
```

类似地，你可以访问服务器的底层驱动实例：

```typescript
const [pub, sub] =
  server.unwrap<[import('ioredis').Redis, import('ioredis').Redis]>();
```

请注意，与其他传输器不同，Redis 传输器返回两个 `ioredis` 实例的元组：第一个用于发布消息，第二个用于订阅消息。
