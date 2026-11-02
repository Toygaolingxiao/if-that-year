/* 《如果那年》状态矩阵注册表（v0.13.0）——单一事实源。
   域（domains）：域内互斥 / 流转不可逆的人生状态。引擎只执行此处声明的边（edges）；
   by = 载体条目 id（分岔记 fork<年龄>）；reserved 边已设计但暂无载体，不可达警告属预期。
   里程碑（milestones）：普通叙事旗标，setters 为全部立旗条目 id；
   新增/改动旗标必须同步登记，tools/validate-state.js 会逐项核对，未登记即报错。
   详细口径见 docs/STATE-MATRIX.md。
   通用门/变体字段（v0.19.0 三相登记，形状在此备案，校验器逐项核对）：
   - kidMin / kidMax（条目级，数字）：孩子年龄下限/上限门，kidAge = 当前年龄 − kidsAt，抽取层 met() 求值。
   - flagAgeWithin（条目级）：{ flag: <已登记里程碑 id>, years: <非负数> }——旗落点后 years 年内才可抽，读引擎 flagAges。
   - textState（条目级）/ echoState（选项级）：{ 域: { 状态值: 文本 } }——呈现时按本局状态选文本，未命中回落 text / echo。
   - ctx.form / ctx.notForm（条目级，v0.20.0 M2 登记）：形态值数组（值域 farm/public/self/flex/employee）——
     抽取层 ctxOk 求值：form 命中任一即过、notForm 命中任一即拦。形态由 work.js formOf() 按规则表派生，不进存档。
   - ctx.mainLine（条目级，v0.20.0 M2 形态补修第二批登记）：入行旗 id 或其数组（值域 = work.js
     FORM_OF_FLAG 的键）——抽取层 ctxOk 求值：本局主入行旗（work.js mainEntryOf()，R1 最近入行）
     命中才可抽，无主入行旗时不过。治「入行旗只进不出」——旧线终身口吻条目只认本线是当下主线
     时才出。同样是派生量，不进存档；validators 对其形状与值域逐项核对。
   - textForm（条目级）/ echoForm（选项级，v0.20.0 M2 登记）：{ 形态: 文本 }——呈现时按本局形态选文本
     （解析点与 textState 同一机制：views/year.js formText/echoText），未命中回落 textState 变体或原文。
   - labelForm（选项级，v0.20.0 M2 收尾登记）：{ 形态: 文本 }——分岔选项标签的形态变体，解析点 views/year.js
     labelText（先 spouse 变体、再形态覆盖）；流水账与未选支记录同走此读法，结算 chosenOfFork 按变体集合反查。 */
/* 拆分说明（v0.20.0）：version 与 domains 已移至 src/world/state.js（须在本文件之前加载）；
   本文件只登记里程碑（milestones），正文与拆分前一字未动。 */
