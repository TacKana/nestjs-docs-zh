## 发挥 TypeScript 与 GraphQL 的强大能力

[GraphQL](https://graphql.org/) 是一门强大的 API 查询语言，也是一个用于使用现有数据完成这些查询的运行时。它提供了一种优雅的方法，解决了 REST API 常见的问题。作为背景知识，我们建议阅读这篇关于 GraphQL 和 REST 的[对比](https://www.apollographql.com/blog/graphql-vs-rest)。GraphQL 结合 [TypeScript](https://www.typescriptlang.org/)，可以帮助你在 GraphQL 查询中实现更好的类型安全，为你提供端到端的类型支持。

在本章中，我们假设你已经对 GraphQL 有基本的了解，并重点介绍如何使用内置的 `@nestjs/graphql` 模块。`GraphQLModule` 可以配置为使用 [Apollo](https://www.apollographql.com/) 服务器（通过 `@nestjs/apollo` 驱动）和 [Mercurius](https://github.com/mercurius-js/mercurius)（通过 `@nestjs/mercurius` 驱动）。我们为这些成熟的 GraphQL 包提供了官方集成，以便在 Nest 中使用 GraphQL（详见[更多集成](/graphql/quick-start#third-party-integrations)）。

你也可以构建自己的专用驱动（[了解更多](/graphql/other-features#creating-a-custom-driver)）。

#### 安装

首先安装所需的包：

```bash
# 用于 Express 和 Apollo（默认）
$ npm i @nestjs/graphql @nestjs/apollo @apollo/server@^4.12.2 graphql

# 用于 Fastify 和 Apollo
# npm i @nestjs/graphql @nestjs/apollo @apollo/server@^4.12.2 @as-integrations/fastify graphql

# 用于 Fastify 和 Mercurius
# npm i @nestjs/graphql @nestjs/mercurius graphql mercurius
```

> warning **警告** `@nestjs/graphql@>=9` 和 `@nestjs/apollo^10` 包与 **Apollo v3** 兼容（查看 Apollo Server 3 [迁移指南](https://www.apollographql.com/docs/apollo-server/migration/) 获取更多详情），而 `@nestjs/graphql@^8` 仅支持 **Apollo v2**（例如 `apollo-server-express@2.x.x` 包）。

#### 概述

Nest 提供了两种构建 GraphQL 应用的方法：**代码优先**和**模式优先**。你应该选择最适合你的方式。GraphQL 章节中的大部分内容都分为两个主要部分：一部分适用于采用**代码优先**的方式，另一部分适用于采用**模式优先**的方式。

在**代码优先**方法中，你使用装饰器和 TypeScript 类来生成相应的 GraphQL 模式。如果你更喜欢完全使用 TypeShell 工作，避免在不同语言语法之间切换上下文，这种方法非常有用。

在**模式优先**方法中，核心是 GraphQL SDL（模式定义语言）文件。SDL 是一种与语言无关的方式，用于在不同平台之间共享模式文件。Nest 根据 GraphQL 模式自动生成你的 TypeScript 定义（使用类或接口），以减少编写冗余样板代码的需要。

<app-banner-courses-graphql-cf></app-banner-courses-graphql-cf>

#### 开始使用 GraphQL 和 TypeScript

> info **提示** 在接下来的章节中，我们将集成 `@nestjs/apollo` 包。如果你想使用 `mercurius` 包，请跳转到[此部分](/graphql/quick-start#mercurius-integration)。

安装包后，我们可以导入 `GraphQLModule` 并使用 `forRoot()` 静态方法进行配置。

```typescript
@@filename()
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
    }),
  ],
})
export class AppModule {}
```

> info **提示** 对于 `mercurius` 集成，你应该使用 `MercuriusDriver` 和 `MercuriusDriverConfig`。两者都从 `@nestjs/mercurius` 包中导出。

`forRoot()` 方法接受一个选项对象作为参数。这些选项会传递给底层驱动实例（关于可用设置的更多信息，请参阅：[Apollo](https://www.apollographql.com/docs/apollo-server/api/apollo-server) 和 [Mercurius](https://github.com/mercurius-js/mercurius/blob/master/docs/api/options.md#plugin-options)）。例如，如果你想禁用 `playground` 并关闭 `debug` 模式（对于 Apollo），传递以下选项：

```typescript
@@filename()
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
    }),
  ],
})
export class AppModule {}
```

在这种情况下，这些选项将转发给 `ApolloServer` 构造函数。

#### GraphQL Playground

Playground 是一个图形化的、交互式的、浏览器内的 GraphQL IDE，默认情况下与 GraphQL 服务器本身位于相同的 URL。要访问 playground，你需要一个配置并运行的基本 GraphQL 服务器。要立即查看，你可以安装并构建[这里的示例](https://github.com/nestjs/nest/tree/master/sample/23-graphql-code-first)。或者，如果你正在按照这些代码示例操作，一旦完成了[解析器章节](/graphql/resolvers-map)中的步骤，你就可以访问 playground。

完成这些步骤后，当你的应用程序在后台运行时，你可以打开浏览器并导航到 `http://localhost:3000/graphql`（主机和端口可能因你的配置而异）。然后你将看到如下图所示的 GraphQL playground。

<figure>
  <img src="/assets/playground.png" alt="" />
</figure>

> info **注意** `@nestjs/mercurius` 集成不包含内置的 GraphQL Playground 集成。相反，你可以使用 [GraphiQL](https://github.com/graphql/graphiql)（设置 `graphiql: true`）。

> warning **警告** 更新（2025 年 4 月 14 日）：默认的 Apollo playground 已被弃用，并将在下一个主要版本中移除。你可以使用 [GraphiQL](https://github.com/graphql/graphiql)，只需在 `GraphQLModule` 配置中设置 `graphiql: true`，如下所示：
>
> ```typescript
> GraphQLModule.forRoot<ApolloDriverConfig>({
>   driver: ApolloDriver,
>   graphiql: true,
> }),
> ```
>
> 如果你的应用使用了[订阅](/graphql/subscriptions)，请确保使用 `graphql-ws`，因为 GraphiQL 不支持 `subscriptions-transport-ws`。

#### 代码优先

在**代码优先**方法中，你使用装饰器和 TypeScript 类来生成相应的 GraphQL 模式。

要使用代码优先方法，首先在选项对象中添加 `autoSchemaFile` 属性：

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
}),
```

`autoSchemaFile` 属性值是你自动生成的模式将被创建的路径。或者，模式可以在内存中动态生成。要启用此功能，将 `autoSchemaFile` 属性设置为 `true`：

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: true,
}),
```

默认情况下，生成模式中的类型将按照它们在包含的模块中定义的顺序排列。要按字典顺序对模式进行排序，将 `sortSchema` 属性设置为 `true`：

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
  sortSchema: true,
}),
```

#### 示例

一个完整工作的代码优先示例可在[这里](https://github.com/nestjs/nest/tree/master/sample/23-graphql-code-first)找到。

#### 模式优先

要使用模式优先方法，首先在选项对象中添加 `typePaths` 属性。`typePaths` 属性指示 `GraphQLModule` 应在何处查找你将编写的 GraphQL SDL 模式定义文件。这些文件将在内存中合并；这允许你将模式拆分为多个文件，并将它们放置在解析器附近。

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  typePaths: ['./**/*.graphql'],
}),
```

你通常还需要具有与 GraphQL SDL 类型对应的 TypeScript 定义（类和接口）。手动创建相应的 TypeScript 定义是冗余且繁琐的。这使我们缺乏单一的真实来源——每次在 SDL 中进行更改都会迫使我们调整 TypeScript 定义。为了解决这个问题，`@nestjs/graphql` 包可以从抽象语法树（[AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree)）**自动生成** TypeScript 定义。要启用此功能，在配置 `GraphQLModule` 时添加 `definitions` 选项属性。

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  typePaths: ['./**/*.graphql'],
  definitions: {
    path: join(process.cwd(), 'src/graphql.ts'),
  },
}),
```

`definitions` 对象的路径属性指示保存生成的 TypeScript 输出的位置。默认情况下，所有生成的 TypeScript 类型都创建为接口。要生成类，请将 `outputAs` 属性指定为 `'class'`。

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  typePaths: ['./**/*.graphql'],
  definitions: {
    path: join(process.cwd(), 'src/graphql.ts'),
    outputAs: 'class',
  },
}),
```

上述方法在每次应用启动时动态生成 TypeScript 定义。或者，可能更倾向于构建一个简单的脚本，以便按需生成这些定义。例如，假设我们创建以下脚本作为 `generate-typings.ts`：

```typescript
import { GraphQLDefinitionsFactory } from '@nestjs/graphql';
import { join } from 'path';

const definitionsFactory = new GraphQLDefinitionsFactory();
definitionsFactory.generate({
  typePaths: ['./src/**/*.graphql'],
  path: join(process.cwd(), 'src/graphql.ts'),
  outputAs: 'class',
});
```

现在你可以按需运行此脚本：

```bash
$ ts-node generate-typings
```

> info **提示** 你可以预先编译脚本（例如使用 `tsc`）并使用 `node` 执行它。

要为脚本启用监视模式（以便在任何 `.graphql` 文件更改时自动生成类型定义），将 `watch` 选项传递给 `generate()` 方法。

```typescript
definitionsFactory.generate({
  typePaths: ['./src/**/*.graphql'],
  path: join(process.cwd(), 'src/graphql.ts'),
  outputAs: 'class',
  watch: true,
});
```

要为每个对象类型自动生成额外的 `__typename` 字段，启用 `emitTypenameField` 选项：

```typescript
definitionsFactory.generate({
  // ...
  emitTypenameField: true,
});
```

要将解析器（查询、变更、订阅）生成为没有参数的普通字段，启用 `skipResolverArgs` 选项：

```typescript
definitionsFactory.generate({
  // ...
  skipResolverArgs: true,
});
```

要将枚举生成为 TypeScript 联合类型而不是常规的 TypeScript 枚举，将 `enumsAsTypes` 选项设置为 `true`：

```typescript
definitionsFactory.generate({
  // ...
  enumsAsTypes: true,
});
```

#### Apollo Sandbox

要使用 [Apollo Sandbox](https://www.apollographql.com/blog/announcement/platform/apollo-sandbox-an-open-graphql-ide-for-local-development/) 而不是 `graphql-playground` 作为本地开发的 GraphQL IDE，使用以下配置：

```typescript
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
    }),
  ],
})
export class AppModule {}
```

#### 示例

一个完整工作的模式优先示例可在[这里](https://github.com/nestjs/nest/tree/master/sample/12-graphql-schema-first)找到。

#### 访问生成的模式

在某些情况下（例如端到端测试），你可能希望获取对生成的模式对象的引用。在端到端测试中，你可以使用 `graphql` 对象运行查询，而无需使用任何 HTTP 监听器。

你可以使用 `GraphQLSchemaHost` 类访问生成的模式（无论是代码优先还是模式优先方法）：

```typescript
const { schema } = app.get(GraphQLSchemaHost);
```

> info **提示** 你必须在应用初始化后（在 `onModuleInit` 钩子被 `app.listen()` 或 `app.init()` 方法触发后）调用 `GraphQLSchemaHost#schema` getter。

#### 异步配置

当你需要异步传递模块选项而不是静态传递时，使用 `forRootAsync()` 方法。与大多数动态模块一样，Nest 提供了几种处理异步配置的技术。

一种技术是使用工厂函数：

```typescript
 GraphQLModule.forRootAsync<ApolloDriverConfig>({
  driver: ApolloDriver,
  useFactory: () => ({
    typePaths: ['./**/*.graphql'],
  }),
}),
```

与其他工厂提供者一样，我们的工厂函数可以是 <a href="/fundamentals/custom-providers#factory-providers-usefactory">异步的</a>，并且可以通过 `inject` 注入依赖项。

```typescript
GraphQLModule.forRootAsync<ApolloDriverConfig>({
  driver: ApolloDriver,
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    typePaths: configService.get<string>('GRAPHQL_TYPE_PATHS'),
  }),
  inject: [ConfigService],
}),
```

或者，你可以使用类而不是工厂来配置 `GraphQLModule`，如下所示：

```typescript
GraphQLModule.forRootAsync<ApolloDriverConfig>({
  driver: ApolloDriver,
  useClass: GqlConfigService,
}),
```

上述构造在 `GraphQLModule` 内部实例化 `GqlConfigService`，使用它来创建选项对象。注意，在这个例子中，`GqlConfigService` 必须实现 `GqlOptionsFactory` 接口，如下所示。`GraphQLModule` 将在提供的类的实例化对象上调用 `createGqlOptions()` 方法。

```typescript
@Injectable()
class GqlConfigService implements GqlOptionsFactory {
  createGqlOptions(): ApolloDriverConfig {
    return {
      typePaths: ['./**/*.graphql'],
    };
  }
}
```

如果你想重用现有的选项提供者，而不是在 `GraphQLModule` 内部创建私有副本，请使用 `useExisting` 语法。

```typescript
GraphQLModule.forRootAsync<ApolloDriverConfig>({
  imports: [ConfigModule],
  useExisting: ConfigService,
}),
```

#### Mercurius 集成

Fastify 用户（[了解更多](/techniques/performance)）可以替代使用 `@nestjs/mercurius` 驱动，而不是使用 Apollo。

```typescript
@@filename()
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      graphiql: true,
    }),
  ],
})
export class AppModule {}
```

> info **提示** 一旦应用运行，打开浏览器并导航到 `http://localhost:3000/graphiql`。你应该会看到 [GraphQL IDE](https://github.com/graphql/graphiql)。

`forRoot()` 方法接受一个选项对象作为参数。这些选项会传递给底层驱动实例。关于可用设置的更多信息，请参阅[这里](https://github.com/mercurius-js/mercurius/blob/master/docs/api/options.md#plugin-options)。

#### 多端点

`@nestjs/graphql` 模块的另一个有用特性是能够同时服务多个端点。这让你可以决定哪些模块应包含在哪个端点中。默认情况下，`GraphQL` 在整个应用中搜索解析器。要将此扫描限制为仅一部分模块，请使用 `include` 属性。

```typescript
GraphQLModule.forRoot({
  include: [CatsModule],
}),
```

> warning **警告** 如果你在单个应用中使用 `@apollo/server` 和 `@as-integrations/fastify` 包，并且有多个 GraphQL 端点，请确保在 `GraphQLModule` 配置中启用 `disableHealthCheck` 设置。

#### 第三方集成

- [GraphQL Yoga](https://github.com/dotansimha/graphql-yoga)

#### 示例

一个工作示例可在[这里](https://github.com/nestjs/nest/tree/master/sample/33-graphql-mercurius)找到。
