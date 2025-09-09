### 注入作用域

对于来自不同编程语言背景的开发者来说，可能会惊讶地发现：在 Nest 中，几乎所有内容都在传入的请求间共享。我们有到数据库的连接池、具有全局状态的单例服务等。请记住，Node.js 并不遵循请求/响应的多线程无状态模型，即每个请求都由单独的线程处理。因此，在我们的应用中使用单例实例是完全**安全**的。

然而，在某些边缘情况下，基于请求的生命周期可能是期望的行为，例如 GraphQL 应用中的每请求缓存、请求追踪和多租户。注入作用域提供了一种机制来获取所需的提供者生命周期行为。

#### 提供者作用域

提供者可以具有以下任意作用域：

<table>
  <tr>
    <td><code>DEFAULT</code></td>
    <td>提供者的单个实例在整个应用中被共享。实例的生命周期直接绑定到应用生命周期。一旦应用启动完成，所有单例提供者都已被实例化。默认使用单例作用域。</td>
  </tr>
  <tr>
    <td><code>REQUEST</code></td>
    <td>为每个传入的<strong>请求</strong>专门创建一个新的提供者实例。该实例在请求处理完成后被垃圾回收。</td>
  </tr>
  <tr>
    <td><code>TRANSIENT</code></td>
    <td>瞬时提供者不在消费者之间共享。每个注入瞬时提供者的消费者都会收到一个全新的专用实例。</td>
  </tr>
</table>

> info **提示** 对于大多数用例，**推荐**使用单例作用域。在消费者和请求之间共享提供者意味着实例可以被缓存，并且其初始化仅在应用启动时发生一次。

#### 使用方法

通过向 `@Injectable()` 装饰器的选项对象传递 `scope` 属性来指定注入作用域：

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class CatsService {}
```

类似地，对于[自定义提供者](/fundamentals/custom-providers)，在提供者注册的长格式中设置 `scope` 属性：

```typescript
{
  provide: 'CACHE_MANAGER',
  useClass: CacheManager,
  scope: Scope.TRANSIENT,
}
```

> info **提示** 从 `@nestjs/common` 导入 `Scope` 枚举

单例作用域是默认的，无需声明。如果您确实希望将提供者声明为单例作用域，请使用 `Scope.DEFAULT` 值作为 `scope` 属性。

> warning **注意** WebSocket 网关不应使用请求作用域的提供者，因为它们必须作为单例运行。每个网关封装了一个真实的套接字，不能多次实例化。此限制同样适用于某些其他提供者，如 [_Passport 策略_](../security/authentication#request-scoped-strategies) 或 _Cron 控制器_。

#### 控制器作用域

控制器也可以有作用域，这适用于该控制器中声明的所有请求方法处理程序。与提供者作用域类似，控制器的作用域声明了其生命周期。对于请求作用域的控制器，每个传入请求都会创建一个新实例，并在请求处理完成后进行垃圾回收。

使用 `ControllerOptions` 对象的 `scope` 属性声明控制器作用域：

```typescript
@Controller({
  path: 'cats',
  scope: Scope.REQUEST,
})
export class CatsController {}
```

#### 作用域层级

`REQUEST` 作用域会沿着注入链向上冒泡。依赖于请求作用域提供者的控制器本身也会成为请求作用域。

想象以下依赖图：`CatsController <- CatsService <- CatsRepository`。如果 `CatsService` 是请求作用域的（而其他都是默认单例），那么 `CatsController` 将变为请求作用域，因为它依赖于注入的服务。不依赖的 `CatsRepository` 将保持单例作用域。

瞬时作用域的依赖不遵循此模式。如果单例作用域的 `DogsService` 注入了一个瞬时的 `LoggerService` 提供者，它将收到该提供者的一个新实例。然而，`DogsService` 将保持单例作用域，因此无论在哪里注入它，都**不会**解析为 `DogsService` 的新实例。如果需要这种行为，`DogsService` 也必须显式标记为 `TRANSIENT`。

<app-banner-courses></app-banner-courses>

#### 请求提供者

在基于 HTTP 服务器的应用中（例如使用 `@nestjs/platform-express` 或 `@nestjs/platform-fastify`），您可能希望在使用的请求作用域提供者中访问原始请求对象的引用。您可以通过注入 `REQUEST` 对象来实现这一点。

`REQUEST` 提供者本质上是请求作用域的，这意味着在使用它时无需显式指定 `REQUEST` 作用域。此外，即使您尝试这样做，也会被忽略。任何依赖于请求作用域提供者的提供者都会自动采用请求作用域，并且此行为无法更改。

```typescript
import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class CatsService {
  constructor(@Inject(REQUEST) private request: Request) {}
}
```

由于底层平台/协议的差异，对于微服务或 GraphQL 应用，访问传入请求的方式略有不同。在 [GraphQL](/graphql/quick-start) 应用中，您注入的是 `CONTEXT` 而不是 `REQUEST`：

```typescript
import { Injectable, Scope, Inject } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';

