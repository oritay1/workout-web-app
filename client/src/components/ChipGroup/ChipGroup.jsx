import './ChipGroup.css'

// Multi-select as toggle buttons. `options` is [{ value, label }]
function ChipGroup({ label, options, selected, onChange }) {
  function toggle(value) {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
  }

  return (
    <fieldset className="chip-group">
      <legend className="chip-group__legend">{label}</legend>
      <div className="chip-group__options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="chip-group__chip"
            aria-pressed={selected.includes(option.value)}
            onClick={() => toggle(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default ChipGroup
