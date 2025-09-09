### Nest Commander

在[独立应用](/standalone-applications)文档的基础上，还有 [nest-commander](https://jmcdo29.github.io/nest-commander) 包，可用于以类似于典型 Nest 应用的结构编写命令行应用程序。

> info **提示** `nest-commander` 是一个第三方包，并非由 NestJS 核心团队全面管理。请在[相应仓库](https://github.com/jmcdo29/nest-commander/issues/new/choose)报告该库的任何问题。

#### 安装

与其他包一样，在使用前需要先安装它。

```bash
$ npm i nest-commander
```

#### 命令文件

`nest-commander` 通过 `@Command()` 装饰器用于类，以及 `@Option()` 装饰器用于该类的方法，使得使用[装饰器](https://www.typescriptlang.org/docs/handbook/decorators.html)编写新的命令行应用程序变得简单。每个命令文件都应实现 `CommandRunner` 抽象类，并使用 `@Command()` 装饰器进行装饰。

每个命令都被 Nest 视为 `@Injectable()`，因此您所熟悉的依赖注入仍然可以正常工作。唯一需要注意的是 `CommandRunner` 抽象类，每个命令都应实现它。`CommandRunner` 抽象类确保所有命令都有一个返回 `Promise<void>` 并接受参数 `string[], Record<string, any>` 的 `run` 方法。`run` 命令是您启动所有逻辑的地方，它会将未匹配选项标志的任何参数作为数组传入，以防您确实需要处理多个参数。至于选项 `Record<string, any>`，这些属性的名称与 `@Option()` 装饰器给定的 `name` 属性匹配，而它们的值则与选项处理程序的返回值匹配。如果您希望获得更好的类型安全性，也可以为选项创建一个接口。

#### 运行命令

类似于在 NestJS 应用中我们可以使用 `NestFactory` 创建服务器并使用 `listen` 运行它，`nest-commander` 包暴露了一个简单易用的 API 来运行您的服务器。导入 `CommandFactory` 并使用静态方法 `run`，并传入应用的根模块。这可能会像下面这样：

```ts
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';

async function bootstrap() {
  await CommandFactory.run(AppModule);
}

bootstrap();
```

默认情况下，使用 `CommandFactory` 时，Nest 的日志记录器是禁用的。不过，可以通过作为 `run` 函数的第二个参数来提供它。您可以提供一个自定义的 NestJS 日志记录器，或者一个您想要保留的日志级别数组——如果您只想打印出 Nest 的错误日志，至少在这里提供 `['error']` 可能会很有用。

```ts
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';
import { LogService } from './log.service';

async function bootstrap() {
  await CommandFactory.run(AppModule, new LogService());

  // 或者，如果您只想打印 Nest 的警告和错误
  await CommandFactory.run(AppModule, ['warn', 'error']);
}

bootstrap();
```

就是这样。在底层，`CommandFactory` 会负责为您调用 `NestFactory`，并在必要时调用 `app.close()`，因此您不必担心内存泄漏的问题。如果需要添加一些错误处理，可以使用 `try/catch` 包装 `run` 命令，或者在 `bootstrap()` 调用上链式调用 `.catch()` 方法。

#### 测试

那么，如果不能超级容易地测试它，编写一个超级棒的命令行脚本又有什么用呢？幸运的是，`nest-commander` 有一些实用工具，您可以完美地利用它们与 NestJS 生态系统配合，对于任何 Nest 开发者来说都会感到非常熟悉。在测试模式下构建命令时，您可以使用 `CommandTestFactory` 而不是 `CommandFactory`，并传入您的元数据，这与 `@nestjs/testing` 中的 `Test.createTestingModule` 非常相似。事实上，它在底层使用了这个包。您仍然可以在调用 `compile()` 之前链式调用 `overrideProvider` 方法，这样您就可以在测试中直接交换 DI 的各个部分。

#### 完整示例

以下类相当于一个 CLI 命令，可以接受子命令 `basic` 或直接调用，支持 `-n`、`-s` 和 `-b`（以及它们的长标志），并且每个选项都有自定义解析器。按照惯例，还支持 `--help` 标志。

```ts
import { Command, CommandRunner, Option } from 'nest-commander';
import { LogService } from './log.service';

interface BasicCommandOptions {
  string?: string;
  boolean?: boolean;
  number?: number;
}

@Command({ name: 'basic', description: '参数解析' })
export class BasicCommand extends CommandRunner {
  constructor(private readonly logService: LogService) {
    super();
  }

  async run(
    passedParam: string[],
    options?: BasicCommandOptions,
  ): Promise<void> {
    if (options?.boolean !== undefined && options?.boolean !== null) {
      this.runWithBoolean(passedParam, options.boolean);
    } else if (options?.number) {
      this.runWithNumber(passedParam, options.number);
    } else if (options?.string) {
      this.runWithString(passedParam, options.string);
    } else {
      this.runWithNone(passedParam);
    }
  }

  @Option({
    flags: '-n, --number [number]',
    description: '基础数字解析器',
  })
  parseNumber(val: string): number {
    return Number(val);
  }

  @Option({
    flags: '-s, --string [string]',
    description: '返回字符串',
  })
  parseString(val: string): string {
    return val;
  }

  @Option({
    flags: '-b, --boolean [boolean]',
    description: '布尔解析器',
  })
  parseBoolean(val: string): boolean {
    return JSON.parse(val);
  }

  runWithString(param: string[], option: string): void {
    this.logService.log({ param, string: option });
  }

  runWithNumber(param: string[], option: number): void {
    this.logService.log({ param, number: option });
  }

  runWithBoolean(param: string[], option: boolean): void {
    this.logService.log({ param, boolean: option });
  }

  runWithNone(param: string[]): void {
    this.logService.log({ param });
  }
}
```

确保将命令类添加到模块中：

```ts
@Module({
  providers: [LogService, BasicCommand],
})
export class AppModule {}
```

现在，为了能够在 main.ts 中运行 CLI，您可以执行以下操作：

```ts
async function bootstrap() {
  await CommandFactory.run(AppModule);
}

bootstrap();
```

就这样，您就有了一个命令行应用程序。

#### 更多信息

访问 [nest-commander 文档网站](https://jmcdo29.github.io/nest-commander) 获取更多信息、示例和 API 文档。