### 守卫（Guards）

守卫是一个使用 `@Injectable()` 装饰器的类，它实现了 `CanActivate` 接口。

<figure><img class="illustrative-image" src="/assets/Guards_1.png" /></figure>

守卫有**单一职责**。它们根据运行时存在的某些条件（如权限、角色、访问控制列表等）来决定给定的请求是否应由路由处理程序处理。这通常被称为**授权**。在传统的 Express 应用程序中，授权（以及通常与其协作的**认证**）通常由[中间件](/middleware)处理。中间件是处理认证的不错选择，因为像令牌验证和将属性附加到 `request` 对象这类事情与特定的路由上下文（及其元数据）没有强关联。

但中间件本质上是“愚蠢”的。它不知道在调用 `next()` 函数后将要执行哪个处理程序。另一方面，**守卫**可以访问 `ExecutionContext` 实例，因此确切知道接下来要执行什么。它们的设计类似于异常过滤器、管道和拦截器，让你能够在请求/响应周期的恰当时机插入处理逻辑，并且以声明方式实现。这有助于保持代码的 DRY（不重复自己）和声明性。

> info **提示** 守卫在所有中间件**之后**执行，但在任何拦截器或管道**之前**执行。

#### 授权守卫

如前所述，**授权**是守卫的一个绝佳用例，因为只有在调用者（通常是特定的已认证用户）拥有足够权限时，特定路由才应可用。我们现在要构建的 `AuthGuard` 假设存在已认证用户（因此请求头中附加了令牌）。它将提取并验证令牌，并使用提取的信息来确定请求是否可以继续。

```typescript
@@filename(auth.guard)
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return validateRequest(request);
  }
}
@@switch
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard {
  async canActivate(context) {
    const request = context.switchToHttp().getRequest();
    return validateRequest(request);
  }
}
```

> info **提示** 如果你正在寻找如何在应用程序中实现认证机制的实际示例，请访问[本章节](/security/authentication)。同样，关于更复杂的授权示例，请查看[此页面](/security/authorization)。

`validateRequest()` 函数内部的逻辑可以根据需要简单或复杂。此示例的主要目的是展示守卫如何融入请求/响应周期。

每个守卫都必须实现一个 `canActivate()` 函数。此函数应返回一个布尔值，指示当前请求是否被允许。它可以同步或异步（通过 `Promise` 或 `Observable`）返回响应。Nest 使用返回值来控制下一步操作：

- 如果返回 `true`，请求将被处理。
- 如果返回 `false`，Nest 将拒绝该请求。

<app-banner-enterprise></app-banner-enterprise>

#### 执行上下文

