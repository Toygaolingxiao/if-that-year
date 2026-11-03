/* 《如果那年》状态矩阵注册表·状态域（domains）——自 v0.20.0 起由原 src/registry.js 拆出：
   本文件只含 version 与 domains（域/边/进程标定）；里程碑（milestones）在 src/registry.js，加载顺序须在本文件之后。
   以下注册表正文与拆分前一字未动。 */
window.GAME_REGISTRY = {
 "version": "0.21.1",
 "domains": {
  "spouse": {
   "label": "配偶",
   "initial": "none",
   "states": [
    "none",
    "single",
    "dating",
    "partnered",
    "divorced",
    "widowed"
   ],
   "edges": [
    {
     "from": "none",
     "to": "partnered",
     "by": [
      "fork31"
     ]
    },
    {
     "from": "none",
     "to": "single",
     "by": [
      "fork31"
     ]
    },
    {
     "from": "none",
     "to": "dating",
     "by": [
      "fork31"
     ]
    },
    {
     "from": "partnered",
     "to": "divorced",
     "by": [
      "p27_001"
     ]
    },
    {
     "from": "partnered",
     "to": "widowed",
     "by": [
      "p28_001"
     ]
    },
    {
     "from": "divorced",
     "to": "partnered",
     "by": [
      "p31_003"
     ],
     "note": "再结伴边（v0.13.0 启用）：载体 pack31 三环（相识 p31_001→相处 p31_002→落点 p31_003），仅终环选项级 setState 流转，中途「算了」不惩罚"
    },
    {
     "from": "widowed",
     "to": "partnered",
     "by": [
      "p32_003"
     ],
     "note": "再结伴边（v0.13.0 启用）：载体 pack32 三环（相识 p32_001→相处 p32_002→落点 p32_003），同上"
    },
    {
     "from": "dating",
     "to": "partnered",
     "by": [
      "p3_043",
      "e55_017",
      "proc_dating"
     ],
     "note": "慢线成婚边（v0.13.1 启用）：p3_043「结吧」选项级 setState（慢线 dating 的叙事出口）；e55_017 为 c1955 年代婚事事件，呈现即成婚（事件级 setState，门控 stateAll 限 dating/partnered）；proc_dating 为 v0.18.0 dating 到期结算拍"
    },
    {
     "from": "dating",
     "to": "single",
     "by": [
      "proc_dating"
     ],
     "note": "dating 到期结算边（v0.18.0 启用）：处满 7 年未定，进程拍 proc_dating 给定下来/好聚好散/再处处看三条路，选散即走此边"
    }
   ]
  },
  "kids": {
   "label": "子女",
   "initial": "undecided",
   "states": [
    "undecided",
    "has",
    "none"
   ],
   "edges": [
    {
     "from": "undecided",
     "to": "has",
      "by": [
       "fork38",
       "e_kid_settle",
       "e_kid_final",
       "lk_born"
      ]
     },
     {
      "from": "undecided",
      "to": "none",
      "by": [
       "fork38",
       "e_kid_settle",
       "e_kid_final",
       "fork45",
       "cov_solo_due",
       "lk_none",
       "lk_fade"
      ]
     }
   ]
  },
  "dad": {
   "label": "父亲",
   "initial": "alive",
   "terminal": [
    "dead"
   ],
   "states": [
    "alive",
    "dead"
   ],
   "edges": [
    {
     "from": "alive",
     "to": "dead",
     "by": [
      "p4_015",
      "proc_dad_dead"
     ],
     "note": "v0.18.0 起主载体为父亲进程节拍 proc_dad_dead（进程越线发作）；p4_015 为旧事件载体，仍可先行"
    }
   ]
  },
  "mom": {
   "label": "母亲",
   "initial": "alive",
   "terminal": [
    "dead"
   ],
   "states": [
    "alive",
    "dead"
   ],
   "edges": [
    {
     "from": "alive",
     "to": "dead",
     "by": [
      "p4_086",
      "proc_mom_dead"
     ],
     "note": "v0.18.0 起主载体为母亲进程节拍 proc_mom_dead；p4_086 为旧事件载体，仍可先行"
    }
   ]
  },
  "dog": {
   "label": "宠物狗",
   "initial": "none",
   "terminal": [
    "gone"
   ],
   "states": [
    "none",
    "home",
    "gone"
   ],
   "edges": [
    {
     "from": "none",
     "to": "home",
     "by": [
      "p11_049"
     ]
    },
    {
     "from": "home",
     "to": "gone",
     "by": [
      "p11_054"
     ]
    }
   ]
  },
  "cat": {
   "label": "宠物猫",
   "initial": "none",
   "terminal": [
    "gone"
   ],
   "states": [
    "none",
    "home",
    "gone"
   ],
   "edges": [
    {
     "from": "none",
     "to": "home",
     "by": [
      "p5_043"
     ]
    },
    {
     "from": "home",
     "to": "gone",
     "by": [
      "p5_044",
      "p13_055"
     ]
    }
   ]
  },
  "schooling": {
   "label": "入学处境",
   "initial": "pre",
   "states": [
    "pre",
    "school",
    "half",
    "never",
    "left"
   ],
   "reservedStates": [],
   "edges": [
    {
     "from": "pre",
     "to": "school",
     "by": [
      "pr_origin"
     ],
     "note": "处境发放（v0.17.0 试点）：来历幕呈现即落定，发放走序章独立流、不可重掷；本轮仅 c2000 试点走序章，其余年代暂留 pre"
    },
    {
     "from": "pre",
     "to": "half",
     "by": [
      "pr_origin"
     ],
     "note": "半读处境（v0.18.0 开放）：c2000 以登记权重发放，载体为序章发放拍（setStateBySit）；留守是家底底色，不占处境值"
    },
    {
     "from": "pre",
     "to": "never",
     "by": [
      "pr_origin"
     ],
     "note": "未入学处境（v0.18.0 开放）：c2000 以登记小权重发放，含后来的识字线（夜校/自学，载体 pr_never2）"
    },
    {
     "from": "half",
     "to": "left",
     "by": [
      "pr_half2"
     ],
     "note": "读了又离开（v0.18.0 开放）：half 线 14 岁拍的选择——读到这儿就回家帮工"
    },
    {
     "from": "school",
     "to": "left",
     "by": [],
     "reserved": true,
     "note": "school 直转 left 未开放：现行口径下流失统一走 half 线（处境在发放时已按帮工+流失小格标定）"
    }
   ]
  },
  "track": {
   "label": "少年轨道",
   "initial": "pre",
   "states": [
    "pre",
    "study",
    "work",
    "craft",
    "home"
   ],
   "edges": [
    {
     "from": "pre",
     "to": "study",
     "by": [
      "pr_fork16"
     ]
    },
    {
     "from": "pre",
     "to": "work",
     "by": [
      "pr_fork16"
     ]
    },
    {
     "from": "pre",
     "to": "craft",
     "by": [
      "pr_fork16"
     ]
    },
    {
     "from": "pre",
     "to": "home",
     "by": [
      "pr_fork16"
     ]
    }
   ],
   "note": "16 岁分岔写入（v0.17.0）；成年段五路线是另一层选择，track 不锁 route。未走序章的年代暂留 pre"
  },
  "abroadKind": {
   "label": "出国去向（国家原型）",
   "initial": "unset",
   "states": [
    "unset",
    "anglo",
    "eastasia",
    "europe",
    "dispatch"
   ],
   "edges": [
    {
     "from": "unset",
     "to": "anglo",
     "by": [
      "proc_abroad_kind"
     ],
     "note": "去向拍（v0.19.0）：英语圈移民国原型——离家远、能长住、当地话这道墙高、回来一趟贵；正文只写属性不写国名"
    },
    {
     "from": "unset",
     "to": "eastasia",
     "by": [
      "proc_abroad_kind"
     ],
     "note": "去向拍（v0.19.0）：东亚近邻原型——离家近、长住的可能中等、字认得话难懂、回一趟便宜"
    },
    {
     "from": "unset",
     "to": "europe",
     "by": [
      "proc_abroad_kind"
     ],
     "note": "去向拍（v0.19.0）：欧洲福利型原型——离家远、日子慢税高假多、当地话这道墙高、回来一趟贵"
    },
    {
     "from": "unset",
     "to": "dispatch",
     "by": [
      "proc_abroad_kind"
     ],
     "note": "去向拍（v0.19.0）：派遣淘金型原型——跟着项目走、钱多、住不安稳、合同完了就得回"
    }
   ],
   "note": "出国路线（route=abroad）22–26 岁由去向拍 proc_abroad_kind 落值；未落值（含旧存档）由引擎 settleAbroadDefault 按进程流推断补值（走同一批已声明边），不会为空。非出国路线恒为 unset，不参与门控"
  },
  "workPhase": {
   "label": "活计相位",
   "initial": "working",
   "states": [
    "working",
    "part",
    "retired"
   ],
   "edges": [
    {
     "from": "working",
     "to": "part",
     "by": [
      "proc_retire_node",
      "fork58"
     ],
     "note": "半退过渡（v0.19.0）：退休节点拍选「先半退」或 58 岁分岔选返聘/半退；part 停留年数由引擎在流转时按进程流定（1–3 年，零工形态更久）"
    },
    {
     "from": "working",
     "to": "retired",
     "by": [
      "proc_retire_node",
      "proc_retire_auto",
      "fork58"
     ],
     "note": "直接退（v0.19.0）：节点拍选「退下来」、58 岁分岔选「退」，或推迟两次后由 proc_retire_auto 收束"
    },
    {
     "from": "part",
     "to": "retired",
     "by": [
      "proc_retire_full",
      "fork58"
     ],
     "note": "半退到期（v0.19.0）：part 停留期满由进程拍 proc_retire_full 落定；58 岁分岔在 part 时选「退」亦走此边"
    },
    {
     "from": "retired",
     "to": "part",
     "by": [
      "e_rehire_1",
      "e_rehire_2",
      "fork58"
     ],
     "note": "返聘回流边（v0.19.0）：退了又被请回去做半截活，走 e_rehire_1/e_rehire_2 的接活选项，或 58 岁分岔的返聘选项（在已退时）"
    }
   ],
   "note": "退休相位（v0.19.0）：转换由引擎小进程按年龄×活计形态×选择触发（规则见 docs/WORK-PHASE.md）；retiredAt 与 retirePlan 供未来钱进程标定养老金读取"
  }
 }
};
