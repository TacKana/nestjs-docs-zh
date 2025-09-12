### 配置

应用程序通常运行在不同的**环境**中。根据环境的不同，应使用不同的配置设置。例如，本地环境通常依赖特定的数据库凭据，这些凭据仅对本地数据库实例有效。生产环境则会使用另一组数据库凭据。由于配置变量会发生变化，最佳实践是将[配置变量存储在环境](https://12factor.net/config)中。

在 Node.js 中，外部定义的环境变量可以通过全局对象 `process.env` 访问。我们可以尝试通过在每个环境中单独设置环境变量来解决多环境的问题。但这种方法很快就会变得难以管理，特别是在开发和测试环境中，这些值需要轻松模拟和/或更改。

在 Node.js 应用中，通常使用 `.env` 文件来保存键值对，每个键代表一个特定值，用以表示每个环境。在不同环境中运行应用，只需切换正确的 `.env` 文件即可。

在 Nest 中使用此技术的一个好方法是创建一个 `ConfigModule`，它公开一个 `ConfigService`，用于加载适当的 `.env` 文件。虽然你可以选择自己编写这样的模块，但为了方便，Nest 直接提供了 `@nestjs/config` 包。本章将介绍这个包。

#### 安装

首先安装所需的依赖项。

```bash
$ npm i --save @nestjs/config
```

> info **提示** `@nestjs/config` 包内部使用了 [dotenv](https://github.com/motdotla/dotenv)。

> warning **注意** `@nestjs/config` 要求 TypeScript 4.1 或更高版本。

#### 开始使用

安装完成后，我们可以导入 `ConfigModule`。通常，我们会在根模块 `AppModule` 中导入它，并使用 `.forRoot()` 静态方法控制其行为。在此步骤中，环境变量的键/值对会被解析和解析。稍后，我们将看到在其他功能模块中访问 `ConfigModule` 的 `ConfigService` 类的几种选项。

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
})
export class AppModule {}
```

上面的代码将从默认位置（项目根目录）加载并解析 `.env` 文件，将 `.env` 文件中的键/值对与分配给 `process.env` 的环境变量合并，并将结果存储在一个私有结构中，你可以通过 `ConfigService` 访问。`forRoot()` 方法注册了 `ConfigService` 提供者，它提供了一个 `get()` 方法来读取这些解析/合并后的配置变量。由于 `@nestjs/config` 依赖 [dotenv](https://github.com/motdotla/dotenv)，它使用该包的规则来解决环境变量名称冲突。当一个键在运行时环境中作为环境变量（例如，通过操作系统 shell 导出如 `export DATABASE_USER=test`）和 `.env` 文件中都存在时，运行时环境变量优先。

示例 `.env` 文件如下所示：

```json
DATABASE_USER=test
DATABASE_PASSWORD=test
```

如果你需要在 `ConfigModule` 加载和 Nest 应用启动之前就使用某些环境变量（例如，将微服务配置传递给 `NestFactory#createMicroservice` 方法），你可以使用 Nest CLI 的 `--env-file` 选项。此选项允许你指定应在应用启动前加载的 `.env` 文件的路径。`--env-file` 标志支持在 Node v20 中引入，详见[文档](https://nodejs.org/dist/v20.18.1/docs/api/cli.html#--env-fileconfig)。

```bash
$ nest start --env-file .env
```

#### 自定义环境文件路径

默认情况下，该包在应用的根目录中查找 `.env` 文件。要为 `.env` 文件指定其他路径，请设置传递给 `forRoot()` 的（可选）选项对象的 `envFilePath` 属性，如下所示：

```typescript
ConfigModule.forRoot({
  envFilePath: '.development.env',
});
```

你还可以像这样为 `.env` 文件指定多个路径：

```typescript
ConfigModule.forRoot({
  envFilePath: ['.env.development.local', '.env.development'],
});
```

如果在多个文件中找到变量，则第一个文件中的值优先。

#### 禁用环境变量加载

如果你不想加载 `.env` 文件，而是希望直接从运行时环境访问环境变量（如通过操作系统 shell 导出如 `export DATABASE_USER=test`），请将选项对象的 `ignoreEnvFile` 属性设置为 `true`，如下所示：

