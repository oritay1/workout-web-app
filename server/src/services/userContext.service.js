import { DailyLog } from '../models/dailyLog.model.js';
import { DietPlan } from '../models/dietPlan.model.js';
import { Exercise } from '../models/exercise.model.js';
import { Food } from '../models/food.model.js';
import { HealthProfile } from '../models/healthProfile.model.js';
import { MEASUREMENT_TYPES, Measurement } from '../models/measurement.model.js';
import { User } from '../models/user.model.js';
import { WorkoutPlan } from '../models/workoutPlan.model.js';
import { WorkoutSession } from '../models/workoutSession.model.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { findUsableExercises } from './exercise.service.js';
import { findUsableFoods } from './food.service.js';
import { cell, clock, humanize, inline, minutes, num, quote, table, withUnit } from './markdown.js';

// Builds one Markdown document with everything we know about a user, organized for an LLM (and for the
// user to export). Future AI features must use this same builder.

export const EXPORT_PERIODS = [30, 90, 365, 'all'];
const MAX_SESSION_DETAILS = 60;
const RECENT_FOOD_DAYS = 7;
const TOP_EXERCISES = 15;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };

const MEASUREMENT_LABELS = {
  weight: 'Weight',
  bodyFat: 'Body fat',
  waist: 'Waist',
  restingHeartRate: 'Resting heart rate',
  bloodPressure: 'Blood pressure',
};

// ---------- Options ----------

export function parseExportOptions(query) {
  const period = query.days === 'all' ? 'all' : Number(query.days ?? 90);
  if (!EXPORT_PERIODS.includes(period)) throw new HttpError(400, 'INVALID_FIELD', { field: 'days' });
  let timeZone = 'UTC';
  if (typeof query.tz === 'string' && query.tz.length <= 64) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: query.tz });
      timeZone = query.tz;
    } catch {
      throw new HttpError(400, 'INVALID_FIELD', { field: 'tz' });
    }
  }
  return { period, timeZone };
}

// ---------- Date helpers (in the user's time zone) ----------

