### 动态模块

[模块章节](/modules)涵盖了 Nest 模块的基础知识，并简要介绍了[动态模块](/modules#dynamic-modules)。本章节将深入探讨动态模块的主题。学习完成后，你应该对它们是什么、如何以及何时使用有很好的理解。

#### 介绍

在文档的**概述**部分，大多数应用代码示例都使用了常规或静态模块。模块定义了如[提供者](/providers)和[控制器](/controllers)这样的组件组，它们作为整体应用的模块化部分协同工作。模块为这些组件提供了执行上下文或作用域。例如，定义在模块中的提供者对该模块的其他成员可见，无需导出。当提供者需要在模块外部可见时，首先从其宿主模块导出，然后导入到消费模块中。

让我们通过一个熟悉的例子来理解。

首先，我们定义一个 `UsersModule` 来提供并导出 `UsersService`。`UsersModule` 是 `UsersService` 的**宿主**模块。

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

接下来，我们定义一个 `AuthModule`，它导入 `UsersModule`，使得 `UsersModule` 的导出提供者在 `AuthModule` 内部可用：

```typescript
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

这些结构允许我们在 `AuthModule` 中托管的 `AuthService` 中注入 `UsersService`：

```typescript
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}
  /*
    利用 this.usersService 的实现
  */
}
```

我们将这称为**静态**模块绑定。Nest 连接模块所需的所有信息已在宿主和消费模块中声明。让我们解析这个过程发生了什么。Nest 通过以下方式使 `UsersService` 在 `AuthModule` 中可用：

1. 实例化 `UsersModule`，包括传递性导入 `UsersModule` 自身消费的其他模块，并传递性解析任何依赖（参见[自定义提供者](/fundamentals/custom-providers)）。
2. 实例化 `AuthModule`，并使 `UsersModule` 的导出提供者对 `AuthModule` 中的组件可用（就像它们在 `AuthModule` 中声明一样）。
3. 在 `AuthService` 中注入 `UsersService` 的实例。

#### 动态模块的使用场景

使用静态模块绑定时，消费模块没有机会**影响**宿主模块的提供者配置方式。这为什么重要？考虑我们有一个通用模块，需要在不同用例中表现不同的情况。这类似于许多系统中的“插件”概念，通用设施在使用前需要一些配置。

Nest 中的一个好例子是**配置模块**。许多应用发现通过配置模块外部化配置细节非常有用。这使得在不同部署中动态更改应用设置变得容易：例如，开发人员使用开发数据库， staging/testing 环境使用 staging 数据库等。通过将配置参数的管理委托给配置模块，应用源代码保持与配置参数独立。

挑战在于配置模块本身，由于它是通用的（类似于“插件”），需要由其消费模块定制。这就是*动态模块*发挥作用的地方。使用动态模块特性，我们可以使配置模块**动态化**，以便消费模块在导入时使用 API 来控制配置模块的定制方式。

换句话说，动态模块提供了一个 API，用于将一个模块导入另一个模块，并在导入时定制该模块的属性和行为，而不是使用我们迄今为止看到的静态绑定。

<app-banner-devtools></app-banner-devtools>

#### 配置模块示例

我们将使用[配置章节](/techniques/configuration#service)中的示例代码的基本版本。本章结束时的完整版本可作为一个有效的[示例在此处找到](https://github.com/nestjs/nest/tree/master/sample/25-dynamic-modules)。

我们的需求是让 `ConfigModule` 接受一个 `options` 对象来自定义它。这是我们想要支持的功能。基本示例中将 `.env` 文件的位置硬编码为项目根文件夹。假设我们希望使其可配置，以便你可以在选择的任何文件夹中管理 `.env` 文件。例如，假设你想将各种 `.env` 文件存储在项目根目录下名为 `config` 的文件夹中（即 `src` 的同级文件夹）。你希望在不同项目中使用 `ConfigModule` 时能够选择不同的文件夹。

动态模块使我们能够将参数传递给被导入的模块，从而改变其行为。让我们看看这是如何工作的。从消费模块的角度来看，这可能会是什么样子，然后反向工作，这很有帮助。首先，让我们快速回顾一下*静态*导入 `ConfigModule` 的示例（即一种无法影响导入模块行为的方法）。密切关注 `@Module()` 装饰器中的 `imports` 数组：

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

让我们考虑一下*动态模块*导入的样子，其中我们传递了一个配置对象。比较这两个示例中 `imports` 数组的区别：

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule.register({ folder: './config' })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

让我们看看上面的动态示例中发生了什么。有哪些组成部分？

1. `ConfigModule` 是一个普通类，因此我们可以推断它必须有一个名为 `register()` 的**静态方法**。我们知道它是静态的，因为我们是在 `ConfigModule` 类上调用它，而不是在类的**实例**上。注意：这个方法（我们很快就会创建）可以有任意名称，但按照惯例，我们应该称其为 `forRoot()` 或 `register()`。
2. `register()` 方法是由我们定义的，因此我们可以接受任何输入参数。在这种情况下，我们将接受一个具有适当属性的简单 `options` 对象，这是典型情况。
3. 我们可以推断 `register()` 方法必须返回类似于 `module` 的东西，因为它的返回值出现在熟悉的 `imports` 列表中，我们迄今为止看到的是包含模块列表。

实际上，我们的 `register()` 方法将返回一个 `DynamicModule`。动态模块只不过是在运行时创建的模块，具有与静态模块完全相同的属性，外加一个名为 `module` 的额外属性。让我们快速回顾一个示例静态模块声明，密切关注传递给装饰器的模块选项：

```typescript
@Module({
  imports: [DogsModule],
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService]
})
```

动态模块必须返回一个具有完全相同接口的对象，外加一个名为 `module` 的属性。`module` 属性用作模块的名称，应与模块的类名相同，如下例所示。

> info **提示** 对于动态模块，模块选项对象的所有属性都是可选的，**除了** `module`。

静态 `register()` 方法呢？我们现在可以看到它的工作是返回一个具有 `DynamicModule` 接口的对象。当我们调用它时，我们实际上是在向 `imports` 列表提供一个模块，类似于在静态情况下通过列出模块类名的方式。换句话说，动态模块 API 只是返回一个模块，但我们不是通过 `@Module` 装饰器固定属性，而是以编程方式指定它们。

还有一些细节需要涵盖，以帮助完善整个画面：

1. 我们现在可以声明 `@Module()` 装饰器的 `imports` 属性不仅可以接受模块类名（例如，`imports: [UsersModule]`），还可以接受**返回**动态模块的函数（例如，`imports: [ConfigModule.register(...)]`）。
2. 动态模块本身可以导入其他模块。我们不会在这个例子中这样做，但如果动态模块依赖于其他模块的提供者，你将使用可选的 `imports` 属性导入它们。再次强调，这与使用 `@Module()` 装饰器声明静态模块的元数据完全类似。

有了这个理解，我们现在可以看看我们的动态 `ConfigModule` 声明必须是什么样子。让我们尝试一下。

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

@Module({})
export class ConfigModule {
  static register(): DynamicModule {
    return {
      module: ConfigModule,
      providers: [ConfigService],
      exports: [ConfigService],
    };
  }
}
```

