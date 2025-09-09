### 认证

认证是大多数应用不可或缺的一部分。有许多不同的方法和策略来处理认证。所采用的方法取决于项目的具体应用需求。本章介绍了几种可以适应各种不同需求的认证方法。

让我们充实一下需求。对于这个用例，客户端将首先使用用户名和密码进行认证。一旦认证通过，服务器将颁发一个 JWT，该令牌可以在后续请求的授权头中作为 [承载令牌（bearer token）](https://tools.ietf.org/html/rfc6750) 发送，以证明认证。我们还将创建一个受保护的路由，只有包含有效 JWT 的请求才能访问。

我们将从第一个需求开始：认证用户。然后，我们将通过颁发 JWT 来扩展这个功能。最后，我们将创建一个受保护的路由，检查请求中是否包含有效的 JWT。

#### 创建认证模块

我们将首先生成一个 `AuthModule`，并在其中创建 `AuthService` 和 `AuthController`。我们将使用 `AuthService` 来实现认证逻辑，并使用 `AuthController` 来暴露认证端点。

```bash
$ nest g module auth
$ nest g controller auth
$ nest g service auth
```

在实现 `AuthService` 时，我们会发现将用户操作封装在 `UsersService` 中很有用，所以现在生成该模块和服务：

```bash
$ nest g module users
$ nest g service users
```

如下所示替换这些生成文件的默认内容。对于我们的示例应用，`UsersService` 仅维护一个硬编码的内存用户列表，以及一个通过用户名检索用户的方法。在实际应用中，这里应该使用你选择的库（例如 TypeORM、Sequelize、Mongoose 等）来构建用户模型和持久层。

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

在 `UsersModule` 中，唯一需要的更改是将 `UsersService` 添加到 `@Module` 装饰器的导出数组中，以便在该模块外部可见（我们很快将在 `AuthService` 中使用它）。

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

#### 实现“登录”端点

我们的 `AuthService` 负责检索用户并验证密码。我们为此创建一个 `signIn()` 方法。在下面的代码中，我们使用方便的 ES6 扩展运算符在返回用户对象之前剥离密码属性。这是在返回用户对象时的常见做法，因为你不希望暴露敏感字段如密码或其他安全密钥。

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
    // TODO: 生成 JWT 并在此处返回
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
    // TODO: 生成 JWT 并在此处返回
    // 而不是返回用户对象
    return result;
  }
}
```

> 警告 **警告** 当然，在实际应用中，你不会以明文存储密码。你应该使用像 [bcrypt](https://github.com/kelektiv/node.bcrypt.js#readme) 这样的库，配合加盐的单向哈希算法。采用这种方法，你只存储哈希后的密码，然后将存储的密码与 **传入** 密码的哈希版本进行比较，从而永远不会以明文存储或暴露用户密码。为了保持示例应用的简单性，我们违反了这个绝对要求，使用明文。**不要在你的真实应用中这样做！**

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

完成这些后，让我们打开 `AuthController` 并添加一个 `signIn()` 方法。客户端将调用此方法来认证用户。它将在请求体中接收用户名和密码，并在用户认证通过后返回一个 JWT 令牌。

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

> 信息 **提示** 理想情况下，我们应该使用 DTO 类来定义请求体的形状，而不是使用 `Record<string, any>` 类型。有关更多信息，请参阅 [验证](/techniques/validation) 章节。

<app-banner-courses-auth></app-banner-courses-auth>

#### JWT 令牌

我们准备继续处理认证系统的 JWT 部分。让我们回顾并完善我们的需求：

- 允许用户使用用户名/密码进行认证，返回一个 JWT，用于后续对受保护 API 端点的调用。我们已经很好地满足了这一要求。为了完成它，我们需要编写颁发 JWT 的代码。
- 创建基于有效 JWT 作为承载令牌存在的受保护 API 路由

我们需要安装一个额外的包来支持我们的 JWT 需求：

```bash
$ npm install --save @nestjs/jwt
```

> 信息 **提示** `@nestjs/jwt` 包（详见 [这里](https://github.com/nestjs/jwt)）是一个实用工具包，有助于 JWT 操作。包括生成和验证 JWT 令牌。

为了保持服务的模块化清晰，我们将在 `authService` 中处理 JWT 的生成。打开 `auth` 文件夹中的 `auth.service.ts` 文件，注入 `JwtService`，并更新 `signIn` 方法以生成 JWT 令牌，如下所示：

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
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
```

我们使用 `@nestjs/jwt` 库，它提供了一个 `signAsync()` 函数来从 `user` 对象属性的子集生成我们的 JWT，然后我们将其作为一个具有单个 `access_token` 属性的简单对象返回。注意：我们选择属性名 `sub` 来保存我们的 `userId` 值，以符合 JWT 标准。

我们现在需要更新 `AuthModule` 以导入新的依赖项并配置 `JwtModule`。

首先，在 `auth` 文件夹中创建 `constants.ts`，并添加以下代码：

```typescript
@@filename(auth/constants)
export const jwtConstants = {
  secret: 'DO NOT USE THIS VALUE. INSTEAD, CREATE A COMPLEX SECRET AND KEEP IT SAFE OUTSIDE OF THE SOURCE CODE.',
};
@@switch
export const jwtConstants = {
  secret: 'DO NOT USE THIS VALUE. INSTEAD, CREATE A COMPLEX SECRET AND KEEP IT SAFE OUTSIDE OF THE SOURCE CODE.',
};
```

