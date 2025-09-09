### 标量（Scalars）

GraphQL 对象类型拥有名称和字段，但在某些情况下，这些字段需要解析为具体的数据。这时就轮到标量类型上场了：它们代表了查询的末端（阅读更多[此处](https://graphql.org/learn/schema/#scalar-types)）。GraphQL 包含以下默认类型：`Int`、`Float`、`String`、`Boolean` 和 `ID`。除了这些内置类型外，您可能还需要支持自定义的原子数据类型（例如 `Date`）。

#### 代码优先（Code first）

代码优先方法内置了五种标量类型，其中三种是现有 GraphQL 类型的简单别名。

- `ID`（`GraphQLID` 的别名） - 代表唯一标识符，常用于重新获取对象或作为缓存的键
- `Int`（`GraphQLInt` 的别名） - 一个有符号的 32 位整数
- `Float`（`GraphQLFloat` 的别名） - 一个有符号的双精度浮点值
- `GraphQLISODateTime` - 一个 UTC 时区的日期时间字符串（默认用于表示 `Date` 类型）
- `GraphQLTimestamp` - 一个有符号整数，表示从 UNIX 纪元开始的毫秒数

默认使用 `GraphQLISODateTime`（例如 `2019-12-03T09:54:33Z`）来表示 `Date` 类型。若要改用 `GraphQLTimestamp`，请将 `buildSchemaOptions` 对象的 `dateScalarMode` 设置为 `'timestamp'`，如下所示：

```typescript
GraphQLModule.forRoot({
  buildSchemaOptions: {
    dateScalarMode: 'timestamp',
  }
}),
```

同样，默认使用 `GraphQLFloat` 来表示 `number` 类型。若要改用 `GraphQLInt`，请将 `buildSchemaOptions` 对象的 `numberScalarMode` 设置为 `'integer'`，如下所示：

```typescript
GraphQLModule.forRoot({
  buildSchemaOptions: {
    numberScalarMode: 'integer',
  }
}),
```

此外，您还可以创建自定义标量。

#### 覆盖默认标量

要为 `Date` 标量创建自定义实现，只需创建一个新类。

```typescript
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('Date', () => Date)
export class DateScalar implements CustomScalar<number, Date> {
  description = 'Date custom scalar type';

  parseValue(value: number): Date {
    return new Date(value); // 来自客户端的值
  }

  serialize(value: Date): number {
    return value.getTime(); // 发送到客户端的值
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind === Kind.INT) {
      return new Date(ast.value);
    }
    return null;
  }
}
```

完成此操作后，将 `DateScalar` 注册为提供者。

```typescript
@Module({
  providers: [DateScalar],
})
export class CommonModule {}
```

现在我们可以在类中使用 `Date` 类型。

```typescript
@Field()
creationDate: Date;
```

#### 导入自定义标量

要使用自定义标量，请导入并注册为解析器。我们将使用 `graphql-type-json` 包进行演示。这个 npm 包定义了一个 `JSON` GraphQL 标量类型。

首先安装包：

```bash
$ npm i --save graphql-type-json
```

安装完成后，我们将自定义解析器传递给 `forRoot()` 方法：

```typescript
import GraphQLJSON from 'graphql-type-json';

@Module({
  imports: [
    GraphQLModule.forRoot({
      resolvers: { JSON: GraphQLJSON },
    }),
  ],
})
export class AppModule {}
```

现在我们可以在类中使用 `JSON` 类型。

```typescript
@Field(() => GraphQLJSON)
info: JSON;
```

如需一套有用的标量，请查看 [graphql-scalars](https://www.npmjs.com/package/graphql-scalars) 包。

#### 创建自定义标量

要定义自定义标量，请创建一个新的 `GraphQLScalarType` 实例。我们将创建一个自定义的 `UUID` 标量。

```typescript
const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validate(uuid: unknown): string | never {
  if (typeof uuid !== 'string' || !regex.test(uuid)) {
    throw new Error('invalid uuid');
  }
  return uuid;
}

export const CustomUuidScalar = new GraphQLScalarType({
  name: 'UUID',
  description: '一个简单的 UUID 解析器',
  serialize: (value) => validate(value),
  parseValue: (value) => validate(value),
  parseLiteral: (ast) => validate(ast.value),
});
```

我们将自定义解析器传递给 `forRoot()` 方法：

```typescript
@Module({
  imports: [
    GraphQLModule.forRoot({
      resolvers: { UUID: CustomUuidScalar },
    }),
  ],
})
export class AppModule {}
```

现在我们可以在类中使用 `UUID` 类型。

```typescript
@Field(() => CustomUuidScalar)
uuid: string;
```

#### 模式优先（Schema first）

要定义自定义标量（阅读更多关于标量的信息[此处](https://www.apollographql.com/docs/graphql-tools/scalars.html)），需要创建一个类型定义和专用的解析器。这里（与官方文档一样），我们将使用 `graphql-type-json` 包进行演示。这个 npm 包定义了一个 `JSON` GraphQL 标量类型。

首先安装包：

```bash
$ npm i --save graphql-type-json
```

安装完成后，我们将自定义解析器传递给 `forRoot()` 方法：

```typescript
import GraphQLJSON from 'graphql-type-json';

@Module({
  imports: [
    GraphQLModule.forRoot({
      typePaths: ['./**/*.graphql'],
      resolvers: { JSON: GraphQLJSON },
    }),
  ],
})
export class AppModule {}
```

现在我们可以在类型定义中使用 `JSON` 标量：

```graphql
scalar JSON

type Foo {
  field: JSON
}
```

另一种定义标量类型的方法是创建一个简单的类。假设我们想用 `Date` 类型增强我们的模式。

```typescript
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('Date')
export class DateScalar implements CustomScalar<number, Date> {
  description = 'Date custom scalar type';

  parseValue(value: number): Date {
    return new Date(value); // 来自客户端的值
  }

  serialize(value: Date): number {
    return value.getTime(); // 发送到客户端的值
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind === Kind.INT) {
      return new Date(ast.value);
    }
    return null;
  }
}
```

完成此操作后，将 `DateScalar` 注册为提供者。

```typescript
@Module({
  providers: [DateScalar],
})
export class CommonModule {}
```

现在我们可以在类型定义中使用 `Date` 标量。

```graphql
scalar Date
```

默认情况下，所有标量的生成 TypeScript 定义都是 `any` - 这在类型安全方面并不理想。但是，您可以在指定如何生成类型时配置 Nest 如何为您的自定义标量生成类型定义：

```typescript
import { GraphQLDefinitionsFactory } from '@nestjs/graphql';
import { join } from 'path';

const definitionsFactory = new GraphQLDefinitionsFactory();

definitionsFactory.generate({
  typePaths: ['./src/**/*.graphql'],
  path: join(process.cwd(), 'src/graphql.ts'),
  outputAs: 'class',
  defaultScalarType: 'unknown',
  customScalarTypeMapping: {
    DateTime: 'Date',
    BigNumber: '_BigNumber',
  },
  additionalHeader: "import _BigNumber from 'bignumber.js'",
});
```

> info **提示** 或者，您可以使用类型引用，例如：`DateTime: Date`。在这种情况下，`GraphQLDefinitionsFactory` 将提取指定类型的名称属性（`Date.name`）来生成 TypeScript 定义。注意：需要为非内置类型（自定义类型）添加导入语句。

现在，给定以下 GraphQL 自定义标量类型：

```graphql
scalar DateTime
scalar BigNumber
scalar Payload
```

我们现在将在 `src/graphql.ts` 中看到以下生成的 TypeScript 定义：

```typescript
import _BigNumber from 'bignumber.js';

export type DateTime = Date;
export type BigNumber = _BigNumber;
export type Payload = unknown;
```

这里，我们使用了 `customScalarTypeMapping` 属性来提供我们希望为自定义标量声明的类型的映射。我们还提供了一个 `additionalHeader` 属性，以便可以添加这些类型定义所需的任何导入。最后，我们添加了一个 `defaultScalarType` 为 `'unknown'`，以便未在 `customScalarTypeMapping` 中指定的任何自定义标量将被别名为 `unknown` 而不是 `any`（[TypeScript 建议](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#new-unknown-top-type)自 3.0 版本起使用以增加类型安全性）。

> info **提示** 注意我们从 `bignumber.js` 导入了 `_BigNumber`；这是为了避免[循环类型引用](https://github.com/Microsoft/TypeScript/issues/12525#issuecomment-263166239)。