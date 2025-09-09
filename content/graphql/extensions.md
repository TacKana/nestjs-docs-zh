### 扩展功能

> warning **警告** 本章节仅适用于代码优先（code first）开发方式。

扩展功能是一项**高级底层特性**，允许你在类型配置中定义任意数据。通过为特定字段附加自定义元数据，你可以创建更复杂、更通用的解决方案。例如，借助扩展功能，你可以定义访问特定字段所需的字段级角色。这类角色可以在运行时被识别，用于判断调用者是否具备检索特定字段的足够权限。

#### 添加自定义元数据

要为字段附加自定义元数据，请使用从 `@nestjs/graphql` 包导出的 `@Extensions()` 装饰器。

```typescript
@Field()
@Extensions({ role: Role.ADMIN })
password: string;
```

在上面的示例中，我们将 `role` 元数据属性赋值为 `Role.ADMIN`。`Role` 是一个简单的 TypeScript 枚举，用于归类系统中所有可用的用户角色。

注意，除了在字段上设置元数据外，你还可以在类级别和方法级别（例如，在查询处理器上）使用 `@Extensions()` 装饰器。

#### 使用自定义元数据

利用自定义元数据的逻辑可以根据需要变得复杂。例如，你可以创建一个简单的拦截器来存储/记录每次方法调用的事件，或者使用一个[字段中间件](/graphql/field-middleware)来匹配检索字段所需的角色与调用者的权限（字段级权限系统）。

为了便于说明，让我们定义一个 `checkRoleMiddleware`，用于比较用户角色（此处为硬编码）与访问目标字段所需的角色：

```typescript
export const checkRoleMiddleware: FieldMiddleware = async (
  ctx: MiddlewareContext,
  next: NextFn,
) => {
  const { info } = ctx;
  const { extensions } = info.parentType.getFields()[info.fieldName];

  /**
   * 在实际应用中，"userRole" 变量
   * 应表示调用者（用户）的角色（例如 "ctx.user.role"）。
   */
  const userRole = Role.USER;
  if (userRole === extensions.role) {
    // 或者直接 "return null" 来忽略
    throw new ForbiddenException(
      `用户没有足够权限访问 "${info.fieldName}" 字段。`,
    );
  }
  return next();
};
```

有了这个中间件，我们可以为 `password` 字段注册中间件，如下所示：

```typescript
@Field({ middleware: [checkRoleMiddleware] })
@Extensions({ role: Role.ADMIN })
password: string;
```