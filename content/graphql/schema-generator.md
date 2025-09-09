### 生成 SDL

> warning **警告** 本章节仅适用于代码优先（code first）方式。

要手动生成 GraphQL SDL 模式（即不运行应用程序、连接数据库、挂载解析器等操作），可以使用 `GraphQLSchemaBuilderModule`。

```typescript
async function generateSchema() {
  const app = await NestFactory.create(GraphQLSchemaBuilderModule);
  await app.init();

  const gqlSchemaFactory = app.get(GraphQLSchemaFactory);
  const schema = await gqlSchemaFactory.create([RecipesResolver]);
  console.log(printSchema(schema));
}
```

> info **提示** `GraphQLSchemaBuilderModule` 和 `GraphQLSchemaFactory` 从 `@nestjs/graphql` 包导入，`printSchema` 函数从 `graphql` 包导入。

#### 使用方法

`gqlSchemaFactory.create()` 方法接收一个解析器类引用数组。例如：

```typescript
const schema = await gqlSchemaFactory.create([
  RecipesResolver,
  AuthorsResolver,
  PostsResolvers,
]);
```

该方法还支持第二个可选参数，用于传入标量类数组：

```typescript
const schema = await gqlSchemaFactory.create(
  [RecipesResolver, AuthorsResolver, PostsResolvers],
  [DurationScalar, DateScalar],
);
```

最后，还可以传入配置对象：

```typescript
const schema = await gqlSchemaFactory.create([RecipesResolver], {
  skipCheck: true,
  orphanedTypes: [],
});
```

- `skipCheck`: 跳过模式验证；布尔值，默认为 `false`
- `orphanedTypes`: 未显式引用（不属于对象图）但需要生成的类列表。通常，如果某个类已声明但未在图中引用，则会被忽略。该属性值为类引用数组。