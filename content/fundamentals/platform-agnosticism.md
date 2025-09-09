### 平台无关性

Nest 是一个与平台无关的框架。这意味着你可以开发**可复用的逻辑部件**，这些部件能够跨不同类型的应用程序使用。例如，大多数组件可以在不同的底层 HTTP 服务器框架（如 Express 和 Fastify）之间无需更改即可复用，甚至能跨越不同*类型*的应用程序（例如 HTTP 服务器框架、采用不同传输层的微服务以及 Web Sockets）。

#### 一次构建，随处可用

文档的**概述**部分主要展示了使用 HTTP 服务器框架的编码技巧（例如提供 REST API 的应用或采用 MVC 风格服务端渲染的应用）。然而，所有这些构建块都可以在不同的传输层之上使用（[微服务](/microservices/basics) 或 [WebSockets](/websockets/gateways))。

此外，Nest 配备了专用的 [GraphQL](/graphql/quick-start) 模块。你可以将 GraphQL 用作 API 层，与提供 REST API 的方式互换使用。

另外，[应用上下文](/application-context) 功能有助于在 Nest 之上创建任何类型的 Node.js 应用程序——包括诸如 CRON 作业和 CLI 应用等。

Nest 致力于成为一个全面的 Node.js 应用平台，为你的应用带来更高层次的模块化和可复用性。一次构建，随处可用！