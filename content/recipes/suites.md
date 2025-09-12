### 套件（原 Automock）

套件（Suites）是一个兼具原则性与灵活性的测试元框架，专为提升后端系统软件测试体验而设计。通过整合多种测试工具到统一框架中，套件简化了可靠测试的创建过程，助力打造高质量软件。

> info **提示** `Suites` 是第三方包，并非由 NestJS 核心团队维护。如遇库相关问题，请提交至[对应代码库](https://github.com/suites-dev/suites)。

#### 引言

控制反转（Inversion of Control，IoC）是 NestJS 框架的核心原则，它支持模块化、可测试的架构。虽然 NestJS 提供了内置工具来创建测试模块，但套件提供了一种替代方案，强调测试隔离的单元或小范围单元组。套件使用虚拟容器管理依赖，自动生成模拟对象，无需在 IoC（或 DI）容器中手动替换每个提供者。这种方法可以替代或与 NestJS 的 `Test.createTestingModule` 方法结合使用，根据需求为单元测试提供更大灵活性。

#### 安装

要在 NestJS 中使用套件，请安装以下必要包：

```bash
$ npm i -D @suites/unit @suites/di.nestjs @suites/doubles.jest
```

> info **提示** `Suites` 同样支持 Vitest 和 Sinon 作为测试替身，分别对应 `@suites/doubles.vitest` 和 `@suites/doubles.sinon`。

#### 示例与模块设置

考虑一个 `CatsService` 的模块设置，包含 `CatsApiService`、`CatsDAL`、`HttpClient` 和 `Logger`。这将作为本指南中示例的基础：

```typescript
@@filename(cats.module)
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [HttpModule.register({ baseUrl: 'https://api.cats.com/' }), PrismaModule],
  providers: [CatsService, CatsApiService, CatsDAL, Logger],
  exports: [CatsService],
})
export class CatsModule {}
```

`HttpModule` 和 `PrismaModule` 都向宿主模块导出提供者。

让我们开始隔离测试 `CatsHttpService`。该服务负责从 API 获取猫的数据并记录操作。

```typescript
@@filename(cats-http.service)
@Injectable()
export class CatsHttpService {
  constructor(private httpClient: HttpClient, private logger: Logger) {}

  async fetchCats(): Promise<Cat[]> {
    this.logger.log('Fetching cats from the API');
    const response = await this.httpClient.get('/cats');
    return response.data;
  }
}
```

我们希望隔离 `CatsHttpService` 并模拟其依赖项 `HttpClient` 和 `Logger`。套件允许我们使用 `TestBed` 的 `.solitary()` 方法轻松实现这一点。

```typescript
@@filename(cats-http.service.spec)
import { TestBed, Mocked } from '@suites/unit';

describe('Cats Http Service Unit Test', () => {
  let catsHttpService: CatsHttpService;
  let httpClient: Mocked<HttpClient>;
  let logger: Mocked<Logger>;

  beforeAll(async () => {
    // 隔离 CatsHttpService 并模拟 HttpClient 和 Logger
    const { unit, unitRef } = await TestBed.solitary(CatsHttpService).compile();

    catsHttpService = unit;
    httpClient = unitRef.get(HttpClient);
    logger = unitRef.get(Logger);
  });

  it('should fetch cats from the API and log the operation', async () => {
    const catsFixtures: Cat[] = [{ id: 1, name: 'Catty' }, { id: 2, name: 'Mitzy' }];
    httpClient.get.mockResolvedValue({ data: catsFixtures });

    const cats = await catsHttpService.fetchCats();

    expect(logger.log).toHaveBeenCalledWith('Fetching cats from the API');
    expect(httpClient.get).toHaveBeenCalledWith('/cats');
    expect(cats).toEqual<Cat[]>(catsFixtures);
  });
});
```

在上面的示例中，套件使用 `TestBed.solitary()` 自动模拟 `CatsHttpService` 的依赖项。这简化了设置过程，因为您无需手动模拟每个依赖项。

- 依赖项的自动模拟：套件为被测试单元的所有依赖项生成模拟对象。
- 模拟对象的初始行为：这些模拟对象最初没有任何预定义行为。您需要根据需要为测试指定它们的行为。
- `unit` 和 `unitRef` 属性：
  - `unit` 指被测试类的实际实例，包含其模拟的依赖项。
  - `unitRef` 是一个引用，允许您访问模拟的依赖项。

#### 使用 `TestingModule` 测试 `CatsApiService`

对于 `CatsApiService`，我们需要确保 `HttpModule` 在 `CatsModule` 宿主模块中正确导入和配置。这包括验证 `Axios` 的基础 URL（及其他配置）是否正确设置。

在这种情况下，我们不使用套件，而是使用 Nest 的 `TestingModule` 来测试 `HttpModule` 的实际配置。我们将使用 `nock` 来模拟 HTTP 请求，而不在此场景中模拟 `HttpClient`。

```typescript
@@filename(cats-api.service)
import { HttpClient } from '@nestjs/axios';

@Injectable()
export class CatsApiService {
  constructor(private httpClient: HttpClient) {}

  async getCatById(id: number): Promise<Cat> {
    const response = await this.httpClient.get(`/cats/${id}`);
    return response.data;
  }
}
```

我们需要使用真实的、非模拟的 `HttpClient` 测试 `CatsApiService`，以确保 `Axios`（http）的依赖注入（DI）和配置正确。这涉及导入 `CatsModule` 并使用 `nock` 进行 HTTP 请求模拟。

```typescript
@@filename(cats-api.service.integration.test)
import { Test } from '@nestjs/testing';
import * as nock from 'nock';

describe('Cats Api Service Integration Test', () => {
  let catsApiService: CatsApiService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CatsModule],
    }).compile();

    catsApiService = moduleRef.get(CatsApiService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should fetch cat by id using real HttpClient', async () => {
    const catFixture: Cat = { id: 1, name: 'Catty' };

    nock('https://api.cats.com') // 确保此 URL 与 HttpModule 注册中的一致
      .get('/cats/1')
      .reply(200, catFixture);

    const cat = await catsApiService.getCatById(1);
    expect(cat).toEqual<Cat>(catFixture);
  });
});
```

#### 社交测试示例

接下来，让我们测试 `CatsService`，它依赖于 `CatsApiService` 和 `CatsDAL`。我们将模拟 `CatsApiService` 并暴露 `CatsDAL`。

```typescript
@@filename(cats.dal)
import { PrismaClient } from '@prisma/client';

@Injectable()
export class CatsDAL {
  constructor(private prisma: PrismaClient) {}

  async saveCat(cat: Cat): Promise<Cat> {
    return this.prisma.cat.create({data: cat});
  }
}
```

接下来是 `CatsService`，它依赖于 `CatsApiService` 和 `CatsDAL`：

```typescript
@@filename(cats.service)
@Injectable()
export class CatsService {
  constructor(
    private catsApiService: CatsApiService,
    private catsDAL: CatsDAL
  ) {}

  async getAndSaveCat(id: number): Promise<Cat> {
    const cat = await this.catsApiService.getCatById(id);
    return this.catsDAL.saveCat(cat);
  }
}
```

现在，让我们使用套件的社交测试来测试 `CatsService`：

```typescript
@@filename(cats.service.spec)
import { TestBed, Mocked } from '@suites/unit';
import { PrismaClient } from '@prisma/client';

describe('Cats Service Sociable Unit Test', () => {
  let catsService: CatsService;
  let prisma: Mocked<PrismaClient>;
  let catsApiService: Mocked<CatsApiService>;

  beforeAll(async () => {
    // 社交测试设置，暴露 CatsDAL 并模拟 CatsApiService
    const { unit, unitRef } = await TestBed.sociable(CatsService)
      .expose(CatsDAL)
      .mock(CatsApiService)
      .final({ getCatById: async () => ({ id: 1, name: 'Catty' })})
      .compile();

    catsService = unit;
    prisma = unitRef.get(PrismaClient);
  });

  it('should get cat by id and save it', async () => {
    const catFixture: Cat = { id: 1, name: 'Catty' };
    prisma.cat.create.mockResolvedValue(catFixture);

    const savedCat = await catsService.getAndSaveCat(1);

    expect(prisma.cat.create).toHaveBeenCalledWith({ data: catFixture });
    expect(savedCat).toEqual(catFixture);
  });
});
```

在此示例中，我们使用 `.sociable()` 方法设置测试环境。利用 `.expose()` 方法允许与 `CatsDAL` 进行真实交互，同时使用 `.mock()` 方法模拟 `CatsApiService`。`.final()` 方法为 `CatsApiService` 建立固定行为，确保测试结果的一致性。

这种方法强调通过 `CatsDAL` 的真实交互来测试 `CatsService`，这涉及处理 `Prisma`。套件将按原样使用 `CatsDAL`，而仅模拟其依赖项，如 `Prisma`。

需要注意的是，这种方法**仅用于验证行为**，与加载整个测试模块不同。社交测试对于确认单元在隔离其直接依赖项时的行为非常有用，特别是在您希望关注单元的行为和交互时。

#### 集成测试与数据库

对于 `CatsDAL`，可以针对真实数据库（如 SQLite 或 PostgreSQL，例如使用 Docker Compose）进行测试。但在此示例中，我们将模拟 `Prisma` 并专注于社交测试。模拟 `Prisma` 的原因是为了避免 I/O 操作，集中测试 `CatsService` 的隔离行为。也就是说，您也可以进行包含真实 I/O 操作和实时数据库的测试。

#### 社交单元测试、集成测试与模拟

- 社交单元测试：这些测试侧重于在模拟更深层依赖项的同时，测试单元之间的交互和行为。在此示例中，我们模拟 `Prisma` 并暴露 `CatsDAL`。

- 集成测试：这些测试涉及真实的 I/O 操作和完全配置的依赖注入（DI）设置。使用 `HttpModule` 和 `nock` 测试 `CatsApiService` 被视为集成测试，因为它验证了 `HttpClient` 的实际配置和交互。在此场景中，我们将使用 Nest 的 `TestingModule` 来加载实际的模块配置。

**使用模拟时需谨慎**。务必测试 I/O 操作和 DI 配置（特别是在涉及 HTTP 或数据库交互时）。通过集成测试验证这些组件后，您可以放心地在社交单元测试中模拟它们，以专注于行为和交互。套件的社交测试旨在验证单元在隔离其直接依赖项时的行为，而集成测试确保整个系统配置和 I/O 操作正确运行。

#### 测试 IoC 容器注册

验证您的 DI 容器是否正确配置至关重要，以防止运行时错误。这包括确保所有提供者、服务和模块都正确注册和注入。测试 DI 容器配置有助于早期发现配置错误，避免仅在运行时出现的问题。

为了确认 IoC 容器设置正确，让我们创建一个集成测试，加载实际的模块配置并验证所有提供者是否正确注册和注入。

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CatsModule } from './cats.module';
import { CatsService } from './cats.service';

