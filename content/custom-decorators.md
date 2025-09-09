### 自定义路由装饰器

Nest 的核心功能围绕一种名为**装饰器（decorators）**的语言特性构建。装饰器在许多常用编程语言中是一个广为人知的概念，但在 JavaScript 领域中仍相对较新。为了更好地理解装饰器的工作原理，建议阅读[这篇文章](https://medium.com/google-developers/exploring-es7-decorators-76ecb65fb841)。以下是一个简单的定义：

<blockquote class="external">
  ES2016 装饰器是一个返回函数的表达式，可以接收目标对象、名称和属性描述符作为参数。
  通过在被装饰对象前添加 <code>@</code> 字符来应用它，并将其置于被装饰对象的最顶部。
  装饰器可以定义在类、方法或属性上。
</blockquote>

#### 参数装饰器

Nest 提供了一系列实用的**参数装饰器**，可与 HTTP 路由处理程序结合使用。下表列出了这些装饰器及其对应的原生 Express（或 Fastify）对象：

<table>
  <tbody>
    <tr>
      <td><code>@Request(), @Req()</code></td>
      <td><code>req</code></td>
    </tr>
    <tr>
      <td><code>@Response(), @Res()</code></td>
      <td><code>res</code></td>
    </tr>
    <tr>
      <td><code>@Next()</code></td>
      <td><code>next</code></td>
    </tr>
    <tr>
      <td><code>@Session()</code></td>
      <td><code>req.session</code></td>
    </tr>
    <tr>
      <td><code>@Param(param?: string)</code></td>
      <td><code>req.params</code> / <code>req.params[param]</code></td>
    </tr>
    <tr>
      <td><code>@Body(param?: string)</code></td>
      <td><code>req.body</code> / <code>req.body[param]</code></td>
    </tr>
    <tr>
      <td><code>@Query(param?: string)</code></td>
      <td><code>req.query</code> / <code>req.query[param]</code></td>
    </tr>
    <tr>
      <td><code>@Headers(param?: string)</code></td>
      <td><code>req.headers</code> / <code>req.headers[param]</code></td>
    </tr>
    <tr>
      <td><code>@Ip()</code></td>
      <td><code>req.ip</code></td>
    </tr>
    <tr>
      <td><code>@HostParam()</code></td>
      <td><code>req.hosts</code></td>
    </tr>
  </tbody>
</table>

此外，你还可以创建自己的**自定义装饰器**。这有什么用处呢？

在 Node.js 的世界中，将属性附加到**请求（request）**对象上是一种常见做法。然后你需要在每个路由处理程序中手动提取它们，使用如下代码：

```typescript
const user = req.user;
```

为了使代码更具可读性和透明度，你可以创建一个 `@User()` 装饰器，并在所有控制器中重复使用它。

```typescript
@@filename(user.decorator)
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

然后，你可以在任何符合需求的地方简单地使用它。

```typescript
@@filename()
@Get()
async findOne(@User() user: UserEntity) {
  console.log(user);
}
@@switch
@Get()
@Bind(User())
async findOne(user) {
  console.log(user);
}
```

#### 传递数据

当装饰器的行为依赖于某些条件时，你可以使用 `data` 参数向装饰器的工厂函数传递参数。一个应用场景是通过键从请求对象中提取属性的自定义装饰器。例如，假设我们的<a href="techniques/authentication#implementing-passport-strategies">认证层</a>验证请求并将用户实体附加到请求对象上。经过认证的请求的用户实体可能如下所示：

```json
{
  "id": 101,
  "firstName": "Alan",
  "lastName": "Turing",
  "email": "alan@email.com",
  "roles": ["admin"]
}
```

让我们定义一个装饰器，它以属性名作为键，如果存在则返回关联的值（如果不存在或 `user` 对象尚未创建，则返回 undefined）。

```typescript
@@filename(user.decorator)
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
@@switch
import { createParamDecorator } from '@nestjs/common';

export const User = createParamDecorator((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;

  return data ? user && user[data] : user;
});
```

然后，在控制器中，你可以通过 `@User()` 装饰器访问特定属性：

```typescript
@@filename()
@Get()
async findOne(@User('firstName') firstName: string) {
  console.log(`Hello ${firstName}`);
}
@@switch
@Get()
@Bind(User('firstName'))
async findOne(firstName) {
  console.log(`Hello ${firstName}`);
}
```

你可以使用相同的装饰器配合不同的键来访问不同的属性。如果 `user` 对象结构深层或复杂，这可以使请求处理程序的实现更加简单和易读。

> info **提示** 对于 TypeScript 用户，注意 `createParamDecorator<T>()` 是一个泛型。这意味着你可以显式强制执行类型安全，例如 `createParamDecorator<string>((data, ctx) => ...)`。或者，在工厂函数中指定参数类型，例如 `createParamDecorator((data: string, ctx) => ...)`。如果两者都省略，`data` 的类型将为 `any`。

#### 与管道配合使用

Nest 以与内置装饰器（`@Body()`、`@Param()` 和 `@Query()`）相同的方式处理自定义参数装饰器。这意味着管道也会为自定义注解的参数执行（在我们的例子中是 `user` 参数）。此外，你可以直接将管道应用到自定义装饰器上：

```typescript
@@filename()
@Get()
async findOne(
  @User(new ValidationPipe({ validateCustomDecorators: true }))
  user: UserEntity,
) {
  console.log(user);
}
@@switch
@Get()
@Bind(User(new ValidationPipe({ validateCustomDecorators: true })))
async findOne(user) {
  console.log(user);
}
```

> info **提示** 注意 `validateCustomDecorators` 选项必须设置为 true。默认情况下，`ValidationPipe` 不会验证使用自定义装饰器注解的参数。

#### 装饰器组合

Nest 提供了一个辅助方法来组合多个装饰器。例如，假设你想将所有与认证相关的装饰器合并为一个装饰器。可以通过以下结构实现：

```typescript
@@filename(auth.decorator)
import { applyDecorators } from '@nestjs/common';

export function Auth(...roles: Role[]) {
  return applyDecorators(
    SetMetadata('roles', roles),
    UseGuards(AuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
@@switch
import { applyDecorators } from '@nestjs/common';

export function Auth(...roles) {
  return applyDecorators(
    SetMetadata('roles', roles),
    UseGuards(AuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
```

然后，你可以像这样使用这个自定义的 `@Auth()` 装饰器：

```typescript
@Get('users')
@Auth('admin')
findAllUsers() {}
```

这样，通过单个声明就能应用所有四个装饰器。

> warning **警告** 来自 `@nestjs/swagger` 包的 `@ApiHideProperty()` 装饰器不可组合，并且与 `applyDecorators` 函数无法正常工作。