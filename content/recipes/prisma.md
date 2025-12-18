### Prisma

[Prisma](https://www.prisma.io) 是一个用于 Node.js 和 TypeScript 的[开源](https://github.com/prisma/prisma) ORM。它被用作编写原始 SQL 或使用其他数据库访问工具（如 SQL 查询构建器（[knex.js](https://knexjs.org/)）或 ORM（如 [TypeORM](https://typeorm.io/) 和 [Sequelize](https://sequelize.org/)））的**替代**方案。Prisma 目前支持 PostgreSQL、MySQL、SQL Server、SQLite、MongoDB 和 CockroachDB（[预览版](https://www.prisma.io/docs/orm/reference/supported-databases)）。

虽然 Prisma 可以与纯 JavaScript 一起使用，但它拥抱 TypeScript，并提供了一种类型安全级别，超越了 TypeScript 生态系统中其他 ORM 所能提供的保证。你可以在此[此处](https://www.prisma.io/docs/orm/more/comparisons/prisma-and-typeorm#type-safety)找到关于 Prisma 和 TypeORM 类型安全保证的深入比较。

> info **注意** 如果你想快速了解 Prisma 的工作原理，可以按照 [快速入门](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/prisma-postgres) 或阅读[文档](https://www.prisma.io/docs)中的 [介绍](https://www.prisma.io/docs/orm/overview/introduction/what-is-prisma) 部分。在 [`prisma-examples`](https://github.com/prisma/prisma-examples/) 仓库中也有现成的 [REST](https://github.com/prisma/prisma-examples/tree/b53fad046a6d55f0090ddce9fd17ec3f9b95cab3/orm/nest) 和 [GraphQL](https://github.com/prisma/prisma-examples/tree/b53fad046a6d55f0090ddce9fd17ec3f9b95cab3/orm/nest-graphql) 示例。

#### 入门

在本教程中，你将学习如何从零开始使用 NestJS 和 Prisma。你将构建一个示例 NestJS 应用程序，该应用程序具有一个可以读取和写入数据库中数据的 REST API。

出于本指南的目的，你将使用一个 [SQLite](https://sqlite.org/) 数据库，以避免设置数据库服务器的开销。请注意，即使你使用的是 PostgreSQL 或 MySQL，你仍然可以遵循本指南——你会在适当的位置获得使用这些数据库的额外说明。

> info **注意** 如果你已经有一个现有项目并考虑迁移到 Prisma，可以按照 [将 Prisma 添加到现有项目](https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project-typescript-postgres) 的指南操作。如果你正在从 TypeORM 迁移，可以阅读 [从 TypeORM 迁移到 Prisma](https://www.prisma.io/docs/guides/migrate-from-typeorm) 指南。

#### 创建你的 NestJS 项目

首先，安装 NestJS CLI 并使用以下命令创建你的应用程序骨架：

```bash
$ npm install -g @nestjs/cli
$ nest new hello-prisma
```

请参阅 [第一步](https://docs.nestjs.com/first-steps) 页面以了解有关此命令创建的项目文件的更多信息。另请注意，你现在可以运行 `npm start` 来启动你的应用程序。运行在 `http://localhost:3000/` 的 REST API 目前提供了一个在 `src/app.controller.ts` 中实现的单个路由。在本指南的过程中，你将实现额外的路由来存储和检索关于*用户*和*帖子*的数据。

#### 设置 Prisma

首先，在你的项目中安装 Prisma CLI 作为开发依赖项：

```bash
$ cd hello-prisma
$ npm install prisma --save-dev
```

在以下步骤中，我们将使用 [Prisma CLI](https://www.prisma.io/docs/orm/tools/prisma-cli)。作为最佳实践，建议通过前缀 `npx` 在本地调用 CLI：

```bash
$ npx prisma
```

<details><summary>如果你使用 Yarn，请展开</summary>

如果你使用 Yarn，则可以按如下方式安装 Prisma CLI：

```bash
$ yarn add prisma --dev
```

安装后，你可以通过前缀 `yarn` 来调用它：

```bash
$ yarn prisma
```

</details>

现在使用 Prisma CLI 的 `init` 命令创建你的初始 Prisma 设置：

```bash
$ npx prisma init
```

此命令创建一个新的 `prisma` 目录，其中包含以下内容：

- `schema.prisma`：指定你的数据库连接并包含数据库模式
- `prisma.config.ts`：你的项目配置文件
- `.env`：一个 [dotenv](https://github.com/motdotla/dotenv) 文件，通常用于在一组环境变量中存储你的数据库凭证

#### 设置生成器输出路径

通过在 prisma init 期间传递 `--output ../src/generated/prisma` 或直接在 Prisma 模式中指定，来指定生成的 Prisma 客户端的输出 `path`：

```groovy
generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma"
}
```

#### 配置模块格式

将生成器中的 `moduleFormat` 设置为 `cjs`：

```groovy
generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma"
  moduleFormat    = "cjs"
}
```

> info **注意** `moduleFormat` 配置是必需的，因为 Prisma v7 默认作为 ES 模块提供，这与 NestJS 的 CommonJS 设置不兼容。将 `moduleFormat` 设置为 `cjs` 会强制 Prisma 生成 CommonJS 模块而不是 ESM。

#### 设置数据库连接

你的数据库连接在 `schema.prisma` 文件中的 `datasource` 块中配置。默认情况下，它设置为 `postgresql`，但由于在本指南中你使用的是 SQLite 数据库，你需要将 `datasource` 块的 `provider` 字段调整为 `sqlite`：

```groovy
datasource db {
  provider = "sqlite"
}

generator client {
  provider      = "prisma-client"
  output        = "../src/generated/prisma"
  moduleFormat  = "cjs"
}
```

现在，打开 `.env` 并将 `DATABASE_URL` 环境变量调整如下：

```bash
DATABASE_URL="file:./dev.db"
```

确保你已配置 [ConfigModule](https://docs.nestjs.com/techniques/configuration)，否则 `DATABASE_URL` 变量将不会从 `.env` 中获取。

SQLite 数据库是简单的文件；使用 SQLite 数据库不需要服务器。因此，与其配置一个包含*主机*和*端口*的连接 URL，不如直接指向一个本地文件，本例中称为 `dev.db`。该文件将在下一步创建。

<details><summary>如果你使用 PostgreSQL、MySQL、MsSQL 或 Azure SQL，请展开</summary>

对于 PostgreSQL 和 MySQL，你需要将连接 URL 配置为指向*数据库服务器*。你可以在此处[此处](https://www.prisma.io/docs/reference/database-reference/connection-urls)了解有关所需连接 URL 格式的更多信息。

**PostgreSQL**

如果你使用 PostgreSQL，你必须按如下方式调整 `schema.prisma` 和 `.env` 文件：

**`schema.prisma`**

```groovy
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client"
  output          = "../src/generated/prisma"
  moduleFormat  = "cjs"
}
```

**`.env`**

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA"
```

将所有大写的占位符替换为你的数据库凭据。请注意，如果你不确定为 `SCHEMA` 占位符提供什么，很可能就是默认值 `public`：

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

如果你想了解如何设置 PostgreSQL 数据库，可以按照此指南在 [Heroku 上设置免费的 PostgreSQL 数据库](https://dev.to/prisma/how-to-setup-a-free-postgresql-database-on-heroku-1dc1)。

**MySQL**

如果你使用 MySQL，你必须按如下方式调整 `schema.prisma` 和 `.env` 文件：

**`schema.prisma`**

```groovy
datasource db {
  provider = "mysql"
}

generator client {
  provider = "prisma-client"
  output          = "../src/generated/prisma"
  moduleFormat  = "cjs"
}
```

**`.env`**

```bash
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

将所有大写的占位符替换为你的数据库凭据。

**Microsoft SQL Server / Azure SQL Server**

如果你使用 Microsoft SQL Server 或 Azure SQL Server，你必须按如下方式调整 `schema.prisma` 和 `.env` 文件：

**`schema.prisma`**

```groovy
datasource db {
  provider = "sqlserver"
}

generator client {
  provider = "prisma-client"
  output          = "../src/generated/prisma"
  moduleFormat  = "cjs"
}
```

**`.env`**

将所有大写的占位符替换为你的数据库凭据。请注意，如果你不确定为 `encrypt` 占位符提供什么，很可能就是默认值 `true`：

```bash
DATABASE_URL="sqlserver://HOST:PORT;database=DATABASE;user=USER;password=PASSWORD;encrypt=true"
```

</details>

#### 使用 Prisma Migrate 创建两个数据库表

在本节中，你将使用 [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate/getting-started) 在数据库中创建两个新表。Prisma Migrate 根据 Prisma 模式中的声明性数据模型定义生成 SQL 迁移文件。这些迁移文件是完全可定制的，以便你可以配置底层数据库的任何附加功能或包含额外的命令，例如用于数据种子填充。

将以下两个模型添加到你的 `schema.prisma` 文件中：

```groovy
model User {
  id    Int     @default(autoincrement()) @id
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int      @default(autoincrement()) @id
  title     String
  content   String?
  published Boolean? @default(false)
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
}
```

设置好 Prisma 模型后，你可以生成 SQL 迁移文件并对数据库运行它们。在终端中运行以下命令：

```bash
$ npx prisma migrate dev --name init
```

此 `prisma migrate dev` 命令会生成 SQL 文件并直接对数据库运行它们。在这种情况下，在现有的 `prisma` 目录中创建了以下迁移文件：

```bash
$ tree prisma
prisma
├── dev.db
├── migrations
│   └── 20201207100915_init
│       └── migration.sql
└── schema.prisma
```

<details><summary>展开以查看生成的 SQL 语句</summary>

在你的 SQLite 数据库中创建了以下表：

```sql
-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT
);

-- CreateTable
CREATE TABLE "Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published" BOOLEAN DEFAULT false,
    "authorId" INTEGER,

    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User.email_unique" ON "User"("email");
```

</details>

#### 安装并生成 Prisma Client

Prisma Client 是一个类型安全的数据库客户端，它是根据你的 Prisma 模型定义*生成*的。由于这种方法，Prisma Client 可以暴露专门为你的模型*定制*的 [CRUD](https://www.prisma.io/docs/orm/prisma-client/queries/crud) 操作。

要在项目中安装 Prisma Client，请在终端中运行以下命令：

```bash
$ npm install @prisma/client
```

安装后，你可以运行 generate 命令来生成项目所需的类型和客户端。如果对模式进行了任何更改，你将需要重新运行 `generate` 命令以保持这些类型的同步。

```bash
$ npx prisma generate
```

除了 Prisma Client，你还需要为你正在使用的数据库类型安装一个驱动适配器。对于 SQLite，你可以安装 `@prisma/adapter-better-sqlite3` 驱动。

```bash
npm install @prisma/adapter-better-sqlite3
```

<details> <summary>如果你使用 PostgreSQL、MySQL、MsSQL 或 AzureSQL，请展开</summary>

- 对于 PostgreSQL

```bash
npm install @prisma/adapter-pg
```

- 对于 MySQL、MsSQL、AzureSQL：

```bash
npm install @prisma/adapter-mariadb`
```

</details>

#### 在 NestJS 服务中使用 Prisma Client

现在你能够使用 Prisma Client 发送数据库查询。如果你想了解更多关于使用 Prisma Client 构建查询的信息，请查看 [API 文档](https://www.prisma.io/docs/orm/reference/prisma-client-reference)。

设置 NestJS 应用程序时，你希望将 Prisma Client API 抽象到服务内的数据库查询中。要开始，你可以创建一个新的 `PrismaService`，负责实例化 `PrismaClient` 并连接到数据库。

在 `src` 目录内，创建一个名为 `prisma.service.ts` 的新文件，并向其中添加以下代码：

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from './generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
    super({ adapter });
  }
}
```

接下来，你可以编写服务，用于从 Prisma 模式中为 `User` 和 `Post` 模型进行数据库调用。

仍在 `src` 目录内，创建一个名为 `user.service.ts` 的新文件，并向其中添加以下代码：

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { User, Prisma } from 'generated/prisma';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async user(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return this.prisma.user.update({
      data,
      where,
    });
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({
      where,
    });
  }
}
```

请注意，你如何使用 Prisma Client 生成的类型来确保你的服务所公开的方法具有正确的类型。因此，你节省了为模型键入类型和创建额外的接口或 DTO 文件的样板工作。

现在对 `Post` 模型执行相同的操作。

仍在 `src` 目录内，创建一个名为 `post.service.ts` 的新文件，并向其中添加以下代码：

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Post, Prisma } from 'generated/prisma';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async post(
    postWhereUniqueInput: Prisma.PostWhereUniqueInput,
  ): Promise<Post | null> {
    return this.prisma.post.findUnique({
      where: postWhereUniqueInput,
    });
  }

  async posts(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.PostWhereUniqueInput;
    where?: Prisma.PostWhereInput;
    orderBy?: Prisma.PostOrderByWithRelationInput;
  }): Promise<Post[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.post.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createPost(data: Prisma.PostCreateInput): Promise<Post> {
    return this.prisma.post.create({
      data,
    });
  }

  async updatePost(params: {
    where: Prisma.PostWhereUniqueInput;
    data: Prisma.PostUpdateInput;
  }): Promise<Post> {
    const { data, where } = params;
    return this.prisma.post.update({
      data,
      where,
    });
  }

  async deletePost(where: Prisma.PostWhereUniqueInput): Promise<Post> {
    return this.prisma.post.delete({
      where,
    });
  }
}
```

你的 `UsersService` 和 `PostsService` 目前封装了 Prisma Client 中可用的 CRUD 查询。在真实世界的应用程序中，服务也是为应用程序添加业务逻辑的地方。例如，你可以在 `UsersService` 中有一个名为 `updatePassword` 的方法，负责更新用户的密码。

记得在应用模块中注册新的服务。

##### 在主应用控制器中实现 REST API 路由

最后，你将使用前面章节中创建的服务来实现应用程序的不同路由。出于本指南的目的，你将把所有路由都放到现有的 `AppController` 类中。

将 `app.controller.ts` 文件的内容替换为以下代码：

```typescript
import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { UsersService } from './user.service';
import { PostsService } from './post.service';
import { User as UserModel, Post as PostModel } from 'generated/prisma';

@Controller()
export class AppController {
  constructor(
    private readonly userService: UsersService,
    private readonly postService: PostsService,
  ) {}

  @Get('post/:id')
  async getPostById(@Param('id') id: string): Promise<PostModel> {
    return this.postService.post({ id: Number(id) });
  }

  @Get('feed')
  async getPublishedPosts(): Promise<PostModel[]> {
    return this.postService.posts({
      where: { published: true },
    });
  }

  @Get('filtered-posts/:searchString')
  async getFilteredPosts(
    @Param('searchString') searchString: string,
  ): Promise<PostModel[]> {
    return this.postService.posts({
      where: {
        OR: [
          {
            title: { contains: searchString },
          },
          {
            content: { contains: searchString },
          },
        ],
      },
    });
  }

  @Post('post')
  async createDraft(
    @Body() postData: { title: string; content?: string; authorEmail: string },
  ): Promise<PostModel> {
    const { title, content, authorEmail } = postData;
    return this.postService.createPost({
      title,
      content,
      author: {
        connect: { email: authorEmail },
      },
    });
  }

  @Post('user')
  async signupUser(
    @Body() userData: { name?: string; email: string },
  ): Promise<UserModel> {
    return this.userService.createUser(userData);
  }

  @Put('publish/:id')
  async publishPost(@Param('id') id: string): Promise<PostModel> {
    return this.postService.updatePost({
      where: { id: Number(id) },
      data: { published: true },
    });
  }

  @Delete('post/:id')
  async deletePost(@Param('id') id: string): Promise<PostModel> {
    return this.postService.deletePost({ id: Number(id) });
  }
}
```

该控制器实现了以下路由：

###### `GET`

- `/post/:id`：通过 `id` 获取单个帖子
- `/feed`：获取所有*已发布*的帖子
- `/filter-posts/:searchString`：按 `title` 或 `content` 过滤帖子

###### `POST`

- `/post`：创建新帖子
  - 请求体：
    - `title: String` (必填)：帖子标题
    - `content: String` (可选)：帖子内容
    - `authorEmail: String` (必填)：创建帖子的用户电子邮件
- `/user`：创建新用户
  - 请求体：
    - `email: String` (必填)：用户的电子邮件地址
    - `name: String` (可选)：用户的名称

###### `PUT`

- `/publish/:id`：通过 `id` 发布帖子

###### `DELETE`

- `/post/:id`：通过 `id` 删除帖子

#### 总结

在本教程中，你学习了如何将 Prisma 与 NestJS 结合使用来实现 REST API。实现 API 路由的控制器调用 `PrismaService`，而后者又使用 Prisma Client 向数据库发送查询以满足传入请求的数据需求。

如果你想了解更多关于将 NestJS 与 Prisma 结合使用的信息，请务必查看以下资源：

- [NestJS & Prisma](https://www.prisma.io/nestjs)
- [REST & GraphQL 的现成示例项目](https://github.com/prisma/prisma-examples/)
- [生产就绪的入门套件](https://github.com/notiz-dev/nestjs-prisma-starter#instructions)
- [视频：使用 NestJS 和 Prisma 访问数据库 (5分钟)](https://www.youtube.com/watch?v=UlVJ340UEuk&ab_channel=Prisma) 作者 [Marc Stammerjohann](https://github.com/marcjulian)