function localDate(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function localDateTime(date, timeZone) {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' }).format(date);
  return `${localDate(date, timeZone)} ${time}`;
}

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const weekdayOf = (dateString) => new Date(`${dateString}T12:00:00Z`).getUTCDay();
const weekStartOf = (dateString) => shiftDate(dateString, -weekdayOf(dateString));

function ageOn(dateOfBirth, today) {
  const birth = dateOfBirth.toISOString().slice(0, 10);
  let age = Number(today.slice(0, 4)) - Number(birth.slice(0, 4));
  if (today.slice(5) < birth.slice(5)) age -= 1;
  return age;
}

// ---------- Names ----------

const exerciseName = (exercise) => (exercise ? (exercise.owner ? exercise.name : exercise.names?.en) : 'Unknown exercise');

function foodName(food) {
  if (!food) return 'Unknown food';
  if (food.source === 'custom') return food.brand ? `${food.name} (${food.brand})` : food.name;
  return food.names?.en;
}

// ---------- Workout formatting ----------

function formatTargets(entry, type) {
  if (type === 'cardio') {
    return [entry.durationSeconds && minutes(entry.durationSeconds), withUnit(entry.distanceKm, 'km', 2)].filter(Boolean).join(', ') || null;
  }
  const sets = entry.sets ?? 1;
  if (type === 'duration') return `${sets} × ${clock(entry.durationSeconds)}`;
  const reps = entry.repsMax && entry.repsMax !== entry.repsMin ? `${entry.repsMin}-${entry.repsMax}` : `${entry.repsMin}`;
  return [`${sets} × ${reps} reps`, entry.weightKg ? `@ ${num(entry.weightKg)} kg` : null].filter(Boolean).join(' ');
}

function formatSet(set, type) {
  if (type === 'cardio') {
    return [set.durationSeconds && minutes(set.durationSeconds), withUnit(set.distanceKm, 'km', 2)].filter(Boolean).join(' / ') || '—';
  }
  if (type === 'duration') return clock(set.durationSeconds);
  if (set.reps === undefined || set.reps === null) return set.weightKg ? `${num(set.weightKg)} kg` : '—';
  return set.weightKg ? `${set.reps}×${num(set.weightKg)} kg` : `${set.reps} reps`;
}

function entryStatus(entry) {
  const done = entry.sets.filter((set) => set.completed).length;
  if (!entry.planned) return 'extra (not planned)';
  const target = entry.planned.sets ?? 1;
  if (done === 0) return 'skipped';
  return done >= target ? 'done' : `partial (${done}/${target} sets)`;
}

// Heaviest completed set (then most reps); Epley estimated 1RM for strength sets
function bestSet(sets) {
  const weighted = sets.filter((set) => set.completed && set.reps);
  if (weighted.length === 0) return null;
  return weighted.reduce((best, set) =>
    (set.weightKg ?? 0) > (best.weightKg ?? 0) || ((set.weightKg ?? 0) === (best.weightKg ?? 0) && set.reps > best.reps) ? set : best,
  );
}
const estimatedOneRepMax = (set) => (set?.weightKg ? set.weightKg * (1 + set.reps / 30) : null);

// ---------- Sections ----------

function profileSection(user, health, today) {
  const lines = ['## 1. Profile'];
  const item = (label, value) => value !== null && value !== undefined && value !== '' && lines.push(`- ${label}: ${value}`);
  item('Username', inline(user.username));
  item('Member since', user.createdAt.toISOString().slice(0, 10));
  if (!health) {
    lines.push('- Health details: not filled in.');
    return lines.join('\n');
  }
  item('Sex', health.sex);
  if (health.dateOfBirth) item('Date of birth', `${health.dateOfBirth.toISOString().slice(0, 10)} (age ${ageOn(health.dateOfBirth, today)})`);
  item('Height', withUnit(health.heightCm, 'cm'));
  item('Activity level', humanize(health.activityLevel));
  item('Main goal', humanize(health.goal));
  item('Target weight', withUnit(health.targetWeightKg, 'kg'));
  item('Average sleep', withUnit(health.sleepHours, 'hours/night'));
  item('Smoking', humanize(health.smoking));
  item('Alcohol', humanize(health.alcohol));
  const list = (label, values) => item(label, values?.length ? values.map(inline).join('; ') : 'none recorded');
  list('Dietary preferences', health.dietaryPreferences?.map(humanize));
  list('Medical conditions', health.conditions);
  list('Injuries / physical limitations', health.injuries);
  list('Medications', health.medications);
  list('Supplements', health.supplements);
  list('Food allergies / intolerances', health.allergies);
  if (health.notes) lines.push('- Other notes:', '', quote(health.notes));
  return lines.join('\n');
}

function measurementsSection(measurements, startDate) {
  const lines = ['## 2. Body measurements'];
  const byType = Object.keys(MEASUREMENT_TYPES).map((type) => ({
    type,
    all: measurements.filter((item) => item.type === type).sort((a, b) => a.date - b.date),
  }));
  const valueOf = (item) =>
    item.type === 'bloodPressure' ? `${item.systolic}/${item.diastolic} mmHg` : `${num(item.value)} ${MEASUREMENT_TYPES[item.type].unit}`;

  lines.push(
    '',
    '### Latest values',
    '',
    table(
      ['Measurement', 'Latest', 'Date'],
      byType.filter(({ all }) => all.length).map(({ type, all }) => [MEASUREMENT_LABELS[type], valueOf(all.at(-1)), all.at(-1).date.toISOString().slice(0, 10)]),
    ),
  );

  for (const { type, all } of byType) {
    const inPeriod = all.filter((item) => item.date.toISOString().slice(0, 10) >= startDate);
    if (inPeriod.length === 0) continue;
    lines.push('', `### ${MEASUREMENT_LABELS[type]} history (${MEASUREMENT_TYPES[type].unit})`, '');
    if (type !== 'bloodPressure' && inPeriod.length > 1) {
      const change = inPeriod.at(-1).value - inPeriod[0].value;
      lines.push(`Change in period: ${change > 0 ? '+' : ''}${num(change)} ${MEASUREMENT_TYPES[type].unit}`, '');
    }
    lines.push(table(['Date', 'Value'], inPeriod.map((item) => [item.date.toISOString().slice(0, 10), valueOf(item)])));
  }
  return lines.join('\n');
}

function workoutPlanBlock(plan, exercises, heading) {
  const lines = [`${heading} ${cell(plan.name)} (${plan.workoutsPerWeek} workouts/week)`];
  if (plan.notes) lines.push('', quote(plan.notes));
  for (const workout of plan.workouts) {
    const schedule = workout.schedule.length
      ? workout.schedule.map((slot) => `${WEEKDAYS[slot.day]}${slot.time ? ` ${slot.time}` : ''}`).join(', ')
      : 'not scheduled';
    lines.push('', `#### Workout "${inline(workout.name)}" — ${schedule}`, '');
    lines.push(
      table(
        ['#', 'Exercise', 'Type', 'Target', 'Rest', 'Notes'],
        workout.exercises.map((entry, index) => {
          const exercise = exercises.get(entry.exercise.toString());
          return [
            index + 1,
            cell(exerciseName(exercise)),
            exercise?.type ?? '—',
            cell(exercise ? formatTargets(entry, exercise.type) : null),
            entry.restSeconds ? `${entry.restSeconds} s` : null,
            entry.notes ? cell(entry.notes) : null,
          ];
        }),
      ),
    );
  }
  return lines.join('\n');
}

function trainingSection({ plans, sessions, inProgress, exercises, customExercises, startDate, today, timeZone, periodLabel, userCreatedAt }) {
  const lines = ['## 3. Training'];
  const active = plans.find((plan) => plan.isActive);

  lines.push('', active ? workoutPlanBlock(active, exercises, '### Active workout plan:') : '### Active workout plan\n\nNone.');
  const others = plans.filter((plan) => !plan.isActive);
  if (others.length) {
    lines.push('', '### Other workout plans (not active)', '');
    others.forEach((plan) => lines.push(`- ${inline(plan.name)}: ${plan.workouts.length} workouts, ${plan.workoutsPerWeek}/week`));
  }

  // Summary + weekly adherence
  lines.push('', `### Workout sessions (${periodLabel})`, '');
  if (inProgress) lines.push(`A workout is currently in progress (started ${localDateTime(inProgress.startedAt, timeZone)}).`, '');
  if (sessions.length === 0) {
    lines.push('No completed workouts in this period.');
  } else {
    // Planned sets vs completed ones (extra sets beyond the plan don't count)
    let plannedSets = 0;
    let plannedDone = 0;
    for (const entry of sessions.flatMap((session) => session.exercises)) {
      if (!entry.planned) continue;
      const target = entry.planned.sets ?? 1;
      plannedSets += target;
      plannedDone += Math.min(target, entry.sets.filter((set) => set.completed).length);
    }
    // Average over the time the user has actually been active, not the whole period
    const firstActivity = [localDate(sessions[0].startedAt, timeZone), localDate(userCreatedAt, timeZone)].sort()[0];
    const firstDay = startDate && startDate > firstActivity ? startDate : firstActivity;
    const weeks = Math.max(1, (new Date(`${today}T00:00:00Z`) - new Date(`${firstDay}T00:00:00Z`) + DAY_MS) / (7 * DAY_MS));
    lines.push(
      `- Completed workouts: ${sessions.length} (${num(sessions.length / weeks)} per week on average${active ? `; active plan asks for ${active.workoutsPerWeek}/week` : ''})`,
      `- Total training time: ${minutes(sessions.reduce((sum, s) => sum + ((s.endedAt ?? s.startedAt) - s.startedAt) / 1000, 0))}`,
      plannedSets ? `- Planned sets completed: ${plannedDone} of ${plannedSets} (${num((plannedDone / plannedSets) * 100, 0)}%)` : null,
    );

    const weeksMap = new Map();
    for (const session of sessions) {
      const week = weekStartOf(localDate(session.startedAt, timeZone));
      weeksMap.set(week, (weeksMap.get(week) ?? 0) + 1);
    }
    lines.push(
      '',
      '#### Weekly adherence',
      '',
      table(
        ['Week starting (Sun)', 'Completed workouts', 'Planned per week'],
        [...weeksMap.entries()].sort().map(([week, count]) => [week, count, active ? active.workoutsPerWeek : null]),
      ),
    );

    // Session details, newest first
    lines.push('', `#### Session details (newest first${sessions.length > MAX_SESSION_DETAILS ? `, latest ${MAX_SESSION_DETAILS}` : ''})`);
    for (const session of [...sessions].reverse().slice(0, MAX_SESSION_DETAILS)) {
      const title = session.name ? `"${inline(session.name)}"${session.planName ? ` from plan "${inline(session.planName)}"` : ''}` : 'Free workout';
      lines.push(
        '',
        `##### ${localDateTime(session.startedAt, timeZone)} — ${title} — ${minutes(((session.endedAt ?? session.startedAt) - session.startedAt) / 1000)}`,
        '',
        table(
          ['Exercise', 'Status', 'Planned', 'Done (completed sets)'],
          session.exercises.map((entry) => {
            const exercise = exercises.get(entry.exercise.toString());
            const type = exercise?.type ?? 'strength';
            const done = entry.sets.filter((set) => set.completed).map((set) => formatSet(set, type));
            return [cell(exerciseName(exercise)), entryStatus(entry), entry.planned ? cell(formatTargets(entry.planned, type)) : null, cell(done.join(', '))];
          }),
        ),
      );
      if (session.notes) lines.push('', quote(session.notes));
    }

    // Progress per exercise (strength-type)
    const progress = new Map();
    for (const session of sessions) {
      for (const entry of session.exercises) {
        const exercise = exercises.get(entry.exercise.toString());
        if (!exercise || !['strength', 'bodyweight'].includes(exercise.type)) continue;
        const best = bestSet(entry.sets);
        if (!best) continue;
        const key = exercise._id.toString();
        const item = progress.get(key) ?? { exercise, sessions: 0, first: null, latest: null, bestOneRm: null };
        item.sessions += 1;
        const snapshot = { date: localDate(session.startedAt, timeZone), set: best };
        item.first ??= snapshot;
        item.latest = snapshot;
        const oneRm = estimatedOneRepMax(best);
        if (oneRm && (!item.bestOneRm || oneRm > item.bestOneRm)) item.bestOneRm = oneRm;
        progress.set(key, item);
      }
    }
    if (progress.size) {
      lines.push(
        '',
        '#### Exercise progress (best completed set per session)',
        '',
        table(
          ['Exercise', 'Sessions', 'First', 'Latest', 'Best est. 1RM (Epley)'],
          [...progress.values()]
            .sort((a, b) => b.sessions - a.sessions)
            .slice(0, TOP_EXERCISES)
            .map((item) => [
              cell(exerciseName(item.exercise)),
              item.sessions,
              `${item.first.date}: ${formatSet(item.first.set, item.exercise.type)}`,
              `${item.latest.date}: ${formatSet(item.latest.set, item.exercise.type)}`,
              withUnit(item.bestOneRm, 'kg'),
            ]),
        ),
      );
    }
  }

  if (customExercises.length) {
    lines.push(
      '',
      '### Custom exercises created by the user',
      '',
      table(
        ['Name', 'Type', 'Equipment', 'Main muscles', 'Notes'],
        customExercises.map((exercise) => [
          cell(exercise.name),
          exercise.type,
          humanize(exercise.equipment),
          exercise.primaryMuscles.map(humanize).join(', ') || null,
          exercise.notes ? cell(exercise.notes) : null,
        ]),
      ),
    );
  }
  return lines.join('\n');
}

function targetsText(targets) {
  const parts = [
    withUnit(targets?.energyKcal, 'kcal', 0),
    targets?.proteinG ? `protein ${num(targets.proteinG, 0)} g` : null,
    targets?.carbsG ? `carbs ${num(targets.carbsG, 0)} g` : null,
    targets?.fatG ? `fat ${num(targets.fatG, 0)} g` : null,
    targets?.waterMl ? `water ${num(targets.waterMl, 0)} ml` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'no goals set';
}

function servingText(item, food) {
  const unit = food?.basis ?? 'g';
  return item.portionLabel ? `${num(item.quantity, 2)} × ${inline(item.portionLabel)} (${num(item.amount)} ${unit})` : `${num(item.amount)} ${unit}`;
}

function nutritionSection({ dietPlans, logs, foods, customFoods, periodLabel }) {
  const lines = ['## 4. Nutrition'];
  const active = dietPlans.find((plan) => plan.isActive);

  if (active) {
    lines.push('', `### Active diet plan: ${cell(active.name)}`, '', `Daily goals: ${targetsText(active.targets)}`);
    if (active.notes) lines.push('', quote(active.notes));
    for (const meal of active.meals) {
      lines.push('', `#### Planned meal "${inline(DEFAULT_MEAL_LABELS[meal.name] ?? meal.name)}"${meal.time ? ` at ${meal.time}` : ''}`, '');
      lines.push(
        table(
          ['Food', 'Amount', 'kcal', 'Protein g', 'Carbs g', 'Fat g'],
          meal.items.map((item) => {
            const food = foods.get(item.food.toString());
            const factor = item.amount / 100;
            const value = (field) => num((food?.nutrients?.[field] ?? 0) * factor, field === 'energyKcal' ? 0 : 1);
            return [cell(foodName(food)), servingText(item, food), value('energyKcal'), value('proteinG'), value('carbsG'), value('fatG')];
          }),
        ),
      );
    }
  } else {
    lines.push('', '### Active diet plan', '', 'None.');
  }
  const others = dietPlans.filter((plan) => !plan.isActive);
  if (others.length) {
    lines.push('', '### Other diet plans (not active)', '');
    others.forEach((plan) => lines.push(`- ${inline(plan.name)}: ${targetsText(plan.targets)}`));
  }

  lines.push('', `### Daily food log (${periodLabel})`, '');
  const logged = logs.filter((log) => log.entries.length || log.waterMl);
  if (logged.length === 0) {
    lines.push('No days logged in this period.');
  } else {
    const dayTotals = logged.map((log) => {
      const sum = (field) => log.entries.reduce((total, entry) => total + (entry.nutrients?.[field] ?? 0), 0);
      return { log, kcal: sum('energyKcal'), protein: sum('proteinG'), carbs: sum('carbsG'), fat: sum('fatG'), fiber: sum('fiberG'), sodium: sum('sodiumMg') };
    });
    const average = (key) => dayTotals.reduce((total, day) => total + day[key], 0) / dayTotals.length;
    const withTargets = dayTotals.filter((day) => day.log.targets?.energyKcal);
    lines.push(
      `- Days logged: ${logged.length}`,
      `- Average per logged day: ${num(average('kcal'), 0)} kcal, protein ${num(average('protein'), 0)} g, carbs ${num(average('carbs'), 0)} g, fat ${num(average('fat'), 0)} g, fiber ${num(average('fiber'), 0)} g, sodium ${num(average('sodium'), 0)} mg, water ${num(logged.reduce((t, l) => t + (l.waterMl ?? 0), 0) / logged.length, 0)} ml`,
      withTargets.length
        ? `- Days within ±10% of the calorie goal: ${withTargets.filter((day) => Math.abs(day.kcal - day.log.targets.energyKcal) <= day.log.targets.energyKcal * 0.1).length} of ${withTargets.length}`
        : null,
      '',
      'Note: only what the user logged is counted; days with partial logging will look low.',
      '',
      table(
        ['Date', 'kcal (goal)', 'Protein g (goal)', 'Carbs g (goal)', 'Fat g (goal)', 'Water ml (goal)', 'Entries'],
        dayTotals.map(({ log, kcal, protein, carbs, fat }) => {
          const pair = (value, goal, digits = 0) => `${num(value, digits)}${goal ? ` (${num(goal, 0)})` : ''}`;
          return [
            log.date,
            pair(kcal, log.targets?.energyKcal),
            pair(protein, log.targets?.proteinG),
            pair(carbs, log.targets?.carbsG),
            pair(fat, log.targets?.fatG),
            pair(log.waterMl ?? 0, log.targets?.waterMl),
            log.entries.length,
          ];
        }),
      ),
    );

    lines.push('', `#### What was eaten (last ${Math.min(RECENT_FOOD_DAYS, logged.length)} logged days)`);
    for (const log of logged.slice(-RECENT_FOOD_DAYS).reverse()) {
      lines.push('', `##### ${log.date}`, '');
      lines.push(
        table(
          ['Meal', 'Food', 'Amount', 'kcal', 'Protein g', 'From plan'],
          log.entries.map((entry) => {
            const food = foods.get(entry.food.toString());
            return [
              cell(DEFAULT_MEAL_LABELS[entry.meal] ?? entry.meal),
              cell(foodName(food)),
              servingText(entry, food),
              num(entry.nutrients?.energyKcal, 0),
              num(entry.nutrients?.proteinG),
              entry.planItem ? 'yes' : 'no',
            ];
          }),
        ),
      );
    }
  }

  if (customFoods.length) {
    lines.push(
      '',
      '### Custom foods created by the user (values per 100 g or 100 ml)',
      '',
      table(
        ['Food', 'Per', 'kcal', 'Protein g', 'Carbs g', 'Fat g'],
        customFoods.map((food) => [
          cell(foodName(food)),
          `100 ${food.basis}`,
          num(food.nutrients.energyKcal, 0),
          num(food.nutrients.proteinG),
          num(food.nutrients.carbsG),
          num(food.nutrients.fatG),
        ]),
      ),
    );
  }
  return lines.join('\n');
}

// ---------- Builder ----------

export async function buildUserContext(userId, { period = 90, timeZone = 'UTC' } = {}) {
  const now = new Date();
  const today = localDate(now, timeZone);
  const startDate = period === 'all' ? null : shiftDate(today, -(period - 1));
  // One extra day covers time-zone offsets; sessions are then filtered by their local date
  const since = startDate ? new Date(new Date(`${startDate}T00:00:00Z`).getTime() - DAY_MS) : null;
  const inPeriod = (date) => !startDate || localDate(date, timeZone) >= startDate;
  const periodLabel = startDate ? `${startDate} to ${today}, last ${period} days` : `all time, until ${today}`;

  const [user, health, measurements, plans, allSessions, inProgress, customExercises, dietPlans, logs, customFoods] = await Promise.all([
    User.findById(userId).lean(),
    HealthProfile.findOne({ user: userId }).lean(),
    Measurement.find({ user: userId }).lean(),
    WorkoutPlan.find({ owner: userId }).sort({ isActive: -1, updatedAt: -1 }).lean(),
    WorkoutSession.find({ owner: userId, status: 'completed', ...(since && { startedAt: { $gte: since } }) }).sort({ startedAt: 1 }).lean(),
    WorkoutSession.findOne({ owner: userId, status: 'inProgress' }).lean(),
    Exercise.find({ owner: userId, isArchived: false }).sort({ name: 1 }).lean(),
    DietPlan.find({ owner: userId }).sort({ isActive: -1, updatedAt: -1 }).lean(),
    DailyLog.find({ owner: userId, ...(startDate && { date: { $gte: startDate } }) }).sort({ date: 1 }).lean(),
    Food.find({ owner: userId, source: 'custom', isArchived: false }).sort({ name: 1 }).lean(),
  ]);
  if (!user) throw new HttpError(401, 'UNAUTHORIZED');
  const sessions = allSessions.filter((session) => inPeriod(session.startedAt));

  const exerciseIds = [
    ...plans.flatMap((plan) => plan.workouts.flatMap((workout) => workout.exercises.map((entry) => entry.exercise))),
    ...sessions.flatMap((session) => session.exercises.map((entry) => entry.exercise)),
  ];
  const foodIds = [
    ...dietPlans.flatMap((plan) => plan.meals.flatMap((meal) => meal.items.map((item) => item.food))),
    ...logs.flatMap((log) => log.entries.map((entry) => entry.food)),
  ];
  const [exercises, foods] = await Promise.all([
    findUsableExercises(userId, exerciseIds, exerciseIds),
    findUsableFoods(userId, foodIds, foodIds),
  ]);

  return [
    `# Health, training and nutrition data: ${inline(user.username)}`,
    '',
    `- Exported: ${localDateTime(now, timeZone)} (${timeZone})`,
    `- Period for history: ${periodLabel}. Profile, plans and custom items are always current.`,
    '- Units: metric (kg, cm, ml, km), energy in kcal. Dates are YYYY-MM-DD in the user\'s time zone.',
    '- Source: Workout App. Food values come from USDA FoodData Central unless marked as custom.',
    '',
    '> Private health data. Share this document only with people and tools you trust.',
    '',
    profileSection(user, health, today),
    '',
    measurementsSection(measurements, startDate ?? '0000-00-00'),
    '',
    trainingSection({ plans, sessions, inProgress, exercises, customExercises, startDate, today, timeZone, periodLabel, userCreatedAt: user.createdAt }),
    '',
    nutritionSection({ dietPlans, logs, foods, customFoods, periodLabel }),
    '',
    '## 5. Not available yet',
    '',
    '- Blood test results: not recorded (planned feature).',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');
}
