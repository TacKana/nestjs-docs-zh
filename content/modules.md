### 模块

模块是指带有 `@Module()` 装饰器的类。该装饰器提供的元数据，**Nest** 用来高效地组织和管理应用程序的结构。

<figure><img class="illustrative-image" src="/assets/Modules_1.png" /></figure>

每个 Nest 应用至少有一个模块，即**根模块**，作为 Nest 构建**应用图**的起点。应用图是 Nest 用于解析模块和提供者之间关系及依赖的内部结构。虽然小型应用可能仅有一个根模块，但这通常不是常态。强烈推荐使用模块作为组织组件的有效方式。对于大多数应用，你可能会拥有多个模块，每个模块封装一组紧密相关的**功能**。

`@Module()` 装饰器接受一个包含描述模块属性的对象：

|               |                                                                                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`   | 由 Nest 注入器实例化的提供者，并且至少可以在本模块中共享                                                                                                                              |
| `controllers` | 本模块中定义的、需要实例化的控制器集合                                                                                                                              |
| `imports`     | 导入的模块列表，这些模块导出了本模块所需的提供者                                                                                                                                |
| `exports`     | 由本模块提供、并且应在导入本模块的其他模块中可用的 `providers` 子集。可以使用提供者本身或其令牌（`provide` 值）                                                                 |

模块默认**封装**提供者，这意味着你只能注入属于当前模块或从其他导入模块显式导出的提供者。模块导出的提供者本质上是该模块的公共接口或 API。

#### 功能模块

在我们的示例中，`CatsController` 和 `CatsService` 紧密相关，服务于同一应用领域。将它们分组到一个功能模块中是合理的。功能模块组织与特定功能相关的代码，有助于维护清晰的边界和更好的组织。这在应用或团队增长时尤为重要，并且符合 [SOLID](https://en.wikipedia.org/wiki/SOLID) 原则。

接下来，我们将创建 `CatsModule` 来演示如何分组控制器和服务。

```typescript
@@filename(cats/cats.module)
import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {}
```

> info **提示** 要使用 CLI 创建模块，只需执行 `$ nest g module cats` 命令。

以上，我们在 `cats.module.ts` 文件中定义了 `CatsModule`，并将与此模块相关的一切移至 `cats` 目录。最后需要做的是将此模块导入根模块（在 `app.module.ts` 文件中定义的 `AppModule`）。

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { CatsModule } from './cats/cats.module';

@Module({
  imports: [CatsModule],
})
export class AppModule {}
```

现在我们的目录结构如下：

<div class="file-tree">
  <div class="item">src</div>
  <div class="children">
    <div class="item">cats</div>
    <div class="children">
      <div class="item">dto</div>
      <div class="children">
        <div class="item">create-cat.dto.ts</div>
      </div>
      <div class="item">interfaces</div>
      <div class="children">
        <div class="item">cat.interface.ts</div>
      </div>
      <div class="item">cats.controller.ts</div>
      <div class="item">cats.module.ts</div>
      <div class="item">cats.service.ts</div>
    </div>
    <div class="item">app.module.ts</div>
    <div class="item">main.ts</div>
  </div>
</div>

#### 共享模块

在 Nest 中，模块默认是**单例（singleton）**，因此你可以在多个模块之间轻松共享同一提供者的实例。

<figure><img class="illustrative-image" src="/assets/Shared_Module_1.png" /></figure>

每个模块自动成为**共享模块**。一旦创建，它可以被任何模块重用。假设我们想在几个其他模块之间共享 `CatsService` 的实例。为此，我们首先需要通过将其添加到模块的 `exports` 数组来**导出** `CatsService` 提供者，如下所示：

```typescript
@@filename(cats.module)
import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService]
})
export class CatsModule {}
```

现在，任何导入 `CatsModule` 的模块都可以访问 `CatsService`，并且将与所有其他导入它的模块共享同一实例。

如果我们在每个需要 `CatsService` 的模块中直接注册它，它确实可以工作，但会导致每个模块获得自己独立的 `CatsService` 实例。这可能会增加内存使用，因为创建了同一服务的多个实例，并且如果服务维护任何内部状态，还可能导致意外行为，如状态不一致。

通过将 `CatsService` 封装在模块（如 `CatsModule`）中并导出它，我们确保所有导入 `CatsModule` 的模块都重用同一 `CatsService` 实例。这不仅减少了内存消耗，还导致更可预测的行为，因为所有模块共享同一实例，使得管理共享状态或资源更加容易。这是像 NestJS 这样的框架中模块化和依赖注入的关键好处之一——允许服务在整个应用中高效共享。

<app-banner-devtools></app-banner-devtools>

#### 模块再导出

如上所述，模块可以导出其内部提供者。此外，它们还可以再导出它们导入的模块。在以下示例中，`CommonModule` 既被导入到 `CoreModule` 中，又从 `CoreModule` 导出，使其可用于导入此模块的其他模块。

