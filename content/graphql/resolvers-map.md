### 解析器 (Resolvers)

解析器提供了将 [GraphQL](https://graphql.org/) 操作（查询、变更或订阅）转换为数据的指令。它们返回我们在模式中指定的相同结构的数据——可以是同步的，也可以是一个解析为该结构结果的承诺。通常，您需要手动创建一个**解析器映射**。而 `@nestjs/graphql` 包则利用您用来注解类的装饰器所提供的元数据，自动生成解析器映射。为了演示使用该包功能创建 GraphQL API 的过程，我们将创建一个简单的作者 API。

#### 代码优先 (Code first)

在代码优先方法中，我们不需要手动编写 GraphQL SDL 来创建 GraphQL 模式的典型过程。相反，我们使用 TypeScript 装饰器从 TypeScript 类定义生成 SDL。`@nestjs/graphql` 包读取通过装饰器定义的元数据，并自动为您生成模式。

#### 对象类型 (Object types)

GraphQL 模式中的大多数定义都是**对象类型**。您定义的每个对象类型应代表应用程序客户端可能需要交互的领域对象。例如，我们的示例 API 需要能够获取作者及其帖子的列表，因此我们应该定义 `Author` 类型和 `Post` 类型来支持此功能。

如果我们使用模式优先方法，我们会用如下 SDL 定义这样的模式：

```graphql
type Author {
  id: Int!
  firstName: String
  lastName: String
  posts: [Post!]!
}
```

在这种情况下，使用代码优先方法，我们使用 TypeScript 类定义模式，并使用 TypeScript 装饰器注解这些类的字段。上述 SDL 在代码优先方法中等效于：

```typescript
@@filename(authors/models/author.model)
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Post } from './post';

@ObjectType()
export class Author {
  @Field(type => Int)
  id: number;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field(type => [Post])
  posts: Post[];
}
```

> info **提示** TypeScript 的元数据反射系统有几个限制，例如，无法确定类由哪些属性组成，或识别给定属性是可选的还是必需的。由于这些限制，我们必须在模式定义类中显式使用 `@Field()` 装饰器来提供关于每个字段的 GraphQL 类型和可选性的元数据，或者使用 [CLI 插件](/graphql/cli-plugin)为我们生成这些。

`Author` 对象类型，像任何类一样，由字段集合组成，每个字段声明一个类型。字段的类型对应于 [GraphQL 类型](https://graphql.org/learn/schema/)。字段的 GraphQL 类型可以是另一个对象类型或标量类型。GraphQL 标量类型是解析为单个值的原始类型（如 `ID`、`String`、`Boolean` 或 `Int`）。

> info **提示** 除了 GraphQL 的内置标量类型，您还可以定义自定义标量类型（阅读[更多](/graphql/scalars)）。

上述 `Author` 对象类型定义将导致 Nest **生成**我们之前展示的 SDL：

```graphql
type Author {
  id: Int!
  firstName: String
  lastName: String
  posts: [Post!]!
}
```

`@Field()` 装饰器接受一个可选的类型函数（例如，`type => Int`），以及一个可选的选项对象。

当 TypeScript 类型系统和 GraphQL 类型系统之间存在潜在歧义时，需要类型函数。具体来说：对于 `string` 和 `boolean` 类型，它**不是**必需的；对于 `number`（必须映射到 GraphQL `Int` 或 `Float`）则是**必需**的。类型函数应简单地返回所需的 GraphQL 类型（如这些章节中的各种示例所示）。

选项对象可以具有以下任何键/值对：

- `nullable`：用于指定字段是否可为空（在 `@nestjs/graphql` 中，每个字段默认是非空的）；`boolean`
- `description`：用于设置字段描述；`string`
- `deprecationReason`：用于将字段标记为已弃用；`string`

例如：

```typescript
@Field({ description: `书籍标题`, deprecationReason: '在 v2 模式中无用' })
title: string;
```

> info **提示** 您还可以为整个对象类型添加描述或标记为已弃用：`@ObjectType({{ '{' }} description: '作者模型' {{ '}' }})`。

当字段是数组时，我们必须在 `Field()` 装饰器的类型函数中手动指示数组类型，如下所示：

```typescript
@Field(type => [Post])
posts: Post[];
```

> info **提示** 使用数组括号表示法（`[ ]`），我们可以指示数组的深度。例如，使用 `[[Int]]` 将表示一个整数矩阵。

要声明数组的项（而不是数组本身）可为空，将 `nullable` 属性设置为 `'items'`，如下所示：

```typescript
@Field(type => [Post], { nullable: 'items' })
posts: Post[];
```

> info **提示** 如果数组及其项都可为空，则将 `nullable` 设置为 `'itemsAndList'`。

现在 `Author` 对象类型已创建，让我们定义 `Post` 对象类型。

```typescript
@@filename(posts/models/post.model)
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Post {
  @Field(type => Int)
  id: number;

  @Field()
  title: string;

  @Field(type => Int, { nullable: true })
  votes?: number;
}
```

`Post` 对象类型将导致在 SDL 中生成以下部分的 GraphQL 模式：

```graphql
type Post {
  id: Int!
  title: String!
  votes: Int
}
```

#### 代码优先解析器 (Code first resolver)

此时，我们已经定义了可以存在于数据图中的对象（类型定义），但客户端还没有与这些对象交互的方式。为了解决这个问题，我们需要创建一个解析器类。在代码优先方法中，解析器类既定义解析器函数**又**生成**查询类型**。当我们通过下面的示例进行工作时，这一点将变得清晰：

```typescript
@@filename(authors/authors.resolver)
@Resolver(() => Author)
export class AuthorsResolver {
  constructor(
    private authorsService: AuthorsService,
    private postsService: PostsService,
  ) {}

  @Query(() => Author)
  async author(@Args('id', { type: () => Int }) id: number) {
    return this.authorsService.findOneById(id);
  }

  @ResolveField()
  async posts(@Parent() author: Author) {
    const { id } = author;
    return this.postsService.findAll({ authorId: id });
  }
}
```

> info **提示** 所有装饰器（例如，`@Resolver`、`@ResolveField`、`@Args` 等）都从 `@nestjs/graphql` 包导出。

您可以定义多个解析器类。Nest 将在运行时组合这些类。有关代码组织的更多信息，请参见下面的[模块](/graphql/resolvers#module)部分。

> warning **注意** `AuthorsService` 和 `PostsService` 类内部的逻辑可以根据需要简单或复杂。此示例的主要目的是展示如何构造解析器以及它们如何与其他提供者交互。

在上面的示例中，我们创建了 `AuthorsResolver`，它定义了一个查询解析器函数和一个字段解析器函数。要创建解析器，我们创建一个以解析器函数为方法的类，并用 `@Resolver()` 装饰器注解该类。

在此示例中，我们定义了一个查询处理程序，以根据请求中发送的 `id` 获取作者对象。要指定该方法是查询处理程序，请使用 `@Query()` 装饰器。

传递给 `@Resolver()` 装饰器的参数是可选的，但在我们的图变得不简单时会起作用。它用于提供字段解析器函数在遍历对象图时使用的父对象。

在我们的示例中，由于类包含一个**字段解析器**函数（用于 `Author` 对象类型的 `posts` 属性），我们**必须**向 `@Resolver()` 装饰器提供一个值，以指示哪个类是此类中定义的所有字段解析器的父类型（即相应的 `ObjectType` 类名称）。从示例中应该清楚，在编写字段解析器函数时，有必要访问父对象（正在解析的字段所属的对象）。在此示例中，我们使用一个字段解析器填充作者的帖子数组，该解析器调用一个服务，该服务以作者的 `id` 作为参数。因此需要在 `@Resolver()` 装饰器中标识父对象。请注意，随后在字段解析器中使用 `@Parent()` 方法参数装饰器来提取对该父对象的引用。

我们可以定义多个 `@Query()` 解析器函数（在此类中以及任何其他解析器类中），它们将聚合到生成的 SDL 中的单个**查询类型**定义以及解析器映射中的适当条目中。这允许您在靠近它们使用的模型和服务的地方定义查询，并将它们很好地组织在模块中。

> info **提示** Nest CLI 提供了一个生成器（原理图），可以自动生成**所有样板代码**，帮助我们避免所有这些工作，并使开发人员体验更加简单。阅读有关此功能的更多信息[此处](/recipes/crud-generator)。

#### 查询类型名称 (Query type names)

在上面的示例中，`@Query()` 装饰器基于方法名称生成 GraphQL 模式查询类型名称。例如，考虑上面示例中的以下构造：

```typescript
@Query(() => Author)
async author(@Args('id', { type: () => Int }) id: number) {
  return this.authorsService.findOneById(id);
}
```

这会在我们的模式中为作者查询生成以下条目（查询类型使用与方法名称相同的名称）：

```graphql
type Query {
  author(id: Int!): Author
}
```

> info **提示** 了解更多关于 GraphQL 查询的[信息](https://graphql.org/learn/queries/)。

按照惯例，我们更喜欢解耦这些名称；例如，我们更喜欢使用像 `getAuthor()` 这样的名称作为我们的查询处理程序方法，但仍然使用 `author` 作为我们的查询类型名称。这同样适用于我们的字段解析器。我们可以通过将映射名称作为 `@Query()` 和 `@ResolveField()` 装饰器的参数传递来轻松实现这一点，如下所示：

```typescript
@@filename(authors/authors.resolver)
@Resolver(() => Author)
export class AuthorsResolver {
  constructor(
    private authorsService: AuthorsService,
    private postsService: PostsService,
  ) {}

  @Query(() => Author, { name: 'author' })
  async getAuthor(@Args('id', { type: () => Int }) id: number) {
    return this.authorsService.findOneById(id);
  }

  @ResolveField('posts', () => [Post])
  async getPosts(@Parent() author: Author) {
    const { id } = author;
    return this.postsService.findAll({ authorId: id });
  }
}
```

上面的 `getAuthor` 处理程序方法将导致在 SDL 中生成以下部分的 GraphQL 模式：

```graphql
type Query {
  author(id: Int!): Author
}
```

#### 查询装饰器选项 (Query decorator options)

`@Query()` 装饰器的选项对象（我们在上面传递 `{{ '{' }}name: 'author'{{ '}' }}` 的地方）接受许多键/值对：

- `name`：查询的名称；`string`
- `description`：用于生成 GraphQL 模式文档的描述（例如，在 GraphQL playground 中）；`string`
- `deprecationReason`：设置查询元数据以将查询显示为已弃用（例如，在 GraphQL playground 中）；`string`
- `nullable`：查询是否可以返回空数据响应；`boolean` 或 `'items'` 或 `'itemsAndList'`（有关 `'items'` 和 `'itemsAndList'` 的详细信息，请参见上文）

#### 参数装饰器选项 (Args decorator options)

使用 `@Args()` 装饰器从请求中提取参数以供方法处理程序使用。这与 [REST 路由参数提取](/controllers#route-parameters) 的工作方式非常相似。

通常，您的 `@Args()` 装饰器将是简单的，并且不需要像上面的 `getAuthor()` 方法中那样的对象参数。例如，如果标识符的类型是字符串，以下构造就足够了，并且简单地从传入的 GraphQL 请求中提取命名字段作为方法参数使用。

```typescript
@Args('id') id: string
```

在 `getAuthor()` 的情况下，使用了 `number` 类型，这带来了挑战。`number` TypeScript 类型没有提供关于预期 GraphQL 表示的足够信息（例如，`Int` 与 `Float`）。因此，我们必须**显式**传递类型引用。我们通过向 `Args()` 装饰器传递第二个参数来实现这一点，该参数包含参数选项，如下所示：

```typescript
@Query(() => Author, { name: 'author' })
async getAuthor(@Args('id', { type: () => Int }) id: number) {
  return this.authorsService.findOneById(id);
}
```

选项对象允许我们指定以下可选的键值对：

- `type`：返回 GraphQL 类型的函数
- `defaultValue`：默认值；`any`
- `description`：描述元数据；`string`
- `deprecationReason`：弃用字段并提供描述原因的元数据；`string`
- `nullable`：字段是否可为空

查询处理程序方法可以接受多个参数。假设我们想根据作者的 `firstName` 和 `lastName` 获取作者。在这种情况下，我们可以调用 `@Args` 两次：

```typescript
getAuthor(
  @Args('firstName', { nullable: true }) firstName?: string,
  @Args('lastName', { defaultValue: '' }) lastName?: string,
) {}
```

> info **提示** 对于 `firstName`，这是一个 GraphQL 可空字段，不必将 `null` 或 `undefined` 的非值类型添加到此字段的类型中。只需注意，您需要在解析器中为这些可能的非值类型进行类型保护，因为 GraphQL 可空字段将允许这些类型传递到您的解析器。

#### 专用参数类 (Dedicated arguments class)

使用内联的 `@Args()` 调用，像上面示例中的代码会变得臃肿。相反，您可以创建一个专用的 `GetAuthorArgs` 参数类，并在处理程序方法中访问它，如下所示：

```typescript
@Args() args: GetAuthorArgs
```

使用 `@ArgsType()` 创建 `GetAuthorArgs` 类，如下所示：

```typescript
@@filename(authors/dto/get-author.args)
import { MinLength } from 'class-validator';
import { Field, ArgsType } from '@nestjs/graphql';

@ArgsType()
class GetAuthorArgs {
  @Field({ nullable: true })
  firstName?: string;

  @Field({ defaultValue: '' })
  @MinLength(3)
  lastName: string;
}
```

> info **提示** 再次，由于 TypeScript 的元数据反射系统限制，必须使用 `@Field` 装饰器手动指示类型和可选性，或使用 [CLI 插件](/graphql/cli-plugin)。此外，对于 `firstName`，这是一个 GraphQL 可空字段，不必将 `null` 或 `undefined` 的非值类型添加到此字段的类型中。只需注意，您需要在解析器中为这些可能的非值类型进行类型保护，因为 GraphQL 可空字段将允许这些类型传递到您的解析器。

这将在 SDL 中生成以下部分的 GraphQL 模式：

```graphql
type Query {
  author(firstName: String, lastName: String = ''): Author
}
```

> info **提示** 注意，像 `GetAuthorArgs` 这样的参数类与 `ValidationPipe` 配合得非常好（阅读[更多](/techniques/validation)）。

#### 类继承 (Class inheritance)

您可以使用标准的 TypeScript 类继承来创建具有通用实用类型特性（字段和字段属性、验证等）的基类，这些类可以被扩展。例如，您可能有一组分页相关的参数，这些参数始终包括标准的 `offset` 和 `limit` 字段，但也有其他特定于类型的索引字段。您可以设置如下所示的类层次结构。

基 `@ArgsType()` 类：

```typescript
@ArgsType()
class PaginationArgs {
  @Field(() => Int)
  offset: number = 0;

  @Field(() => Int)
  limit: number = 10;
}
```

基 `@ArgsType()` 类的类型特定子类：

```typescript
@ArgsType()
class GetAuthorArgs extends PaginationArgs {
  @Field({ nullable: true })
  firstName?: string;

  @Field({ defaultValue: '' })
  @MinLength(3)
  lastName: string;
}
```

同样的方法可以用于 `@ObjectType()` 对象。在基类上定义通用属性：

```typescript
@ObjectType()
class Character {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;
}
```

在子类上添加类型特定属性：

```typescript
@ObjectType()
class Warrior extends Character {
  @Field()
  level: number;
}
```

您也可以将继承与解析器一起使用。您可以通过结合继承和 TypeScript 泛型来确保类型安全。例如，要创建一个具有通用 `findAll` 查询的基类，使用如下构造：

```typescript
function BaseResolver<T extends Type<unknown>>(classRef: T): any {
  @Resolver({ isAbstract: true })
  abstract class BaseResolverHost {
    @Query(() => [classRef], { name: `findAll${classRef.name}` })
    async findAll(): Promise<T[]> {
      return [];
    }
  }
  return BaseResolverHost;
}
```

注意以下几点：

- 需要显式返回类型（上面的 `any`）：否则 TypeScript 会抱怨使用私有类定义。推荐：定义一个接口而不是使用 `any`。
- `Type` 是从 `@nestjs/common` 包导入的
- `isAbstract: true` 属性指示不应为此类生成 SDL（模式定义语言语句）。注意，您也可以为其他类型设置此属性以抑制 SDL 生成。

以下是您可以如何生成 `BaseResolver` 的具体子类：

```typescript
@Resolver(() => Recipe)
export class RecipesResolver extends BaseResolver(Recipe) {
  constructor(private recipesService: RecipesService) {
    super();
  }
}
```

此构造将生成以下 SDL：

```graphql
type Query {
  findAllRecipe: [Recipe!]!
}
```

#### 泛型 (Generics)

我们在上面看到了泛型的一个用途。这个强大的 TypeScript 特性可用于创建有用的抽象。例如，这里有一个基于[此文档](https://graphql.org/learn/pagination/#pagination-and-edges)的光标分页实现示例：

```typescript
import { Field, ObjectType, Int } from '@nestjs/graphql';
import { Type } from '@nestjs/common';

interface IEdgeType<T> {
  cursor: string;
  node: T;
}

export interface IPaginatedType<T> {
  edges: IEdgeType<T>[];
  nodes: T[];
  totalCount: number;
  hasNextPage: boolean;
}

export function Paginated<T>(classRef: Type<T>): Type<IPaginatedType<T>> {
  @ObjectType(`${classRef.name}Edge`)
  abstract class EdgeType {
    @Field(() => String)
    cursor: string;

    @Field(() => classRef)
    node: T;
  }

  @ObjectType({ isAbstract: true })
  abstract class PaginatedType implements IPaginatedType<T> {
    @Field(() => [EdgeType], { nullable: true })
    edges: EdgeType[];

    @Field(() => [classRef], { nullable: true })
    nodes: T[];

    @Field(() => Int)
    totalCount: number;

    @Field()
    hasNextPage: boolean;
  }
  return PaginatedType as Type<IPaginatedType<T>>;
}
```

使用上面定义的基类，我们现在可以轻松创建继承此行为的专用类型。例如：

```typescript
@ObjectType()
class PaginatedAuthor extends Paginated(Author) {}
```

#### 模式优先 (Schema first)

如[前一章](/graphql/quick-start)所述，在模式优先方法中，我们首先在 SDL 中手动定义模式类型（阅读[更多](https://graphql.org/learn/schema/#type-language)）。考虑以下 SDL 类型定义。

> info **提示** 为了本章的方便，我们将所有 SDL 聚合在一个位置（例如，如下所示的一个 `.graphql` 文件）。在实践中，您可能会发现以模块化方式组织代码是合适的。例如，为每个领域实体创建单独的 SDL 文件以及相关的服务、解析器代码和 Nest 模块定义类，放在该实体的专用目录中，这会很有帮助。Nest 将在运行时聚合所有单独的模式类型定义。

```graphql
type Author {
  id: Int!
  firstName: String
  lastName: String
  posts: [Post]
}

type Post {
  id: Int!
  title: String!
  votes: Int
}

type Query {
  author(id: Int!): Author
}
```

#### 模式优先解析器 (Schema first resolver)

上面的模式公开了一个查询 - `author(id: Int!): Author`。

> info **提示** 了解更多关于 GraphQL 查询的[信息](https://graphql.org/learn/queries/)。

现在让我们创建一个 `AuthorsResolver` 类来解析作者查询：

```typescript
@@filename(authors/authors.resolver)
@Resolver('Author')
export class AuthorsResolver {
  constructor(
    private authorsService: AuthorsService,
    private postsService: PostsService,
  ) {}

  @Query()
  async author(@Args('id') id: number) {
    return this.authorsService.findOneById(id);
  }

  @ResolveField()
  async posts(@Parent() author) {
    const { id } = author;
    return this.postsService.findAll({ authorId: id });
  }
}
```

> info **提示** 所有装饰器（例如，`@Resolver`、`@ResolveField`、`@Args` 等）都从 `@nestjs/graphql` 包导出。

> warning **注意** `AuthorsService` 和 `PostsService` 类内部的逻辑可以根据需要简单或复杂。此示例的主要目的是展示如何构造解析器以及它们如何与其他提供者交互。

`@Resolver()` 装饰器是必需的。它接受一个可选的字符串参数，带有类的名称。每当类包含 `@ResolveField()` 装饰器以告知 Nest 装饰的方法与父类型（我们当前示例中的 `Author` 类型）相关联时，都需要此类名称。或者，可以在每个方法上设置 `@Resolver()`，而不是在类的顶部：

```typescript
@Resolver('Author')
@ResolveField()
async posts(@Parent() author) {
  const { id } = author;
  return this.postsService.findAll({ authorId: id });
}
```

在这种情况下（方法级别的 `@Resolver()` 装饰器），如果您在类中有多个 `@ResolveField()` 装饰器，则必须向所有装饰器添加 `@Resolver()`。这不被认为是最佳实践（因为它会创建额外的开销）。

> info **提示** 传递给 `@Resolver()` 的任何类名称参数**不会**影响查询（`@Query()` 装饰器）或变更（`@Mutation()` 装饰器）。

> warning **警告** 在**代码优先**方法中不支持在方法级别使用 `@Resolver` 装饰器。

在上面的示例中，`@Query()` 和 `@ResolveField()` 装饰器基于方法名称与 GraphQL 模式类型相关联。例如，考虑上面示例中的以下构造：

```typescript
@Query()
async author(@Args('id') id: number) {
  return this.authorsService.findOneById(id);
}
```

这会在我们的模式中为作者查询生成以下条目（查询类型使用与方法名称相同的名称）：

```graphql
type Query {
  author(id: Int!): Author
}
```

按照惯例，我们更喜欢解耦这些，使用像 `getAuthor()` 或 `getPosts()` 这样的名称作为我们的解析器方法。我们可以通过将映射名称作为参数传递给装饰器来轻松实现这一点，如下所示：

```typescript
@@filename(authors/authors.resolver)
@Resolver('Author')
export class AuthorsResolver {
  constructor(
    private authorsService: AuthorsService,
    private postsService: PostsService,
  ) {}

  @Query('author')
  async getAuthor(@Args('id') id: number) {
    return this.authorsService.findOneById(id);
  }

  @ResolveField('posts')
  async getPosts(@Parent() author) {
    const { id } = author;
    return this.postsService.findAll({ authorId: id });
  }
}
```

> info **提示** Nest CLI 提供了一个生成器（原理图），可以自动生成**所有样板代码**，帮助我们避免所有这些工作，并使开发人员体验更加简单。阅读有关此功能的更多信息[此处](/recipes/crud-generator)。

#### 生成类型 (Generating types)

假设我们使用模式优先方法并启用了类型生成功能（如[前一章](/graphql/quick-start)所示，使用 `outputAs: 'class'`），一旦您运行应用程序，它将在您指定的位置（在 `GraphQLModule.forRoot()` 方法中指定）生成以下文件。例如，在 `src/graphql.ts` 中：

```typescript
@@filename(graphql)
export (class Author {
  id: number;
  firstName?: string;
  lastName?: string;
  posts?: Post[];
})
export class Post {
  id: number;
  title: string;
  votes?: number;
}

export abstract class IQuery {
  abstract author(id: number): Author | Promise<Author>;
}
```

通过生成类（而不是默认的生成接口技术），您可以在模式优先方法中结合使用声明式验证**装饰器**，这是一种非常有用的技术（阅读[更多](/techniques/validation)）。例如，您可以将 `class-validator` 装饰器添加到生成的 `CreatePostInput` 类中，如下所示，以对 `title` 字段强制执行最小和最大字符串长度：

```typescript
import { MinLength, MaxLength } from 'class-validator';

export class CreatePostInput {
  @MinLength(3)
  @MaxLength(50)
  title: string;
}
```

> warning **注意** 要启用输入的自动验证（和参数），请使用 `ValidationPipe`。阅读有关验证的更多信息[此处](/techniques/validation)，更具体地关于管道的信息[此处](/pipes)。

但是，如果您直接将装饰器添加到自动生成的文件中，它们将在每次生成文件时被**覆盖**。相反，创建一个单独的文件并简单地扩展生成的类。

```typescript
import { MinLength, MaxLength } from 'class-validator';
import { Post } from '../../graphql.ts';

export class CreatePostInput extends Post {
  @MinLength(3)
  @MaxLength(50)
  title: string;
}
```

#### GraphQL 参数装饰器 (GraphQL argument decorators)

我们可以使用专用的装饰器访问标准的 GraphQL 解析器参数。下面是 Nest 装饰器与它们代表的普通 Apollo 参数的比较。

<table>
  <tbody>
    <tr>
      <td><code>@Root()</code> 和 <code>@Parent()</code></td>
      <td><code>root</code>/<code>parent</code></td>
    </tr>
    <tr>
      <td><code>@Context(param?: string)</code></td>
      <td><code>context</code> / <code>context[param]</code></td>
    </tr>
    <tr>
      <td><code>@Info(param?: string)</code></td>
      <td><code>info</code> / <code>info[param]</code></td>
    </tr>
    <tr>
      <td><code>@Args(param?: string)</code></td>
      <td><code>args</code> / <code>args[param]</code></td>
    </tr>
  </tbody>
</table>

这些参数具有以下含义：

- `root`：一个对象，包含在父字段上解析器返回的结果，或者，在顶级 `Query` 字段的情况下，包含从服务器配置传递的 `rootValue`。
- `context`：一个在特定查询中所有解析器共享的对象；通常用于包含每个请求的状态。
- `info`：一个包含查询执行状态信息的对象。
- `args`：一个包含查询中传递给字段的参数的对象。

<app-banner-devtools></app-banner-devtools>

#### 模块 (Module)

完成上述步骤后，我们已经声明性地指定了 `GraphQLModule` 生成解析器映射所需的所有信息。`GraphQLModule` 使用反射来内省通过装饰器提供的元数据，并自动将类转换为正确的解析器映射。

您需要处理的唯一其他事情是**提供**（即在某个模块中列为 `provider`）解析器类（`AuthorsResolver`），并在某个地方导入模块（`AuthorsModule`），以便 Nest 能够使用它。

例如，我们可以在 `AuthorsModule` 中执行此操作，它还可以提供在此上下文中需要的其他服务。确保在某个地方导入 `AuthorsModule`（例如，在根模块中，或由根模块导入的某个其他模块中）。

```typescript
@@filename(authors/authors.module)
@Module({
  imports: [PostsModule],
  providers: [AuthorsService, AuthorsResolver],
})
export class AuthorsModule {}
```

> info **提示** 按所谓的**领域模型**组织代码（类似于在 REST API 中组织入口点的方式）是有帮助的。在这种方法中，将您的模型（`ObjectType` 类）、解析器和服务保持在一起，放在代表领域模型的 Nest 模块中。将所有这些组件保持在每个模块的单个文件夹中。当您这样做，并使用 [Nest CLI](/cli/overview) 生成每个元素时，Nest 将自动为您连接所有这些部分（在适当的文件夹中定位文件，在 `provider` 和 `imports` 数组中生成条目等）。
