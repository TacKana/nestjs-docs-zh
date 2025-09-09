### 类型与参数

`SwaggerModule` 会搜索路由处理器中的所有 `@Body()`、`@Query()` 和 `@Param()` 装饰器，从而生成 API 文档。同时，它还会利用反射机制创建相应的模型定义。请看以下代码：

```typescript
@Post()
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
```

> info **提示** 要显式设置请求体定义，请使用 `@ApiBody()` 装饰器（从 `@nestjs/swagger` 包导入）。

基于 `CreateCatDto`，Swagger UI 将创建如下模型定义：

<figure><img src="/assets/swagger-dto.png" /></figure>

如你所见，尽管该类有一些已声明的属性，但定义却是空的。为了让 `SwaggerModule` 能够识别这些类属性，我们必须使用 `@ApiProperty()` 装饰器对它们进行标注，或者使用 CLI 插件（详见**插件**部分）自动完成：

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateCatDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiProperty()
  breed: string;
}
```

> info **提示** 与其手动标注每个属性，不如考虑使用 Swagger 插件（参见[插件](/openapi/cli-plugin)部分），它会自动为你完成这项工作。

让我们打开浏览器，验证生成的 `CreateCatDto` 模型：

<figure><img src="/assets/swagger-dto2.png" /></figure>

此外，`@ApiProperty()` 装饰器允许设置各种[模式对象](https://swagger.io/specification/#schemaObject)属性：

```typescript
@ApiProperty({
  description: '猫的年龄',
  minimum: 1,
  default: 1,
})
age: number;
```

> info **提示** 除了显式输入 `{{"@ApiProperty({ required: false })"}}`，你还可以使用简写的 `@ApiPropertyOptional()` 装饰器。

要显式设置属性类型，请使用 `type` 键：

```typescript
@ApiProperty({
  type: Number,
})
age: number;
```

#### 数组

当属性是数组时，我们必须手动指明数组类型，如下所示：

```typescript
@ApiProperty({ type: [String] })
names: string[];
```

> info **提示** 考虑使用 Swagger 插件（参见[插件](/openapi/cli-plugin)部分），它会自动检测数组。

你可以将类型作为数组的第一个元素（如上所示），或者将 `isArray` 属性设为 `true`。

<app-banner-enterprise></app-banner-enterprise>

#### 循环依赖

当类之间存在循环依赖时，使用惰性函数为 `SwaggerModule` 提供类型信息：

```typescript
@ApiProperty({ type: () => Node })
node: Node;
```

> info **提示** 考虑使用 Swagger 插件（参见[插件](/openapi/cli-plugin)部分），它会自动检测循环依赖。

#### 泛型与接口

由于 TypeScript 不存储关于泛型或接口的元数据，当你在 DTO 中使用它们时，`SwaggerModule` 可能无法在运行时正确生成模型定义。例如，以下代码不会被 Swagger 模块正确检查：

```typescript
createBulk(@Body() usersDto: CreateUserDto[])
```

为了克服这一限制，你可以显式设置类型：

```typescript
@ApiBody({ type: [CreateUserDto] })
createBulk(@Body() usersDto: CreateUserDto[])
```

#### 枚举

要标识一个 `enum`，我们必须手动在 `@ApiProperty` 上设置 `enum` 属性，并提供一个值数组。

```typescript
@ApiProperty({ enum: ['Admin', 'Moderator', 'User']})
role: UserRole;
```

或者，如下定义一个实际的 TypeScript 枚举：

```typescript
export enum UserRole {
  Admin = 'Admin',
  Moderator = 'Moderator',
  User = 'User',
}
```

然后，你可以直接在 `@Query()` 参数装饰器中结合 `@ApiQuery()` 装饰器使用该枚举。

```typescript
@ApiQuery({ name: 'role', enum: UserRole })
async filterByRole(@Query('role') role: UserRole = UserRole.User) {}
```

<figure><img src="/assets/enum_query.gif" /></figure>

将 `isArray` 设为 **true** 时，`enum` 可以作为**多选**进行选择：

<figure><img src="/assets/enum_query_array.gif" /></figure>

#### 枚举模式

默认情况下，`enum` 属性会在 `parameter` 上添加一个原始的[枚举](https://swagger.io/docs/specification/data-models/enums/)定义。

```yaml
- breed:
    type: 'string'
    enum:
      - Persian
      - Tabby
      - Siamese
```

上述规范在大多数情况下工作良好。但是，如果你使用一个将规范作为**输入**并生成**客户端**代码的工具，可能会遇到生成的代码包含重复 `enums` 的问题。考虑以下代码片段：

```typescript
// 生成的客户端代码
export class CatDetail {
  breed: CatDetailEnum;
}

export class CatInformation {
  breed: CatInformationEnum;
}

export enum CatDetailEnum {
  Persian = 'Persian',
  Tabby = 'Tabby',
  Siamese = 'Siamese',
}

