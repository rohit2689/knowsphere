export default function SkeletonCard() {
  return (
    <div className="card clay skeleton" aria-hidden="true">
      <div className="card-media sk-block" />
      <div className="card-body">
        <span className="sk-line sk-short" />
        <span className="sk-line" />
        <span className="sk-line sk-mid" />
      </div>
    </div>
  )
}