window.GAME_REGISTRY.milestones = {
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
  "care_stage": {
   "setters": [
    "proc_dad_care",
    "proc_mom_care"
   ],
   "note": "引擎在任一父母进程进入照护段呈现时立（renderProcItem 的 beat=care 分支），表示家里已进入照护期；父母离世后不撤销，读它的条目须自带在世门（v0.19.0 审计急修登记，此前为未登记的引擎内部旗）"
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
    "p25_009",
    "proc_dad_care",
    "proc_dad_hosp",
    "proc_mom_care",
    "proc_mom_hosp"
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
    "p24_042",
    "proc_dad_care",
    "proc_mom_care"
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
  "spouse_passed": {
   "setters": [
    "p28_001"
   ],
   "note": "伴侣离世落点（v0.19.0 三相）：p28_001 呈现即立旗，引擎 flagAges 记落点年龄；p28_002 以 flagAgeWithin{flag:spouse_passed,years:2} 只在离世后 2 年内可抽，挡身后手续隔多年重办"
  },
  "late_parent": {
   "setters": [
    "lk_born",
    "e_kid_settle",
    "e_kid_final"
   ],
   "note": "晚育标记（v0.16.0）：中年以后得子（fork45 再试链 lk_born，或 e_kid_settle 42–50 / e_kid_final 52–58 选「要」）。隐含孩子已成年的 has 门控事件以 forbid 排除本旗持有者，清单与口径见 STATE-MATRIX §2 与本轮报告"
  },
  "late_settle": {
   "setters": [
    "fork45"
   ],
   "note": "45 岁分岔主动落定不要（v0.16.0）"
  },
  "cov38_has": {
   "setters": [
    "fork38"
   ],
   "note": "立约·要（v0.17.0）：38 岁分岔选「要」登记的持续之约，年度流 cov_has_flow 读此旗；只记约不碰 kids 状态机"
  },
  "cov38_none": {
   "setters": [
    "fork38"
   ],
   "note": "立约·不要（v0.17.0）：同上，年度流 cov_none_flow"
  },
  "cov38_wait": {
   "setters": [
    "fork38"
   ],
   "note": "立约·再等等（v0.17.0）：悬账之约，年度流 cov_wait_flow，到期点为 45 岁分岔（fork45 前缀行）与 e_kid_settle/final 的既有落定路"
  },
  "mark_deskmate": {
   "setters": [
    "pr_child1"
   ],
   "note": "童年记号（v0.17.0）：开学第一天的半块橡皮；成年回响 echo_deskmate，影子回响见 src/content/prologue/prologue.js MARKS"
  },
  "mark_river": {
   "setters": [
    "pr_child2"
   ],
   "note": "童年记号（v0.17.0）：放学路上的河沟；成年回响 echo_river"
  },
  "mark_tree": {
   "setters": [
    "pr_child4"
   ],
   "note": "童年记号（v0.17.0）：校门口的老梧桐；成年回响 echo_tree"
  },
  "late_tried": {
   "setters": [
    "lk_none",
    "lk_fade"
   ],
   "note": "认真试过而没有（v0.16.0）：治疗走完（lk_none）或断续试到停下（lk_fade）"
  },
  "late_try": {
   "setters": [
    "fork45"
   ],
   "note": "45 岁分岔选「再认真试一回」（v0.16.0），开启 pack34 链与 synergy 晚育稀有"
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
    "fork28m",
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
    "fork28m",
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
    "p15_042",
    "e_rehire_1",
    "e_rehire_2"
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
   ],
   "note": "58 岁分岔「退」选项专属（v0.19.0 厘清）：退休相位进程（proc_retire_*）只写 workPhase 状态、不立此旗——此旗是 end_traveler 等特殊结局的证据点，生产者集合不变，结局门槛不动"
  },
  "retired_begun": {
   "setters": [
    "proc_retire_full",
    "proc_retire_auto",
    "proc_retire_node"
   ],
   "note": "首次进入 retired 的落点旗（v0.19.0 审计急修）：只记首次全退年龄供 flagAgeWithin 读（如 e_retire_firstmonth 的两年窗）；与 retired_full 分工——retired_full 仍为 fork58 专属证据旗，生产者不变"
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
    "fork58",
    "proc_retire_node"
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
  },
  "med_work": {
   "setters": [
    "e_med_start"
   ],
   "note": "从医经历（v0.18.0，职业语境门）：卫生院入行拍立旗，村医类稀有与结局以此为门"
  },
  "truck_work": {
   "setters": [
    "e_truck_start"
   ],
   "note": "长途职业线入行（v0.18.0，职业语境门）：跟车入行拍立旗"
  },
  "truck_veteran": {
   "setters": [
    "e_truck_years"
   ],
   "note": "长途跑满十来年（v0.18.0）：入行链后继立旗，「跑满一百万公里」结局以此为门"
  },
  "literacy_gain": {
   "setters": [
    "pr_never2"
   ],
   "note": "识字线（v0.18.0）：never 处境 15 岁夜校拍立旗，成年段有回响事件"
  },
  "home_ledger": {
   "setters": [
    "pr_never2"
   ],
   "note": "在家记账认字（v0.18.0）：never 处境夜校拍的另一条路"
  },
  "half_grown": {
   "setters": [
    "pr_half3"
   ],
   "note": "半读出身补课（v0.18.0）：half 线 19 岁拍立旗，成年段有回响事件"
  },
  "factory_work": {
   "setters": [
    "p15_071"
   ],
   "note": "工厂制造入行（v0.19.0，职业语境门）：招工入行拍立旗，工厂主簇以此为门"
  },
  "craft_work": {
   "setters": [
    "p20_001",
    "p20_002",
    "p20_003",
    "p20_008"
   ],
   "note": "技工入行（v0.19.0）：钳/焊/机修/家电维修学徒拍立旗，技工簇以此为门"
  },
  "miner_work": {
   "setters": [
    "p20_009"
   ],
   "note": "矿工入行（v0.19.0）：矿上招工签约选项立旗，井下簇以此为门"
  },
  "fab_work": {
   "setters": [
    "p18_032"
   ],
   "note": "半导体入行（v0.19.0）：进晶圆厂跟线入行拍立旗，晶圆/封测簇以此为门"
  },
  "shop_work": {
   "setters": [
    "p19_005",
    "p19_025",
    "p19_055"
   ],
   "note": "店主入行（v0.19.0）：批发学徒/接手家店/开网店拍立旗，商户簇以此为门"
  },
  "gig_work": {
   "setters": [
    "p22_071"
   ],
   "note": "零工/自由职业入行（v0.19.0）：劳务市场报名接活拍立旗，零工簇以此为门；与 side_job（副业）分家"
  },
  "courier_work": {
   "setters": [
    "p22_002",
    "p22_072"
   ],
   "note": "快递物流入行（v0.19.0）：转运分拣/站点招工拍立旗，快递簇以此为门"
  },
  "farm_work": {
   "setters": [
    "p29_001",
    "p29_002"
   ],
   "note": "种地入行（v0.19.0）：分家单过/分地到户拍立旗，种地簇以此为门"
  },
  "teach_work": {
   "setters": [
    "r_school1"
   ],
   "note": "教师入行（v0.19.0）：r_school1 分配到校呈现即立（两选项均为教书），教师簇以此为门；traj_school 仍为轨迹旗"
  },
  "acct_work": {
   "setters": [
    "p16_016"
   ],
   "note": "财会入行（v0.19.0）：第一份出纳活入行拍立旗，出纳簇以此为门"
  },
  "care_work": {
   "setters": [
    "p21_073"
   ],
   "note": "职业陪护入行（v0.19.0）：陪护接活入行拍立旗；与家庭照护旗 care_ss_gap/care_self 分家"
  },
  "write_work": {
   "setters": [
    "p2_086"
   ],
   "note": "写作入行（v0.19.0）：副业写作留用拍立旗，r_book/end_bestseller 以此为证据门"
  },
  "nurse_work": {
   "setters": [
    "p21_072"
   ],
   "note": "医护·病房护士支（v0.19.0）：医院分科拍病房选项立旗"
  },
  "med_hosp": {
   "setters": [
    "p21_071"
   ],
   "note": "医院线入行（v0.19.0）：市医院招工培训拍立旗，影像/病房/药房三支共用此门"
  },
  "img_work": {
   "setters": [
    "p21_072"
   ],
   "note": "医护·影像科支（v0.19.0）：医院分科拍影像选项立旗，影像簇以此为门"
  },
  "heavy_work": {
   "setters": [
    "p20_004"
   ],
   "note": "重工业入行（v0.19.0）：进钢铁厂入行拍立旗，钢铁/油田支以此为门（工厂线支线）"
  },
  "dev_work": {
   "setters": [
    "p22_073"
   ],
   "note": "软件开发入行（v0.19.0）：c2000 软件公司入行拍立旗"
  },
  "press_work": {
   "setters": [
    "p30_022"
   ],
   "note": "报社入行（v0.19.0）：报社招工入行拍立旗（全池仅 p30_012 一条在行）"
  },
  "driver_taxi": {
   "setters": [
    "p30_021"
   ],
   "note": "出租车入行（v0.19.0）：出租车公司招工入行拍立旗"
  },
  "fin_work": {
   "setters": [
    "p18_021"
   ],
   "note": "证券柜台入行（v0.19.0，年代内小线）：营业部柜台留任选项立旗，仅 c1965 两条"
  }
 };
