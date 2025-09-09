### 压缩功能

压缩技术能显著减小响应体的大小，从而提升 Web 应用程序的响应速度。

对于生产环境中的**高流量**网站，强烈建议将压缩任务从应用服务器卸载——通常交由反向代理（例如 Nginx）处理。在这种情况下，不应使用压缩中间件。

#### 在 Express（默认）中使用

利用 [compression](https://github.com/expressjs/compression) 中间件包来启用 gzip 压缩功能。

首先安装所需的包：

```bash
$ npm i --save compression
$ npm i --save-dev @types/compression
```

安装完成后，将压缩中间件作为全局中间件应用。

```typescript
import * as compression from 'compression';
// 在你的初始化文件中的某个位置
app.use(compression());
```

#### 在 Fastify 中使用

如果使用 `FastifyAdapter`，你需要使用 [fastify-compress](https://github.com/fastify/fastify-compress)：

```bash
$ npm i --save @fastify/compress
```

安装完成后，将 `@fastify/compress` 中间件作为全局中间件应用。

> warning **警告** 请确保在创建应用时使用 `NestFastifyApplication` 类型。否则，你将无法使用 `register` 方法来应用压缩中间件。

```typescript
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import compression from '@fastify/compress';

// 在 bootstrap() 函数内部
const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
await app.register(compression);
```

默认情况下，当浏览器表明支持 Brotli 编码时（Node >= 11.7.0），`@fastify/compress` 会使用 Brotli 压缩算法。尽管 Brotli 在压缩率方面非常高效，但其压缩速度可能较慢。默认情况下，Brotli 设置的最大压缩质量为 11，但可以通过调整 `BROTLI_PARAM_QUALITY` 参数（范围从 0 到 11）来在压缩质量和压缩时间之间做出权衡，这需要精细调整以优化空间和时间性能。以下是一个设置质量为 4 的示例：

```typescript
import { constants } from 'zlib';
// 在你的初始化文件中的某个位置
await app.register(compression, { brotliOptions: { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } } });
```

为了简化操作，你可能希望告诉 `fastify-compress` 仅使用 deflate 和 gzip 来压缩响应；这样虽然响应体积可能会变大，但传输速度会显著加快。

要指定编码方式，请向 `app.register` 提供第二个参数：

```typescript
await app.register(compression, { encodings: ['gzip', 'deflate'] });
```

上述代码指示 `fastify-compress` 仅使用 gzip 和 deflate 编码，并在客户端同时支持两者时优先选择 gzip。