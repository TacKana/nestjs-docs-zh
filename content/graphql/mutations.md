### 变更（Mutations）

大多数关于 GraphQL 的讨论主要集中在数据获取上，但任何完整的数据平台都需要一种修改服务端数据的方式。在 REST 中，任何请求都可能对服务器产生副作用，但最佳实践建议我们不应在 GET 请求中修改数据。GraphQL 也是类似的——从技术上讲，任何查询都可以被实现为导致数据写入。然而，如同 REST，建议遵循这样一个约定：任何导致写入的操作都应该通过变更（mutation）显式发送（更多信息请参阅[这里](https://graphql.org/learn/queries/#mutations)）。

官方 [Apollo](https://www.apollographql.com/docs/graphql-tools/generate-schema.html) 文档使用了一个 `upvotePost()` 变更的例子。这个变更实现了一个方法来增加帖子的 `votes` 属性值。为了在 Nest 中创建一个等效的变更，我们将使用 `@Mutation()` 装饰器。

#### 代码优先方式

让我们在之前章节使用过的 `AuthorResolver` 中添加另一个方法（参见[解析器](/graphql/resolvers)）。

```typescript
@Mutation(() => Post)
async upvotePost(@Args({ name: 'postId', type: () => Int }) postId: number) {
  return this.postsService.upvoteById({ id: postId });
}
```

> **提示** 所有装饰器（例如 `@Resolver`、`@ResolveField`、`@Args` 等）都是从 `@nestjs/graphql` 包中导出的。

这将在 SDL 中生成以下 GraphQL 模式部分：

```graphql
type Mutation {
  upvotePost(postId: Int!): Post
}
```

`upvotePost()` 方法接受 `postId`（`Int` 类型）作为参数，并返回更新后的 `Post` 实体。出于[解析器](/graphql/resolvers)章节中解释的原因，我们必须明确设置预期的类型。

如果变更需要接受一个对象作为参数，我们可以创建一个**输入类型**。输入类型是一种特殊类型的对象类型，可以作为参数传递（更多信息请参阅[这里](https://graphql.org/learn/schema/#input-types)）。要声明输入类型，请使用 `@InputType()` 装饰器。

```typescript
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpvotePostInput {
  @Field()
  postId: number;
}
```

> **提示** `@InputType()` 装饰器接受一个选项对象作为参数，因此您可以指定输入类型的描述信息。注意，由于 TypeScript 的元数据反射系统限制，您必须使用 `@Field` 装饰器手动指示类型，或使用 [CLI 插件](/graphql/cli-plugin)。

然后我们可以在解析器类中使用这个类型：

```typescript
@Mutation(() => Post)
async upvotePost(
  @Args('upvotePostData') upvotePostData: UpvotePostInput,
) {}
```

#### 架构优先方式

让我们扩展之前章节使用过的 `AuthorResolver`（参见[解析器](/graphql/resolvers)）。

```typescript
@Mutation()
async upvotePost(@Args('postId') postId: number) {
  return this.postsService.upvoteById({ id: postId });
}
```

请注意，我们假设上述业务逻辑已移至 `PostsService`（查询帖子并增加其 `votes` 属性）。`PostsService` 类内部的逻辑可以根据需要简单或复杂。这个例子的主要目的是展示解析器如何与其他提供者交互。

最后一步是将我们的变更添加到现有的类型定义中。

```graphql
type Author {
  id: Int!
  firstName: String
  lastName: String
  posts: [Post]
}

type Post {
  id: Int!
  title: String
  votes: Int
}

type Query {
  author(id: Int!): Author
}

type Mutation {
  upvotePost(postId: Int!): Post
}
```

现在，`upvotePost(postId: Int!): Post` 变更可以作为我们应用程序 GraphQL API 的一部分被调用。