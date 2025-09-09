### 订阅（Subscriptions）

除了使用查询（queries）获取数据和使用变更（mutations）修改数据之外，GraphQL 规范还支持第三种操作类型，称为 `subscription`。GraphQL 订阅是一种将数据从服务器推送到选择监听服务器实时消息的客户端的方式。订阅与查询类似，因为它们都指定了一组要传递给客户端的字段，但它们不会立即返回单个答案，而是打开一个通道，每当服务器上发生特定事件时，都会向客户端发送结果。

订阅的一个常见用例是通知客户端有关特定事件，例如新对象的创建、字段的更新等（了解更多[请点击这里](https://www.apollographql.com/docs/react/data/subscriptions)）。

#### 启用 Apollo 驱动器的订阅功能

要启用订阅，请将 `installSubscriptionHandlers` 属性设置为 `true`。

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  installSubscriptionHandlers: true,
}),
```

> warning **警告** `installSubscriptionHandlers` 配置选项已在最新版本的 Apollo 服务器中移除，并很快将在此包中弃用。默认情况下，`installSubscriptionHandlers` 将回退使用 `subscriptions-transport-ws`（[了解更多](https://github.com/apollographql/subscriptions-transport-ws)），但我们强烈建议改用 `graphql-ws`（[了解更多](https://github.com/enisdenjo/graphql-ws)）库。

要切换使用 `graphql-ws` 包，请使用以下配置：

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  subscriptions: {
    'graphql-ws': true
  },
}),
```

> info **提示** 你也可以同时使用两个包（`subscriptions-transport-ws` 和 `graphql-ws`），例如为了向后兼容。

#### 代码优先（Code first）

要使用代码优先方法创建订阅，我们使用 `@Subscription()` 装饰器（从 `@nestjs/graphql` 包中导出）和来自 `graphql-subscriptions` 包的 `PubSub` 类，该类提供了一个简单的**发布/订阅 API**。

以下订阅处理程序通过调用 `PubSub#asyncIterableIterator` 来**订阅**事件。该方法接受一个参数 `triggerName`，对应于事件主题名称。

```typescript
const pubSub = new PubSub();

@Resolver(() => Author)
export class AuthorResolver {
  // ...
  @Subscription(() => Comment)
  commentAdded() {
    return pubSub.asyncIterableIterator('commentAdded');
  }
}
```

> info **提示** 所有装饰器都从 `@nestjs/graphql` 包中导出，而 `PubSub` 类从 `graphql-subscriptions` 包中导出。

