### 映射类型

在构建诸如 **CRUD**（创建/读取/更新/删除）这类功能时，基于基础实体类型构造变体通常非常有用。Nest 提供了若干实用函数来执行类型转换，以使这一任务更加便捷。

#### 局部类型（Partial）

在构建输入验证类型（也称为 DTO）时，通常会对同一类型构建**创建**和**更新**两种变体。例如，**创建**变体可能要求所有字段，而**更新**变体则可能将所有字段设为可选。

Nest 提供了 `PartialType()` 实用函数来简化这一任务并减少样板代码。

`PartialType()` 函数返回一个类型（类），其所有属性均设置为可选，输入类型保持不变。例如，假设我们有一个如下所示的**创建**类型：

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateCatDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiProperty()
  breed: string;
}
```

默认情况下，所有这些字段都是必填的。要创建一个具有相同字段但每个字段均为可选的类型，可以使用 `PartialType()`，并将类引用（`CreateCatDto`）作为参数传入：

```typescript
export class UpdateCatDto extends PartialType(CreateCatDto) {}
```

> info **提示** `PartialType()` 函数是从 `@nestjs/swagger` 包中导入的。

#### 选取类型（Pick）

`PickType()` 函数通过从输入类型中选取一组属性来构造一个新类型（类）。例如，假设我们从以下类型开始：

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateCatDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiProperty()
  breed: string;
}
```

我们可以使用 `PickType()` 实用函数从这个类中选取一组属性：

```typescript
export class UpdateCatAgeDto extends PickType(CreateCatDto, ['age'] as const) {}
```

> info **提示** `PickType()` 函数是从 `@nestjs/swagger` 包中导入的。

#### 排除类型（Omit）

`OmitType()` 函数通过选取输入类型的所有属性，然后移除特定的一组键来构造一个类型。例如，假设我们从以下类型开始：

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateCatDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiProperty()
  breed: string;
}
```

我们可以生成一个派生类型，该类型拥有除 `name` 之外的**所有**属性，如下所示。在此结构中，`OmitType` 的第二个参数是属性名称的数组。

```typescript
export class UpdateCatDto extends OmitType(CreateCatDto, ['name'] as const) {}
```

> info **提示** `OmitType()` 函数是从 `@nestjs/swagger` 包中导入的。

#### 交集类型（Intersection）

`IntersectionType()` 函数将两个类型合并为一个新类型（类）。例如，假设我们有两个如下所示的类型：

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateCatDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  breed: string;
}

export class AdditionalCatInfo {
  @ApiProperty()
  color: string;
}
```

我们可以生成一个新类型，合并两个类型中的所有属性。

```typescript
export class UpdateCatDto extends IntersectionType(
  CreateCatDto,
  AdditionalCatInfo,
) {}
```

> info **提示** `IntersectionType()` 函数是从 `@nestjs/swagger` 包中导入的。

#### 组合使用

类型映射实用函数可以组合使用。例如，以下代码将生成一个类型（类），该类型拥有 `CreateCatDto` 类型中除 `name` 之外的所有属性，并且这些属性将被设置为可选：

```typescript
export class UpdateCatDto extends PartialType(
  OmitType(CreateCatDto, ['name'] as const),
) {}
```