### 控制器

控制器负责处理传入的**请求**并将**响应**发送回客户端。

<figure><img class="illustrative-image" src="/assets/Controllers_1.png" /></figure>

控制器的目的是处理应用程序的特定请求。**路由**机制决定了哪个控制器将处理每个请求。通常，一个控制器有多个路由，每个路由可以执行不同的操作。

为了创建一个基本的控制器，我们使用类和**装饰器**。装饰器将类与必要的元数据链接起来，使 Nest 能够创建一个路由映射，将请求连接到其对应的控制器。

> info **提示** 要快速创建一个带有内置[验证](/techniques/validation)的 CRUD 控制器，你可以使用 CLI 的 [CRUD 生成器](/recipes/crud-generator#crud-generator)：`nest g resource [name]`。

#### 路由

在下面的示例中，我们将使用 `@Controller()` 装饰器，这是定义一个基本控制器**必须的**。我们将指定一个可选的路径前缀 `cats`。在 `@Controller()` 装饰器中使用路径前缀有助于将相关的路由分组在一起，并减少重复的代码。例如，如果我们想要将与猫实体相关的路由分组到 `/cats` 路径下，我们可以在 `@Controller()` 装饰器中指定 `cats` 路径前缀。这样，我们就不需要为文件中的每个路由重复该路径部分。

```typescript
@@filename(cats.controller)
import { Controller, Get } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Get()
  findAll(): string {
    return 'This action returns all cats';
  }
}
@@switch
import { Controller, Get } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Get()
  findAll() {
    return 'This action returns all cats';
  }
}
```

> info **提示** 要使用 CLI 创建一个控制器，只需执行 `$ nest g controller [name]` 命令。

放置在 `findAll()` 方法之前的 `@Get()` HTTP 请求方法装饰器告诉 Nest 为 HTTP 请求创建一个特定端点的处理程序。这个端点由 HTTP 请求方法（本例中为 GET）和路由路径定义。那么，什么是路由路径？处理程序的路由路径由控制器的（可选）前缀和方法的装饰器中指定的任何路径组合而成。由于我们已经为每个路由设置了前缀（`cats`），并且没有在方法装饰器中添加任何特定路径，Nest 会将 `GET /cats` 请求映射到这个处理程序。

如前所述，路由路径包括可选的控制器路径前缀**和**方法装饰器中指定的任何路径字符串。例如，如果控制器前缀是 `cats`，方法装饰器是 `@Get('breed')`，那么结果路由将是 `GET /cats/breed`。

在我们上面的示例中，当向这个端点发出 GET 请求时，Nest 将请求路由到用户定义的 `findAll()` 方法。注意，我们在这里选择的方法名是完全任意的。虽然我们必须声明一个方法来绑定路由，但 Nest 并不重视方法名。

该方法将返回一个 200 状态码以及相关的响应，本例中只是一个字符串。为什么会这样？为了解释，我们首先需要介绍 Nest 使用两种**不同的**选项来操作响应：

<table>
  <tr>
    <td>标准（推荐）</td>
    <td>
      使用这种内置方法，当请求处理程序返回一个 JavaScript 对象或数组时，它将<strong>自动</strong>被序列化为 JSON。然而，当它返回一个 JavaScript 原始类型（例如，<code>string</code>、<code>number</code>、<code>boolean</code>）时，Nest 将只发送该值而不尝试序列化。这使得响应处理变得简单：只需返回值，Nest 会处理其余部分。
      <br />
      <br /> 此外，响应的<strong>状态码</strong>默认始终为 200，除了使用 201 的 POST 请求。我们可以通过在处理程序级别添加 <code>@HttpCode(...)</code> 装饰器轻松更改此行为（参见 <a href='controllers#status-code'>状态码</a>）。
    </td>
  </tr>
  <tr>
    <td>库特定方式</td>
    <td>
      我们可以使用库特定的（例如，Express）<a href="https://expressjs.com/en/api.html#res" rel="nofollow" target="_blank">响应对象</a>，可以通过在处理程序签名中使用 <code>@Res()</code> 装饰器注入（例如，<code>findAll(@Res() response)</code>）。使用这种方法，你可以使用该对象暴露的原生响应处理方法。例如，使用 Express，你可以使用类似 <code>response.status(200).send()</code> 的代码构建响应。
    </td>
  </tr>
</table>

> warning **警告** Nest 检测处理程序是否使用了 `@Res()` 或 `@Next()`，表明你选择了库特定方式。如果同时使用两种方法，标准方式将**自动禁用**此单个路由，并且不再按预期工作。要同时使用两种方法（例如，通过注入响应对象仅设置 cookie/headers，但将其余部分留给框架），你必须在 `@Res({{ '{' }} passthrough: true {{ '}' }})` 装饰器中将 `passthrough` 选项设置为 `true`。

<app-banner-devtools></app-banner-devtools>

#### 请求对象

处理程序通常需要访问客户端的**请求**详细信息。Nest 提供了对底层平台（默认为 Express）的[请求对象](https://expressjs.com/en/api.html#req)的访问。你可以通过在处理程序的签名中使用 `@Req()` 装饰器指示 Nest 注入请求对象来访问它。

```typescript
@@filename(cats.controller)
import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('cats')
export class CatsController {
  @Get()
  findAll(@Req() request: Request): string {
    return 'This action returns all cats';
  }
}
@@switch
import { Controller, Bind, Get, Req } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Get()
  @Bind(Req())
  findAll(request) {
    return 'This action returns all cats';
  }
}
```

> info **提示** 要利用 `express` 的类型（如上面的 `request: Request` 参数示例），请确保安装 `@types/express` 包。

请求对象表示 HTTP 请求，包含查询字符串、参数、HTTP 标头和正文的属性（更多信息[在此](https://expressjs.com/en/api.html#req)）。在大多数情况下，你不需要手动访问这些属性。相反，你可以使用现成的专用装饰器，如 `@Body()` 或 `@Query()`。以下是提供的装饰器及其对应的平台特定对象的列表。

<table>
  <tbody>
    <tr>
      <td><code>@Request(), @Req()</code></td>
      <td><code>req</code></td></tr>
    <tr>
      <td><code>@Response(), @Res()</code><span class="table-code-asterisk">*</span></td>
      <td><code>res</code></td>
    </tr>
    <tr>
      <td><code>@Next()</code></td>
      <td><code>next</code></td>
    </tr>
    <tr>
      <td><code>@Session()</code></td>
      <td><code>req.session</code></td>
    </tr>
    <tr>
      <td><code>@Param(key?: string)</code></td>
      <td><code>req.params</code> / <code>req.params[key]</code></td>
    </tr>
    <tr>
      <td><code>@Body(key?: string)</code></td>
      <td><code>req.body</code> / <code>req.body[key]</code></td>
    </tr>
    <tr>
      <td><code>@Query(key?: string)</code></td>
      <td><code>req.query</code> / <code>req.query[key]</code></td>
    </tr>
    <tr>
      <td><code>@Headers(name?: string)</code></td>
      <td><code>req.headers</code> / <code>req.headers[name]</code></td>
    </tr>
    <tr>
      <td><code>@Ip()</code></td>
      <td><code>req.ip</code></td>
    </tr>
    <tr>
      <td><code>@HostParam()</code></td>
      <td><code>req.hosts</code></td>
    </tr>
  </tbody>
</table>

<sup>\* </sup>为了与底层 HTTP 平台（例如，Express 和 Fastify）的类型兼容，Nest 提供了 `@Res()` 和 `@Response()` 装饰器。`@Res()` 是 `@Response()` 的别名。两者都直接暴露底层原生平台 `response` 对象接口。使用它们时，你还应导入底层库的类型（例如，`@types/express`）以充分利用。注意，当你在方法处理程序中注入 `@Res()` 或 `@Response()` 时，你将该处理程序置于**库特定模式**，并且你负责管理响应。这样做时，你必须通过调用 `response` 对象（例如，`res.json(...)` 或 `res.send(...)`）发出某种响应，否则 HTTP 服务器将挂起。

> info **提示** 要了解如何创建自己的自定义装饰器，请访问[本章](/custom-decorators)。

#### 资源

之前，我们定义了一个端点来获取猫资源（**GET** 路由）。我们通常还希望提供一个创建新记录的端点。为此，让我们创建 **POST** 处理程序：

```typescript
@@filename(cats.controller)
import { Controller, Get, Post } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Post()
  create(): string {
    return 'This action adds a new cat';
  }

  @Get()
  findAll(): string {
    return 'This action returns all cats';
  }
}
@@switch
import { Controller, Get, Post } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Post()
  create() {
    return 'This action adds a new cat';
  }

  @Get()
  findAll() {
    return 'This action returns all cats';
  }
}
```

就这么简单。Nest 为所有标准 HTTP 方法提供装饰器：`@Get()`、`@Post()`、`@Put()`、`@Delete()`、`@Patch()`、`@Options()` 和 `@Head()`。此外，`@All()` 定义一个处理所有这些方法的端点。

#### 路由通配符

NestJS 也支持基于模式的路由。例如，星号（`*`）可以用作通配符，匹配路径末尾的任何字符组合。在以下示例中，`findAll()` 方法将为任何以 `abcd/` 开头的路由执行，无论后面跟有多少字符。

```typescript
@Get('abcd/*')
findAll() {
  return 'This route uses a wildcard';
}
```

`'abcd/*'` 路由路径将匹配 `abcd/`、`abcd/123`、`abcd/abc` 等。连字符（ `-`）和点（`.`）在基于字符串的路径中被字面解释。

这种方法在 Express 和 Fastify 上都有效。然而，随着 Express 的最新版本（v5）的发布，路由系统变得更加严格。在纯 Express 中，你必须使用命名通配符才能使路由工作——例如，`abcd/*splat`，其中 `splat` 只是通配符参数的名称，没有特殊含义。你可以随意命名它。也就是说，由于 Nest 为 Express 提供了兼容层，你仍然可以使用星号（`*`）作为通配符。

当涉及到**路由中间**使用的星号时，Express 需要命名通配符（例如，`ab{{ '{' }}*splat&#125;cd`），而 Fastify 根本不支持它们。

#### 状态码

如前所述，响应的默认**状态码**始终为 **200**，除了默认使用 **201** 的 POST 请求。你可以通过在处理程序级别使用 `@HttpCode(...)` 装饰器轻松更改此行为。

```typescript
@Post()
@HttpCode(204)
create() {
  return 'This action adds a new cat';
}
```

> info **提示** 从 `@nestjs/common` 包导入 `HttpCode`。

通常，你的状态码不是静态的，而是取决于各种因素。在这种情况下，你可以使用库特定的**响应**（通过 `@Res()` 注入）对象（或者，在错误的情况下，抛出异常）。

#### 响应头

要指定自定义响应头，你可以使用 `@Header()` 装饰器或库特定的响应对象（并直接调用 `res.header()`）。

```typescript
@Post()
@Header('Cache-Control', 'no-store')
create() {
  return 'This action adds a new cat';
}
```

> info **提示** 从 `@nestjs/common` 包导入 `Header`。

#### 重定向

要将响应重定向到特定 URL，你可以使用 `@Redirect()` 装饰器或库特定的响应对象（并直接调用 `res.redirect()`）。

`@Redirect()` 接受两个参数，`url` 和 `statusCode`，两者都是可选的。如果省略，`statusCode` 的默认值为 `302`（`Found`）。

```typescript
@Get()
@Redirect('https://nestjs.com', 301)
```

> info **提示** 有时你可能希望动态确定 HTTP 状态码或重定向 URL。通过返回一个遵循 `HttpRedirectResponse` 接口（来自 `@nestjs/common`）的对象来实现这一点。

返回的值将覆盖传递给 `@Redirect()` 装饰器的任何参数。例如：

```typescript
@Get('docs')
@Redirect('https://docs.nestjs.com', 302)
getDocs(@Query('version') version) {
  if (version && version === '5') {
    return { url: '/v5/' };
  }
}
```

#### 路由参数

当你需要接受**动态数据**作为请求的一部分时（例如，`GET /cats/1` 获取 id 为 `1` 的猫），具有静态路径的路由将不起作用。要定义带参数的路由，你可以在路由路径中添加路由参数**标记**以从 URL 捕获动态值。下面 `@Get()` 装饰器示例中的路由参数标记说明了这种方法。然后可以使用 `@Param()` 装饰器访问这些路由参数，该装饰器应添加到方法签名中。

> info **提示** 带参数的路由应在任何静态路径之后声明。这可以防止参数化路径拦截发往静态路径的流量。

```typescript
@@filename()
@Get(':id')
findOne(@Param() params: any): string {
  console.log(params.id);
  return `This action returns a #${params.id} cat`;
}
@@switch
@Get(':id')
@Bind(Param())
findOne(params) {
  console.log(params.id);
  return `This action returns a #${params.id} cat`;
}
```

`@Param()` 装饰器用于装饰方法参数（上例中的 `params`），使**路由**参数可作为该装饰方法参数的属性在方法内部访问。如代码所示，你可以通过引用 `params.id` 访问 `id` 参数。或者，你可以将特定参数标记传递给装饰器，并在方法体内直接按名称引用路由参数。

> info **提示** 从 `@nestjs/common` 包导入 `Param`。

```typescript
@@filename()
@Get(':id')
findOne(@Param('id') id: string): string {
  return `This action returns a #${id} cat`;
}
@@switch
@Get(':id')
@Bind(Param('id'))
findOne(id) {
  return `This action returns a #${id} cat`;
}
```

#### 子域路由

`@Controller` 装饰器可以接受一个 `host` 选项，要求传入请求的 HTTP 主机匹配某个特定值。

```typescript
@Controller({ host: 'admin.example.com' })
export class AdminController {
  @Get()
  index(): string {
    return 'Admin page';
  }
}
```

> warning **警告** 由于 **Fastify** 不支持嵌套路由器，如果你使用子域路由，建议改用默认的 Express 适配器。

类似于路由 `path`，`host` 选项可以使用标记来捕获主机名中该位置的动态值。下面 `@Controller()` 装饰器示例中的主机参数标记演示了这种用法。以这种方式声明的主机参数可以使用 `@HostParam()` 装饰器访问，该装饰器应添加到方法签名中。

```typescript
@Controller({ host: ':account.example.com' })
export class AccountController {
  @Get()
  getInfo(@HostParam('account') account: string) {
    return account;
  }
}
```

#### 状态共享

对于来自其他编程语言的开发者来说，了解在 Nest 中几乎所有内容都在传入请求之间共享可能会令人惊讶。这包括数据库连接池、具有全局状态的单例服务等资源。重要的是要理解 Node.js 不使用请求/响应的多线程无状态模型，其中每个请求由单独的线程处理。因此，在 Nest 中使用单例实例对我们的应用程序完全**安全**。

也就是说，存在特定的边缘情况，其中可能需要基于请求的生命周期控制器。例如，GraphQL 应用程序中的每个请求缓存、请求跟踪或实现多租户。你可以了解更多关于控制注入范围的信息[在此](/fundamentals/injection-scopes)。

#### 异步性

我们喜欢现代 JavaScript，尤其是其对**异步**数据处理的重视。这就是为什么 Nest 完全支持 `async` 函数。每个 `async` 函数必须返回一个 `Promise`，这允许你返回一个延迟值，Nest 可以自动解析。这是一个例子：

```typescript
@@filename(cats.controller)
@Get()
async findAll(): Promise<any[]> {
  return [];
}
@@switch
@Get()
async findAll() {
  return [];
}
```

这段代码完全有效。但 Nest 更进一步，允许路由处理程序返回 RxJS [可观察流](https://rxjs-dev.firebaseapp.com/guide/observable)作为响应。Nest 将在内部处理订阅，并在流完成时解析最终发出的值。

```typescript
@@filename(cats.controller)
@Get()
findAll(): Observable<any[]> {
  return of([]);
}
@@switch
@Get()
findAll() {
  return of([]);
}
```

两种方法都有效，你可以选择最适合你需求的方法。

#### 请求负载

在我们之前的示例中，POST 路由处理程序不接受任何客户端参数。让我们通过添加 `@Body()` 装饰器来解决这个问题。

在我们继续之前（如果你使用 TypeScript），我们需要定义 **DTO**（数据传输对象）模式。DTO 是一个对象，指定数据应如何通过网络发送。我们可以使用 **TypeScript** 接口或简单类定义 DTO 模式。然而，我们在这里推荐使用**类**。为什么？类是 JavaScript ES6 标准的一部分，因此它们在编译后的 JavaScript 中保持为真实实体。相比之下，TypeScript 接口在转译期间被移除，意味着 Nest 在运行时无法引用它们。这很重要，因为像 **Pipes** 这样的功能依赖于在运行时访问变量的元类型，而这只有类才可能。

让我们创建 `CreateCatDto` 类：

```typescript
@@filename(create-cat.dto)
export class CreateCatDto {
  name: string;
  age: number;
  breed: string;
}
```

它只有三个基本属性。之后我们可以在 `CatsController` 中使用新创建的 DTO：

```typescript
@@filename(cats.controller)
@Post()
async create(@Body() createCatDto: CreateCatDto) {
  return 'This action adds a new cat';
}
@@switch
@Post()
@Bind(Body())
async create(createCatDto) {
  return 'This action adds a new cat';
}
```

> info **提示** 我们的 `ValidationPipe` 可以过滤掉不应由方法处理程序接收的属性。在这种情况下，我们可以将可接受的属性列入白名单，任何未包含在白名单中的属性都会自动从结果对象中剥离。在 `CreateCatDto` 示例中，我们的白名单是 `name`、`age` 和 `breed` 属性。了解更多[在此](/techniques/validation#stripping-properties)。

#### 查询参数

当处理路由中的查询参数时，你可以使用 `@Query()` 装饰器从传入请求中提取它们。让我们看看这在实践中是如何工作的。

考虑一个路由，我们希望根据查询参数（如 `age` 和 `breed`）过滤猫列表。首先，在 `CatsController` 中定义查询参数：

```typescript
@@filename(cats.controller)
@Get()
async findAll(@Query('age') age: number, @Query('breed') breed: string) {
  return `This action returns all cats filtered by age: ${age} and breed: ${breed}`;
}
```

在此示例中，`@Query()` 装饰器用于从查询字符串中提取 `age` 和 `breed` 的值。例如，请求：

```plaintext
GET /cats?age=2&breed=Persian
```

将导致 `age` 为 `2`，`breed` 为 `Persian`。

如果你的应用程序需要处理更复杂的查询参数，例如嵌套对象或数组：

```plaintext
?filter[where][name]=John&filter[where][age]=30
?item[]=1&item[]=2
```

你需要配置你的 HTTP 适配器（Express 或 Fastify）以使用适当的查询解析器。在 Express 中，你可以使用 `extended` 解析器，它允许丰富的查询对象：

```typescript
const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.set('query parser', 'extended');
```

在 Fastify 中，你可以使用 `querystringParser` 选项：

```typescript
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({
    querystringParser: (str) => qs.parse(str),
  }),
);
```

> info **提示** `qs` 是一个支持嵌套和数组的查询字符串解析器。你可以使用 `npm install qs` 安装它。

#### 处理错误

有一个关于处理错误（即处理异常）的单独章节[在此](/exception-filters)。

#### 完整资源示例

下面是一个示例，演示了使用几个可用的装饰器来创建一个基本控制器。该控制器提供了一些方法来访问和操作内部数据。

```typescript
@@filename(cats.controller)
import { Controller, Get, Query, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { CreateCatDto, UpdateCatDto, ListAllEntities } from './dto';

@Controller('cats')
export class CatsController {
  @Post()
  create(@Body() createCatDto: CreateCatDto) {
    return 'This action adds a new cat';
  }

  @Get()
  findAll(@Query() query: ListAllEntities) {
    return `This action returns all cats (limit: ${query.limit} items)`;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return `This action returns a #${id} cat`;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto) {
    return `This action updates a #${id} cat`;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return `This action removes a #${id} cat`;
  }
}
@@switch
import { Controller, Get, Query, Post, Body, Put, Param, Delete, Bind } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Post()
  @Bind(Body())
  create(createCatDto) {
    return 'This action adds a new cat';
  }

  @Get()
  @Bind(Query())
  findAll(query) {
    console.log(query);
    return `This action returns all cats (limit: ${query.limit} items)`;
  }

  @Get(':id')
  @Bind(Param('id'))
  findOne(id) {
    return `This action returns a #${id} cat`;
  }

  @Put(':id')
  @Bind(Param('id'), Body())
  update(id, updateCatDto) {
    return `This action updates a #${id} cat`;
  }

  @Delete(':id')
  @Bind(Param('id'))
  remove(id) {
    return 'This action removes a #${id} cat';
  }
}
```

> info **提示** Nest CLI 提供了一个生成器（原理图），可以自动创建**所有样板代码**，节省你手动操作的时间，并提高整体开发体验。了解更多关于此功能的信息[在此](/recipes/crud-generator)。

#### 启动和运行

即使 `CatsController` 完全定义，Nest 还不知道它，也不会自动创建该类的实例。

控制器必须始终是模块的一部分，这就是为什么我们在 `@Module()` 装饰器中包含 `controllers` 数组。由于我们还没有定义除根 `AppModule` 之外的任何其他模块，我们将使用它来注册 `CatsController`：

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { CatsController } from './cats/cats.controller';

@Module({
  controllers: [CatsController],
})
export class AppModule {}
```

我们使用 `@Module()` 装饰器将元数据附加到模块类，现在 Nest 可以轻松确定需要挂载哪些控制器。

#### 库特定方式

到目前为止，我们已经介绍了 Nest 操作响应的标准方式。另一种方法是使用库特定的[响应对象](https://expressjs.com/en/api.html#res)。要注入特定的响应对象，我们可以使用 `@Res()` 装饰器。为了突出差异，让我们像这样重写 `CatsController`：

```typescript
@@filename()
import { Controller, Get, Post, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Controller('cats')
export class CatsController {
  @Post()
  create(@Res() res: Response) {
    res.status(HttpStatus.CREATED).send();
  }

  @Get()
  findAll(@Res() res: Response) {
     res.status(HttpStatus.OK).json([]);
  }
}
@@switch
import { Controller, Get, Post, Bind, Res, Body, HttpStatus } from '@nestjs/common';

@Controller('cats')
export CatsController {
  @Post()
  @Bind(Res(), Body())
  create(res, createCatDto) {
    res.status(HttpStatus.CREATED).send();
  }

  @Get()
  @Bind(Res())
  findAll(res) {
     res.status(HttpStatus.OK).json([]);
  }
}
```

虽然这种方法有效并通过提供对响应对象的完全控制（例如标头操作和访问库特定功能）提供了更大的灵活性，但应谨慎使用。通常，这种方法不太清晰，并且有一些缺点。主要缺点是您的代码变得依赖于平台，因为不同的底层库可能对响应对象有不同的 API。此外，它可能使测试更加困难，因为您需要模拟响应对象，等等。

此外，通过使用这种方法，您失去了与依赖于标准响应处理的 Nest 功能的兼容性，例如拦截器和 `@HttpCode()` / `@Header()` 装饰器。为了解决这个问题，您可以像这样启用 `passthrough` 选项：

```typescript
@@filename()
@Get()
findAll(@Res({ passthrough: true }) res: Response) {
  res.status(HttpStatus.OK);
  return [];
}
@@switch
@Get()
@Bind(Res({ passthrough: true }))
findAll(res) {
  res.status(HttpStatus.OK);
  return [];
}
```

通过这种方法，您可以与原生响应对象交互（例如，根据特定条件设置 cookie 或标头），同时仍然允许框架处理其余部分。