> warning **注意** `PubSub` 是一个暴露简单 `publish` 和 `subscribe API` 的类。了解更多[请点击这里](https://www.apollographql.com/docs/graphql-subscriptions/setup.html)。请注意，Apollo 文档警告默认实现不适合生产环境（了解更多[请点击这里](https://github.com/apollographql/graphql-subscriptions#getting-started-with-your-first-subscription)）。生产应用应使用由外部存储支持的 `PubSub` 实现（了解更多[请点击这里](https://github.com/apollographql/graphql-subscriptions#pubsub-implementations)）。

这将在 GraphQL 模式的 SDL 中生成以下部分：

```graphql
type Subscription {
  commentAdded(): Comment!
}
```

请注意，根据定义，订阅返回一个具有单个顶级属性的对象，其键是订阅的名称。该名称要么继承自订阅处理程序方法的名称（即上面的 `commentAdded`），要么通过将带有键 `name` 的选项作为第二个参数传递给 `@Subscription()` 装饰器来显式提供，如下所示。

```typescript
@Subscription(() => Comment, {
  name: 'commentAdded',
})
subscribeToCommentAdded() {
  return pubSub.asyncIterableIterator('commentAdded');
}
```

这种结构产生与先前代码示例相同的 SDL，但允许我们将方法名称与订阅解耦。

#### 发布（Publishing）

现在，要发布事件，我们使用 `PubSub#publish` 方法。这通常在变更中使用，以在对象图的一部分发生变化时触发客户端更新。例如：

```typescript
@@filename(posts/posts.resolver)
@Mutation(() => Comment)
async addComment(
  @Args('postId', { type: () => Int }) postId: number,
  @Args('comment', { type: () => Comment }) comment: CommentInput,
) {
  const newComment = this.commentsService.addComment({ id: postId, comment });
  pubSub.publish('commentAdded', { commentAdded: newComment });
  return newComment;
}
```

`PubSub#publish` 方法将 `triggerName`（再次将其视为事件主题名称）作为第一个参数，将事件负载作为第二个参数。如前所述，订阅根据定义返回一个值，并且该值具有形状。再次查看我们为 `commentAdded` 订阅生成的 SDL：

```graphql
type Subscription {
  commentAdded(): Comment!
}
```

这告诉我们订阅必须返回一个具有顶级属性名 `commentAdded` 的对象，其值是一个 `Comment` 对象。需要注意的是，由 `PubSub#publish` 方法发出的事件负载的形状必须与从订阅返回的预期值的形状相对应。因此，在我们上面的示例中，`pubSub.publish('commentAdded', {{ '{' }} commentAdded: newComment {{ '}' }})` 语句发布了一个具有适当形状负载的 `commentAdded` 事件。如果这些形状不匹配，你的订阅将在 GraphQL 验证阶段失败。

#### 过滤订阅（Filtering subscriptions）

要过滤掉特定事件，请将 `filter` 属性设置为过滤函数。此函数类似于传递给数组 `filter` 的函数。它接受两个参数：包含事件负载的 `payload`（由事件发布者发送），以及在订阅请求期间传递的任何参数的 `variables`。它返回一个布尔值，确定是否应将此事件发布到客户端监听器。

```typescript
@Subscription(() => Comment, {
  filter: (payload, variables) =>
    payload.commentAdded.title === variables.title,
})
commentAdded(@Args('title') title: string) {
  return pubSub.asyncIterableIterator('commentAdded');
}
```

#### 变更订阅负载（Mutating subscription payloads）

要变更发布的事件负载，请将 `resolve` 属性设置为一个函数。该函数接收事件负载（由事件发布者发送）并返回适当的值。

```typescript
@Subscription(() => Comment, {
  resolve: value => value,
})
commentAdded() {
  return pubSub.asyncIterableIterator('commentAdded');
}
```

> warning **注意** 如果你使用 `resolve` 选项，你应该返回未包装的负载（例如，在我们的示例中，直接返回 `newComment` 对象，而不是 `{{ '{' }} commentAdded: newComment {{ '}' }}` 对象）。

如果需要访问注入的提供者（例如，使用外部服务验证数据），请使用以下结构。

```typescript
@Subscription(() => Comment, {
  resolve(this: AuthorResolver, value) {
    // "this" 指向 "AuthorResolver" 的一个实例
    return value;
  }
})
commentAdded() {
  return pubSub.asyncIterableIterator('commentAdded');
}
```

相同的结构适用于过滤器：

```typescript
@Subscription(() => Comment, {
  filter(this: AuthorResolver, payload, variables) {
    // "this" 指向 "AuthorResolver" 的一个实例
    return payload.commentAdded.title === variables.title;
  }
})
commentAdded() {
  return pubSub.asyncIterableIterator('commentAdded');
}
```

#### 架构优先（Schema first）

要在 Nest 中创建等效的订阅，我们将使用 `@Subscription()` 装饰器。

```typescript
const pubSub = new PubSub();

@Resolver('Author')
export class AuthorResolver {
  // ...
  @Subscription()
  commentAdded() {
    return pubSub.asyncIterableIterator('commentAdded');
  }
}
```

要根据上下文和参数过滤掉特定事件，请设置 `filter` 属性。

```typescript
@Subscription('commentAdded', {
  filter: (payload, variables) =>
    payload.commentAdded.title === variables.title,
})
commentAdded() {
  return pubSub.asyncIterableIterator('commentAdded');
}
```

要变更发布的负载，我们可以使用 `resolve` 函数。

```typescript
@Subscription('commentAdded', {
  resolve: value => value,
})
commentAdded() {
  return pubSub.asyncIterableIterator('commentAdded');
}
```

如果需要访问注入的提供者（例如，使用外部服务验证数据），请使用以下结构：

```typescript
@Subscription('commentAdded', {
  resolve(this: AuthorResolver, value) {
    // "this" 指向 "AuthorResolver" 的一个实例
    return value;
  }
})
commentAdded() {
  return pubSub.asyncIterableIterator('commentAdded');
}
```

相同的结构适用于过滤器：

```typescript
@Subscription('commentAdded', {
  filter(this: AuthorResolver, payload, variables) {
    // "this" 指向 "AuthorResolver" 的一个实例
    return payload.commentAdded.title === variables.title;
  }
})
commentAdded() {
  return pubSub.asyncIterableIterator('commentAdded');
}
```

最后一步是更新类型定义文件。

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

type Comment {
  id: String
  content: String
}

type Subscription {
  commentAdded(title: String!): Comment
}
```

这样，我们就创建了一个 `commentAdded(title: String!): Comment` 订阅。你可以在[这里](https://github.com/nestjs/nest/blob/master/sample/12-graphql-schema-first)找到完整的示例实现。

#### PubSub

我们在上面实例化了一个本地 `PubSub` 实例。首选方法是将 `PubSub` 定义为[提供者](/fundamentals/custom-providers)并通过构造函数（使用 `@Inject()` 装饰器）注入它。这允许我们在整个应用程序中重用该实例。例如，如下定义一个提供者，然后在需要的地方注入 `'PUB_SUB'`。

```typescript
{
  provide: 'PUB_SUB',
  useValue: new PubSub(),
}
```

#### 自定义订阅服务器

要自定义订阅服务器（例如，更改路径），请使用 `subscriptions` 选项属性。

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  subscriptions: {
    'subscriptions-transport-ws': {
      path: '/graphql'
    },
  }
}),
```

如果你使用 `graphql-ws` 包进行订阅，请将 `subscriptions-transport-ws` 键替换为 `graphql-ws`，如下所示：

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  subscriptions: {
    'graphql-ws': {
      path: '/graphql'
    },
  }
}),
```

#### WebSocket 身份验证

检查用户是否已认证可以在 `subscriptions` 选项中指定的 `onConnect` 回调函数中完成。

`onConnect` 将接收作为第一个参数传递给 `SubscriptionClient` 的 `connectionParams`（了解更多[请点击这里](https://www.apollographql.com/docs/react/data/subscriptions/#5-authenticate-over-websocket-optional)）。

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  subscriptions: {
    'subscriptions-transport-ws': {
      onConnect: (connectionParams) => {
        const authToken = connectionParams.authToken;
        if (!isValid(authToken)) {
          throw new Error('Token is not valid');
        }
        // 从令牌中提取用户信息
        const user = parseToken(authToken);
        // 返回用户信息以便稍后添加到上下文
        return { user };
      },
    }
  },
  context: ({ connection }) => {
    // connection.context 将等于 "onConnect" 回调返回的内容
  },
}),
```

