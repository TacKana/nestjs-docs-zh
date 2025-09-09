import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { HomepageComponent } from './homepage/homepage.component';
import { ApplicationContextComponent } from './homepage/pages/application-context/application-context.component';
import { ComponentsComponent } from './homepage/pages/components/components.component';
import { ControllersComponent } from './homepage/pages/controllers/controllers.component';
import { CustomDecoratorsComponent } from './homepage/pages/custom-decorators/custom-decorators.component';
import { WhoUsesComponent } from './homepage/pages/discover/who-uses/who-uses.component';
import { EnterpriseComponent } from './homepage/pages/enterprise/enterprise.component';
import { ExceptionFiltersComponent } from './homepage/pages/exception-filters/exception-filters.component';
import { FirstStepsComponent } from './homepage/pages/first-steps/first-steps.component';
import { GuardsComponent } from './homepage/pages/guards/guards.component';
import { InterceptorsComponent } from './homepage/pages/interceptors/interceptors.component';
import { IntroductionComponent } from './homepage/pages/introduction/introduction.component';
import { MiddlewaresComponent } from './homepage/pages/middlewares/middlewares.component';
import { MigrationComponent } from './homepage/pages/migration/migration.component';
import { ModulesComponent } from './homepage/pages/modules/modules.component';
import { PipesComponent } from './homepage/pages/pipes/pipes.component';
import { SupportComponent } from './homepage/pages/support/support.component';
import { RedirectGuard } from './shared/guards/redirect.guard';
import { DeploymentComponent } from './homepage/pages/deployment/deployment.component';

const routes: Routes = [
  {
    path: '',
    component: HomepageComponent,
    children: [
      {
        path: '',
        component: IntroductionComponent,
      },
      {
        path: 'first-steps',
        component: FirstStepsComponent,
        data: { title: '入门' },
      },
      {
        path: 'controllers',
        component: ControllersComponent,
        data: { title: '控制器' },
      },
      {
        path: 'components',
        redirectTo: 'providers',
      },
      {
        path: 'providers',
        component: ComponentsComponent,
        data: { title: '提供者' },
      },
      {
        path: 'modules',
        component: ModulesComponent,
        data: { title: '模块' },
      },
      {
        path: 'middleware',
        component: MiddlewaresComponent,
        data: { title: '中间件' },
      },
      {
        path: 'pipes',
        component: PipesComponent,
        data: { title: '管道' },
      },
      {
        path: 'guards',
        component: GuardsComponent,
        data: { title: '守卫' },
      },
      {
        path: 'exception-filters',
        component: ExceptionFiltersComponent,
        data: { title: '异常过滤器' },
      },
      {
        path: 'interceptors',
        component: InterceptorsComponent,
        data: { title: '拦截器' },
      },
      {
        path: 'custom-decorators',
        component: CustomDecoratorsComponent,
        data: { title: '自定义装饰器' },
      },
      {
        path: 'standalone-applications',
        component: ApplicationContextComponent,
        data: { title: '独立应用程序' },
      },
      {
        path: 'application-context',
        redirectTo: 'standalone-applications',
      },
      {
        path: 'discover/companies',
        component: WhoUsesComponent,
        data: { title: '发现 - 谁在使用 Nest？' },
      },
      {
        path: 'migration-guide',
        component: MigrationComponent,
        data: { title: '迁移指南 - 常见问题' },
      },
      {
        path: 'deployment',
        component: DeploymentComponent,
        data: { title: '部署' },
      },
      {
        path: 'support',
        component: SupportComponent,
        data: { title: '支持' },
      },
      {
        path: 'consulting',
        component: EnterpriseComponent,
        resolve: {
          url: 'externalUrlRedirectResolver',
        },
        canActivate: [RedirectGuard],
        data: {
          externalUrl: 'https://enterprise.nestjs.com',
        },
      },
      {
        path: 'enterprise',
        redirectTo: 'consulting',
      },
      {
        path: 'enterprise',
        component: EnterpriseComponent,
        data: { title: '官方支持' },
      },
      {
        path: 'fundamentals',
        loadChildren: () =>
          import('./homepage/pages/fundamentals/fundamentals.module').then(
            (m) => m.FundamentalsModule,
          ),
      },
      {
        path: 'techniques',
        loadChildren: () =>
          import('./homepage/pages/techniques/techniques.module').then(
            (m) => m.TechniquesModule,
          ),
      },
      {
        path: 'security',
        loadChildren: () =>
          import('./homepage/pages/security/security.module').then(
            (m) => m.SecurityModule,
          ),
      },
      {
        path: 'graphql',
        loadChildren: () =>
          import('./homepage/pages/graphql/graphql.module').then(
            (m) => m.GraphqlModule,
          ),
      },
      {
        path: 'websockets',
        loadChildren: () =>
          import('./homepage/pages/websockets/websockets.module').then(
            (m) => m.WebsocketsModule,
          ),
      },
      {
        path: 'microservices',
        loadChildren: () =>
          import('./homepage/pages/microservices/microservices.module').then(
            (m) => m.MicroservicesModule,
          ),
      },
      {
        path: 'recipes',
        loadChildren: () =>
          import('./homepage/pages/recipes/recipes.module').then(
            (m) => m.RecipesModule,
          ),
      },
      {
        path: 'faq',
        loadChildren: () =>
          import('./homepage/pages/faq/faq.module').then((m) => m.FaqModule),
      },
      {
        path: 'cli',
        loadChildren: () =>
          import('./homepage/pages/cli/cli.module').then((m) => m.CliModule),
      },
      {
        path: 'openapi',
        loadChildren: () =>
          import('./homepage/pages/openapi/openapi.module').then(
            (m) => m.OpenApiModule,
          ),
      },
      {
        path: 'devtools',
        loadChildren: () =>
          import('./homepage/pages/devtools/devtools.module').then(
            (m) => m.DevtoolsModule,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      // enableTracing: !environment.production,
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
      preloadingStrategy: PreloadAllModules,
      onSameUrlNavigation: 'reload',
    }),
  ],
  providers: [],
  exports: [RouterModule],
})
export class AppRoutingModule {}
