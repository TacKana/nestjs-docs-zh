### 管道

管道是一个带有 `@Injectable()` 装饰器的类，它实现了 `PipeTransform` 接口。

<figure>
  <img class="illustrative-image" src="/assets/Pipe_1.png" />
</figure>

管道有两种典型的应用场景：

- **转换**：将输入数据转换为期望的形式（例如，从字符串转换为整数）
- **验证**：评估输入数据，如果有效，则直接传递；否则，抛出异常

在这两种情况下，管道都对由<a href="controllers#route-parameters">控制器路由处理器</a>处理的 `arguments` 进行操作。Nest 在方法调用之前插入管道，管道接收传递给方法的参数并对它们进行操作。任何转换或验证操作都在此时进行，之后使用（可能）转换后的参数调用路由处理器。

Nest 自带了多个内置管道，你可以直接使用。你也可以构建自己的自定义管道。在本章中，我们将介绍内置管道，并展示如何将它们绑定到路由处理器。然后，我们将研究几个自定义构建的管道，以展示如何从头开始构建一个。

> info **提示** 管道在异常区域内运行。这意味着当管道抛出异常时，它会被异常层（全局异常过滤器和应用于当前上下文的任何[异常过滤器](/exception-filters)）处理。鉴于上述情况，应该清楚的是，当在管道中抛出异常时，后续不会执行控制器方法。这为你提供了一种最佳实践技术，用于在系统边界验证从外部来源进入应用程序的数据。

#### 内置管道

Nest 自带了几个开箱即用的管道：

- `ValidationPipe`
- `ParseIntPipe`
- `ParseFloatPipe`
- `ParseBoolPipe`
- `ParseArrayPipe`
- `ParseUUIDPipe`
- `ParseEnumPipe`
- `DefaultValuePipe`
- `ParseFilePipe`
- `ParseDatePipe`

它们从 `@nestjs/common` 包中导出。

让我们快速看一下如何使用 `ParseIntPipe`。这是一个**转换**用例的例子，管道确保方法处理器的参数被转换为 JavaScript 整数（如果转换失败则抛出异常）。在本章后面，我们将展示一个简单的 `ParseIntPipe` 自定义实现。下面的示例技术也适用于其他内置转换管道（`ParseBoolPipe`、`ParseFloatPipe`、`ParseEnumPipe`、`ParseArrayPipe`、`ParseDatePipe` 和 `ParseUUIDPipe`，在本章中我们将它们统称为 `Parse*` 管道）。

#### 绑定管道

要使用管道，我们需要将管道类的实例绑定到适当的上下文。在我们的 `ParseIntPipe` 示例中，我们希望将管道与特定的路由处理器方法关联，并确保在方法调用之前运行。我们使用以下结构来实现这一点，我们将其称为在方法参数级别绑定管道：

```typescript
@Get(':id')
async findOne(@Param('id', ParseIntPipe) id: number) {
  return this.catsService.findOne(id);
}
```

这确保以下两个条件之一为真：要么我们在 `findOne()` 方法中接收的参数是一个数字（正如我们在 `this.catsService.findOne()` 调用中所期望的），要么在调用路由处理器之前抛出异常。

例如，假设路由被这样调用：

```bash
GET localhost:3000/abc
```

Nest 将抛出类似这样的异常：

```json
{
  "statusCode": 400,
  "message": "Validation failed (numeric string is expected)",
  "error": "Bad Request"
}
```

该异常将阻止 `findOne()` 方法体的执行。

在上面的示例中，我们传递了一个类（`ParseIntPipe`），而不是一个实例，将实例化的责任留给框架，并启用依赖注入。与管道和守卫一样，我们也可以传递一个就地实例。如果我们想通过传递选项来自定义内置管道的行为，传递就地实例很有用：

```typescript
@Get(':id')
async findOne(
  @Param('id', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE }))
  id: number,
) {
  return this.catsService.findOne(id);
}
```

绑定其他转换管道（所有 **Parse\*** 管道）的工作原理类似。这些管道都在验证路由参数、查询字符串参数和请求体值的上下文中工作。

