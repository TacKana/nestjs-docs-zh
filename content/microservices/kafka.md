### Kafka

[Kafka](https://kafka.apache.org/) 是一个开源的分布式流处理平台，具备三大核心能力：

- 发布和订阅记录流，类似于消息队列或企业消息系统
- 以容错持久化的方式存储记录流
- 在记录流发生时进行实时处理

Kafka 项目旨在为处理实时数据流提供一个统一的高吞吐量、低延迟平台。它能与 Apache Storm 和 Spark 完美集成，实现实时流数据分析。

#### 安装

要开始构建基于 Kafka 的微服务，首先安装所需包：

```bash
$ npm i --save kafkajs
```

#### 概述

与其他 Nest 微服务传输层实现类似，您可以通过传递给 `createMicroservice()` 方法的选项对象的 `transport` 属性来选择 Kafka 传输机制，并可选地提供 `options` 属性，如下所示：

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.KAFKA,
  options: {
    client: {
      brokers: ['localhost:9092'],
    }
  }
});
@@switch
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.KAFKA,
  options: {
    client: {
      brokers: ['localhost:9092'],
    }
  }
});
```

> info **提示** `Transport` 枚举从 `@nestjs/microservices` 包导入。

#### 选项

`options` 属性特定于所选传输器。<strong>Kafka</strong> 传输器暴露的属性如下所述。

<table>
  <tr>
    <td><code>client</code></td>
    <td>客户端配置选项（详见
      <a
        href="https://kafka.js.org/docs/configuration"
        rel="nofollow"
        target="blank"
        >此处</a
      >）</td>
  </tr>
  <tr>
    <td><code>consumer</code></td>
    <td>消费者配置选项（详见
      <a
        href="https://kafka.js.org/docs/consuming#a-name-options-a-options"
        rel="nofollow"
        target="blank"
        >此处</a
      >）</td>
  </tr>
  <tr>
    <td><code>run</code></td>
    <td>运行配置选项（详见
      <a
        href="https://kafka.js.org/docs/consuming"
        rel="nofollow"
        target="blank"
        >此处</a
      >）</td>
  </tr>
  <tr>
    <td><code>subscribe</code></td>
    <td>订阅配置选项（详见
      <a
        href="https://kafka.js.org/docs/consuming#frombeginning"
        rel="nofollow"
        target="blank"
        >此处</a
      >）</td>
  </tr>
  <tr>
    <td><code>producer</code></td>
    <td>生产者配置选项（详见
      <a
        href="https://kafka.js.org/docs/producing#options"
        rel="nofollow"
        target="blank"
        >此处</a
      >）</td>
  </tr>
  <tr>
    <td><code>send</code></td>
    <td>发送配置选项（详见
      <a
        href="https://kafka.js.org/docs/producing#options"
        rel="nofollow"
        target="blank"
        >此处</a
      >）</td>
  </tr>
  <tr>
    <td><code>producerOnlyMode</code></td>
    <td>功能标志，用于跳过消费者组注册，仅作为生产者运行（<code>boolean</code>）</td>
  </tr>
  <tr>
    <td><code>postfixId</code></td>
    <td>更改 clientId 值的后缀（<code>string</code>）</td>
  </tr>
</table>

#### 客户端

Kafka 与其他微服务传输器有一个小区别。我们不使用 `ClientProxy` 类，而是使用 `ClientKafkaProxy` 类。

与其他微服务传输器类似，您有<a href="/microservices/basics#client">几种选项</a>来创建 `ClientKafkaProxy` 实例。

一种创建实例的方法是使用 `ClientsModule`。要使用 `ClientsModule` 创建客户端实例，请导入它并使用 `register()` 方法传递一个选项对象，该对象具有上述 `createMicroservice()` 方法中显示的相同属性，以及一个用作注入令牌的 `name` 属性。有关 `ClientsModule` 的更多信息，请阅读<a href="/microservices/basics#client">此处</a>。

```typescript
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'HERO_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'hero',
            brokers: ['localhost:9092'],
          },
          consumer: {
            groupId: 'hero-consumer'
          }
        }
      },
    ]),
  ]
  ...
})
```

也可以使用其他创建客户端的方法（`ClientProxyFactory` 或 `@Client()`）。您可以在<a href="/microservices/basics#client">此处</a>了解它们。

使用 `@Client()` 装饰器如下：

```typescript
@Client({
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: 'hero',
      brokers: ['localhost:9092'],
    },
    consumer: {
      groupId: 'hero-consumer'
    }
  }
})
client: ClientKafkaProxy;
```

#### 消息模式

Kafka 微服务消息模式使用两个主题分别用于请求和回复通道。`ClientKafkaProxy.send()` 方法通过将[关联 ID](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CorrelationIdentifier.html)、回复主题和回复分区与请求消息关联来发送带有[返回地址](https://www.enterpriseintegrationpatterns.com/patterns/messaging/ReturnAddress.html)的消息。这要求 `ClientKafkaProxy` 实例在发送消息之前订阅回复主题并分配到至少一个分区。

因此，您需要为每个运行的 Nest 应用程序至少有一个回复主题分区。例如，如果您运行 4 个 Nest 应用程序，但回复主题只有 3 个分区，那么其中 1 个 Nest 应用程序在尝试发送消息时会出错。

当新的 `ClientKafkaProxy` 实例启动时，它们会加入消费者组并订阅各自的主题。此过程会触发对分配给消费者组消费者的主题分区进行重新平衡。

通常，主题分区使用轮询分区器分配，该分区器将主题分区分配给按消费者名称排序的消费者集合，消费者名称在应用程序启动时随机设置。然而，当新消费者加入消费者组时，新消费者可以位于消费者集合中的任何位置。这会导致现有消费者在重新平衡后被分配到不同的分区，如果现有消费者位于新消费者之后。因此，被分配到不同分区的消费者将丢失重新平衡前发送的请求的响应消息。

为了防止 `ClientKafkaProxy` 消费者丢失响应消息，使用了 Nest 特定的内置自定义分区器。此自定义分区器将分区分配给按应用程序启动时设置的高分辨率时间戳（`process.hrtime()`）排序的消费者集合。

#### 消息响应订阅

> warning **注意** 本节仅在使用[请求-响应](/microservices/basics#request-response)消息样式（使用 `@MessagePattern` 装饰器和 `ClientKafkaProxy.send` 方法）时相关。对于[基于事件](/microservices/basics#event-based)的通信（`@EventPattern` 装饰器和 `ClientKafkaProxy.emit` 方法），不需要订阅响应主题。

`ClientKafkaProxy` 类提供了 `subscribeToResponseOf()` 方法。`subscribeToResponseOf()` 方法以请求的主题名称作为参数，并将派生的回复主题名称添加到回复主题集合中。在实现消息模式时，此方法是必需的。

```typescript
@@filename(heroes.controller)
onModuleInit() {
  this.client.subscribeToResponseOf('hero.kill.dragon');
}
```

如果 `ClientKafkaProxy` 实例是异步创建的，则必须在调用 `connect()` 方法之前调用 `subscribeToResponseOf()` 方法。

```typescript
@@filename(heroes.controller)
async onModuleInit() {
  this.client.subscribeToResponseOf('hero.kill.dragon');
  await this.client.connect();
}
```

#### 传入

Nest 将传入的 Kafka 消息作为具有 `key`、`value` 和 `headers` 属性的对象接收，这些属性的值类型为 `Buffer`。然后，Nest 通过将这些缓冲区转换为字符串来解析这些值。如果字符串是“类对象”，Nest 会尝试将字符串解析为 `JSON`。然后，`value` 被传递给其关联的处理程序。

#### 传出

Nest 在发布事件或发送消息时，通过序列化过程发送传出的 Kafka 消息。这发生在传递给 `ClientKafkaProxy` 的 `emit()` 和 `send()` 方法的参数上，或发生在从 `@MessagePattern` 方法返回的值上。此序列化通过使用 `JSON.stringify()` 或 `toString()` 原型方法将不是字符串或缓冲区的对象“字符串化”。

```typescript
@@filename(heroes.controller)
@Controller()
export class HeroesController {
  @MessagePattern('hero.kill.dragon')
  killDragon(@Payload() message: KillDragonMessage): any {
    const dragonId = message.dragonId;
    const items = [
      { id: 1, name: 'Mythical Sword' },
      { id: 2, name: 'Key to Dungeon' },
    ];
    return items;
  }
}
```

> info **提示** `@Payload()` 从 `@nestjs/microservices` 包导入。

传出消息也可以通过传递具有 `key` 和 `value` 属性的对象来进行键控。对消息进行键控对于满足[共同分区要求](https://docs.confluent.io/current/ksql/docs/developer-guide/partition-data.html#co-partitioning-requirements)非常重要。

```typescript
@@filename(heroes.controller)
@Controller()
export class HeroesController {
  @MessagePattern('hero.kill.dragon')
  killDragon(@Payload() message: KillDragonMessage): any {
    const realm = 'Nest';
    const heroId = message.heroId;
    const dragonId = message.dragonId;

    const items = [
      { id: 1, name: 'Mythical Sword' },
      { id: 2, name: 'Key to Dungeon' },
    ];

    return {
      headers: {
        realm
      },
      key: heroId,
      value: items
    }
  }
}
```

此外，以此格式传递的消息还可以在 `headers` 哈希属性中包含自定义标头。标头哈希属性值必须为 `string` 或 `Buffer` 类型。

```typescript
@@filename(heroes.controller)
@Controller()
export class HeroesController {
  @MessagePattern('hero.kill.dragon')
  killDragon(@Payload() message: KillDragonMessage): any {
    const realm = 'Nest';
    const heroId = message.heroId;
    const dragonId = message.dragonId;

    const items = [
      { id: 1, name: 'Mythical Sword' },
      { id: 2, name: 'Key to Dungeon' },
    ];

    return {
      headers: {
        kafka_nestRealm: realm
      },
      key: heroId,
      value: items
    }
  }
}
```

#### 基于事件

虽然请求-响应方法非常适合在服务之间交换消息，但当您的消息样式是基于事件的（这反过来又非常适合 Kafka）时，它就不太合适了——当您只想发布事件**而不等待响应**时。在这种情况下，您不希望请求-响应所需的维护两个主题的开销。

查看以下两个部分以了解更多信息：[概述：基于事件](/microservices/basics#event-based)和[概述：发布事件](/microservices/basics#publishing-events)。

#### 上下文

在更复杂的场景中，您可能需要访问有关传入请求的附加信息。使用 Kafka 传输器时，您可以访问 `KafkaContext` 对象。

```typescript
@@filename()
@MessagePattern('hero.kill.dragon')
killDragon(@Payload() message: KillDragonMessage, @Ctx() context: KafkaContext) {
  console.log(`Topic: ${context.getTopic()}`);
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('hero.kill.dragon')
killDragon(message, context) {
  console.log(`Topic: ${context.getTopic()}`);
}
```

> info **提示** `@Payload()`、`@Ctx()` 和 `KafkaContext` 从 `@nestjs/microservices` 包导入。

要访问原始的 Kafka `IncomingMessage` 对象，请使用 `KafkaContext` 对象的 `getMessage()` 方法，如下所示：

```typescript
@@filename()
@MessagePattern('hero.kill.dragon')
killDragon(@Payload() message: KillDragonMessage, @Ctx() context: KafkaContext) {
  const originalMessage = context.getMessage();
  const partition = context.getPartition();
  const { headers, timestamp } = originalMessage;
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('hero.kill.dragon')
killDragon(message, context) {
  const originalMessage = context.getMessage();
  const partition = context.getPartition();
  const { headers, timestamp } = originalMessage;
}
```

其中 `IncomingMessage` 满足以下接口：

```typescript
interface IncomingMessage {
  topic: string;
  partition: number;
  timestamp: string;
  size: number;
  attributes: number;
  offset: string;
  key: any;
  value: any;
  headers: Record<string, any>;
}
```

如果您的处理程序涉及每个接收到的消息的处理时间较长，您应该考虑使用 `heartbeat` 回调。要检索 `heartbeat` 函数，请使用 `KafkaContext` 的 `getHeartbeat()` 方法，如下所示：

```typescript
@@filename()
@MessagePattern('hero.kill.dragon')
async killDragon(@Payload() message: KillDragonMessage, @Ctx() context: KafkaContext) {
  const heartbeat = context.getHeartbeat();

  // 执行一些慢速处理
  await doWorkPart1();

  // 发送心跳以避免超过会话超时时间
  await heartbeat();

  // 再次执行一些慢速处理
  await doWorkPart2();
}
```

#### 命名约定

Kafka 微服务组件将各自角色的描述附加到 `client.clientId` 和 `consumer.groupId` 选项上，以防止 Nest 微服务客户端和服务器组件之间的冲突。默认情况下，`ClientKafkaProxy` 组件将 `-client` 附加到这两个选项上，而 `ServerKafka` 组件将 `-server` 附加到这两个选项上。请注意下面提供的值如何以这种方式转换（如注释所示）。

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: 'hero', // hero-server
      brokers: ['localhost:9092'],
    },
    consumer: {
      groupId: 'hero-consumer' // hero-consumer-server
    },
  }
});
```

对于客户端：

```typescript
@@filename(heroes.controller)
@Client({
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: 'hero', // hero-client
      brokers: ['localhost:9092'],
    },
    consumer: {
      groupId: 'hero-consumer' // hero-consumer-client
    }
  }
})
client: ClientKafkaProxy;
```

> info **提示** Kafka 客户端和消费者命名约定可以通过在您自己的自定义提供程序中扩展 `ClientKafkaProxy` 和 `KafkaServer` 并覆盖构造函数来自定义。

由于 Kafka 微服务消息模式使用两个主题分别用于请求和回复通道，回复模式应从请求主题派生。默认情况下，回复主题的名称是请求主题名称加上 `.reply` 的组合。

```typescript
@@filename(heroes.controller)
onModuleInit() {
  this.client.subscribeToResponseOf('hero.get'); // hero.get.reply
}
```

> info **提示** Kafka 回复主题命名约定可以通过在您自己的自定义提供程序中扩展 `ClientKafkaProxy` 并覆盖 `getResponsePatternName` 方法来自定义。

#### 可重试异常

与其他传输器类似，所有未处理的异常都会自动包装到 `RpcException` 中并转换为“用户友好”的格式。但是，在某些边缘情况下，您可能希望绕过此机制，让异常由 `kafkajs` 驱动程序消费。在处理消息时抛出异常会指示 `kafkajs` **重试**它（重新传递它），这意味着即使消息（或事件）处理程序被触发，偏移量也不会提交到 Kafka。

> warning **警告** 对于事件处理程序（基于事件的通信），所有未处理的异常默认情况下被视为**可重试异常**。

为此，您可以使用一个名为 `KafkaRetriableException` 的专用类，如下所示：

```typescript
throw new KafkaRetriableException('...');
```

> info **提示** `KafkaRetriableException` 类从 `@nestjs/microservices` 包导出。

### 自定义异常处理

除了默认的错误处理机制外，您还可以为 Kafka 事件创建一个自定义异常过滤器来管理重试逻辑。例如，下面的示例演示了如何在可配置的重试次数后跳过有问题的事件：

```typescript
import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { KafkaContext } from '../ctx-host';

@Catch()
export class KafkaMaxRetryExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(KafkaMaxRetryExceptionFilter.name);

  constructor(
    private readonly maxRetries: number,
    // 可选的自定义函数，在超过最大重试次数时执行
    private readonly skipHandler?: (message: any) => Promise<void>,
  ) {
    super();
  }

  async catch(exception: unknown, host: ArgumentsHost) {
    const kafkaContext = host.switchToRpc().getContext<KafkaContext>();
    const message = kafkaContext.getMessage();
    const currentRetryCount = this.getRetryCountFromContext(kafkaContext);

    if (currentRetryCount >= this.maxRetries) {
      this.logger.warn(
        `消息的最大重试次数（${this.maxRetries}）已超出：${JSON.stringify(
          message,
        )}`,
      );

      if (this.skipHandler) {
        try {
          await this.skipHandler(message);
        } catch (err) {
          this.logger.error('skipHandler 中的错误：', err);
        }
      }

      try {
        await this.commitOffset(kafkaContext);
      } catch (commitError) {
        this.logger.error('提交偏移量失败：', commitError);
      }
      return; // 停止传播异常
    }

    // 如果重试次数低于最大值，继续使用默认的异常过滤器逻辑
    super.catch(exception, host);
  }

  private getRetryCountFromContext(context: KafkaContext): number {
    const headers = context.getMessage().headers || {};
    const retryHeader = headers['retryCount'] || headers['retry-count'];
    return retryHeader ? Number(retryHeader) : 0;
  }

  private async commitOffset(context: KafkaContext): Promise<void> {
    const consumer = context.getConsumer && context.getConsumer();
    if (!consumer) {
      throw new Error('KafkaContext 中无法获取消费者实例。');
    }

    const topic = context.getTopic && context.getTopic();
    const partition = context.getPartition && context.getPartition();
    const message = context.getMessage();
    const offset = message.offset;

    if (!topic || partition === undefined || offset === undefined) {
      throw new Error('用于提交偏移量的 Kafka 消息上下文不完整。');
    }

    await consumer.commitOffsets([
      {
        topic,
        partition,
        // 提交偏移量时，提交下一个数字（即当前偏移量 + 1）
        offset: (Number(offset) + 1).toString(),
      },
    ]);
  }
}
```

此过滤器提供了一种将 Kafka 事件处理重试最多可配置次数的方法。一旦达到最大重试次数，它会触发自定义的 `skipHandler`（如果提供）并提交偏移量，从而有效地跳过有问题的事件。这允许后续事件不受干扰地处理。

您可以通过将过滤器添加到事件处理程序来集成它：

```typescript
@UseFilters(new KafkaMaxRetryExceptionFilter(5))
export class MyEventHandler {
  @EventPattern('your-topic')
  async handleEvent(@Payload() data: any, @Ctx() context: KafkaContext) {
    // 您的事件处理逻辑...
  }
}
```

#### 提交偏移量

在使用 Kafka 时，提交偏移量至关重要。默认情况下，消息会在特定时间后自动提交。更多信息请访问 [KafkaJS 文档](https://kafka.js.org/docs/consuming#autocommit)。`KafkaContext` 提供了一种访问活动消费者以手动提交偏移量的方法。消费者是 KafkaJS 消费者，其工作方式与[原生 KafkaJS 实现](https://kafka.js.org/docs/consuming#manual-committing)相同。

```typescript
@@filename()
@EventPattern('user.created')
async handleUserCreated(@Payload() data: IncomingMessage, @Ctx() context: KafkaContext) {
  // 业务逻辑

  const { offset } = context.getMessage();
  const partition = context.getPartition();
  const topic = context.getTopic();
  const consumer = context.getConsumer();
  await consumer.commitOffsets([{ topic, partition, offset }])
}
@@switch
@Bind(Payload(), Ctx())
@EventPattern('user.created')
async handleUserCreated(data, context) {
  // 业务逻辑

  const { offset } = context.getMessage();
  const partition = context.getPartition();
  const topic = context.getTopic();
  const consumer = context.getConsumer();
  await consumer.commitOffsets([{ topic, partition, offset }])
}
```

要禁用消息的自动提交，请在 `run` 配置中设置 `autoCommit: false`，如下所示：

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.KAFKA,
  options: {
    client: {
      brokers: ['localhost:9092'],
    },
    run: {
      autoCommit: false
    }
  }
});
@@switch
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.KAFKA,
  options: {
    client: {
      brokers: ['localhost:9092'],
    },
    run: {
      autoCommit: false
    }
  }
});
```

#### 实例状态更新

要获取有关连接和底层驱动程序实例状态的实时更新，您可以订阅 `status` 流。此流提供特定于所选驱动程序的状态更新。对于 Kafka 驱动程序，`status` 流发出 `connected`、`disconnected`、`rebalancing`、`crashed` 和 `stopped` 事件。

```typescript
this.client.status.subscribe((status: KafkaStatus) => {
  console.log(status);
});
```

> info **提示** `KafkaStatus` 类型从 `@nestjs/microservices` 包导入。

类似地，您可以订阅服务器的 `status` 流以接收有关服务器状态的通知。

```typescript
const server = app.connectMicroservice<MicroserviceOptions>(...);
server.status.subscribe((status: KafkaStatus) => {
  console.log(status);
});
```

#### 底层生产者和消费者

对于更高级的用例，您可能需要访问底层的生产者和消费者实例。这对于手动关闭连接或使用驱动程序特定方法等场景非常有用。但是，请记住，在大多数情况下，您**不需要**直接访问驱动程序。

为此，您可以使用 `ClientKafkaProxy` 实例公开的 `producer` 和 `consumer` 获取器。

```typescript
const producer = this.client.producer;
const consumer = this.client.consumer;
```