现在应该清楚各部分是如何连接起来的。调用 `ConfigModule.register(...)` 返回一个 `DynamicModule` 对象，其属性基本上与迄今为止我们通过 `@Module()` 装饰器提供的元数据相同。

> info **提示** 从 `@nestjs/common` 导入 `DynamicModule`。

然而，我们的动态模块还不是很有趣，因为我们还没有引入任何**配置**能力，正如我们所说我们希望做的那样。接下来让我们解决这个问题。

#### 模块配置

定制 `ConfigModule` 行为的明显解决方案是在静态 `register()` 方法中传递一个 `options` 对象，正如我们上面猜测的那样。让我们再次查看消费模块的 `imports` 属性：

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule.register({ folder: './config' })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

这很好地处理了将 `options` 对象传递给我们的动态模块。然后我们如何在 `ConfigModule` 中使用那个 `options` 对象？让我们考虑一下。我们知道我们的 `ConfigModule` 基本上是提供和导出可注入服务 - `ConfigService` - 的主机，供其他提供者使用。实际上是我们的 `ConfigService` 需要读取 `options` 对象来定制其行为。让我们暂时假设我们知道如何以某种方式将 `options` 从 `register()` 方法获取到 `ConfigService` 中。基于这个假设，我们可以对服务进行一些更改，以根据 `options` 对象的属性定制其行为。（**注意**：暂时，由于我们*还没有*确定如何传递它，我们将只是硬编码 `options`。我们稍后会修复这个问题）。

```typescript
import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { EnvConfig } from './interfaces';

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;

  constructor() {
    const options = { folder: './config' };

    const filePath = `${process.env.NODE_ENV || 'development'}.env`;
    const envFile = path.resolve(__dirname, '../../', options.folder, filePath);
    this.envConfig = dotenv.parse(fs.readFileSync(envFile));
  }

  get(key: string): string {
    return this.envConfig[key];
  }
}
```

