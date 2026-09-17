import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { editExercisePath } from '../../constants/routes.js'
import './ExerciseListItem.css'

function ExerciseListItem({ exercise, name, onDelete, deleting }) {
  const { t } = useTranslation()
  const muscles = exercise.primaryMuscles.map((muscle) => t(`exercises.muscles.${muscle}`)).join(', ')

  return (
    <li className="exercise-item">
      <div className="exercise-item__main">
        <p className="exercise-item__name">
          {name}
          {exercise.isCustom && <span className="exercise-item__badge">{t('exercises.customBadge')}</span>}
        </p>
        <p className="exercise-item__meta">
          {t(`exercises.types.${exercise.type}`)} · {t(`exercises.equipment.${exercise.equipment}`)}
        </p>
        {muscles && <p className="exercise-item__muscles">{muscles}</p>}
      </div>
      {exercise.isCustom && (
        <div className="exercise-item__actions">
          <Link
            className="exercise-item__action"
            to={editExercisePath(exercise.id)}
            aria-label={t('exercises.editNamed', { name })}
          >
            {t('common.edit')}
          </Link>
          <button
            type="button"
            className="exercise-item__action exercise-item__action--danger"
            onClick={() => onDelete(exercise, name)}
            disabled={deleting}
            aria-label={t('exercises.deleteNamed', { name })}
          >
            {t('common.delete')}
          </button>
        </div>
      )}
    </li>
  )
}

export default ExerciseListItem
