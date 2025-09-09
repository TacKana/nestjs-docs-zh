### 概述

除了传统的（有时称为单体式）应用架构，Nest 原生支持微服务架构风格的开发。本文档中讨论的大多数概念，如依赖注入、装饰器、异常过滤器、管道、守卫和拦截器，同样适用于微服务。只要可能，Nest 会抽象实现细节，使得相同的组件可以跨基于 HTTP 的平台、WebSocket 和微服务运行。本节涵盖 Nest 中特定于微服务的方面。

在 Nest 中，微服务本质上是一个使用不同于 HTTP 的**传输**层的应用。

<figure><img class="illustrative-image" src="/assets/Microservices_1.png" /></figure>

Nest 支持多种内置的传输层实现，称为**传输器**，负责在不同微服务实例之间传输消息。大多数传输器原生支持**请求-响应**和**基于事件**的消息风格。Nest 在规范接口后抽象了每个传输器的实现细节，用于请求-响应和基于事件的消息传递。这使得可以轻松切换传输层——例如利用特定传输层的可靠性或性能特性——而不会影响应用代码。

#### 安装

要开始构建微服务，首先安装所需包：

```bash
$ npm i --save @nestjs/microservices
```

#### 快速开始

要实例化微服务，使用 `NestFactory` 类的 `createMicroservice()` 方法：

```typescript
@@filename(main)
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
    },
  );
  await app.listen();
}
bootstrap();
@@switch
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.TCP,
  });
  await app.listen();
}
bootstrap();
```

> info **提示** 微服务默认使用 **TCP** 传输层。

`createMicroservice()` 方法的第二个参数是一个 `options` 对象。该对象可以包含两个成员：

<table>
  <tr>
    <td><code>transport</code></td>
    <td>指定传输器（例如，<code>Transport.NATS</code>）</td>
  </tr>
  <tr>
    <td><code>options</code></td>
    <td>传输器特定的选项对象，用于确定传输器行为</td>
  </tr>
</table>
<p>
  <code>options</code> 对象特定于所选传输器。<strong>TCP</strong> 传输器暴露的属性如下所述。对于其他传输器（如 Redis、MQTT 等），请参阅相关章节以了解可用选项的描述。
</p>
<table>
  <tr>
    <td><code>host</code></td>
    <td>连接主机名</td>
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
    <td><code>serializer</code></td>
    <td>用于传出消息的自定义 <a href="https://github.com/nestjs/nest/blob/master/packages/microservices/interfaces/serializer.interface.ts" target="_blank">序列化器</a></td>
  </tr>
  <tr>
    <td><code>deserializer</code></td>
    <td>用于传入消息的自定义 <a href="https://github.com/nestjs/nest/blob/master/packages/microservices/interfaces/deserializer.interface.ts" target="_blank">反序列化器</a></td>
  </tr>
  <tr>
    <td><code>socketClass</code></td>
    <td>扩展 <code>TcpSocket</code> 的自定义 Socket（默认：<code>JsonSocket</code>）</td>
  </tr>
  <tr>
    <td><code>tlsOptions</code></td>
    <td>配置 tls 协议的选项</td>
  </tr>
</table>

> info **提示** 上述属性特定于 TCP 传输器。有关其他传输器可用选项的信息，请参阅相关章节。

#### 消息和事件模式

微服务通过**模式**识别消息和事件。模式是一个普通值，例如字面对象或字符串。模式会自动序列化并与消息的数据部分一起通过网络发送。这样，消息发送者和消费者可以协调哪些请求由哪些处理程序消费。

#### 请求-响应