现在我们的 `ConfigService` 知道如何在我们指定的 `options` 文件夹中找到 `.env` 文件。

我们剩下的任务是以某种方式将 `options` 对象从 `register()` 步骤注入到我们的 `ConfigService` 中。当然，我们将使用*依赖注入*来实现。这是一个关键点，所以请确保你理解它。我们的 `ConfigModule` 提供 `ConfigService`。`ConfigService` 又依赖于仅在运行时提供的 `options` 对象。因此，在运行时，我们需要首先将 `options` 对象绑定到 Nest IoC 容器，然后让 Nest 将其注入到我们的 `ConfigService` 中。记得在**自定义提供者**章节中，提供者可以[包含任何值](/fundamentals/custom-providers#non-service-based-providers)，不仅仅是服务，所以使用依赖注入来处理简单的 `options` 对象是没问题的。

让我们首先解决将选项对象绑定到 IoC 容器的问题。我们在静态 `register()` 方法中这样做。记住我们正在动态构建一个模块，模块的属性之一是其提供者列表。所以我们需要做的是将我们的选项对象定义为一个提供者。这将使其可注入到 `ConfigService` 中，我们将在下一步中利用这一点。在下面的代码中，注意 `providers` 数组：

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

@Module({})
export class ConfigModule {
  static register(options: Record<string, any>): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: options,
        },
        ConfigService,
      ],
      exports: [ConfigService],
    };
  }
}
```

现在我们可以通过将 `'CONFIG_OPTIONS'` 提供者注入到 `ConfigService` 中来完成这个过程。回想一下，当我们使用非类令牌定义提供者时，需要使用 `@Inject()` 装饰器，[如这里所述](/fundamentals/custom-providers#non-class-based-provider-tokens)。

```typescript
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Inject } from '@nestjs/common';
import { EnvConfig } from './interfaces';

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;

  constructor(@Inject('CONFIG_OPTIONS') private options: Record<string, any>) {
    const filePath = `${process.env.NODE_ENV || 'development'}.env`;
    const envFile = path.resolve(__dirname, '../../', options.folder, filePath);
    this.envConfig = dotenv.parse(fs.readFileSync(envFile));
  }

  get(key: string): string {
    return this.envConfig[key];
  }
}
```

最后一个注意事项：为简单起见，我们上面使用了基于字符串的注入令牌（`'CONFIG_OPTIONS'`），但最佳实践是将其定义为单独文件中的常量（或 `Symbol`），并导入该文件。例如：

```typescript
export const CONFIG_OPTIONS = 'CONFIG_OPTIONS';
```

#### 示例

本章代码的完整示例可以在[这里](https://github.com/nestjs/nest/tree/master/sample/25-dynamic-modules)找到。

#### 社区指南

你可能已经在一些 `@nestjs/` 包中看到过 `forRoot`、`register` 和 `forFeature` 等方法的使用，并且可能想知道所有这些方法的区别。对此没有硬性规定，但 `@nestjs/` 包尝试遵循这些指南：

创建模块时：

- `register`，你期望使用特定配置配置动态模块，仅供调用模块使用。例如，使用 Nest 的 `@nestjs/axios`：`HttpModule.register({{ '{' }} baseUrl: 'someUrl' {{ '}' }})`。如果在另一个模块中使用 `HttpModule.register({{ '{' }} baseUrl: 'somewhere else' {{ '}' }})`，它将具有不同的配置。你可以为任意多个模块执行此操作。

- `forRoot`，你期望配置一次动态模块并在多个位置重用该配置（尽管可能不知道，因为它被抽象化了）。这就是为什么有一个 `GraphQLModule.forRoot()`、一个 `TypeOrmModule.forRoot()` 等。

- `forFeature`，你期望使用动态模块的 `forRoot` 配置，但需要修改一些特定于调用模块需求的配置（即此模块应访问哪个存储库，或记录器应使用的上下文）。

所有这些通常都有它们的 `async` 对应物，`registerAsync`、`forRootAsync` 和 `forFeatureAsync`，它们意味着相同的事情，但也使用 Nest 的依赖注入进行配置。

#### 可配置模块构建器

由于手动创建高度可配置、暴露 `async` 方法（`registerAsync`、`forRootAsync` 等）的动态模块相当复杂，尤其是对于新手，Nest 公开了 `ConfigurableModuleBuilder` 类，它促进了这个过程，并让你只需几行代码就能构建模块“蓝图”。

例如，让我们采用上面使用的示例（`ConfigModule`）并将其转换为使用 `ConfigurableModuleBuilder`。在我们开始之前，让我们确保创建一个专用接口，表示我们的 `ConfigModule` 接受什么选项。

```typescript
export interface ConfigModuleOptions {
  folder: string;
}
```

有了这个，创建一个新的专用文件（与现有的 `config.module.ts` 文件一起）并将其命名为 `config.module-definition.ts`。在这个文件中，让我们利用 `ConfigurableModuleBuilder` 来构建 `ConfigModule` 定义。

```typescript
@@filename(config.module-definition)
import { ConfigurableModuleBuilder } from '@nestjs/common';
import { ConfigModuleOptions } from './interfaces/config-module-options.interface';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<ConfigModuleOptions>().build();
@@switch
import { ConfigurableModuleBuilder } from '@nestjs/common';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder().build();
```

现在让我们打开 `config.module.ts` 文件并修改其实现以利用自动生成的 `ConfigurableModuleClass`：

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigurableModuleClass } from './config.module-definition';

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule extends ConfigurableModuleClass {}
```

