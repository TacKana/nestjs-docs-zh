### 提供者（Providers）

提供者是 Nest 中的一个核心概念。许多基础的 Nest 类，如服务（services）、仓库（repositories）、工厂（factories）和辅助工具（helpers），都可以被视为提供者。提供者的核心理念在于它们可以作为**依赖**被**注入**，从而让对象之间能够建立多种关联关系。将这些对象“连接”起来的职责主要由 Nest 运行时系统承担。

<figure><img class="illustrative-image" src="/assets/Components_1.png" /></figure>

在前一章中，我们创建了一个简单的 `CatsController`。控制器应负责处理 HTTP 请求，并将更复杂的任务委托给**提供者**。提供者是普通的 JavaScript 类，在 NestJS 模块中通过 `providers` 进行声明。更多详情请参阅“模块”章节。

> info **提示** 由于 Nest 允许你以面向对象的方式设计和组织依赖关系，我们强烈建议遵循 [SOLID 原则](https://en.wikipedia.org/wiki/SOLID)。

#### 服务（Services）

让我们从创建一个简单的 `CatsService` 开始。该服务将负责数据的存储和检索，并被 `CatsController` 使用。鉴于其在管理应用逻辑中的角色，它非常适合被定义为一个提供者。

```typescript
@@filename(cats.service)
import { Injectable } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Cat) {
    this.cats.push(cat);
  }

  findAll(): Cat[] {
    return this.cats;
  }
}
@@switch
import { Injectable } from '@nestjs/common';

@Injectable()
export class CatsService {
  constructor() {
    this.cats = [];
  }

  create(cat) {
    this.cats.push(cat);
  }

  findAll() {
    return this.cats;
  }
}
```

> info **提示** 要使用 CLI 创建服务，只需执行命令 `$ nest g service cats`。

我们的 `CatsService` 是一个具有一个属性和两个方法的基础类。这里的关键添加是 `@Injectable()` 装饰器。这个装饰器将元数据附加到类上，表明 `CatsService` 是一个可以由 Nest [控制反转（IoC）](https://en.wikipedia.org/wiki/Inversion_of_control) 容器管理的类。

此外，这个例子还使用了 `Cat` 接口，它可能类似于这样：

```typescript
@@filename(interfaces/cat.interface)
export interface Cat {
  name: string;
  age: number;
  breed: string;
}
```

现在我们有了一个用于检索猫咪的服务类，让我们在 `CatsController` 中使用它：

```typescript
@@filename(cats.controller)
import { Controller, Get, Post, Body } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto';
import { CatsService } from './cats.service';
import { Cat } from './interfaces/cat.interface';

@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
@@switch
import { Controller, Get, Post, Body, Bind, Dependencies } from '@nestjs/common';
import { CatsService } from './cats.service';

@Controller('cats')
@Dependencies(CatsService)
export class CatsController {
  constructor(catsService) {
    this.catsService = catsService;
  }

  @Post()
  @Bind(Body())
  async create(createCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll() {
    return this.catsService.findAll();
  }
}
```

`CatsService` 通过类的构造函数被**注入**。注意 `private` 关键字的使用。这种简写方式让我们能够在同一行中声明并初始化 `catsService` 成员，从而简化流程。

#### 依赖注入

Nest 围绕**依赖注入**这一强大的设计模式构建。我们强烈建议阅读 [Angular 官方文档](https://angular.dev/guide/di)中关于这一概念的优秀文章。

在 Nest 中，得益于 TypeScript 的能力，管理依赖关系变得非常直接，因为它们是依据类型进行解析的。在下面的例子中，Nest 将通过创建并返回 `CatsService` 的实例来解析 `catsService`（或者，如果是单例，则返回已存在的实例，如果它已经在其他地方被请求过）。然后这个依赖项会被注入到控制器的构造函数中（或分配给指定的属性）：

```typescript
constructor(private catsService: CatsService) {}
```

#### 作用域（Scopes）

提供者通常具有与应用程序生命周期一致的生存期（“作用域”）。当应用程序启动时，每个依赖都必须被解析，这意味着每个提供者都会被实例化。同样地，当应用程序关闭时，所有提供者都会被销毁。然而，也可以使提供者具有**请求作用域**，即其生命周期与特定请求绑定，而非应用程序的生命周期。你可以在[注入作用域](/fundamentals/injection-scopes)章节了解更多关于这些技术的内容。

<app-banner-courses></app-banner-courses>

#### 自定义提供者

Nest 内置了一个控制反转（"IoC"）容器，用于管理提供者之间的关系。这一特性是依赖注入的基础，但实际上它的能力远超我们目前所涉及的范围。定义提供者有多种方式：可以使用普通值、类，以及异步或同步工厂。更多定义提供者的示例，请查看[依赖注入](/fundamentals/dependency-injection)章节。

#### 可选提供者

有时，你可能有一些并不总是需要被解析的依赖。例如，你的类可能依赖于一个**配置对象**，但如果未提供，则应使用默认值。在这种情况下，依赖被视为可选的，配置提供者的缺失不应导致错误。

要将提供者标记为可选，请在构造函数的签名中使用 `@Optional()` 装饰器。

```typescript
import { Injectable, Optional, Inject } from '@nestjs/common';

@Injectable()
export class HttpService<T> {
  constructor(@Optional() @Inject('HTTP_OPTIONS') private httpClient: T) {}
}
```

在上面的例子中，我们使用了一个自定义提供者，因此包含了 `HTTP_OPTIONS` 这个自定义**令牌**。之前的例子展示了基于构造函数的注入，其中依赖是通过构造函数中的类来指示的。有关自定义提供者及其关联令牌如何工作的更多细节，请查看[自定义提供者](/fundamentals/custom-providers)章节。

#### 基于属性的注入

我们目前使用的技术称为基于构造函数的注入，即提供者通过构造函数方法注入。在某些特定情况下，**基于属性的注入**可能很有用。例如，如果你的顶级类依赖于一个或多个提供者，通过 `super()` 在子类中一直传递它们可能会变得繁琐。为了避免这种情况，你可以直接在属性级别使用 `@Inject()` 装饰器。

```typescript
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class HttpService<T> {
  @Inject('HTTP_OPTIONS')
  private readonly httpClient: T;
}
```

> warning **警告** 如果你的类没有扩展其他类，通常最好使用**基于构造函数**的注入。构造函数清晰地指定了所需的依赖项，相比使用 `@Inject` 注解的类属性，提供了更好的可见性，并使代码更易于理解。

#### 提供者注册

现在我们已经定义了一个提供者（`CatsService`）和一个消费者（`CatsController`），我们需要将该服务注册到 Nest，以便它能够处理注入。这通过编辑模块文件（`app.module.ts`）并将服务添加到 `@Module()` 装饰器的 `providers` 数组中来完成。

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { CatsController } from './cats/cats.controller';
import { CatsService } from './cats/cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class AppModule {}
```

现在，Nest 将能够解析 `CatsController` 类的依赖关系。

此时，我们的目录结构应该如下所示：

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
<div class="item">cats.service.ts</div>
</div>
<div class="item">app.module.ts</div>
<div class="item">main.ts</div>
</div>
</div>

#### 手动实例化

到目前为止，我们已经介绍了 Nest 如何自动处理解析依赖关系的大部分细节。然而，在某些情况下，你可能需要跳出内置的依赖注入系统，手动获取或实例化提供者。下面简要讨论两种这样的技术。

- 要获取现有实例或动态实例化提供者，可以使用[模块引用](/fundamentals/module-ref)。
- 要在 `bootstrap()` 函数中获取提供者（例如，用于独立应用程序或在引导过程中使用配置服务），请查看[独立应用程序](/standalone-applications)。
