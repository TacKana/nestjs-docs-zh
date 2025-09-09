import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { CachingComponent } from './caching/caching.component';
import { CompressionComponent } from './compression/compression.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { CookiesComponent } from './cookies/cookies.component';
import { EventsComponent } from './events/events.component';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { HttpModuleComponent } from './http-module/http-module.component';
import { LoggerComponent } from './logger/logger.component';
import { MongoComponent } from './mongo/mongo.component';
import { MvcComponent } from './mvc/mvc.component';
import { PerformanceComponent } from './performance/performance.component';
import { QueuesComponent } from './queues/queues.component';
import { SerializationComponent } from './serialization/serialization.component';
import { ServerSentEventsComponent } from './server-sent-events/server-sent-events.component';
import { SessionComponent } from './sessions/sessions.component';
import { SqlComponent } from './sql/sql.component';
import { StreamingFilesComponent } from './streaming-files/streaming-files.component';
import { TaskSchedulingComponent } from './task-scheduling/task-scheduling.component';
import { ValidationComponent } from './validation/validation.component';
import { VersioningComponent } from './versioning/versioning.component';

const routes: Routes = [
  {
    path: 'authentication',
    redirectTo: '/security/authentication',
  },
  {
    path: 'mvc',
    component: MvcComponent,
    data: { title: 'MVC' },
  },
  {
    path: 'serialization',
    component: SerializationComponent,
    data: { title: '序列化' },
  },
  {
    path: 'caching',
    component: CachingComponent,
    data: { title: '缓存' },
  },
  {
    path: 'validation',
    component: ValidationComponent,
    data: { title: '校验' },
  },
  {
    path: 'sql',
    redirectTo: 'database',
  },
  {
    path: 'database',
    component: SqlComponent,
    data: { title: '数据库' },
  },
  {
    path: 'mongodb',
    component: MongoComponent,
    data: { title: 'MongoDB' },
  },
  {
    path: 'file-upload',
    component: FileUploadComponent,
    data: { title: '文件上传' },
  },
  {
    path: 'streaming-files',
    component: StreamingFilesComponent,
    data: { title: '文件流' },
  },
  {
    path: 'logger',
    component: LoggerComponent,
    data: { title: '日志' },
  },
  {
    path: 'performance',
    component: PerformanceComponent,
    data: { title: '性能（Fastify）' },
  },
  {
    path: 'http-module',
    component: HttpModuleComponent,
    data: { title: 'HTTP 模块' },
  },
  {
    path: 'configuration',
    component: ConfigurationComponent,
    data: { title: '配置' },
  },
  {
    path: 'security',
    redirectTo: '/security/helmet',
  },
  {
    path: 'cookies',
    component: CookiesComponent,
    data: { title: 'Cookies' },
  },
  {
    path: 'task-scheduling',
    component: TaskSchedulingComponent,
    data: { title: '任务调度' },
  },
  {
    path: 'compression',
    component: CompressionComponent,
    data: { title: '压缩' },
  },
  {
    path: 'queues',
    component: QueuesComponent,
    data: { title: '队列' },
  },
  {
    path: 'hot-reload',
    redirectTo: '/recipes/hot-reload',
  },
  {
    path: 'server-sent-events',
    component: ServerSentEventsComponent,
    data: { title: '服务端推送事件' },
  },
  {
    path: 'versioning',
    component: VersioningComponent,
    data: { title: '版本控制' },
  },
  {
    path: 'events',
    component: EventsComponent,
    data: { title: '事件' },
  },
  {
    path: 'session',
    component: SessionComponent,
    data: { title: '会话' },
  },
];

@NgModule({
  imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
  declarations: [
    SqlComponent,
    MvcComponent,
    MongoComponent,
    QueuesComponent,
    LoggerComponent,
    TaskSchedulingComponent,
    PerformanceComponent,
    EventsComponent,
    FileUploadComponent,
    HttpModuleComponent,
    ConfigurationComponent,
    CompressionComponent,
    VersioningComponent,
    ValidationComponent,
    CachingComponent,
    SerializationComponent,
    ServerSentEventsComponent,
    SessionComponent,
    CookiesComponent,
    StreamingFilesComponent,
  ],
})
export class TechniquesModule {}
