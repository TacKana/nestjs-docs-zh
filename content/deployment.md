### 部署

当你准备好将 NestJS 应用部署到生产环境时，有一些关键步骤可以帮助你确保其以最高效的方式运行。在本指南中，我们将探讨一些基本技巧和最佳实践，助你成功部署 NestJS 应用。

#### 前置条件

在部署 NestJS 应用之前，请确保你已具备：

- 一个可运行且准备部署的 NestJS 应用。
- 可以托管应用的部署平台或服务器的访问权限。
- 为应用配置好所有必要的环境变量。
- 所有必需的服务（如数据库）已设置并准备就绪。
- 部署平台上至少安装了 LTS 版本的 Node.js。

> info **提示** 如果你正在寻找基于云的平台来部署 NestJS 应用，不妨试试 [Mau](https://mau.nestjs.com/ '部署 Nest')，这是我们官方在 AWS 上部署 NestJS 应用的平台。使用 Mau，部署你的 NestJS 应用就像点击几下按钮并运行一个命令那么简单：
>
> ```bash
> $ npm install -g @nestjs/mau
> $ mau deploy
> ```
>
> 部署完成后，你的 NestJS 应用将在几秒钟内在 AWS 上启动并运行！

#### 构建你的应用

要构建你的 NestJS 应用，你需要将 TypeScript 代码编译成 JavaScript。这个过程会生成一个包含编译后文件的 `dist` 目录。你可以通过运行以下命令来构建应用：

```bash
$ npm run build
```

这个命令通常在底层运行 `nest build` 命令，它基本上是 TypeScript 编译器的一个包装器，附带了一些额外功能（如资源复制等）。如果你有自定义的构建脚本，也可以直接运行它。另外，对于 NestJS CLI 单仓库项目，确保将项目名称作为参数传递（`npm run build my-app`）。

编译成功后，你会在项目根目录看到一个 `dist` 目录，其中包含编译后的文件，入口点为 `main.js`。如果你的项目根目录中有任何 `.ts` 文件（并且 `tsconfig.json` 配置为编译它们），它们也会被复制到 `dist` 目录，这可能会稍微改变目录结构（例如，不是 `dist/main.js`，而是 `dist/src/main.js`，在配置服务器时请注意这一点）。

#### 生产环境

你的生产环境是外部用户可以访问你应用的地方。这可以是基于云的平台，如 [AWS](https://aws.amazon.com/)（使用 EC2、ECS 等）、[Azure](https://azure.microsoft.com/) 或 [Google Cloud](https://cloud.google.com/)，甚至是你自己管理的专用服务器，比如 [Hetzner](https://www.hetzner.com/)。

为了简化部署过程并避免手动设置，你可以使用像 [Mau](https://mau.nestjs.com/ '部署 Nest') 这样的服务，这是我们官方在 AWS 上部署 NestJS 应用的平台。更多详情，请查看[此部分](todo)。

使用**基于云的平台**或像 [Mau](https://mau.nestjs.com/ '部署 Nest') 这样的服务的一些优点包括：

- 可扩展性：随着用户增长，轻松扩展你的应用。
- 安全性：受益于内置的安全功能和合规认证。
- 监控：实时监控应用的性能和健康状况。
- 可靠性：通过高可用性保证，确保你的应用始终可用。

另一方面，基于云的平台通常比自托管更昂贵，并且你可能对底层基础设施的控制较少。如果你正在寻找更具成本效益的解决方案，并且有技术专长自己管理服务器，简单的 VPS 可能是一个不错的选择，但请记住，你需要手动处理服务器维护、安全和备份等任务。

#### NODE_ENV=production

虽然 Node.js 和 NestJS 在技术上没有开发和生产环境的区别，但在生产环境中运行应用时，将 `NODE_ENV` 环境变量设置为 `production` 是一个好习惯，因为生态系统中的一些库可能会根据这个变量表现出不同的行为（例如，启用或禁用调试输出等）。

你可以在启动应用时这样设置 `NODE_ENV` 环境变量：

```bash
$ NODE_ENV=production node dist/main.js
```

或者直接在云提供商/Mau 的控制面板中设置它。

#### 运行你的应用

要在生产环境中运行你的 NestJS 应用，只需使用以下命令：

```bash
$ node dist/main.js # 根据你的入口点位置调整此命令
```

这个命令会启动你的应用，它将监听指定的端口（默认为 `3000`）。确保这与你应用中配置的端口匹配。

或者，你可以使用 `nest start` 命令。这个命令是 `node dist/main.js` 的包装器，但它有一个关键区别：它在启动应用之前会自动运行 `nest build`，因此你不需要手动执行 `npm run build`。

#### 健康检查

健康检查对于监控生产环境中 NestJS 应用的健康和状态至关重要。通过设置健康检查端点，你可以定期验证应用是否按预期运行，并在问题变得严重之前做出响应。

在 NestJS 中，你可以使用 **@nestjs/terminus** 包轻松实现健康检查，它提供了强大的工具来添加健康检查，包括数据库连接、外部服务和自定义检查。

查看[本指南](/recipes/terminus)了解如何在你的 NestJS 应用中实现健康检查，并确保你的应用始终受到监控且响应迅速。

#### 日志记录

日志记录对于任何生产就绪的应用都是必不可少的。它有助于跟踪错误、监控行为和排查问题。在 NestJS 中，你可以使用内置的日志记录器轻松管理日志，或者如果需要更高级的功能，可以选择外部库。

日志记录的最佳实践：

- 记录错误，而非异常：专注于记录详细的错误消息，以加快调试和问题解决。
- 避免敏感数据：切勿记录敏感信息，如密码或令牌，以保护安全。
- 使用关联 ID：在分布式系统中，在日志中包含唯一标识符（如关联 ID），以跨不同服务追踪请求。
- 使用日志级别：按严重性分类日志（例如，`info`、`warn`、`error`），并在生产环境中禁用调试或详细日志以减少噪音。

> info **提示** 如果你正在使用 [AWS](https://aws.amazon.com/)（通过 [Mau](https://mau.nestjs.com/ '部署 Nest') 或直接使用），考虑使用 JSON 日志记录，以便更轻松地解析和分析日志。

对于分布式应用，使用像 ElasticSearch、Loggly 或 Datadog 这样的集中式日志记录服务会非常有用。这些工具提供强大的功能，如日志聚合、搜索和可视化，使监控和分析应用性能和行为变得更加容易。

#### 扩展

有效地扩展你的 NestJS 应用对于处理增加的流量和确保最佳性能至关重要。有两种主要的扩展策略：**垂直扩展**和**水平扩展**。理解这些方法将帮助你设计应用以高效管理负载。

**垂直扩展**，通常称为“向上扩展”，涉及增加单个服务器的资源以提升其性能。这可能意味着为现有机器添加更多 CPU、RAM 或存储。以下是一些需要考虑的关键点：

- 简单性：垂直扩展通常更简单，因为你只需要升级现有服务器，而不是管理多个实例。
- 限制：单个机器的扩展有物理限制。一旦达到最大容量，你可能需要考虑其他选项。
- 成本效益：对于中等流量的应用，垂直扩展可能更具成本效益，因为它减少了对额外基础设施的需求。

示例：如果你的 NestJS 应用托管在虚拟机上，并且你注意到在高峰时段运行缓慢，你可以将虚拟机升级到具有更多资源的更大实例。要升级虚拟机，只需导航到当前提供商的控制面板并选择更大的实例类型。

**水平扩展**，或“向外扩展”，涉及添加更多服务器或实例以分配负载。这种策略在云环境中广泛使用，对于预期高流量的应用至关重要。以下是好处和考虑因素：

- 增加容量：通过添加更多应用实例，你可以处理更多并发用户而不会降低性能。
- 冗余：水平扩展提供冗余，因为一台服务器的故障不会导致整个应用宕机。流量可以重新分配到剩余的服务器。
- 负载均衡：为了有效管理多个实例，使用负载均衡器（如 Nginx 或 AWS Elastic Load Balancing）将传入流量均匀分配到你的服务器。

示例：对于经历高流量的 NestJS 应用，你可以在云环境中部署多个应用实例，并使用负载均衡器路由请求，确保没有单个实例成为瓶颈。

使用像 [Docker](https://www.docker.com/) 这样的容器化技术和像 [Kubernetes](https://kubernetes.io/) 这样的容器编排平台，这个过程非常简单。此外，你可以利用云特定的负载均衡器，如 [AWS Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/) 或 [Azure Load Balancer](https://azure.microsoft.com/en-us/services/load-balancer/)，将流量分配到你的应用实例。

> info **提示** [Mau](https://mau.nestjs.com/ '部署 Nest') 在 AWS 上提供内置的水平扩展支持，让你可以轻松部署多个 NestJS 应用实例，并通过几次点击管理它们。

#### 其他一些技巧

部署 NestJS 应用时，还有几点需要注意：

- **安全性**：确保你的应用安全，并保护其免受常见威胁，如 SQL 注入、XSS 等。更多详情请参见“安全”类别。
- **监控**：使用像 [Prometheus](https://prometheus.io/) 或 [New Relic](https://newrelic.com/) 这样的监控工具来跟踪应用的性能和健康状况。如果你使用云提供商/Mau，它们可能提供内置的监控服务（如 [AWS CloudWatch](https://aws.amazon.com/cloudwatch/) 等）。
- **不要硬编码环境变量**：避免在代码中硬编码敏感信息，如 API 密钥、密码或令牌。使用环境变量或密钥管理器安全地存储和访问这些值。
- **备份**：定期备份数据，以防事件导致数据丢失。
- **自动化部署**：使用 CI/CD 流水线自动化部署过程，并确保环境间的一致性。
- **速率限制**：实施速率限制以防止滥用并保护你的应用免受 DDoS 攻击。更多详情请查看[速率限制章节](/security/rate-limiting)，或使用像 [AWS WAF](https://aws.amazon.com/waf/) 这样的服务进行高级保护。

#### 将你的应用容器化

[Docker](https://www.docker.com/) 是一个使用容器化的平台，允许开发者将应用及其依赖项打包成一个称为容器的标准化单元。容器轻量、可移植且隔离，非常适合在各种环境中部署应用，从本地开发到生产环境。

将你的 NestJS 应用容器化的好处：

- 一致性：Docker 确保你的应用在任何机器上以相同的方式运行，消除了“在我机器上可以运行”的问题。
- 隔离性：每个容器在其隔离的环境中运行，防止依赖项之间的冲突。
- 可扩展性：Docker 使得通过在不同机器或云实例上运行多个容器来扩展应用变得容易。
- 可移植性：容器可以轻松在环境之间移动，使得在不同平台上部署应用变得简单。

要安装 Docker，请遵循[官方网站](https://www.docker.com/get-started)上的说明。安装 Docker 后，你可以在 NestJS 项目中创建一个 `Dockerfile` 来定义构建容器镜像的步骤。

`Dockerfile` 是一个文本文件，包含 Docker 用于构建容器镜像的指令。

以下是一个 NestJS 应用的示例 Dockerfile：

```bash
# 使用官方的 Node.js 镜像作为基础镜像
FROM node:20

# 设置容器内的工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json 到工作目录
COPY package*.json ./

# 安装应用依赖
RUN npm install

# 复制其余的应用文件
COPY . .

# 构建 NestJS 应用
RUN npm run build

# 暴露应用端口
EXPOSE 3000

# 运行应用的命令
CMD ["node", "dist/main"]
```

> info **提示** 确保将 `node:20` 替换为你项目中使用的适当 Node.js 版本。你可以在[官方 Docker Hub 仓库](https://hub.docker.com/_/node)中找到可用的 Node.js Docker 镜像。

这是一个基本的 Dockerfile，它设置了 Node.js 环境，安装了应用依赖，构建了 NestJS 应用并运行它。你可以根据项目需求自定义此文件（例如，使用不同的基础镜像，优化构建过程，仅安装生产依赖等）。

让我们也创建一个 `.dockerignore` 文件，指定 Docker 在构建镜像时应忽略哪些文件和目录。在项目根目录创建 `.dockerignore` 文件：

```bash
node_modules
dist
*.log
*.md
.git
```

这个文件确保不必要的文件不会包含在容器镜像中，保持其轻量。现在你已经设置好了 Dockerfile，可以构建你的 Docker 镜像。打开终端，导航到你的项目目录，并运行以下命令：

```bash
docker build -t my-nestjs-app .
```

在这个命令中：

- `-t my-nestjs-app`：用名称 `my-nestjs-app` 标记镜像。
- `.`：表示当前目录作为构建上下文。

构建镜像后，你可以将其作为容器运行。执行以下命令：

```bash
docker run -p 3000:3000 my-nestjs-app
```

在这个命令中：

- `-p 3000:3000`：将主机上的端口 3000 映射到容器中的端口 3000。
- `my-nestjs-app`：指定要运行的镜像。

你的 NestJS 应用现在应该在 Docker 容器中运行。

如果你想将 Docker 镜像部署到云提供商或与他人共享，你需要将其推送到 Docker 注册表（如 [Docker Hub](https://hub.docker.com/)、[AWS ECR](https://aws.amazon.com/ecr/) 或 [Google Container Registry](https://cloud.google.com/container-registry)）。

一旦你决定了注册表，你可以通过以下步骤推送你的镜像：

```bash
docker login # 登录到你的 Docker 注册表
docker tag my-nestjs-app your-dockerhub-username/my-nestjs-app # 标记你的镜像
docker push your-dockerhub-username/my-nestjs-app # 推送你的镜像
```

将 `your-dockerhub-username` 替换为你的 Docker Hub 用户名或适当的注册表 URL。推送镜像后，你可以在任何机器上拉取它并将其作为容器运行。

像 AWS、Azure 和 Google Cloud 这样的云提供商提供托管的容器服务，简化了大规模部署和管理容器。这些服务提供自动扩展、负载均衡和监控等功能，使在生产环境中运行 NestJS 应用变得更加容易。

#### 使用 Mau 轻松部署

[Mau](https://mau.nestjs.com/ '部署 Nest') 是我们官方在 [AWS](https://aws.amazon.com/) 上部署 NestJS 应用的平台。如果你还没有准备好手动管理基础设施（或者只是想节省时间），Mau 是你的完美解决方案。

使用 Mau，配置和维护你的基础设施就像点击几下按钮那么简单。Mau 设计简单直观，因此你可以专注于构建应用，而不必担心底层基础设施。在底层，我们使用 **Amazon Web Services** 为你提供强大可靠的平台，同时抽象掉 AWS 的所有复杂性。我们为你处理所有繁重的工作，因此你可以专注于构建应用和发展业务。

[Mau](https://mau.nestjs.com/ '部署 Nest') 非常适合初创公司、中小型企业、大型企业以及希望快速启动而不必花费大量时间学习和管理基础设施的开发者。它非常易于使用，你可以在几分钟内启动并运行基础设施。它还利用 AWS 在幕后运行，让你享有 AWS 的所有优势，而无需管理其复杂性。

<figure><img src="/assets/mau-metrics.png" /></figure>

使用 [Mau](https://mau.nestjs.com/ '部署 Nest')，你可以：

- 仅需几次点击即可部署你的 NestJS 应用（API、微服务等）。
- 配置**数据库**，例如：
  - PostgreSQL
  - MySQL
  - MongoDB (DocumentDB)
  - Redis
  - 更多
- 设置代理服务，如：
  - RabbitMQ
  - Kafka
  - NATS
- 部署计划任务（**CRON 作业**）和后台工作程序。
- 部署 lambda 函数和无服务器应用。
- 设置 **CI/CD 流水线**以实现自动化部署。
- 以及更多！

要使用 Mau 部署你的 NestJS 应用，只需运行以下命令：

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

立即注册并通过 [Mau 部署](https://mau.nestjs.com/ '部署 Nest')，在几分钟内让你的 NestJS 应用在 AWS 上启动并运行！