我们将使用它在 JWT 签名和验证步骤之间共享我们的密钥。

> 警告 **警告** **不要公开暴露此密钥**。我们在这里这样做是为了明确代码的作用，但在生产系统中，**你必须使用适当的措施保护此密钥**，如密钥库、环境变量或配置服务。

现在，打开 `auth` 文件夹中的 `auth.module.ts` 并更新它，如下所示：

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

> 信息 **提示** 我们将 `JwtModule` 注册为全局模块以简化操作。这意味着我们不需要在应用程序的其他任何地方导入 `JwtModule`。

我们使用 `register()` 配置 `JwtModule`，传入一个配置对象。有关 Nest `JwtModule` 的更多信息，请参见 [这里](https://github.com/nestjs/jwt/blob/master/README.md)，有关可用配置选项的更多详细信息，请参见 [这里](https://github.com/auth0/node-jsonwebtoken#usage)。

让我们继续使用 cURL 再次测试我们的路由。你可以使用 `UsersService` 中硬编码的任何 `user` 对象进行测试。

```bash
$ # POST 到 /auth/login
$ curl -X POST http://localhost:3000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"
{"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
$ # 注意：上面的 JWT 被截断了
```

#### 实现认证守卫

我们现在可以解决我们的最终需求：通过要求请求中存在有效的 JWT 来保护端点。我们将通过创建一个 `AuthGuard` 来保护我们的路由。

```typescript
@@filename(auth/auth.guard)
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';
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
      const payload = await this.jwtService.verifyAsync(
        token,
        {
          secret: jwtConstants.secret
        }
      );
      // 💡 我们将 payload 赋值给请求对象 here
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

我们现在可以实现我们的受保护路由并注册我们的 `AuthGuard` 来保护它。

打开 `auth.controller.ts` 文件并更新它，如下所示：

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

我们将刚刚创建的 `AuthGuard` 应用到 `GET /profile` 路由，以便它受到保护。

确保应用正在运行，并使用 `cURL` 测试路由。

```bash
$ # GET /profile
$ curl http://localhost:3000/auth/profile
{"statusCode":401,"message":"Unauthorized"}

$ # POST /auth/login
$ curl -X POST http://localhost:3000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"
{"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vybm..."}

$ # GET /profile 使用上一步返回的 access_token 作为 bearer 代码
$ curl http://localhost:3000/auth/profile -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vybm..."
{"sub":1,"username":"john","iat":...,"exp":...}
```

请注意，在 `AuthModule` 中，我们将 JWT 配置为具有 `60 秒` 的过期时间。这个过期时间太短，处理令牌过期和刷新的细节超出了本文的范围。然而，我们选择这个是为了展示 JWT 的一个重要特性。如果你在认证后等待 60 秒再尝试 `GET /auth/profile` 请求，你将收到 `401 Unauthorized` 响应。这是因为 `@nestjs/jwt` 会自动检查 JWT 的过期时间，省去了你在应用程序中这样做的麻烦。

我们现在已经完成了 JWT 认证实现。JavaScript 客户端（如 Angular/React/Vue）和其他 JavaScript 应用现在可以安全地与我们的 API 服务器进行认证和通信。

#### 全局启用认证

如果你的大多数端点默认应该受到保护，你可以将认证守卫注册为 [全局守卫](/guards#binding-guards)，而不是在每个控制器上使用 `@UseGuards()` 装饰器，你可以简单地标记哪些路由应该是公开的。

首先，使用以下构造将 `AuthGuard` 注册为全局守卫（在任何模块中，例如在 `AuthModule` 中）：

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: AuthGuard,
  },
],
```

这样，Nest 会自动将 `AuthGuard` 绑定到所有端点。

现在我们必须提供一种机制来声明路由为公开路由。为此，我们可以使用 `SetMetadata` 装饰器工厂函数创建一个自定义装饰器。

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

在上面的文件中，我们导出了两个常量。一个是我们的元数据键，名为 `IS_PUBLIC_KEY`，另一个是我们将要调用的新装饰器本身 `Public`（你也可以将其命名为 `SkipAuth` 或 `AllowAnon`，只要适合你的项目）。

现在我们有了自定义的 `@Public()` 装饰器，我们可以用它来装饰任何方法，如下所示：

```typescript
@Public()
@Get()
findAll() {
  return [];
}
```

最后，我们需要 `AuthGuard` 在找到 `"isPublic"` 元数据时返回 `true`。为此，我们将使用 `Reflector` 类（更多信息请参见 [这里](/guards#putting-it-all-together)）。

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
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConstants.secret,
      });
      // 💡 我们将 payload 赋值给请求对象 here
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

[Passport](https://github.com/jaredhanson/passport) 是最流行的 node.js 认证库，被社区广泛知晓并在许多生产应用中成功使用。使用 `@nestjs/passport` 模块将这个库与 **Nest** 应用集成起来非常简单。

要了解如何将 Passport 与 NestJS 集成，请查看此 [章节](/recipes/passport)。

#### 示例

你可以在 [这里](https://github.com/nestjs/nest/tree/master/sample/19-auth-jwt) 找到本章代码的完整版本。