@Injectable({ scope: Scope.REQUEST })
export class CatsService {
  constructor(@Inject(CONTEXT) private context) {}
}
```

然后，您需要配置 `context` 值（在 `GraphQLModule` 中），使其包含 `request` 作为其属性。

#### 查询者提供者

如果您想获取构造提供者的类，例如在日志记录或指标提供者中，可以注入 `INQUIRER` 令牌。

```typescript
import { Inject, Injectable, Scope } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';

@Injectable({ scope: Scope.TRANSIENT })
export class HelloService {
  constructor(@Inject(INQUIRER) private parentClass: object) {}

  sayHello(message: string) {
    console.log(`${this.parentClass?.constructor?.name}: ${message}`);
  }
}
```

然后按如下方式使用：

```typescript
import { Injectable } from '@nestjs/common';
import { HelloService } from './hello.service';

@Injectable()
export class AppService {
  constructor(private helloService: HelloService) {}

  getRoot(): string {
    this.helloService.sayHello('我的名字是 getRoot');

    return 'Hello world!';
  }
}
```

在上面的示例中，当调用 `AppService#getRoot` 时，控制台将记录 `"AppService: 我的名字是 getRoot"`。

#### 性能

使用请求作用域的提供者会对应用性能产生影响。尽管 Nest 尝试尽可能多地缓存元数据，但它仍然必须在每个请求上创建您的类的实例。因此，这会减慢您的平均响应时间和整体基准测试结果。除非提供者必须是请求作用域的，否则强烈建议您使用默认的单例作用域。

> info **提示** 尽管这一切听起来相当令人担忧，但一个合理设计、利用请求作用域提供者的应用，其延迟不应减慢超过约 5%。

#### 持久化提供者

如上节所述，请求作用域的提供者可能会导致延迟增加，因为至少有一个请求作用域的提供者（注入到控制器实例中，或更深层 - 注入到其某个提供者中）会使控制器也成为请求作用域。这意味着必须为每个单独的请求重新创建（实例化）它（并在之后进行垃圾回收）。现在，这也意味着，例如对于并行处理的 30k 个请求，将会有 30k 个临时的控制器实例（及其请求作用域的提供者）。

拥有一个大多数提供者都依赖的通用提供者（如数据库连接或日志记录服务），会自动将所有那些提供者也转换为请求作用域的提供者。这在**多租户应用**中可能构成挑战，特别是对于那些具有中心请求作用域的“数据源”提供者的应用，该提供者从请求对象中获取头部/令牌，并根据其值检索相应的数据库连接/模式（特定于该租户）。

例如，假设您的应用交替被 10 个不同的客户使用。每个客户都有**自己专用的数据源**，并且您希望确保客户 A 永远无法访问客户 B 的数据库。实现此目的的一种方法是声明一个请求作用域的“数据源”提供者，该提供者基于请求对象确定“当前客户”并检索其对应的数据库。通过这种方法，您可以在几分钟内将您的应用转变为多租户应用。但是，这种方法的一个主要缺点是，由于您的应用大部分组件很可能依赖于“数据源”提供者，它们将隐式变为“请求作用域”，因此您无疑会看到应用性能受到影响。

