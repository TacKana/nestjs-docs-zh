### Apollo 插件功能

通过插件机制，您可以在特定事件触发时执行自定义操作，从而扩展 Apollo Server 的核心功能。目前，这些事件对应着 GraphQL 请求生命周期的各个阶段以及 Apollo Server 自身的启动过程（详见[此处](https://www.apollographql.com/docs/apollo-server/integrations/plugins/)）。例如，一个基础的日志插件可以记录发送到 Apollo Server 的每个请求所对应的 GraphQL 查询字符串。

#### 自定义插件

要创建插件，需要声明一个使用 `@nestjs/apollo` 包导出的 `@Plugin` 装饰器标注的类。同时，为了获得更好的代码自动补全体验，建议实现 `@apollo/server` 包中的 `ApolloServerPlugin` 接口。

```typescript
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { Plugin } from '@nestjs/apollo';

@Plugin()
export class LoggingPlugin implements ApolloServerPlugin {
  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    console.log('请求开始');
    return {
      async willSendResponse() {
        console.log('即将发送响应');
      },
    };
  }
}
```

完成上述步骤后，我们可以将 `LoggingPlugin` 注册为一个提供者。

```typescript
@Module({
  providers: [LoggingPlugin],
})
export class CommonModule {}
```

Nest 会自动实例化该插件并将其应用到 Apollo Server。

#### 使用外部插件

Apollo 提供了若干开箱即用的插件。要使用现有插件，只需导入并将其添加到 `plugins` 数组中：

```typescript
GraphQLModule.forRoot({
  // ...
  plugins: [ApolloServerOperationRegistry({ /* 配置选项 */ })]
}),
```

> info **提示** `ApolloServerOperationRegistry` 插件由 `@apollo/server-plugin-operation-registry` 包导出。

#### Mercurius 插件

部分现有的 Mercurius 专属 Fastify 插件必须在 Mercurius 插件之后加载到插件树中（详见[此处](https://mercurius.dev/#/docs/plugins)）。

> warning **注意** [mercurius-upload](https://github.com/mercurius-js/mercurius-upload) 是个例外，应在主文件中注册。

为此，`MercuriusDriver` 提供了一个可选的 `plugins` 配置项。它是一个对象数组，每个对象包含两个属性：`plugin` 及其 `options`。因此，注册[缓存插件](https://github.com/mercurius-js/cache)的配置如下所示：

```typescript
GraphQLModule.forRoot({
  driver: MercuriusDriver,
  // ...
  plugins: [
    {
      plugin: cache,
      options: {
        ttl: 10,
        policy: {
          Query: {
            add: true
          }
        }
      },
    }
  ]
}),
```