```typescript
@Module({
  imports: [CommonModule],
  exports: [CommonModule],
})
export class CoreModule {}
```

#### 依赖注入

模块类也可以**注入**提供者（例如，用于配置目的）：

```typescript
@@filename(cats.module)
import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {
  constructor(private catsService: CatsService) {}
}
@@switch
import { Module, Dependencies } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
@Dependencies(CatsService)
export class CatsModule {
  constructor(catsService) {
    this.catsService = catsService;
  }
}
```

但是，由于[循环依赖](/fundamentals/circular-dependency)，模块类本身不能作为提供者注入。

#### 全局模块

如果你不得不在各处导入相同的模块集，这可能会变得繁琐。与 Nest 不同，[Angular](https://angular.dev) 的 `providers` 是在全局范围内注册的。一旦定义，它们随处可用。然而，Nest 将提供者封装在模块范围内。如果不首先导入封装模块，你就无法在其他地方使用模块的提供者。

当你希望提供一组应随处可用的提供者（例如，辅助工具、数据库连接等）时，使用 `@Global()` 装饰器使模块成为**全局**模块。

```typescript
import { Module, Global } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Global()
@Module({
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService],
})
export class CatsModule {}
```

`@Global()` 装饰器使模块具有全局作用域。全局模块应**仅注册一次**，通常由根模块或核心模块注册。在上面的示例中，`CatsService` 提供者将随处可用，希望注入该服务的模块无需在其 imports 数组中导入 `CatsModule`。

> info **提示** 将一切都设为全局并不是推荐的设计实践。虽然全局模块可以帮助减少样板代码，但通常更好的是使用 `imports` 数组以受控和清晰的方式使模块的 API 可用于其他模块。这种方法提供了更好的结构和可维护性，确保只有模块的必要部分与他人共享，同时避免应用不相关部分之间不必要的耦合。

#### 动态模块

Nest 中的动态模块允许你创建可以在运行时配置的模块。这在需要提供灵活、可定制的模块时特别有用，其中提供者可以根据某些选项或配置创建。以下是**动态模块**工作原理的简要概述。

```typescript
@@filename()
import { Module, DynamicModule } from '@nestjs/common';
import { createDatabaseProviders } from './database.providers';
import { Connection } from './connection.provider';

@Module({
  providers: [Connection],
  exports: [Connection],
})
export class DatabaseModule {
  static forRoot(entities = [], options?): DynamicModule {
    const providers = createDatabaseProviders(options, entities);
    return {
      module: DatabaseModule,
      providers: providers,
      exports: providers,
    };
  }
}
@@switch
import { Module } from '@nestjs/common';
import { createDatabaseProviders } from './database.providers';
import { Connection } from './connection.provider';

@Module({
  providers: [Connection],
  exports: [Connection],
})
export class DatabaseModule {
  static forRoot(entities = [], options) {
    const providers = createDatabaseProviders(options, entities);
    return {
      module: DatabaseModule,
      providers: providers,
      exports: providers,
    };
  }
}
```

> info **提示** `forRoot()` 方法可以同步或异步（即通过 `Promise`）返回动态模块。

此模块默认定义了 `Connection` 提供者（在 `@Module()` 装饰器元数据中），但另外根据传递给 `forRoot()` 方法的 `entities` 和 `options` 对象，暴露一组提供者，例如存储库。请注意，动态模块返回的属性**扩展**（而不是覆盖）了在 `@Module()` 装饰器中定义的基础模块元数据。这就是如何从模块中导出静态声明的 `Connection` 提供者**和**动态生成的存储库提供者。

如果要在全局范围内注册动态模块，请将 `global` 属性设置为 `true`。

```typescript
{
  global: true,
  module: DatabaseModule,
  providers: providers,
  exports: providers,
}
```

> warning **警告** 如上所述，将一切都设为全局**不是好的设计决策**。

`DatabaseModule` 可以按以下方式导入和配置：

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { User } from './users/entities/user.entity';

@Module({
  imports: [DatabaseModule.forRoot([User])],
})
export class AppModule {}
```

如果你想反过来再导出一个动态模块，可以在 exports 数组中省略 `forRoot()` 方法调用：

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { User } from './users/entities/user.entity';

@Module({
  imports: [DatabaseModule.forRoot([User])],
  exports: [DatabaseModule],
})
export class AppModule {}
```

[动态模块](/fundamentals/dynamic-modules) 章节更详细地介绍了这个主题，并包含一个[工作示例](https://github.com/nestjs/nest/tree/master/sample/25-dynamic-modules)。

> info **提示** 了解如何使用 `ConfigurableModuleBuilder` 构建高度可定制的动态模块，请参阅[本章](/fundamentals/dynamic-modules#configurable-module-builder)。