### 联邦（Federation）

联邦（Federation）提供了一种将单体 GraphQL 服务器拆分为独立微服务的方法。它由两个组件组成：一个网关（gateway）以及一个或多个联邦微服务（federated microservices）。每个微服务持有部分模式（schema），网关则将这些模式合并成一个可供客户端使用的单一模式。

引用 [Apollo 文档](https://blog.apollographql.com/apollo-federation-f260cf525d21)中的说法，联邦的设计遵循以下核心原则：

- 构建图应该是**声明式**的。通过联邦，您可以在模式内部以声明方式组合图，而不是编写命令式的模式拼接代码。
- 代码应按**关注点**而非类型进行分离。通常，没有单一团队会控制重要类型（如 User 或 Product）的每个方面，因此这些类型的定义应分布在各个团队和代码库中，而不是集中管理。
- 图应便于客户端使用。联邦服务共同形成一个完整的、以产品为中心的图，准确反映其在客户端上的使用方式。
- 它只是 **GraphQL**，仅使用语言规范中兼容的功能。任何语言，不仅仅是 JavaScript，都可以实现联邦。

> warning **警告** 联邦目前不支持订阅（subscriptions）。

在接下来的部分中，我们将设置一个演示应用程序，包括一个网关和两个联邦端点：用户服务（Users service）和帖子服务（Posts service）。

#### 使用 Apollo 进行联邦

首先安装所需的依赖项：

```bash
$ npm install --save @apollo/subgraph
```

#### 模式优先（Schema first）

“用户服务”提供了一个简单的模式。请注意 `@key` 指令：它指示 Apollo 查询规划器，如果指定了 `id`，则可以获取 `User` 的特定实例。此外，请注意我们使用 `extend` 扩展了 `Query` 类型。

```graphql
type User @key(fields: "id") {
  id: ID!
  name: String!
}

extend type Query {
  getUser(id: ID!): User
}
```

解析器提供了一个名为 `resolveReference()` 的额外方法。每当相关资源需要 User 实例时，Apollo 网关就会触发此方法。我们稍后将在帖子服务中看到此方法的示例。请注意，该方法必须使用 `@ResolveReference()` 装饰器进行注解。

```typescript
import { Args, Query, Resolver, ResolveReference } from '@nestjs/graphql';
import { UsersService } from './users.service';

@Resolver('User')
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Query()
  getUser(@Args('id') id: string) {
    return this.usersService.findById(id);
  }

  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }) {
    return this.usersService.findById(reference.id);
  }
}
```

最后，我们通过注册 `GraphQLModule` 并在配置对象中传递 `ApolloFederationDriver` 驱动来将所有内容连接起来：

```typescript
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { UsersResolver } from './users.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      typePaths: ['**/*.graphql'],
    }),
  ],
  providers: [UsersResolver],
})
export class AppModule {}
```

#### 代码优先（Code first）

首先，向 `User` 实体添加一些额外的装饰器。

```ts
import { Directive, Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  id: number;

  @Field()
  name: string;
}
```

解析器提供了一个名为 `resolveReference()` 的额外方法。每当相关资源需要 User 实例时，Apollo 网关就会触发此方法。我们稍后将在帖子服务中看到此方法的示例。请注意，该方法必须使用 `@ResolveReference()` 装饰器进行注解。

```ts
import { Args, Query, Resolver, ResolveReference } from '@nestjs/graphql';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Resolver(() => User)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Query(() => User)
  getUser(@Args('id') id: number): User {
    return this.usersService.findById(id);
  }

  @ResolveReference()
  resolveReference(reference: { __typename: string; id: number }): User {
    return this.usersService.findById(reference.id);
  }
}
```

最后，我们通过注册 `GraphQLModule` 并在配置对象中传递 `ApolloFederationDriver` 驱动来将所有内容连接起来：

```typescript
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service'; // 此示例中未包含

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: true,
    }),
  ],
  providers: [UsersResolver, UsersService],
})
export class AppModule {}
```

代码优先模式下可用的工作示例在[此处](https://github.com/nestjs/nest/tree/master/sample/31-graphql-federation-code-first/users-application)，模式优先模式下在[此处](https://github.com/nestjs/nest/tree/master/sample/32-graphql-federation-schema-first/users-application)。

#### 联邦示例：帖子（Posts）

帖子服务应通过 `getPosts` 查询提供聚合的帖子，同时使用 `user.posts` 字段扩展我们的 `User` 类型。

#### 模式优先

“帖子服务”在其模式中通过 `extend` 关键字引用 `User` 类型。它还在 `User` 类型上声明了一个额外的属性（`posts`）。请注意用于匹配 User 实例的 `@key` 指令，以及指示 `id` 字段在其他位置管理的 `@external` 指令。

```graphql
type Post @key(fields: "id") {
  id: ID!
  title: String!
  body: String!
  user: User
}

extend type User @key(fields: "id") {
  id: ID! @external
  posts: [Post]
}

extend type Query {
  getPosts: [Post]
}
```

在以下示例中，`PostsResolver` 提供了 `getUser()` 方法，该方法返回一个包含 `__typename` 和应用程序可能需要解析引用的其他属性的引用，此处为 `id`。GraphQL 网关使用 `__typename` 来精确定位负责 User 类型的微服务并检索相应的实例。执行 `resolveReference()` 方法时将请求上述的“用户服务”。

```typescript
import { Query, Resolver, Parent, ResolveField } from '@nestjs/graphql';
import { PostsService } from './posts.service';
import { Post } from './posts.interfaces';

@Resolver('Post')
export class PostsResolver {
  constructor(private postsService: PostsService) {}

  @Query('getPosts')
  getPosts() {
    return this.postsService.findAll();
  }

  @ResolveField('user')
  getUser(@Parent() post: Post) {
    return { __typename: 'User', id: post.userId };
  }
}
```

最后，我们必须注册 `GraphQLModule`，类似于我们在“用户服务”部分中所做的操作。

```typescript
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { PostsResolver } from './posts.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      typePaths: ['**/*.graphql'],
    }),
  ],
  providers: [PostsResolvers],
})
export class AppModule {}
```

#### 代码优先

首先，我们必须声明一个表示 `User` 实体的类。尽管实体本身位于另一个服务中，但我们将在此处使用它（扩展其定义）。请注意 `@extends` 和 `@external` 指令。

```ts
import { Directive, ObjectType, Field, ID } from '@nestjs/graphql';
import { Post } from './post.entity';

@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  @Directive('@external')
  id: number;

  @Field(() => [Post])
  posts?: Post[];
}
```

现在，为我们在 `User` 实体上的扩展创建相应的解析器，如下所示：

```ts
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PostsService } from './posts.service';
import { Post } from './post.entity';
import { User } from './user.entity';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly postsService: PostsService) {}

  @ResolveField(() => [Post])
  public posts(@Parent() user: User): Post[] {
    return this.postsService.forAuthor(user.id);
  }
}
```

我们还必须定义 `Post` 实体类：

```ts
import { Directive, Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { User } from './user.entity';

@ObjectType()
@Directive('@key(fields: "id")')
export class Post {
  @Field(() => ID)
  id: number;

  @Field()
  title: string;

  @Field(() => Int)
  authorId: number;

  @Field(() => User)
  user?: User;
}
```

及其解析器：

```ts
import { Query, Args, ResolveField, Resolver, Parent } from '@nestjs/graphql';
import { PostsService } from './posts.service';
import { Post } from './post.entity';
import { User } from './user.entity';

@Resolver(() => Post)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @Query(() => Post)
  findPost(@Args('id') id: number): Post {
    return this.postsService.findOne(id);
  }

  @Query(() => [Post])
  getPosts(): Post[] {
    return this.postsService.all();
  }

  @ResolveField(() => User)
  user(@Parent() post: Post): any {
    return { __typename: 'User', id: post.authorId };
  }
}
```

最后，在模块中将所有内容连接起来。请注意模式构建选项，其中我们指定 `User` 是一个孤立（外部）类型。

```ts
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { User } from './user.entity';
import { PostsResolvers } from './posts.resolvers';
import { UsersResolvers } from './users.resolvers';
import { PostsService } from './posts.service'; // 此示例中未包含

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: true,
      buildSchemaOptions: {
        orphanedTypes: [User],
      },
    }),
  ],
  providers: [PostsResolver, UsersResolver, PostsService],
})
export class AppModule {}
```

代码优先模式下可用的工作示例在[此处](https://github.com/nestjs/nest/tree/master/sample/31-graphql-federation-code-first/posts-application)，模式优先模式下在[此处](https://github.com/nestjs/nest/tree/master/sample/32-graphql-federation-schema-first/posts-application)。

#### 联邦示例：网关（Gateway）

首先安装所需的依赖项：

```bash
$ npm install --save @apollo/gateway
```

网关需要指定端点列表，并将自动发现相应的模式。因此，网关服务的实现对于代码优先和模式优先方法都将保持不变。

```typescript
import { IntrospectAndCompose } from '@apollo/gateway';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      server: {
        // ... Apollo 服务器选项
        cors: true,
      },
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            { name: 'users', url: 'http://user-service/graphql' },
            { name: 'posts', url: 'http://post-service/graphql' },
          ],
        }),
      },
    }),
  ],
})
export class AppModule {}
```

代码优先模式下可用的工作示例在[此处](https://github.com/nestjs/nest/tree/master/sample/31-graphql-federation-code-first/gateway)，模式优先模式下在[此处](https://github.com/nestjs/nest/tree/master/sample/32-graphql-federation-schema-first/gateway)。

#### 使用 Mercurius 进行联邦

首先安装所需的依赖项：

```bash
$ npm install --save @apollo/subgraph @nestjs/mercurius
```

> info **注意** 构建子图模式（`buildSubgraphSchema`、`printSubgraphSchema` 函数）需要 `@apollo/subgraph` 包。

#### 模式优先

“用户服务”提供了一个简单的模式。请注意 `@key` 指令：它指示 Mercurius 查询规划器，如果指定了 `id`，则可以获取 `User` 的特定实例。此外，请注意我们使用 `extend` 扩展了 `Query` 类型。

```graphql
type User @key(fields: "id") {
  id: ID!
  name: String!
}

extend type Query {
  getUser(id: ID!): User
}
```

解析器提供了一个名为 `resolveReference()` 的额外方法。每当相关资源需要 User 实例时，Mercurius 网关就会触发此方法。我们稍后将在帖子服务中看到此方法的示例。请注意，该方法必须使用 `@ResolveReference()` 装饰器进行注解。

```typescript
import { Args, Query, Resolver, ResolveReference } from '@nestjs/graphql';
import { UsersService } from './users.service';

@Resolver('User')
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Query()
  getUser(@Args('id') id: string) {
    return this.usersService.findById(id);
  }

  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }) {
    return this.usersService.findById(reference.id);
  }
}
```

最后，我们通过注册 `GraphQLModule` 并在配置对象中传递 `MercuriusFederationDriver` 驱动来将所有内容连接起来：

```typescript
import {
  MercuriusFederationDriver,
  MercuriusFederationDriverConfig,
} from '@nestjs/mercurius';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { UsersResolver } from './users.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusFederationDriverConfig>({
      driver: MercuriusFederationDriver,
      typePaths: ['**/*.graphql'],
      federationMetadata: true,
    }),
  ],
  providers: [UsersResolver],
})
export class AppModule {}
```

#### 代码优先

首先，向 `User` 实体添加一些额外的装饰器。

```ts
import { Directive, Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  id: number;

  @Field()
  name: string;
}
```

解析器提供了一个名为 `resolveReference()` 的额外方法。每当相关资源需要 User 实例时，Mercurius 网关就会触发此方法。我们稍后将在帖子服务中看到此方法的示例。请注意，该方法必须使用 `@ResolveReference()` 装饰器进行注解。

```ts
import { Args, Query, Resolver, ResolveReference } from '@nestjs/graphql';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Resolver(() => User)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Query(() => User)
  getUser(@Args('id') id: number): User {
    return this.usersService.findById(id);
  }

  @ResolveReference()
  resolveReference(reference: { __typename: string; id: number }): User {
    return this.usersService.findById(reference.id);
  }
}
```

最后，我们通过注册 `GraphQLModule` 并在配置对象中传递 `MercuriusFederationDriver` 驱动来将所有内容连接起来：

```typescript
import {
  MercuriusFederationDriver,
  MercuriusFederationDriverConfig,
} from '@nestjs/mercurius';
import { Module } from '@nestjs/common';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service'; // 此示例中未包含

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusFederationDriverConfig>({
      driver: MercuriusFederationDriver,
      autoSchemaFile: true,
      federationMetadata: true,
    }),
  ],
  providers: [UsersResolver, UsersService],
})
export class AppModule {}
```

#### 联邦示例：帖子（Posts）

帖子服务应通过 `getPosts` 查询提供聚合的帖子，同时使用 `user.posts` 字段扩展我们的 `User` 类型。

#### 模式优先

“帖子服务”在其模式中通过 `extend` 关键字引用 `User` 类型。它还在 `User` 类型上声明了一个额外的属性（`posts`）。请注意用于匹配 User 实例的 `@key` 指令，以及指示 `id` 字段在其他位置管理的 `@external` 指令。

```graphql
type Post @key(fields: "id") {
  id: ID!
  title: String!
  body: String!
  user: User
}

extend type User @key(fields: "id") {
  id: ID! @external
  posts: [Post]
}

extend type Query {
  getPosts: [Post]
}
```

在以下示例中，`PostsResolver` 提供了 `getUser()` 方法，该方法返回一个包含 `__typename` 和应用程序可能需要解析引用的其他属性的引用，此处为 `id`。GraphQL 网关使用 `__typename` 来精确定位负责 User 类型的微服务并检索相应的实例。执行 `resolveReference()` 方法时将请求上述的“用户服务”。

```typescript
import { Query, Resolver, Parent, ResolveField } from '@nestjs/graphql';
import { PostsService } from './posts.service';
import { Post } from './posts.interfaces';

@Resolver('Post')
export class PostsResolver {
  constructor(private postsService: PostsService) {}

  @Query('getPosts')
  getPosts() {
    return this postsService.findAll();
  }

  @ResolveField('user')
  getUser(@Parent() post: Post) {
    return { __typename: 'User', id: post.userId };
  }
}
```

最后，我们必须注册 `GraphQLModule`，类似于我们在“用户服务”部分中所做的操作。

```typescript
import {
  MercuriusFederationDriver,
  MercuriusFederationDriverConfig,
} from '@nestjs/mercurius';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { PostsResolver } from './posts.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusFederationDriverConfig>({
      driver: MercuriusFederationDriver,
      federationMetadata: true,
      typePaths: ['**/*.graphql'],
    }),
  ],
  providers: [PostsResolvers],
})
export class AppModule {}
```

#### 代码优先

首先，我们必须声明一个表示 `User` 实体的类。尽管实体本身位于另一个服务中，但我们将在此处使用它（扩展其定义）。请注意 `@extends` 和 `@external` 指令。

```ts
import { Directive, ObjectType, Field, ID } from '@nestjs/graphql';
import { Post } from './post.entity';

@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  @Directive('@external')
  id: number;

  @Field(() => [Post])
  posts?: Post[];
}
```

现在，为我们在 `User` 实体上的扩展创建相应的解析器，如下所示：

```ts
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PostsService } from './posts.service';
import { Post } from './post.entity';
import { User } from './user.entity';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly postsService: PostsService) {}

  @ResolveField(() => [Post])
  public posts(@Parent() user: User): Post[] {
    return this.postsService.forAuthor(user.id);
  }
}
```

我们还必须定义 `Post` 实体类：

```ts
import { Directive, Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { User } from './user.entity';

@ObjectType()
@Directive('@key(fields: "id")')
export class Post {
  @Field(() => ID)
  id: number;

  @Field()
  title: string;

  @Field(() => Int)
  authorId: number;

  @Field(() => User)
  user?: User;
}
```

及其解析器：

```ts
import { Query, Args, ResolveField, Resolver, Parent } from '@nestjs/graphql';
import { PostsService } from './posts.service';
import { Post } from './post.entity';
import { User } from './user.entity';

@Resolver(() => Post)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @Query(() => Post)
  findPost(@Args('id') id: number): Post {
    return this.postsService.findOne(id);
  }

  @Query(() => [Post])
  getPosts(): Post[] {
    return this.postsService.all();
  }

  @ResolveField(() => User)
  user(@Parent() post: Post): any {
    return { __typename: 'User', id: post.authorId };
  }
}
```

最后，在模块中将所有内容连接起来。请注意模式构建选项，其中我们指定 `User` 是一个孤立（外部）类型。

```ts
import {
  MercuriusFederationDriver,
  MercuriusFederationDriverConfig,
} from '@nestjs/mercurius';
import { Module } from '@nestjs/common';
import { User } from './user.entity';
import { PostsResolvers } from './posts.resolvers';
import { UsersResolvers } from './users.resolvers';
import { PostsService } from './posts.service'; // 此示例中未包含

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusFederationDriverConfig>({
      driver: MercuriusFederationDriver,
      autoSchemaFile: true,
      federationMetadata: true,
      buildSchemaOptions: {
        orphanedTypes: [User],
      },
    }),
  ],
  providers: [PostsResolver, UsersResolver, PostsService],
})
export class AppModule {}
```

#### 联邦示例：网关（Gateway）

网关需要指定端点列表，并将自动发现相应的模式。因此，网关服务的实现对于代码优先和模式优先方法都将保持不变。

```typescript
import {
  MercuriusGatewayDriver,
  MercuriusGatewayDriverConfig,
} from '@nestjs/mercurius';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusGatewayDriverConfig>({
      driver: MercuriusGatewayDriver,
      gateway: {
        services: [
          { name: 'users', url: 'http://user-service/graphql' },
          { name: 'posts', url: 'http://post-service/graphql' },
        ],
      },
    }),
  ],
})
export class AppModule {}
```

### 联邦 2（Federation 2）

引用 [Apollo 文档](https://www.apollographql.com/docs/federation/federation-2/new-in-federation-2)中的说法，联邦 2 在原始 Apollo Federation（本文档中称为 Federation 1）的基础上改进了开发人员体验，并且与大多数原始超级图向后兼容。

> warning **警告** Mercurius 不完全支持 Federation 2。您可以在[此处](https://www.apollographql.com/docs/federation/supported-subgraphs#javascript--typescript)查看支持 Federation 2 的库列表。

在接下来的部分中，我们将把之前的示例升级到 Federation 2。

#### 联邦示例：用户（Users）

Federation 2 中的一个变化是实体没有起源子图，因此我们不再需要扩展 `Query`。更多详情请参考 Apollo Federation 2 文档中的[实体主题](https://www.apollographql.com/docs/federation/federation-2/new-in-federation-2#entities)。

#### 模式优先

我们可以简单地从模式中移除 `extend` 关键字。

```graphql
type User @key(fields: "id") {
  id: ID!
  name: String!
}

type Query {
  getUser(id: ID!): User
}
```

#### 代码优先

要使用 Federation 2，我们需要在 `autoSchemaFile` 选项中指定联邦版本。

```ts
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service'; // 此示例中未包含

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
    }),
  ],
  providers: [UsersResolver, UsersService],
})
export class AppModule {}
```

#### 联邦示例：帖子（Posts）

出于与上述相同的原因，我们不再需要扩展 `User` 和 `Query`。

#### 模式优先

我们可以简单地从模式中移除 `extend` 和 `external` 指令。

```graphql
type Post @key(fields: "id") {
  id: ID!
  title: String!
  body: String!
  user: User
}

type User @key(fields: "id") {
  id: ID!
  posts: [Post]
}

type Query {
  getPosts: [Post]
}
```

#### 代码优先

由于我们不再扩展 `User` 实体，我们可以简单地从 `User` 中移除 `extends` 和 `external` 指令。

```ts
import { Directive, ObjectType, Field, ID } from '@nestjs/graphql';
import { Post } from './post.entity';

@ObjectType()
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  id: number;

  @Field(() => [Post])
  posts?: Post[];
}
```

同样，与用户服务类似，我们需要在 `GraphQLModule` 中指定使用 Federation 2。

```ts
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { User } from './user.entity';
import { PostsResolvers } from './posts.resolvers';
import { UsersResolvers } from './users.resolvers';
import { PostsService } from './posts.service'; // 此示例中未包含

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      buildSchemaOptions: {
        orphanedTypes: [User],
      },
    }),
  ],
  providers: [PostsResolver, UsersResolver, PostsService],
})
export class AppModule {}
```