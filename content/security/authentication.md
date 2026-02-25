### 身份验证

身份验证是大多数应用中**至关重要**的一部分。有多种不同的方法和策略来处理身份验证。任何项目所采用的方法都取决于其特定的应用需求。本章将介绍几种可以适应各种不同需求的身份验证方法。

让我们来明确一下需求。对于这个用例，客户端首先使用用户名和密码进行身份验证。一旦通过验证，服务器将签发一个 JWT，该令牌可以在后续请求的授权头中作为 [Bearer 令牌](https://tools.ietf.org/html/rfc6750) 发送，以证明身份验证。我们还将创建一条受保护的路由，该路由仅允许包含有效 JWT 的请求访问。

我们将从第一个需求开始：对用户进行身份验证。然后，我们将通过签发 JWT 来扩展它。最后，我们将创建一条受保护的路由，用于检查请求中是否包含有效的 JWT。

#### 创建一个身份验证模块

我们将从生成一个 `AuthModule` 开始，并在其中生成一个 `AuthService` 和一个 `AuthController`。我们将使用 `AuthService` 来实现身份验证逻辑，并使用 `AuthController` 来暴露身份验证端点。

```bash
$ nest g module auth
$ nest g controller auth
$ nest g service auth
```

在实现 `AuthService` 时，我们发现将用户操作封装在一个 `UsersService` 中会很有用，所以我们现在就生成那个模块和服务：

```bash
$ nest g module users
$ nest g service users
```

如下所示替换这些生成文件的默认内容。对于我们的示例应用，`UsersService` 简单地维护一个硬编码的内存用户列表，以及一个通过用户名查找用户的方法。在真实应用中，您将在这里使用您选择的库（例如 TypeORM、Sequelize、Mongoose 等）构建您的用户模型和持久层。

```typescript
@@filename(users/users.service)
import { Injectable } from '@nestjs/common';

// 这应该是一个代表用户实体的真实类/接口
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

在 `UsersModule` 中，唯一需要的更改是将 `UsersService` 添加到 `@Module` 装饰器的 exports 数组中，以便它在该模块外部可见（我们很快将在 `AuthService` 中使用它）。

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

#### 实现 "登录" 端点

我们的 `AuthService` 负责检索用户并验证密码。为此，我们创建了一个 `signIn()` 方法。在下面的代码中，我们使用便捷的 ES6 展开运算符在返回用户对象之前从中剥离了密码属性。这在返回用户对象时是一种常见做法，因为您不希望暴露密码或其他安全密钥等敏感字段。

```typescript
@@filename(auth/auth.service)
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async signIn(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user?.password !== pass) {
      throw new UnauthorizedException();
    }
    const { password, ...result } = user;
    // TODO: 在此处生成一个 JWT 并返回它
    // 而不是返回用户对象
    return result;
  }
}
@@switch
import { Injectable, Dependencies, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
@Dependencies(UsersService)
export class AuthService {
  constructor(usersService) {
    this.usersService = usersService;
  }

  async signIn(username: string, pass: string) {
    const user = await this.usersService.findOne(username);
    if (user?.password !== pass) {
      throw new UnauthorizedException();
    }
    const { password, ...result } = user;
    // TODO: 在此处生成一个 JWT 并返回它
    // 而不是返回用户对象
    return result;
  }
}
```

> 警告 **警告** 当然，在真实应用中，您不会以明文形式存储密码。您应该使用像 [bcrypt](https://github.com/kelektiv/node.bcrypt.js#readme) 这样的库，配合加盐的单向哈希算法。使用这种方法，您只存储哈希后的密码，然后将存储的密码与**传入**密码的哈希版本进行比较，从而永远不会以明文形式存储或暴露用户密码。为了让我们的示例应用保持简单，我们违反了这一绝对原则，使用了明文密码。**请不要在您的真实应用中这样做！**

现在，我们更新 `AuthModule` 以导入 `UsersModule`。

```typescript
@@filename(auth/auth.module)
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
@@switch
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
```

完成这些后，让我们打开 `AuthController` 并向其中添加一个 `signIn()` 方法。客户端将调用此方法来验证用户身份。它将在请求体中接收用户名和密码，如果用户通过身份验证，将返回一个 JWT 令牌。

```typescript
@@filename(auth/auth.controller)
import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: Record<string, any>) {
    return this.authService.signIn(signInDto.username, signInDto.password);
  }
}
```

> 信息 **提示** 理想情况下，不应使用 `Record<string, any>` 类型，而应使用 DTO 类来定义请求体的结构。有关更多信息，请参阅 [验证](/techniques/validation) 章节。

<app-banner-courses-auth></app-banner-courses-auth>

#### JWT 令牌

我们准备进入身份验证系统的 JWT 部分。让我们回顾并细化我们的需求：

- 允许用户使用用户名/密码进行身份验证，并返回一个 JWT，用于后续对受保护 API 端点的调用。我们正在顺利地满足这一需求。为了完成它，我们需要编写签发 JWT 的代码。
- 创建基于是否存在作为 Bearer 令牌的有效 JWT 来保护的 API 路由。

我们需要安装一个额外的包来支持我们的 JWT 需求：

```bash
$ npm install --save @nestjs/jwt
```

> 信息 **提示** `@nestjs/jwt` 包（更多信息见[此处](https://github.com/nestjs/jwt)）是一个帮助处理 JWT 操作的实用程序包。这包括生成和验证 JWT 令牌。

为了保持我们服务的清晰模块化，我们将在 `authService` 中处理生成 JWT。打开 `auth` 文件夹中的 `auth.service.ts` 文件，注入 `JwtService`，并更新 `signIn` 方法以生成 JWT 令牌，如下所示：

```typescript
@@filename(auth/auth.service)
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async signIn(
    username: string,
    pass: string,
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(username);
    if (user?.password !== pass) {
      throw new UnauthorizedException();
    }
    const payload = { sub: user.userId, username: user.username };
    return {
      // 💡 这里用于签署 payload 的 JWT 秘钥
      // 是在 JwtModule 中传递的秘钥
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
@@switch
import { Injectable, Dependencies, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Dependencies(UsersService, JwtService)
@Injectable()
export class AuthService {
  constructor(usersService, jwtService) {
    this.usersService = usersService;
    this.jwtService = jwtService;
  }

  async signIn(username, pass) {
    const user = await this.usersService.findOne(username);
    if (user?.password !== pass) {
      throw new UnauthorizedException();
    }
    const payload = { username: user.username, sub: user.userId };
    return {
      // 💡 这里用于签署 payload 的 JWT 秘钥
      // 是在 JwtModule 中传递的秘钥
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
```

我们使用了 `@nestjs/jwt` 库，它提供了一个 `signAsync()` 函数，用于从 `user` 对象属性的子集生成我们的 JWT，然后我们将其作为一个包含单个 `access_token` 属性的简单对象返回。注意：我们选择使用 `sub` 作为属性名来保存我们的 `userId` 值，以符合 JWT 标准。

我们现在需要更新 `AuthModule` 以导入新的依赖项并配置 `JwtModule`。

首先，在 `auth` 文件夹中创建 `constants.ts`，并添加以下代码：

```typescript
@@filename(auth/constants)
export const jwtConstants = {
  secret: '请勿使用此值。而是创建一个复杂的秘钥，并将其安全地保存在源代码之外。',
};
@@switch
export const jwtConstants = {
  secret: '请勿使用此值。而是创建一个复杂的秘钥，并将其安全地保存在源代码之外。',
};
```

我们将用它来在 JWT 签名和验证步骤之间共享我们的秘钥。

> 警告 **警告** **不要公开暴露此秘钥**。我们在这里这样做是为了清楚地说明代码的作用，但在生产系统中，**您必须通过适当的措施保护此秘钥**，例如使用秘钥库、环境变量或配置服务。

现在，打开 `auth` 文件夹中的 `auth.module.ts`，并将其更新为如下所示：

```typescript
@@filename(auth/auth.module)
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
@@switch
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

> 信息 **提示** 我们将 `JwtModule` 注册为全局模块以方便使用。这意味着我们不需要在应用程序的其他任何地方导入 `JwtModule`。

我们使用 `register()` 方法配置 `JwtModule`，传入一个配置对象。有关 Nest `JwtModule` 的更多信息，请参阅 [此处](https://github.com/nestjs/jwt/blob/master/README.md)；有关可用配置选项的更多详细信息，请参阅 [此处](https://github.com/auth0/node-jsonwebtoken#usage)。

让我们继续使用 cURL 再次测试我们的路由。您可以使用 `UsersService` 中硬编码的任何 `user` 对象进行测试。

```bash
$ # POST 请求 /auth/login
$ curl -X POST http://localhost:3000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"
{"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
$ # 注意：上面的 JWT 已被截断
```

#### 实现身份验证守卫

我们现在可以处理最后一个需求：通过要求在请求中存在有效的 JWT 来保护端点。我们将通过创建一个 `AuthGuard` 来实现这一点，我们可以用它来保护我们的路由。

```typescript
@@filename(auth/auth.guard)
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      // 💡 这里用于验证 payload 的 JWT 秘钥
      // 是在 JwtModule 中传递的秘钥
      const payload = await this.jwtService.verifyAsync(token);
      // 💡 我们在这里将 payload 赋值给请求对象
      // 以便我们可以在路由处理程序中访问它
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

我们现在可以实现受保护的路由，并注册我们的 `AuthGuard` 来保护它。

打开 `auth.controller.ts` 文件并按如下所示更新它：

```typescript
@@filename(auth.controller)
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: Record<string, any>) {
    return this.authService.signIn(signInDto.username, signInDto.password);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
```

我们将刚刚创建的 `AuthGuard` 应用于 `GET /profile` 路由，使其受到保护。

确保应用程序正在运行，并使用 `cURL` 测试路由。

```bash
$ # GET 请求 /profile
$ curl http://localhost:3000/auth/profile
{"statusCode":401,"message":"Unauthorized"}

$ # POST 请求 /auth/login
$ curl -X POST http://localhost:3000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"
{"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vybm..."}

$ # 使用上一步返回的 access_token 作为 bearer 码 GET 请求 /profile
$ curl http://localhost:3000/auth/profile -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vybm..."
{"sub":1,"username":"john","iat":...,"exp":...}
```

请注意，在 `AuthModule` 中，我们将 JWT 的过期时间配置为 `60 秒`。这确实太短了，处理令牌过期和刷新的细节超出了本文的范围。但是，我们选择这样做是为了演示 JWT 的一个重要特性。如果您在身份验证后等待 60 秒再尝试 `GET /auth/profile` 请求，您将收到 `401 Unauthorized` 响应。这是因为 `@nestjs/jwt` 会自动检查 JWT 的过期时间，省去了您在应用程序中这样做的麻烦。

我们现在已经完成了 JWT 身份验证的实现。JavaScript 客户端（例如 Angular/React/Vue）和其他 JavaScript 应用现在可以安全地通过身份验证并与我们的 API 服务器进行通信。

#### 全局启用身份验证

如果绝大多数端点默认都应受到保护，您可以将身份验证守卫注册为[全局守卫](/guards#binding-guards)，而不必在每个控制器顶部使用 `@UseGuards()` 装饰器，只需标记哪些路由应该是公开的即可。

首先，使用以下结构（在任何模块中，例如在 `AuthModule` 中）将 `AuthGuard` 注册为全局守卫：

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: AuthGuard,
  },
],
```

这样设置后，Nest 将自动将 `AuthGuard` 绑定到所有端点。

现在，我们必须提供一种机制来声明哪些路由是公开的。为此，我们可以使用 `SetMetadata` 装饰器工厂函数创建一个自定义装饰器。

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

在上面的文件中，我们导出了两个常量。一个是我们的元数据键，名为 `IS_PUBLIC_KEY`；另一个是我们将称为 `Public` 的新装饰器本身（您也可以将其命名为 `SkipAuth` 或 `AllowAnon`，只要适合您的项目即可）。

现在我们有了自定义的 `@Public()` 装饰器，我们可以用它来装饰任何方法，如下所示：

```typescript
@Public()
@Get()
findAll() {
  return [];
}
```

最后，我们需要 `AuthGuard` 在找到 `"isPublic"` 元数据时返回 `true`。为此，我们将使用 `Reflector` 类（更多信息请阅读[此处](/guards#putting-it-all-together)）。

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // 💡 查看这个条件
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      // 💡 这里用于验证 payload 的 JWT 秘钥
      // 是在 JwtModule 中传递的秘钥
      const payload = await this.jwtService.verifyAsync(token);
      // 💡 我们在这里将 payload 赋值给请求对象
      // 以便我们可以在路由处理程序中访问它
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

#### Passport 集成

[Passport](https://github.com/jaredhanson/passport) 是最流行的 node.js 身份验证库，受到社区的广泛认可，并已成功应用于许多生产应用中。使用 `@nestjs/passport` 模块可以轻松地将此库与 **Nest** 应用程序集成。

要了解如何将 Passport 与 NestJS 集成，请查看此[章节](/recipes/passport)。

#### 示例

您可以在[此处](https://github.com/nestjs/nest/tree/master/sample/19-auth-jwt)找到本章代码的完整版本。
