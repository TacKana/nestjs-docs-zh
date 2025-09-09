import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent implements OnInit {
  @Input()
  isSidebarOpened = true;
  readonly items = [
    {
      title: '介绍',
      isOpened: false,
      path: '/',
    },
    {
      title: '概述',
      isOpened: true,
      children: [
        { title: '入门', path: '/first-steps' },
        { title: '控制器', path: '/controllers' },
        { title: '提供者', path: '/providers' },
        { title: '模块', path: '/modules' },
        { title: '中间件', path: '/middleware' },
        { title: '异常过滤器', path: '/exception-filters' },
        { title: '管道', path: '/pipes' },
        { title: '守卫', path: '/guards' },
        { title: '拦截器', path: '/interceptors' },
        { title: '自定义装饰器', path: '/custom-decorators' },
      ],
    },
    {
      title: '基础',
      isOpened: false,
      children: [
        { title: '自定义提供者', path: '/fundamentals/custom-providers' },
        {
          title: '异步提供者',
          path: '/fundamentals/async-providers',
        },
        {
          title: '动态模块',
          path: '/fundamentals/dynamic-modules',
        },
        {
          title: '注入作用域',
          path: '/fundamentals/injection-scopes',
        },
        {
          title: '循环依赖',
          path: '/fundamentals/circular-dependency',
        },
        {
          title: '模块引用',
          path: '/fundamentals/module-ref',
        },
        {
          title: '懒加载模块',
          path: '/fundamentals/lazy-loading-modules',
        },
        {
          title: '执行上下文',
          path: '/fundamentals/execution-context',
        },
        {
          title: '生命周期事件',
          path: '/fundamentals/lifecycle-events',
        },
        {
          title: '发现服务',
          path: '/fundamentals/discovery-service',
        },
        {
          title: '平台无关性',
          path: '/fundamentals/platform-agnosticism',
        },
        { title: '测试', path: '/fundamentals/testing' },
      ],
    },
    {
      title: '技术',
      isOpened: false,
      children: [
        { title: '配置', path: '/techniques/configuration' },
        { title: '数据库', path: '/techniques/database' },
        { title: 'Mongo', path: '/techniques/mongodb' },
        { title: '校验', path: '/techniques/validation' },
        { title: '缓存', path: '/techniques/caching' },
        { title: '序列化', path: '/techniques/serialization' },
        { title: '版本控制', path: '/techniques/versioning' },
        { title: '任务调度', path: '/techniques/task-scheduling' },
        { title: '队列', path: '/techniques/queues' },
        { title: '日志', path: '/techniques/logger' },
        { title: 'Cookies', path: '/techniques/cookies' },
        { title: '事件', path: '/techniques/events' },
        { title: '压缩', path: '/techniques/compression' },
        { title: '文件上传', path: '/techniques/file-upload' },
        { title: '文件流', path: '/techniques/streaming-files' },
        { title: 'HTTP 模块', path: '/techniques/http-module' },
        { title: '会话', path: '/techniques/session' },
        { title: 'MVC', path: '/techniques/mvc' },
        { title: '性能（Fastify）', path: '/techniques/performance' },
        { title: '服务端推送事件', path: '/techniques/server-sent-events' },
      ],
    },
    {
      title: '安全',
      isOpened: false,
      children: [
        { title: '认证', path: '/security/authentication' },
        { title: '授权', path: '/security/authorization' },
        {
          title: '加密与哈希',
          path: '/security/encryption-and-hashing',
        },
        { title: 'Helmet', path: '/security/helmet' },
        { title: 'CORS', path: '/security/cors' },
        { title: 'CSRF 防护', path: '/security/csrf' },
        { title: '限流', path: '/security/rate-limiting' },
      ],
    },
    {
      title: 'GraphQL',
      isOpened: false,
      children: [
        { title: '快速开始', path: '/graphql/quick-start' },
        { title: '解析器', path: '/graphql/resolvers' },
        { title: '变更', path: '/graphql/mutations' },
        { title: '订阅', path: '/graphql/subscriptions' },
        { title: '标量', path: '/graphql/scalars' },
        { title: '指令', path: '/graphql/directives' },
        { title: '接口', path: '/graphql/interfaces' },
        { title: '联合与枚举', path: '/graphql/unions-and-enums' },
        { title: '字段中间件', path: '/graphql/field-middleware' },
        { title: '映射类型', path: '/graphql/mapped-types' },
        { title: '插件', path: '/graphql/plugins' },
        { title: '复杂度', path: '/graphql/complexity' },
        { title: '扩展', path: '/graphql/extensions' },
        { title: 'CLI 插件', path: '/graphql/cli-plugin' },
        { title: '生成 SDL', path: '/graphql/generating-sdl' },
        { title: '模型共享', path: '/graphql/sharing-models' },
        {
          title: '其他特性',
          path: '/graphql/other-features',
        },
        { title: '联邦', path: '/graphql/federation' },
      ],
    },
    {
      title: 'WebSockets',
      isOpened: false,
      children: [
        { title: '网关', path: '/websockets/gateways' },
        { title: '异常过滤器', path: '/websockets/exception-filters' },
        { title: '管道', path: '/websockets/pipes' },
        { title: '守卫', path: '/websockets/guards' },
        { title: '拦截器', path: '/websockets/interceptors' },
        { title: '适配器', path: '/websockets/adapter' },
      ],
    },
    {
      title: '微服务',
      isOpened: false,
      children: [
        { title: '概述', path: '/microservices/basics' },
        { title: 'Redis', path: '/microservices/redis' },
        { title: 'MQTT', path: '/microservices/mqtt' },
        { title: 'NATS', path: '/microservices/nats' },
        { title: 'RabbitMQ', path: '/microservices/rabbitmq' },
        { title: 'Kafka', path: '/microservices/kafka' },
        { title: 'gRPC', path: '/microservices/grpc' },
        {
          title: '自定义传输器',
          path: '/microservices/custom-transport',
        },
        {
          title: '异常过滤器',
          path: '/microservices/exception-filters',
        },
        { title: '管道', path: '/microservices/pipes' },
        { title: '守卫', path: '/microservices/guards' },
        { title: '拦截器', path: '/microservices/interceptors' },
      ],
    },
    {
      title: '部署',
      isNew: true,
      path: '/deployment',
    },
    {
      title: '独立应用',
      isOpened: false,
      path: '/standalone-applications',
    },
    {
      title: 'CLI',
      isOpened: false,
      children: [
        { title: '概述', path: '/cli/overview' },
        { title: '工作区', path: '/cli/monorepo' },
        { title: '库', path: '/cli/libraries' },
        { title: '用法', path: '/cli/usages' },
        { title: '脚本', path: '/cli/scripts' },
      ],
    },
    {
      title: 'OpenAPI',
      isOpened: false,
      children: [
        { title: '介绍', path: '/openapi/introduction' },
        {
          title: '类型与参数',
          path: '/openapi/types-and-parameters',
        },
        { title: '操作', path: '/openapi/operations' },
        { title: '安全', path: '/openapi/security' },
        { title: '映射类型', path: '/openapi/mapped-types' },
        { title: '装饰器', path: '/openapi/decorators' },
        { title: 'CLI 插件', path: '/openapi/cli-plugin' },
        { title: '其他特性', path: '/openapi/other-features' },
      ],
    },
    {
      title: '实践',
      isOpened: false,
      children: [
        { title: 'REPL', path: '/recipes/repl' },
        { title: 'CRUD 生成器', path: '/recipes/crud-generator' },
        { title: 'SWC（快速编译器）', path: '/recipes/swc' },
        { title: 'Passport（认证）', path: '/recipes/passport' },
        { title: '热重载', path: '/recipes/hot-reload' },
        { title: 'MikroORM', path: '/recipes/mikroorm' },
        { title: 'TypeORM', path: '/recipes/sql-typeorm' },
        { title: 'Mongoose', path: '/recipes/mongodb' },
        { title: 'Sequelize', path: '/recipes/sql-sequelize' },
        { title: '路由模块', path: '/recipes/router-module' },
        { title: 'Swagger', path: '/recipes/swagger' },
        { title: '健康检查', path: '/recipes/terminus' },
        { title: 'CQRS', path: '/recipes/cqrs' },
        { title: 'Compodoc', path: '/recipes/documentation' },
        { title: 'Prisma', path: '/recipes/prisma' },
        { title: 'Sentry', path: '/recipes/sentry' },
        { title: '静态资源服务', path: '/recipes/serve-static' },
        { title: 'Commander', path: '/recipes/nest-commander' },
        { title: '异步本地存储', path: '/recipes/async-local-storage' },
        { title: 'Necord', path: '/recipes/necord' },
        { title: 'Suites（自动模拟）', path: '/recipes/suites' },
      ],
    },
    {
      title: '常见问题',
      isOpened: false,
      children: [
        { title: 'Serverless', path: '/faq/serverless' },
        { title: 'HTTP 适配器', path: '/faq/http-adapter' },
        {
          title: '长连接',
          path: '/faq/keep-alive-connections',
        },
        { title: '全局路径前缀', path: '/faq/global-prefix' },
        { title: '原始请求体', path: '/faq/raw-body' },
        { title: '混合应用', path: '/faq/hybrid-application' },
        { title: 'HTTPS & 多服务器', path: '/faq/multiple-servers' },
        { title: '请求生命周期', path: '/faq/request-lifecycle' },
        { title: '常见错误', path: '/faq/common-errors' },
        {
          title: '示例',
          externalUrl: 'https://github.com/nestjs/nest/tree/master/sample',
        },
      ],
    },
    {
      title: '开发工具',
      isOpened: false,
      children: [
        { title: '概述', path: '/devtools/overview' },
        { title: 'CI/CD 集成', path: '/devtools/ci-cd-integration' },
      ],
    },
    {
      title: '迁移指南',
      isOpened: false,
      path: '/migration-guide',
    },
    {
      title: 'API 参考',
      externalUrl: 'https://api-references-nestjs.netlify.app/',
    },
    {
      title: '官方课程',
      externalUrl: 'https://courses.nestjs.com/',
    },
    {
      title: '发现',
      isOpened: false,
      children: [
        { title: '谁在使用 Nest?', path: '/discover/companies' },
        { title: '招聘板', externalUrl: 'https://jobs.nestjs.com/' },
      ],
    },
    // {
    //   title: 'T恤和连帽衫',
    //   externalUrl: 'https://nestjs.threadless.com/',
    // },
    {
      title: '支持我们',
      isOpened: false,
      path: '/support',
    },
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(filter((ev) => ev instanceof NavigationEnd))
      .subscribe(() => this.toggleCategory());

    this.toggleCategory();
  }

  toggleCategory() {
    const { firstChild } = this.route.snapshot;
    if (
      (firstChild.url && firstChild.url[1]) ||
      (firstChild.url &&
        firstChild.routeConfig &&
        firstChild.routeConfig.loadChildren)
    ) {
      const { path } = firstChild.url[0];
      const index = this.items.findIndex(
        ({ title }) => title.toLowerCase() === path,
      );
      if (index < 0) {
        return;
      }
      this.items[index].isOpened = true;
      this.items[1].isOpened = false;
    }
  }
}
