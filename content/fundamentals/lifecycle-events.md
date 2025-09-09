### 生命周期事件

Nest 应用及其所有组成元素都有一个由 Nest 管理的生命周期。Nest 提供了**生命周期钩子**，让开发者能够洞察关键的生命周期事件，并在这些事件发生时执行相应的操作（在模块、提供者或控制器上运行已注册的代码）。

#### 生命周期顺序

下图描绘了从应用启动到 Node 进程退出的关键应用生命周期事件序列。我们可以将整个生命周期划分为三个阶段：**初始化**、**运行**和**终止**。利用这个生命周期，你可以合理规划模块和服务的初始化，管理活动连接，并在应用收到终止信号时优雅地关闭。

<figure><img class="illustrative-image" src="/assets/lifecycle-events.png" /></figure>

#### 生命周期事件

生命周期事件发生在应用启动和关闭过程中。Nest 会在以下每个生命周期事件时调用模块、提供者和控制器上注册的生命周期钩子方法（**关闭钩子**需要先启用，如下文所述）。如上图所示，Nest 还会调用适当的底层方法来开始监听连接和停止监听连接。

在下表中，`onModuleInit` 和 `onApplicationBootstrap` 仅在显式调用 `app.init()` 或 `app.listen()` 时触发。

在下表中，`onModuleDestroy`、`beforeApplicationShutdown` 和 `onApplicationShutdown` 仅在显式调用 `app.close()` 或进程收到特殊系统信号（如 SIGTERM）且你在应用启动时正确调用了 `enableShutdownHooks` 时触发（参见下文**应用关闭**部分）。

| 生命周期钩子方法               | 触发钩子方法调用的生命周期事件                                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onModuleInit()`               | 在宿主模块的依赖项解析完成后调用一次。                                                                                                                                           |
| `onApplicationBootstrap()`     | 在所有模块初始化完成后、开始监听连接之前调用一次。                                                                                                                               |
| `onModuleDestroy()`\*          | 在收到终止信号（如 `SIGTERM`）后调用。                                                                                                                                           |
| `beforeApplicationShutdown()`\* | 在所有 `onModuleDestroy()` 处理程序完成（Promise 解析或拒绝）后调用；<br />完成后（Promise 解析或拒绝），所有现有连接将被关闭（调用 `app.close()`）。 |
| `onApplicationShutdown()`\*    | 在连接关闭后调用（`app.close()` 解析后）。                                                                                                                                       |

\* 对于这些事件，如果你没有显式调用 `app.close()`，则必须选择加入才能让它们与系统信号（如 `SIGTERM`）一起工作。请参阅下面的[应用关闭](fundamentals/lifecycle-events#application-shutdown)部分。

> warning **警告** 上述生命周期钩子不会在**请求作用域**的类中触发。请求作用域的类不与应用生命周期绑定，其生命周期是不可预测的。它们专门为每个请求创建，并在响应发送后自动进行垃圾回收。

> info **提示** `onModuleInit()` 和 `onApplicationBootstrap()` 的执行顺序直接取决于模块导入的顺序，会等待前一个钩子完成。

#### 使用方法

每个生命周期钩子都由一个接口表示。从技术上讲，接口是可选的，因为它们在 TypeScript 编译后不存在。尽管如此，使用它们仍然是一种好的做法，以便受益于强类型和编辑器工具。要注册生命周期钩子，请实现相应的接口。例如，要在特定类（如控制器、提供者或模块）上注册一个在模块初始化期间调用的方法，通过提供 `onModuleInit()` 方法来实现 `OnModuleInit` 接口，如下所示：

```typescript
@@filename()
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class UsersService implements OnModuleInit {
  onModuleInit() {
    console.log(`模块已初始化。`);
  }
}
@@switch
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  onModuleInit() {
    console.log(`模块已初始化。`);
  }
}
```

#### 异步初始化

`OnModuleInit` 和 `OnApplicationBootstrap` 钩子都允许你延迟应用初始化过程（返回一个 `Promise` 或将方法标记为 `async` 并在方法体中 `await` 异步方法的完成）。

```typescript
@@filename()
async onModuleInit(): Promise<void> {
  await this.fetch();
}
@@switch
async onModuleInit() {
  await this.fetch();
}
```

#### 应用关闭

`onModuleDestroy()`、`beforeApplicationShutdown()` 和 `onApplicationShutdown()` 钩子在终止阶段被调用（响应显式调用 `app.close()` 或收到系统信号如 SIGTERM，如果已选择加入）。此功能通常与 [Kubernetes](https://kubernetes.io/) 一起用于管理容器的生命周期，或由 [Heroku](https://www.heroku.com/) 用于 dynos 或类似服务。

关闭钩子监听器会消耗系统资源，因此默认情况下是禁用的。要使用关闭钩子，**必须通过调用 `enableShutdownHooks()` 来启用监听器**：

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 开始监听关闭钩子
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

> warning **警告** 由于固有的平台限制，NestJS 在 Windows 上对应用关闭钩子的支持有限。你可以预期 `SIGINT` 会工作，`SIGBREAK` 也会工作，并且在某种程度上 `SIGHUP` 也会工作 - [了解更多](https://nodejs.org/api/process.html#process_signal_events)。但是 `SIGTERM` 在 Windows 上永远不会工作，因为在任务管理器中终止进程是无条件的，“即应用程序无法检测或阻止它”。这里有一些来自 libuv 的[相关文档](https://docs.libuv.org/en/v1.x/signal.html)，可以了解更多关于 `SIGINT`、`SIGBREAK` 和其他信号在 Windows 上的处理方式。另请参阅 Node.js 文档中的[进程信号事件](https://nodejs.org/api/process.html#process_signal_events)

> info **信息** `enableShutdownHooks` 通过启动监听器来消耗内存。在单个 Node 进程中运行多个 Nest 应用的情况下（例如，使用 Jest 运行并行测试时），Node 可能会抱怨过多的监听器进程。因此，`enableShutdownHooks` 默认未启用。在单个 Node 进程中运行多个实例时，请注意此情况。

当应用收到终止信号时，它将调用任何已注册的 `onModuleDestroy()`、`beforeApplicationShutdown()`，然后是 `onApplicationShutdown()` 方法（按上述顺序），并将相应的信号作为第一个参数。如果注册的函数等待异步调用（返回 promise），Nest 将不会继续执行序列，直到 promise 被解析或拒绝。

```typescript
@@filename()
@Injectable()
class UsersService implements OnApplicationShutdown {
  onApplicationShutdown(signal: string) {
    console.log(signal); // 例如 "SIGINT"
  }
}
@@switch
@Injectable()
class UsersService implements OnApplicationShutdown {
  onApplicationShutdown(signal) {
    console.log(signal); // 例如 "SIGINT"
  }
}
```

> info **信息** 调用 `app.close()` 不会终止 Node 进程，只会触发 `onModuleDestroy()` 和 `onApplicationShutdown()` 钩子，因此如果有一些间隔、长时间运行的后台任务等，进程不会自动终止。