当您需要在各种外部服务之间**交换**消息时，请求-响应消息风格非常有用。这种范式确保服务实际接收到消息（无需手动实现确认协议）。然而，请求-响应方法并非总是最佳选择。例如，流式传输器，如 [Kafka](https://docs.confluent.io/3.0.0/streams/) 或 [NATS streaming](https://github.com/nats-io/node-nats-streaming)，使用基于日志的持久化，针对解决不同挑战集进行了优化，更符合事件消息范式（更多详情请参阅[基于事件的消息传递](https://docs.nestjs.com/microservices/basics#event-based)）。

要启用请求-响应消息类型，Nest 创建两个逻辑通道：一个用于传输数据，另一个用于等待传入响应。对于某些底层传输，如 [NATS](https://nats.io/)，这种双通道支持是开箱即用的。对于其他传输器，Nest 通过手动创建单独通道来补偿。虽然这很有效，但可能会引入一些开销。因此，如果您不需要请求-响应消息风格，可以考虑使用基于事件的方法。

要创建基于请求-响应范式的消息处理程序，请使用从 `@nestjs/microservices` 包导入的 `@MessagePattern()` 装饰器。此装饰器应仅在[控制器](https://docs.nestjs.com/controllers)类中使用，因为它们作为应用的入口点。在提供者中使用它将无效，因为它们会被 Nest 运行时忽略。

```typescript
@@filename(math.controller)
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class MathController {
  @MessagePattern({ cmd: 'sum' })
  accumulate(data: number[]): number {
    return (data || []).reduce((a, b) => a + b);
  }
}
@@switch
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class MathController {
  @MessagePattern({ cmd: 'sum' })
  accumulate(data) {
    return (data || []).reduce((a, b) => a + b);
  }
}
```

在上面的代码中，`accumulate()` **消息处理程序** 监听与 `{{ '{' }} cmd: 'sum' {{ '}' }}` 消息模式匹配的消息。消息处理程序接受一个参数，即从客户端传递的 `data`。在这种情况下，数据是需要累加的数字数组。

#### 异步响应

消息处理程序可以同步或**异步**响应，这意味着支持 `async` 方法。

```typescript
@@filename()
@MessagePattern({ cmd: 'sum' })
async accumulate(data: number[]): Promise<number> {
  return (data || []).reduce((a, b) => a + b);
}
@@switch
@MessagePattern({ cmd: 'sum' })
async accumulate(data) {
  return (data || []).reduce((a, b) => a + b);
}
```

消息处理程序也可以返回一个 `Observable`，在这种情况下，结果值将在流完成之前发出。

```typescript
@@filename()
@MessagePattern({ cmd: 'sum' })
accumulate(data: number[]): Observable<number> {
  return from([1, 2, 3]);
}
@@switch
@MessagePattern({ cmd: 'sum' })
accumulate(data: number[]): Observable<number> {
  return from([1, 2, 3]);
}
```

在上面的示例中，消息处理程序将响应**三次**，每次对应数组中的一个项目。

#### 基于事件

虽然请求-响应方法非常适合在服务之间交换消息，但它不太适合基于事件的消息传递——当您只想发布**事件**而不等待响应时。在这种情况下，维护两个通道用于请求-响应的开销是不必要的。

例如，如果您想通知另一个服务系统中此部分发生了特定条件，基于事件的消息风格是理想的选择。

要创建事件处理程序，您可以使用从 `@nestjs/microservices` 包导入的 `@EventPattern()` 装饰器。

```typescript
@@filename()
@EventPattern('user_created')
async handleUserCreated(data: Record<string, unknown>) {
  // 业务逻辑
}
@@switch
@EventPattern('user_created')
async handleUserCreated(data) {
  // 业务逻辑
}
```

> info **提示** 您可以为**单个**事件模式注册多个事件处理程序，所有处理程序都将自动并行触发。

`handleUserCreated()` **事件处理程序** 监听 `'user_created'` 事件。事件处理程序接受一个参数，即从客户端传递的 `data`（在这种情况下，是通过网络发送的事件负载）。

<app-banner-enterprise></app-banner-enterprise>

#### 附加请求详情

在更高级的场景中，您可能需要访问有关传入请求的附加详细信息。例如，当使用带有通配符订阅的 NATS 时，您可能希望检索生产者发送消息的原始主题。同样，使用 Kafka 时，您可能需要访问消息头。为此，您可以利用内置装饰器，如下所示：

```typescript
@@filename()
@MessagePattern('time.us.*')
getDate(@Payload() data: number[], @Ctx() context: NatsContext) {
  console.log(`Subject: ${context.getSubject()}`); // 例如 "time.us.east"
  return new Date().toLocaleTimeString(...);
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('time.us.*')
getDate(data, context) {
  console.log(`Subject: ${context.getSubject()}`); // 例如 "time.us.east"
  return new Date().toLocaleTimeString(...);
}
```

> info **提示** `@Payload()`、`@Ctx()` 和 `NatsContext` 从 `@nestjs/microservices` 导入。

> info **提示** 您还可以将属性键传递给 `@Payload()` 装饰器，以从传入负载对象中提取特定属性，例如 `@Payload('id')`。

#### 客户端（生产者类）

客户端 Nest 应用可以使用 `ClientProxy` 类与 Nest 微服务交换消息或发布事件。此类提供了几种方法，例如 `send()`（用于请求-响应消息传递）和 `emit()`（用于事件驱动消息传递），从而能够与远程微服务通信。您可以通过以下方式获取此类的实例：

一种方法是导入 `ClientsModule`，它暴露了静态 `register()` 方法。此方法接受一个表示微服务传输器的对象数组。每个对象必须包含一个 `name` 属性，以及可选的 `transport` 属性（默认为 `Transport.TCP`），以及一个可选的 `options` 属性。

`name` 属性充当**注入令牌**，您可以在需要注入 `ClientProxy` 实例的地方使用它。此 `name` 属性的值可以是任意字符串或 JavaScript 符号，如[此处](https://docs.nestjs.com/fundamentals/custom-providers#non-class-based-provider-tokens)所述。

`options` 属性是一个对象，包含我们之前在 `createMicroservice()` 方法中看到的相同属性。

```typescript
@Module({
  imports: [
    ClientsModule.register([
      { name: 'MATH_SERVICE', transport: Transport.TCP },
    ]),
  ],
})
```

或者，如果您需要在设置过程中提供配置或执行任何其他异步过程，可以使用 `registerAsync()` 方法。

```typescript
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: 'MATH_SERVICE',
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            url: configService.get('URL'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
})
```

一旦模块被导入，您可以使用 `@Inject()` 装饰器注入一个配置了 `'MATH_SERVICE'` 传输器指定选项的 `ClientProxy` 实例。

```typescript
constructor(
  @Inject('MATH_SERVICE') private client: ClientProxy,
) {}
```

> info **提示** `ClientsModule` 和 `ClientProxy` 类从 `@nestjs/microservices` 包导入。

有时，您可能需要从另一个服务（如 `ConfigService`）获取传输器配置，而不是在客户端应用中硬编码。为此，您可以使用 `ClientProxyFactory` 类注册一个[自定义提供者](/fundamentals/custom-providers)。此类提供了一个静态 `create()` 方法，该方法接受传输器选项对象并返回一个自定义的 `ClientProxy` 实例。

```typescript
@Module({
  providers: [
    {
      provide: 'MATH_SERVICE',
      useFactory: (configService: ConfigService) => {
        const mathSvcOptions = configService.getMathSvcOptions();
        return ClientProxyFactory.create(mathSvcOptions);
      },
      inject: [ConfigService],
    }
  ]
  ...
})
```

> info **提示** `ClientProxyFactory` 从 `@nestjs/microservices` 包导入。

另一个选项是使用 `@Client()` 属性装饰器。

```typescript
@Client({ transport: Transport.TCP })
client: ClientProxy;
```

> info **提示** `@Client()` 装饰器从 `@nestjs/microservices` 包导入。

使用 `@Client()` 装饰器不是首选技术，因为它更难测试且更难共享客户端实例。

`ClientProxy` 是**惰性**的。它不会立即启动连接。相反，它将在第一次微服务调用之前建立连接，然后在每次后续调用中重用。但是，如果您希望延迟应用引导过程直到建立连接，可以在 `OnApplicationBootstrap` 生命周期钩子中使用 `ClientProxy` 对象的 `connect()` 方法手动启动连接。

```typescript
@@filename()
async onApplicationBootstrap() {
  await this.client.connect();
}
@@switch
async onApplicationBootstrap() {
  await this.client.connect();
}
```

如果无法创建连接，`connect()` 方法将拒绝并返回相应的错误对象。

#### 发送消息

`ClientProxy` 暴露了一个 `send()` 方法。此方法旨在调用微服务并返回一个带有其响应的 `Observable`。因此，我们可以轻松订阅发出的值。

```typescript
@@filename()
accumulate(): Observable<number> {
  const pattern = { cmd: 'sum' };
  const payload = [1, 2, 3];
  return this.client.send<number>(pattern, payload);
}
@@switch
accumulate() {
  const pattern = { cmd: 'sum' };
  const payload = [1, 2, 3];
  return this.client.send(pattern, payload);
}
```

`send()` 方法接受两个参数，`pattern` 和 `payload`。`pattern` 应与 `@MessagePattern()` 装饰器中定义的模式匹配。`payload` 是我们想要传输到远程微服务的消息。此方法返回一个**冷 `Observable`**，这意味着您必须显式订阅它，消息才会发送。

#### 发布事件

要发送事件，请使用 `ClientProxy` 对象的 `emit()` 方法。此方法将事件发布到消息代理。

```typescript
@@filename()
async publish() {
  this.client.emit<number>('user_created', new UserCreatedEvent());
}
@@switch
async publish() {
  this.client.emit('user_created', new UserCreatedEvent());
}
```

`emit()` 方法接受两个参数：`pattern` 和 `payload`。`pattern` 应与 `@EventPattern()` 装饰器中定义的模式匹配，而 `payload` 表示您想要传输到远程微服务的事件数据。此方法返回一个**热 `Observable`**（与 `send()` 返回的冷 `Observable` 相反），这意味着无论您是否显式订阅 observable，代理都会立即尝试传递事件。

<app-banner-devtools></app-banner-devtools>

#### 请求范围

对于来自不同编程语言背景的人来说，可能会惊讶地发现，在 Nest 中，大多数内容在传入请求之间是共享的。这包括到数据库的连接池、具有全局状态的单例服务等。请记住，Node.js 不遵循请求/响应多线程无状态模型，其中每个请求由单独线程处理。因此，使用单例实例对我们的应用是**安全**的。

但是，存在一些边缘情况，其中处理程序的基于请求的生命周期可能是可取的。这可能包括 GraphQL 应用中的每请求缓存、请求跟踪或多租户等场景。您可以在此处了解更多关于如何控制范围的信息[/fundamentals/injection-scopes]。

请求范围的处理程序和提供者可以使用 `@Inject()` 装饰器结合 `CONTEXT` 令牌注入 `RequestContext`：

```typescript
import { Injectable, Scope, Inject } from '@nestjs/common';
import { CONTEXT, RequestContext } from '@nestjs/microservices';

@Injectable({ scope: Scope.REQUEST })
export class CatsService {
  constructor(@Inject(CONTEXT) private ctx: RequestContext) {}
}
```

这提供了对 `RequestContext` 对象的访问，该对象有两个属性：

```typescript
export interface RequestContext<T = any> {
  pattern: string | Record<string, any>;
  data: T;
}
```

`data` 属性是由消息生产者发送的消息负载。`pattern` 属性是用于识别适当处理程序来处理传入消息的模式。

#### 实例状态更新

要获取关于连接和底层驱动实例状态的实时更新，您可以订阅 `status` 流。此流提供特定于所选驱动器的状态更新。例如，如果您使用 TCP 传输器（默认），`status` 流会发出 `connected` 和 `disconnected` 事件。

```typescript
this.client.status.subscribe((status: TcpStatus) => {
  console.log(status);
});
```

> info **提示** `TcpStatus` 类型从 `@nestjs/microservices` 包导入。

同样，您可以订阅服务器的 `status` 流以接收有关服务器状态的通知。

```typescript
const server = app.connectMicroservice<MicroserviceOptions>(...);
server.status.subscribe((status: TcpStatus) => {
  console.log(status);
});
```

#### 监听内部事件

在某些情况下，您可能希望监听微服务发出的内部事件。例如，您可以监听 `error` 事件以在发生错误时触发额外操作。为此，请使用 `on()` 方法，如下所示：

```typescript
this.client.on('error', (err) => {
  console.error(err);
});
```

同样，您可以监听服务器的内部事件：

```typescript
server.on<TcpEvents>('error', (err) => {
  console.error(err);
});
```

> info **提示** `TcpEvents` 类型从 `@nestjs/microservices` 包导入。

#### 底层驱动器访问

对于更高级的用例，您可能需要访问底层驱动器实例。这对于手动关闭连接或使用驱动器特定方法等场景非常有用。但是，请记住，在大多数情况下，您**不需要**直接访问驱动器。

为此，您可以使用 `unwrap()` 方法，该方法返回底层驱动器实例。泛型类型参数应指定您期望的驱动器实例类型。

```typescript
const netServer = this.client.unwrap<Server>();
```

这里，`Server` 是从 `net` 模块导入的类型。

同样，您可以访问服务器的底层驱动器实例：

```typescript
const netServer = server.unwrap<Server>();
```

#### 处理超时

在分布式系统中，微服务有时可能会宕机或不可用。为了防止无限期等待，您可以使用超时。当与其他服务通信时，超时是一种非常有用的模式。要将超时应用于您的微服务调用，您可以使用 [RxJS](https://rxjs.dev) `timeout` 操作符。如果微服务在指定时间内没有响应，将抛出异常，您可以捕获并适当处理。

要实现这一点，您需要使用 [`rxjs`](https://github.com/ReactiveX/rxjs) 包。只需在管道中使用 `timeout` 操作符：

```typescript
@@filename()
this.client
  .send<TResult, TInput>(pattern, data)
  .pipe(timeout(5000));
@@switch
this.client
  .send(pattern, data)
  .pipe(timeout(5000));
```

> info **提示** `timeout` 操作符从 `rxjs/operators` 包导入。

5 秒后，如果微服务没有响应，它将抛出错误。

#### TLS 支持

在私有网络外部通信时，加密流量以确保安全非常重要。在 NestJS 中，这可以通过使用 Node 内置的 [TLS](https://nodejs.org/api/tls.html) 模块通过 TCP 上的 TLS 实现。Nest 在其 TCP 传输中内置了对 TLS 的支持，允许我们加密微服务或客户端之间的通信。

要为 TCP 服务器启用 TLS，您需要 PEM 格式的私钥和证书。通过设置 `tlsOptions` 并指定 key 和 cert 文件，将这些添加到服务器的选项中，如下所示：

```typescript
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const key = fs.readFileSync('<pathToKeyFile>', 'utf8').toString();
  const cert = fs.readFileSync('<pathToCertFile>', 'utf8').toString();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        tlsOptions: {
          key,
          cert,
        },
      },
    },
  );

  await app.listen();
}
bootstrap();
```

对于要通过 TLS 安全通信的客户端，我们也定义 `tlsOptions` 对象，但这次使用 CA 证书。这是签署服务器证书的机构的证书。这确保客户端信任服务器的证书并可以建立安全连接。

```typescript
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_SERVICE',
        transport: Transport.TCP,
        options: {
          tlsOptions: {
            ca: [fs.readFileSync('<pathToCaFile>', 'utf-8').toString()],
          },
        },
      },
    ]),
  ],
})
export class AppModule {}
```

如果您的设置涉及多个受信任的机构，您还可以传递一个 CA 数组。

一旦一切设置完成，您可以使用 `@Inject()` 装饰器照常注入 `ClientProxy` 以在您的服务中使用客户端。这确保了跨您的 NestJS 微服务的加密通信，Node 的 `TLS` 模块处理加密细节。

有关更多信息，请参阅 Node 的 [TLS 文档](https://nodejs.org/api/tls.html)。

#### 动态配置

当微服务需要使用 `ConfigService`（来自 `@nestjs/config` 包）进行配置，但注入上下文仅在微服务实例创建后才可用时，`AsyncMicroserviceOptions` 提供了解决方案。这种方法允许动态配置，确保与 `ConfigService` 的平滑集成。

```typescript
import { ConfigService } from '@nestjs/config';
import { AsyncMicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<AsyncMicroserviceOptions>(
    AppModule,
    {
      useFactory: (configService: ConfigService) => ({
        transport: Transport.TCP,
        options: {
          host: configService.get<string>('HOST'),
          port: configService.get<number>('PORT'),
        },
      }),
      inject: [ConfigService],
    },
  );

  await app.listen();
}
bootstrap();
```