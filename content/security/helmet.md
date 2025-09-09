### Helmet（头盔）

[Helmet](https://github.com/helmetjs/helmet) 能够通过适当设置 HTTP 头来帮助您的应用防范一些众所周知的网络漏洞。通常来说，Helmet 只是一系列较小的中间件函数的集合，这些函数负责设置与安全相关的 HTTP 头（了解更多信息请阅读[此处](https://github.com/helmetjs/helmet#how-it-works)）。

> info **提示** 请注意，将 `helmet` 作为全局中间件应用或注册时，必须在其他调用 `app.use()` 或可能调用 `app.use()` 的设置函数之前进行。这是因为底层平台（即 Express 或 Fastify）的工作原理决定了中间件/路由的定义顺序很重要。如果您在定义路由之后使用像 `helmet` 或 `cors` 这样的中间件，那么该中间件将不会应用于该路由，而只会应用于在中间件之后定义的路由。

#### 在 Express（默认）中使用

首先安装所需的包。

```bash
$ npm i --save helmet
```

安装完成后，将其作为全局中间件应用。

```typescript
import helmet from 'helmet';
// 在初始化文件的某个位置
app.use(helmet());
```

> warning **警告** 当同时使用 `helmet`、`@apollo/server`（4.x 版本）以及 [Apollo Sandbox](https://docs.nestjs.com/graphql/quick-start#apollo-sandbox) 时，Apollo Sandbox 的 [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) 可能会出现问题。要解决此问题，请按如下方式配置 CSP：
>
> ```typescript
> app.use(helmet({
>   crossOriginEmbedderPolicy: false,
>   contentSecurityPolicy: {
>     directives: {
>       imgSrc: [`'self'`, 'data:', 'apollo-server-landing-page.cdn.apollographql.com'],
>       scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
>       manifestSrc: [`'self'`, 'apollo-server-landing-page.cdn.apollographql.com'],
>       frameSrc: [`'self'`, 'sandbox.embed.apollographql.com'],
>     },
>   },
> }));

#### 在 Fastify 中使用

如果您使用的是 `FastifyAdapter`，请安装 [@fastify/helmet](https://github.com/fastify/fastify-helmet) 包：

```bash
$ npm i --save @fastify/helmet
```

[fastify-helmet](https://github.com/fastify/fastify-helmet) 不应作为中间件使用，而应作为 [Fastify 插件](https://www.fastify.io/docs/latest/Reference/Plugins/)使用，即通过 `app.register()` 方法注册：

```typescript
import helmet from '@fastify/helmet'
// 在初始化文件的某个位置
await app.register(helmet)
```

> warning **警告** 当同时使用 `apollo-server-fastify` 和 `@fastify/helmet` 时，GraphQL  playground 的 [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) 可能会出现问题。为解决这一冲突，请按如下方式配置 CSP：
>
> ```typescript
> await app.register(fastifyHelmet, {
>    contentSecurityPolicy: {
>      directives: {
>        defaultSrc: [`'self'`, 'unpkg.com'],
>        styleSrc: [
>          `'self'`,
>          `'unsafe-inline'`,
>          'cdn.jsdelivr.net',
>          'fonts.googleapis.com',
>          'unpkg.com',
>        ],
>        fontSrc: [`'self'`, 'fonts.gstatic.com', 'data:'],
>        imgSrc: [`'self'`, 'data:', 'cdn.jsdelivr.net'],
>        scriptSrc: [
>          `'self'`,
>          `https: 'unsafe-inline'`,
>          `cdn.jsdelivr.net`,
>          `'unsafe-eval'`,
>        ],
>      },
>    },
>  });
>
> // 如果您完全不打算使用 CSP，可以这样设置：
> await app.register(fastifyHelmet, {
>   contentSecurityPolicy: false,
> });
> ```