describe('Cats Module Integration Test', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [CatsModule],
    }).compile();
  });

  it('should resolve exported providers from the ioc container', () => {
    const catsService = moduleRef.get(CatsService);
    expect(catsService).toBeDefined();
  });
});
```

#### 孤立测试、社交测试、集成测试与端到端测试的对比

#### 孤立单元测试

- **重点**：完全隔离测试单个单元（类）。
- **用例**：测试 `CatsHttpService`。
- **工具**：套件的 `TestBed.solitary()` 方法。
- **示例**：模拟 `HttpClient` 并测试 `CatsHttpService`。

#### 社交单元测试

- **重点**：验证单元之间的交互，同时模拟更深层的依赖项。
- **用例**：使用模拟的 `CatsApiService` 和暴露的 `CatsDAL` 测试 `CatsService`。
- **工具**：套件的 `TestBed.sociable()` 方法。
- **示例**：模拟 `Prisma` 并测试 `CatsService`。

#### 集成测试

- **重点**：涉及真实的 I/O 操作和完全配置的模块（IoC 容器）。
- **用例**：使用 `HttpModule` 和 `nock` 测试 `CatsApiService`。
- **工具**：Nest 的 `TestingModule`。
- **示例**：测试 `HttpClient` 的实际配置和交互。

#### 端到端测试

- **重点**：在更聚合的层级上覆盖类和模块的交互。
- **用例**：从最终用户的角度测试系统的完整行为。
- **工具**：Nest 的 `TestingModule`、`supertest`。
- **示例**：使用 `supertest` 模拟 HTTP 请求来测试 `CatsModule`。

有关设置和运行端到端测试的更多详情，请参阅 [NestJS 官方测试指南](/fundamentals/testing#end-to-end-testing)。
