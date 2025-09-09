### SQL (TypeORM)

##### 本章节仅适用于 TypeScript

> **警告** 在本文中，您将学习如何基于 **TypeORM** 包，使用自定义提供者机制从零开始创建 `DatabaseModule`。因此，这个解决方案包含了很多您可以通过使用现成的、开箱即用的专用 `@nestjs/typeorm` 包来避免的额外工作。了解更多信息，请参阅[这里](/techniques/sql)。

[TypeORM](https://github.com/typeorm/typeorm) 无疑是 Node.js 世界中最成熟的对象关系映射器（ORM）。由于它是用 TypeScript 编写的，因此与 Nest 框架配合得非常好。

#### 开始使用

要开始使用这个库，我们必须安装所有必需的依赖项：

```bash
$ npm install --save typeorm mysql2
```

我们需要做的第一步是使用从 `typeorm` 包导入的 `new DataSource().initialize()` 类来建立与数据库的连接。`initialize()` 函数返回一个 `Promise`，因此我们必须创建一个[异步提供者](/fundamentals/async-components)。

```typescript
@@filename(database.providers)
import { DataSource } from 'typeorm';

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async () => {
      const dataSource = new DataSource({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'root',
        database: 'test',
        entities: [
            __dirname + '/../**/*.entity{.ts,.js}',
        ],
        synchronize: true,
      });

      return dataSource.initialize();
    },
  },
];
```

> 警告 **警告** 在生产环境中不应使用 `synchronize: true` —— 否则可能会丢失生产数据。

> 提示 **提示** 遵循最佳实践，我们在单独的文件中声明了自定义提供者，该文件具有 `*.providers.ts` 后缀。

然后，我们需要导出这些提供者，以便应用程序的其余部分可以**访问**它们。

```typescript
@@filename(database.module)
import { Module } from '@nestjs/common';
import { databaseProviders } from './database.providers';

@Module({
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
```

现在我们可以使用 `@Inject()` 装饰器注入 `DATA_SOURCE` 对象。每个依赖于 `DATA_SOURCE` 异步提供者的类将等待 `Promise` 被解析。

#### 仓库模式

[TypeORM](https://github.com/typeorm/typeorm) 支持仓库设计模式，因此每个实体都有自己的仓库。这些仓库可以从数据库连接中获取。

但首先，我们至少需要一个实体。我们将重用官方文档中的 `Photo` 实体。

```typescript
@@filename(photo.entity)
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Photo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 500 })
  name: string;

  @Column('text')
  description: string;

  @Column()
  filename: string;

  @Column('int')
  views: number;

  @Column()
  isPublished: boolean;
}
```

`Photo` 实体属于 `photo` 目录。该目录代表 `PhotoModule`。现在，让我们创建一个**仓库**提供者：

```typescript
@@filename(photo.providers)
import { DataSource } from 'typeorm';
import { Photo } from './photo.entity';

export const photoProviders = [
  {
    provide: 'PHOTO_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Photo),
    inject: ['DATA_SOURCE'],
  },
];
```

> 警告 **警告** 在实际应用中，应避免使用**魔术字符串**。`PHOTO_REPOSITORY` 和 `DATA_SOURCE` 都应保存在单独的 `constants.ts` 文件中。

现在我们可以使用 `@Inject()` 装饰器将 `Repository<Photo>` 注入到 `PhotoService` 中：

```typescript
@@filename(photo.service)
import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Photo } from './photo.entity';

@Injectable()
export class PhotoService {
  constructor(
    @Inject('PHOTO_REPOSITORY')
    private photoRepository: Repository<Photo>,
  ) {}

  async findAll(): Promise<Photo[]> {
    return this.photoRepository.find();
  }
}
```

数据库连接是**异步的**，但 Nest 使这个过程对最终用户完全不可见。`PhotoRepository` 正在等待数据库连接，而 `PhotoService` 会延迟到仓库准备就绪。整个应用程序可以在每个类实例化时启动。

以下是最终的 `PhotoModule`：

```typescript
@@filename(photo.module)
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { photoProviders } from './photo.providers';
import { PhotoService } from './photo.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    ...photoProviders,
    PhotoService,
  ],
})
export class PhotoModule {}
```

> 提示 **提示** 不要忘记将 `PhotoModule` 导入到根 `AppModule` 中。