// defaultDuration: seconds per set (0 = manual/rep-based, no auto-advance)
const EXERCISES = {
  upper: [
    // 自重 / 哑铃
    { id: 'pushup',      name: '俯卧撑',         defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    { id: 'pullup',      name: '引体向上',         defaultSets: 3, defaultRest: 90,  defaultDuration: 0 },
    { id: 'curl',        name: '哑铃弯举',         defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    { id: 'press',       name: '哑铃肩推',         defaultSets: 3, defaultRest: 90,  defaultDuration: 0 },
    { id: 'row',         name: '哑铃划船',         defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    { id: 'tricep',      name: '三头臂屈伸',       defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    { id: 'fly',         name: '哑铃飞鸟',         defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    // 器械
    { id: 'latpulldown', name: '高位下拉',         defaultSets: 3, defaultRest: 90,  defaultDuration: 0 },
    { id: 'cablerow',    name: '坐姿划船',         defaultSets: 3, defaultRest: 90,  defaultDuration: 0 },
    { id: 'chestpress',  name: '坐姿胸推（器械）', defaultSets: 3, defaultRest: 90,  defaultDuration: 0 },
    { id: 'pecfly',      name: '蝴蝶机夹胸',       defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    { id: 'shoulderpress', name: '史密斯机肩推',   defaultSets: 3, defaultRest: 90,  defaultDuration: 0 },
    { id: 'cablefly',    name: '绳索飞鸟',         defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    { id: 'triceppush',  name: '绳索下压（三头）', defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    { id: 'barbellrow',  name: '杠铃划船',         defaultSets: 3, defaultRest: 90,  defaultDuration: 0 },
    { id: 'barbellcurl', name: '杠铃弯举',         defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    { id: 'benchpress',  name: '杠铃卧推',         defaultSets: 3, defaultRest: 120, defaultDuration: 0 },
  ],
  lower: [
    // 深蹲系列
    { id: 'squat',       name: '徒手深蹲',         defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    { id: 'barbellsquat',name: '杠铃深蹲',         defaultSets: 4, defaultRest: 180, defaultDuration: 0 },
    { id: 'goblet',      name: '哑铃/壶铃深蹲',   defaultSets: 3, defaultRest: 90,  defaultDuration: 0 },
    { id: 'bulgarian',   name: '保加利亚深蹲',     defaultSets: 3, defaultRest: 90,  defaultDuration: 0 },
    { id: 'lunge',       name: '弓步蹲',           defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    // 硬拉 / 臀腿
    { id: 'rdl',         name: '罗马尼亚硬拉',     defaultSets: 3, defaultRest: 90,  defaultDuration: 0 },
    { id: 'hipthrust',   name: '臀推',             defaultSets: 3, defaultRest: 90,  defaultDuration: 0 },
    // 器械
    { id: 'legpress',    name: '腿举（器械）',     defaultSets: 3, defaultRest: 120, defaultDuration: 0 },
    { id: 'legext',      name: '腿屈伸（器械）',   defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    { id: 'legcurl',     name: '腿弯举（器械）',   defaultSets: 3, defaultRest: 60,  defaultDuration: 0 },
    { id: 'calf',        name: '小腿提踵',         defaultSets: 4, defaultRest: 45,  defaultDuration: 0 },
  ],
  full: [
    { id: 'burpee',    name: '波比跳',   defaultSets: 3, defaultRest: 60,  defaultDuration: 45 },
    { id: 'plank',     name: '平板支撑', defaultSets: 3, defaultRest: 45,  defaultDuration: 60 },
    { id: 'jumpjack',  name: '开合跳',   defaultSets: 3, defaultRest: 45,  defaultDuration: 40 },
    { id: 'mountain',  name: '登山跑',   defaultSets: 3, defaultRest: 60,  defaultDuration: 40 },
    { id: 'deadlift',  name: '硬拉',     defaultSets: 3, defaultRest: 120, defaultDuration: 0  },
    { id: 'thruster',  name: '杠铃推蹲', defaultSets: 3, defaultRest: 120, defaultDuration: 0  },
    { id: 'kettleswing', name: '壶铃摆动', defaultSets: 4, defaultRest: 60, defaultDuration: 40 },
  ],
};

const TEMPLATES = [
  { name: '三分训练', sets: 3, rest: 180, desc: '3组 · 3分钟休息' },
  { name: '标准',     sets: 3, rest: 60,  desc: '3组 · 1分钟休息' },
  { name: '强度',     sets: 4, rest: 90,  desc: '4组 · 90秒休息' },
  { name: '轻量恢复', sets: 2, rest: 45,  desc: '2组 · 45秒休息' },
];

const BODY_PARTS = [
  { id: 'upper', label: '上半身', emoji: '💪' },
  { id: 'lower', label: '下半身', emoji: '🦵' },
  { id: 'full',  label: '全身',   emoji: '🏋️' },
];
