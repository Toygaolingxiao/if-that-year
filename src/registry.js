/* 《如果那年》状态矩阵注册表（v0.13.0）——单一事实源。
   域（domains）：域内互斥 / 流转不可逆的人生状态。引擎只执行此处声明的边（edges）；
   by = 载体条目 id（分岔记 fork<年龄>）；reserved 边已设计但暂无载体，不可达警告属预期。
   里程碑（milestones）：普通叙事旗标，setters 为全部立旗条目 id；
   新增/改动旗标必须同步登记，tools/validate-state.js 会逐项核对，未登记即报错。
   详细口径见 docs/STATE-MATRIX.md。 */
window.GAME_REGISTRY = {
 "version": "0.13.1",
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
      "e55_017"
     ],
     "note": "慢线成婚边（v0.13.1 启用）：p3_043「结吧」选项级 setState（慢线 dating 的叙事出口）；e55_017 为 c1955 年代婚事事件，呈现即成婚（事件级 setState，门控 stateAll 限 dating/partnered）"
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
      "fork38"
     ]
    },
    {
     "from": "undecided",
     "to": "none",
     "by": [
      "fork38"
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
      "p4_015"
     ]
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
      "p4_086"
     ]
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
  }
 },
 "milestones": {
  "ad_first": {
   "setters": [
    "p2_037"
   ]
  },
  "ai_daily": {
   "setters": [
    "p10_055",
    "p22_056"
   ]
  },
  "ai_read_assist": {
   "setters": [
    "p21_001"
   ]
  },
  "aims_team_lead": {
   "setters": [
    "p9_055"
   ]
  },
  "asked_leave": {
   "setters": [
    "e65_003"
   ]
  },
  "back_home_stay": {
   "setters": [
    "p11_040"
   ]
  },
  "badminton_captain": {
   "setters": [
    "p10_025"
   ]
  },
  "bookkeeping": {
   "setters": [
    "p12_058"
   ]
  },
  "bought_car": {
   "setters": [
    "e65_035"
   ]
  },
  "bought_commodity": {
   "setters": [
    "e65_027"
   ]
  },
  "bought_fangai": {
   "setters": [
    "e65_026"
   ]
  },
  "bought_house": {
   "setters": [
    "e78_006",
    "fork33",
    "p17_021",
    "p17_024",
    "p18_049"
   ]
  },
  "bought_renzheng": {
   "setters": [
    "e65_009",
    "p15_031",
    "p18_020"
   ]
  },
  "calligraphy_teach": {
   "setters": [
    "p10_014"
   ]
  },
  "car_bought": {
   "setters": [
    "p12_045",
    "p2_081"
   ]
  },
  "care_hired": {
   "setters": [
    "e78_031",
    "fork52",
    "p17_052",
    "p21_016",
    "p21_021",
    "p21_055",
    "p24_006",
    "p24_024",
    "p25_009"
   ]
  },
  "care_rotate": {
   "setters": [
    "e78_031",
    "fork52",
    "p17_052",
    "p21_016",
    "p25_009"
   ]
  },
  "care_self": {
   "setters": [
    "fork52",
    "p24_006",
    "p24_042"
   ]
  },
  "care_ss_gap": {
   "setters": [
    "p21_031"
   ]
  },
  "carpool_group": {
   "setters": [
    "p9_014"
   ]
  },
  "cert_study_started": {
   "setters": [
    "p20_005",
    "p9_035"
   ]
  },
  "cert_try": {
   "setters": [
    "p16_010",
    "p20_044",
    "p2_019"
   ]
  },
  "classmate_table": {
   "setters": [
    "p11_020"
   ]
  },
  "community_active": {
   "setters": [
    "p9_020"
   ]
  },
  "commute_reading": {
   "setters": [
    "p9_068"
   ]
  },
  "cooking_recipe": {
   "setters": [
    "p10_028"
   ]
  },
  "crypto_old": {
   "setters": [
    "p22_055"
   ]
  },
  "cut_stock_2015": {
   "setters": [
    "p23_040"
   ]
  },
  "data_only_rep": {
   "setters": [
    "p9_007"
   ]
  },
  "dca": {
   "setters": [
    "p2_070"
   ]
  },
  "dinner_prep_habit": {
   "setters": [
    "p9_062"
   ]
  },
  "door_neighbor": {
   "setters": [
    "p11_023"
   ]
  },
  "e78_ai": {
   "setters": [
    "e78_027",
    "p22_037"
   ]
  },
  "e78_car": {
   "setters": [
    "e78_036"
   ]
  },
  "edu_fund": {
   "setters": [
    "p12_032",
    "p15_015",
    "p16_042"
   ]
  },
  "ev_car": {
   "setters": [
    "p12_047"
   ]
  },
  "ex_colleague_neighbor": {
   "setters": [
    "p11_063"
   ]
  },
  "exam_landed": {
   "setters": [
    "p16_005"
   ]
  },
  "exam_retry": {
   "setters": [
    "p16_004",
    "p16_005"
   ]
  },
  "exam_shortlist": {
   "setters": [
    "p16_004",
    "p16_007"
   ]
  },
  "faded": {
   "setters": [
    "p3_038",
    "p3_043"
   ]
  },
  "fam_shop_in": {
   "setters": [
    "p11_005"
   ]
  },
  "fangai_kept": {
   "setters": [
    "p23_042"
   ]
  },
  "fangai_sold": {
   "setters": [
    "p23_042"
   ]
  },
  "fish_spot": {
   "setters": [
    "p10_002"
   ]
  },
  "frugal_rule": {
   "setters": [
    "e65_046",
    "p22_006"
   ]
  },
  "fund_bought": {
   "setters": [
    "p2_068"
   ]
  },
  "garden_share": {
   "setters": [
    "p10_021",
    "p25_036"
   ]
  },
  "had_pager": {
   "setters": [
    "e65_015"
   ]
  },
  "hainan_dream": {
   "setters": [
    "e65_005"
   ]
  },
  "held_stock_2015": {
   "setters": [
    "p23_040"
   ]
  },
  "helped_divorce_colleague": {
   "setters": [
    "p9_009"
   ]
  },
  "hobby_badminton": {
   "setters": [
    "p10_024"
   ]
  },
  "hobby_calligraphy": {
   "setters": [
    "p10_013"
   ]
  },
  "hobby_cooking": {
   "setters": [
    "p10_027"
   ]
  },
  "hobby_fishing": {
   "setters": [
    "p10_001"
   ]
  },
  "hobby_garden": {
   "setters": [
    "p10_020"
   ]
  },
  "hobby_music": {
   "setters": [
    "p10_016"
   ]
  },
  "hobby_photo": {
   "setters": [
    "p10_005"
   ]
  },
  "hobby_run": {
   "setters": [
    "p10_009",
    "p22_009"
   ]
  },
  "hook_books": {
   "setters": [
    "cf_02"
   ],
   "note": "出身牌钩子（v0.13.0）：setter 为牌 id，消费事件 pack33"
  },
  "re_div_start": {
   "setters": [
    "p31_001"
   ],
   "note": "再结伴·离异线起步（v0.13.0）：相识环选项立旗，相处/落点以此为 require 门"
  },
  "re_wid_start": {
   "setters": [
    "p32_001"
   ],
   "note": "再结伴·丧偶线起步（v0.13.0）：同上"
  },
  "hook_counter": {
   "setters": [
    "cf_01"
   ],
   "note": "出身牌钩子（v0.13.0）：setter 为牌 id，消费事件 pack33"
  },
  "hook_frail": {
   "setters": [
    "ct_13"
   ],
   "note": "出身牌钩子（v0.13.0）：setter 为牌 id，消费事件 pack33"
  },
  "hook_grandma": {
   "setters": [
    "cf_07"
   ],
   "note": "出身牌钩子（v0.13.0）：setter 为牌 id，消费事件 pack33"
  },
  "hook_moved_kid": {
   "setters": [
    "cf_08"
   ],
   "note": "出身牌钩子（v0.13.0）：setter 为牌 id，消费事件 pack33"
  },
  "hook_siblings": {
   "setters": [
    "cf_06"
   ],
   "note": "出身牌钩子（v0.13.0）：setter 为牌 id，消费事件 pack33"
  },
  "hook_sporty": {
   "setters": [
    "ct_01"
   ],
   "note": "出身牌钩子（v0.13.0）：setter 为牌 id，消费事件 pack33"
  },
  "hook_stage": {
   "setters": [
    "ct_11"
   ],
   "note": "出身牌钩子（v0.13.0）：setter 为牌 id，消费事件 pack33"
  },
  "house_contract_kept": {
   "setters": [
    "p26_069"
   ]
  },
  "ins_critical": {
   "setters": [
    "p12_001"
   ]
  },
  "jizi_house": {
   "setters": [
    "e65_020"
   ]
  },
  "job_hop": {
   "setters": [
    "fork25"
   ]
  },
  "kid2": {
   "setters": [
    "e78_017"
   ]
  },
  "kid_abroad": {
   "setters": [
    "e65_040"
   ]
  },
  "knows_boss_focus": {
   "setters": [
    "p9_001"
   ]
  },
  "laid_off": {
   "setters": [
    "p15_025",
    "p2_012"
   ]
  },
  "league_team": {
   "setters": [
    "p17_010"
   ]
  },
  "legacy_sharing_done": {
   "setters": [
    "p25_040",
    "p25_043",
    "p9_064"
   ]
  },
  "less_work": {
   "setters": [
    "fork44"
   ]
  },
  "let_go": {
   "setters": [
    "p3_054"
   ]
  },
  "library_talk_given": {
   "setters": [
    "p9_043"
   ]
  },
  "library_volunteer": {
   "setters": [
    "p9_018"
   ]
  },
  "loan_swap": {
   "setters": [
    "p2_060"
   ]
  },
  "long_dist": {
   "setters": [
    "p3_008"
   ]
  },
  "mentor_bond": {
   "setters": [
    "p18_009",
    "p20_001",
    "p9_003"
   ]
  },
  "monthly_sync_habit": {
   "setters": [
    "p9_054"
   ]
  },
  "moved_city": {
   "setters": [
    "p11_035",
    "p15_006",
    "p15_009",
    "p17_001",
    "p17_011",
    "p17_018"
   ]
  },
  "moved_school": {
   "setters": [
    "p11_038"
   ]
  },
  "music_stage": {
   "setters": [
    "p10_018"
   ]
  },
  "near_family": {
   "setters": [
    "fork33",
    "p17_054"
   ]
  },
  "new_friend": {
   "setters": [
    "p11_055"
   ]
  },
  "night_school": {
   "setters": [
    "e65_019",
    "p16_011",
    "p16_036",
    "p20_041"
   ]
  },
  "no_ins": {
   "setters": [
    "p12_001"
   ]
  },
  "often_back": {
   "setters": [
    "fork28"
   ]
  },
  "p19_p2p_in": {
   "setters": [
    "p19_001"
   ]
  },
  "p19_stock_add": {
   "setters": [
    "p19_064"
   ]
  },
  "p19_stock_hold": {
   "setters": [
    "p19_064"
   ]
  },
  "p19_stock_trim": {
   "setters": [
    "p19_064"
   ]
  },
  "p1_ai_user": {
   "setters": [
    "p1_023"
   ]
  },
  "p20_cnc_retrain": {
   "setters": [
    "p20_025"
   ]
  },
  "p20_league_member": {
   "setters": [
    "p20_029"
   ]
  },
  "p20_newline_trained": {
   "setters": [
    "p20_016"
   ]
  },
  "p20_toolbox_kept": {
   "setters": [
    "p20_056"
   ]
  },
  "parent_help": {
   "setters": [
    "p2_075"
   ]
  },
  "parent_pension_ok": {
   "setters": [
    "p12_015"
   ]
  },
  "parents_money_guard": {
   "setters": [
    "p12_039"
   ]
  },
  "photo_show": {
   "setters": [
    "p10_006"
   ]
  },
  "photos_scanned": {
   "setters": [
    "p10_052",
    "p25_079"
   ]
  },
  "plan_late_retire": {
   "setters": [
    "e65_051"
   ]
  },
  "prepaid": {
   "setters": [
    "p12_067",
    "p2_056"
   ]
  },
  "promise_grandkid": {
   "setters": [
    "e65_054"
   ]
  },
  "refused_drink_once": {
   "setters": [
    "p9_008"
   ]
  },
  "rehire": {
   "setters": [
    "fork58",
    "p15_042"
   ]
  },
  "renting": {
   "setters": [
    "e78_006",
    "fork33",
    "p17_003",
    "p17_021",
    "p17_024"
   ]
  },
  "renzheng_drawer": {
   "setters": [
    "p26_057"
   ]
  },
  "retired_full": {
   "setters": [
    "fork58"
   ]
  },
  "run_marathon": {
   "setters": [
    "p10_010"
   ]
  },
  "saw_home": {
   "setters": [
    "e78_050",
    "fork28"
   ]
  },
  "secondment_extended": {
   "setters": [
    "p9_023"
   ]
  },
  "shop_closed": {
   "setters": [
    "p2_040",
    "p30_008"
   ]
  },
  "side_job": {
   "setters": [
    "fork44",
    "p15_044",
    "p20_034"
   ]
  },
  "side_start": {
   "setters": [
    "fork25"
   ]
  },
  "slow_life": {
   "setters": [
    "fork58"
   ]
  },
  "ss_fixed": {
   "setters": [
    "p12_011",
    "p22_005"
   ]
  },
  "stall_breakfast": {
   "setters": [
    "e55_033",
    "p15_029"
   ]
  },
  "stay_put": {
   "setters": [
    "fork25"
   ]
  },
  "stayed_city": {
   "setters": [
    "fork28"
   ]
  },
  "steady_job": {
   "setters": [
    "fork44",
    "p15_023"
   ]
  },
  "stock_2008": {
   "setters": [
    "e65_037"
   ]
  },
  "team_captain": {
   "setters": [
    "p22_010"
   ]
  },
  "together": {
   "setters": [
    "p3_038",
    "p3_043"
   ]
  },
  "took_over_job": {
   "setters": [
    "e55_007"
   ]
  },
  "touched_trade": {
   "setters": [
    "e65_030"
   ]
  },
  "traj_antique": {
   "setters": [
    "r_antique"
   ]
  },
  "traj_award": {
   "setters": [
    "r_award"
   ]
  },
  "traj_book": {
   "setters": [
    "r_book"
   ]
  },
  "traj_captain": {
   "setters": [
    "r_captain_final"
   ]
  },
  "traj_champ": {
   "setters": [
    "r_marathon"
   ]
  },
  "traj_craft": {
   "setters": [
    "r_craft_apprentice"
   ]
  },
  "traj_drug1": {
   "setters": [
    "r_drug1"
   ]
  },
  "traj_drug2": {
   "setters": [
    "r_drug2"
   ]
  },
  "traj_funded": {
   "setters": [
    "r_funding"
   ]
  },
  "traj_hero": {
   "setters": [
    "r_rescue"
   ]
  },
  "traj_ipo": {
   "setters": [
    "r_ipo"
   ]
  },
  "traj_lottery": {
   "setters": [
    "r_lottery"
   ]
  },
  "traj_patent": {
   "setters": [
    "r_patent"
   ]
  },
  "traj_school": {
   "setters": [
    "r_school1"
   ]
  },
  "traj_startup": {
   "setters": [
    "r_startup"
   ]
  },
  "traj_taoli": {
   "setters": [
    "r_teacher_students"
   ]
  },
  "traj_trucker": {
   "setters": [
    "r_trucker_route"
   ]
  },
  "traj_village_doc": {
   "setters": [
    "r_village_doc"
   ]
  },
  "traj_viral": {
   "setters": [
    "r_viral"
   ]
  },
  "traj_vp": {
   "setters": [
    "r_school2"
   ]
  },
  "traj_windfall": {
   "setters": [
    "r_oldhouse"
   ]
  },
  "tried_stock": {
   "setters": [
    "e65_008",
    "p17_028",
    "p18_019"
   ]
  },
  "tutor_hard": {
   "setters": [
    "p3_054"
   ]
  },
  "two_cities": {
   "setters": [
    "p11_042"
   ]
  },
  "unit_team": {
   "setters": [
    "p16_023"
   ]
  },
  "video_addict": {
   "setters": [
    "p10_045"
   ]
  },
  "video_quit": {
   "setters": [
    "p10_046"
   ]
  },
  "volunteer_regular": {
   "setters": [
    "p9_022"
   ]
  },
  "went_sancan": {
   "setters": [
    "e65_014"
   ]
  },
  "xiahai": {
   "setters": [
    "e65_011"
   ]
  }
 }
};
