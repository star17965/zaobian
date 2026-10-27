/* Demo dataset: 6 original sample recipes, MIT licensed. */
window.APP_DATA = {
  "meta": {
    "total": 6,
    "categories": [
      {
        "name": "炒菜",
        "count": 1,
        "icon": "炒"
      },
      {
        "name": "蒸菜",
        "count": 1,
        "icon": "蒸"
      },
      {
        "name": "早餐",
        "count": 1,
        "icon": "早"
      },
      {
        "name": "主食",
        "count": 1,
        "icon": "主"
      },
      {
        "name": "汤",
        "count": 1,
        "icon": "汤"
      },
      {
        "name": "饮品",
        "count": 1,
        "icon": "饮"
      }
    ],
    "withImage": 0,
    "withNutrition": 4,
    "withSteps": 5,
    "withSuppliers": 0,
    "featured": [
      "d001",
      "d002",
      "d003",
      "d004",
      "d005",
      "d006"
    ],
    "homeCategories": [
      "炒菜",
      "蒸菜",
      "早餐",
      "主食",
      "汤",
      "饮品"
    ],
    "version": "0.1.0-demo"
  },
  "recipes": [
    {
      "id": "d001",
      "title": "番茄炒蛋",
      "cat": "炒菜",
      "img": null,
      "ings": [
        {
          "n": "番茄",
          "src": ""
        },
        {
          "n": "鸡蛋",
          "src": ""
        },
        {
          "n": "小葱",
          "src": ""
        },
        {
          "n": "盐",
          "src": ""
        },
        {
          "n": "白糖",
          "src": ""
        },
        {
          "n": "食用油",
          "src": ""
        }
      ],
      "steps": [
        "番茄切块，鸡蛋加少许盐打散，小葱切葱花。",
        "热锅下油，倒入蛋液炒至刚刚凝固，盛出备用。",
        "余油下番茄，加盐和白糖炒出汁，倒回鸡蛋翻匀，撒葱花出锅。"
      ],
      "nut": {
        "热量": "168 Kcal",
        "蛋白质": "9.2 g",
        "脂肪": "11.4 g",
        "碳水化合物": "7.1 g",
        "钠": "420 mg"
      },
      "cal": 168,
      "weight": 650,
      "bulk": false,
      "hasNut": true,
      "hasSteps": true,
      "srcCount": 0,
      "main": "番茄、鸡蛋、小葱",
      "search": "番茄炒蛋 炒菜 番茄、鸡蛋、小葱 番茄 鸡蛋 小葱 盐 白糖 食用油"
    },
    {
      "id": "d002",
      "title": "清蒸鲈鱼",
      "cat": "蒸菜",
      "img": null,
      "ings": [
        {
          "n": "鲈鱼",
          "src": ""
        },
        {
          "n": "姜",
          "src": ""
        },
        {
          "n": "小葱",
          "src": ""
        },
        {
          "n": "蒸鱼豉油",
          "src": ""
        },
        {
          "n": "食用油",
          "src": ""
        }
      ],
      "steps": [
        "鲈鱼处理干净，两面划刀，鱼身铺姜片和葱段。",
        "水开后上锅，大火蒸 8 分钟，关火焖 2 分钟。",
        "倒掉盘里的汁水，拣去旧姜葱，淋上蒸鱼豉油。",
        "铺新鲜葱丝，浇一勺烧热的食用油激香。"
      ],
      "nut": {
        "热量": "190 Kcal",
        "蛋白质": "24.0 g",
        "脂肪": "9.0 g",
        "碳水化合物": "2.0 g",
        "钠": "610 mg"
      },
      "cal": 190,
      "weight": 900,
      "bulk": false,
      "hasNut": true,
      "hasSteps": true,
      "srcCount": 0,
      "main": "鲈鱼、姜、小葱",
      "search": "清蒸鲈鱼 蒸菜 鲈鱼、姜、小葱 鲈鱼 姜 小葱 蒸鱼豉油 食用油"
    },
    {
      "id": "d003",
      "title": "葱油拌面",
      "cat": "主食",
      "img": null,
      "ings": [
        {
          "n": "面条",
          "src": ""
        },
        {
          "n": "小葱",
          "src": ""
        },
        {
          "n": "生抽",
          "src": ""
        },
        {
          "n": "老抽",
          "src": ""
        },
        {
          "n": "白糖",
          "src": ""
        },
        {
          "n": "食用油",
          "src": ""
        }
      ],
      "steps": [
        "小葱切段，冷油下锅，小火熬到葱段焦黄，捞出葱油。",
        "生抽、老抽、白糖调成料汁，倒进葱油里小火煮开。",
        "面条煮熟捞出，淋两勺葱油汁，拌匀后撒上葱段。"
      ],
      "nut": {},
      "cal": null,
      "weight": 450,
      "bulk": false,
      "hasNut": false,
      "hasSteps": true,
      "srcCount": 0,
      "main": "面条、小葱、生抽",
      "search": "葱油拌面 主食 面条、小葱、生抽 面条 小葱 生抽 老抽 白糖 食用油"
    },
    {
      "id": "d004",
      "title": "小米南瓜粥",
      "cat": "早餐",
      "img": null,
      "ings": [
        {
          "n": "小米",
          "src": ""
        },
        {
          "n": "南瓜",
          "src": ""
        },
        {
          "n": "水",
          "src": ""
        }
      ],
      "steps": [
        "小米淘洗两遍，南瓜去皮切成小块。",
        "水烧开，下小米和南瓜，转小火煮 25 分钟。",
        "中途搅动两次，煮到南瓜化开、粥体浓稠即可。"
      ],
      "nut": {
        "热量": "46 Kcal",
        "蛋白质": "1.5 g",
        "脂肪": "0.5 g",
        "碳水化合物": "9.4 g",
        "钠": "8 mg"
      },
      "cal": 46,
      "weight": 1850,
      "bulk": true,
      "hasNut": true,
      "hasSteps": true,
      "srcCount": 0,
      "main": "小米、南瓜、水",
      "search": "小米南瓜粥 早餐 小米、南瓜、水 小米 南瓜 水"
    },
    {
      "id": "d005",
      "title": "番茄豆腐汤",
      "cat": "汤",
      "img": null,
      "ings": [
        {
          "n": "番茄",
          "src": ""
        },
        {
          "n": "嫩豆腐",
          "src": ""
        },
        {
          "n": "水",
          "src": ""
        },
        {
          "n": "盐",
          "src": ""
        },
        {
          "n": "香油",
          "src": ""
        }
      ],
      "steps": [
        "番茄切块，嫩豆腐切成小方块。",
        "少油炒软番茄，加水烧开，下豆腐煮 5 分钟，加盐和香油。"
      ],
      "nut": {
        "热量": "52 Kcal",
        "蛋白质": "4.1 g",
        "脂肪": "2.4 g",
        "碳水化合物": "4.0 g",
        "钠": "380 mg"
      },
      "cal": 52,
      "weight": 1100,
      "bulk": false,
      "hasNut": true,
      "hasSteps": true,
      "srcCount": 0,
      "main": "番茄、嫩豆腐、水",
      "search": "番茄豆腐汤 汤 番茄、嫩豆腐、水 番茄 嫩豆腐 水 盐 香油"
    },
    {
      "id": "d006",
      "title": "柠檬水",
      "cat": "饮品",
      "img": null,
      "ings": [
        {
          "n": "柠檬",
          "src": ""
        },
        {
          "n": "水",
          "src": ""
        },
        {
          "n": "蜂蜜",
          "src": ""
        }
      ],
      "steps": [],
      "nut": {},
      "cal": null,
      "weight": 900,
      "bulk": false,
      "hasNut": false,
      "hasSteps": false,
      "srcCount": 0,
      "main": "柠檬、水、蜂蜜",
      "search": "柠檬水 饮品 柠檬、水、蜂蜜 柠檬 水 蜂蜜"
    }
  ]
};
