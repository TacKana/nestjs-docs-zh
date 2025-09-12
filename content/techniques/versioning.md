### 版本控制

> info **提示** 本章节仅适用于基于 HTTP 的应用程序。

版本控制允许你在同一个应用程序中运行控制器或单个路由的**不同版本**。应用程序经常发生变化，在需要进行破坏性变更的同时，仍需要支持应用程序的先前版本，这种情况并不罕见。

支持 4 种类型的版本控制：

<table>
  <tr>
    <td><a href='techniques/versioning#uri-versioning-type'><code>URI 版本控制</code></a></td>
    <td>版本将通过请求的 URI 传递（默认）</td>
  </tr>
  <tr>
    <td><a href='techniques/versioning#header-versioning-type'><code>头部版本控制</code></a></td>
    <td>自定义请求头将指定版本</td>
  </tr>
  <tr>
    <td><a href='techniques/versioning#media-type-versioning-type'><code>媒体类型版本控制</code></a></td>
    <td>请求的 <code>Accept</code> 头部将指定版本</td>
  </tr>
  <tr>
    <td><a href='techniques/versioning#custom-versioning-type'><code>自定义版本控制</code></a></td>
    <td>请求的任何方面都可能用于指定版本。提供了一个自定义函数来提取所述版本。</td>
  </tr>
</table>

#### URI 版本控制类型

URI 版本控制使用请求 URI 中传递的版本，例如 `https://example.com/v1/route` 和 `https://example.com/v2/route`。

> warning **注意** 使用 URI 版本控制时，版本将自动添加到 URI 中，位于 <a href="faq/global-prefix">全局路径前缀</a>（如果存在）之后，以及任何控制器或路由路径之前。

要为你的应用程序启用 URI 版本控制，请执行以下操作：

```typescript
@@filename(main)
const app = await NestFactory.create(AppModule);
// 或者 "app.enableVersioning()"
app.enableVersioning({
  type: VersioningType.URI,
});
await app.listen(process.env.PORT ?? 3000);
```

> warning **注意** URI 中的版本默认会自动添加 `v` 前缀，但可以通过设置 `prefix` 键来配置所需的前缀，或者设置为 `false` 以禁用它。

> info **提示** `VersioningType` 枚举可用于 `type` 属性，并从 `@nestjs/common` 包导入。

#### 头部版本控制类型

头部版本控制使用自定义的用户指定请求头来指定版本，其中头部的值将是请求要使用的版本。

头部版本控制的 HTTP 请求示例：

要为你的应用程序启用**头部版本控制**，请执行以下操作：

```typescript
@@filename(main)
const app = await NestFactory.create(AppModule);
app.enableVersioning({
  type: VersioningType.HEADER,
  header: 'Custom-Header',
});
await app.listen(process.env.PORT ?? 3000);
```

`header` 属性应该是包含请求版本的头部名称。

> info **提示** `VersioningType` 枚举可用于 `type` 属性，并从 `@nestjs/common` 包导入。

#### 媒体类型版本控制类型

媒体类型版本控制使用请求的 `Accept` 头部来指定版本。

在 `Accept` 头部中，版本将与媒体类型用分号 `;` 分隔。然后应包含一个键值对，表示请求要使用的版本，例如 `Accept: application/json;v=2`。在确定版本时，键更多地被视为前缀，并将配置为包含键和分隔符。

要为你的应用程序启用**媒体类型版本控制**，请执行以下操作：

```typescript
@@filename(main)
const app = await NestFactory.create(AppModule);
app.enableVersioning({
  type: VersioningType.MEDIA_TYPE,
  key: 'v=',
});
await app.listen(process.env.PORT ?? 3000);
```

`key` 属性应该是包含版本的键值对的键和分隔符。对于示例 `Accept: application/json;v=2`，`key` 属性应设置为 `v=`。

> info **提示** `VersioningType` 枚举可用于 `type` 属性，并从 `@nestjs/common` 包导入。

#### 自定义版本控制类型

自定义版本控制使用请求的任何方面来指定版本（或多个版本）。传入的请求使用 `extractor` 函数进行分析，该函数返回一个字符串或字符串数组。

如果请求者提供了多个版本，提取器函数可以返回一个字符串数组，按版本从最高到最低的顺序排序。版本按从高到低的顺序与路由匹配。

如果从 `extractor` 返回空字符串或数组，则不匹配任何路由，并返回 404。

例如，如果传入的请求指定它支持版本 `1`、`2` 和 `3`，则 `extractor` **必须**返回 `[3, 2, 1]`。这确保首先选择最高可能的路由版本。

如果提取了版本 `[3, 2, 1]`，但路由仅存在版本 `2` 和 `1`，则选择匹配版本 `2` 的路由（版本 `3` 自动忽略）。

> warning **注意** 由于设计限制，基于从 `extractor` 返回的数组选择最高匹配版本**在 Express 适配器中不可靠工作**。单一版本（字符串或单元素数组）在 Express 中工作良好。Fastify 正确支持最高匹配版本选择和单一版本选择。

要为你的应用程序启用**自定义版本控制**，创建一个 `extractor` 函数并将其传递到你的应用程序中，如下所示：

