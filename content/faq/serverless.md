### 无服务器（Serverless）

无服务器计算是一种云计算执行模型，云提供商按需分配机器资源，代表客户管理服务器。当应用未被使用时，不会为其分配计算资源。计费基于应用实际消耗的资源量（[来源](https://en.wikipedia.org/wiki/Serverless_computing)）。

采用**无服务器架构**，您可以专注于应用代码中的各个函数。诸如 AWS Lambda、Google Cloud Functions 和 Microsoft Azure Functions 等服务负责所有物理硬件、虚拟机操作系统及 Web 服务器软件的管理。

> info **提示** 本章节不讨论无服务器函数的优缺点，也不会深入任何云提供商的具体细节。

#### 冷启动

冷启动是指您的代码在一段时间后首次执行。根据您使用的云提供商，这可能涉及多个不同的操作，从下载代码和启动运行时环境，到最终运行您的代码。这个过程会带来**显著的延迟**，具体延迟取决于多种因素，如语言、应用所需的包数量等。

冷启动非常重要，尽管有些因素我们无法控制，但我们仍可以在自身方面做很多工作来尽可能缩短冷启动时间。

虽然您可以将 Nest 视为一个设计用于复杂企业应用的全功能框架，但它也**适用于更“简单”的应用**（或脚本）。例如，利用[独立应用程序](/standalone-applications)功能，您可以在简单的工作器、CRON 作业、CLI 或无服务器函数中利用 Nest 的依赖注入（DI）系统。

#### 基准测试

为了更好地理解在无服务器函数中使用 Nest 或其他知名库（如 `express`）的成本，我们来比较 Node 运行时运行以下脚本所需的时间：

```typescript
// #1 Express
import * as express from 'express';

async function bootstrap() {
  const app = express();
  app.get('/', (req, res) => res.send('Hello world!'));
  await new Promise<void>((resolve) => app.listen(3000, resolve));
}
bootstrap();

// #2 Nest（使用 @nestjs/platform-express）
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

// #3 Nest 作为独立应用程序（无 HTTP 服务器）
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  console.log(app.get(AppService).getHello());
}
bootstrap();

// #4 原始 Node.js 脚本
async function bootstrap() {
  console.log('Hello world!');
}
bootstrap();
```

对于所有这些脚本，我们使用了 `tsc`（TypeScript）编译器，因此代码保持未打包状态（未使用 `webpack`）。

|                                      |                   |
| ------------------------------------ | ----------------- |
| Express                              | 0.0079秒（7.9毫秒） |
| Nest 使用 `@nestjs/platform-express` | 0.1974秒（197.4毫秒）|
| Nest（独立应用程序）                 | 0.1117秒（111.7毫秒）|
| 原始 Node.js 脚本                    | 0.0071秒（7.1毫秒） |

> info **注意** 机器配置：MacBook Pro Mid 2014，2.5 GHz 四核 Intel Core i7，16 GB 1600 MHz DDR3，SSD。

现在，让我们重复所有基准测试，但这次使用 `webpack`（如果您安装了 [Nest CLI](/cli/overview)，可以运行 `nest build --webpack`）将我们的应用打包成单个可执行的 JavaScript 文件。不过，我们不使用 Nest CLI 自带的默认 `webpack` 配置，而是确保将所有依赖项（`node_modules`）一起打包，配置如下：

```javascript
module.exports = (options, webpack) => {
  const lazyImports = [
    '@nestjs/microservices/microservices-module',
    '@nestjs/websockets/socket-module',
  ];

  return {
    ...options,
    externals: [],
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        checkResource(resource) {
          if (lazyImports.includes(resource)) {
            try {
              require.resolve(resource);
            } catch (err) {
              return true;
            }
          }
          return false;
        },
      }),
    ],
  };
};
```

> info **提示** 要指示 Nest CLI 使用此配置，请在项目的根目录中创建一个新的 `webpack.config.js` 文件。

使用此配置，我们得到以下结果：

|                                      |                  |
| ------------------------------------ | ---------------- |
| Express                              | 0.0068秒（6.8毫秒） |
| Nest 使用 `@nestjs/platform-express` | 0.0815秒（81.5毫秒）|
| Nest（独立应用程序）                 | 0.0319秒（31.9毫秒）|
| 原始 Node.js 脚本                    | 0.0066秒（6.6毫秒） |

> info **注意** 机器配置：MacBook Pro Mid 2014，2.5 GHz 四核 Intel Core i7，16 GB 1600 MHz DDR3，SSD。

> info **提示** 您可以通过应用额外的代码压缩和优化技术（使用 `webpack` 插件等）进一步优化。

如您所见，编译方式（以及是否打包代码）至关重要，对整体启动时间有显著影响。使用 `webpack`，您可以将独立 Nest 应用程序（包含一个模块、控制器和服务的启动项目）的启动时间平均降至约 32 毫秒，而基于 Express 的常规 HTTP NestJS 应用的启动时间可降至约 81.5 毫秒。

对于更复杂的 Nest 应用，例如包含 10 个资源（通过 `$ nest g resource` 示意图生成 = 10 个模块、10 个控制器、10 个服务、20 个 DTO 类、50 个 HTTP 端点 + `AppModule`），在 MacBook Pro Mid 2014，2.5 GHz 四核 Intel Core i7，16 GB 1600 MHz DDR3，SSD 上的整体启动时间约为 0.1298 秒（129.8 毫秒）。无论如何，将单体应用作为无服务器函数运行通常意义不大，因此请将此基准测试更多地视为应用程序增长时启动时间可能增加的示例。

#### 运行时优化

到目前为止，我们讨论了编译时优化。这些优化与您在应用程序中定义提供者和加载 Nest 模块的方式无关，但随着应用程序规模增大，这些方式起着至关重要的作用。

例如，假设有一个定义为[异步提供者](/fundamentals/async-providers)的数据库连接。异步提供者旨在延迟应用程序启动，直到一个或多个异步任务完成。这意味着，如果您的无服务器函数平均需要 2 秒来连接数据库（在启动时），您的端点将需要至少额外两秒（因为它必须等待连接建立）才能发送响应（在冷启动且应用程序尚未运行的情况下）。

如您所见，在**无服务器环境**中，构建提供者的方式与启动时间的重要性有所不同。另一个很好的例子是，如果您在某些场景中使用 Redis 进行缓存。也许在这种情况下，您不应将 Redis 连接定义为异步提供者，因为即使此特定函数调用不需要它，它也会减慢启动时间。

此外，有时您可以使用 `LazyModuleLoader` 类延迟加载整个模块，如[本章](/fundamentals/lazy-loading-modules)所述。缓存也是一个很好的例子。假设您的应用程序有一个 `CacheModule`，内部连接到 Redis，并导出 `CacheService` 以与 Redis 存储交互。如果您并非所有潜在函数调用都需要它，您可以按需延迟加载它。这样，对于所有不需要缓存的调用，您将获得更快的启动时间（当发生冷启动时）。

```typescript
if (request.method === RequestMethod[RequestMethod.GET]) {
  const { CacheModule } = await import('./cache.module');
  const moduleRef = await this.lazyModuleLoader.load(() => CacheModule);

  const { CacheService } = await import('./cache.service');
  const cacheService = moduleRef.get(CacheService);

  return cacheService.get(ENDPOINT_KEY);
}
```

另一个很好的例子是 Webhook 或工作器，根据某些特定条件（例如输入参数），可能执行不同的操作。在这种情况下，您可以在路由处理程序中指定一个条件，延迟加载特定函数调用的适当模块，并仅延迟加载所有其他模块。

```typescript
if (workerType === WorkerType.A) {
  const { WorkerAModule } = await import('./worker-a.module');
  const moduleRef = await this.lazyModuleLoader.load(() => WorkerAModule);
  // ...
} else if (workerType === WorkerType.B) {
  const { WorkerBModule } = await import('./worker-b.module');
  const moduleRef = await this.lazyModuleLoader.load(() => WorkerBModule);
  // ...
}
```

#### 示例集成

您的应用程序入口文件（通常是 `main.ts` 文件）的编写方式**取决于多个因素**，因此**没有单一模板**适用于所有场景。例如，启动无服务器函数所需的初始化文件因云提供商（AWS、Azure、GCP 等）而异。此外，根据您是希望运行具有多个路由/端点的典型 HTTP 应用程序，还是仅提供单个路由（或执行特定代码部分），您的应用程序代码也会有所不同（例如，对于端点每函数方法，您可以使用 `NestFactory.createApplicationContext` 而不是启动 HTTP 服务器、设置中间件等）。

仅用于说明目的，我们将集成 Nest（使用 `@nestjs/platform-express` 并启动完整、功能齐全的 HTTP 路由器）与 [Serverless](https://www.serverless.com/) 框架（此案例中目标为 AWS Lambda）。如前所述，您的代码将因所选云提供商和许多其他因素而异。

首先，安装所需的包：

```bash
$ npm i @codegenie/serverless-express aws-lambda
$ npm i -D @types/aws-lambda serverless-offline
```

> info **提示** 为加快开发周期，我们安装 `serverless-offline` 插件来模拟 AWS λ 和 API Gateway。

安装完成后，创建 `serverless.yml` 文件以配置 Serverless 框架：

```yaml
service: serverless-example

plugins:
  - serverless-offline

provider:
  name: aws
  runtime: nodejs14.x

functions:
  main:
    handler: dist/main.handler
    events:
      - http:
          method: ANY
          path: /
      - http:
          method: ANY
          path: '{proxy+}'
```

> info **提示** 要了解更多关于 Serverless 框架的信息，请访问[官方文档](https://www.serverless.com/framework/docs/)。

完成此设置后，我们现在可以导航到 `main.ts` 文件，并使用所需的样板代码更新我们的启动代码：

```typescript
import { NestFactory } from '@nestjs/core';
import serverlessExpress from '@codegenie/serverless-express';
import { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';

let server: Handler;

async function bootstrap(): Promise<Handler> {
  const app = await NestFactory.create(AppModule);
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  server = server ?? (await bootstrap());
  return server(event, context, callback);
};
```

> info **提示** 要创建多个无服务器函数并在它们之间共享公共模块，我们推荐使用 [CLI 单仓库模式](/cli/monorepo#monorepo-mode)。

> warning **警告** 如果您使用 `@nestjs/swagger` 包，在无服务器函数上下文中需要一些额外步骤才能正常工作。查看此[线程](https://github.com/nestjs/swagger/issues/199)获取更多信息。

接下来，打开 `tsconfig.json` 文件，确保启用 `esModuleInterop` 选项，以便正确加载 `@codegenie/serverless-express` 包。

```json
{
  "compilerOptions": {
    ...
    "esModuleInterop": true
  }
}
```

现在我们可以构建我们的应用程序（使用 `nest build` 或 `tsc`），并使用 `serverless` CLI 在本地启动我们的 lambda 函数：

```bash
$ npm run build
$ npx serverless offline
```

应用程序运行后，打开浏览器并导航到 `http://localhost:3000/dev/[ANY_ROUTE]`（其中 `[ANY_ROUTE]` 是应用程序中注册的任何端点）。

在上面的部分中，我们已经展示了使用 `webpack` 并打包您的应用程序可以对整体启动时间产生显著影响。但是，要使它在此示例中工作，您必须在 `webpack.config.js` 文件中添加一些额外的配置。通常，为确保我们的 `handler` 函数被正确识别，我们必须将 `output.libraryTarget` 属性更改为 `commonjs2`。

```javascript
return {
  ...options,
  externals: [],
  output: {
    ...options.output,
    libraryTarget: 'commonjs2',
  },
  // ... 其余配置
};
```

完成此设置后，您现在可以使用 `$ nest build --webpack` 编译您的函数代码（然后使用 `$ npx serverless offline` 进行测试）。

还建议（但**非必需**，因为它会减慢构建过程）安装 `terser-webpack-plugin` 包，并覆盖其配置，以便在压缩生产构建时保留类名。不这样做可能会导致在应用程序中使用 `class-validator` 时出现不正确行为。

```javascript
const TerserPlugin = require('terser-webpack-plugin');

return {
  ...options,
  externals: [],
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
        },
      }),
    ],
  },
  output: {
    ...options.output,
    libraryTarget: 'commonjs2',
  },
  // ... 其余配置
};
```

#### 使用独立应用程序功能

或者，如果您希望保持函数非常轻量级，并且不需要任何 HTTP 相关功能（路由、守卫、拦截器、管道等），您可以仅使用 `NestFactory.createApplicationContext`（如前所述），而不是运行整个 HTTP 服务器（以及底层的 `express`），如下所示：

```typescript
@@filename(main)
import { HttpStatus } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';
import { AppService } from './app.service';

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const appService = appContext.get(AppService);

  return {
    body: appService.getHello(),
    statusCode: HttpStatus.OK,
  };
};
```

> info **提示** 请注意，`NestFactory.createApplicationContext` 不会使用增强器（守卫、拦截器等）包装控制器方法。为此，您必须使用 `NestFactory.create` 方法。

您还可以将 `event` 对象传递给，例如 `EventsService` 提供者，该提供者可以处理它并根据输入值和业务逻辑返回相应的值。

```typescript
export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const eventsService = appContext.get(EventsService);
  return eventsService.process(event);
};
```