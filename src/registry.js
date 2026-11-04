/* 《如果那年》状态矩阵注册表（v0.13.0）——单一事实源。
   域（domains）：域内互斥 / 流转不可逆的人生状态。引擎只执行此处声明的边（edges）；
   by = 载体条目 id（分岔记 fork<年龄>）；reserved 边已设计但暂无载体，不可达警告属预期。
   里程碑（milestones）：普通叙事旗标，setters 为全部立旗条目 id；
   新增/改动旗标必须同步登记，tools/validate-state.js 会逐项核对，未登记即报错。
   详细口径见 docs/STATE-MATRIX.md。
   通用门/变体字段（v0.19.0 三相登记，形状在此备案，校验器逐项核对）：
   - kidMin / kidMax（条目级，数字）：孩子年龄下限/上限门，kidAge = 当前年龄 − kidsAt，抽取层 met() 求值。
   - kidAgeMin / kidAgeMax（条目级，数字，v0.20.1）：孩子真实年龄下限/上限门，kidAgeTrue = 当前年龄 − (kidsBornAt ?? kidsAt)
     ——出生拍（apply.js BORN_BEATS：p3_046 / lk_born / e55_057）落过出生年按出生年算，没落过回落落定年龄；
     与 kidMin/kidMax 分工：存量 kidMin/kidMax 锚落定年、标定不动，新挂的阶段文本（高考/家长会/入园/孙辈等）锚出生年。
     形状核对与 kidMin 同口径：须为数字且 kidAgeMin ≤ kidAgeMax（tools/validate-state.js）。
   - petMin / petMax（条目级，数字，v0.20.1）：宠物真实年龄下限/上限门，petAge = 当前年龄 − (catAt ?? dogAt)，
     catAt/dogAt 由 apply.js 在 cat/dog 流转到 home（抱回）时落点；物种按条目自身的 state/stateAll/stateNot/
     setState/chain 推断（chain p5_043=猫、p11_049=狗），分不清物种的条目两边都查、任一满足即过。
     形状核对同 kidMin 口径（tools/validate-state.js）。
   - flagAgeWithin（条目级）：{ flag: <已登记里程碑 id>, years: <非负数> }——旗落点后 years 年内才可抽，读引擎 flagAges。
   - textState（条目级）/ echoState（选项级）：{ 域: { 状态值: 文本 } }——呈现时按本局状态选文本，未命中回落 text / echo。
   - ctx.form / ctx.notForm（条目级，v0.20.0 M2 登记）：形态值数组（值域 farm/public/self/flex/employee）——
     抽取层 ctxOk 求值：form 命中任一即过、notForm 命中任一即拦。形态由 work.js formOf() 按规则表派生，不进存档。
   - ctx.mainLine（条目级，v0.20.0 M2 形态补修第二批登记）：入行旗 id 或其数组（值域 = work.js
     FORM_OF_FLAG 的键）——抽取层 ctxOk 求值：本局主入行旗（work.js mainEntryOf()，R1 最近入行）
     命中才可抽，无主入行旗时不过。治「入行旗只进不出」——旧线终身口吻条目只认本线是当下主线
     时才出。同样是派生量，不进存档；validators 对其形状与值域逐项核对。
   - ctx.entry（条目级，v0.20.1 W6 登记）：true——纯入行拍防叠门：本局已有主入行旗
     （work.js mainEntryOf 非空）时不可抽；带明确转行/接管叙事的条目与线内分科条目不声明。
     v0.20.1 W9 扩展（同键同门，不另立键）：home 路线（route=home 或序章轨道 track=home）
     在考试链未决窗（22–28 岁，未落 exam_passed/exam_landed/exam_failed）内，纯入行拍
     同样不可抽——路线主线未定之前不许被其他行当抢先落成；链落定或落空（exam_failed
     或窗已过）后自动放行。求值在 record.js 的 ctxOk，求值口径以彼处注释为准。
   - ctx.notMainLine（条目级，v0.20.1 W6 登记）：入行旗 id 数组——当前主线命中任一即拦
     （医护在行期间的公司口径文本用；值域与 ctx.mainLine 同为 FORM_OF_FLAG 的键）。
   - ctx.eduGate（条目级，v0.20.1 W6 登记）：true——学历门：须 schooling=school 或已立
     edu_bridge 旗（夜校/自考桥）；schooling=pre（无序章处境判定的年代）恒过。
   - ctx.eduGateHalf（条目级，v0.23 WP8 fix4 登记）：true——宽学历门：eduGate 口径另放行
     schooling=half。用于考试链链身与同类质地条目（补门前本可被 half 单独抽到，续读行为
     不变，只挡 never/left 未立桥者）；链头 p16_001 仍用 eduGate。求值在 record.js ctxOk。
   - ctx.anyCareTarget（条目级，v0.20.1 W8 登记）：true——在护对象门：陪床/等喊号/护工排班类
     文本须有当下还在的在护对象——父母任一在世且处于父母照护情境（care_self/care_hired/
     care_rotate 任一事实在账），或伴侣在场（partnered/dating）且有伴侣照护事实
     （care_hired_spouse 在账）；求值在 record.js ctxOk，与 ctx.entry 同为派生量、不进存档；
     tools/validate-state.js 核对形状（出现时须为 true）。
   - textForm（条目级）/ echoForm（选项级，v0.20.0 M2 登记）：{ 形态: 文本 }——呈现时按本局形态选文本
     （解析点与 textState 同一机制：views/year.js formText/echoText），未命中回落 textState 变体或原文。
   - labelForm（选项级，v0.20.0 M2 收尾登记）：{ 形态: 文本 }——分岔选项标签的形态变体，解析点 views/year.js
     labelText（先 spouse 变体、再形态覆盖）；流水账与未选支记录同走此读法，结算 chosenOfFork 按变体集合反查。
   - rehireAfterRetire（条目级，布尔，v0.20.1 W7 登记）：true——返聘后复退门：账本里首次
     workPhase>retired 流转之后真有过 retired→part 返聘边才可抽（求值在 scheduler.js met，
     事实读法在 work.js hasRehireAfterRetire，只读账本不读 rehire 旧旗）。形状核对在
     tools/validate-state.js（须为布尔）。
   - textRetireYears（条目级，v0.20.1 W7 登记）：{ mid: 文本, long: 文本 }——退休年数变体：
     按 S.retiredAt 算出的退休年数分版（≤2 年原文、3–6 年 mid、>6 年 long），解析点
     views/year.js retireYearsText，把已解析正文首处「没多久」替换为 mid/long 的时间词；
     形状核对在 tools/validate-state.js（mid/long 须为非空文本，且条目 text 须真含「没多久」）。
   - textNoUnit（条目级）/ echoNoUnit（选项级，v0.20.1 W2 登记、W7 扩至分岔）：不点名单位
     变体——本局无当前单位事实（work.js noCurrentUnit）时优先于 textForm/textState，
     解析点 views/year.js formText/echoText（进程拍另有 work.js applyRetireVariant 通道）。
   - textEra（条目级）/ echoEra / labelEra（选项级，v0.20.1 面板急修登记）：{ 年代id: 文本 }——
     年代变体。年代不是状态域（S.era 独立于 S.state，textState 的键装不下年代），故同形另立：
     解析点 views/year.js eraVariant（formText/echoText/labelText 各叠一层，优先级
     无单位 > 年代 > 形态 > 状态），未声明本年代时回落原文。键值域 = 六个年代 id
     （c1955/c1965/c1978/c1985/c1995/c2000），tools/validate-state.js 与 validate-storylet.js 逐项核形状。
     v0.23 WP1（E1）：分岔（fork）与分岔选项同享此机制——fork 级 textEra 由 views/year.js 的 formText
     解析、choice 级 labelEra/echoEra 由 labelText/echoText 解析，口径与条目级完全一致，不另立通道。
   - stagesEra（影子级，D.shadows 各路线对象上）：{ 原文行: { 年代id: 文本 } }——影子阶段文本的
     年代变体：键为该路线 stages 里的原文行，值为该行在本年代的替换行；解析点 views/shadow.js
     shadowStageText（取池后、既有年代/阶段过滤之前逐行映射，未声明本年代时回落原文行，未声明
     stagesEra 的路线恒等映射、行为一字不变）；池大小与随机消耗不变，键值域同 textEra（六个年代 id）。
   - eraFrame（分岔级，v0.23 WP1 E2 登记）：{ 年代id: { text, choices } }——fork33 的年代框变体：
     命中本年代时整框替换题面与全选项（set 旗与影子政策按旗匹配的读法不变），未命中回落本体；
     解析点 views/year.js renderFork 与 shadow-life.js 的无头解决器（两处同口径）；框与本体的对应
     关系登记在 src/anchors.js 的 GAME_ANCHORS.eraFrames，内容（c1955/c1965 两框）随 WP6 落。
   - 枚举事实（v0.23 WP1 E11 定版）：多值干上事实（examBand/schoolingDepth/sentdownForm/quotaHolder/
     studyForm）不用里程碑的布尔模型，统一登记在本文件尾部的 GAME_REGISTRY.enumFacts（名、值集、
     宿主域 host、缺省 absent＝未发生）；持久化挂存档根上的伴随容器 S.facts（{ 事实名: 值 }，
     与 S.state/S.flags 并列，见 src/engine.js freshState），旧档缺失容器或缺失键一律按 absent 读、
     不掷不补写；validate-state 按值集校验数据里的 setFact/requiresFact 声明；分根复制按 E8 清单
     逐项点名（src/world/shadow-life.js birthShadow）。注意与 trackAlt 分家：PACK-SPEC 的 trackAlt
     是序章文本变体义（流抽签定版），玩家亲选的中专身份是枚举事实 studyForm，两义不许混登记。
   - 序章选项门（v0.23 WP1 E3 登记）：序章 choices 可带 requiresSit（处境值或其数组）/
     requiresState（{ 域: 值或值数组 }）/ requiresFlag（旗名或其数组，须全立）/ requiresFact
     （{ 枚举事实名: 值或值数组 }，按 absent 口径读）——不满足即不出（默认不提这扇门，不用灰置）；
     求值点 src/content/prologue/prologue.js present（gateChoices）。题面尾句 gateNote 只在
     gateNoteNeeds 声明的资格来源事实全部已立（旗已立或枚举事实非 absent）时才渲染，缺省
     （无 gateNoteNeeds 或事实未立）恒不渲染；gateNote 文案规格：叙述者口吻、一句、≤40 字、
     只陈述规则与事实，不许出现「你不符合／由于／资格／条件不足」式通知腔（validate-storylet 逐字拦）。
   - familyBeat 拍型（v0.23 WP1 E4 登记）：序章 act 带 familyBeat:true——处境陈述（act.text，
     无选项段）＋小应对（act.choices）＋回声（act.echo）。小应对 effects 白名单：只许 relation/
     wisdom 且单项 |值|≤1，另许 set（记号，须已登记里程碑）与 familyFact（家庭事实旗，须已登记在
     本文件尾部 GAME_REGISTRY.familyFacts）；不许 setState、不许 setFact——尤其不许写 quotaHolder：
     顶替名额归属只能由 L65-家 的发放规则函数写（蓝图 §3.3），validate-state 对 familyBeat 专门断言。
     Runtime 落点：prologue.js choose 写 familyFact 旗并拦截 familyBeat 选项的 setFact（防御纵深）。
   - exam 链头年代门（v0.23 WP1 E10 机制面）：pack16 链头条目 p16_001 可带 eraIn（年代 id 数组，
     scheduler.js met() 现行求值）关停老年代的考试链；字段支持在此登记，取值随 WP6 落码——
     本包不改链头数据（关停与密度回补是 WP6/WP2/WP3 的内容面）。
   - 登记数据文件（v0.23 WP1 E9 骨架）：各内容包的新登记（里程碑/枚举事实/家庭事实旗/examBand
     分表/序章分岔锚点）一律写独立登记数据文件、加载期合入，不许直改本文件本体。文件形状：
     window.GAME_REGISTRY_EXTRA = (window.GAME_REGISTRY_EXTRA || []).concat([{ milestones:{},
     enumFacts:{}, familyFacts:{}, examBandTables:{}, prologueForks:[] }])；加载点 = index.html
     里 state.js 之前（样例文件 src/content/registry-v023.js）；合入点 = 本文件尾部（registry 类）
     与 src/anchors.js（prologueForks 类），同名先登记者胜、后到者不覆盖。 */
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
    "p11_040",
    "ab37_023",
    "ab37_024"
   ],
   "note": "回老家落脚（v0.20.1 面板急修补）：ab37_023 派遣项目结束选「回了」与 ab37_024 晚年选「回去在老家过」同立此旗，居所轨迹 residenceTrail 据此把终点写成 home，与 p11_040 同一写法"
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
  "huiqian_chosen": {
   "setters": [
    "p30_003"
   ],
   "note": "拆迁回迁线（v0.20.1 W5）：p30_003 选回迁选项立旗，p30_020 回迁房交钥匙以此为 require 门"
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
    "proc_dad_care",
    "proc_dad_hosp",
    "proc_mom_care",
    "proc_mom_hosp"
   ],
   "note": "请人照护·父母（v0.20.1 拆分）：自本轮起只由父母照护的 set 点立旗，结算父母槽读它不会再读错人；伴侣/自照护的请人点改立 care_hired_spouse"
  },
  "care_hired_spouse": {
   "setters": [
    "p21_055",
    "p24_006",
    "p24_024",
    "p25_009"
   ],
   "note": "请人照护·伴侣与自照护（v0.20.1 新旗）：另一半住院/出院请人（p24_006、p24_024、p25_009）与孩子给玩家请住家保姆（p21_055）的 set 点；与父母照护的 care_hired 分家，父母槽不读本旗"
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
    "proc_dad_hosp",
    "proc_mom_care",
    "proc_mom_hosp"
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
    "p16_072"
   ],
   "note": "体制内上岸落点（v0.20.1 W6 改链）：面试（p16_005）只落 exam_passed，录取（p16_071）→报到（p16_072）链尾才落本旗，后续体制内在行文本以此为据"
  },
  "exam_passed": {
   "setters": [
    "p16_005"
   ],
   "note": "考试线面试通过（v0.20.1 W6 新旗）：p16_005 面试拍的通过选项立旗，录取拍 p16_071 以 require+chain 承接"
  },
  "exam_admitted": {
   "setters": [
    "p16_071"
   ],
   "note": "录取落点（X-1 新旗）：p16_071 呈现即立；p16_072 以此为 require，报到不得先于录取；exam_passed 仍为面试通过旗、语义不变"
  },
  "exam_failed": {
   "setters": [
    "p16_007"
   ],
   "note": "考试线明确落空（v0.20.1 W9 新旗）：p16_007 第二年再考仍差一点的选项立旗；与 exam_retry（单次未中、仍可再试）分工——本旗只在再试也落空时落下。消费者：record.js 的路线未决门（落空后放行其他行当入行拍）、备考类通用文本的 forbid"
  },
  "edu_bridge": {
   "setters": [
    "p16_073"
   ],
   "note": "学历桥（v0.20.1 W6 新旗）：schooling=never/left 的人 22 岁选 study 后先走夜校/自考桥（p16_073）立旗，大学/专业/课题类文本以 ctx.eduGate 认本旗或 schooling=school"
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
  "only_child": {
   "setters": [
    "cf_11"
   ],
   "note": "出身牌钩子（v0.20.1 W5）：cf_11「家里就你一个」立旗，兄弟姐妹类文本以 forbid 排除独生出身"
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
    "e78_017",
    "e85_004"
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
  "cov_solo_done": {
   "setters": [
    "cov_solo_due"
   ],
   "note": "立约单身对账（v0.20.1）：45 岁无伴侣时 cov_solo_due 一个人把约对完立此旗；结算对账行与没办完槽读它给单身版本。W8 补修：选「收了这份约」的选项另带 setState kids→none（边载体已登记），约与孩子一并结账；选「约先对到这儿」不落定，kids 仍走 e_kid_settle/final 单身收养版"
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
  "mark_candy": {
   "setters": [
    "pr_child1"
   ],
   "note": "童年记号（v0.21.1 变体）：开学第一天的水果糖；成年回响 echo_candy，影子回响见 prologue.js MARKS"
  },
  "mark_window": {
   "setters": [
    "pr_child1"
   ],
   "note": "童年记号（v0.21.1 变体）：坐了一年的靠窗座位；成年回响 echo_window，影子回响见 prologue.js MARKS"
  },
  "mark_wrongline": {
   "setters": [
    "pr_child1"
   ],
   "note": "童年记号（v0.21.1 变体）：开学第一天站错队；成年回响 echo_wrongline，影子回响见 prologue.js MARKS"
  },
  "mark_hoop": {
   "setters": [
    "pr_child2"
   ],
   "note": "童年记号（v0.21.1 变体）：巷口滚铁环；成年回响 echo_hoop，影子回响见 prologue.js MARKS"
  },
  "mark_corn": {
   "setters": [
    "pr_child2"
   ],
   "note": "童年记号（v0.21.1 变体）：暑假钻玉米地；成年回响 echo_corn，影子回响见 prologue.js MARKS"
  },
  "mark_icepop": {
   "setters": [
    "pr_child2"
   ],
   "note": "童年记号（v0.21.1 变体）：一毛钱的冰棍；成年回响 echo_icepop，影子回响见 prologue.js MARKS"
  },
  "mark_shop": {
   "setters": [
    "pr_child4"
   ],
   "note": "童年记号（v0.21.1 变体）：校门口小卖部关门；成年回响 echo_shop，影子回响见 prologue.js MARKS"
  },
  "mark_yearbook": {
   "setters": [
    "pr_child4"
   ],
   "note": "童年记号（v0.21.1 变体）：毕业留言册；成年回响 echo_yearbook，影子回响见 prologue.js MARKS"
  },
  "mark_classphoto": {
   "setters": [
    "pr_child4"
   ],
   "note": "童年记号（v0.21.1 变体）：毕业照；成年回响 echo_classphoto，影子回响见 prologue.js MARKS"
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
  "retire_final_said": {
   "setters": [
    "e_retire_firstmonth"
   ],
   "note": "退休落定已当众说过（v0.20.1 W2，退休单一事实源之一）：首次全退落定起立、一局只认第一次。数据层 setter 为 e_retire_firstmonth（落定后两年窗内呈现即立）；引擎侧由 work.js 的 syncRetireFinalSaid 在账本首次出现 workPhase>retired 流转时同步立旗并按流转年龄记 flagAges——落定载体（proc_retire_node/full/auto 的 set 位已被 retired_begun 占用、fork58 已被 retired_full 占用）无空位可再立一旗，故以引擎同步补齐，口径与 retired_begun 的首次落点一致。消费者：proc_retire_full 的再退变体选择（workPhaseDue 按账本判）、p14_010 的 require、规划类文本（p10_065 等）的 forbid；呈现任何落定文本前先查此旗"
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
  "rel_strained": {
   "setters": [
    "p3_007",
    "p13_016"
   ],
   "note": "关系紧张事实（v0.20.1 W5 立，W8 收紧）：只认「吵完没收尾」的留痕——p3_007 冷战一晚无和好收尾、p13_016 仅「各管各的」选项（立规矩和好的选项不立）。吵完和好/误会查清的事件不立此旗：c_partner（对方先递热水、日子续上）、p3_020（日期两边都记错、查清即收尾）已摘。p27_001 离婚以前情门 any[two_cities, rel_strained, long_dist] + 当前关系值门（stats relation<85）双认（v0.20.3 回调，用户裁定离婚更方便一点：窗口 30–58→28–60、加 w=800 提抽取可靠性、relation 门 70→85、any 增列 long_dist——p3_008「去吧，我这边稳住」的两地分开两年事实，与 two_cities 同类；前情事实门整段保留，无前情仍不可抽，rel_strained 的立旗标准不放宽）"
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

/* ---- v0.23 WP1 登记区（E11 枚举事实 / E5 examBand 分表 / E9 家庭事实旗与登记合入）----
   本段是 WP1 的登记骨架本体：枚举事实与家庭事实旗在此定版登记；各内容包的新登记不许改
   本文件，写独立登记数据文件（形状见文件头注释与 src/content/registry-v023.js），由本段
   尾部的合入器在加载期并入（同名先登记者胜）。 */

// 枚举事实（E11）：{ values 值集, host 宿主域（伴随字段的归属域，只作口径标注）, note }
// 缺省恒 absent（未发生）——S.facts 里无此键、或存档无 facts 容器，都按 absent 读。
window.GAME_REGISTRY.enumFacts = {
  "examBand": {
    "values": ["high", "mid", "low"],
    "host": "track",
    "note": "考试分数档（三档，v0.23 E5）：序章分岔拍内经考试场景由 rollExamBand（序章自有流）掷定；分布是设计参数、按代×处境分表登记在 examBandTables，无统计出处；band 只切第一次的单子、不锁终身（出口见蓝图 §3.2 总则④）"
  },
  "schoolingDepth": {
    "values": ["full", "cut", "none"],
    "host": "schooling",
    "note": "读到哪儿的深度标（v0.23 E6）：full=读完高中段 / cut=短读 / none=没读；不新开状态域，按枚举事实登记、validate-state 按值集校验；F55-a 写、F55-c 的高考门按 depth 划（不按 track）"
  },
  "sentdownForm": {
    "values": ["chadui", "changdui", "bingtuan"],
    "host": "track",
    "note": "下乡去向构成（三形，v0.23 F55-b 第二层掷定）：chadui=插队 / changdui=场队 / bingtuan=农场兵团；只对已下乡者掷，absent=没下乡（含留城与农村形）；决定 17–21 按轨分文与返城拍的出法"
  },
  "quotaHolder": {
    "values": ["mine", "sibling", "none"],
    "host": "track",
    "note": "顶替名额归属（v0.23 F65-a/L65-家）：只能由 L65-家的发放规则函数按已立家庭事实写，familyBeat 小应对的 effects/setFact 永远不许写它（validate-state 专门断言，E4）"
  },
  "studyForm": {
    "values": ["zhongzhuan", "putong"],
    "host": "track",
    "note": "玩家亲选的升学身份（v0.23 Q4 甲案）：zhongzhuan=中专形 / putong=普通高中形；与 PACK-SPEC 的 trackAlt（序章文本变体义）分家，两义不许混登记"
  },
};

// 家庭事实旗（familyFact）：familyBeat 与处境发放立的家庭层事实旗全量登记（E8 分根复制清单按此表逐项点名）。
// 旗本体仍是 S.flags 里的布尔旗；本表是「哪些旗算家庭事实」的单一事实源——新家庭旗先在此登记再写内容。
window.GAME_REGISTRY.familyFacts = {
  "famSplit55": { "beat": "L55-家", "note": "一家分两处（c1955）：大人调动/支援建设，孩子跟走或留亲戚家" },
  "originLB": { "beat": "L85-留/L95-留", "note": "留守来历（沿 PACK-SPEC 已定名）：父母外出，孩子留祖辈处；c1985/c1995 同名同义、参数分代" },
  "migrantExam": { "beat": "L95-考/L00-考", "note": "随迁升学议题已立：回原籍考还是留当地考，墙在升学端" },
  "famTight78": { "beat": "L78-家", "note": "家里的钱先紧起来（c1978）：父母下海/开店或下岗，紧的那一样落到孩子身上" },
  "famLaidOff85": { "beat": "L85-岗", "note": "父母下岗（c1985）：家里的钱紧了，先紧孩子的哪一样" },
  "famRestructure95": { "beat": "L95-婚", "note": "父母离异后的日常安排（c1995）：跟谁住的日常尺寸事实，克制写事不写惨" },
  "famCare00": { "beat": "L00-护", "note": "看护翻转预告（c2000）：祖辈住院，孩子第一次在病房跑腿" },
  "famSentdownEcho": { "beat": "L65-衔", "note": "兄姐下乡/返城的衔接记号（c1965，只作记号不立新线）：饭桌上少一副/多一副碗筷" },
};

// examBand 分布表（E5）：按代 × 处境登记三档权重——设计参数，无统计出处（蓝图 §3.2 总则②注）。
// 本包只落 c2000 占位登记（精确值随各代包在其 CALIB 头定版后经登记数据文件合入同名键覆盖申请——
// 合入规则先登记者胜，故各代包的定版表须直接改本表对应键或在本文件登记，不走 extra 覆盖）。
window.GAME_REGISTRY.examBandTables = {
  "c2000": {
    "school": { "high": 45, "mid": 35, "low": 20 },
    "half": { "high": 25, "mid": 35, "low": 40 },
    "never": { "high": 10, "mid": 30, "low": 60 },
    "note": "c2000 定版（v0.23 WP5）：数值是设计参数、无统计出处；WP1 占位值经 WP5 定版确认不改、即为定版（定版对账见 registry-wp5.js 同值登记）"
  },
};

// 登记数据文件合入（E9）：window.GAME_REGISTRY_EXTRA 是各内容包登记数据文件 concat 出的数组，
// 加载位在 state.js 之前、registry.js 之前（index.html / sim / 各校验工具同序）。同名键先登记者胜：
// 本体登记优先，extra 只补本体没有的键——防内容包静默覆盖 WP1 定版口径。
(function mergeRegistryExtra() {
  const REG = window.GAME_REGISTRY;
  for (const x of window.GAME_REGISTRY_EXTRA || []) {
    if (!x) continue;
    for (const [k, v] of Object.entries(x.milestones || {})) if (!(k in REG.milestones)) REG.milestones[k] = v;
    for (const [k, v] of Object.entries(x.enumFacts || {})) if (!(k in REG.enumFacts)) REG.enumFacts[k] = v;
    for (const [k, v] of Object.entries(x.familyFacts || {})) if (!(k in REG.familyFacts)) REG.familyFacts[k] = v;
    for (const [k, v] of Object.entries(x.examBandTables || {})) if (!(k in REG.examBandTables)) REG.examBandTables[k] = v;
  }
})();