此示例中的 `authToken` 仅在连接首次建立时由客户端发送一次。使用此连接进行的所有订阅都将具有相同的 `authToken`，因此具有相同的用户信息。

> warning **注意** `subscriptions-transport-ws` 中存在一个错误，允许连接跳过 `onConnect` 阶段（了解更多[请点击这里](https://github.com/apollographql/subscriptions-transport-ws/issues/349)）。你不应假设在用户开始订阅时调用了 `onConnect`，并始终检查 `context` 是否已填充。

如果你使用 `graphql-ws` 包，`onConnect` 回调的签名将略有不同：

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  subscriptions: {
    'graphql-ws': {
      onConnect: (context: Context<any>) => {
        const { connectionParams, extra } = context;
        // 用户验证将保持与上述示例相同
        // 当与 graphql-ws 一起使用时，额外的上下文值应存储在 extra 字段中
        extra.user = { user: {} };
      },
    },
  },
  context: ({ extra }) => {
    // 现在你可以通过 extra 字段访问你的额外上下文值
  },
});
```

#### 启用 Mercurius 驱动器的订阅功能

要启用订阅，请将 `subscription` 属性设置为 `true`。

```typescript
GraphQLModule.forRoot<MercuriusDriverConfig>({
  driver: MercuriusDriver,
  subscription: true,
}),
```

> info **提示** 你也可以传递选项对象以设置自定义发射器、验证传入连接等。了解更多[请点击这里](https://github.com/mercurius-js/mercurius/blob/master/docs/api/options.md#plugin-options)（参见 `subscription`）。

#### 代码优先（Code first）

要使用代码优先方法创建订阅，我们使用 `@Subscription()` 装饰器（从 `@nestjs/graphql` 包中导出）和来自 `mercurius` 包的 `PubSub` 类，该类提供了一个简单的**发布/订阅 API**。

以下订阅处理程序通过调用 `PubSub#asyncIterableIterator` 来**订阅**事件。该方法接受一个参数 `triggerName`，对应于事件主题名称。

