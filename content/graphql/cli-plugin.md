### CLI 插件

> warning **警告** 本章节仅适用于代码优先（code first）方式。

TypeScript 的元数据反射系统存在一些限制，例如无法确定类包含哪些属性，或者识别某个属性是可选的还是必需的。然而，这些约束中的一部分可以在编译时得到解决。Nest 提供了一个插件，用于增强 TypeScript 的编译过程，以减少所需的样板代码量。

> info **提示** 此插件是**可选的**。如果你愿意，可以手动声明所有装饰器，或者只在需要的地方声明特定的装饰器。

#### 概述

GraphQL 插件将自动：

- 除非使用 `@HideField`，否则使用 `@Field` 装饰所有输入对象、对象类型和参数类的属性
- 根据问号设置 `nullable` 属性（例如，`name?: string` 将设置 `nullable: true`）
- 根据类型设置 `type` 属性（也支持数组）
- 基于注释生成属性的描述（如果 `introspectComments` 设置为 `true`）

请注意，你的文件名**必须**具有以下后缀之一，以便插件进行分析：`['.input.ts', '.args.ts', '.entity.ts', '.model.ts']`（例如，`author.entity.ts`）。如果你使用不同的后缀，可以通过指定 `typeFileNameSuffix` 选项来调整插件的行为（见下文）。

根据我们目前所学，为了让包知道你的类型在 GraphQL 中应如何声明，你不得不重复大量代码。例如，你可以定义一个简单的 `Author` 类，如下所示：

```typescript
@@filename(authors/models/author.model)
@ObjectType()
export class Author {
  @Field(type => ID)
  id: number;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field(type => [Post])
  posts: Post[];
}
```

对于中型项目来说，这虽然不是大问题，但一旦你拥有大量类，就会变得冗长且难以维护。

通过启用 GraphQL 插件，上述类定义可以简化为：

```typescript
@@filename(authors/models/author.model)
@ObjectType()
export class Author {
  @Field(type => ID)
  id: number;
  firstName?: string;
  lastName?: string;
  posts: Post[];
}
```

插件基于**抽象语法树（Abstract Syntax Tree）** 动态添加适当的装饰器。因此，你不必再为遍布代码的 `@Field` 装饰器而烦恼。

> info **提示** 插件会自动生成任何缺失的 GraphQL 属性，但如果你需要覆盖它们，只需通过 `@Field()` 显式设置即可。

#### 注释自省

启用注释自省功能后，CLI 插件将基于注释生成字段的描述。

例如，给定一个示例 `roles` 属性：

```typescript
/**
 * 用户角色列表
 */
@Field(() => [String], {
  description: `用户角色列表`
})
roles: string[];
```

你必须重复描述值。启用 `introspectComments` 后，CLI 插件可以提取这些注释并自动为属性提供描述。现在，上述字段可以简化为：

```typescript
/**
 * 用户角色列表
 */
roles: string[];
```

#### 使用 CLI 插件

要启用插件，请打开 `nest-cli.json`（如果你使用 [Nest CLI](/cli/overview)）并添加以下 `plugins` 配置：

```javascript
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "plugins": ["@nestjs/graphql"]
  }
}
```

你可以使用 `options` 属性来自定义插件的行为。

```javascript
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/graphql",
        "options": {
          "typeFileNameSuffix": [".input.ts", ".args.ts"],
          "introspectComments": true
        }
      }
    ]
  }
}
```

`options` 属性必须满足以下接口：

```typescript
export interface PluginOptions {
  typeFileNameSuffix?: string[];
  introspectComments?: boolean;
}
```

<table>
  <tr>
    <th>选项</th>
    <th>默认值</th>
    <th>描述</th>
  </tr>
  <tr>
    <td><code>typeFileNameSuffix</code></td>
    <td><code>['.input.ts', '.args.ts', '.entity.ts', '.model.ts']</code></td>
    <td>GraphQL 类型文件后缀</td>
  </tr>
  <tr>
    <td><code>introspectComments</code></td>
      <td><code>false</code></td>
      <td>如果设置为 true，插件将基于注释生成属性的描述</td>
  </tr>
</table>

如果你不使用 CLI，而是使用自定义的 `webpack` 配置，你可以结合 `ts-loader` 使用此插件：

```javascript
getCustomTransformers: (program: any) => ({
  before: [require('@nestjs/graphql/plugin').before({}, program)]
}),
```

#### SWC 构建器

对于标准设置（非 monorepo），要将 CLI 插件与 SWC 构建器一起使用，你需要启用类型检查，如[此处](/recipes/swc#type-checking)所述。

```bash
$ nest start -b swc --type-check
```

对于 monorepo 设置，请遵循[此处](/recipes/swc#monorepo-and-cli-plugins)的说明。

```bash
$ npx ts-node src/generate-metadata.ts
# 或 npx ts-node apps/{YOUR_APP}/src/generate-metadata.ts
```

现在，序列化的元数据文件必须由 `GraphQLModule` 方法加载，如下所示：

```typescript
import metadata from './metadata'; // <-- 由 "PluginMetadataGenerator" 自动生成的文件

GraphQLModule.forRoot<...>({
  ..., // 其他选项
  metadata,
}),
```

#### 与 `ts-jest` 集成（端到端测试）

在启用此插件的情况下运行端到端测试时，你可能会遇到编译模式的问题。例如，最常见的错误之一是：

```json
对象类型 <名称> 必须定义一个或多个字段。
```

这是因为 `jest` 配置没有在任何地方导入 `@nestjs/graphql/plugin` 插件。

要解决此问题，请在端到端测试目录中创建以下文件：

```javascript
const transformer = require('@nestjs/graphql/plugin');

module.exports.name = 'nestjs-graphql-transformer';
// 每当你更改以下配置时，都应更改版本号 - 否则，jest 将无法检测到更改
module.exports.version = 1;

module.exports.factory = (cs) => {
  return transformer.before(
    {
      // @nestjs/graphql/plugin 选项（可以为空）
    },
    cs.program, // 对于旧版本的 Jest（<= v27），使用 "cs.tsCompiler.program"
  );
};
```

有了这个文件后，在你的 `jest` 配置文件中导入 AST 转换器。默认情况下（在入门应用中），端到端测试配置文件位于 `test` 文件夹下，名为 `jest-e2e.json`。

```json
{
  ... // 其他配置
  "globals": {
    "ts-jest": {
      "astTransformers": {
        "before": ["<上述文件的路径>"]
      }
    }
  }
}
```

如果你使用 `jest@^29`，请使用下面的片段，因为之前的方法已被弃用。

```json
{
  ... // 其他配置
  "transform": {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        "astTransformers": {
          "before": ["<上述文件的路径>"]
        }
      }
    ]
  }
}
```