```typescript
ConfigModule.forRoot({
  ignoreEnvFile: true,
});
```

#### 全局使用模块

当你想在其他模块中使用 `ConfigModule` 时，需要导入它（与任何 Nest 模块一样）。或者，通过将选项对象的 `isGlobal` 属性设置为 `true`，将其声明为[全局模块](/modules#global-modules)，如下所示。这样，一旦在根模块（例如 `AppModule`）中加载了 `ConfigModule`，就无需在其他模块中导入它。

```typescript
ConfigModule.forRoot({
  isGlobal: true,
});
```

#### 自定义配置文件

对于更复杂的项目，你可以利用自定义配置文件返回嵌套的配置对象。这允许你按功能（例如，数据库相关设置）分组相关配置设置，并将相关设置存储在单独的文件中，以帮助独立管理它们。

自定义配置文件导出一个工厂函数，该函数返回一个配置对象。配置对象可以是任意嵌套的普通 JavaScript 对象。`process.env` 对象将包含完全解析的环境变量键/值对（`.env` 文件和外部定义的变量已解析并合并，如<a href="techniques/configuration#getting-started">上文</a>所述）。由于你控制返回的配置对象，因此可以添加任何所需的逻辑来将值转换为适当的类型、设置默认值等。例如：

```typescript
@@filename(config/configuration)
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432
  }
});
```

我们使用传递给 `ConfigModule.forRoot()` 方法的选项对象的 `load` 属性加载此文件：

```typescript
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
  ],
})
export class AppModule {}
```

> info **注意** 分配给 `load` 属性的值是一个数组，允许你加载多个配置文件（例如 `load: [databaseConfig, authConfig]`）。

使用自定义配置文件，我们还可以管理 YAML 文件等自定义文件。以下是一个使用 YAML 格式的配置示例：

```yaml
http:
  host: 'localhost'
  port: 8080

db:
  postgres:
    url: 'localhost'
    port: 5432
    database: 'yaml-db'

  sqlite:
    database: 'sqlite.db'
```

要读取和解析 YAML 文件，我们可以利用 `js-yaml` 包。

```bash
$ npm i js-yaml
$ npm i -D @types/js-yaml
```

安装包后，我们使用 `yaml#load` 函数加载上面创建的 YAML 文件。

```typescript
@@filename(config/configuration)
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

const YAML_CONFIG_FILENAME = 'config.yaml';

export default () => {
  return yaml.load(
    readFileSync(join(__dirname, YAML_CONFIG_FILENAME), 'utf8'),
  ) as Record<string, any>;
};
```

> warning **注意** Nest CLI 在构建过程中不会自动将你的“资源”（非 TS 文件）移动到 `dist` 文件夹。要确保 YAML 文件被复制，你必须在 `nest-cli.json` 文件中的 `compilerOptions#assets` 对象中指定这一点。例如，如果 `config` 文件夹与 `src` 文件夹位于同一级别，则添加 `compilerOptions#assets`，值为 `"assets": [{{ '{' }}"include": "../config/*.yaml", "outDir": "./dist/config"{{ '}' }}]`。阅读更多[此处](/cli/monorepo#assets)。

请注意，即使你在 NestJS 的 `ConfigModule` 中使用了 `validationSchema` 选项，配置文件也不会自动验证。如果你需要验证或想要应用任何转换，必须在工厂函数中处理，因为在那里你可以完全控制配置对象。这允许你根据需要实现任何自定义验证逻辑。

例如，如果你想确保端口在特定范围内，可以向工厂函数添加验证步骤：

```typescript
@@filename(config/configuration)
export default () => {
  const config = yaml.load(
    readFileSync(join(__dirname, YAML_CONFIG_FILENAME), 'utf8'),
  ) as Record<string, any>;

  if (config.http.port < 1024 || config.http.port > 49151) {
    throw new Error('HTTP 端口必须在 1024 和 49151 之间');
  }

  return config;
};
```

现在，如果端口超出指定范围，应用将在启动时抛出错误。

<app-banner-devtools></app-banner-devtools>

#### 使用 `ConfigService`

要从我们的 `ConfigService` 访问配置值，我们首先需要注入 `ConfigService`。与任何提供者一样，我们需要将其包含的模块 `ConfigModule` 导入到将使用它的模块中（除非你在传递给 `ConfigModule.forRoot()` 方法的选项对象中将 `isGlobal` 属性设置为 `true`）。如下所示将其导入功能模块。

```typescript
@@filename(feature.module)
@Module({
  imports: [ConfigModule],
  // ...
})
```

然后我们可以使用标准的构造函数注入：

```typescript
constructor(private configService: ConfigService) {}
```

> info **提示** `ConfigService` 从 `@nestjs/config` 包导入。

并在我们的类中使用它：

```typescript
// 获取环境变量
const dbUser = this.configService.get<string>('DATABASE_USER');

// 获取自定义配置值
const dbHost = this.configService.get<string>('database.host');
```

如上所示，使用 `configService.get()` 方法通过传递变量名来获取简单的环境变量。你可以通过传递类型来进行 TypeScript 类型提示，如上所示（例如 `get<string>(...)`）。`get()` 方法还可以遍历嵌套的自定义配置对象（通过<a href="techniques/configuration#custom-configuration-files">自定义配置文件</a>创建），如上文的第二个示例所示。

你还可以使用接口作为类型提示来获取整个嵌套的自定义配置对象：

```typescript
interface DatabaseConfig {
  host: string;
  port: number;
}

const dbConfig = this.configService.get<DatabaseConfig>('database');

// 现在可以使用 `dbConfig.port` 和 `dbConfig.host`
const port = dbConfig.port;
```

`get()` 方法还接受一个可选的第二个参数，用于定义默认值，当键不存在时将返回该默认值，如下所示：

```typescript
// 当未定义 "database.host" 时使用 "localhost"
const dbHost = this.configService.get<string>('database.host', 'localhost');
```

`ConfigService` 有两个可选泛型（类型参数）。第一个用于帮助防止访问不存在的配置属性。如下所示使用：

```typescript
interface EnvironmentVariables {
  PORT: number;
  TIMEOUT: string;
}

// 在代码中的某处
constructor(private configService: ConfigService<EnvironmentVariables>) {
  const port = this.configService.get('PORT', { infer: true });

  // TypeScript 错误：这是无效的，因为 URL 属性未在 EnvironmentVariables 中定义
  const url = this.configService.get('URL', { infer: true });
}
```

将 `infer` 属性设置为 `true` 后，`ConfigService#get` 方法将根据接口自动推断属性类型，例如，`typeof port === "number"`（如果你没有使用 TypeScript 的 `strictNullChecks` 标志），因为 `PORT` 在 `EnvironmentVariables` 接口中具有 `number` 类型。

此外，使用 `infer` 功能，你甚至可以推断嵌套自定义配置对象属性的类型，即使在使用点符号时也是如此，如下所示：

```typescript
constructor(private configService: ConfigService<{ database: { host: string } }>) {
  const dbHost = this.configService.get('database.host', { infer: true })!;
  // typeof dbHost === "string"                                          |
  //                                                                     +--> 非空断言操作符
}
```

第二个泛型依赖于第一个泛型，充当类型断言，以消除 `ConfigService` 方法在启用 `strictNullChecks` 时可能返回的所有 `undefined` 类型。例如：

```typescript
// ...
constructor(private configService: ConfigService<{ PORT: number }, true>) {
  //                                                               ^^^^
  const port = this.configService.get('PORT', { infer: true });
  //    ^^^ port 的类型将是 'number'，因此你不再需要 TS 类型断言
}
```

> info **提示** 要确保 `ConfigService#get` 方法仅从自定义配置文件中检索值并忽略 `process.env` 变量，请在 `ConfigModule` 的 `forRoot()` 方法的选项对象中将 `skipProcessEnv` 选项设置为 `true`。

#### 配置命名空间

`ConfigModule` 允许你定义和加载多个自定义配置文件，如<a href="techniques/configuration#custom-configuration-files">自定义配置文件</a>上文所示。你可以使用嵌套配置对象管理复杂的配置对象层次结构，如该部分所示。或者，你可以使用 `registerAs()` 函数返回一个“命名空间”配置对象，如下所示：

```typescript
@@filename(config/database.config)
export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT || 5432
}));
```

与自定义配置文件一样，在你的 `registerAs()` 工厂函数内部，`process.env` 对象将包含完全解析的环境变量键/值对（`.env` 文件和外部定义的变量已解析并合并，如<a href="techniques/configuration#getting-started">上文</a>所述）。

> info **提示** `registerAs` 函数从 `@nestjs/config` 包导出。

使用 `forRoot()` 方法的选项对象的 `load` 属性加载命名空间配置，与加载自定义配置文件的方式相同：

```typescript
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig],
    }),
  ],
})
export class AppModule {}
```

现在，要从 `database` 命名空间获取 `host` 值，请使用点符号。使用 `'database'` 作为属性名称的前缀，对应于命名空间的名称（作为第一个参数传递给 `registerAs()` 函数）：

```typescript
const dbHost = this.configService.get<string>('database.host');
```

一个合理的替代方法是直接注入 `database` 命名空间。这允许我们受益于强类型：

```typescript
constructor(
  @Inject(databaseConfig.KEY)
  private dbConfig: ConfigType<typeof databaseConfig>,
) {}
```

> info **提示** `ConfigType` 从 `@nestjs/config` 包导出。

#### 模块中的命名空间配置

要将命名空间配置用作应用中另一个模块的配置对象，你可以利用配置对象的 `.asProvider()` 方法。此方法将你的命名空间配置转换为提供者，然后可以传递给要使用的模块的 `forRootAsync()`（或任何等效方法）。

以下是一个示例：

```typescript
import databaseConfig from './config/database.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync(databaseConfig.asProvider()),
  ],
})
```

要理解 `.asProvider()` 方法的功能，让我们检查其返回值：

```typescript
// .asProvider() 方法的返回值
{
  imports: [ConfigModule.forFeature(databaseConfig)],
  useFactory: (configuration: ConfigType<typeof databaseConfig>) => configuration,
  inject: [databaseConfig.KEY]
}
```

这种结构允许你将命名空间配置无缝集成到模块中，确保应用保持组织和模块化，而无需编写样板重复代码。

#### 缓存环境变量

由于访问 `process.env` 可能很慢，你可以设置传递给 `ConfigModule.forRoot()` 的选项对象的 `cache` 属性，以提高 `ConfigService#get` 方法在访问存储在 `process.env` 中的变量时的性能。

```typescript
ConfigModule.forRoot({
  cache: true,
});
```

#### 部分注册

到目前为止，我们已经在根模块（例如 `AppModule`）中使用 `forRoot()` 方法处理了配置文件。也许你有一个更复杂的项目结构，其中特定功能的配置文件位于多个不同的目录中。与其在根模块中加载所有这些文件，`@nestjs/config` 包提供了一个称为**部分注册**的功能，它仅引用与每个功能模块关联的配置文件。在功能模块中使用 `forFeature()` 静态方法执行此部分注册，如下所示：

```typescript
import databaseConfig from './config/database.config';

@Module({
  imports: [ConfigModule.forFeature(databaseConfig)],
})
export class DatabaseModule {}
```

> info **警告** 在某些情况下，你可能需要通过 `onModuleInit()` 钩子而不是在构造函数中访问通过部分注册加载的属性。这是因为 `forFeature()` 方法在模块初始化期间运行，而模块初始化的顺序是不确定的。如果你在构造函数中通过另一个模块访问以这种方式加载的值，则配置所依赖的模块可能尚未初始化。`onModuleInit()` 方法仅在所有依赖的模块初始化后才运行，因此这种技术是安全的。

#### 模式验证

如果在应用启动时未提供必需的环境变量，或者它们不符合某些验证规则，则抛出异常是标准做法。`@nestjs/config` 包支持两种不同的方式来实现这一点：

- 内置验证器 [Joi](https://github.com/sideway/joi)。使用 Joi，你可以定义一个对象模式并针对它验证 JavaScript 对象。
- 一个自定义的 `validate()` 函数，它将环境变量作为输入。

要使用 Joi，我们必须安装 Joi 包：

```bash
$ npm install --save joi
```

现在我们可以定义一个 Joi 验证模式，并通过 `forRoot()` 方法的选项对象的 `validationSchema` 属性传递它，如下所示：

```typescript
@@filename(app.module)
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        PORT: Joi.number().port().default(3000),
      }),
    }),
  ],
})
export class AppModule {}
```

默认情况下，所有模式键都被视为可选的。在这里，我们为 `NODE_ENV` 和 `PORT` 设置了默认值，如果我们在环境（`.env` 文件或进程环境）中没有提供这些变量，将使用这些默认值。或者，我们可以使用 `required()` 验证方法来要求必须在环境（`.env` 文件或进程环境）中定义值。在这种情况下，如果我们在环境中未提供变量，验证步骤将抛出异常。有关如何构建验证模式的更多信息，请参阅 [Joi 验证方法](https://joi.dev/api/?v=17.3.0#example)。

默认情况下，允许未知的环境变量（其键不在模式中的环境变量）并且不会触发验证异常。默认情况下，报告所有验证错误。你可以通过 `forRoot()` 选项对象的 `validationOptions` 键传递选项对象来更改这些行为。此选项对象可以包含 [Joi 验证选项](https://joi.dev/api/?v=17.3.0#anyvalidatevalue-options)提供的任何标准验证选项属性。例如，要反转上述两个设置，传递如下选项：

```typescript
@@filename(app.module)
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        PORT: Joi.number().port().default(3000),
      }),
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
  ],
})
export class AppModule {}
```

`@nestjs/config` 包使用默认设置：

- `allowUnknown`：控制是否允许环境变量中的未知键。默认为 `true`
- `abortEarly`：如果为 true，则在第一个错误时停止验证；如果为 false，则返回所有错误。默认为 `false`。

请注意，一旦你决定传递 `validationOptions` 对象，任何你未显式传递的设置都将默认为 `Joi` 标准默认值（而不是 `@nestjs/config` 默认值）。例如，如果你在自定义 `validationOptions` 对象中未指定 `allowUnknowns`，它将具有 `Joi` 默认值 `false`。因此，在你的自定义对象中指定**两者**这些设置可能是最安全的。

> info **提示** 要禁用预定义环境变量的验证，请在 `forRoot()` 方法的选项对象中将 `validatePredefined` 属性设置为 `false`。预定义环境变量是在模块导入之前设置的进程变量（`process.env` 变量）。例如，如果你使用 `PORT=3000 node main.js` 启动应用，则 `PORT` 是预定义环境变量。

#### 自定义验证函数

或者，你可以指定一个**同步**的 `validate` 函数，该函数接收包含环境变量（来自 env 文件和进程）的对象，并返回包含已验证环境变量的对象，以便你可以在需要时转换/改变它们。如果函数抛出错误，它将阻止应用启动。

在此示例中，我们将使用 `class-transformer` 和 `class-validator` 包。首先，我们必须定义：

- 一个带有验证约束的类，
- 一个利用 `plainToInstance` 和 `validateSync` 函数的验证函数。

```typescript
@@filename(env.validation)
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, Max, Min, validateSync } from 'class-validator';

enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
  Provision = "provision",
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
```

有了这个，将 `validate` 函数用作 `ConfigModule` 的配置选项，如下所示：

```typescript
@@filename(app.module)
import { validate } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
    }),
  ],
})
export class AppModule {}
```

#### 自定义获取器函数

`ConfigService` 定义了一个通用的 `get()` 方法来按键检索配置值。我们还可以添加 `getter` 函数以实现更自然的编码风格：

```typescript
@@filename()
@Injectable()
export class ApiConfigService {
  constructor(private configService: ConfigService) {}

  get isAuthEnabled(): boolean {
    return this.configService.get('AUTH_ENABLED') === 'true';
  }
}
@@switch
@Dependencies(ConfigService)
@Injectable()
export class ApiConfigService {
  constructor(configService) {
    this.configService = configService;
  }

  get isAuthEnabled() {
    return this.configService.get('AUTH_ENABLED') === 'true';
  }
}
```

现在我们可以像这样使用获取器函数：

```typescript
@@filename(app.service)
@Injectable()
export class AppService {
  constructor(apiConfigService: ApiConfigService) {
    if (apiConfigService.isAuthEnabled) {
      // 身份验证已启用
    }
  }
}
@@switch
@Dependencies(ApiConfigService)
@Injectable()
export class AppService {
  constructor(apiConfigService) {
    if (apiConfigService.isAuthEnabled) {
      // 身份验证已启用
    }
  }
}
```

#### 环境变量加载钩子

如果一个模块配置依赖于环境变量，并且这些变量是从 `.env` 文件加载的，你可以使用 `ConfigModule.envVariablesLoaded` 钩子来确保在与 `process.env` 对象交互之前文件已加载，请参阅以下示例：

```typescript
export async function getStorageModule() {
  await ConfigModule.envVariablesLoaded;
  return process.env.STORAGE === 'S3' ? S3StorageModule : DefaultStorageModule;
}
```

这种结构保证了在 `ConfigModule.envVariablesLoaded` Promise 解析后，所有配置变量都已加载完毕。

#### 条件模块配置

有时你可能希望有条件地加载一个模块，并在环境变量中指定条件。幸运的是，`@nestjs/config` 提供了一个 `ConditionalModule`，允许你做到这一点。

```typescript
@Module({
  imports: [
    ConfigModule.forRoot(),
    ConditionalModule.registerWhen(FooModule, 'USE_FOO'),
  ],
})
export class AppModule {}
```

上述模块仅当在 `.env` 文件中环境变量 `USE_FOO` 的值不是 `false` 时才会加载 `FooModule`。你还可以传递一个自定义条件，一个接收 `process.env` 引用的函数，该函数应返回一个布尔值供 `ConditionalModule` 处理：

```typescript
@Module({
  imports: [
    ConfigModule.forRoot(),
    ConditionalModule.registerWhen(
      FooBarModule,
      (env: NodeJS.ProcessEnv) => !!env['foo'] && !!env['bar'],
    ),
  ],
})
export class AppModule {}
```

重要的是要确保在使用 `ConditionalModule` 时，你也已将 `ConfigModule` 加载到应用中，以便可以正确引用和利用 `ConfigModule.envVariablesLoaded` 钩子。如果钩子在 5 秒内未翻转为 true，或者用户在 `registerWhen` 方法的第三个选项参数中设置的超时（以毫秒为单位），则 `ConditionalModule` 将抛出错误，Nest 将中止启动应用。

#### 可扩展变量

`@nestjs/config` 包支持环境变量扩展。通过这种技术，你可以创建嵌套的环境变量，其中一个变量在另一个变量的定义中被引用。例如：

```json
APP_URL=mywebsite.com
SUPPORT_EMAIL=support@${APP_URL}
```

通过这种构造，变量 `SUPPORT_EMAIL` 解析为 `'support@mywebsite.com'`。注意使用 `${{ '{' }}...{{ '}' }}` 语法来触发在 `SUPPORT_EMAIL` 的定义内部解析变量 `APP_URL` 的值。

> info **提示** 对于此功能，`@nestjs/config` 包内部使用了 [dotenv-expand](https://github.com/motdotla/dotenv-expand)。

使用传递给 `ConfigModule` 的 `forRoot()` 方法的选项对象的 `expandVariables` 属性启用环境变量扩展，如下所示：

```typescript
@@filename(app.module)
@Module({
  imports: [
    ConfigModule.forRoot({
      // ...
      expandVariables: true,
    }),
  ],
})
export class AppModule {}
```

#### 在 `main.ts` 中使用

虽然我们的配置存储在服务中，但它仍然可以在 `main.ts` 文件中使用。这样，你可以使用它来存储变量，例如应用端口或 CORS 主机。

要访问它，你必须使用 `app.get()` 方法，后跟服务引用：

```typescript
const configService = app.get(ConfigService);
```

然后你可以像往常一样使用它，通过调用带有配置键的 `get` 方法：

```typescript
const port = configService.get('PORT');
```