例如，使用查询字符串参数：

```typescript
@Get()
async findOne(@Query('id', ParseIntPipe) id: number) {
  return this.catsService.findOne(id);
}
```

这里有一个使用 `ParseUUIDPipe` 来解析字符串参数并验证它是否为 UUID 的示例。

```typescript
@@filename()
@Get(':uuid')
async findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
  return this.catsService.findOne(uuid);
}
@@switch
@Get(':uuid')
@Bind(Param('uuid', new ParseUUIDPipe()))
async findOne(uuid) {
  return this.catsService.findOne(uuid);
}
```

> info **提示** 当使用 `ParseUUIDPipe()` 时，你正在解析版本 3、4 或 5 的 UUID，如果你只需要特定版本的 UUID，可以在管道选项中传递版本。

上面我们已经看到了绑定各种 `Parse*` 系列内置管道的示例。绑定验证管道有点不同；我们将在下一节中讨论。

> info **提示** 另外，请参阅[验证技术](/techniques/validation)以获取验证管道的广泛示例。

#### 自定义管道

如前所述，你可以构建自己的自定义管道。虽然 Nest 提供了强大的内置 `ParseIntPipe` 和 `ValidationPipe`，但让我们从头开始构建每个的简单自定义版本，以了解如何构建自定义管道。

我们从简单的 `ValidationPipe` 开始。最初，我们将让它简单地接受一个输入值并立即返回相同的值，表现得像一个恒等函数。

```typescript
@@filename(validation.pipe)
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class ValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    return value;
  }
}
@@switch
import { Injectable } from '@nestjs/common';

@Injectable()
export class ValidationPipe {
  transform(value, metadata) {
    return value;
  }
}
```

> info **提示** `PipeTransform<T, R>` 是一个通用接口，任何管道都必须实现它。通用接口使用 `T` 表示输入 `value` 的类型，使用 `R` 表示 `transform()` 方法的返回类型。

每个管道都必须实现 `transform()` 方法来满足 `PipeTransform` 接口契约。该方法有两个参数：

- `value`
- `metadata`

`value` 参数是当前处理的方法参数（在路由处理方法接收之前），`metadata` 是当前处理的方法参数的元数据。元数据对象具有以下属性：

```typescript
export interface ArgumentMetadata {
  type: 'body' | 'query' | 'param' | 'custom';
  metatype?: Type<unknown>;
  data?: string;
}
```

这些属性描述了当前处理的参数。

<table>
  <tr>
    <td>
      <code>type</code>
    </td>
    <td>指示参数是 body
      <code>@Body()</code>、query
      <code>@Query()</code>、param
      <code>@Param()</code>，还是自定义参数（阅读更多
      <a routerLink="/custom-decorators">这里</a>）。</td>
  </tr>
  <tr>
    <td>
      <code>metatype</code>
    </td>
    <td>
      提供参数的元类型，例如，
      <code>String</code>。注意：如果你在路由处理器方法签名中省略类型声明，或者使用原生 JavaScript，则该值为
      <code>undefined</code>。
    </td>
  </tr>
  <tr>
    <td>
      <code>data</code>
    </td>
    <td>传递给装饰器的字符串，例如
      <code>@Body('string')</code>。如果你将装饰器括号留空，则为
      <code>undefined</code>。</td>
  </tr>
</table>

> warning **警告** TypeScript 接口在转译过程中会消失。因此，如果方法参数的类型声明为接口而不是类，则 `metatype` 值将为 `Object`。

#### 基于模式的验证

让我们让我们的验证管道更有用。仔细看看 `CatsController` 的 `create()` 方法，我们可能希望在尝试运行我们的服务方法之前确保 post body 对象是有效的。

```typescript
@@filename()
@Post()
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
@@switch
@Post()
async create(@Body() createCatDto) {
  this.catsService.create(createCatDto);
}
```

让我们专注于 `createCatDto` body 参数。它的类型是 `CreateCatDto`：

