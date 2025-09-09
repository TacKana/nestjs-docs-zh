### 接口（Interfaces）

与许多类型系统类似，GraphQL 也支持接口。**接口（Interface）** 是一种抽象类型，它包含一组字段，任何类型要实现该接口都必须包含这些字段（更多信息请参阅[此处](https://graphql.org/learn/schema/#interfaces)）。

#### 代码优先方式

在使用代码优先方式时，你可以通过创建一个抽象类来定义 GraphQL 接口，该类需要使用从 `@nestjs/graphql` 导出的 `@InterfaceType()` 装饰器进行注解。

```typescript
import { Field, ID, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export abstract class Character {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;
}
```

> warning **注意** TypeScript 接口不能用于定义 GraphQL 接口。

这将在 SDL 中生成以下 GraphQL 模式部分：

```graphql
interface Character {
  id: ID!
  name: String!
}
```

现在，要实现 `Character` 接口，可以使用 `implements` 关键字：

```typescript
@ObjectType({
  implements: () => [Character],
})
export class Human implements Character {
  id: string;
  name: string;
}
```

> info **提示** `@ObjectType()` 装饰器是从 `@nestjs/graphql` 包导出的。

库生成的默认 `resolveType()` 函数根据解析器方法返回的值提取类型。这意味着你必须返回类的实例（不能返回字面量 JavaScript 对象）。

要提供自定义的 `resolveType()` 函数，请将 `resolveType` 属性传递给 `@InterfaceType()` 装饰器中的选项对象，如下所示：

```typescript
@InterfaceType({
  resolveType(book) {
    if (book.colors) {
      return ColoringBook;
    }
    return TextBook;
  },
})
export abstract class Book {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;
}
```

#### 接口解析器

到目前为止，使用接口只能与对象共享字段定义。如果你还想共享实际的字段解析器实现，可以创建一个专用的接口解析器，如下所示：

```typescript
import { Resolver, ResolveField, Parent, Info } from '@nestjs/graphql';

@Resolver((type) => Character) // 提示：Character 是一个接口
export class CharacterInterfaceResolver {
  @ResolveField(() => [Character])
  friends(
    @Parent() character, // 实现了 Character 接口的解析对象
    @Info() { parentType }, // 实现了 Character 接口的对象的类型
    @Args('search', { type: () => String }) searchTerm: string,
  ) {
    // 获取角色的朋友列表
    return [];
  }
}
```

现在，`friends` 字段解析器将自动注册给所有实现了 `Character` 接口的对象类型。

> warning **注意** 这需要在 `GraphQLModule` 配置中将 `inheritResolversFromInterfaces` 属性设置为 true。

#### 模式优先方式

在模式优先方式中定义接口，只需使用 SDL 创建一个 GraphQL 接口。

```graphql
interface Character {
  id: ID!
  name: String!
}
```

然后，你可以使用类型生成功能（如[快速开始](/graphql/quick-start)章节所示）生成相应的 TypeScript 定义：

```typescript
export interface Character {
  id: string;
  name: string;
}
```

接口需要在解析器映射中包含一个额外的 `__resolveType` 字段，以确定接口应解析为哪种类型。让我们创建一个 `CharactersResolver` 类并定义 `__resolveType` 方法：

```typescript
@Resolver('Character')
export class CharactersResolver {
  @ResolveField()
  __resolveType(value) {
    if ('age' in value) {
      return Person;
    }
    return null;
  }
}
```

> info **提示** 所有装饰器均从 `@nestjs/graphql` 包导出。