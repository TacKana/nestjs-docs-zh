### CRUD 生成器（仅限 TypeScript）

在项目的整个生命周期中，当我们构建新功能时，通常需要向应用程序添加新的资源。这些资源通常需要执行多个重复的操作，每次定义新资源时我们都必须重复这些操作。

#### 简介

让我们设想一个真实场景，需要为两个实体（例如**用户**和**产品**实体）暴露 CRUD 端点。
遵循最佳实践，我们需要为每个实体执行以下操作：

- 生成模块（`nest g mo`）以保持代码组织有序并建立清晰的边界（将相关组件分组）
- 生成控制器（`nest g co`）以定义 CRUD 路由（或 GraphQL 应用的查询/变更）
- 生成服务（`nest g s`）以实现和隔离业务逻辑
- 生成实体类/接口以表示资源的数据结构
- 生成数据传输对象（或 GraphQL 应用的输入）以定义数据在网络中的传输方式

步骤繁多！

为加速这一重复过程，[Nest CLI](/cli/overview) 提供了一个生成器（原理图），可自动生成所有样板代码，帮助我们避免这些繁琐操作，极大简化开发体验。

> info **注意** 该原理图支持生成 **HTTP** 控制器、**微服务**控制器、**GraphQL** 解析器（代码优先和架构优先均可）以及 **WebSocket** 网关。

#### 生成新资源

要创建新资源，只需在项目根目录下运行以下命令：

```shell
$ nest g resource
```

`nest g resource` 命令不仅会生成所有 NestJS 构建块（模块、服务、控制器类），还会生成实体类、DTO 类以及测试（`.spec`）文件。

以下是生成的控制器文件（用于 REST API）：

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
```

此外，它还会自动为所有 CRUD 端点创建占位符（REST API 的路由、GraphQL 的查询和变更、微服务和 WebSocket 网关的消息订阅）——所有这些都无需动手操作。

> warning **注意** 生成的服务类**不**绑定任何特定的**ORM（或数据源）**。这使得生成器足够通用，可以满足任何项目的需求。默认情况下，所有方法都包含占位符，允许你根据项目特定的数据源进行填充。

同样，如果要为 GraphQL 应用生成解析器，只需选择 `GraphQL (code first)`（或 `GraphQL (schema first)`）作为传输层。

在这种情况下，NestJS 将生成解析器类而非 REST API 控制器：

```shell
$ nest g resource users

> ? What transport layer do you use? GraphQL (code first)
> ? Would you like to generate CRUD entry points? Yes
> CREATE src/users/users.module.ts (224 bytes)
> CREATE src/users/users.resolver.spec.ts (525 bytes)
> CREATE src/users/users.resolver.ts (1109 bytes)
> CREATE src/users/users.service.spec.ts (453 bytes)
> CREATE src/users/users.service.ts (625 bytes)
> CREATE src/users/dto/create-user.input.ts (195 bytes)
> CREATE src/users/dto/update-user.input.ts (281 bytes)
> CREATE src/users/entities/user.entity.ts (187 bytes)
> UPDATE src/app.module.ts (312 bytes)
```

> info **提示** 为避免生成测试文件，可以传递 `--no-spec` 标志，如下所示：`nest g resource users --no-spec`

从下方可以看出，不仅所有样板变更和查询都已创建，而且所有内容都已紧密连接。我们使用了 `UsersService`、`User` 实体以及我们的 DTO。

```typescript
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Mutation(() => User)
  createUser(@Args('createUserInput') createUserInput: CreateUserInput) {
    return this.usersService.create(createUserInput);
  }

  @Query(() => [User], { name: 'users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Query(() => User, { name: 'user' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.usersService.findOne(id);
  }

  @Mutation(() => User)
  updateUser(@Args('updateUserInput') updateUserInput: UpdateUserInput) {
    return this.usersService.update(updateUserInput.id, updateUserInput);
  }

  @Mutation(() => User)
  removeUser(@Args('id', { type: () => Int }) id: number) {
    return this.usersService.remove(id);
  }
}
```