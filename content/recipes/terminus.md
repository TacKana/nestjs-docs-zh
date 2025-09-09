### 健康检查 (Terminus)

Terminus 集成提供了 **就绪度/存活度** 健康检查功能。健康检查在复杂的后端设置中至关重要。简而言之，Web 开发领域的健康检查通常由一个特殊地址组成，例如 `https://my-website.com/health/readiness`。基础设施中的某个服务或组件（例如 [Kubernetes](https://kubernetes.io/)）会持续检查这个地址。根据对该地址 `GET` 请求返回的 HTTP 状态码，当服务收到“不健康”的响应时，它将采取相应措施。由于“健康”或“不健康”的定义因提供的服务类型而异，**Terminus** 集成通过一组 **健康指示器** 来支持您。

例如，如果您的 Web 服务器使用 MongoDB 存储数据，那么 MongoDB 是否仍在运行就是至关重要的信息。在这种情况下，您可以使用 `MongooseHealthIndicator`。如果配置正确（稍后会详细介绍），您的健康检查地址将根据 MongoDB 是否正在运行返回健康或不健康的 HTTP 状态码。

#### 开始使用

要开始使用 `@nestjs/terminus`，我们需要先安装所需的依赖。

```bash
$ npm install --save @nestjs/terminus
```

#### 设置健康检查

健康检查代表了 **健康指示器** 的摘要。健康指示器执行服务的检查，判断其处于健康或不健康状态。如果所有分配的健康指示器都正常运行，则健康检查结果为阳性。由于许多应用程序需要类似的健康指示器，[`@nestjs/terminus`](https://github.com/nestjs/terminus) 提供了一组预定义的指示器，例如：

- `HttpHealthIndicator`
- `TypeOrmHealthIndicator`
- `MongooseHealthIndicator`
- `SequelizeHealthIndicator`
- `MikroOrmHealthIndicator`
- `PrismaHealthIndicator`
- `MicroserviceHealthIndicator`
- `GRPCHealthIndicator`
- `MemoryHealthIndicator`
- `DiskHealthIndicator`

要开始我们的第一个健康检查，让我们创建 `HealthModule` 并在其 imports 数组中导入 `TerminusModule`。

> info **提示** 要使用 [Nest CLI](cli/overview) 创建模块，只需执行 `$ nest g module health` 命令。

```typescript
@@filename(health.module)
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [TerminusModule]
})
export class HealthModule {}
```

我们的健康检查可以通过 [控制器](/controllers) 来执行，使用 [Nest CLI](cli/overview) 可以轻松设置。

```bash
$ nest g controller health
```

> info **信息** 强烈建议在应用程序中启用关闭钩子。如果启用，Terminus 集成会利用此生命周期事件。阅读更多关于关闭钩子的信息 [此处](fundamentals/lifecycle-events#application-shutdown)。

#### HTTP 健康检查

安装 `@nestjs/terminus`、导入 `TerminusModule` 并创建新控制器后，我们就可以创建健康检查了。

`HTTPHealthIndicator` 需要 `@nestjs/axios` 包，因此请确保已安装：

```bash
$ npm i --save @nestjs/axios axios
```

现在我们可以设置 `HealthController`：

```typescript
@@filename(health.controller)
import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator, HealthCheck } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),
    ]);
  }
}
@@switch
import { Controller, Dependencies, Get } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator, HealthCheck } from '@nestjs/terminus';

@Controller('health')
@Dependencies(HealthCheckService, HttpHealthIndicator)
export class HealthController {
  constructor(
    private health,
    private http,
  ) { }

  @Get()
  @HealthCheck()
  healthCheck() {
    return this.health.check([
      () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),
    ])
  }
}
```

```typescript
@@filename(health.module)
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
})
export class HealthModule {}
@@switch
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

现在，我们的健康检查将向 `https://docs.nestjs.com` 地址发送一个 _GET_ 请求。如果从该地址获得健康响应，我们在 `http://localhost:3000/health` 的路由将返回以下对象，并带有 200 状态码。

```json
{
  "status": "ok",
  "info": {
    "nestjs-docs": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "nestjs-docs": {
      "status": "up"
    }
  }
}
```

此响应对象的接口可以从 `@nestjs/terminus` 包中的 `HealthCheckResult` 接口访问。

|           |                                                                                                                                                                                             |                                      |
|-----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------|
| `status`  | 如果任何健康指示器失败，状态将为 `'error'`。如果 NestJS 应用正在关闭但仍接受 HTTP 请求，健康检查将具有 `'shutting_down'` 状态。 | `'error' \| 'ok' \| 'shutting_down'` |
| `info`    | 包含状态为 `'up'` 的每个健康指示器信息的对象，换句话说就是“健康”。                                                                              | `object`                             |
| `error`   | 包含状态为 `'down'` 的每个健康指示器信息的对象，换句话说就是“不健康”。                                                                          | `object`                             |
| `details` | 包含每个健康指示器所有信息的对象                                                                                                                                  | `object`                             |

##### 检查特定的 HTTP 响应码

在某些情况下，您可能希望检查特定条件并验证响应。例如，假设 `https://my-external-service.com` 返回响应码 `204`。使用 `HttpHealthIndicator.responseCheck`，您可以专门检查该响应码，并将所有其他响应码视为不健康。

如果返回除 `204` 之外的任何其他响应码，以下示例将是不健康的。第三个参数要求您提供一个函数（同步或异步），该函数返回一个布尔值，表示响应是否被视为健康（`true`）或不健康（`false`）。


```typescript
@@filename(health.controller)
// 在 `HealthController` 类中

@Get()
@HealthCheck()
check() {
  return this.health.check([
    () =>
      this.http.responseCheck(
        'my-external-service',
        'https://my-external-service.com',
        (res) => res.status === 204,
      ),
  ]);
}
```


#### TypeOrm 健康指示器

Terminus 提供了将数据库检查添加到健康检查中的能力。要开始使用此健康指示器，您应该查看 [数据库章节](/techniques/sql)，并确保应用程序中的数据库连接已建立。

> info **提示** 在幕后，`TypeOrmHealthIndicator` 简单地执行一个 `SELECT 1` SQL 命令，该命令通常用于验证数据库是否仍然存活。如果您使用 Oracle 数据库，则使用 `SELECT 1 FROM DUAL`。

```typescript
@@filename(health.controller)
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
@@switch
@Controller('health')
@Dependencies(HealthCheckService, TypeOrmHealthIndicator)
export class HealthController {
  constructor(
    private health,
    private db,
  ) { }

  @Get()
  @HealthCheck()
  healthCheck() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ])
  }
}
```

如果您的数据库可达，现在当使用 `GET` 请求访问 `http://localhost:3000/health` 时，您应该看到以下 JSON 结果：

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

如果您的应用使用 [多个数据库](techniques/database#multiple-databases)，您需要将每个连接注入到 `HealthController` 中。然后，您可以简单地将连接引用传递给 `TypeOrmHealthIndicator`。

```typescript
@@filename(health.controller)
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    @InjectConnection('albumsConnection')
    private albumsConnection: Connection,
    @InjectConnection()
    private defaultConnection: Connection,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('albums-database', { connection: this.albumsConnection }),
      () => this.db.pingCheck('database', { connection: this.defaultConnection }),
    ]);
  }
}
```


#### 磁盘健康指示器

使用 `DiskHealthIndicator`，我们可以检查使用了多少存储空间。要开始使用，请确保将 `DiskHealthIndicator` 注入到您的 `HealthController` 中。以下示例检查路径 `/`（或在 Windows 上可以使用 `C:\\`）的存储使用情况。如果该使用量超过总存储空间的 50%，它将响应一个不健康的健康检查。

```typescript
@@filename(health.controller)
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.5 }),
    ]);
  }
}
@@switch
@Controller('health')
@Dependencies(HealthCheckService, DiskHealthIndicator)
export class HealthController {
  constructor(health, disk) {}

  @Get()
  @HealthCheck()
  healthCheck() {
    return this.health.check([
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.5 }),
    ])
  }
}
```

使用 `DiskHealthIndicator.checkStorage` 函数，您还可以检查固定数量的空间。如果路径 `/my-app/` 超过 250GB，以下示例将是不健康的。

```typescript
@@filename(health.controller)
// 在 `HealthController` 类中

@Get()
@HealthCheck()
check() {
  return this.health.check([
    () => this.disk.checkStorage('storage', {  path: '/', threshold: 250 * 1024 * 1024 * 1024, })
  ]);
}
```

#### 内存健康指示器

为确保您的进程不超过某个内存限制，可以使用 `MemoryHealthIndicator`。以下示例可用于检查进程的堆。

> info **提示** 堆是动态分配内存所在的内存部分（即通过 malloc 分配的内存）。从堆分配的内存将保持分配状态，直到发生以下情况之一：
> - 内存被 _释放_
> - 程序终止

```typescript
@@filename(health.controller)
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }
}
@@switch
@Controller('health')
@Dependencies(HealthCheckService, MemoryHealthIndicator)
export class HealthController {
  constructor(health, memory) {}

  @Get()
  @HealthCheck()
  healthCheck() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ])
  }
}
```

也可以使用 `MemoryHealthIndicator.checkRSS` 验证进程的内存 RSS。如果您的进程分配了超过 150MB 的内存，此示例将返回不健康的响应码。

> info **提示** RSS 是驻留集大小，用于显示分配给该进程的内存量以及它在 RAM 中的情况。它不包括已交换出的内存。它包括来自共享库的内存，只要这些库的页面实际上在内存中。它包括所有堆栈和堆内存。


```typescript
@@filename(health.controller)
// 在 `HealthController` 类中

@Get()
@HealthCheck()
check() {
  return this.health.check([
    () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
  ]);
}
```


#### 自定义健康指示器

在某些情况下，`@nestjs/terminus` 提供的预定义健康指示器无法满足您的所有健康检查需求。在这种情况下，您可以根据需要设置自定义健康指示器。

让我们首先创建一个代表我们自定义指示器的服务。为了基本了解指示器的结构，我们将创建一个示例 `DogHealthIndicator`。如果每个 `Dog` 对象的类型都是 `'goodboy'`，则该服务应处于 `'up'` 状态。如果该条件不满足，则应抛出错误。

```typescript
@@filename(dog.health)
import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

export interface Dog {
  name: string;
  type: string;
}

@Injectable()
export class DogHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService
  ) {}

  private dogs: Dog[] = [
    { name: 'Fido', type: 'goodboy' },
    { name: 'Rex', type: 'badboy' },
  ];

  async isHealthy(key: string){
    const indicator = this.healthIndicatorService.check(key);
    const badboys = this.dogs.filter(dog => dog.type === 'badboy');
    const isHealthy = badboys.length === 0;

    if (!isHealthy) {
      return indicator.down({ badboys: badboys.length });
    }

    return indicator.up();
  }
}
@@switch
import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
@Dependencies(HealthIndicatorService)
export class DogHealthIndicator {
  constructor(healthIndicatorService) {
    this.healthIndicatorService = healthIndicatorService;
  }

  private dogs = [
    { name: 'Fido', type: 'goodboy' },
    { name: 'Rex', type: 'badboy' },
  ];

  async isHealthy(key){
    const indicator = this.healthIndicatorService.check(key);
    const badboys = this.dogs.filter(dog => dog.type === 'badboy');
    const isHealthy = badboys.length === 0;

    if (!isHealthy) {
      return indicator.down({ badboys: badboys.length });
    }

    return indicator.up();
  }
}
```

接下来我们需要将健康指示器注册为提供者。

```typescript
@@filename(health.module)
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DogHealthIndicator } from './dog.health';

@Module({
  controllers: [HealthController],
  imports: [TerminusModule],
  providers: [DogHealthIndicator]
})
export class HealthModule { }
```

> info **提示** 在实际应用中，`DogHealthIndicator` 应该在一个单独的模块中提供，例如 `DogModule`，然后由 `HealthModule` 导入。

最后一步是在所需的健康检查端点中添加现在可用的健康指示器。为此，我们回到 `HealthController` 并将其添加到我们的 `check` 函数中。

```typescript
@@filename(health.controller)
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { Injectable, Dependencies, Get } from '@nestjs/common';
import { DogHealthIndicator } from './dog.health';

@Injectable()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private dogHealthIndicator: DogHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  healthCheck() {
    return this.health.check([
      () => this.dogHealthIndicator.isHealthy('dog'),
    ])
  }
}
@@switch
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { Injectable, Get } from '@nestjs/common';
import { DogHealthIndicator } from './dog.health';

@Injectable()
@Dependencies(HealthCheckService, DogHealthIndicator)
export class HealthController {
  constructor(
    health,
    dogHealthIndicator
  ) {
    this.health = health;
    this.dogHealthIndicator = dogHealthIndicator;
  }

  @Get()
  @HealthCheck()
  healthCheck() {
    return this.health.check([
      () => this.dogHealthIndicator.isHealthy('dog'),
    ])
  }
}
```

#### 日志记录

Terminus 仅记录错误消息，例如当健康检查失败时。使用 `TerminusModule.forRoot()` 方法，您可以更好地控制错误如何被记录，甚至可以完全接管日志记录本身。

在本节中，我们将引导您如何创建自定义记录器 `TerminusLogger`。此记录器扩展了内置记录器。因此，您可以选择要覆盖的记录器的哪些部分。

> info **信息** 如果您想了解更多关于 NestJS 中自定义记录器的信息，[请阅读此处](/techniques/logger#injecting-a-custom-logger)。


```typescript
@@filename(terminus-logger.service)
import { Injectable, Scope, ConsoleLogger } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class TerminusLogger extends ConsoleLogger {
  error(message: any, stack?: string, context?: string): void;
  error(message: any, ...optionalParams: any[]): void;
  error(
    message: unknown,
    stack?: unknown,
    context?: unknown,
    ...rest: unknown[]
  ): void {
    // 在此处覆盖错误消息应如何记录
  }
}
```

创建自定义记录器后，您只需将其传递到 `TerminusModule.forRoot()` 中，如下所示。

```typescript
@@filename(health.module)
@Module({
imports: [
  TerminusModule.forRoot({
    logger: TerminusLogger,
  }),
],
})
export class HealthModule {}
```


要完全抑制来自 Terminus 的任何日志消息，包括错误消息，请按如下方式配置 Terminus。

```typescript
@@filename(health.module)
@Module({
imports: [
  TerminusModule.forRoot({
    logger: false,
  }),
],
})
export class HealthModule {}
```



Terminus 允许您配置健康检查错误在日志中的显示方式。

| 错误日志样式          | 描述                                                                                                                        | 示例                                                              |
|:------------------|:-----------------------------------------------------------------------------------------------------------------------------------|:---------------------------------------------------------------------|
| `json`  (默认) | 以 JSON 对象形式打印健康检查结果的摘要（如果发生错误）                                                     | <figure><img src="/assets/Terminus_Error_Log_Json.png" /></figure>   |
| `pretty`          | 在格式化的框内打印健康检查结果的摘要，并突出显示成功/错误的结果 | <figure><img src="/assets/Terminus_Error_Log_Pretty.png" /></figure> |

您可以使用 `errorLogStyle` 配置选项更改日志样式，如下面的代码片段所示。

```typescript
@@filename(health.module)
@Module({
  imports: [
    TerminusModule.forRoot({
      errorLogStyle: 'pretty',
    }),
  ]
})
export class HealthModule {}
```

#### 优雅关闭超时

如果您的应用程序需要推迟其关闭过程，Terminus 可以为您处理。当使用像 Kubernetes 这样的编排器时，此设置尤其有用。通过设置比就绪检查间隔稍长的延迟，您可以在关闭容器时实现零停机时间。

```typescript
@@filename(health.module)
@Module({
  imports: [
    TerminusModule.forRoot({
      gracefulShutdownTimeoutMs: 1000,
    }),
  ]
})
export class HealthModule {}
```

#### 更多示例

更多工作示例可在 [此处](https://github.com/nestjs/terminus/tree/master/sample) 找到。