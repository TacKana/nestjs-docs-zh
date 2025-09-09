### CLI 插件

[TypeScript](https://www.typescriptlang.org/docs/handbook/decorators.html) 的元数据反射系统存在一些限制，例如无法确定类包含哪些属性，或识别某个属性是可选还是必需。然而，部分限制可以在编译时解决。Nest 提供了一个插件，用于增强 TypeScript 编译过程，以减少所需的样板代码。

> info **提示** 此插件为**可选**。如果愿意，您可以手动声明所有装饰器，或仅在需要时声明特定装饰器。

#### 概述

Swagger 插件将自动执行以下操作：

- 除非使用 `@ApiHideProperty`，否则所有 DTO 属性都将使用 `@ApiProperty` 进行注解
- 根据问号设置 `required` 属性（例如 `name?: string` 将设置 `required: false`）
- 根据类型设置 `type` 或 `enum` 属性（同样支持数组）
- 根据分配的默认值设置 `default` 属性
- 基于 `class-validator` 装饰器设置多个验证规则（如果 `classValidatorShim` 设置为 `true`）
- 为每个端点添加响应装饰器，包含正确的状态和 `type`（响应模型）
- 基于注释生成属性和端点的描述（如果 `introspectComments` 设置为 `true`）
- 基于注释生成属性的示例值（如果 `introspectComments` 设置为 `true`）

请注意，您的文件名**必须**具有以下后缀之一：`['.dto.ts', '.entity.ts']`（例如 `create-user.dto.ts`），以便插件进行分析。

如果您使用不同的后缀，可以通过指定 `dtoFileNameSuffix` 选项来调整插件的行为（见下文）。

以前，如果您想通过 Swagger UI 提供交互式体验，必须重复大量代码以让包知道您的模型/组件应如何在规范中声明。例如，您可以定义一个简单的 `CreateUserDto` 类如下：

```typescript
export class CreateUserDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;

  @ApiProperty({ enum: RoleEnum, default: [], isArray: true })
  roles: RoleEnum[] = [];

  @ApiProperty({ required: false, default: true })
  isEnabled?: boolean = true;
}
```

对于中型项目来说，这虽然不是大问题，但一旦拥有大量类，就会变得冗长且难以维护。

通过[启用 Swagger 插件](/openapi/cli-plugin#using-the-cli-plugin)，上述类定义可以简化为：

```typescript
export class CreateUserDto {
  email: string;
  password: string;
  roles: RoleEnum[] = [];
  isEnabled?: boolean = true;
}
```

> info **注意** Swagger 插件将从 TypeScript 类型和 class-validator 装饰器派生出 @ApiProperty() 注解。这有助于为生成的 Swagger UI 文档清晰地描述您的 API。然而，运行时的验证仍将由 class-validator 装饰器处理。因此，仍需继续使用诸如 `IsEmail()`、`IsNumber()` 等验证器。

因此，如果您打算依赖自动注解生成文档，并且仍希望进行运行时验证，那么 class-validator 装饰器仍然是必需的。

> info **提示** 在 DTO 中使用[映射类型工具](https://docs.nestjs.com/openapi/mapped-types)（如 `PartialType`）时，请从 `@nestjs/swagger` 导入它们，而不是 `@nestjs/mapped-types`，以便插件能够识别模式。

该插件基于**抽象语法树（AST）** 动态添加适当的装饰器。因此，您无需为散落在代码中的 `@ApiProperty` 装饰器而烦恼。

> info **提示** 插件将自动生成任何缺失的 swagger 属性，但如果您需要覆盖它们，只需通过 `@ApiProperty()` 显式设置即可。

#### 注释内省

启用注释内省功能后，CLI 插件将基于注释生成属性的描述和示例值。

例如，给定一个示例 `roles` 属性：

```typescript
/**
 * 用户角色列表
 * @example ['admin']
 */
@ApiProperty({
  description: `用户角色列表`,
  example: ['admin'],
})
roles: RoleEnum[] = [];
```

您必须重复描述和示例值。启用 `introspectComments` 后，CLI 插件可以提取这些注释，并自动为属性提供描述（如果已定义，还包括示例）。现在，上述属性可以简化为：

```typescript
/**
 * 用户角色列表
 * @example ['admin']
 */
roles: RoleEnum[] = [];
```

提供了 `dtoKeyOfComment` 和 `controllerKeyOfComment` 插件选项，分别用于自定义插件如何为 `ApiProperty` 和 `ApiOperation` 装饰器赋值。参见以下示例：

```typescript
export class SomeController {
  /**
   * 创建某个资源
   */
  @Post()
  create() {}
}
```

这等同于以下指令：

```typescript
@ApiOperation({ summary: "创建某个资源" })
```

> info **提示** 对于模型，同样的逻辑适用，但用于 `ApiProperty` 装饰器。

对于控制器，您不仅可以提供摘要，还可以提供描述（remarks）、标签（如 `@deprecated`）和响应示例，如下所示：

```ts
/**
 * 创建新猫咪
 *
 * @remarks 此操作允许您创建新猫咪。
 *
 * @deprecated
 * @throws {500} 出现错误。
 * @throws {400} 请求错误。
 */
@Post()
async create(): Promise<Cat> {}
```

#### 使用 CLI 插件

要启用插件，请打开 `nest-cli.json`（如果您使用 [Nest CLI](/cli/overview)）并添加以下 `plugins` 配置：

```javascript
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "plugins": ["@nestjs/swagger"]
  }
}
```

您可以使用 `options` 属性来自定义插件的行为。

```javascript
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": false,
          "introspectComments": true,
          "skipAutoHttpCode": true
        }
      }
    ]
  }
}
```

`options` 属性必须满足以下接口：

```typescript
export interface PluginOptions {
  dtoFileNameSuffix?: string[];
  controllerFileNameSuffix?: string[];
  classValidatorShim?: boolean;
  dtoKeyOfComment?: string;
  controllerKeyOfComment?: string;
  introspectComments?: boolean;
  skipAutoHttpCode?: boolean;
  esmCompatible?: boolean;
}
```

<table>
  <tr>
    <th>选项</th>
    <th>默认值</th>
    <th>描述</th>
  </tr>
  <tr>
    <td><code>dtoFileNameSuffix</code></td>
    <td><code>['.dto.ts', '.entity.ts']</code></td>
    <td>DTO（数据传输对象）文件后缀</td>
  </tr>
  <tr>
    <td><code>controllerFileNameSuffix</code></td>
    <td><code>.controller.ts</code></td>
    <td>控制器文件后缀</td>
  </tr>
  <tr>
    <td><code>classValidatorShim</code></td>
    <td><code>true</code></td>
    <td>如果设置为 true，模块将重用 <code>class-validator</code> 验证装饰器（例如 <code>@Max(10)</code> 将在模式定义中添加 <code>max: 10</code>）</td>
  </tr>
  <tr>
    <td><code>dtoKeyOfComment</code></td>
    <td><code>'description'</code></td>
    <td>在 <code>ApiProperty</code> 上设置注释文本的属性键</td>
  </tr>
  <tr>
    <td><code>controllerKeyOfComment</code></td>
    <td><code>'summary'</code></td>
    <td>在 <code>ApiOperation</code> 上设置注释文本的属性键</td>
  </tr>
  <tr>
    <td><code>introspectComments</code></td>
    <td><code>false</code></td>
    <td>如果设置为 true，插件将基于注释生成属性的描述和示例值</td>
  </tr>
  <tr>
    <td><code>skipAutoHttpCode</code></td>
    <td><code>false</code></td>
    <td>禁用控制器中自动添加 <code>@HttpCode()</code></td>
  </tr>
  <tr>
    <td><code>esmCompatible</code></td>
    <td><code>false</code></td>
    <td>如果设置为 true，解决使用 ESM（<code>&#123; "type": "module" &#125;</code>）时遇到的语法错误</td>
  </tr>
</table>

每当插件选项更新时，请确保删除 `/dist` 文件夹并重新构建您的应用程序。
如果您不使用 CLI，而是使用自定义的 `webpack` 配置，您可以将此插件与 `ts-loader` 结合使用：

```javascript
getCustomTransformers: (program: any) => ({
  before: [require('@nestjs/swagger/plugin').before({}, program)]
}),
```

#### SWC 构建器

对于标准设置（非 monorepo），要将 CLI 插件与 SWC 构建器一起使用，您需要启用类型检查，如[此处](/recipes/swc#type-checking)所述。

```bash
$ nest start -b swc --type-check
```

对于 monorepo 设置，请遵循[此处](/recipes/swc#monorepo-and-cli-plugins)的说明。

```bash
$ npx ts-node src/generate-metadata.ts
# 或 npx ts-node apps/{YOUR_APP}/src/generate-metadata.ts
```

现在，序列化的元数据文件必须由 `SwaggerModule#loadPluginMetadata` 方法加载，如下所示：

```typescript
import metadata from './metadata'; // <-- 由 "PluginMetadataGenerator" 自动生成的文件

await SwaggerModule.loadPluginMetadata(metadata); // <-- 这里
const document = SwaggerModule.createDocument(app, config);
```

#### 与 `ts-jest` 集成（e2e 测试）

要运行 e2e 测试，`ts-jest` 会动态地在内存中编译您的源代码文件。这意味着它不使用 Nest CLI 编译器，也不应用任何插件或执行 AST 转换。

要启用插件，请在您的 e2e 测试目录中创建以下文件：

```javascript
const transformer = require('@nestjs/swagger/plugin');

module.exports.name = 'nestjs-swagger-transformer';
// 每当更改以下配置时，您应更改版本号 - 否则，jest 将无法检测到更改
module.exports.version = 1;

module.exports.factory = (cs) => {
  return transformer.before(
    {
      // @nestjs/swagger/plugin 选项（可以为空）
    },
    cs.program, // 对于旧版本的 Jest（<= v27），使用 "cs.tsCompiler.program"
  );
};
```

完成此操作后，在您的 `jest` 配置文件中导入 AST 转换器。默认情况下（在入门应用程序中），e2e 测试配置文件位于 `test` 文件夹下，名为 `jest-e2e.json`。

如果您使用 `jest@<29`，请使用以下代码片段。

```json
{
  ... // 其他配置
  "globals": {
    "ts-jest": {
      "astTransformers": {
        "before": ["<上面创建的文件的路径>"]
      }
    }
  }
}
```

如果您使用 `jest@^29`，请使用以下代码片段，因为之前的方法已被弃用。

```json
{
  ... // 其他配置
  "transform": {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        "astTransformers": {
          "before": ["<上面创建的文件的路径>"]
        }
      }
    ]
  }
}
```

#### 排查 `jest` 问题（e2e 测试）

如果 `jest` 似乎没有拾取您的配置更改，可能是 Jest 已经**缓存**了构建结果。要应用新配置，您需要清除 Jest 的缓存目录。

要清除缓存目录，请在您的 NestJS 项目文件夹中运行以下命令：

```bash
$ npx jest --clearCache
```

如果自动清除缓存失败，您仍然可以使用以下命令手动删除缓存文件夹：

```bash
# 查找 jest 缓存目录（通常是 /tmp/jest_rs）
# 通过在您的 NestJS 项目根目录运行以下命令
$ npx jest --showConfig | grep cache
# 示例结果：
#   "cache": true,
#   "cacheDirectory": "/tmp/jest_rs"

# 删除或清空 Jest 缓存目录
$ rm -rf  <cacheDirectory 值>
# 示例：
# rm -rf /tmp/jest_rs
```