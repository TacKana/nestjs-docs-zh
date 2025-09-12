### 执行上下文

Nest 提供了多个实用工具类，帮助开发者轻松编写能在多种应用上下文中工作的应用程序（例如基于 Nest HTTP 服务器的应用、微服务和 WebSockets 应用上下文）。这些工具提供了关于当前执行上下文的信息，可用于构建通用的[守卫（guards）](/guards)、[过滤器（filters）](/exception-filters)和[拦截器（interceptors）](/interceptors)，这些组件能够在广泛的控制器、方法和执行上下文中使用。

本章将介绍两个这样的类：`ArgumentsHost` 和 `ExecutionContext`。

#### ArgumentsHost 类

`ArgumentsHost` 类提供了检索传递给处理器的参数的方法。它允许选择合适的上下文（例如 HTTP、RPC（微服务）或 WebSockets）来获取参数。框架会在你可能需要访问的地方提供 `ArgumentsHost` 的实例，通常以 `host` 参数的形式引用。例如，[异常过滤器](/exception-filters#arguments-host)的 `catch()` 方法会传入一个 `ArgumentsHost` 实例。

`ArgumentsHost` 本质上是对处理器参数的一种抽象。例如，对于 HTTP 服务器应用（当使用 `@nestjs/platform-express` 时），`host` 对象封装了 Express 的 `[request, response, next]` 数组，其中 `request` 是请求对象，`response` 是响应对象，`next` 是控制应用请求-响应循环的函数。另一方面，对于 [GraphQL](/graphql/quick-start) 应用，`host` 对象包含 `[root, args, context, info]` 数组。

#### 当前应用上下文

在构建旨在跨多个应用上下文运行的通用[守卫](/guards)、[过滤器](/exception-filters)和[拦截器](/interceptors)时，我们需要一种方法来确定当前方法正在运行的应用类型。可以通过 `ArgumentsHost` 的 `getType()` 方法来实现：

```typescript
if (host.getType() === 'http') {
  // 执行仅对常规 HTTP 请求（REST）上下文重要的操作
} else if (host.getType() === 'rpc') {
  // 执行仅对微服务请求上下文重要的操作
} else if (host.getType<GqlContextType>() === 'graphql') {
  // 执行仅对 GraphQL 请求上下文重要的操作
}
```

> **提示** `GqlContextType` 是从 `@nestjs/graphql` 包导入的。

通过获取应用类型，我们可以编写更通用的组件，如下所示。

#### 主机处理器参数

要检索传递给处理器的参数数组，一种方法是使用 host 对象的 `getArgs()` 方法。

```typescript
const [req, res, next] = host.getArgs();
```

你可以使用 `getArgByIndex()` 方法按索引获取特定参数：

```typescript
const request = host.getArgByIndex(0);
const response = host.getArgByIndex(1);
```

在这些示例中，我们通过索引检索了请求和响应对象，但通常不推荐这样做，因为它会将应用与特定的执行上下文耦合。相反，你可以使用 `host` 对象的实用工具方法之一切换到适合你应用的应用程序上下文，从而使代码更健壮和可重用。上下文切换的实用工具方法如下所示。

```typescript
/**
 * 切换到 RPC 上下文。
 */
switchToRpc(): RpcArgumentsHost;
/**
 * 切换到 HTTP 上下文。
 */
switchToHttp(): HttpArgumentsHost;
/**
 * 切换到 WebSockets 上下文。
 */
switchToWs(): WsArgumentsHost;
```

让我们使用 `switchToHttp()` 方法重写前面的示例。`host.switchToHttp()` 辅助调用返回一个适用于 HTTP 应用上下文的 `HttpArgumentsHost` 对象。`HttpArgumentsHost` 对象有两个有用的方法，可用于提取所需的对象。在此示例中，我们还使用 Express 类型断言来返回原生 Express 类型的对象：

```typescript
const ctx = host.switchToHttp();
const request = ctx.getRequest<Request>();
const response = ctx.getResponse<Response>();
```

类似地，`WsArgumentsHost` 和 `RpcArgumentsHost` 也有方法在微服务和 WebSockets 上下文中返回适当的对象。以下是 `WsArgumentsHost` 的方法：

```typescript
export interface WsArgumentsHost {
  /**
   * 返回数据对象。
   */
  getData<T>(): T;
  /**
   * 返回客户端对象。
   */
  getClient<T>(): T;
}
```

以下是 `RpcArgumentsHost` 的方法：

```typescript
export interface RpcArgumentsHost {
  /**
   * 返回数据对象。
   */
  getData<T>(): T;

  /**
   * 返回上下文对象。
   */
  getContext<T>(): T;
}
```

#### ExecutionContext 类

`ExecutionContext` 扩展了 `ArgumentsHost`，提供了关于当前执行过程的额外细节。与 `ArgumentsHost` 类似，Nest 在你可能需要的地方提供 `ExecutionContext` 的实例，例如在[守卫](/guards#execution-context)的 `canActivate()` 方法和[拦截器](/interceptors#execution-context)的 `intercept()` 方法中。它提供了以下方法：

```typescript
export interface ExecutionContext extends ArgumentsHost {
  /**
   * 返回当前处理器所属的控制器类的类型。
   */
  getClass<T>(): Type<T>;
  /**
   * 返回对将在请求管道中下一步调用的处理器（方法）的引用。
   */
  getHandler(): Function;
}
```

`getHandler()` 方法返回对即将调用的处理器的引用。`getClass()` 方法返回此特定处理器所属的 `Controller` 类的类型。例如，在 HTTP 上下文中，如果当前处理的请求是 `POST` 请求，绑定到 `CatsController` 上的 `create()` 方法，`getHandler()` 将返回对 `create()` 方法的引用，而 `getClass()` 将返回 `CatsController` 类（不是实例）。

```typescript
const methodKey = ctx.getHandler().name; // "create"
const className = ctx.getClass().name; // "CatsController"
```

能够访问当前类和处理器方法的引用提供了极大的灵活性。最重要的是，它使我们有机会在守卫或拦截器内部访问通过 `Reflector#createDecorator` 创建的装饰器或内置的 `@SetMetadata()` 装饰器设置的元数据。我们将在下面介绍这个用例。

<app-banner-enterprise></app-banner-enterprise>

#### 反射和元数据

Nest 提供了通过 `Reflector#createDecorator` 方法创建的装饰器以及内置的 `@SetMetadata()` 装饰器，将**自定义元数据**附加到路由处理器的能力。在本节中，我们将比较这两种方法，并了解如何在守卫或拦截器内部访问元数据。

要使用 `Reflector#createDecorator` 创建强类型装饰器，我们需要指定类型参数。例如，让我们创建一个 `Roles` 装饰器，它接受一个字符串数组作为参数。

```ts
@@filename(roles.decorator)
import { Reflector } from '@nestjs/core';

export const Roles = Reflector.createDecorator<string[]>();
```

这里的 `Roles` 装饰器是一个函数，它接受一个类型为 `string[]` 的参数。

现在，要使用这个装饰器，我们只需用它来注解处理器：

```typescript
@@filename(cats.controller)
@Post()
@Roles(['admin'])
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
@@switch
@Post()
@Roles(['admin'])
@Bind(Body())
async create(createCatDto) {
  this.catsService.create(createCatDto);
}
```

这里我们将 `Roles` 装饰器元数据附加到 `create()` 方法上，表明只有具有 `admin` 角色的用户才被允许访问此路由。

要访问路由的角色（自定义元数据），我们将再次使用 `Reflector` 辅助类。`Reflector` 可以以正常方式注入到类中：

```typescript
@@filename(roles.guard)
@Injectable()
export class RolesGuard {
  constructor(private reflector: Reflector) {}
}
@@switch
@Injectable()
@Dependencies(Reflector)
export class CatsService {
  constructor(reflector) {
    this.reflector = reflector;
  }
}
```

> **提示** `Reflector` 类是从 `@nestjs/core` 包导入的。

现在，要读取处理器元数据，使用 `get()` 方法：

```typescript
const roles = this.reflector.get(Roles, context.getHandler());
```

`Reflector#get` 方法允许我们通过传入两个参数来轻松访问元数据：一个装饰器引用和一个用于检索元数据的**上下文**（装饰器目标）。在这个例子中，指定的**装饰器**是 `Roles`（参考上面的 `roles.decorator.ts` 文件）。上下文由 `context.getHandler()` 调用提供，这导致提取当前处理的路由处理器的元数据。记住，`getHandler()` 给了我们一个对路由处理器函数的**引用**。

或者，我们可以在控制器级别应用元数据，从而应用到控制器类中的所有路由。

```typescript
@@filename(cats.controller)
@Roles(['admin'])
@Controller('cats')
export class CatsController {}
@@switch
@Roles(['admin'])
@Controller('cats')
export class CatsController {}
```

在这种情况下，要提取控制器元数据，我们传递 `context.getClass()` 作为第二个参数（以提供控制器类作为元数据提取的上下文），而不是 `context.getHandler()`：

```typescript
@@filename(roles.guard)
const roles = this.reflector.get(Roles, context.getClass());
```

考虑到在多个级别提供元数据的能力，你可能需要从多个上下文中提取和合并元数据。`Reflector` 类提供了两个实用方法来帮助实现这一点。这些方法同时提取控制器和方法元数据，并以不同的方式组合它们。

考虑以下场景，你在两个级别都提供了 `Roles` 元数据。

```typescript
@@filename(cats.controller)
@Roles(['user'])
@Controller('cats')
export class CatsController {
  @Post()
  @Roles(['admin'])
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }
}
@@switch
@Roles(['user'])
@Controller('cats')
export class CatsController {}
  @Post()
  @Roles(['admin'])
  @Bind(Body())
  async create(createCatDto) {
    this.catsService.create(createCatDto);
  }
}
```

如果你的意图是指定 `'user'` 作为默认角色，并针对特定方法有选择地覆盖它，你可能会使用 `getAllAndOverride()` 方法。

```typescript
const roles = this.reflector.getAllAndOverride(Roles, [
  context.getHandler(),
  context.getClass(),
]);
```

使用此代码的守卫，在 `create()` 方法的上下文中运行，结合上述元数据，将导致 `roles` 包含 `['admin']`。

要获取两者的元数据并进行合并（此方法合并数组和对象），使用 `getAllAndMerge()` 方法：

```typescript
const roles = this.reflector.getAllAndMerge(Roles, [
  context.getHandler(),
  context.getClass(),
]);
```

这将导致 `roles` 包含 `['user', 'admin']`。

对于这两种合并方法，你将元数据键作为第一个参数传递，并将元数据目标上下文的数组（即对 `getHandler()` 和/或 `getClass()` 方法的调用）作为第二个参数。

#### 底层方法

如前所述，除了使用 `Reflector#createDecorator`，你还可以使用内置的 `@SetMetadata()` 装饰器将元数据附加到处理器。

```typescript
@@filename(cats.controller)
@Post()
@SetMetadata('roles', ['admin'])
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
@@switch
@Post()
@SetMetadata('roles', ['admin'])
@Bind(Body())
async create(createCatDto) {
  this.catsService.create(createCatDto);
}
```

> **提示** `@SetMetadata()` 装饰器是从 `@nestjs/common` 包导入的。

通过上述构造，我们将 `roles` 元数据（`roles` 是元数据键，`['admin']` 是关联值）附加到 `create()` 方法。虽然这可行，但在路由中直接使用 `@SetMetadata()` 并不是好做法。相反，你可以创建自己的装饰器，如下所示：

```typescript
@@filename(roles.decorator)
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
@@switch
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles) => SetMetadata('roles', roles);
```

这种方法更清晰、更易读，并且在某种程度上类似于 `Reflector#createDecorator` 方法。不同之处在于，使用 `@SetMetadata` 你可以更好地控制元数据键和值，还可以创建接受多个参数的装饰器。

现在我们有了自定义的 `@Roles()` 装饰器，我们可以用它来装饰 `create()` 方法。

```typescript
@@filename(cats.controller)
@Post()
@Roles('admin')
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
@@switch
@Post()
@Roles('admin')
@Bind(Body())
async create(createCatDto) {
  this.catsService.create(createCatDto);
}
```

要访问路由的角色（自定义元数据），我们将再次使用 `Reflector` 辅助类：

```typescript
@@filename(roles.guard)
@Injectable()
export class RolesGuard {
  constructor(private reflector: Reflector) {}
}
@@switch
@Injectable()
@Dependencies(Reflector)
export class CatsService {
  constructor(reflector) {
    this.reflector = reflector;
  }
}
```

> **提示** `Reflector` 类是从 `@nestjs/core` 包导入的。

现在，要读取处理器元数据，使用 `get()` 方法。

```typescript
const roles = this.reflector.get<string[]>('roles', context.getHandler());
```

这里我们传递元数据**键**作为第一个参数（在我们的例子中是 `'roles'`），而不是传递装饰器引用。其他所有内容都与 `Reflector#createDecorator` 示例相同。