`canActivate()` 函数接受一个参数，即 `ExecutionContext` 实例。`ExecutionContext` 继承自 `ArgumentsHost`。我们在异常过滤器章节中见过 `ArgumentsHost`。在上面的示例中，我们只是使用了之前在 `ArgumentsHost` 上定义的相同辅助方法，来获取对 `Request` 对象的引用。你可以参考[异常过滤器](https://docs.nestjs.com/exception-filters#arguments-host)章节中的 **Arguments host** 部分以了解更多关于此主题的内容。

通过扩展 `ArgumentsHost`，`ExecutionContext` 还添加了几个新的辅助方法，这些方法提供了关于当前执行过程的额外细节。这些细节有助于构建更通用的守卫，这些守卫可以跨广泛的控制器、方法和执行上下文工作。了解更多关于 `ExecutionContext` 的信息，请参见[这里](/fundamentals/execution-context)。

#### 基于角色的认证

让我们构建一个功能更强大的守卫，它只允许具有特定角色的用户访问。我们将从一个基本的守卫模板开始，并在接下来的部分中逐步构建。目前，它允许所有请求继续：

```typescript
@@filename(roles.guard)
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }
}
@@switch
import { Injectable } from '@nestjs/common';

@Injectable()
export class RolesGuard {
  canActivate(context) {
    return true;
  }
}
```

#### 绑定守卫

与管道和异常过滤器类似，守卫可以是**控制器作用域**、方法作用域或全局作用域。下面，我们使用 `@UseGuards()` 装饰器设置了一个控制器作用域的守卫。此装饰器可以接受单个参数或逗号分隔的参数列表。这让你可以通过一个声明轻松应用适当的守卫集。

```typescript
@@filename()
@Controller('cats')
@UseGuards(RolesGuard)
export class CatsController {}
```

> info **提示** `@UseGuards()` 装饰器是从 `@nestjs/common` 包导入的。

上面，我们传递了 `RolesGuard` 类（而不是实例），将实例化的责任留给了框架，并启用了依赖注入。与管道和异常过滤器一样，我们也可以传递一个就地实例：

```typescript
@@filename()
@Controller('cats')
@UseGuards(new RolesGuard())
export class CatsController {}
```

上面的构造将守卫附加到此控制器声明的每个处理程序。如果我们希望守卫仅应用于单个方法，我们可以在**方法级别**应用 `@UseGuards()` 装饰器。

要设置全局守卫，请使用 Nest 应用程序实例的 `useGlobalGuards()` 方法：

```typescript
@@filename()
const app = await NestFactory.create(AppModule);
app.useGlobalGuards(new RolesGuard());
```

> warning **注意** 对于混合应用，`useGlobalGuards()` 方法默认不会为网关和微服务设置守卫（有关如何更改此行为的信息，请参见[混合应用](/faq/hybrid-application)）。对于“标准”（非混合）微服务应用，`useGlobalGuards()` 会全局挂载守卫。

全局守卫用于整个应用程序，针对每个控制器和每个路由处理程序。在依赖注入方面，从任何模块外部注册的全局守卫（如上面示例中的 `useGlobalGuards()`）无法注入依赖项，因为这是在任何模块的上下文之外完成的。为了解决这个问题，你可以使用以下构造直接从任何模块设置守卫：

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
```

> info **提示** 当使用这种方法为守卫执行依赖注入时，请注意，无论采用此构造的模块是哪个，守卫实际上都是全局的。应该在何处进行此操作？选择定义守卫的模块（如上例中的 `RolesGuard`）。此外，`useClass` 并不是处理自定义提供者注册的唯一方式。了解更多信息，请参见[这里](/fundamentals/custom-providers)。

#### 为每个处理程序设置角色

我们的 `RolesGuard` 正在工作，但还不够智能。我们还没有利用守卫最重要的特性——[执行上下文](/fundamentals/execution-context)。它还不知道角色，也不知道每个处理程序允许哪些角色。例如，`CatsController` 可能为不同的路由设置不同的权限方案。有些可能仅对管理员用户可用，而其他可能对所有人开放。我们如何以灵活和可重用的方式将角色与路由匹配？

这就是**自定义元数据**发挥作用的地方（了解更多[这里](https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata)）。Nest 提供了通过 `Reflector.createDecorator` 静态方法创建的装饰器或内置的 `@SetMetadata()` 装饰器，将自定义**元数据**附加到路由处理程序的能力。

例如，让我们使用 `Reflector.createDecorator` 方法创建一个 `@Roles()` 装饰器，该装饰器将元数据附加到处理程序。`Reflector` 由框架开箱即提供，并从 `@nestjs/core` 包中暴露。

```ts
@@filename(roles.decorator)
import { Reflector } from '@nestjs/core';

export const Roles = Reflector.createDecorator<string[]>();
```

这里的 `Roles` 装饰器是一个函数，它接受一个类型为 `string[]` 的单个参数。

现在，要使用此装饰器，我们只需用它注解处理程序：

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

这里我们将 `Roles` 装饰器元数据附加到 `create()` 方法，指示只有具有 `admin` 角色的用户才应被允许访问此路由。

或者，我们可以使用内置的 `@SetMetadata()` 装饰器，而不是 `Reflector.createDecorator` 方法。了解更多信息，请参见[这里](/fundamentals/execution-context#low-level-approach)。

#### 完整实现

现在让我们回到 `RolesGuard` 并将所有内容整合起来。目前，它在所有情况下都简单地返回 `true`，允许每个请求继续。我们希望根据**分配给当前用户的角色**与当前正在处理的路由所需的实际角色进行比较，使返回值具有条件性。为了访问路由的角色（自定义元数据），我们将再次使用 `Reflector` 辅助类，如下所示：

```typescript
@@filename(roles.guard)
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get(Roles, context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return matchRoles(roles, user.roles);
  }
}
@@switch
import { Injectable, Dependencies } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from './roles.decorator';

@Injectable()
@Dependencies(Reflector)
export class RolesGuard {
  constructor(reflector) {
    this.reflector = reflector;
  }

  canActivate(context) {
    const roles = this.reflector.get(Roles, context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return matchRoles(roles, user.roles);
  }
}
```

> info **提示** 在 Node.js 世界中，通常会将授权用户附加到 `request` 对象。因此，在上面的示例代码中，我们假设 `request.user` 包含用户实例和允许的角色。在你的应用程序中，你可能会在自定义的**认证守卫**（或中间件）中建立这种关联。有关此主题的更多信息，请查看[本章节](/security/authentication)。

> warning **警告** `matchRoles()` 函数内部的逻辑可以根据需要简单或复杂。此示例的主要目的是展示守卫如何融入请求/响应周期。

有关在上下文敏感的方式下利用 `Reflector` 的更多详细信息，请参考**执行上下文**章节中的<a href="https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata">反射和元数据</a>部分。

当权限不足的用户请求端点时，Nest 会自动返回以下响应：

```typescript
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

请注意，在幕后，当守卫返回 `false` 时，框架会抛出 `ForbiddenException`。如果你想返回不同的错误响应，你应该抛出你自己的特定异常。例如：

```typescript
throw new UnauthorizedException();
```

守卫抛出的任何异常都将由[异常层](/exception-filters)（全局异常过滤器和应用于当前上下文的任何异常过滤器）处理。

> info **提示** 如果你正在寻找如何实现授权的实际示例，请查看[本章节](/security/authorization)。