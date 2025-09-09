### 发现服务（DiscoveryService）

`@nestjs/core` 包提供的 `DiscoveryService` 是一个强大的工具，允许开发者在 NestJS 应用程序中动态检查和检索提供者、控制器及其他元数据。这对于构建依赖运行时自省的插件、装饰器或高级功能特别有用。通过利用 `DiscoveryService`，开发者可以创建更灵活和模块化的架构，实现应用程序的自动化和动态行为。

#### 快速开始

在使用 `DiscoveryService` 之前，你需要在打算使用它的模块中导入 `DiscoveryModule`。这确保了该服务可用于依赖注入。以下是在 NestJS 模块中配置的示例：

```typescript
import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ExampleService } from './example.service';

@Module({
  imports: [DiscoveryModule],
  providers: [ExampleService],
})
export class ExampleModule {}
```

一旦模块设置完成，`DiscoveryService` 就可以注入到任何需要动态发现的提供者或服务中。

```typescript
@@filename(example.service)
@Injectable()
export class ExampleService {
  constructor(private readonly discoveryService: DiscoveryService) {}
}
@@switch
@Injectable()
@Dependencies(DiscoveryService)
export class ExampleService {
  constructor(discoveryService) {
    this.discoveryService = discoveryService;
  }
}
```

#### 发现提供者和控制器

`DiscoveryService` 的一个关键能力是检索应用程序中所有已注册的提供者。这对于基于特定条件动态处理提供者非常有用。以下代码段演示了如何访问所有提供者：

```typescript
const providers = this.discoveryService.getProviders();
console.log(providers);
```

每个提供者对象包含其实例、令牌和元数据等信息。类似地，如果你需要检索应用程序中所有已注册的控制器，可以这样做：

```typescript
const controllers = this.discoveryService.getControllers();
console.log(controllers);
```

这一特性在需要动态处理控制器的场景中特别有益，例如分析跟踪或自动注册机制。

#### 提取元数据

除了发现提供者和控制器，`DiscoveryService` 还支持检索附加到这些组件的元数据。这在处理在运行时存储元数据的自定义装饰器时尤其有价值。

例如，考虑使用自定义装饰器为提供者标记特定元数据的情况：

```typescript
import { DiscoveryService } from '@nestjs/core';

export const FeatureFlag = DiscoveryService.createDecorator();
```

将此装饰器应用于服务后，可以存储稍后可查询的元数据：

```typescript
import { Injectable } from '@nestjs/common';
import { FeatureFlag } from './custom-metadata.decorator';

@Injectable()
@FeatureFlag('experimental')
export class CustomService {}
```

一旦元数据以这种方式附加到提供者，`DiscoveryService` 使得基于分配的元数据过滤提供者变得容易。以下代码段演示了如何检索标记有特定元数据值的提供者：

```typescript
const providers = this.discoveryService.getProviders();

const [provider] = providers.filter(
  (item) =>
    this.discoveryService.getMetadataByDecorator(FeatureFlag, item) ===
    'experimental',
);

console.log(
  '带有"实验性"功能标志元数据的提供者：',
  provider,
);
```

#### 结论

`DiscoveryService` 是一个多才多艺且强大的工具，支持在 NestJS 应用程序中进行运行时自省。通过允许动态发现提供者、控制器和元数据，它在构建可扩展框架、插件和自动化驱动功能中扮演着关键角色。无论你是需要扫描和处理提供者、提取元数据进行高级处理，还是创建模块化和可扩展的架构，`DiscoveryService` 都提供了一种高效且结构化的方法来实现这些目标。