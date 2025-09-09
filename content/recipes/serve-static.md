### 静态资源服务

为了实现像单页应用（SPA）那样的静态内容服务，我们可以使用 [`@nestjs/serve-static`](https://www.npmjs.com/package/@nestjs/serve-static) 包中的 `ServeStaticModule`。

#### 安装

首先需要安装所需的包：

```bash
$ npm install --save @nestjs/serve-static
```

#### 引导

安装完成后，我们可以将 `ServeStaticModule` 导入到根模块 `AppModule` 中，并通过向 `forRoot()` 方法传入配置对象来进行配置。

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

配置完成后，构建静态网站并将其内容放置在 `rootPath` 属性指定的位置。

#### 配置

[ServeStaticModule](https://github.com/nestjs/serve-static) 可以通过多种选项进行配置，以自定义其行为。
你可以设置渲染静态应用的路径，指定排除的路径，启用或禁用设置 Cache-Control 响应头等。完整选项列表请参见[此处](https://github.com/nestjs/serve-static/blob/master/lib/interfaces/serve-static-options.interface.ts)。

> warning **注意** 静态应用的默认 `renderPath` 是 `*`（所有路径），该模块将响应发送 "index.html" 文件。
> 这使你可以为 SPA 创建客户端路由。控制器中指定的路径将回退到服务器。
> 你可以通过设置 `serveRoot`、`renderPath` 并结合其他选项来改变这一行为。
> 此外，在 Fastify 适配器中实现了 `serveStaticOptions.fallthrough` 选项，以模拟 Express 的穿透行为，需要将其设置为 `true`，以便为不存在的路由发送 `index.html` 而不是 404 错误。

#### 示例

可用的工作示例请参见[此处](https://github.com/nestjs/nest/tree/master/sample/24-serve-static)。