### 字段中间件

> warning **警告** 本章节仅适用于代码优先（code first）方式。

字段中间件（Field Middleware）允许你在字段解析**之前或之后**运行任意代码。字段中间件可用于转换字段结果、验证字段参数，甚至检查字段级别的角色（例如，访问目标字段所需的权限，中间件函数会对此进行验证）。

你可以将多个中间件函数连接到一个字段上。在这种情况下，它们会沿着调用链顺序执行，前一个中间件决定是否调用下一个。`middleware` 数组中中间件函数的顺序很重要。第一个解析器是“最外层”，因此它最先执行，也最后执行（类似于 `graphql-middleware` 包）。第二个解析器是“次外层”，因此它第二个执行，倒数第二个结束。

#### 开始使用

让我们先创建一个简单的中间件，它会在字段值返回给客户端之前将其记录下来：

```typescript
import { FieldMiddleware, MiddlewareContext, NextFn } from '@nestjs/graphql';

const loggerMiddleware: FieldMiddleware = async (
  ctx: MiddlewareContext,
  next: NextFn,
) => {
  const value = await next();
  console.log(value);
  return value;
};
```

> info **提示** `MiddlewareContext` 是一个对象，包含 GraphQL 解析器函数通常接收的参数（`{{ '{' }} source, args, context, info {{ '}' }}`），而 `NextFn` 是一个函数，允许你执行堆栈中的下一个中间件（绑定到此字段）或实际的字段解析器。

> warning **警告** 字段中间件函数不能注入依赖项，也不能访问 Nest 的 DI 容器，因为它们被设计得非常轻量，不应执行任何可能耗时的操作（如从数据库检索数据）。如果你需要调用外部服务/从数据源查询数据，应该在绑定到根查询/变更处理器的守卫/拦截器中完成，并将其分配给 `context` 对象，这样你就可以在字段中间件中访问它（特别是从 `MiddlewareContext` 对象中）。

注意，字段中间件必须匹配 `FieldMiddleware` 接口。在上面的例子中，我们首先运行 `next()` 函数（它执行实际的字段解析器并返回字段值），然后我们将这个值记录到终端。此外，中间件函数返回的值会完全覆盖之前的值，由于我们不想进行任何更改，因此直接返回原始值。

有了这个中间件，我们可以直接在 `@Field()` 装饰器中注册它，如下所示：

```typescript
@ObjectType()
export class Recipe {
  @Field({ middleware: [loggerMiddleware] })
  title: string;
}
```

现在，每当我们请求 `Recipe` 对象类型的 `title` 字段时，原始字段的值将被记录到控制台。

> info **提示** 要了解如何使用[扩展（extensions）](/graphql/extensions)功能实现字段级别的权限系统，请查看[这一节](/graphql/extensions#using-custom-metadata)。

> warning **警告** 字段中间件只能应用于 `ObjectType` 类。更多详情，请查看此[问题](https://github.com/nestjs/graphql/issues/2446)。

另外，如上所述，我们可以在中间件函数中控制字段的值。为了演示，让我们将配方的标题（如果存在）转换为大写：

```typescript
const value = await next();
return value?.toUpperCase();
```

在这种情况下，每当请求标题时，每个标题都会自动转换为大写。

同样地，你也可以将字段中间件绑定到自定义字段解析器（用 `@ResolveField()` 装饰器注释的方法），如下所示：

```typescript
@ResolveField(() => String, { middleware: [loggerMiddleware] })
title() {
  return 'Placeholder';
}
```

> warning **警告** 如果在字段解析器级别启用了增强器（[了解更多](/graphql/other-features#execute-enhancers-at-the-field-resolver-level)），字段中间件函数将在任何拦截器、守卫等**绑定到方法**的增强器之前运行（但在为查询或变更处理器注册的根级别增强器之后）。

#### 全局字段中间件

除了直接将中间件绑定到特定字段外，你还可以全局注册一个或多个中间件函数。在这种情况下，它们会自动连接到所有对象类型的字段上。

```typescript
GraphQLModule.forRoot({
  autoSchemaFile: 'schema.gql',
  buildSchemaOptions: {
    fieldMiddleware: [loggerMiddleware],
  },
}),
```

> info **提示** 全局注册的字段中间件函数将在局部注册的中间件（那些直接绑定到特定字段的中间件）**之前**执行。