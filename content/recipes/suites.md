### Suites 测试框架

[Suites](https://suites.dev) 是一个用于 TypeScript 依赖注入框架的[开源](https://github.com/suites-dev/suites)单元测试框架。它被用作**替代**手动创建模拟对象、编写冗长的多模拟配置测试设置，或者使用非类型化的测试替身（如模拟对象和桩函数）的方案。

Suites 在运行时读取 NestJS 服务的元数据，并自动为所有依赖生成完全类型化的模拟对象。
这消除了模拟对象设置的样板代码，并确保了类型安全的测试。虽然 Suites 可以与 `Test.createTestingModule()` 一起使用，但它在聚焦的单元测试方面表现突出。
当需要验证模块连接、装饰器、守卫和拦截器时，请使用 `Test.createTestingModule()`。
当需要进行快速单元测试并自动生成模拟对象时，请使用 Suites。

有关基于模块的测试的更多信息，请参阅 [测试基础章节](/fundamentals/testing)。

> info **注意** `Suites` 是一个第三方包，不由 NestJS 核心团队维护。请将任何问题报告到[相应的代码仓库](https://github.com/suites-dev/suites)。

#### 快速开始

本指南演示了如何使用 Suites 测试 NestJS 服务。它涵盖了隔离测试（所有依赖项都被模拟）和社交测试（使用选定的真实实现）两种方式。

#### 安装 Suites

确保已安装 NestJS 运行时依赖：

```bash
$ npm install @nestjs/common @nestjs/core reflect-metadata
```

安装 Suites 核心库、NestJS 适配器和测试替身适配器：

```bash
$ npm install --save-dev @suites/unit @suites/di.nestjs @suites/doubles.jest
```

测试替身适配器 (`@suites/doubles.jest`) 提供了对 Jest 模拟功能的封装。它暴露了 `mock()` 和 `stub()` 函数来创建类型安全的测试替身。

确保 Jest 和 TypeScript 可用：

```bash
$ npm install --save-dev ts-jest @types/jest jest typescript
```

<details><summary>如果使用 Vitest，请展开</summary>

```bash
$ npm install --save-dev @suites/unit @suites/di.nestjs @suites/doubles.vitest
```

</details>

<details><summary>如果使用 Sinon，请展开</summary>

```bash
$ npm install --save-dev @suites/unit @suites/di.nestjs @suites/doubles.sinon
```

</details>

#### 设置类型定义

在项目根目录创建 `global.d.ts` 文件：

```typescript
/// <reference types="@suites/doubles.jest/unit" />
/// <reference types="@suites/di.nestjs/types" />
```

#### 创建一个示例服务

本指南使用一个具有两个依赖项的简单 `UserService`：

```typescript
@@filename(user.repository)
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserRepository {
  async findById(id: string): Promise<User | null> {
    // 数据库查询
  }

  async save(user: User): Promise<User> {
    // 数据库保存
  }
}
```
```typescript
@@filename(user.service)
import { Injectable, NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(
    private repository: UserRepository,
    private logger: Logger,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    this.logger.log(`Found user ${id}`);
    return user;
  }

  async create(email: string, name: string): Promise<User> {
    const user = { id: generateId(), email, name };
    await this.repository.save(user);
    this.logger.log(`Created user ${user.id}`);
    return user;
  }
}
```

#### 编写单元测试

使用 `TestBed.solitary()` 来创建所有依赖都被模拟的隔离测试：

```typescript
@@filename(user.service.spec)
import { TestBed, type Mocked } from '@suites/unit';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { Logger } from '@nestjs/common';

describe('用户服务单元测试', () => {
  let userService: UserService;
  let repository: Mocked<UserRepository>;
  let logger: Mocked<Logger>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(UserService).compile();

    userService = unit;
    repository = unitRef.get(UserRepository);
    logger = unitRef.get(Logger);
  });

  it('应该通过ID查找用户', async () => {
    const user = { id: '1', email: 'test@example.com', name: '测试' };
    repository.findById.mockResolvedValue(user);

    const result = await userService.findById('1');

    expect(result).toEqual(user);
    expect(logger.log).toHaveBeenCalled();
  });
});
```

`TestBed.solitary()` 会分析构造函数并为所有依赖项创建类型化的模拟对象。
`Mocked<T>` 类型为模拟配置提供了智能感知支持。

#### 预编译模拟配置

在编译前使用 `.mock().impl()` 配置模拟行为：

```typescript
@@filename(user.service.spec)
import { TestBed } from '@suites/unit';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

describe('用户服务单元测试 - 预配置', () => {
  let unit: UserService;
  let repository: Mocked<UserRepository>;
  
  beforeAll(async () => {
    const { unit: underTest, unitRef } = await TestBed.solitary(UserService)
      .mock(UserRepository)
      .impl(stubFn => ({
        findById: stubFn().mockResolvedValue({ id: '1', email: 'test@example.com', name: '测试' })
      }))
      .compile();
    
    repository = unitRef.get(UserRepository);
    unit = underTest;
  })
  
  it('应该使用预配置的模拟查找用户', async () => {
    const result = await unit.findById('1');
    
    expect(repository.findById).toHaveBeenCalled();
    expect(result.email).toBe('test@example.com');
  });
});
```

`stubFn` 参数对应于已安装的测试替身适配器（对于 Jest 是 `jest.fn()`，对于 Vitest 是 `vi.fn()`，对于 Sinon 是 `sinon.stub()`）。

#### 使用真实依赖进行测试

使用 `TestBed.sociable()` 和 `.expose()` 来为特定依赖项使用真实实现：

```typescript
@@filename(user.service.spec)
import { TestBed, Mocked } from '@suites/unit';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { Logger } from '@nestjs/common';

describe('UserService - 使用真实日志记录器', () => {
  let userService: UserService;
  let repository: Mocked<UserRepository>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.sociable(UserService)
      .expose(Logger)
      .compile();

    userService = unit;
    repository = unitRef.get(UserRepository);
  });

  it('应该在查找用户时记录日志', async () => {
    const user = { id: '1', email: 'test@example.com' };
    repository.findById.mockResolvedValue(user);

    await userService.findById('1');

    // Logger 实际执行，无需模拟
  });
});
```

`.expose(Logger)` 使用 `Logger` 的真实实现来实例化它，同时保持其他依赖项被模拟。

#### 基于令牌的依赖项

Suites 处理自定义注入令牌（字符串或符号）：

```typescript
@@filename(config.service)
import { Injectable, Inject } from '@nestjs/common';

export const CONFIG_OPTIONS = 'CONFIG_OPTIONS';

@Injectable()
export class ConfigService {
  constructor(
    @Inject(CONFIG_OPTIONS) private options: { apiKey: string },
  ) {}

  getApiKey(): string {
    return this.options.apiKey;
  }
}
```

使用 `unitRef.get()` 访问基于令牌的依赖项：

```typescript
@@filename(config.service.spec)
import { TestBed } from '@suites/unit';
import { ConfigService, CONFIG_OPTIONS, ConfigOptions } from './config.service';

describe('配置服务单元测试', () => {
  let configService: ConfigService;
  let options: ConfigOptions;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(ConfigService).compile();
    configService = unit;

    options = unitRef.get<ConfigOptions>(CONFIG_OPTIONS);
  });

  it('应该返回 API 密钥', () => { ... });
});
```

#### 直接使用 mock() 和 stub()

对于更喜欢直接控制而不使用 `TestBed` 的用户，测试替身适配器包提供了 `mock()` 和 `stub()` 函数：

```typescript
@@filename(user.service.spec)
import { mock } from '@suites/unit';
import { UserRepository } from './user.repository';

describe('用户服务单元测试', () => {
  it('应该可以与直接模拟对象一起工作', async () => {
    const repository = mock<UserRepository>();
    const logger = mock<Logger>();

    const service = new UserService(repository, logger);

    // ...
  });
});
```

`mock()` 创建一个类型化的模拟对象，而 `stub()` 封装了底层的模拟库（本例中是 Jest），以提供像 `mockResolvedValue()` 这样的方法。
这些函数来自已安装的测试替身适配器 (`@suites/doubles.jest`)，它适配了测试框架的原生模拟能力。

> info **提示** `mock()` 函数是 `@golevelup/ts-jest` 中 `createMock` 的替代方案。两者都创建类型化的模拟对象。有关 `createMock` 的更多信息，请参阅 [测试基础章节](/fundamentals/testing#auto-mocking)。

#### 总结

**在以下情况下使用 `Test.createTestingModule()`：**
- 验证模块配置和提供者连接
- 测试装饰器、守卫、拦截器和管道
- 验证跨模块的依赖注入
- 使用中间件测试完整的应用上下文

**在以下情况下使用 Suites：**
- 专注于业务逻辑的快速单元测试
- 为多个依赖项自动生成模拟对象
- 具有智能感知的类型安全测试替身

按目的组织测试：使用 Suites 进行验证单个服务行为的单元测试，使用 `Test.createTestingModule()` 进行验证模块配置的集成测试。

更多信息：
- [Suites 文档](https://suites.dev/docs)
- [Suites GitHub 仓库](https://github.com/suites-dev/suites)
- [NestJS 测试文档](/fundamentals/testing)
