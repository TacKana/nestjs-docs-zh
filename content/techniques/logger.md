### 日志记录器

Nest 内置了一个基于文本的日志记录器，在应用程序引导启动和其他多种场景（如显示捕获的异常，即系统日志记录）中使用。此功能通过 `@nestjs/common` 包中的 `Logger` 类提供。您可以完全控制日志记录系统的行为，包括以下任意一项：

- 完全禁用日志记录
- 指定日志详细级别（例如，显示错误、警告、调试信息等）
- 配置日志消息的格式（原始格式、JSON、彩色输出等）
- 覆盖默认日志记录器中的时间戳（例如，使用 ISO8601 标准作为日期格式）
- 完全覆盖默认日志记录器
- 通过扩展来自定义默认日志记录器
- 利用依赖注入简化应用程序的构建和测试

您也可以使用内置日志记录器，或创建自己的自定义实现，来记录应用程序级别的事件和消息。

如果您的应用程序需要与外部日志系统集成、自动基于文件的日志记录或将日志转发到集中式日志服务，可以使用 Node.js 日志记录库实现完全自定义的日志解决方案。一个流行的选择是 [Pino](https://github.com/pinojs/pino)，以其高性能和灵活性著称。

#### 基础自定义

要禁用日志记录，请在传递给 `NestFactory.create()` 方法的第二个参数（可选的 Nest 应用程序选项对象）中，将 `logger` 属性设置为 `false`。

```typescript
const app = await NestFactory.create(AppModule, {
  logger: false,
});
await app.listen(process.env.PORT ?? 3000);
```

要启用特定的日志级别，将 `logger` 属性设置为一个字符串数组，指定要显示的日志级别，如下所示：

```typescript
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn'],
});
await app.listen(process.env.PORT ?? 3000);
```

数组中的值可以是 `'log'`、`'fatal'`、`'error'`、`'warn'`、`'debug'` 和 `'verbose'` 的任意组合。

要禁用彩色输出，将 `ConsoleLogger` 对象（其 `colors` 属性设为 `false`）作为 `logger` 属性的值传递。

```typescript
const app = await NestFactory.create(AppModule, {
  logger: new ConsoleLogger({
    colors: false,
  }),
});
```

要为每条日志消息配置前缀，传递带有 `prefix` 属性的 `ConsoleLogger` 对象：

```typescript
const app = await NestFactory.create(AppModule, {
  logger: new ConsoleLogger({
    prefix: 'MyApp', // 默认为 "Nest"
  }),
});
```

下表列出了所有可用选项：

| 选项               | 描述                                                                                                                                                                                                                                                                                                                                          | 默认值                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `logLevels`        | 启用的日志级别。                                                                                                                                                                                                                                                                                                                                  | `['log', 'error', 'warn', 'debug', 'verbose']` |
| `timestamp`        | 如果启用，将打印当前日志消息与上一条日志消息之间的时间戳（时间差）。注意：当启用 `json` 时，此选项不适用。                                                                                                                                                                                                   | `false`                                        |
| `prefix`           | 每条日志消息使用的前缀。注意：当启用 `json` 时，此选项不适用。                                                                                                                                                                                                                      | `Nest`                                         |
| `json`             | 如果启用，将以 JSON 格式打印日志消息。                                                                                                                                                                                                                                                                                               | `false`                                        |
| `colors`           | 如果启用，将以彩色打印日志消息。如果未启用 JSON，默认为 true，否则为 false。                                                                                                                                                                                                                                                  | `true`                                         |
| `context`          | 日志记录器的上下文。                                                                                                                                                                                                                                                                                                                           | `undefined`                                    |
| `compact`          | 如果启用，即使日志消息是多属性的对象，也会在单行打印。如果设置为数字，只要所有属性适合 breakLength，最多 n 个内部元素将合并到单行。短数组元素也会被分组在一起。                                                                 | `true`                                         |
| `maxArrayLength`   | 指定在格式化时包含的数组、类型数组、Map、Set、WeakMap 和 WeakSet 元素的最大数量。设置为 null 或 Infinity 以显示所有元素。设置为 0 或负数以不显示任何元素。当启用 `json`、禁用颜色且 `compact` 设置为 true 时忽略，因为它会产生可解析的 JSON 输出。             | `100`                                          |
| `maxStringLength`  | 指定在格式化时包含的最大字符数。设置为 null 或 Infinity 以显示所有元素。设置为 0 或负数以不显示任何字符。当启用 `json`、禁用颜色且 `compact` 设置为 true 时忽略，因为它会产生可解析的 JSON 输出。                                                           | `10000`                                        |
| `sorted`           | 如果启用，将在格式化对象时对键进行排序。也可以是自定义排序函数。当启用 `json`、禁用颜色且 `compact` 设置为 true 时忽略，因为它会产生可解析的 JSON 输出。                                                                                                                                | `false`                                        |
| `depth`            | 指定在格式化对象时递归的次数。这对于检查大对象很有用。要递归到最大调用堆栈大小，传递 Infinity 或 null。当启用 `json`、禁用颜色且 `compact` 设置为 true 时忽略，因为它会产生可解析的 JSON 输出。                                         | `5`                                            |
| `showHidden`       | 如果为 true，对象的不可枚举符号和属性将包含在格式化结果中。WeakMap 和 WeakSet 条目以及用户定义的原型属性也将包括在内。                                                                                                                                                             | `false`                                        |
| `breakLength`      | 输入值在多行分割的长度。设置为 Infinity 以将输入格式化为单行（与设置为 true 的 "compact" 结合使用）。当 "compact" 为 true 时默认 Infinity，否则为 80。当启用 `json`、禁用颜色且 `compact` 设置为 true 时忽略，因为它会产生可解析的 JSON 输出。 | `Infinity`                                     |

#### JSON 日志记录

JSON 日志记录对于现代应用程序的可观测性和与日志管理系统的集成至关重要。要在 NestJS 应用程序中启用 JSON 日志记录，配置 `ConsoleLogger` 对象，将其 `json` 属性设置为 `true`。然后，在创建应用程序实例时，将此日志记录器配置作为 `logger` 属性的值提供。

```typescript
const app = await NestFactory.create(AppModule, {
  logger: new ConsoleLogger({
    json: true,
  }),
});
```

此配置以结构化的 JSON 格式输出日志，使其更容易与外部系统（如日志聚合器和云平台）集成。例如，像 **AWS ECS**（弹性容器服务）这样的平台原生支持 JSON 日志，从而实现高级功能，如：

- **日志过滤**：根据日志级别、时间戳或自定义元数据等字段轻松缩小日志范围。
- **搜索和分析**：使用查询工具分析和跟踪应用程序行为趋势。

此外，如果您使用 [NestJS Mau](https://mau.nestjs.com)，JSON 日志记录简化了以良好组织的结构化格式查看日志的过程，这对于调试和性能监控特别有用。

> info **注意** 当 `json` 设置为 `true` 时，`ConsoleLogger` 会自动通过将 `colors` 属性设置为 `false` 来禁用文本着色。这确保输出保持有效的 JSON，没有格式化工件。然而，出于开发目的，您可以通过显式将 `colors` 设置为 `true` 来覆盖此行为。这会添加着色的 JSON 日志，可以在本地调试时使日志条目更易读。

启用 JSON 日志记录后，日志输出将如下所示（单行）：

```json
{
  "level": "log",
  "pid": 19096,
  "timestamp": 1607370779834,
  "message": "Starting Nest application...",
  "context": "NestFactory"
}
```

您可以在[此拉取请求](https://github.com/nestjs/nest/pull/14121)中查看不同的变体。

#### 使用日志记录器进行应用程序日志记录

我们可以结合上述几种技术，在 Nest 系统日志记录和我们自己的应用程序事件/消息日志记录中提供一致的行为和格式。

一个好的做法是在每个服务中实例化 `@nestjs/common` 中的 `Logger` 类。我们可以在 `Logger` 构造函数的 `context` 参数中提供我们的服务名称，如下所示：

```typescript
import { Logger, Injectable } from '@nestjs/common';

@Injectable()
class MyService {
  private readonly logger = new Logger(MyService.name);

  doSomething() {
    this.logger.log('Doing something...');
  }
}
```

在默认的日志记录器实现中，`context` 会打印在方括号中，如下例中的 `NestFactory`：

```bash
[Nest] 19096   - 12/08/2019, 7:12:59 AM   [NestFactory] Starting Nest application...
```

如果我们通过 `app.useLogger()` 提供了自定义日志记录器，它实际上会被 Nest 内部使用。这意味着我们的代码保持实现无关，同时我们可以通过调用 `app.useLogger()` 轻松地将默认日志记录器替换为自定义日志记录器。

这样，如果我们遵循上一节的步骤并调用 `app.useLogger(app.get(MyLogger))`，那么从 `MyService` 调用 `this.logger.log()` 将导致调用 `MyLogger` 实例的 `log` 方法。

这应该适用于大多数情况。但如果您需要更多自定义（如添加和调用自定义方法），请转到下一节。

#### 带时间戳的日志

要为每条日志消息启用时间戳日志记录，您可以在创建日志记录器实例时使用可选的 `timestamp: true` 设置。

```typescript
import { Logger, Injectable } from '@nestjs/common';

@Injectable()
class MyService {
  private readonly logger = new Logger(MyService.name, { timestamp: true });

  doSomething() {
    this.logger.log('Doing something with timestamp here ->');
  }
}
```

这将产生以下格式的输出：

```bash
[Nest] 19096   - 04/19/2024, 7:12:59 AM   [MyService] Doing something with timestamp here +5ms
```

注意行尾的 `+5ms`。对于每个日志语句，会计算与上一条消息的时间差，并显示在行尾。

#### 自定义实现

您可以通过将 `logger` 属性的值设置为满足 `LoggerService` 接口的对象，来为 Nest 提供自定义日志记录器实现，用于系统日志记录。例如，您可以告诉 Nest 使用内置的全局 JavaScript `console` 对象（它实现了 `LoggerService` 接口），如下所示：

```typescript
const app = await NestFactory.create(AppModule, {
  logger: console,
});
await app.listen(process.env.PORT ?? 3000);
```

实现您自己的自定义日志记录器很简单。只需实现 `LoggerService` 接口的每个方法，如下所示。

```typescript
import { LoggerService, Injectable } from '@nestjs/common';

@Injectable()
export class MyLogger implements LoggerService {
  /**
   * 写入 'log' 级别的日志。
   */
  log(message: any, ...optionalParams: any[]) {}

  /**
   * 写入 'fatal' 级别的日志。
   */
  fatal(message: any, ...optionalParams: any[]) {}

  /**
   * 写入 'error' 级别的日志。
   */
  error(message: any, ...optionalParams: any[]) {}

  /**
   * 写入 'warn' 级别的日志。
   */
  warn(message: any, ...optionalParams: any[]) {}

  /**
   * 写入 'debug' 级别的日志。
   */
  debug?(message: any, ...optionalParams: any[]) {}

  /**
   * 写入 'verbose' 级别的日志。
   */
  verbose?(message: any, ...optionalParams: any[]) {}
}
```

然后，您可以通过 Nest 应用程序选项对象的 `logger` 属性提供 `MyLogger` 的实例。

```typescript
const app = await NestFactory.create(AppModule, {
  logger: new MyLogger(),
});
await app.listen(process.env.PORT ?? 3000);
```

这种技术虽然简单，但不会为 `MyLogger` 类利用依赖注入。这可能会带来一些挑战，特别是对于测试，并限制 `MyLogger` 的可重用性。有关更好的解决方案，请参阅下面的<a href="techniques/logger#dependency-injection">依赖注入</a>部分。

#### 扩展内置日志记录器

与其从头开始编写日志记录器，不如通过扩展内置的 `ConsoleLogger` 类并覆盖默认实现的选定行为来满足您的需求。

```typescript
import { ConsoleLogger } from '@nestjs/common';

export class MyLogger extends ConsoleLogger {
  error(message: any, stack?: string, context?: string) {
    // 在此添加您的定制逻辑
    super.error(...arguments);
  }
}
```

您可以在功能模块中使用这样的扩展日志记录器，如<a href="techniques/logger#using-the-logger-for-application-logging">使用日志记录器进行应用程序日志记录</a>部分所述。

您可以通过应用程序选项对象的 `logger` 属性传递其实例（如上面的<a href="techniques/logger#custom-logger-implementation">自定义实现</a>部分所示），或使用下面<a href="techniques/logger#dependency-injection">依赖注入</a>部分所示的技术，告诉 Nest 使用您的扩展日志记录器进行系统日志记录。如果这样做，您应注意调用 `super`，如上例代码所示，以将特定的日志方法调用委托给父类（内置类），以便 Nest 可以依赖其期望的内置功能。

<app-banner-courses></app-banner-courses>

#### 依赖注入

对于更高级的日志记录功能，您需要利用依赖注入。例如，您可能希望将 `ConfigService` 注入到您的日志记录器中以进行自定义，进而将您的自定义日志记录器注入到其他控制器和/或提供者中。要为您的自定义日志记录器启用依赖注入，创建一个实现 `LoggerService` 的类，并在某个模块中将该类注册为提供者。例如，您可以

1. 定义一个 `MyLogger` 类，它要么扩展内置的 `ConsoleLogger`，要么完全覆盖它，如前面部分所示。确保实现 `LoggerService` 接口。
2. 创建一个如下所示的 `LoggerModule`，并从该模块提供 `MyLogger`。

```typescript
import { Module } from '@nestjs/common';
import { MyLogger } from './my-logger.service';

@Module({
  providers: [MyLogger],
  exports: [MyLogger],
})
export class LoggerModule {}
```

通过这种结构，您现在可以提供您的自定义日志记录器供任何其他模块使用。因为您的 `MyLogger` 类是模块的一部分，它可以使用依赖注入（例如，注入 `ConfigService`）。还需要一种技术来提供此自定义日志记录器供 Nest 用于系统日志记录（例如，用于引导和错误处理）。

因为应用程序实例化（`NestFactory.create()`）发生在任何模块的上下文之外，它不参与初始化的正常依赖注入阶段。因此，我们必须确保至少一个应用程序模块导入 `LoggerModule` 以触发 Nest 实例化我们的 `MyLogger` 类的单例实例。

然后，我们可以使用以下结构指示 Nest 使用相同的 `MyLogger` 单例实例：

```typescript
const app = await NestFactory.create(AppModule, {
  bufferLogs: true,
});
app.useLogger(app.get(MyLogger));
await app.listen(process.env.PORT ?? 3000);
```

> info **注意** 在上面的示例中，我们将 `bufferLogs` 设置为 `true` 以确保所有日志将被缓冲，直到附加自定义日志记录器（此例中为 `MyLogger`）并且应用程序初始化过程完成或失败。如果初始化过程失败，Nest 将回退到原始的 `ConsoleLogger` 来打印任何报告的错误消息。此外，您可以将 `autoFlushLogs` 设置为 `false`（默认为 `true`）以手动刷新日志（使用 `Logger.flush()` 方法）。

这里我们使用 `NestApplication` 实例上的 `get()` 方法来检索 `MyLogger` 对象的单例实例。这种技术本质上是一种“注入”日志记录器实例供 Nest 使用的方式。`app.get()` 调用检索 `MyLogger` 的单例实例，并依赖于该实例首先在另一个模块中注入，如上所述。

您还可以在您的功能类中注入此 `MyLogger` 提供者，从而确保 Nest 系统日志记录和应用程序日志记录之间的一致性行为。有关更多信息，请参阅<a href="techniques/logger#using-the-logger-for-application-logging">使用日志记录器进行应用程序日志记录</a>和下面的<a href="techniques/logger#injecting-a-custom-logger">注入自定义日志记录器</a>。

#### 注入自定义日志记录器

首先，使用如下代码扩展内置日志记录器。我们提供 `scope` 选项作为 `ConsoleLogger` 类的配置元数据，指定[瞬态](/fundamentals/injection-scopes)作用域，以确保我们在每个功能模块中都有一个唯一的 `MyLogger` 实例。在此示例中，我们没有扩展各个 `ConsoleLogger` 方法（如 `log()`、`warn()` 等），但您可以选择这样做。

```typescript
import { Injectable, Scope, ConsoleLogger } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class MyLogger extends ConsoleLogger {
  customLog() {
    this.log('Please feed the cat!');
  }
}
```

接下来，创建一个如下结构的 `LoggerModule`：

```typescript
import { Module } from '@nestjs/common';
import { MyLogger } from './my-logger.service';

@Module({
  providers: [MyLogger],
  exports: [MyLogger],
})
export class LoggerModule {}
```

接下来，将 `LoggerModule` 导入到您的功能模块中。由于我们扩展了默认的 `Logger`，我们可以方便地使用 `setContext` 方法。因此，我们可以开始使用上下文感知的自定义日志记录器，如下所示：

```typescript
import { Injectable } from '@nestjs/common';
import { MyLogger } from './my-logger.service';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  constructor(private myLogger: MyLogger) {
    // 由于是瞬态作用域，CatsService 拥有自己唯一的 MyLogger 实例，
    // 因此在此设置上下文不会影响其他服务中的其他实例
    this.myLogger.setContext('CatsService');
  }

  findAll(): Cat[] {
    // 您可以调用所有默认方法
    this.myLogger.warn('About to return cats!');
    // 以及您的自定义方法
    this.myLogger.customLog();
    return this.cats;
  }
}
```

最后，在您的 `main.ts` 文件中指示 Nest 使用自定义日志记录器的实例，如下所示。当然，在此示例中，我们实际上没有自定义日志记录器行为（通过扩展 `Logger` 方法如 `log()`、`warn()` 等），因此此步骤实际上不需要。但如果您向这些方法添加了自定义逻辑并希望 Nest 使用相同的实现，则**需要**此步骤。

```typescript
const app = await NestFactory.create(AppModule, {
  bufferLogs: true,
});
app.useLogger(new MyLogger());
await app.listen(process.env.PORT ?? 3000);
```

> info **提示** 或者，您可以使用 `logger: false` 指令临时禁用日志记录器，而不是将 `bufferLogs` 设置为 `true`。请注意，如果您向 `NestFactory.create` 提供 `logger: false`，在调用 `useLogger` 之前不会记录任何内容，因此您可能会错过一些重要的初始化错误。如果您不介意某些初始消息将使用默认日志记录器记录，您可以省略 `logger: false` 选项。

#### 使用外部日志记录器

生产应用程序通常有特定的日志记录需求，包括高级过滤、格式化和集中式日志记录。Nest 的内置日志记录器用于监视 Nest 系统行为，并且在开发时对于功能模块中的基本格式化文本日志记录也很有用，但生产应用程序通常利用专用日志记录模块，如 [Winston](https://github.com/winstonjs/winston)。与任何标准 Node.js 应用程序一样，您可以在 Nest 中充分利用此类模块。