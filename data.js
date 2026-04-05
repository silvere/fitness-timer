const EXERCISES = {
  upper: [
    { id: 'pushup',   name: '俯卧撑',     defaultSets: 3, defaultRest: 60 },
    { id: 'curl',     name: '哑铃弯举',   defaultSets: 3, defaultRest: 60 },
    { id: 'press',    name: '哑铃肩推',   defaultSets: 3, defaultRest: 90 },
    { id: 'row',      name: '哑铃划船',   defaultSets: 3, defaultRest: 60 },
    { id: 'tricep',   name: '三头臂屈伸', defaultSets: 3, defaultRest: 60 },
    { id: 'pullup',   name: '引体向上',   defaultSets: 3, defaultRest: 90 },
    { id: 'fly',      name: '哑铃飞鸟',   defaultSets: 3, defaultRest: 60 },
  ],
  lower: [
    { id: 'squat',    name: '深蹲',           defaultSets: 3, defaultRest: 90 },
    { id: 'bulgarian',name: '保加利亚深蹲',   defaultSets: 3, defaultRest: 90 },
    { id: 'lunge',    name: '弓步蹲',         defaultSets: 3, defaultRest: 60 },
    { id: 'rdl',      name: '罗马尼亚硬拉',   defaultSets: 3, defaultRest: 90 },
    { id: 'calf',     name: '小腿提踵',       defaultSets: 4, defaultRest: 45 },
    { id: 'legcurl',  name: '腿弯举',         defaultSets: 3, defaultRest: 60 },
  ],
  full: [
    { id: 'burpee',   name: '波比跳',   defaultSets: 3, defaultRest: 60 },
    { id: 'plank',    name: '平板支撑', defaultSets: 3, defaultRest: 45 },
    { id: 'jumpjack', name: '开合跳',   defaultSets: 3, defaultRest: 45 },
    { id: 'mountain', name: '登山跑',   defaultSets: 3, defaultRest: 60 },
    { id: 'deadlift', name: '硬拉',     defaultSets: 3, defaultRest: 120 },
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