扩展 `ConfigurableModuleClass` 意味着 `ConfigModule` 现在不仅提供 `register` 方法（如之前自定义实现），还提供 `registerAsync` 方法，该方法允许消费者异步配置该模块，例如，通过提供异步工厂：

```typescript
@Module({
  imports: [
    ConfigModule.register({ folder: './config' }),
    // 或者 alternatively:
    // ConfigModule.registerAsync({
    //   useFactory: () => {
    //     return {
    //       folder: './config',
    //     }
    //   },
    //   inject: [...任何额外的依赖...]
    // }),
  ],
})
export class AppModule {}
```

`registerAsync` 方法接受以下对象作为参数：

```typescript
{
  /**
   * 解析为将作为提供者实例化的类的注入令牌。
   * 该类必须实现相应的接口。
   */
  useClass?: Type<
    ConfigurableModuleOptionsFactory<ModuleOptions, FactoryClassMethodKey>
  >;
  /**
   * 返回选项（或解析为选项的 Promise）以配置模块的函数。
   */
  useFactory?: (...args: any[]) => Promise<ModuleOptions> | ModuleOptions;
  /**
   * 工厂可能注入的依赖项。
   */
  inject?: FactoryProvider['inject'];
  /**
   * 解析为现有提供者的注入令牌。该提供者必须实现相应的接口。
   */
  useExisting?: Type<
    ConfigurableModuleOptionsFactory<ModuleOptions, FactoryClassMethodKey>
  >;
}
```

让我们逐一查看上述属性：

- `useFactory` - 返回配置对象的函数。它可以是同步的或异步的。要将依赖项注入工厂函数，请使用 `inject` 属性。我们在上面的示例中使用了这种变体。
- `inject` - 将注入工厂函数的依赖项数组。依赖项的顺序必须与工厂函数中参数的顺序匹配。
- `useClass` - 将作为提供者实例化的类。该类必须实现相应的接口。通常，这是一个提供 `create()` 方法返回配置对象的类。在下面的[自定义方法键](/fundamentals/dynamic-modules#custom-method-key)部分阅读更多关于此的信息。
- `useExisting` - `useClass` 的变体，允许你使用现有提供者，而不是指示 Nest 创建类的新实例。当你想使用已在模块中注册的提供者时，这很有用。请记住，该类必须实现与 `useClass` 中使用的相同接口（因此它必须提供 `create()` 方法，除非你覆盖默认方法名称，请参阅下面的[自定义方法键](/fundamentals/dynamic-modules#custom-method-key)部分）。

始终选择上述选项之一（`useFactory`、`useClass` 或 `useExisting`），因为它们是互斥的。

最后，让我们更新 `ConfigService` 类以注入生成的模块选项提供者，而不是我们迄今为止使用的 `'CONFIG_OPTIONS'`。

```typescript
@Injectable()
export class ConfigService {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) private options: ConfigModuleOptions) { ... }
}
```

#### 自定义方法键

默认情况下，`ConfigurableModuleClass` 提供 `register` 及其对应物 `registerAsync` 方法。要使用不同的方法名称，请使用 `ConfigurableModuleBuilder#setClassMethodName` 方法，如下所示：

```typescript
@@filename(config.module-definition)
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<ConfigModuleOptions>().setClassMethodName('forRoot').build();
@@switch
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder().setClassMethodName('forRoot').build();
```

这种构造将指示 `ConfigurableModuleBuilder` 生成一个公开 `forRoot` 和 `forRootAsync` 而不是的类。示例：

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ folder: './config' }), // <-- 注意使用 "forRoot" 而不是 "register"
    // 或者 alternatively:
    // ConfigModule.forRootAsync({
    //   useFactory: () => {
    //     return {
    //       folder: './config',
    //     }
    //   },
    //   inject: [...任何额外的依赖...]
    // }),
  ],
})
export class AppModule {}
```

#### 自定义选项工厂类

由于 `registerAsync` 方法（或 `forRootAsync` 或任何其他名称，取决于配置）让消费者传递解析为模块配置的提供者定义，库消费者可以 potentially 提供一个类来用于构建配置对象。

```typescript
@Module({
  imports: [
    ConfigModule.registerAsync({
      useClass: ConfigModuleOptionsFactory,
    }),
  ],
})
export class AppModule {}
```

默认情况下，此类必须提供返回模块配置对象的 `create()` 方法。但是，如果你的库遵循不同的命名约定，你可以更改该行为并指示 `ConfigurableModuleBuilder` 期望不同的方法，例如 `createConfigOptions`，使用 `ConfigurableModuleBuilder#setFactoryMethodName` 方法：

