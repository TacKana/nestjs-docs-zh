### 共享模型

> 警告 **注意** 本章节仅适用于代码优先（code first）方式。

使用 TypeScript 开发项目后端的一大优势是，能够通过共享一个 TypeScript 包，在基于 TypeScript 的前端应用中复用相同的模型。

但存在一个问题：使用代码优先方式创建的模型大量使用了 GraphQL 相关的装饰器。这些装饰器在前端应用中并不相关，反而会对性能产生负面影响。

#### 使用模型垫片（model shim）

为了解决这个问题，NestJS 提供了一个“垫片”（shim），允许你通过配置 `webpack`（或类似工具）将原始装饰器替换为无实际功能的代码。要使用此垫片，需要在 `@nestjs/graphql` 包和垫片之间配置别名。

例如，在 webpack 中的配置方式如下：

```typescript
resolve: { // 参见：https://webpack.js.org/configuration/resolve/
  alias: {
      "@nestjs/graphql": path.resolve(__dirname, "../node_modules/@nestjs/graphql/dist/extra/graphql-model-shim")
  }
}
```

> 提示 **提示** [TypeORM](/techniques/database) 包也有一个类似的垫片，可以在[此处](https://github.com/typeorm/typeorm/blob/master/extra/typeorm-model-shim.js)找到。