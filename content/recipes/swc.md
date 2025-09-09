### SWC

[SWC](https://swc.rs/)（Speedy Web Compiler，高速 Web 编译器）是一个基于 Rust 的可扩展平台，可用于编译和打包。在 Nest CLI 中使用 SWC 是一种极佳且简单的方式，能显著提升开发流程的速度。

> info **提示** SWC 的速度比默认的 TypeScript 编译器快约 **20 倍**。

#### 安装

首先，安装以下必要的包：

```bash
$ npm i --save-dev @swc/cli @swc/core
```

#### 快速开始

安装完成后，你可以在 Nest CLI 中使用 `swc` 构建器，如下所示：

```bash
$ nest start -b swc
# 或 nest start --builder swc
```

> info **提示** 如果你的项目是 monorepo（单仓库多项目），请查阅[此部分](/recipes/swc#monorepo)。

除了使用 `-b` 标志，你还可以在 `nest-cli.json` 文件中设置 `compilerOptions.builder` 属性为 `"swc"`，如下所示：

```json
{
  "compilerOptions": {
    "builder": "swc"
  }
}
```

要自定义构建器的行为，你可以传递一个包含两个属性 `type`（值为 `"swc"`）和 `options` 的对象，如下所示：

```json
{
  "compilerOptions": {
    "builder": {
      "type": "swc",
      "options": {
        "swcrcPath": "infrastructure/.swcrc",
      }
    }
  }
}
```

要在监听模式下运行应用，使用以下命令：

```bash
$ nest start -b swc -w
# 或 nest start --builder swc --watch
```

#### 类型检查

SWC 本身不执行类型检查（与默认的 TypeScript 编译器不同），因此要启用类型检查，你需要使用 `--type-check` 标志：

```bash
$ nest start -b swc --type-check
```

此命令会指示 Nest CLI 在运行 SWC 的同时，以 `noEmit` 模式运行 `tsc`，从而异步执行类型检查。同样，你可以在 `nest-cli.json` 文件中设置 `compilerOptions.typeCheck` 属性为 `true`，而不必传递 `--type-check` 标志，如下所示：

```json
{
  "compilerOptions": {
    "builder": "swc",
    "typeCheck": true
  }
}
```

#### CLI 插件（SWC）

`--type-check` 标志会自动执行 **NestJS CLI 插件**，并生成一个序列化的元数据文件，该文件可在运行时由应用加载。

#### SWC 配置

SWC 构建器已预配置以满足 NestJS 应用的需求。但你也可以通过创建 `.swcrc` 文件来自定义配置，并按需调整选项。

```json
{
  "$schema": "https://swc.rs/schema.json",
  "sourceMaps": true,
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "decorators": true,
      "dynamicImport": true
    },
    "baseUrl": "./"
  },
  "minify": false
}
```

#### Monorepo（单仓库多项目）

如果你的项目是 monorepo，那么你需要配置 `webpack` 使用 `swc-loader`，而不是使用 `swc` 构建器。

首先，安装必要的包：

```bash
$ npm i --save-dev swc-loader
```

安装完成后，在应用的根目录下创建 `webpack.config.js` 文件，内容如下：

```js
const swcDefaultConfig = require('@nestjs/cli/lib/compiler/defaults/swc-defaults').swcDefaultsFactory().swcOptions;

module.exports = {
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'swc-loader',
          options: swcDefaultConfig,
        },
      },
    ],
  },
};
```

#### Monorepo 与 CLI 插件

如果你使用 CLI 插件，`swc-loader` 不会自动加载它们。你需要创建一个单独的文件来手动加载。为此，在 `main.ts` 文件附近声明一个 `generate-metadata.ts` 文件，内容如下：

```ts
import { PluginMetadataGenerator } from '@nestjs/cli/lib/compiler/plugins/plugin-metadata-generator';
import { ReadonlyVisitor } from '@nestjs/swagger/dist/plugin';

const generator = new PluginMetadataGenerator();
generator.generate({
  visitors: [new ReadonlyVisitor({ introspectComments: true, pathToSource: __dirname })],
  outputDir: __dirname,
  watch: true,
  tsconfigPath: 'apps/<name>/tsconfig.app.json',
});
```

> info **提示** 此示例中我们使用了 `@nestjs/swagger` 插件，但你可以选择任何你需要的插件。

`generate()` 方法接受以下选项：

|                    |                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `watch`            | 是否监听项目变化。                                                                             |
| `tsconfigPath`     | `tsconfig.json` 文件的路径，相对于当前工作目录（`process.cwd()`）。                             |
| `outputDir`        | 保存元数据文件的目录路径。                                                                     |
| `visitors`         | 用于生成元数据的访问器数组。                                                                   |
| `filename`         | 元数据文件的名称，默认为 `metadata.ts`。                                                       |
| `printDiagnostics` | 是否在控制台打印诊断信息，默认为 `true`。                                                      |

最后，你可以在单独的终端窗口中运行以下命令来执行 `generate-metadata` 脚本：

```bash
$ npx ts-node src/generate-metadata.ts
# 或 npx ts-node apps/{YOUR_APP}/src/generate-metadata.ts
```

#### 常见陷阱

如果你在应用中使用 TypeORM、MikroORM 或其他 ORM，可能会遇到循环导入问题。SWC 处理**循环导入**的效果不佳，因此你可以使用以下变通方案：

```typescript
@Entity()
export class User {
  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Relation<Profile>; // <--- 此处使用 "Relation<>" 类型而非 "Profile"
}
```

> info **提示** `Relation` 类型从 `typeorm` 包中导出。

这样做可以避免属性类型被保存在转译后代码的属性元数据中，从而防止循环依赖问题。

如果你的 ORM 没有提供类似的变通方案，你可以自行定义包装类型：

```typescript
/**
 * 用于规避 ESM 模块循环依赖问题的包装类型，
 * 该问题由反射元数据保存属性类型引起。
 */
export type WrapperType<T> = T; // WrapperType === Relation
```

对于项目中所有的[循环依赖注入](/fundamentals/circular-dependency)，你也需要使用上述自定义包装类型：

```typescript
@Injectable()
export class UsersService {
  constructor(
    @Inject(forwardRef(() => ProfileService))
    private readonly profileService: WrapperType<ProfileService>,
  ) {};
}
```

### Jest + SWC

要在 Jest 中使用 SWC，你需要安装以下包：

```bash
$ npm i --save-dev jest @swc/core @swc/jest
```

安装完成后，更新 `package.json` 或 `jest.config.js` 文件（根据你的配置）中的内容如下：

```json
{
  "jest": {
    "transform": {
      "^.+\\.(t|j)s?$": ["@swc/jest"]
    }
  }
}
```

此外，你还需要在 `.swcrc` 文件中添加以下 `transform` 属性：`legacyDecorator` 和 `decoratorMetadata`：

```json
{
  "$schema": "https://swc.rs/schema.json",
  "sourceMaps": true,
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "decorators": true,
      "dynamicImport": true
    },
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true
    },
    "baseUrl": "./"
  },
  "minify": false
}
```

如果你在项目中使用 NestJS CLI 插件，你需要手动运行 `PluginMetadataGenerator`。请参阅[此部分](/recipes/swc#monorepo-and-cli-plugins)了解更多信息。

### Vitest

[Vitest](https://vitest.dev/) 是一个快速、轻量级的测试运行器，设计用于与 Vite 协同工作。它提供了一个现代化、快速且易于使用的测试解决方案，可与 NestJS 项目集成。

#### 安装

首先，安装必要的包：

```bash
$ npm i --save-dev vitest unplugin-swc @swc/core @vitest/coverage-v8
```

#### 配置

在应用的根目录下创建 `vitest.config.ts` 文件，内容如下：

```ts
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
  },
  plugins: [
    // 这是使用 SWC 构建测试文件所必需的
    swc.vite({
      // 显式设置模块类型，避免从 `.swcrc` 配置文件继承该值
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    alias: {
      // 确保 Vitest 正确解析 TypeScript 路径别名
      'src': resolve(__dirname, './src'),
    },
  },
});
```

此配置文件设置了 Vitest 环境、根目录和 SWC 插件。你还需要为端到端（e2e）测试创建一个单独的配置文件，其中包含一个额外的 `include` 字段，用于指定测试路径的正则表达式：

```ts
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.e2e-spec.ts'],
    globals: true,
    root: './',
  },
  plugins: [swc.vite()],
});
```

此外，你可以设置 `alias` 选项以支持测试中的 TypeScript 路径：

```ts
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.e2e-spec.ts'],
    globals: true,
    alias: {
      '@src': './src',
      '@test': './test',
    },
    root: './',
  },
  resolve: {
    alias: {
      '@src': './src',
      '@test': './test',
    },
  },
  plugins: [swc.vite()],
});
```

### 路径别名

与 Jest 不同，Vitest 不会自动解析像 `src/` 这样的 TypeScript 路径别名。这可能导致测试期间出现依赖解析错误。要解决此问题，请在 `vitest.config.ts` 文件中添加以下 `resolve.alias` 配置：

```ts
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'src': resolve(__dirname, './src'),
    },
  },
});
```

这确保 Vitest 正确解析模块导入，防止与缺失依赖相关的错误。

#### 更新端到端测试中的导入

将所有使用 `import * as request from 'supertest'` 的端到端测试导入改为 `import request from 'supertest'`。这是必要的，因为 Vitest 在与 Vite 捆绑时，期望 supertest 使用默认导入。在此特定设置中使用命名空间导入可能会导致问题。

最后，将 package.json 文件中的测试脚本更新为以下内容：

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
    "test:debug": "vitest --inspect-brk --inspect --logHeapUsage --threads=false",
    "test:e2e": "vitest run --config ./vitest.config.e2e.ts"
  }
}
```

这些脚本配置了 Vitest 用于运行测试、监听变化、生成代码覆盖率报告和调试。`test:e2e` 脚本专门用于使用自定义配置文件运行端到端测试。

通过此设置，你现在可以在 NestJS 项目中享受使用 Vitest 带来的好处，包括更快的测试执行速度和更现代化的测试体验。

> info **提示** 你可以在此[仓库](https://github.com/TrilonIO/nest-vitest)中查看一个可运行的示例。