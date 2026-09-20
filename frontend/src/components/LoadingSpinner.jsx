export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <div className="loading-text">{text}</div>
    </div>
  );
}