```typescript
@@filename(config.module-definition)
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<ConfigModuleOptions>().setFactoryMethodName('createConfigOptions').build();
@@switch
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder().setFactoryMethodName('createConfigOptions').build();
```

现在，`ConfigModuleOptionsFactory` 类必须公开 `createConfigOptions` 方法（而不是 `create`）：

```typescript
@Module({
  imports: [
    ConfigModule.registerAsync({
      useClass: ConfigModuleOptionsFactory, // <-- 这个类必须提供 "createConfigOptions" 方法
    }),
  ],
})
export class AppModule {}
```

#### 额外选项

存在边缘情况，当你的模块可能需要接受额外选项来确定其行为方式时（一个很好的例子是 `isGlobal` 标志 - 或只是 `global`），同时，这些选项不应包含在 `MODULE_OPTIONS_TOKEN` 提供者中（因为它们与该模块内注册的服务/提供者无关，例如，`ConfigService` 不需要知道其宿主模块是否注册为全局模块）。

在这种情况下，可以使用 `ConfigurableModuleBuilder#setExtras` 方法。参见以下示例：

```typescript
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<ConfigModuleOptions>()
    .setExtras(
      {
        isGlobal: true,
      },
      (definition, extras) => ({
        ...definition,
        global: extras.isGlobal,
      }),
    )
    .build();
```

在上面的示例中，传递给 `setExtras` 方法的第一个参数是一个对象，包含“额外”属性的默认值。第二个参数是一个函数，它接受自动生成的模块定义（带有 `provider`、`exports` 等）和 `extras` 对象，该对象表示额外属性（由消费者指定或默认值）。此函数的返回值是修改后的模块定义。在这个特定示例中，我们获取 `extras.isGlobal` 属性并将其分配给模块定义的 `global` 属性（这反过来决定模块是否是全局的，阅读更多[这里](/modules#dynamic-modules)）。

现在当消费这个模块时，可以传入额外的 `isGlobal` 标志，如下所示：

```typescript
@Module({
  imports: [
    ConfigModule.register({
      isGlobal: true,
      folder: './config',
    }),
  ],
})
export class AppModule {}
```

然而，由于 `isGlobal` 被声明为“额外”属性，它在 `MODULE_OPTIONS_TOKEN` 提供者中将不可用：

```typescript
@Injectable()
export class ConfigService {
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private options: ConfigModuleOptions,
  ) {
    // "options" 对象将没有 "isGlobal" 属性
    // ...
  }
}
```

#### 扩展自动生成的方法

如果需要，可以扩展自动生成的静态方法（`register`、`registerAsync` 等），如下所示：

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import {
  ConfigurableModuleClass,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} from './config.module-definition';

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule extends ConfigurableModuleClass {
  static register(options: typeof OPTIONS_TYPE): DynamicModule {
    return {
      // 你的自定义逻辑在这里
      ...super.register(options),
    };
  }

  static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
    return {
      // 你的自定义逻辑在这里
      ...super.registerAsync(options),
    };
  }
}
```

注意使用 `OPTIONS_TYPE` 和 `ASYNC_OPTIONS_TYPE` 类型，这些类型必须从模块定义文件中导出：

```typescript
export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<ConfigModuleOptions>().build();
```
