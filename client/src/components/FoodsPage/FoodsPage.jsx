import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { searchFoods } from '../../api/foodsApi.js'
import { FOOD_CATEGORIES, FOOD_LIMITS, SEARCH_DEBOUNCE_MS } from '../../constants/foods.js'
import { ROUTES } from '../../constants/routes.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import FoodListItem from '../FoodListItem/FoodListItem.jsx'
import FormField from '../FormField/FormField.jsx'
import Loader from '../Loader/Loader.jsx'
import './FoodsPage.css'

// The food library is ~7,600 foods, so searching happens on the server
function FoodsPage() {
  const { t, i18n } = useTranslation()
  const errorMessage = useErrorMessage()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [source, setSource] = useState('')
  // null while loading the first page
  const [foods, setFoods] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorCode, setErrorCode] = useState('')
  // Ignores responses of searches that were replaced by a newer one
  const requestIdRef = useRef(0)

  const query = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const language = i18n.resolvedLanguage
  const params = { q: query, category, source, language, limit: FOOD_LIMITS.pageSize }

  useEffect(() => {
    const requestId = ++requestIdRef.current
    searchFoods({ q: query, category, source, language, limit: FOOD_LIMITS.pageSize })
      .then((data) => {
        if (requestId !== requestIdRef.current) return
        setFoods(data.foods)
        setHasMore(data.hasMore)
        setErrorCode('')
      })
      .catch((err) => requestId === requestIdRef.current && setErrorCode(err.code))
  }, [query, category, source, language])

  async function loadMore() {
    const requestId = requestIdRef.current
    setLoadingMore(true)
    try {
      const data = await searchFoods({ ...params, offset: foods.length })
      if (requestId !== requestIdRef.current) return
      setFoods((current) => [...current, ...data.foods])
      setHasMore(data.hasMore)
    } catch (err) {
      setErrorCode(err.code)
    } finally {
      setLoadingMore(false)
    }
  }

  const browsing = !query && !category && !source

  return (
    <section className="foods-page">
      <div className="foods-page__header">
        <h1 className="foods-page__title">{t('foods.title')}</h1>
        <Link className="button button--primary" to={ROUTES.newFood}>
          {t('foods.new')}
        </Link>
      </div>

      <div className="foods-page__filters">
        <FormField
          label={t('foods.search')}
          type="search"
          value={search}
          placeholder={t('foods.searchPlaceholder')}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="foods-page__selects">
          <FormField as="select" label={t('foods.category')} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">{t('exercises.filters.all')}</option>
            {FOOD_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`foods.categories.${value}`)}
              </option>
            ))}
          </FormField>
          <FormField as="select" label={t('foods.source')} value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">{t('exercises.filters.all')}</option>
            <option value="usda">{t('foods.sources.usda')}</option>
            <option value="custom">{t('foods.sources.custom')}</option>
          </FormField>
        </div>
      </div>

      {browsing && <p className="foods-page__hint">{t('foods.browseHint')}</p>}

      {errorCode && (
        <p className="section-form__error" role="alert">
          {errorMessage(errorCode)}
        </p>
      )}

      {foods === null ? (
        !errorCode && <Loader />
      ) : foods.length === 0 ? (
        <p className="foods-page__empty" role="status">
          {t('foods.empty')}
        </p>
      ) : (
        <>
          <ul className="foods-page__list">
            {foods.map((food) => (
              <FoodListItem key={food.id} food={food} />
            ))}
          </ul>
          {hasMore && (
            <button type="button" className="button button--secondary" onClick={loadMore} disabled={loadingMore}>
              {t('history.loadMore')}
            </button>
          )}
        </>
      )}
      <p className="foods-page__credit">{t('foods.usdaCredit')}</p>
    </section>
  )
}

export default FoodsPage
