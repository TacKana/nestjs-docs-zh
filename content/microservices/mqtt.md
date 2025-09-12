### MQTT

[MQTT](https://mqtt.org/)（消息队列遥测传输）是一种开源的轻量级消息传输协议，专为低延迟场景优化。该协议采用**发布/订阅**模式，提供了可扩展且经济高效的设备连接方案。基于 MQTT 构建的通信系统由发布服务器、代理服务器（broker）及一个或多个客户端组成，特别适用于资源受限设备以及低带宽、高延迟或不稳定的网络环境。

#### 安装

要开始构建基于 MQTT 的微服务，首先需安装以下依赖包：

```bash
$ npm i --save mqtt
```

#### 概述

使用 MQTT 传输器时，需将以下配置对象传入 `createMicroservice()` 方法：

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.MQTT,
  options: {
    url: 'mqtt://localhost:1883',
  },
});
@@switch
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.MQTT,
  options: {
    url: 'mqtt://localhost:1883',
  },
});
```

> info **提示** `Transport` 枚举从 `@nestjs/microservices` 包导入。

#### 配置选项

`options` 对象的配置项与所选传输器紧密相关。<strong>MQTT</strong> 传输器支持的属性详见[此处](https://github.com/mqttjs/MQTT.js/#mqttclientstreambuilder-options)。

#### 客户端

与其他微服务传输器类似，创建 MQTT `ClientProxy` 实例有<a href="/microservices/basics#client">多种方式</a>。

其中一种方式是使用 `ClientsModule`。通过 `ClientsModule` 创建客户端实例时，需导入该模块并调用 `register()` 方法，传入的配置对象需包含与 `createMicroservice()` 方法中相同的属性，同时需指定用作注入令牌的 `name` 属性。了解更多关于 `ClientsModule` 的内容请参见<a href="/microservices/basics#client">此处</a>。

```typescript
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_SERVICE',
        transport: Transport.MQTT,
        options: {
          url: 'mqtt://localhost:1883',
        }
      },
    ]),
  ]
  ...
})
```

亦可使用其他创建客户端的方法（如 `ClientProxyFactory` 或 `@Client()`），详情请参阅<a href="/microservices/basics#client">此处</a>。

#### 上下文

在更复杂的场景中，可能需要访问请求的附加信息。使用 MQTT 传输器时，可通过 `MqttContext` 对象获取这些信息。

```typescript
@@filename()
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: MqttContext) {
  console.log(`主题: ${context.getTopic()}`);
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(`主题: ${context.getTopic()}`);
}
```

> info **提示** `@Payload()`、`@Ctx()` 和 `MqttContext` 均从 `@nestjs/microservices` 包导入。

要访问原始的 MQTT [数据包](https://github.com/mqttjs/mqtt-packet)，可使用 `MqttContext` 对象的 `getPacket()` 方法，如下所示：

```typescript
@@filename()
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: MqttContext) {
  console.log(context.getPacket());
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(context.getPacket());
}
```

#### 通配符

订阅可以是针对特定主题，也可以包含通配符。可用通配符有两种：`+` 和 `#`。`+` 是单级通配符，而 `#` 是多级通配符，可匹配多个主题层级。

```typescript
@@filename()
@MessagePattern('sensors/+/temperature/+')
getTemperature(@Ctx() context: MqttContext) {
  console.log(`主题: ${context.getTopic()}`);
}
@@switch
@Bind(Ctx())
@MessagePattern('sensors/+/temperature/+')
getTemperature(context) {
  console.log(`主题: ${context.getTopic()}`);
}
```

#### 服务质量（QoS）

通过 `@MessagePattern` 或 `@EventPattern` 装饰器创建的任何订阅默认使用 QoS 0。若需更高等级的 QoS，可在建立连接时通过 `subscribeOptions` 块进行全局设置，如下所示：

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.MQTT,
  options: {
    url: 'mqtt://localhost:1883',
    subscribeOptions: {
      qos: 2
    },
  },
});
@@switch
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.MQTT,
  options: {
    url: 'mqtt://localhost:1883',
    subscribeOptions: {
      qos: 2
    },
  },
});
```

如需针对特定主题设置 QoS，可考虑创建[自定义传输器](/microservices/custom-transport)。

#### 记录构建器

要配置消息选项（调整 QoS 级别、设置 Retain 或 DUP 标志，或向负载添加额外属性），可使用 `MqttRecordBuilder` 类。例如，要将 `QoS` 设置为 `2`，可使用 `setQoS` 方法，如下所示：

```typescript
const userProperties = { 'x-version': '1.0.0' };
const record = new MqttRecordBuilder(':cat:')
  .setProperties({ userProperties })
  .setQoS(1)
  .build();
client.send('replace-emoji', record).subscribe(...);
```

> info **提示** `MqttRecordBuilder` 类从 `@nestjs/microservices` 包导出。

在服务端，同样可以通过访问 `MqttContext` 来读取这些选项。

```typescript
@@filename()
@MessagePattern('replace-emoji')
replaceEmoji(@Payload() data: string, @Ctx() context: MqttContext): string {
  const { properties: { userProperties } } = context.getPacket();
  return userProperties['x-version'] === '1.0.0' ? '🐱' : '🐈';
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('replace-emoji')
replaceEmoji(data, context) {
  const { properties: { userProperties } } = context.getPacket();
  return userProperties['x-version'] === '1.0.0' ? '🐱' : '🐈';
}
```

某些情况下，可能需要为多个请求配置用户属性，可将这些选项传递给 `ClientProxyFactory`。

```typescript
import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Module({
  providers: [
    {
      provide: 'API_v1',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.MQTT,
          options: {
            url: 'mqtt://localhost:1833',
            userProperties: { 'x-version': '1.0.0' },
          },
        }),
    },
  ],
})
export class ApiModule {}
```

#### 实例状态更新

要获取连接及底层驱动程序实例状态的实时更新，可订阅 `status` 流。此流提供特定于所选驱动程序的状态更新。对于 MQTT 驱动程序，`status` 流会发出 `connected`、`disconnected`、`reconnecting` 和 `closed` 事件。

```typescript
this.client.status.subscribe((status: MqttStatus) => {
  console.log(status);
});
```

> info **提示** `MqttStatus` 类型从 `@nestjs/microservices` 包导入。

同样，可订阅服务器的 `status` 流以接收服务器状态通知。

```typescript
const server = app.connectMicroservice<MicroserviceOptions>(...);
server.status.subscribe((status: MqttStatus) => {
  console.log(status);
});
```

#### 监听 MQTT 事件

某些情况下，可能需要监听微服务发出的内部事件。例如，可监听 `error` 事件以便在错误发生时触发额外操作。为此，可使用 `on()` 方法，如下所示：

```typescript
this.client.on('error', (err) => {
  console.error(err);
});
```

同样，可监听服务器的内部事件：

```typescript
server.on<MqttEvents>('error', (err) => {
  console.error(err);
});
```

> info **提示** `MqttEvents` 类型从 `@nestjs/microservices` 包导入。

#### 底层驱动程序访问

对于更高级的用例，可能需要访问底层驱动程序实例。这在手动关闭连接或使用驱动程序特定方法时非常有用。但请注意，在大多数情况下，**无需**直接访问驱动程序。

可通过 `unwrap()` 方法获取底层驱动程序实例，泛型参数应指定预期的驱动程序实例类型。

```typescript
const mqttClient = this.client.unwrap<import('mqtt').MqttClient>();
```

同样，可访问服务器的底层驱动程序实例：

```typescript
const mqttClient = server.unwrap<import('mqtt').MqttClient>();
```
