### 会话（Session）

**HTTP 会话（HTTP sessions）** 提供了一种在多个请求之间存储用户信息的方法，这对于 [MVC](/techniques/mvc) 应用程序特别有用。

#### 与 Express 配合使用（默认）

首先安装 [所需的包](https://github.com/expressjs/session)（TypeScript 用户还需安装其类型定义）：

```shell
$ npm i express-session
$ npm i -D @types/express-session
```

安装完成后，将 `express-session` 中间件作为全局中间件应用（例如，在 `main.ts` 文件中）。

```typescript
import * as session from 'express-session';
// 在初始化文件的某个位置
app.use(
  session({
    secret: 'my-secret',
    resave: false,
    saveUninitialized: false,
  }),
);
```

> warning **注意** 默认的服务器端会话存储特意未设计用于生产环境。在大多数情况下，它会内存泄漏，无法扩展到单个进程之外，并且仅用于调试和开发。更多信息请参阅 [官方仓库](https://github.com/expressjs/session)。

`secret` 用于签署会话 ID cookie。这可以是一个字符串（单个密钥）或一个包含多个密钥的数组。如果提供了密钥数组，则只有第一个元素会用于签署会话 ID cookie，而在验证请求中的签名时会考虑所有元素。密钥本身不应易于人工解析，最好是一组随机字符。

启用 `resave` 选项会强制将会话重新保存到会话存储中，即使会话在请求期间从未被修改过。默认值为 `true`，但使用默认值已被弃用，因为默认值将来会更改。

同样，启用 `saveUninitialized` 选项会强制将“未初始化”的会话保存到存储中。当会话是新的但未被修改时，即为未初始化。选择 `false` 对于实现登录会话、减少服务器存储使用或遵守设置 cookie 前需要获得许可的法律很有用。选择 `false` 还有助于解决客户端在没有会话的情况下发出多个并行请求时的竞争条件问题（[来源](https://github.com/expressjs/session#saveuninitialized)）。

您可以向 `session` 中间件传递其他几个选项，有关更多信息，请参阅 [API 文档](https://github.com/expressjs/session#options)。

> info **提示** 请注意，`secure: true` 是一个推荐的选项。但是，它要求网站启用 HTTPS，即安全 cookie 需要 HTTPS。如果设置了 secure，而您通过 HTTP 访问您的站点，则不会设置 cookie。如果您的 node.js  behind 代理并且使用 `secure: true`，则需要在 express 中设置 `"trust proxy"`。

完成这些设置后，您现在可以在路由处理程序中设置和读取会话值，如下所示：

```typescript
@Get()
findAll(@Req() request: Request) {
  request.session.visits = request.session.visits ? request.session.visits + 1 : 1;
}
```

> info **提示** `@Req()` 装饰器从 `@nestjs/common` 导入，而 `Request` 从 `express` 包导入。

或者，您可以使用 `@Session()` 装饰器从请求中提取会话对象，如下所示：

```typescript
@Get()
findAll(@Session() session: Record<string, any>) {
  session.visits = session.visits ? session.visits + 1 : 1;
}
```

> info **提示** `@Session()` 装饰器从 `@nestjs/common` 包导入。

#### 与 Fastify 配合使用

首先安装所需的包：

```shell
$ npm i @fastify/secure-session
```

安装完成后，注册 `fastify-secure-session` 插件：

```typescript
import secureSession from '@fastify/secure-session';

// 在初始化文件的某个位置
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
);
await app.register(secureSession, {
  secret: 'averylogphrasebiggerthanthirtytwochars',
  salt: 'mq9hDxBVDbspDR6n',
});
```

> info **提示** 您还可以预生成密钥（[参见说明](https://github.com/fastify/fastify-secure-session)）或使用 [密钥轮换](https://github.com/fastify/fastify-secure-session#using-keys-with-key-rotation)。

有关可用选项的更多信息，请参阅 [官方仓库](https://github.com/fastify/fastify-secure-session)。

完成这些设置后，您现在可以在路由处理程序中设置和读取会话值，如下所示：

```typescript
@Get()
findAll(@Req() request: FastifyRequest) {
  const visits = request.session.get('visits');
  request.session.set('visits', visits ? visits + 1 : 1);
}
```

或者，您可以使用 `@Session()` 装饰器从请求中提取会话对象，如下所示：

```typescript
@Get()
findAll(@Session() session: secureSession.Session) {
  const visits = session.get('visits');
  session.set('visits', visits ? visits + 1 : 1);
}
```

> info **提示** `@Session()` 装饰器从 `@nestjs/common` 导入，而 `secureSession.Session` 从 `@fastify/secure-session` 包导入（导入语句：`import * as secureSession from '@fastify/secure-session'`）。