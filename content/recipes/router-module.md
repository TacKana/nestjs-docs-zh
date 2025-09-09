### 路由模块

> info **提示** 本章节仅适用于基于 HTTP 的应用程序。

在 HTTP 应用程序（例如 REST API）中，处理程序的路由路径是通过将控制器（在 `@Controller` 装饰器内部）声明的（可选）前缀与方法装饰器（例如 `@Get('users')`）中指定的任何路径连接起来确定的。您可以在[此部分](/controllers#routing)了解更多相关信息。此外，您可以为应用程序中注册的所有路由定义[全局前缀](/faq/global-prefix)，或启用[版本控制](/techniques/versioning)。

另外，在某些边缘情况下，在模块级别定义前缀（从而为该模块内注册的所有控制器定义前缀）可能会派上用场。例如，假设一个 REST 应用程序公开了几个不同的端点，这些端点由您应用程序中名为“仪表盘”的特定部分使用。在这种情况下，您可以使用实用的 `RouterModule` 模块，而不是在每个控制器中重复 `/dashboard` 前缀，如下所示：

```typescript
@Module({
  imports: [
    DashboardModule,
    RouterModule.register([
      {
        path: 'dashboard',
        module: DashboardModule,
      },
    ]),
  ],
})
export class AppModule {}
```

> info **提示** `RouterModule` 类是从 `@nestjs/core` 包中导出的。

此外，您还可以定义分层结构。这意味着每个模块都可以有 `children`（子模块）。子模块将继承其父模块的前缀。在以下示例中，我们将 `AdminModule` 注册为 `DashboardModule` 和 `MetricsModule` 的父模块。

```typescript
@Module({
  imports: [
    AdminModule,
    DashboardModule,
    MetricsModule,
    RouterModule.register([
      {
        path: 'admin',
        module: AdminModule,
        children: [
          {
            path: 'dashboard',
            module: DashboardModule,
          },
          {
            path: 'metrics',
            module: MetricsModule,
          },
        ],
      },
    ])
  ],
});
```

> info **提示** 此功能应非常谨慎地使用，因为过度使用可能会使代码随着时间推移而难以维护。

在上面的示例中，在 `DashboardModule` 内注册的任何控制器都将具有额外的 `/admin/dashboard` 前缀（因为模块从上到下、从父模块到子模块递归地连接路径）。同样，在 `MetricsModule` 内定义的每个控制器都将具有额外的模块级前缀 `/admin/metrics`。