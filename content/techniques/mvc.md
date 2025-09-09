### 模型-视图-控制器（Model-View-Controller）

Nest 默认使用 [Express](https://github.com/expressjs/express) 库作为底层框架。因此，在 Express 中使用 MVC（模型-视图-控制器）模式的每种技术同样适用于 Nest。

首先，使用 [CLI](https://github.com/nestjs/nest-cli) 工具搭建一个简单的 Nest 应用：

```bash
$ npm i -g @nestjs/cli
$ nest new project
```

为了创建 MVC 应用，我们还需要一个[模板引擎](https://expressjs.com/en/guide/using-template-engines.html)来渲染 HTML 视图：

```bash
$ npm install --save hbs
```

这里我们使用了 `hbs`（[Handlebars](https://github.com/pillarjs/hbs#readme)）引擎，不过你也可以根据需求选择其他引擎。安装完成后，我们需要使用以下代码配置 express 实例：

```typescript
@@filename(main)
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
  );

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
@@switch
import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
  );

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

我们告诉 [Express](https://github.com/expressjs/express)，`public` 目录用于存储静态资源，`views` 目录包含模板，并且使用 `hbs` 模板引擎来渲染 HTML 输出。

#### 模板渲染

现在，创建一个 `views` 目录并在其中创建 `index.hbs` 模板。在模板中，我们将打印从控制器传递过来的 `message`：

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>App</title>
  </head>
  <body>
    {{ "{{ message }\}" }}
  </body>
</html>
```

接下来，打开 `app.controller` 文件，并用以下代码替换 `root()` 方法：

```typescript
@@filename(app.controller)
import { Get, Controller, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('index')
  root() {
    return { message: 'Hello world!' };
  }
}
```

在这段代码中，我们在 `@Render()` 装饰器中指定要使用的模板，路由处理器方法的返回值会传递给模板进行渲染。注意，返回值是一个包含 `message` 属性的对象，这与我们在模板中创建的 `message` 占位符相匹配。

当应用运行时，打开浏览器并访问 `http://localhost:3000`。你应该会看到 `Hello world!` 消息。

#### 动态模板渲染

如果应用逻辑必须动态决定渲染哪个模板，那么我们应该使用 `@Res()` 装饰器，并在路由处理器中提供视图名称，而不是在 `@Render()` 装饰器中指定：

> info **提示** 当 Nest 检测到 `@Res()` 装饰器时，它会注入特定库的 `response` 对象。我们可以使用这个对象来动态渲染模板。了解更多关于 `response` 对象 API 的信息，请参阅[这里](https://expressjs.com/en/api.html)。

```typescript
@@filename(app.controller)
import { Get, Controller, Res, Render } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private appService: AppService) {}

  @Get()
  root(@Res() res: Response) {
    return res.render(
      this.appService.getViewName(),
      { message: 'Hello world!' },
    );
  }
}
```

#### 示例

一个可运行的示例可以在[这里](https://github.com/nestjs/nest/tree/master/sample/15-mvc)找到。

#### Fastify

正如[本章](/techniques/performance)所提到的，我们可以将任何兼容的 HTTP 提供者与 Nest 一起使用。[Fastify](https://github.com/fastify/fastify) 就是这样一个库。为了使用 Fastify 创建 MVC 应用，我们需要安装以下包：

```bash
$ npm i --save @fastify/static @fastify/view handlebars
```

接下来的步骤与使用 Express 的过程几乎相同，只有一些特定于平台的微小差异。安装完成后，打开 `main.ts` 文件并更新其内容：

```typescript
@@filename(main)
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.useStaticAssets({
    root: join(__dirname, '..', 'public'),
    prefix: '/public/',
  });
  app.setViewEngine({
    engine: {
      handlebars: require('handlebars'),
    },
    templates: join(__dirname, '..', 'views'),
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
@@switch
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());
  app.useStaticAssets({
    root: join(__dirname, '..', 'public'),
    prefix: '/public/',
  });
  app.setViewEngine({
    engine: {
      handlebars: require('handlebars'),
    },
    templates: join(__dirname, '..', 'views'),
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

Fastify 的 API 有一些不同，但这些方法调用的最终结果是相同的。一个显著的区别是，使用 Fastify 时，传递给 `@Render()` 装饰器的模板名称必须包含文件扩展名。

以下是如何设置：

```typescript
@@filename(app.controller)
import { Get, Controller, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('index.hbs')
  root() {
    return { message: 'Hello world!' };
  }
}
```

或者，你也可以使用 `@Res()` 装饰器直接注入响应对象，并指定要渲染的视图，如下所示：

```typescript
import { Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Get()
root(@Res() res: FastifyReply) {
  return res.view('index.hbs', { title: 'Hello world!' });
}
```

当应用运行时，打开浏览器并访问 `http://localhost:3000`。你应该会看到 `Hello world!` 消息。

#### 示例

一个可运行的示例可以在[这里](https://github.com/nestjs/nest/tree/master/sample/17-mvc-fastify)找到。