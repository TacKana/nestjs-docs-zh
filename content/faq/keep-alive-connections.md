### 保持连接活动

默认情况下，NestJS 的 HTTP 适配器会等待响应完成后才关闭应用。但有时，这种行为并非期望或可能带来意外。部分使用 `Connection: Keep-Alive` 头部的请求可能会长时间保持连接状态。

针对需要确保应用无需等待请求结束即可退出的场景，您可以在创建 NestJS 应用时启用 `forceCloseConnections` 配置项。

> warning **提示** 大多数用户无需启用此选项。但若您发现应用未按预期退出（通常发生在启用 `app.enableShutdownHooks()` 且应用未重启/退出的情况），则可能需要启用该选项。这种情况多出现在开发过程中使用 `--watch` 模式运行 NestJS 应用时。

#### 使用方式

在 `main.ts` 文件中创建 NestJS 应用时启用该选项：

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    forceCloseConnections: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```