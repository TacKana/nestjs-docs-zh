### 序列化

序列化是在对象通过网络响应返回之前进行的一个过程。这是一个合适的地方来定义规则，用于转换和清理要返回给客户端的数据。例如，密码等敏感数据应始终从响应中排除。或者，某些属性可能需要额外的转换，比如仅发送实体的部分属性。手动执行这些转换既繁琐又容易出错，并且可能让你不确定是否覆盖了所有情况。

#### 概述

Nest 提供了内置功能，帮助确保这些操作可以简单直接地执行。`ClassSerializerInterceptor` 拦截器使用了强大的 [class-transformer](https://github.com/typestack/class-transformer) 包，提供了一种声明式且可扩展的对象转换方式。它的基本操作是获取方法处理程序返回的值，并应用 [class-transformer](https://github.com/typestack/class-transformer) 中的 `instanceToPlain()` 函数。这样做可以应用实体/DTO 类上由 `class-transformer` 装饰器表达的规则，如下所述。

> info **提示** 序列化不适用于 [StreamableFile](/techniques/streaming-files#streamable-file-class) 响应。

#### 排除属性

假设我们想自动从用户实体中排除 `password` 属性。我们可以如下注解实体：

```typescript
import { Exclude } from 'class-transformer';

export class UserEntity {
  id: number;
  firstName: string;
  lastName: string;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
```

现在考虑一个控制器，其方法处理程序返回该类的实例。

```typescript
@UseInterceptors(ClassSerializerInterceptor)
@Get()
findOne(): UserEntity {
  return new UserEntity({
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    password: 'password',
  });
}
```

> **警告** 注意我们必须返回类的实例。如果你返回一个普通的 JavaScript 对象，例如 `{{ '{' }} user: new UserEntity() {{ '}' }}`，该对象将不会被正确序列化。

> info **提示** `ClassSerializerInterceptor` 从 `@nestjs/common` 导入。

当请求此端点时，客户端收到以下响应：

```json
{
  "id": 1,
  "firstName": "John",
  "lastName": "Doe"
}
```

请注意，拦截器可以应用在整个应用程序范围内（如[此处](/interceptors#binding-interceptors)所述）。拦截器和实体类声明的结合确保了**任何**返回 `UserEntity` 的方法都会确保移除 `password` 属性。这为你提供了一种集中执行业务规则的方法。

#### 暴露属性

你可以使用 `@Expose()` 装饰器为属性提供别名，或执行函数来计算属性值（类似于 **getter** 函数），如下所示。

```typescript
@Expose()
get fullName(): string {
  return `${this.firstName} ${this.lastName}`;
}
```

#### 转换

你可以使用 `@Transform()` 装饰器执行额外的数据转换。例如，以下构造返回 `RoleEntity` 的 name 属性，而不是返回整个对象。

```typescript
@Transform(({ value }) => value.name)
role: RoleEntity;
```

#### 传递选项

你可能希望修改转换函数的默认行为。要覆盖默认设置，可以使用 `@SerializeOptions()` 装饰器在 `options` 对象中传递它们。

```typescript
@SerializeOptions({
  excludePrefixes: ['_'],
})
@Get()
findOne(): UserEntity {
  return new UserEntity();
}
```

> info **提示** `@SerializeOptions()` 装饰器从 `@nestjs/common` 导入。

通过 `@SerializeOptions()` 传递的选项作为底层 `instanceToPlain()` 函数的第二个参数传递。在这个例子中，我们自动排除了所有以 `_` 前缀开头的属性。

#### 转换普通对象

你可以在控制器级别使用 `@SerializeOptions` 装饰器强制执行转换。这确保所有响应都转换为指定类的实例，应用来自 class-validator 或 class-transformer 的任何装饰器，即使在返回普通对象时也是如此。这种方法使代码更简洁，无需重复实例化类或调用 `plainToInstance`。

在下面的例子中，尽管在两个条件分支中都返回了普通的 JavaScript 对象，但它们会自动转换为 `UserEntity` 实例，并应用相关的装饰器：

```typescript
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ type: UserEntity })
@Get()
findOne(@Query() { id }: { id: number }): UserEntity {
  if (id === 1) {
    return {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      password: 'password',
    };
  }

  return {
    id: 2,
    firstName: 'Kamil',
    lastName: 'Mysliwiec',
    password: 'password2',
  };
}
```

> info **提示** 通过为控制器指定预期的返回类型，你可以利用 TypeScript 的类型检查功能，确保返回的普通对象符合 DTO 或实体的形状。`plainToInstance` 函数不提供这种类型的提示，如果普通对象与预期的 DTO 或实体结构不匹配，可能会导致潜在的 bug。

#### 示例

可工作的示例可在[这里](https://github.com/nestjs/nest/tree/master/sample/21-serializer)找到。

#### WebSockets 和微服务

虽然本章展示了使用 HTTP 风格应用程序（例如 Express 或 Fastify）的示例，但 `ClassSerializerInterceptor` 对于 WebSockets 和微服务的工作方式相同，无论使用何种传输方法。

#### 了解更多

在[这里](https://github.com/typestack/class-transformer)阅读更多关于 `class-transformer` 包提供的可用装饰器和选项的信息。