```typescript
@Resolver(() => Author)
export class AuthorResolver {
  // ...
  @Subscription(() => Comment)
  commentAdded(@Context('pubsub') pubSub: PubSub) {
    return pubSub.subscribe('commentAdded');
  }
}
```

> info **提示** 上面示例中使用的所有装饰器都从 `@nestjs/graphql` 包中导出，而 `PubSub` 类从 `mercurius` 包中导出。

> warning **注意** `PubSub` 是一个暴露简单 `publish` 和 `subscribe` API 的类。查看[此部分](https://github.com/mercurius-js/mercurius/blob/master/docs/subscriptions.md#subscriptions-with-custom-pubsub)了解如何注册自定义 `PubSub` 类。

这将在 GraphQL 模式的 SDL 中生成以下部分：

```graphql
type Subscription {
  commentAdded(): Comment!
}
```

请注意，根据定义，订阅返回一个具有单个顶级属性的对象，其键是订阅的名称。该名称要么继承自订阅处理程序方法的名称（即上面的 `commentAdded`），要么通过将带有键 `name` 的选项作为第二个参数传递给 `@Subscription()` 装饰器来显式提供，如下所示。

```typescript
@Subscription(() => Comment, {
  name: 'commentAdded',
})
subscribeToCommentAdded(@Context('pubsub') pubSub: PubSub) {
  return pubSub.subscribe('commentAdded');
}
```

这种结构产生与先前代码示例相同的 SDL，但允许我们将方法名称与订阅解耦。

#### 发布（Publishing）

现在，要发布事件，我们使用 `PubSub#publish` 方法。这通常在变更中使用，以在对象图的一部分发生变化时触发客户端更新。例如：

```typescript
@@filename(posts/posts.resolver)
@Mutation(() => Comment)
async addComment(
  @Args('postId', { type: () => Int }) postId: number,
  @Args('comment', { type: () => Comment }) comment: CommentInput,
  @Context('pubsub') pubSub: PubSub,
) {
  const newComment = this.commentsService.addComment({ id: postId, comment });
  await pubSub.publish({
    topic: 'commentAdded',
    payload: {
      commentAdded: newComment
    }
  });
  return newComment;
}
```

如前所述，订阅根据定义返回一个值，并且该值具有形状。再次查看我们为 `commentAdded` 订阅生成的 SDL：

```graphql
type Subscription {
  commentAdded(): Comment!
}
```

这告诉我们订阅必须返回一个具有顶级属性名 `commentAdded` 的对象，其值是一个 `Comment` 对象。需要注意的是，由 `PubSub#publish` 方法发出的事件负载的形状必须与从订阅返回的预期值的形状相对应。因此，在我们上面的示例中，`pubSub.publish({{ '{' }} topic: 'commentAdded', payload: {{ '{' }} commentAdded: newComment {{ '}' }} {{ '}' }})` 语句发布了一个具有适当形状负载的 `commentAdded` 事件。如果这些形状不匹配，你的订阅将在 GraphQL 验证阶段失败。

#### 过滤订阅（Filtering subscriptions）

要过滤掉特定事件，请将 `filter` 属性设置为过滤函数。此函数类似于传递给数组 `filter` 的函数。它接受两个参数：包含事件负载的 `payload`（由事件发布者发送），以及在订阅请求期间传递的任何参数的 `variables`。它返回一个布尔值，确定是否应将此事件发布到客户端监听器。

```typescript
@Subscription(() => Comment, {
  filter: (payload, variables) =>
    payload.commentAdded.title === variables.title,
})
commentAdded(@Args('title') title: string, @Context('pubsub') pubSub: PubSub) {
  return pubSub.subscribe('commentAdded');
}
```

如果需要访问注入的提供者（例如，使用外部服务验证数据），请使用以下结构。

```typescript
@Subscription(() => Comment, {
  filter(this: AuthorResolver, payload, variables) {
    // "this" 指向 "AuthorResolver" 的一个实例
    return payload.commentAdded.title === variables.title;
  }
})
commentAdded(@Args('title') title: string, @Context('pubsub') pubSub: PubSub) {
  return pubSub.subscribe('commentAdded');
}
```

#### 架构优先（Schema first）

要在 Nest 中创建等效的订阅，我们将使用 `@Subscription()` 装饰器。

```typescript
const pubSub = new PubSub();

@Resolver('Author')
export class AuthorResolver {
  // ...
  @Subscription()
  commentAdded(@Context('pubsub') pubSub: PubSub) {
    return pubSub.subscribe('commentAdded');
  }
}
```

要根据上下文和参数过滤掉特定事件，请设置 `filter` 属性。

```typescript
@Subscription('commentAdded', {
  filter: (payload, variables) =>
    payload.commentAdded.title === variables.title,
})
commentAdded(@Context('pubsub') pubSub: PubSub) {
  return pubSub.subscribe('commentAdded');
}
```

如果需要访问注入的提供者（例如，使用外部服务验证数据），请使用以下结构：

```typescript
@Subscription('commentAdded', {
  filter(this: AuthorResolver, payload, variables) {
    // "this" 指向 "AuthorResolver" 的一个实例
    return payload.commentAdded.title === variables.title;
  }
})
commentAdded(@Context('pubsub') pubSub: PubSub) {
  return pubSub.subscribe('commentAdded');
}
```

最后一步是更新类型定义文件。

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

type Comment {
  id: String
  content: String
}

type Subscription {
  commentAdded(title: String!): Comment
}
```

这样，我们就创建了一个 `commentAdded(title: String!): Comment` 订阅。

#### PubSub

在上面的示例中，我们使用了默认的 `PubSub` 发射器（[mqemitter](https://github.com/mcollina/mqemitter)）
首选方法（用于生产）是使用 `mqemitter-redis`。或者，可以提供自定义 `PubSub` 实现（了解更多[请点击这里](https://github.com/mercurius-js/mercurius/blob/master/docs/subscriptions.md)）

```typescript
GraphQLModule.forRoot<MercuriusDriverConfig>({
  driver: MercuriusDriver,
  subscription: {
    emitter: require('mqemitter-redis')({
      port: 6579,
      host: '127.0.0.1',
    }),
  },
});
```

#### WebSocket 身份验证

检查用户是否已认证可以在 `subscription` 选项中指定的 `verifyClient` 回调函数中完成。

`verifyClient` 将接收 `info` 对象作为第一个参数，你可以使用它来检索请求的标头。

```typescript
GraphQLModule.forRoot<MercuriusDriverConfig>({
  driver: MercuriusDriver,
  subscription: {
    verifyClient: (info, next) => {
      const authorization = info.req.headers?.authorization as string;
      if (!authorization?.startsWith('Bearer ')) {
        return next(false);
      }
      next(true);
    },
  }
}),
```
