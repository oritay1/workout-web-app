// Built-in exercise library, synced into the database on server start (matched by `key`).
// To add a UI language, add its name to every entry (missing names fall back to English).

const exercise = (key, en, he, type, equipment, primaryMuscles, secondaryMuscles = []) => ({
  key,
  names: { en, he },
  type,
  equipment,
  primaryMuscles,
  secondaryMuscles,
});

export const BUILT_IN_EXERCISES = [
  // Chest
  exercise('barbell-bench-press', 'Barbell bench press', 'לחיצת חזה במוט', 'strength', 'barbell', ['chest'], ['triceps', 'shoulders']),
  exercise('incline-barbell-bench-press', 'Incline barbell bench press', 'לחיצת חזה בשיפוע חיובי במוט', 'strength', 'barbell', ['chest'], ['shoulders', 'triceps']),
  exercise('dumbbell-bench-press', 'Dumbbell bench press', 'לחיצת חזה עם משקולות יד', 'strength', 'dumbbell', ['chest'], ['triceps', 'shoulders']),
  exercise('incline-dumbbell-press', 'Incline dumbbell press', 'לחיצת חזה בשיפוע חיובי עם משקולות יד', 'strength', 'dumbbell', ['chest'], ['shoulders', 'triceps']),
  exercise('dumbbell-fly', 'Dumbbell fly', 'פרפר עם משקולות יד', 'strength', 'dumbbell', ['chest'], ['shoulders']),
  exercise('cable-crossover', 'Cable crossover', 'קרוס אובר בכבלים', 'strength', 'cable', ['chest'], ['shoulders']),
  exercise('chest-press-machine', 'Chest press machine', 'מכונת לחיצת חזה', 'strength', 'machine', ['chest'], ['triceps', 'shoulders']),
  exercise('pec-deck', 'Pec deck (machine fly)', 'פרפר במכונה', 'strength', 'machine', ['chest'], ['shoulders']),
  exercise('push-up', 'Push-up', 'שכיבות סמיכה', 'bodyweight', 'none', ['chest'], ['triceps', 'shoulders', 'core']),
  exercise('chest-dip', 'Dips', 'מקבילים', 'bodyweight', 'dipBars', ['chest', 'triceps'], ['shoulders']),

  // Back
  exercise('deadlift', 'Deadlift', 'דדליפט', 'strength', 'barbell', ['back', 'hamstrings', 'glutes'], ['forearms', 'core']),
  exercise('barbell-row', 'Barbell row', 'חתירה במוט', 'strength', 'barbell', ['back'], ['biceps', 'forearms']),
  exercise('dumbbell-row', 'One-arm dumbbell row', 'חתירה עם משקולת יד', 'strength', 'dumbbell', ['back'], ['biceps']),
  exercise('t-bar-row', 'T-bar row', 'חתירת T', 'strength', 'barbell', ['back'], ['biceps']),
  exercise('pull-up', 'Pull-up', 'מתח', 'bodyweight', 'pullUpBar', ['back'], ['biceps', 'forearms']),
  exercise('chin-up', 'Chin-up', 'מתח באחיזה הפוכה', 'bodyweight', 'pullUpBar', ['back', 'biceps'], ['forearms']),
  exercise('lat-pulldown', 'Lat pulldown', 'פולי עליון', 'strength', 'cable', ['back'], ['biceps']),
  exercise('seated-cable-row', 'Seated cable row', 'חתירה בכבל בישיבה', 'strength', 'cable', ['back'], ['biceps']),
  exercise('straight-arm-pulldown', 'Straight-arm pulldown', 'פולאובר בכבל', 'strength', 'cable', ['back'], ['core']),
  exercise('back-extension', 'Back extension', 'פשיטת גו', 'bodyweight', 'other', ['back'], ['glutes', 'hamstrings']),
  exercise('shrug', 'Dumbbell shrug', 'משיכת כתפיים עם משקולות יד', 'strength', 'dumbbell', ['back'], ['forearms']),

  // Shoulders
  exercise('overhead-press', 'Overhead press', 'לחיצת כתפיים במוט בעמידה', 'strength', 'barbell', ['shoulders'], ['triceps', 'core']),
  exercise('dumbbell-shoulder-press', 'Dumbbell shoulder press', 'לחיצת כתפיים עם משקולות יד', 'strength', 'dumbbell', ['shoulders'], ['triceps']),
  exercise('arnold-press', 'Arnold press', 'לחיצת ארנולד', 'strength', 'dumbbell', ['shoulders'], ['triceps']),
  exercise('lateral-raise', 'Lateral raise', 'הרחקת כתפיים לצדדים', 'strength', 'dumbbell', ['shoulders']),
  exercise('cable-lateral-raise', 'Cable lateral raise', 'הרחקת כתף בכבל', 'strength', 'cable', ['shoulders']),
  exercise('front-raise', 'Front raise', 'הרמת ידיים קדימה', 'strength', 'dumbbell', ['shoulders']),
  exercise('rear-delt-fly', 'Rear delt fly', 'פרפר הפוך', 'strength', 'dumbbell', ['shoulders'], ['back']),
  exercise('face-pull', 'Face pull', 'פייס פול', 'strength', 'cable', ['shoulders'], ['back']),
  exercise('upright-row', 'Upright row', 'חתירה אנכית', 'strength', 'barbell', ['shoulders'], ['back', 'biceps']),

  // Arms
  exercise('barbell-curl', 'Barbell curl', 'כפיפת מרפקים במוט', 'strength', 'barbell', ['biceps'], ['forearms']),
  exercise('dumbbell-curl', 'Dumbbell curl', 'כפיפת מרפקים עם משקולות יד', 'strength', 'dumbbell', ['biceps'], ['forearms']),
  exercise('hammer-curl', 'Hammer curl', 'כפיפת פטישים', 'strength', 'dumbbell', ['biceps', 'forearms']),
  exercise('preacher-curl', 'Preacher curl', 'כפיפת מרפקים על ספסל סקוט', 'strength', 'barbell', ['biceps']),
  exercise('cable-curl', 'Cable curl', 'כפיפת מרפקים בכבל', 'strength', 'cable', ['biceps'], ['forearms']),
  exercise('triceps-pushdown', 'Triceps pushdown', 'פשיטת מרפקים בפולי עליון', 'strength', 'cable', ['triceps']),
  exercise('skull-crusher', 'Skull crusher', 'פשיטת מרפקים בשכיבה', 'strength', 'barbell', ['triceps']),
  exercise('overhead-triceps-extension', 'Overhead triceps extension', 'פשיטת מרפקים מעל הראש', 'strength', 'dumbbell', ['triceps']),
  exercise('close-grip-bench-press', 'Close-grip bench press', 'לחיצת חזה באחיזה צרה', 'strength', 'barbell', ['triceps'], ['chest', 'shoulders']),
  exercise('bench-dip', 'Bench dip', 'מקבילים על ספסל', 'bodyweight', 'none', ['triceps'], ['chest', 'shoulders']),
  exercise('wrist-curl', 'Wrist curl', 'כפיפת שורש כף היד', 'strength', 'dumbbell', ['forearms']),

  // Legs
  exercise('back-squat', 'Back squat', 'סקוואט במוט', 'strength', 'barbell', ['quads', 'glutes'], ['hamstrings', 'core']),
  exercise('front-squat', 'Front squat', 'סקוואט קדמי', 'strength', 'barbell', ['quads'], ['glutes', 'core']),
  exercise('goblet-squat', 'Goblet squat', 'סקוואט גביע', 'strength', 'kettlebell', ['quads', 'glutes'], ['core']),
  exercise('bodyweight-squat', 'Bodyweight squat', 'סקוואט במשקל גוף', 'bodyweight', 'none', ['quads', 'glutes']),
  exercise('leg-press', 'Leg press', 'לחיצת רגליים', 'strength', 'machine', ['quads', 'glutes'], ['hamstrings']),
  exercise('hack-squat', 'Hack squat', 'האק סקוואט', 'strength', 'machine', ['quads'], ['glutes']),
  exercise('romanian-deadlift', 'Romanian deadlift', 'דדליפט רומני', 'strength', 'barbell', ['hamstrings', 'glutes'], ['back']),
  exercise('dumbbell-lunge', 'Dumbbell lunge', 'מכרעים עם משקולות יד', 'strength', 'dumbbell', ['quads', 'glutes'], ['hamstrings']),
  exercise('bulgarian-split-squat', 'Bulgarian split squat', 'סקוואט בולגרי', 'strength', 'dumbbell', ['quads', 'glutes'], ['hamstrings']),
  exercise('step-up', 'Step-up', 'עליות על ספסל', 'strength', 'dumbbell', ['quads', 'glutes']),
  exercise('leg-extension', 'Leg extension', 'פשיטת ברכיים במכונה', 'strength', 'machine', ['quads']),
  exercise('leg-curl', 'Leg curl', 'כפיפת ברכיים במכונה', 'strength', 'machine', ['hamstrings']),
  exercise('hip-thrust', 'Hip thrust', 'הרמת אגן במוט', 'strength', 'barbell', ['glutes'], ['hamstrings']),
  exercise('glute-bridge', 'Glute bridge', 'גשר ישבן', 'bodyweight', 'none', ['glutes'], ['hamstrings']),
  exercise('hip-abduction-machine', 'Hip abduction machine', 'מכונת הרחקת ירכיים', 'strength', 'machine', ['glutes']),
  exercise('standing-calf-raise', 'Standing calf raise', 'הרמת עקבים בעמידה', 'strength', 'machine', ['calves']),
  exercise('seated-calf-raise', 'Seated calf raise', 'הרמת עקבים בישיבה', 'strength', 'machine', ['calves']),

  // Core
  exercise('plank', 'Plank', 'פלאנק', 'duration', 'none', ['core'], ['shoulders']),
  exercise('side-plank', 'Side plank', 'פלאנק צידי', 'duration', 'none', ['core']),
  exercise('crunch', 'Crunch', 'כפיפות בטן', 'bodyweight', 'none', ['core']),
  exercise('cable-crunch', 'Cable crunch', 'כפיפות בטן בכבל', 'strength', 'cable', ['core']),
  exercise('hanging-leg-raise', 'Hanging leg raise', 'הרמת רגליים בתלייה', 'bodyweight', 'pullUpBar', ['core'], ['forearms']),
  exercise('russian-twist', 'Russian twist', 'סיבובי גו רוסיים', 'bodyweight', 'none', ['core']),
  exercise('ab-wheel-rollout', 'Ab wheel rollout', 'גלגלת בטן', 'bodyweight', 'other', ['core'], ['shoulders']),
  exercise('mountain-climber', 'Mountain climbers', 'מטפסי הרים', 'duration', 'none', ['core'], ['shoulders', 'quads']),

  // Full body
  exercise('kettlebell-swing', 'Kettlebell swing', 'סווינג עם קטלבל', 'strength', 'kettlebell', ['glutes', 'hamstrings'], ['core', 'back']),
  exercise('power-clean', 'Power clean', 'פאוור קלין', 'strength', 'barbell', ['fullBody']),
  exercise('dumbbell-thruster', 'Dumbbell thruster', 'ת׳ראסטר עם משקולות יד', 'strength', 'dumbbell', ['fullBody']),
  exercise('burpee', 'Burpee', 'ברפי', 'bodyweight', 'none', ['fullBody']),
  exercise('farmers-walk', "Farmer's walk", 'הליכת חקלאי', 'duration', 'dumbbell', ['forearms'], ['core', 'back']),

  // Cardio
  exercise('running', 'Running', 'ריצה', 'cardio', 'none', ['quads', 'hamstrings', 'calves']),
  exercise('treadmill-running', 'Treadmill running', 'ריצה על הליכון', 'cardio', 'cardioMachine', ['quads', 'hamstrings', 'calves']),
  exercise('walking', 'Walking', 'הליכה', 'cardio', 'none', ['quads', 'calves']),
  exercise('cycling', 'Cycling', 'רכיבה על אופניים', 'cardio', 'other', ['quads'], ['glutes', 'calves']),
  exercise('stationary-bike', 'Stationary bike', 'אופני כושר', 'cardio', 'cardioMachine', ['quads'], ['glutes', 'calves']),
  exercise('rowing-machine', 'Rowing machine', 'מכונת חתירה', 'cardio', 'cardioMachine', ['fullBody']),
  exercise('elliptical', 'Elliptical', 'אליפטיקל', 'cardio', 'cardioMachine', ['quads', 'glutes']),
  exercise('stair-climber', 'Stair climber', 'מכונת מדרגות', 'cardio', 'cardioMachine', ['quads', 'glutes'], ['calves']),
  exercise('swimming', 'Swimming', 'שחייה', 'cardio', 'none', ['fullBody']),
  exercise('jump-rope', 'Jump rope', 'קפיצה בחבל', 'duration', 'other', ['calves'], ['shoulders']),
];