但是，如果我们有更好的解决方案呢？由于我们只有 10 个客户，我们能否为每个客户拥有 10 个独立的 [DI 子树](/fundamentals/module-ref#resolving-scoped-providers)（而不是为每个请求重新创建每个树）？如果您的提供者不依赖于每个连续请求真正唯一的属性（例如请求 UUID），而是有一些特定的属性让我们可以聚合（分类）它们，那么就没有理由在每个传入请求上_重新创建 DI 子树_。

而这正是**持久化提供者**派上用场的时候。

在我们开始将提供者标记为持久化之前，我们必须首先注册一个**策略**，该策略指示 Nest 哪些是那些“公共请求属性”，提供将请求分组 - 将它们与其对应的 DI 子树关联起来的逻辑。

```typescript
import {
  HostComponentInfo,
  ContextId,
  ContextIdFactory,
  ContextIdStrategy,
} from '@nestjs/core';
import { Request } from 'express';

const tenants = new Map<string, ContextId>();

export class AggregateByTenantContextIdStrategy implements ContextIdStrategy {
  attach(contextId: ContextId, request: Request) {
    const tenantId = request.headers['x-tenant-id'] as string;
    let tenantSubTreeId: ContextId;

    if (tenants.has(tenantId)) {
      tenantSubTreeId = tenants.get(tenantId);
    } else {
      tenantSubTreeId = ContextIdFactory.create();
      tenants.set(tenantId, tenantSubTreeId);
    }

    // 如果树不是持久化的，返回原始的 "contextId" 对象
    return (info: HostComponentInfo) =>
      info.isTreeDurable ? tenantSubTreeId : contextId;
  }
}
```

> info **提示** 与请求作用域类似，持久化会沿着注入链向上冒泡。这意味着如果 A 依赖于被标记为 `durable` 的 B，A 也会隐式变为持久化（除非为 A 提供者显式将 `durable` 设置为 `false`）。

> warning **警告** 请注意，此策略不适用于操作大量租户的应用。

从 `attach` 方法返回的值指示 Nest 对于给定的宿主应使用什么上下文标识符。在这种情况下，我们指定当宿主组件（例如请求作用域的控制器）被标记为持久化时（您可以在下面了解如何将提供者标记为持久化），应使用 `tenantSubTreeId` 而不是原始的、自动生成的 `contextId` 对象。此外，在上面的示例中，**不会注册**有效负载（其中有效负载 = 表示子树“根” - 父级的 `REQUEST`/`CONTEXT` 提供者）。

如果您想为持久化树注册有效负载，请改用以下构造：

```typescript
// `AggregateByTenantContextIdStrategy#attach` 方法的返回：
return {
  resolve: (info: HostComponentInfo) =>
    info.isTreeDurable ? tenantSubTreeId : contextId,
  payload: { tenantId },
};
```

现在，无论何时使用 `@Inject(REQUEST)`/`@Inject(CONTEXT)` 注入 `REQUEST` 提供者（或 GraphQL 应用的 `CONTEXT`），都会注入 `payload` 对象（在此情况下由单个属性 `tenantId` 组成）。

好了，有了这个策略，您可以在代码中的某个地方注册它（因为它全局适用），例如，您可以将其放在 `main.ts` 文件中：

```typescript
ContextIdFactory.apply(new AggregateByTenantContextIdStrategy());
```

> info **提示** `ContextIdFactory` 类从 `@nestjs/core` 包导入。

只要注册发生在任何请求到达您的应用之前，一切都会按预期工作。

最后，要将常规提供者转换为持久化提供者，只需将 `durable` 标志设置为 `true` 并将其作用域更改为 `Scope.REQUEST`（如果注入链中已有 REQUEST 作用域，则不需要）：

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST, durable: true })
export class CatsService {}
```

类似地，对于[自定义提供者](/fundamentals/custom-providers)，在提供者注册的长格式中设置 `durable` 属性：

```typescript
{
  provide: 'foobar',
  useFactory: () => { ... },
  scope: Scope.REQUEST,
  durable: true,
}
```