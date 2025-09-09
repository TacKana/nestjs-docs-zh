### 全局前缀

要为 HTTP 应用程序中注册的**每个路由**设置统一前缀，请使用 `INestApplication` 实例的 `setGlobalPrefix()` 方法。

```typescript
const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('v1');
```

您可以通过以下配置将特定路由排除在全局前缀之外：

```typescript
app.setGlobalPrefix('v1', {
  exclude: [{ path: 'health', method: RequestMethod.GET }],
});
```

或者，您也可以将路由指定为字符串（这将应用于所有请求方法）：

```typescript
app.setGlobalPrefix('v1', { exclude: ['cats'] });
```

> info **提示** `path` 属性支持使用 [path-to-regexp](https://github.com/pillarjs/path-to-regexp#parameters) 包的通配符参数。注意：不支持使用星号通配符 `*`，而应使用参数（`:param`）或命名通配符（`*splat`）。