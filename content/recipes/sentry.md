### Sentry

[Sentry](https://sentry.io) 是一个错误追踪和性能监控平台，帮助开发者实时识别和修复问题。本指南将展示如何将 Sentry 的 [NestJS SDK](https://docs.sentry.io/platforms/javascript/guides/nestjs/) 集成到你的 NestJS 应用中。

#### 安装

首先，安装必要的依赖：

```bash
$ npm install --save @sentry/nestjs @sentry/profiling-node
```

> info **提示** `@sentry/profiling-node` 是可选的，但推荐用于性能分析。

#### 基本设置

要开始使用 Sentry，你需要创建一个名为 `instrument.ts` 的文件，并在应用中优先于其他模块导入：

```typescript
@@filename(instrument)
const Sentry = require("@sentry/nestjs");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

// 确保在其他模块之前调用此函数！
Sentry.init({
  dsn: SENTRY_DSN,
  integrations: [
    // 添加性能分析集成
    nodeProfilingIntegration(),
  ],

  // 通过设置 tracesSampleRate 开启追踪
  // 生产环境中建议调整此值
  tracesSampleRate: 1.0,

  // 设置性能分析的采样率
  // 此值相对于 tracesSampleRate
  profilesSampleRate: 1.0,
});
```

更新你的 `main.ts` 文件，确保在其他导入之前先导入 `instrument.ts`：

```typescript
@@filename(main)
// 优先导入此文件！
import "./instrument";

// 然后导入其他模块
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

bootstrap();
```

之后，将 `SentryModule` 作为根模块添加到你的主模块中：

```typescript
@@filename(app.module)
import { Module } from "@nestjs/common";
import { SentryModule } from "@sentry/nestjs/setup";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    SentryModule.forRoot(),
    // ...其他模块
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

#### 异常处理

如果你使用了全局异常过滤器（通过 `app.useGlobalFilters()` 注册或在应用模块提供者中注册、使用无参数的 `@Catch()` 装饰器标注的过滤器），请在过滤器的 `catch()` 方法上添加 `@SentryExceptionCaptured()` 装饰器。此装饰器会将全局错误过滤器接收到的所有意外错误报告给 Sentry：

```typescript
import { Catch, ExceptionFilter } from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';

@Catch()
export class YourCatchAllExceptionFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception, host): void {
    // 你的实现逻辑
  }
}
```

默认情况下，只有未被错误过滤器捕获的未处理异常才会报告给 Sentry。`HttpExceptions`（包括[衍生异常](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)）默认也不会被捕获，因为它们通常用于控制流。

如果你没有全局异常过滤器，请将 `SentryGlobalFilter` 添加到主模块的提供者中。此过滤器会将未被其他错误过滤器捕获的未处理错误报告给 Sentry。

> warning **警告** `SentryGlobalFilter` 需要在其他异常过滤器之前注册。

```typescript
@@filename(app.module)
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { SentryGlobalFilter } from "@sentry/nestjs/setup";

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    // ..其他提供者
  ],
})
export class AppModule {}
```

#### 可读的堆栈跟踪

根据你的项目设置方式，Sentry 错误中的堆栈跟踪可能不会显示你的实际代码。

要解决此问题，请将源映射上传到 Sentry。最简单的方法是使用 Sentry Wizard：

```bash
npx @sentry/wizard@latest -i sourcemaps
```

#### 测试集成

要验证 Sentry 集成是否正常工作，可以添加一个抛出错误的测试端点：

```typescript
@Get("debug-sentry")
getError() {
  throw new Error("My first Sentry error!");
}
```

访问应用中的 `/debug-sentry` 路径，你应该能在 Sentry 仪表板中看到此错误。

### 总结

有关 Sentry NestJS SDK 的完整文档，包括高级配置选项和功能，请访问 [官方 Sentry 文档](https://docs.sentry.io/platforms/javascript/guides/nestjs/)。

虽然软件缺陷是 Sentry 的专业领域，但我们自己也难免会写出问题。如果在安装 SDK 时遇到任何问题，请提交 [GitHub Issue](https://github.com/getsentry/sentry-javascript/issues) 或通过 [Discord](https://discord.com/invite/sentry) 联系我们。