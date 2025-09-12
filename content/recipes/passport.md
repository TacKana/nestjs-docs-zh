### Passport（身份验证）

[Passport](https://github.com/jaredhanson/passport) 是最流行的 node.js 身份验证库，被社区广泛认可并成功应用于许多生产环境中。通过 `@nestjs/passport` 模块，可以轻松地将该库与 **Nest** 应用程序集成。在高层次上，Passport 执行一系列步骤来完成：

- 通过验证用户的“凭据”（如用户名/密码、JSON Web Token（[JWT](https://jwt.io/)）或身份提供者的身份令牌）来验证用户身份
- 管理经过身份验证的状态（通过颁发可移植令牌，如 JWT，或创建 [Express 会话](https://github.com/expressjs/session)）
- 将已验证用户的信息附加到 `Request` 对象上，以便在路由处理程序中进一步使用

Passport 拥有丰富的[策略](http://www.passportjs.org/)生态系统，实现了各种身份验证机制。虽然概念简单，但可供选择的 Passport 策略种类繁多。Passport 将这些不同的步骤抽象成标准模式，而 `@nestjs/passport` 模块则将此模式包装并标准化为熟悉的 Nest 构造。

在本章中，我们将使用这些强大而灵活的模块，为 RESTful API 服务器实现一个完整的端到端身份验证解决方案。您可以参考此处描述的概念来实现任何 Passport 策略，以定制您的身份验证方案。您可以按照本章的步骤构建这个完整示例。

#### 身份验证需求

让我们详细说明需求。对于此用例，客户端将首先使用用户名和密码进行身份验证。一旦验证通过，服务器将颁发一个 JWT，该令牌可以在后续请求的[授权头中的持有者令牌](https://tools.ietf.org/html/rfc6750)中发送，以证明身份验证。我们还将创建一个受保护的路由，仅对包含有效 JWT 的请求可访问。

我们将从第一个需求开始：验证用户身份。然后，我们将通过颁发 JWT 来扩展此功能。最后，我们将创建一个受保护的路由，检查请求中的有效 JWT。

首先，我们需要安装所需的包。Passport 提供了一个名为 [passport-local](https://github.com/jaredhanson/passport-local) 的策略，该策略实现了用户名/密码身份验证机制，这符合我们此部分用例的需求。

```bash
$ npm install --save @nestjs/passport passport passport-local
$ npm install --save-dev @types/passport-local
```

> 警告 **注意** 对于您选择的**任何** Passport 策略，您总是需要 `@nestjs/passport` 和 `passport` 包。然后，您需要安装策略特定的包（例如 `passport-jwt` 或 `passport-local`），该包实现了您正在构建的特定身份验证策略。此外，您还可以安装任何 Passport 策略的类型定义，如上所示使用 `@types/passport-local`，这在编写 TypeScript 代码时提供帮助。

#### 实现 Passport 策略

我们现在准备实现身份验证功能。首先概述用于**任何** Passport 策略的过程。将 Passport 本身视为一个迷你框架会很有帮助。该框架的优雅之处在于它将身份验证过程抽象为几个基本步骤，您可以根据正在实施的策略进行自定义。它就像一个框架，因为您通过提供定制参数（作为纯 JSON 对象）和回调函数形式的自定义代码来配置它，Passport 在适当的时候调用这些函数。`@nestjs/passport` 模块将此框架包装成 Nest 风格的包，使其易于集成到 Nest 应用程序中。我们将在下面使用 `@nestjs/passport`，但首先让我们考虑**原生 Passport** 的工作原理。

在原生的 Passport 中，您通过提供两样东西来配置策略：

1. 一组特定于该策略的选项。例如，在 JWT 策略中，您可能提供一个用于签名令牌的密钥。
2. 一个“验证回调”，在这里您告诉 Passport 如何与您的用户存储（您管理用户帐户的地方）交互。在这里，您验证用户是否存在（和/或创建新用户），以及他们的凭据是否有效。Passport 库期望此回调在验证成功时返回完整的用户，失败时返回 null（失败定义为未找到用户，或者，在 passport-local 的情况下，密码不匹配）。

使用 `@nestjs/passport`，您通过扩展 `PassportStrategy` 类来配置 Passport 策略。您通过在子类中调用 `super()` 方法来传递策略选项（上面的第 1 项），可以选择传入选项对象。您通过在子类中实现 `validate()` 方法来提供验证回调（上面的第 2 项）。

我们将首先生成一个 `AuthModule` 并在其中创建一个 `AuthService`：

```bash
$ nest g module auth
$ nest g service auth
```

在实现 `AuthService` 时，我们发现将用户操作封装在 `UsersService` 中会很有用，所以现在生成该模块和服务：

```bash
$ nest g module users
$ nest g service users
```

将这些生成文件的默认内容替换为如下所示。对于我们的示例应用程序，`UsersService` 仅维护一个硬编码的内存用户列表，以及一个通过用户名检索的查找方法。在实际应用程序中，您将使用您选择的库（例如 TypeORM、Sequelize、Mongoose 等）构建用户模型和持久层。

```typescript
@@filename(users/users.service)
import { Injectable } from '@nestjs/common';

// 这应该是一个表示用户实体的真实类/接口
export type User = any;

@Injectable()
export class UsersService {
  private readonly users = [
    {
      userId: 1,
      username: 'john',
      password: 'changeme',
    },
    {
      userId: 2,
      username: 'maria',
      password: 'guess',
    },
  ];

  async findOne(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }
}
@@switch
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor() {
    this.users = [
      {
        userId: 1,
        username: 'john',
        password: 'changeme',
      },
      {
        userId: 2,
        username: 'maria',
        password: 'guess',
      },
    ];
  }

  async findOne(username) {
    return this.users.find(user => user.username === username);
  }
}
```

在 `UsersModule` 中，唯一需要的更改是将 `UsersService` 添加到 `@Module` 装饰器的导出数组中，以便在此模块外部可见（我们很快将在 `AuthService` 中使用它）。

```typescript
@@filename(users/users.module)
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
@@switch
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

我们的 `AuthService` 负责检索用户并验证密码。我们为此创建一个 `validateUser()` 方法。在下面的代码中，我们使用方便的 ES6 扩展运算符在返回用户对象之前剥离密码属性。我们稍后将从我们的 Passport 本地策略调用 `validateUser()` 方法。

```typescript
@@filename(auth/auth.service)
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}
@@switch
import { Injectable, Dependencies } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
@Dependencies(UsersService)
export class AuthService {
  constructor(usersService) {
    this.usersService = usersService;
  }

  async validateUser(username, pass) {
    const user = await this.usersService.findOne(username);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}
```

> 警告 **警告** 当然，在实际应用程序中，您不会以明文形式存储密码。您应该使用像 [bcrypt](https://github.com/kelektiv/node.bcrypt.js#readme) 这样的库，采用加盐的单向哈希算法。使用这种方法，您只存储哈希密码，然后将存储的密码与**传入**密码的哈希版本进行比较，从而永远不会以明文形式存储或暴露用户密码。为了保持示例应用程序简单，我们违反了这个绝对规定，使用明文。**不要在您的真实应用程序中这样做！**

现在，我们更新 `AuthModule` 以导入 `UsersModule`。

```typescript
@@filename(auth/auth.module)
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [AuthService],
})
export class AuthModule {}
@@switch
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [AuthService],
})
export class AuthModule {}
```

#### 实现 Passport 本地策略

现在我们可以实现我们的 Passport **本地身份验证策略**。在 `auth` 文件夹中创建一个名为 `local.strategy.ts` 的文件，并添加以下代码：

```typescript
@@filename(auth/local.strategy)
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
@@switch
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Dependencies } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
@Dependencies(AuthService)
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(authService) {
    super();
    this.authService = authService;
  }

  async validate(username, password) {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

我们遵循了之前为所有 Passport 策略描述的配方。在我们使用 passport-local 的用例中，没有配置选项，因此我们的构造函数只需调用 `super()`，而不带选项对象。

> 信息 **提示** 我们可以在调用 `super()` 时传递一个选项对象来自定义 passport 策略的行为。在此示例中，passport-local 策略默认期望请求体中名为 `username` 和 `password` 的属性。传递一个选项对象以指定不同的属性名称，例如：`super({{ '{' }} usernameField: 'email' {{ '}' }})`。有关更多信息，请参阅 [Passport 文档](http://www.passportjs.org/docs/configure/)。

我们还实现了 `validate()` 方法。对于每个策略，Passport 将使用适当的策略特定参数集调用验证函数（在 `@nestjs/passport` 中使用 `validate()` 方法实现）。对于本地策略，Passport 期望一个具有以下签名的 `validate()` 方法：`validate(username: string, password:string): any`。

大部分验证工作在我们的 `AuthService` 中完成（借助我们的 `UsersService`），因此此方法非常简单。**任何** Passport 策略的 `validate()` 方法都将遵循类似的模式，仅在凭据表示方式的细节上有所不同。如果找到用户且凭据有效，则返回用户，以便 Passport 可以完成其任务（例如，在 `Request` 对象上创建 `user` 属性），并且请求处理管道可以继续。如果未找到，我们抛出异常，让我们的<a href="exception-filters">异常层</a>处理它。

通常，每个策略的 `validate()` 方法的唯一显著区别是**如何**确定用户是否存在且有效。例如，在 JWT 策略中，根据需求，我们可能评估解码令牌中携带的 `userId` 是否与用户数据库中的记录匹配，或与撤销令牌列表匹配。因此，这种子类化和实现策略特定验证的模式是一致的、优雅的且可扩展的。

我们需要配置我们的 `AuthModule` 以使用我们刚刚定义的 Passport 功能。更新 `auth.module.ts` 如下所示：

```typescript
@@filename(auth/auth.module)
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';

@Module({
  imports: [UsersModule, PassportModule],
  providers: [AuthService, LocalStrategy],
})
export class AuthModule {}
@@switch
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';

@Module({
  imports: [UsersModule, PassportModule],
  providers: [AuthService, LocalStrategy],
})
export class AuthModule {}
```

#### 内置的 Passport 守卫

<a href="guards">守卫</a>章节描述了守卫的主要功能：确定是否由路由处理程序处理请求。这仍然成立，我们很快就会使用该标准功能。然而，在使用 `@nestjs/passport` 模块的上下文中，我们还将引入一个可能起初令人困惑的新变化，所以现在让我们讨论一下。从身份验证的角度考虑，您的应用程序可以存在于两种状态：

1. 用户/客户端**未**登录（未经过身份验证）
2. 用户/客户端**已**登录（已经过身份验证）

在第一种情况下（用户未登录），我们需要执行两个不同的功能：

- 限制未经身份验证的用户可以访问的路由（即拒绝对受保护路由的访问）。我们将使用守卫的熟悉能力来处理此功能，通过在受保护的路由上放置守卫。如您所料，我们将在此守卫中检查是否存在有效的 JWT，因此我们将在成功颁发 JWT 后处理此守卫。

- 当先前未经身份验证的用户尝试登录时，启动**身份验证步骤**本身。这是我们将向有效用户**颁发** JWT 的步骤。考虑一下，我们知道我们需要 `POST` 用户名/密码凭据来启动身份验证，因此我们将设置一个 `POST /auth/login` 路由来处理此问题。这就提出了一个问题：我们究竟如何在该路由中调用 passport-local 策略？

答案很简单：通过使用另一种稍有不同的守卫类型。`@nestjs/passport` 模块为我们提供了一个内置的守卫来为我们完成此操作。此守卫调用 Passport 策略并启动上述步骤（检索凭据、运行验证函数、创建 `user` 属性等）。

上面列举的第二种情况（已登录用户）仅依赖于我们已经讨论过的标准类型的守卫，以便为已登录用户启用对受保护路由的访问。

<app-banner-courses-auth></app-banner-courses-auth>

#### 登录路由

策略就绪后，我们现在可以实现一个简单的 `/auth/login` 路由，并应用内置守卫来启动 passport-local 流程。

打开 `app.controller.ts` 文件并将其内容替换为以下内容：

```typescript
@@filename(app.controller)
import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  @UseGuards(AuthGuard('local'))
  @Post('auth/login')
  async login(@Request() req) {
    return req.user;
  }
}
@@switch
import { Controller, Bind, Request, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  @UseGuards(AuthGuard('local'))
  @Post('auth/login')
  @Bind(Request())
  async login(req) {
    return req.user;
  }
}
```

通过 `@UseGuards(AuthGuard('local'))`，我们正在使用 `@nestjs/passport` 在扩展 passport-local 策略时**自动提供**的 `AuthGuard`。让我们分解一下。我们的 Passport 本地策略的默认名称为 `'local'`。我们在 `@UseGuards()` 装饰器中引用该名称，以将其与 `passport-local` 包提供的代码关联起来。这用于消除在我们应用程序中有多个 Passport 策略时调用哪个策略的歧义（每个策略都可能提供特定于策略的 `AuthGuard`）。虽然我们目前只有一个这样的策略，但我们将很快添加第二个，因此需要消除歧义。

为了测试我们的路由，我们现在让 `/auth/login` 路由简单地返回用户。这也让我们展示了 Passport 的另一个特性：Passport 根据我们从 `validate()` 方法返回的值自动创建一个 `user` 对象，并将其作为 `req.user` 分配给 `Request` 对象。稍后，我们将用创建并返回 JWT 的代码替换此代码。

由于这些是 API 路由，我们将使用常用的 [cURL](https://curl.haxx.se/) 库来测试它们。您可以使用 `UsersService` 中硬编码的任何 `user` 对象进行测试。

```bash
$ # POST 到 /auth/login
$ curl -X POST http://localhost:3000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"
$ # 结果 -> {"userId":1,"username":"john"}
```

虽然这可行，但将策略名称直接传递给 `AuthGuard()` 会在代码库中引入魔术字符串。相反，我们建议创建您自己的类，如下所示：

```typescript
@@filename(auth/local-auth.guard)
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

现在，我们可以更新 `/auth/login` 路由处理程序并使用 `LocalAuthGuard` 代替：

```typescript
@UseGuards(LocalAuthGuard)
@Post('auth/login')
async login(@Request() req) {
  return req.user;
}
```

#### 注销路由

要注销，我们可以创建一个额外的路由，调用 `req.logout()` 来清除用户的会话。这是基于会话的身份验证中使用的典型方法，但不适用于 JWT。

```typescript
@UseGuards(LocalAuthGuard)
@Post('auth/logout')
async logout(@Request() req) {
  return req.logout();
}
```

#### JWT 功能

我们准备继续处理身份验证系统的 JWT 部分。让我们回顾并完善我们的需求：

- 允许用户使用用户名/密码进行身份验证，返回一个 JWT，用于后续调用受保护的 API 端点。我们已经很好地满足了这一需求。要完成它，我们需要编写颁发 JWT 的代码。
- 创建基于存在有效 JWT 作为持有者令牌的受保护 API 路由

我们需要安装更多的包来支持我们的 JWT 需求：

```bash
$ npm install --save @nestjs/jwt passport-jwt
$ npm install --save-dev @types/passport-jwt
```

`@nestjs/jwt` 包（查看更多[此处](https://github.com/nestjs/jwt)）是一个有助于 JWT 操作的实用包。`passport-jwt` 包是实现 JWT 策略的 Passport 包，`@types/passport-jwt` 提供 TypeScript 类型定义。

让我们仔细看看 `POST /auth/login` 请求是如何处理的。我们使用 passport-local 策略提供的内置 `AuthGuard` 装饰了该路由。这意味着：

1. 路由处理程序**仅在用户已验证后调用**
2. `req` 参数将包含一个 `user` 属性（在 passport-local 身份验证流程中由 Passport 填充）

考虑到这一点，我们现在终于可以生成一个真实的 JWT，并在此路由中返回它。为了保持我们的服务清晰模块化，我们将在 `authService` 中处理生成 JWT。打开 `auth` 文件夹中的 `auth.service.ts` 文件，添加 `login()` 方法，并导入 `JwtService`，如下所示：

```typescript
@@filename(auth/auth.service)
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}

@@switch
import { Injectable, Dependencies } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Dependencies(UsersService, JwtService)
@Injectable()
export class AuthService {
  constructor(usersService, jwtService) {
    this.usersService = usersService;
    this.jwtService = jwtService;
  }

  async validateUser(username, pass) {
    const user = await this.usersService.findOne(username);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
```

我们使用 `@nestjs/jwt` 库，它提供了一个 `sign()` 函数来从 `user` 对象属性的子集生成我们的 JWT，然后我们将其作为具有单个 `access_token` 属性的简单对象返回。注意：我们选择 `sub` 属性来保存我们的 `userId` 值，以符合 JWT 标准。不要忘记将 `JwtService` 提供者注入到 `AuthService` 中。

我们现在需要更新 `AuthModule` 以导入新的依赖项并配置 `JwtModule`。

首先，在 `auth` 文件夹中创建 `constants.ts`，并添加以下代码：

```typescript
@@filename(auth/constants)
export const jwtConstants = {
  secret: '请勿使用此值。相反，应创建一个复杂的密钥并将其安全地保存在源代码之外。',
};
@@switch
export const jwtConstants = {
  secret: '请勿使用此值。相反，应创建一个复杂的密钥并将其安全地保存在源代码之外。',
};
```

我们将使用它在 JWT 签名和验证步骤之间共享我们的密钥。

> 警告 **警告** **不要公开暴露此密钥**。我们在这里这样做是为了使代码清晰，但在生产系统中，**您必须使用适当的措施保护此密钥**，例如密钥库、环境变量或配置服务。

现在，打开 `auth` 文件夹中的 `auth.module.ts` 并更新它以如下所示：

```typescript
@@filename(auth/auth.module)
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [AuthService, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
@@switch
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [AuthService, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

我们使用 `register()` 配置 `JwtModule`，传入配置对象。有关 Nest `JwtModule` 的更多信息，请参见[此处](https://github.com/nestjs/jwt/blob/master/README.md)，有关可用配置选项的更多详细信息，请参见[此处](https://github.com/auth0/node-jsonwebtoken#usage)。

现在我们可以更新 `/auth/login` 路由以返回 JWT。

```typescript
@@filename(app.controller)
import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';

@Controller()
export class AppController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
@@switch
import { Controller, Bind, Request, Post, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';

@Controller()
export class AppController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  @Bind(Request())
  async login(req) {
    return this.authService.login(req.user);
  }
}
```

让我们继续使用 cURL 测试我们的路由。您可以使用 `UsersService` 中硬编码的任何 `user` 对象进行测试。

```bash
$ # POST 到 /auth/login
$ curl -X POST http://localhost:3000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"
$ # 结果 -> {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
$ # 注意：上面的 JWT 已被截断
```

#### 实现 Passport JWT

我们现在可以解决我们的最终需求：通过要求请求中存在有效的 JWT 来保护端点。Passport 也可以在这里帮助我们。它提供了 [passport-jwt](https://github.com/mikenicholson/passport-jwt) 策略，用于使用 JSON Web Tokens 保护 RESTful 端点。首先在 `auth` 文件夹中创建一个名为 `jwt.strategy.ts` 的文件，并添加以下代码：

```typescript
@@filename(auth/jwt.strategy)
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username };
  }
}
@@switch
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload) {
    return { userId: payload.sub, username: payload.username };
  }
}
```

对于我们的 `JwtStrategy`，我们遵循了之前为所有 Passport 策略描述的相同配方。此策略需要一些初始化，因此我们通过在 `super()` 调用中传入选项对象来完成。您可以在[此处](https://github.com/mikenicholson/passport-jwt#configure-strategy)阅读有关可用选项的更多信息。在我们的情况下，这些选项是：

- `jwtFromRequest`: 提供从 `Request` 中提取 JWT 的方法。我们将使用在 API 请求的 Authorization 头中提供持有者令牌的标准方法。其他选项在[此处](https://github.com/mikenicholson/passport-jwt#extracting-the-jwt-from-the-request)描述。
- `ignoreExpiration`: 只是为了明确，我们选择默认的 `false` 设置，这将确保 JWT 未过期的责任委托给 Passport 模块。这意味着如果我们的路由提供了一个过期的 JWT，请求将被拒绝并发送 `401 Unauthorized` 响应。Passport 方便地为我们自动处理此问题。
- `secretOrKey`: 我们使用对称密钥签署令牌的便捷选项。其他选项，如 PEM 编码的公钥，可能更适合生产应用程序（更多信息请参见[此处](https://github.com/mikenicholson/passport-jwt#configure-strategy)）。无论如何，如前所述，**不要公开暴露此密钥**。

`validate()` 方法值得讨论。对于 jwt-strategy，Passport 首先验证 JWT 的签名并解码 JSON。然后它调用我们的 `validate()` 方法，将解码后的 JSON 作为其单个参数传递。根据 JWT 签名的工作方式，**我们保证我们收到的是一个有效的令牌**，该令牌是我们之前签署并颁发给有效用户的。

因此，我们对 `validate()` 回调的响应是微不足道的：我们只返回一个包含 `userId` 和 `username` 属性的对象。再次回忆，Passport 将基于我们的 `validate()` 方法的返回值构建一个 `user` 对象，并将其作为属性附加到 `Request` 对象上。

此外，您可以返回一个数组，其中第一个值用于创建 `user` 对象，第二个值用于创建 `authInfo` 对象。

还值得指出的是，这种方法为我们留下了将其他业务逻辑注入过程的余地（如“钩子”）。例如，我们可以在 `validate()` 方法中进行数据库查找，以提取有关用户的更多信息，从而在我们的 `Request` 中提供更丰富的 `user` 对象。这也是我们可能决定进行进一步令牌验证的地方，例如在撤销令牌列表中查找 `userId`，使我们能够执行令牌撤销。我们在示例代码中实现的模型是一个快速的“无状态 JWT”模型，其中每个 API 调用都基于存在有效 JWT 立即授权，并且有关请求者的少量信息（其 `userId` 和 `username`）在我们的请求管道中可用。

将新的 `JwtStrategy` 作为提供者添加到 `AuthModule` 中：

```typescript
@@filename(auth/auth.module)
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
@@switch
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

通过导入用于签署 JWT 的相同密钥，我们确保 Passport 执行的**验证**阶段和我们的 AuthService 中的**签署**阶段使用共同的密钥。

最后，我们定义扩展内置 `AuthGuard` 的 `JwtAuthGuard` 类：

```typescript
@@filename(auth/jwt-auth.guard)
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

#### 实现受保护路由和 JWT 策略守卫

我们现在可以实现我们的受保护路由及其关联的守卫。

打开 `app.controller.ts` 文件并更新如下：

```typescript
@@filename(app.controller)
import { Controller, Get, Request, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';

@Controller()
export class AppController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
@@switch
import { Controller, Dependencies, Bind, Get, Request, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';

@Dependencies(AuthService)
@Controller()
export class AppController {
  constructor(authService) {
    this.authService = authService;
  }

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  @Bind(Request())
  async login(req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @Bind(Request())
  getProfile(req) {
    return req.user;
  }
}
```

再次，我们应用了 `@nestjs/passport` 模块在配置 passport-jwt 模块时自动为我们提供的 `AuthGuard`。此守卫由其默认名称 `jwt` 引用。当我们的 `GET /profile` 路由被命中时，守卫将自动调用我们的 passport-jwt 自定义配置策略，验证 JWT，并将 `user` 属性分配给 `Request` 对象。

确保应用程序正在运行，并使用 `cURL` 测试路由。

```bash
$ # GET /profile
$ curl http://localhost:3000/profile
$ # 结果 -> {"statusCode":401,"message":"Unauthorized"}

$ # POST /auth/login
$ curl -X POST http://localhost:3000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"
$ # 结果 -> {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vybm... }

$ # GET /profile 使用上一步返回的 access_token 作为持有者代码
$ curl http://localhost:3000/profile -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vybm..."
$ # 结果 -> {"userId":1,"username":"john"}
```

请注意，在 `AuthModule` 中，我们将 JWT 配置为具有 `60 秒` 的过期时间。这可能太短了，处理令牌过期和刷新的细节超出了本文的范围。然而，我们选择这是为了演示 JWT 和 passport-jwt 策略的一个重要特性。如果您在身份验证后等待 60 秒再尝试 `GET /profile` 请求，您将收到 `401 Unauthorized` 响应。这是因为 Passport 自动检查 JWT 的过期时间，为您省去了在应用程序中执行此操作的麻烦。

我们现在已经完成了 JWT 身份验证实现。JavaScript 客户端（如 Angular/React/Vue）和其他 JavaScript 应用程序现在可以与我们的 API 服务器安全地进行身份验证和通信。

#### 扩展守卫

在大多数情况下，使用提供的 `AuthGuard` 类就足够了。然而，可能会有一些用例，您希望简单地扩展默认的错误处理或身份验证逻辑。为此，您可以扩展内置类并在子类中覆盖方法。

```typescript
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // 在此处添加您的自定义身份验证逻辑
    // 例如，调用 super.logIn(request) 以建立会话。
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // 您可以基于 "info" 或 "err" 参数抛出异常
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
```

除了扩展默认的错误处理和身份验证逻辑外，我们还可以允许身份验证通过一系列策略链进行。第一个成功、重定向或错误的策略将停止链。身份验证失败将依次通过每个策略，如果所有策略都失败，则最终失败。

```typescript
export class JwtAuthGuard extends AuthGuard(['strategy_jwt_1', 'strategy_jwt_2', '...']) { ... }
```

#### 全局启用身份验证

如果您的大多数端点默认应受到保护，您可以将身份验证守卫注册为[全局守卫](/guards#binding-guards)，而不是在每个控制器顶部使用 `@UseGuards()` 装饰器，您可以简单地标记哪些路由应该是公共的。

首先，使用以下构造将 `JwtAuthGuard` 注册为全局守卫（在任何模块中）：

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
],
```

这样，Nest 将自动将 `JwtAuthGuard` 绑定到所有端点。

现在我们必须提供一种将路由声明为公共的机制。为此，我们可以使用 `SetMetadata` 装饰器工厂函数创建一个自定义装饰器。

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

在上面的文件中，我们导出了两个常量。一个是名为 `IS_PUBLIC_KEY` 的元数据键，另一个是我们将称为 `Public` 的新装饰器本身（您也可以将其命名为 `SkipAuth` 或 `AllowAnon`，只要适合您的项目）。

现在我们有了自定义的 `@Public()` 装饰器，我们可以用它来装饰任何方法，如下所示：

```typescript
@Public()
@Get()
findAll() {
  return [];
}
```

最后，我们需要 `JwtAuthGuard` 在找到 `"isPublic"` 元数据时返回 `true`。为此，我们将使用 `Reflector` 类（阅读更多[此处](/guards#putting-it-all-together)）。

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
```

#### 请求范围策略

Passport API 基于向库的全局实例注册策略。因此，策略并非设计为具有依赖于请求的选项或每个请求动态实例化（阅读更多关于[请求范围](/fundamentals/injection-scopes)提供者的信息）。当您将策略配置为请求范围时，Nest 永远不会实例化它，因为它不绑定到任何特定路由。无法确定每个请求应执行哪些“请求范围”策略。

但是，有方法可以在策略内动态解析请求范围的提供者。为此，我们利用[模块引用](/fundamentals/module-ref)功能。

首先，打开 `local.strategy.ts` 文件并以正常方式注入 `ModuleRef`：

```typescript
constructor(private moduleRef: ModuleRef) {
  super({
    passReqToCallback: true,
  });
}
```

> 信息 **提示** `ModuleRef` 类是从 `@nestjs/core` 包导入的。

确保将 `passReqToCallback` 配置属性设置为 `true`，如上所示。

在下一步中，请求实例将用于获取当前上下文标识符，而不是生成新的（阅读更多关于请求上下文[此处](/fundamentals/module-ref#getting-current-sub-tree)）。

现在，在 `LocalStrategy` 类的 `validate()` 方法内部，使用 `ContextIdFactory` 类的 `getByRequest()` 方法基于请求对象创建上下文 id，并将其传递给 `resolve()` 调用：

```typescript
async validate(
  request: Request,
  username: string,
  password: string,
) {
  const contextId = ContextIdFactory.getByRequest(request);
  // "AuthService" 是一个请求范围的提供者
  const authService = await this.moduleRef.resolve(AuthService, contextId);
  ...
}
```

在上面的示例中，`resolve()` 方法将异步返回 `AuthService` 提供者的请求范围实例（我们假设 `AuthService` 被标记为请求范围的提供者）。

#### 自定义 Passport

任何标准的 Passport 自定义选项都可以通过相同的方式传递，使用 `register()` 方法。可用选项取决于正在实施的策略。例如：

```typescript
PassportModule.register({ session: true });
```

您还可以在策略的构造函数中传递选项对象来配置它们。
对于本地策略，您可以传递例如：

```typescript
constructor(private authService: AuthService) {
  super({
    usernameField: 'email',
    passwordField: 'password',
  });
}
```

查看官方的 [Passport 网站](http://www.passportjs.org/docs/oauth/) 了解属性名称。

#### 命名策略

在实现策略时，您可以通过向 `PassportStrategy` 函数传递第二个参数来为其提供名称。如果您不这样做，每个策略都将有一个默认名称（例如，jwt-strategy 的 'jwt'）：

```typescript
export class JwtStrategy extends PassportStrategy(Strategy, 'myjwt')
```

然后，您可以通过像 `@UseGuards(AuthGuard('myjwt'))` 这样的装饰器来引用它。

#### GraphQL

为了将 AuthGuard 与 [GraphQL](/graphql/quick-start) 一起使用，扩展内置的 `AuthGuard` 类并覆盖 `getRequest()` 方法。

```typescript
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
```

为了在您的 graphql 解析器中获取当前经过身份验证的用户，您可以定义一个 `@CurrentUser()` 装饰器：

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);
```

为了在您的解析器中使用上述装饰器，请确保将其包含为查询或突变的参数：

```typescript
@Query(() => User)
@UseGuards(GqlAuthGuard)
whoAmI(@CurrentUser() user: User) {
  return this.usersService.findById(user.id);
}
```

对于 passport-local 策略，您还需要将 GraphQL 上下文的参数添加到请求体中，以便 Passport 可以访问它们进行验证。否则，您将收到未经授权的错误。

```typescript
@Injectable()
export class GqlLocalAuthGuard extends AuthGuard('local') {
  getRequest(context: ExecutionContext) {
    const gqlExecutionContext = GqlExecutionContext.create(context);
    const gqlContext = gqlExecutionContext.getContext();
    const gqlArgs = gqlExecutionContext.getArgs();

    gqlContext.req.body = { ...gqlContext.req.body, ...gqlArgs };
    return gqlContext.req;
  }
}
```
