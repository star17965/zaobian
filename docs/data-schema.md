# 数据格式

前端读取一个全局变量：

```js
window.APP_DATA = {
  meta: { ... },
  recipes: [ ... ]
};
```

`www/js/data.js` 就是这样的一个文件。页面不通过 `fetch()` 取数据，所以 `file://` 预览和 Android `file:///android_asset/www/index.html` 都能直接运行。

## `meta`

| 字段 | 类型 | 说明 |
|---|---|---|
| `total` | number | 档案总数 |
| `categories` | array | `{ name, count, icon }`，`icon` 是分类印章里的一个字 |
| `homeCategories` | string[] | 首页显示的 6 个分类名，顺序即展示顺序 |
| `featured` | string[] | 首页 hero 与“今晚下饭”的推荐 id，第一个是 hero |
| `withImage` | number | 有配图的条数 |
| `withNutrition` | number | 有营养数据的条数 |
| `withSteps` | number | 有步骤的条数 |
| `withSuppliers` | number | 能提取到供应商 / 来源线索的条数 |
| `version` | string | 数据版本，仅展示用 |

## `recipes[]`

```json
{
  "id": "d001",
  "title": "番茄炒蛋",
  "cat": "炒菜",
  "img": null,
  "ings": [
    { "n": "番茄", "src": "" },
    { "n": "鸡蛋", "src": "" }
  ],
  "steps": [
    "番茄切块，鸡蛋加少许盐打散。",
    "热锅下油，炒熟后出锅。"
  ],
  "nut": {
    "热量": "168 Kcal",
    "蛋白质": "9.2 g",
    "脂肪": "11.4 g",
    "碳水化合物": "7.1 g"
  },
  "cal": 168,
  "weight": 650,
  "bulk": false,
  "hasNut": true,
  "hasSteps": true,
  "srcCount": 0,
  "main": "番茄、鸡蛋",
  "search": "番茄炒蛋 炒菜 番茄 鸡蛋"
}
```

| 字段 | 说明 |
|---|---|
| `id` | 稳定唯一 id，用于路由和收藏 |
| `img` | 相对 `www/` 的图片路径；没有图用 `null`，UI 会显示分类印章 |
| `ings[].n` | 配料名 |
| `ings[].src` | 供应商 / 中央厨房线索；没有就留空 |
| `steps` | 步骤纯文本数组；可以为空 |
| `nut` | 营养表原始键值；没有就 `{}` |
| `cal` | 每 100g 热量数字；没有就 `null` |
| `weight` | 原方总重量（g 或 ml 的合计），用于份量卡 |
| `bulk` | 是否为门店批量；批量数据默认半份 |
| `hasNut` / `hasSteps` | 布尔派生字段，列表和详情用它做状态 |
| `srcCount` | 去重后的来源条数 |
| `main` | 主料摘要，展示在详情副标题 |
| `search` | 预拼好的搜索串，建议包含标题、分类、配料、来源 |

## 份量换算

查看步骤时，只有以下单位会被换算：

- `g`
- `ml`

温度（`℃`）、时间（`分钟` / `小时`）和个数不会被改动。每个数字会按当前倍率格式化，避免出现 `89.999999g` 这类结果。

建议在数据层就把 `weight` 和 `bulk` 算好；UI 只负责展示和切换，不重新推断配方规模。

## 缺失状态

建议不要伪造数据：

- 无图：`img: null`
- 无营养：`nut: {}`、`cal: null`、`hasNut: false`
- 无步骤：`steps: []`、`hasSteps: false`
- 无来源：`ings[].src: ""`、`srcCount: 0`

详情页会分别显示“原报告未收录营养数据”“这是一条原料档案，没有烹饪步骤”等状态。