export enum CatInformationEnum {
  Persian = 'Persian',
  Tabby = 'Tabby',
  Siamese = 'Siamese',
}
```

> info **提示** 以上片段是使用名为 [NSwag](https://github.com/RicoSuter/NSwag) 的工具生成的。

你可以看到现在有两个完全相同的 `enums`。为了解决这个问题，你可以在装饰器的 `enum` 属性旁边传递一个 `enumName`。

```typescript
export class CatDetail {
  @ApiProperty({ enum: CatBreed, enumName: 'CatBreed' })
  breed: CatBreed;
}
```

`enumName` 属性使 `@nestjs/swagger` 能够将 `CatBreed` 转换为自己的 `schema`，从而使 `CatBreed` 枚举可重用。规范将如下所示：

```yaml
CatDetail:
  type: 'object'
  properties:
    ...
    - breed:
        schema:
          $ref: '#/components/schemas/CatBreed'
CatBreed:
  type: string
  enum:
    - Persian
    - Tabby
    - Siamese
```

> info **提示** 任何接受 `enum` 作为属性的**装饰器**也会接受 `enumName`。

#### 属性值示例

你可以使用 `example` 键为属性设置单个示例，如下所示：

```typescript
@ApiProperty({
  example: 'persian',
})
breed: string;
```

如果你想提供多个示例，可以使用 `examples` 键，传入一个结构如下的对象：

```typescript
@ApiProperty({
  examples: {
    Persian: { value: 'persian' },
    Tabby: { value: 'tabby' },
    Siamese: { value: 'siamese' },
    'Scottish Fold': { value: 'scottish_fold' },
  },
})
breed: string;
```

#### 原始定义

在某些情况下，例如深层嵌套的数组或矩阵，你可能需要手动定义类型：

```typescript
@ApiProperty({
  type: 'array',
  items: {
    type: 'array',
    items: {
      type: 'number',
    },
  },
})
coords: number[][];
```

你也可以指定原始对象模式，如下所示：

```typescript
@ApiProperty({
  type: 'object',
  properties: {
    name: {
      type: 'string',
      example: 'Error'
    },
    status: {
      type: 'number',
      example: 400
    }
  },
  required: ['name', 'status']
})
rawDefinition: Record<string, any>;
```

要在控制器类中手动定义输入/输出内容，请使用 `schema` 属性：

```typescript
@ApiBody({
  schema: {
    type: 'array',
    items: {
      type: 'array',
      items: {
        type: 'number',
      },
    },
  },
})
async create(@Body() coords: number[][]) {}
```

#### 额外模型

要定义那些未直接在控制器中引用但应由 Swagger 模块检查的额外模型，请使用 `@ApiExtraModels()` 装饰器：

```typescript
@ApiExtraModels(ExtraModel)
export class CreateCatDto {}
```

> info **提示** 对于特定的模型类，你只需要使用一次 `@ApiExtraModels()`。

或者，你可以将一个包含 `extraModels` 属性的选项对象传递给 `SwaggerModule.createDocument()` 方法，如下所示：

```typescript
const documentFactory = () =>
  SwaggerModule.createDocument(app, options, {
    extraModels: [ExtraModel],
  });
```

要获取对模型的引用（`$ref`），请使用 `getSchemaPath(ExtraModel)` 函数：

```typescript
'application/vnd.api+json': {
   schema: { $ref: getSchemaPath(ExtraModel) },
},
```

#### oneOf、anyOf、allOf

要组合模式，你可以使用 `oneOf`、`anyOf` 或 `allOf` 关键字（[了解更多](https://swagger.io/docs/specification/data-models/oneof-anyof-allof-not/)）。

```typescript
@ApiProperty({
  oneOf: [
    { $ref: getSchemaPath(Cat) },
    { $ref: getSchemaPath(Dog) },
  ],
})
pet: Cat | Dog;
```

如果你想定义一个多态数组（即其成员跨越多个模式的数组），应使用原始定义（见上文）手动定义类型。

```typescript
type Pet = Cat | Dog;

@ApiProperty({
  type: 'array',
  items: {
    oneOf: [
      { $ref: getSchemaPath(Cat) },
      { $ref: getSchemaPath(Dog) },
    ],
  },
})
pets: Pet[];
```

> info **提示** `getSchemaPath()` 函数是从 `@nestjs/swagger` 导入的。

`Cat` 和 `Dog` 都必须使用 `@ApiExtraModels()` 装饰器（在类级别）定义为额外模型。

#### 模式名称与描述

你可能已经注意到，生成的模式的名称基于原始模型类的名称（例如，`CreateCatDto` 模型生成 `CreateCatDto` 模式）。如果你想更改模式名称，可以使用 `@ApiSchema()` 装饰器。

以下是一个示例：

```typescript
@ApiSchema({ name: 'CreateCatRequest' })
class CreateCatDto {}
```

上述模型将被转换为 `CreateCatRequest` 模式。

默认情况下，生成的模式不会添加描述。你可以使用 `description` 属性添加一个：

```typescript
@ApiSchema({ description: 'CreateCatDto 模式的描述' })
class CreateCatDto {}
```

这样，描述将包含在模式中，如下所示：

```yaml
schemas:
  CreateCatDto:
    type: object
    description: CreateCatDto 模式的描述
```