```typescript
@@filename(create-cat.dto)
export class CreateCatDto {
  name: string;
  age: number;
  breed: string;
}
```

我们希望确保对 create 方法的任何传入请求都包含有效的 body。因此，我们必须验证 `createCatDto` 对象的三个成员。我们可以在路由处理器方法内部进行验证，但这样做并不理想，因为它会违反**单一职责原则**（SRP）。

另一种方法可能是创建一个**验证器类**并将任务委托给它。这样做的缺点是我们必须记住在每个方法的开头调用这个验证器。

创建验证中间件怎么样？这可能有效，但不幸的是，不可能创建**通用中间件**，可以在整个应用程序的所有上下文中使用。这是因为中间件不知道**执行上下文**，包括将被调用的处理器及其任何参数。

这当然正是管道设计的用例。所以让我们继续完善我们的验证管道。

<app-banner-courses></app-banner-courses>

#### 对象模式验证

有几种方法可以以干净、[DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) 的方式执行对象验证。一种常见的方法是使用**基于模式**的验证。让我们继续尝试这种方法。

[Zod](https://zod.dev/) 库允许你以直接的方式创建模式，具有可读的 API。让我们构建一个利用基于 Zod 的模式验证管道。

首先安装所需的包：

```bash
$ npm install --save zod
```

在下面的代码示例中，我们创建了一个简单的类，它将一个模式作为 `constructor` 参数。然后我们应用 `schema.parse()` 方法，该方法根据提供的模式验证我们的传入参数。

如前所述，**验证管道**要么返回未更改的值，要么抛出异常。

在下一节中，你将看到如何使用 `@UsePipes()` 装饰器为给定控制器方法提供适当的模式。这样做使我们的验证管道可以在上下文中重用，正如我们最初设定的那样。

```typescript
@@filename()
import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema  } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      throw new BadRequestException('Validation failed');
    }
  }
}
@@switch
import { BadRequestException } from '@nestjs/common';

export class ZodValidationPipe {
  constructor(private schema) {}

  transform(value, metadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      throw new BadRequestException('Validation failed');
    }
  }
}

```

#### 绑定验证管道

之前，我们看到了如何绑定转换管道（如 `ParseIntPipe` 和其余的 `Parse*` 管道）。

绑定验证管道也非常简单。

在这种情况下，我们希望将管道绑定到方法调用级别。在我们当前的示例中，我们需要执行以下操作来使用 `ZodValidationPipe`：

1. 创建 `ZodValidationPipe` 的实例
2. 在管道的类构造函数中传递上下文特定的 Zod 模式
3. 将管道绑定到方法

Zod 模式示例：

```typescript
import { z } from 'zod';

export const createCatSchema = z
  .object({
    name: z.string(),
    age: z.number(),
    breed: z.string(),
  })
  .required();

export type CreateCatDto = z.infer<typeof createCatSchema>;
```

我们使用 `@UsePipes()` 装饰器来实现这一点，如下所示：

```typescript
@@filename(cats.controller)
@Post()
@UsePipes(new ZodValidationPipe(createCatSchema))
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
@@switch
@Post()
@Bind(Body())
@UsePipes(new ZodValidationPipe(createCatSchema))
async create(createCatDto) {
  this.catsService.create(createCatDto);
}
```

> info **提示** `@UsePipes()` 装饰器是从 `@nestjs/common` 包导入的。

> warning **警告** `zod` 库要求在你的 `tsconfig.json` 文件中启用 `strictNullChecks` 配置。

#### 类验证器

> warning **警告** 本节中的技术需要 TypeScript，如果你的应用程序是使用原生 JavaScript 编写的，则不可用。

让我们看看验证技术的另一种实现。

Nest 与 [class-validator](https://github.com/typestack/class-validator) 库配合得很好。这个强大的库允许你使用基于装饰器的验证。基于装饰器的验证非常强大，特别是与 Nest 的**管道**功能结合使用时，因为我们可以访问被处理属性的 `metatype`。在开始之前，我们需要安装所需的包：

```bash
$ npm i --save class-validator class-transformer
```

安装完成后，我们可以向 `CreateCatDto` 类添加一些装饰器。在这里，我们看到了这种技术的一个显著优势：`CreateCatDto` 类仍然是我们的 Post body 对象的单一事实来源（而不是必须创建单独的验证类）。

```typescript
@@filename(create-cat.dto)
import { IsString, IsInt } from 'class-validator';

export class CreateCatDto {
  @IsString()
  name: string;

  @IsInt()
  age: number;

  @IsString()
  breed: string;
}
```

> info **提示** 阅读更多关于 class-validator 装饰器的信息[这里](https://github.com/typestack/class-validator#usage)。

现在我们可以创建一个使用这些注解的 `ValidationPipe` 类。

```typescript
@@filename(validation.pipe)
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToInstance(metatype, value);
    const errors = await validate(object);
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed');
    }
    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
```

> info **提示** 提醒一下，你不必自己构建通用验证管道，因为 `ValidationPipe` 由 Nest 开箱即用提供。内置的 `ValidationPipe` 提供了比我们在本章中构建的示例更多的选项，为了说明自定义构建管道的机制，该示例保持了基础性。你可以找到完整的详细信息以及大量示例[这里](/techniques/validation)。

> warning **注意** 我们在上面使用了 [class-transformer](https://github.com/typestack/class-transformer) 库，它是由**class-validator**库的同一作者制作的，因此它们配合得非常好。

让我们仔细阅读这段代码。首先，注意 `transform()` 方法被标记为 `async`。这是可能的，因为 Nest 支持同步和**异步**管道。我们使这个方法 `async` 是因为一些 class-validator 验证[可以是异步的](https://github.com/typestack/class-validator#custom-validation-classes)（利用 Promises）。

接下来注意，我们使用解构从 `ArgumentMetadata` 中提取 metatype 字段（仅从此成员中提取）到我们的 `metatype` 参数中。这只是获取完整 `ArgumentMetadata` 然后使用附加语句分配 metatype 变量的简写。

接下来，注意辅助函数 `toValidate()`。它负责在当前正在处理的参数是原生 JavaScript 类型时绕过验证步骤（这些类型不能附加验证装饰器，因此没有理由运行它们通过验证步骤）。

接下来，我们使用 class-transformer 函数 `plainToInstance()` 将我们的原生 JavaScript 参数对象转换为类型化对象，以便我们可以应用验证。我们必须这样做的原因是，当从网络请求反序列化时，传入的 post body 对象**没有任何类型信息**（这是底层平台，如 Express，的工作方式）。Class-validator 需要使用我们之前为 DTO 定义的验证装饰器，因此我们需要执行此转换，将传入的 body 视为适当装饰的对象，而不仅仅是普通原生对象。

最后，如前所述，由于这是一个**验证管道**，它要么返回未更改的值，要么抛出异常。

最后一步是绑定 `ValidationPipe`。管道可以是参数范围的、方法范围的、控制器范围的或全局范围的。之前，使用基于 Zod 的验证管道，我们看到了在方法级别绑定管道的示例。
在下面的示例中，我们将管道实例绑定到路由处理器的 `@Body()` 装饰器，以便调用我们的管道来验证 post body。

```typescript
@@filename(cats.controller)
@Post()
async create(
  @Body(new ValidationPipe()) createCatDto: CreateCatDto,
) {
  this.catsService.create(createCatDto);
}
```

当验证逻辑仅涉及一个指定参数时，参数范围的管道很有用。

#### 全局范围的管道

由于 `ValidationPipe` 被创建为尽可能通用，我们可以通过将其设置为**全局范围**的管道来实现其全部效用，以便它应用于整个应用程序中的每个路由处理器。

```typescript
@@filename(main)
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

> warning **注意** 在<a href="faq/hybrid-application">混合应用</a>的情况下，`useGlobalPipes()` 方法不会为网关和微服务设置管道。对于“标准”（非混合）微服务应用，`useGlobalPipes()` 确实会全局挂载管道。

全局管道用于整个应用程序，用于每个控制器和每个路由处理器。

请注意，在依赖注入方面，从任何模块外部注册的全局管道（如上例中的 `useGlobalPipes()`）无法注入依赖项，因为绑定是在任何模块的上下文之外完成的。为了解决这个问题，你可以使用以下结构**直接从任何模块**设置全局管道：

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
```

> info **提示** 当使用这种方法为管道执行依赖注入时，请注意，无论此结构在哪个模块中使用，管道实际上都是全局的。应该在哪里完成？选择定义管道（上例中的 `ValidationPipe`）的模块。此外，`useClass` 不是处理自定义提供者注册的唯一方法。了解更多[这里](/fundamentals/custom-providers)。

#### 内置的 ValidationPipe

提醒一下，你不必自己构建通用验证管道，因为 `ValidationPipe` 由 Nest 开箱即用提供。内置的 `ValidationPipe` 提供了比我们在本章中构建的示例更多的选项，为了说明自定义构建管道的机制，该示例保持了基础性。你可以找到完整的详细信息以及大量示例[这里](/techniques/validation)。

#### 转换用例

验证不是自定义管道的唯一用例。在本章开头，我们提到管道还可以**转换**输入数据为所需格式。这是可能的，因为从 `transform` 函数返回的值完全覆盖了参数的先前值。

这什么时候有用？考虑有时从客户端传递的数据需要进行一些更改——例如将字符串转换为整数——然后才能由路由处理器方法正确处理。此外，一些必需的数据字段可能缺失，我们希望应用默认值。**转换管道**可以通过在客户端请求和请求处理器之间插入处理函数来执行这些功能。

这里有一个简单的 `ParseIntPipe`，它负责将字符串解析为整数值。（如上所述，Nest 有一个更复杂的内置 `ParseIntPipe`；我们将其作为一个简单的自定义转换管道示例包含在内）。

```typescript
@@filename(parse-int.pipe)
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException('Validation failed');
    }
    return val;
  }
}
@@switch
import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIntPipe {
  transform(value, metadata) {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException('Validation failed');
    }
    return val;
  }
}
```

然后我们可以将这个管道绑定到选定的参数，如下所示：

```typescript
@@filename()
@Get(':id')
async findOne(@Param('id', new ParseIntPipe()) id) {
  return this.catsService.findOne(id);
}
@@switch
@Get(':id')
@Bind(Param('id', new ParseIntPipe()))
async findOne(id) {
  return this.catsService.findOne(id);
}
```

另一个有用的转换案例是使用请求中提供的 id 从数据库中选择一个**现有用户**实体：

```typescript
@@filename()
@Get(':id')
findOne(@Param('id', UserByIdPipe) userEntity: UserEntity) {
  return userEntity;
}
@@switch
@Get(':id')
@Bind(Param('id', UserByIdPipe))
findOne(userEntity) {
  return userEntity;
}
```

我们将此管道的实现留给读者，但请注意，与所有其他转换管道一样，它接收一个输入值（一个 `id`）并返回一个输出值（一个 `UserEntity` 对象）。这可以通过将样板代码从处理器抽象到公共管道中，使你的代码更具声明性和 [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)。

#### 提供默认值

`Parse*` 管道期望参数的值被定义。它们在接收到 `null` 或 `undefined` 值时抛出异常。为了允许端点处理缺失的查询字符串参数值，我们必须在 `Parse*` 管道对这些值进行操作之前提供一个要注入的默认值。`DefaultValuePipe` 就是为此服务的。只需在 `@Query()` 装饰器中实例化一个 `DefaultValuePipe`，然后在相关的 `Parse*` 管道之前，如下所示：

```typescript
@@filename()
@Get()
async findAll(
  @Query('activeOnly', new DefaultValuePipe(false), ParseBoolPipe) activeOnly: boolean,
  @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
) {
  return this.catsService.findAll({ activeOnly, page });
}
```