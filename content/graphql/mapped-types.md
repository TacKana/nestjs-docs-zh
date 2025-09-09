### 映射类型

> warning **警告** 本章节仅适用于代码优先（code first）方式。

在构建诸如 CRUD（创建/读取/更新/删除）等功能时，基于基础实体类型构造变体通常非常有用。Nest 提供了几个实用函数来执行类型转换，以使这项任务更加便捷。

#### Partial（部分类型）

在构建输入验证类型（也称为数据传输对象或 DTO）时，通常需要在同一类型上构建**创建**和**更新**变体。例如，**创建**变体可能需要所有字段，而**更新**变体可能使所有字段变为可选。

Nest 提供了 `PartialType()` 实用函数来简化此任务并减少样板代码。

`PartialType()` 函数返回一个类型（类），其所有属性均设置为输入类型的可选属性。例如，假设我们有一个如下所示的**创建**类型：

```typescript
@InputType()
class CreateUserInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  firstName: string;
}
```

默认情况下，所有这些字段都是必需的。要创建一个具有相同字段但每个字段都可选的类型，可以使用 `PartialType()`，并将类引用（`CreateUserInput`）作为参数传递：

```typescript
@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {}
```

> info **提示** `PartialType()` 函数从 `@nestjs/graphql` 包中导入。

`PartialType()` 函数接受一个可选的第二个参数，该参数是装饰器工厂的引用。此参数可用于更改应用于结果（子）类的装饰器函数。如果未指定，子类将有效地使用与**父**类（第一个参数中引用的类）相同的装饰器。在上面的示例中，我们扩展了使用 `@InputType()` 装饰器注解的 `CreateUserInput`。由于我们希望 `UpdateUserInput` 也被视为使用 `@InputType()` 装饰，因此不需要将 `InputType` 作为第二个参数传递。如果父类型和子类型不同（例如，父类使用 `@ObjectType` 装饰），我们将把 `InputType` 作为第二个参数传递。例如：

```typescript
@InputType()
export class UpdateUserInput extends PartialType(User, InputType) {}
```

#### Pick（选择类型）

`PickType()` 函数通过从输入类型中选择一组属性来构造一个新类型（类）。例如，假设我们从以下类型开始：

```typescript
@InputType()
class CreateUserInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  firstName: string;
}
```

我们可以使用 `PickType()` 实用函数从该类中选择一组属性：

```typescript
@InputType()
export class UpdateEmailInput extends PickType(CreateUserInput, [
  'email',
] as const) {}
```

> info **提示** `PickType()` 函数从 `@nestjs/graphql` 包中导入。

#### Omit（排除类型）

`OmitType()` 函数通过从输入类型中选择所有属性，然后移除特定的一组键来构造一个类型。例如，假设我们从以下类型开始：

```typescript
@InputType()
class CreateUserInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  firstName: string;
}
```

我们可以生成一个派生类型，该类型具有除 `email` 之外的所有属性，如下所示。在此结构中，`OmitType` 的第二个参数是属性名称的数组。

```typescript
@InputType()
export class UpdateUserInput extends OmitType(CreateUserInput, [
  'email',
] as const) {}
```

> info **提示** `OmitType()` 函数从 `@nestjs/graphql` 包中导入。

#### Intersection（交叉类型）

`IntersectionType()` 函数将两个类型组合成一个新类型（类）。例如，假设我们从以下两个类型开始：

```typescript
@InputType()
class CreateUserInput {
  @Field()
  email: string;

  @Field()
  password: string;
}

@ObjectType()
export class AdditionalUserInfo {
  @Field()
  firstName: string;

  @Field()
  lastName: string;
}
```

我们可以生成一个新类型，组合两个类型中的所有属性。

```typescript
@InputType()
export class UpdateUserInput extends IntersectionType(
  CreateUserInput,
  AdditionalUserInfo,
) {}
```

> info **提示** `IntersectionType()` 函数从 `@nestjs/graphql` 包中导入。

#### 组合使用

类型映射实用函数可以组合使用。例如，以下代码将生成一个类型（类），该类型具有 `CreateUserInput` 类型的所有属性，但排除 `email`，并且这些属性将被设置为可选：

```typescript
@InputType()
export class UpdateUserInput extends PartialType(
  OmitType(CreateUserInput, ['email'] as const),
) {}
```