```typescript
@@filename(main)
// 示例提取器，从自定义头部提取版本列表并将其转换为排序数组。
// 此示例使用 Fastify，但 Express 请求可以类似方式处理。
const extractor = (request: FastifyRequest): string | string[] =>
  [request.headers['custom-versioning-field'] ?? '']
     .flatMap(v => v.split(','))
     .filter(v => !!v)
     .sort()
     .reverse()

const app = await NestFactory.create(AppModule);
app.enableVersioning({
  type: VersioningType.CUSTOM,
  extractor,
});
await app.listen(process.env.PORT ?? 3000);
```

#### 用法

版本控制允许你对控制器、单个路由进行版本控制，并提供一种方式让某些资源选择退出版本控制。无论你的应用程序使用哪种版本控制类型，版本控制的用法都是相同的。

> warning **注意** 如果为应用程序启用了版本控制，但控制器或路由未指定版本，则对该控制器/路由的任何请求将返回 `404` 响应状态。同样，如果收到的请求包含没有相应控制器或路由的版本，也将返回 `404` 响应状态。

#### 控制器版本

可以将版本应用于控制器，设置控制器内所有路由的版本。

要向控制器添加版本，请执行以下操作：

```typescript
@@filename(cats.controller)
@Controller({
  version: '1',
})
export class CatsControllerV1 {
  @Get('cats')
  findAll(): string {
    return '此操作返回版本 1 的所有猫';
  }
}
@@switch
@Controller({
  version: '1',
})
export class CatsControllerV1 {
  @Get('cats')
  findAll() {
    return '此操作返回版本 1 的所有猫';
  }
}
```

#### 路由版本

可以将版本应用于单个路由。此版本将覆盖可能影响路由的任何其他版本，例如控制器版本。

要向单个路由添加版本，请执行以下操作：

```typescript
@@filename(cats.controller)
import { Controller, Get, Version } from '@nestjs/common';

@Controller()
export class CatsController {
  @Version('1')
  @Get('cats')
  findAllV1(): string {
    return '此操作返回版本 1 的所有猫';
  }

  @Version('2')
  @Get('cats')
  findAllV2(): string {
    return '此操作返回版本 2 的所有猫';
  }
}
@@switch
import { Controller, Get, Version } from '@nestjs/common';

@Controller()
export class CatsController {
  @Version('1')
  @Get('cats')
  findAllV1() {
    return '此操作返回版本 1 的所有猫';
  }

  @Version('2')
  @Get('cats')
  findAllV2() {
    return '此操作返回版本 2 的所有猫';
  }
}
```

#### 多版本

可以将多个版本应用于控制器或路由。要使用多个版本，你需要将版本设置为数组。

要添加多个版本，请执行以下操作：

```typescript
@@filename(cats.controller)
@Controller({
  version: ['1', '2'],
})
export class CatsController {
  @Get('cats')
  findAll(): string {
    return '此操作返回版本 1 或 2 的所有猫';
  }
}
@@switch
@Controller({
  version: ['1', '2'],
})
export class CatsController {
  @Get('cats')
  findAll() {
    return '此操作返回版本 1 或 2 的所有猫';
  }
}
```

#### 版本“中立”

某些控制器或路由可能不关心版本，并且无论版本如何都具有相同的功能。为了适应这一点，可以将版本设置为 `VERSION_NEUTRAL` 符号。

无论请求中发送的版本如何，传入的请求都将映射到 `VERSION_NEUTRAL` 控制器或路由，此外，如果请求根本不包含版本，也会如此。

> warning **注意** 对于 URI 版本控制，`VERSION_NEUTRAL` 资源在 URI 中不会存在版本。

要添加版本中立的控制器或路由，请执行以下操作：

```typescript
@@filename(cats.controller)
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({
  version: VERSION_NEUTRAL,
})
export class CatsController {
  @Get('cats')
  findAll(): string {
    return '此操作返回所有猫，无论版本如何';
  }
}
@@switch
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({
  version: VERSION_NEUTRAL,
})
export class CatsController {
  @Get('cats')
  findAll() {
    return '此操作返回所有猫，无论版本如何';
  }
}
```

#### 全局默认版本

如果你不想为每个控制器或单个路由提供版本，或者如果你想将特定版本设置为所有未指定版本的控制器/路由的默认版本，可以如下设置 `defaultVersion`：

```typescript
@@filename(main)
app.enableVersioning({
  // ...
  defaultVersion: '1'
  // 或
  defaultVersion: ['1', '2']
  // 或
  defaultVersion: VERSION_NEUTRAL
});
```

#### 中间件版本控制

[中间件](/middleware) 也可以使用版本控制元数据来为特定路由版本配置中间件。为此，将版本号作为 `MiddlewareConsumer.forRoutes()` 方法的参数之一提供：

```typescript
@@filename(app.module)
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CatsModule } from './cats/cats.module';
import { CatsController } from './cats/cats.controller';

@Module({
  imports: [CatsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: 'cats', method: RequestMethod.GET, version: '2' });
  }
}
```

通过上面的代码，`LoggerMiddleware` 将仅应用于版本 '2' 的 `/cats` 端点。

> info **注意** 中间件适用于本节中描述的任何版本控制类型：`URI`、`Header`、`Media Type` 或 `Custom`。
