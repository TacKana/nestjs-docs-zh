### 读取-求值-输出-循环（REPL）

REPL 是一个简单的交互式环境，它接收用户输入，执行并返回结果。通过 REPL 功能，你可以直接在终端中检查依赖关系图并调用提供者（及控制器）上的方法。

#### 使用方法

要让 NestJS 应用在 REPL 模式下运行，创建一个新的 `repl.ts` 文件（与现有的 `main.ts` 文件并列），并添加以下代码：

```typescript
@@filename(repl)
import { repl } from '@nestjs/core';
import { AppModule } from './src/app.module';

async function bootstrap() {
  await repl(AppModule);
}
bootstrap();
@@switch
import { repl } from '@nestjs/core';
import { AppModule } from './src/app.module';

async function bootstrap() {
  await repl(AppModule);
}
bootstrap();
```

在终端中，使用以下命令启动 REPL：

```bash
$ npm run start -- --entryFile repl
```

> info **提示** `repl` 返回一个 [Node.js REPL 服务器](https://nodejs.org/api/repl.html) 对象。

启动后，控制台会显示以下消息：

```bash
LOG [NestFactory] Starting Nest application...
LOG [InstanceLoader] AppModule dependencies initialized
LOG REPL initialized
```

现在你可以开始与依赖关系图进行交互。例如，获取 `AppService`（这里以入门项目为例）并调用其 `getHello()` 方法：

```typescript
> get(AppService).getHello()
'Hello World!'
```

你可以在终端中执行任何 JavaScript 代码，例如，将 `AppController` 的实例分配给局部变量，并使用 `await` 调用异步方法：

```typescript
> appController = get(AppController)
AppController { appService: AppService {} }
> await appController.getHello()
'Hello World!'
```

要查看某个提供者或控制器上所有可用的公共方法，使用 `methods()` 函数，如下所示：

```typescript
> methods(AppController)

方法：
 ◻ getHello
```

要打印所有已注册模块及其控制器和提供者的列表，使用 `debug()`：

```typescript
> debug()

AppModule:
 - 控制器：
  ◻ AppController
 - 提供者：
  ◻ AppService
```

快速演示：

<figure><img src="/assets/repl.gif" alt="REPL 示例" /></figure>

你可以在以下部分找到更多关于现有预定义原生方法的信息。

#### 原生函数

内置的 NestJS REPL 提供了一些全局可用的原生函数。你可以调用 `help()` 来列出它们。

如果你不记得某个函数的签名（即：期望的参数和返回类型），可以调用 `<函数名>.help`。例如：

```text
> $.help
获取可注入对象或控制器的实例，否则抛出异常。
接口：$(token: InjectionToken) => any
```

> info **提示** 这些函数接口使用 [TypeScript 函数类型表达式语法](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-type-expressions) 编写。

| 函数        | 描述                                                                                             | 签名                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `debug`     | 打印所有已注册模块及其控制器和提供者的列表。                                                     | `debug(moduleCls?: ClassRef \| string) => void`                       |
| `get` 或 `$` | 获取可注入对象或控制器的实例，否则抛出异常。                                                     | `get(token: InjectionToken) => any`                                   |
| `methods`   | 显示给定提供者或控制器上所有可用的公共方法。                                                     | `methods(token: ClassRef \| string) => void`                          |
| `resolve`   | 解析可注入对象或控制器的临时或请求作用域实例，否则抛出异常。                                     | `resolve(token: InjectionToken, contextId: any) => Promise<any>`      |
| `select`    | 允许在模块树中导航，例如从所选模块中提取特定实例。                                               | `select(token: DynamicModule \| ClassRef) => INestApplicationContext` |

#### 监视模式

在开发过程中，以监视模式运行 REPL 非常有用，可以自动反映所有代码更改：

```bash
$ npm run start -- --watch --entryFile repl
```

但这种方式有一个缺点：每次重新加载后 REPL 的命令历史记录都会被丢弃，这可能不太方便。幸运的是，有一个非常简单的解决方案。像这样修改你的 `bootstrap` 函数：

```typescript
async function bootstrap() {
  const replServer = await repl(AppModule);
  replServer.setupHistory(".nestjs_repl_history", (err) => {
    if (err) {
      console.error(err);
    }
  });
}
```

现在，命令历史记录在运行/重新加载之间得以保留。